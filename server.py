import datetime
import json
import mimetypes
import os
import re
import socket
import sqlite3
import subprocess
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Dict, List, Optional, Tuple

from catalog_service import (
    STREAMING_PLATFORMS,
    fetch_justwatch_streaming_offers,
    fetch_series_episodes,
    fuzzy_match_title,
    get_aliases_for_titles,
    search_catalog,
)
from cloud_sync import (
    get_or_create_sync_config,
    pull_latest_snapshot_from_cloud,
    push_snapshot_to_cloud,
    save_sync_config,
)
from epg_engine import (
    ALL_CHANNELS,
    DTT_CHANNELS,
    SKY_CHANNELS,
    fetch_7day_epg,
    normalize_title,
    strip_conjunctions,
    strip_leading_article,
    utc_iso_to_rome,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "nextontv.db")
STATIC_DIR = os.path.join(BASE_DIR, "static")

_DB_LOCK = threading.Lock()
_EPG_MEMORY_CACHE: Dict[str, Dict] = {}
_STREAMING_CATALOG_CACHE: Optional[Dict[str, List[Dict]]] = None
_PUBLIC_TUNNEL_URL: str = ""
_LAST_CLOUD_PULL_TS: float = 0.0


def _get_streaming_catalog_cache() -> Dict[str, List[Dict]]:
    global _STREAMING_CATALOG_CACHE
    if _STREAMING_CATALOG_CACHE is not None:
        return _STREAMING_CATALOG_CACHE
    cat_path = os.path.join(BASE_DIR, "data", "streaming_catalog.json")
    if os.path.isfile(cat_path):
        try:
            with open(cat_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    _STREAMING_CATALOG_CACHE = data
                    return _STREAMING_CATALOG_CACHE
        except Exception:
            pass
    _STREAMING_CATALOG_CACHE = {}
    return _STREAMING_CATALOG_CACHE


def resolve_item_streaming_offers(
    title_it: str,
    title_original: str = "",
    media_type: str = "movie",
    year: str = "",
    allow_live_fetch: bool = True,
) -> List[Dict]:
    cat = _get_streaming_catalog_cache()
    mtype = media_type if media_type in ("movie", "series") else "movie"
    for t in (title_it, title_original):
        norm = normalize_title(t or "")
        if norm:
            key = f"{mtype}_{norm}"
            if key in cat:
                return cat[key]
            c_key = f"{mtype}_{strip_conjunctions(norm)}"
            if c_key in cat:
                return cat[c_key]
    if not allow_live_fetch:
        return []
    offers = fetch_justwatch_streaming_offers(title_it, title_original, mtype, year)
    for t in (title_it, title_original):
        norm = normalize_title(t or "")
        if norm:
            cat[f"{mtype}_{norm}"] = offers
    return offers


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _DB_LOCK:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS library (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                external_id TEXT UNIQUE,
                media_type TEXT NOT NULL,
                status TEXT NOT NULL,
                title_it TEXT NOT NULL,
                title_original TEXT,
                aliases_json TEXT NOT NULL,
                year TEXT,
                poster TEXT,
                genre TEXT,
                description TEXT,
                tvmaze_id INTEGER,
                imdb_id TEXT,
                rating INTEGER DEFAULT 0,
                notes TEXT DEFAULT '',
                streaming_json TEXT DEFAULT '[]',
                created_at TEXT NOT NULL
            )
            """
        )
        try:
            cur.execute("ALTER TABLE library ADD COLUMN streaming_json TEXT DEFAULT '[]'")
        except Exception:
            pass
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS watched_episodes (
                series_id INTEGER NOT NULL,
                season INTEGER NOT NULL,
                episode INTEGER NOT NULL,
                watched_at TEXT NOT NULL,
                PRIMARY KEY (series_id, season, episode)
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS reminders (
                event_id TEXT PRIMARY KEY,
                library_id INTEGER,
                title TEXT NOT NULL,
                lcn INTEGER NOT NULL,
                channel_name TEXT NOT NULL,
                date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                start_iso TEXT NOT NULL,
                episode_info TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS deleted_items (
                norm_key TEXT PRIMARY KEY,
                deleted_at TEXT NOT NULL
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS epg_cache (
                start_date TEXT PRIMARY KEY,
                fetched_at REAL NOT NULL,
                events_json TEXT NOT NULL
            )
            """
        )
        conn.commit()
        conn.close()


def get_italian_today() -> datetime.date:
    """Return the current date in the official Italian timezone (Europe/Rome)."""
    now_utc_iso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return utc_iso_to_rome(now_utc_iso).date()


def get_7day_epg_cached(start_date_str: Optional[str] = None, force_refresh: bool = False) -> Tuple[str, List[Dict], str]:
    """Return (start_date_str, events_list, fetched_at_iso) always anchored to the current Italian date."""
    start_date = get_italian_today()
    start_date_str = start_date.isoformat()

    now_ts = time.time()
    if not force_refresh and start_date_str in _EPG_MEMORY_CACHE:
        entry = _EPG_MEMORY_CACHE[start_date_str]
        if now_ts - entry["fetched_at"] < 4 * 3600:
            return start_date_str, entry["events"], entry["fetched_at_iso"]

    if not force_refresh:
        with _DB_LOCK:
            conn = get_db()
            row = conn.execute("SELECT fetched_at, events_json FROM epg_cache WHERE start_date = ?", (start_date_str,)).fetchone()
            conn.close()
        if row and (now_ts - row["fetched_at"] < 6 * 3600):
            events = json.loads(row["events_json"])
            fetched_iso = datetime.datetime.fromtimestamp(row["fetched_at"]).strftime("%d/%m/%Y %H:%M")
            _EPG_MEMORY_CACHE[start_date_str] = {
                "fetched_at": row["fetched_at"],
                "fetched_at_iso": fetched_iso,
                "events": events,
            }
            return start_date_str, events, fetched_iso

    events = fetch_7day_epg(start_date, days=7)
    fetched_iso = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    with _DB_LOCK:
        conn = get_db()
        conn.execute(
            "INSERT OR REPLACE INTO epg_cache (start_date, fetched_at, events_json) VALUES (?, ?, ?)",
            (start_date_str, now_ts, json.dumps(events, ensure_ascii=False)),
        )
        conn.commit()
        conn.close()

    _EPG_MEMORY_CACHE[start_date_str] = {
        "fetched_at": now_ts,
        "fetched_at_iso": fetched_iso,
        "events": events,
    }
    return start_date_str, events, fetched_iso


def seed_starter_library_if_empty(events: List[Dict]) -> None:
    with _DB_LOCK:
        conn = get_db()
        count = conn.execute("SELECT COUNT(*) AS c FROM library").fetchone()["c"]
        del_count = conn.execute("SELECT COUNT(*) AS c FROM deleted_items").fetchone()["c"]
        if count > 0 or del_count > 0:
            conn.close()
            return

        movies_in_epg = []
        series_in_epg = []
        seen_m = set()
        seen_s = set()

        for ev in events:
            t_norm = ev.get("norm_title") or ""
            if not t_norm or len(t_norm) < 3:
                continue
            if ev["media_type"] == "movie" and t_norm not in seen_m and ev.get("poster"):
                seen_m.add(t_norm)
                movies_in_epg.append(ev)
            elif ev["media_type"] == "series" and t_norm not in seen_s and ev["lcn"] in (1, 2, 4, 5, 6, 7, 8, 9, 20, 21, 24, 25, 26, 27, 30, 37, 38, 39, 49):
                seen_s.add(t_norm)
                series_in_epg.append(ev)

        now_iso = datetime.datetime.now().isoformat()
        starter_items = []

        for idx, m in enumerate(movies_in_epg[:5]):
            status = "wishlist" if idx < 3 else "watched"
            aliases = get_aliases_for_titles(m["title"], m["title"])
            starter_items.append((
                f"seed_movie_{idx}_{m['norm_title'].replace(' ', '_')}",
                "movie",
                status,
                m["title"],
                m["title"],
                json.dumps(aliases, ensure_ascii=False),
                "",
                m.get("poster") or "",
                m.get("genre") or "Film",
                m.get("description") or f"Film in programmazione su {m['channel_name']} (Canale {m['lcn']}).",
                None,
                "",
                4 if status == "watched" else 0,
                "Esempio precaricato (puoi modificarlo o rimuoverlo)",
                now_iso,
            ))

        for idx, s in enumerate(series_in_epg[:5]):
            status = "wishlist" if idx < 2 else "watched"
            aliases = get_aliases_for_titles(s["title"], s["title"])
            starter_items.append((
                f"seed_series_{idx}_{s['norm_title'].replace(' ', '_')}",
                "series",
                status,
                s["title"],
                s["title"],
                json.dumps(aliases, ensure_ascii=False),
                "",
                s.get("poster") or "",
                s.get("genre") or "Serie TV",
                s.get("description") or f"Serie TV in onda su {s['channel_name']} (Canale {s['lcn']}).",
                None,
                "",
                5 if status == "watched" else 0,
                "Esempio precaricato (puoi tracciare gli episodi come su TV Time)",
                now_iso,
            ))

        for item in starter_items:
            conn.execute(
                """
                INSERT OR IGNORE INTO library (
                    external_id, media_type, status, title_it, title_original,
                    aliases_json, year, poster, genre, description,
                    tvmaze_id, imdb_id, rating, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                item,
            )

        watched_series_rows = conn.execute("SELECT id, title_it FROM library WHERE media_type = 'series' AND status = 'watched'").fetchall()
        for ws in watched_series_rows:
            conn.execute(
                "INSERT OR IGNORE INTO watched_episodes (series_id, season, episode, watched_at) VALUES (?, ?, ?, ?)",
                (ws["id"], 1, 1, now_iso),
            )

        conn.commit()
        conn.close()


def get_all_library_items() -> List[Dict]:
    with _DB_LOCK:
        conn = get_db()
        rows = conn.execute("SELECT * FROM library ORDER BY created_at DESC, id DESC").fetchall()
        ep_rows = conn.execute("SELECT series_id, season, episode FROM watched_episodes").fetchall()
        conn.close()

    ep_map: Dict[int, List[str]] = {}
    for er in ep_rows:
        sid = er["series_id"]
        ep_map.setdefault(sid, []).append(f"S{er['season']}E{er['episode']}")

    items = []
    for r in rows:
        d = dict(r)
        d["aliases"] = json.loads(d.get("aliases_json") or "[]")
        d["watched_episodes"] = ep_map.get(d["id"], [])
        d["watched_episodes_count"] = len(d["watched_episodes"])
        st_prov = []
        raw_st = d.get("streaming_json")
        if raw_st and raw_st not in ("", "[]", "null"):
            try:
                st_prov = json.loads(raw_st)
            except Exception:
                st_prov = []
        if not st_prov:
            st_prov = resolve_item_streaming_offers(
                d.get("title_it") or "",
                d.get("title_original") or "",
                d.get("media_type") or "movie",
                str(d.get("year") or ""),
                allow_live_fetch=False,
            )
        d["streaming_providers"] = st_prov
        items.append(d)
    return items


def export_library_to_json_file() -> None:
    """Exports the SQLite library to data/library.json and data/library_backup.json."""
    try:
        items = get_all_library_items()
        if not items:
            return
        os.makedirs("data", exist_ok=True)
        with open("data/library.json", "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        with open("data/library_backup.json", "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Backup] Errore esportazione automatica: {e}")

def match_epg_with_library(
    events: List[Dict],
    library_items: List[Dict],
    filter_mode: str = "all",
    day_filter: str = "all",
    time_slot: str = "all",
    only_unwatched_episodes: bool = False,
    lcn_filter: Optional[int] = None,
    include_sky: bool = False,
) -> Dict:
    filtered_lib = []
    for item in library_items:
        mtype = item["media_type"]
        st = item["status"]
        if filter_mode == "wishlist" and st != "wishlist":
            continue
        elif filter_mode == "watched_movies" and not (st == "watched" and mtype == "movie"):
            continue
        elif filter_mode == "watched_series" and not (st in ("watched", "watching") and mtype == "series"):
            continue
        elif filter_mode == "wishlist_movies" and not (st == "wishlist" and mtype == "movie"):
            continue
        elif filter_mode == "wishlist_series" and not (st == "wishlist" and mtype == "series"):
            continue
        filtered_lib.append(item)

    exact_map: Dict[str, List[Dict]] = {}
    stripped_map: Dict[str, List[Dict]] = {}
    for item in filtered_lib:
        aliases = item.get("aliases") or get_aliases_for_titles(item["title_it"], item.get("title_original") or "")
        for al in aliases:
            if not al:
                continue
            exact_map.setdefault(al, []).append(item)
            st_al = strip_leading_article(al)
            if st_al and len(st_al) >= 4:
                stripped_map.setdefault(st_al, []).append(item)

    with _DB_LOCK:
        conn = get_db()
        rem_rows = conn.execute("SELECT event_id FROM reminders").fetchall()
        conn.close()
    reminder_ids = {r["event_id"] for r in rem_rows}

    matched_broadcasts = []
    counts_by_category = {
        "all": 0,
        "wishlist": 0,
        "watched_movies": 0,
        "watched_series": 0,
    }

    full_exact_map: Dict[str, List[Dict]] = {}
    for item in library_items:
        for al in (item.get("aliases") or get_aliases_for_titles(item["title_it"], item.get("title_original") or "")):
            if al:
                full_exact_map.setdefault(al, []).append(item)

    def _is_place(p: Optional[str]) -> bool:
        if not p:
            return True
        p_l = p.lower()
        return "placeholder" in p_l or "logo" in p_l or "blank" in p_l

    deduped_slot_map: Dict[str, Dict] = {}

    for ev in events:
        if ev.get("media_type") not in ("movie", "series"):
            continue
        is_sky_ev = bool(ev.get("is_sky") or (ev.get("lcn") or 0) >= 100)
        if not include_sky and is_sky_ev:
            continue
        ev_norm = ev.get("norm_title") or ""
        if not ev_norm:
            continue

        candidates = exact_map.get(ev_norm)
        if not candidates:
            st_norm = strip_leading_article(ev_norm)
            if st_norm and len(st_norm) >= 5:
                candidates = stripped_map.get(st_norm)

        if not candidates:
            continue

        lib_item = None
        for cand in candidates:
            if cand["media_type"] == ev["media_type"]:
                lib_item = cand
                break
        if not lib_item:
            continue

        chan_key = str(ev.get("lcn") or ev.get("channel_name") or "")
        date_key = ev.get("date") or ""
        time_key = (ev.get("start_time") or "00:00")[:5]
        slot_key = f"{chan_key}_{date_key}_{time_key}"

        existing = deduped_slot_map.get(slot_key)
        if not existing and lib_item.get("id"):
            for cand_ev in deduped_slot_map.values():
                if (
                    str(cand_ev.get("lcn") or cand_ev.get("channel_name") or "") == chan_key
                    and cand_ev.get("date") == date_key
                    and cand_ev.get("library_item", {}).get("id") == lib_item["id"]
                ):
                    try:
                        h1, m1 = map(int, (cand_ev.get("start_time") or "00:00").split(":")[:2])
                        h2, m2 = map(int, time_key.split(":")[:2])
                        if abs((h1 * 60 + m1) - (h2 * 60 + m2)) <= 15:
                            existing = cand_ev
                            break
                    except Exception:
                        pass

        watched_ep_set = set(lib_item.get("watched_episodes") or [])
        s_num = ev.get("season")
        e_num = ev.get("episode")
        ep_code = f"S{s_num}E{e_num}" if (s_num is not None and e_num is not None) else ""
        is_ep_watched = (ep_code in watched_ep_set) if ep_code else (lib_item["status"] == "watched" and lib_item["media_type"] == "movie")

        if existing:
            # Merge richer poster and details
            if _is_place(existing.get("poster")) and not _is_place(ev.get("poster")):
                existing["poster"] = ev["poster"]
            if len(ev.get("description") or "") > len(existing.get("description") or ""):
                existing["description"] = ev["description"]
            if existing.get("season") is None and s_num is not None:
                existing["season"] = s_num
            if existing.get("episode") is None and e_num is not None:
                existing["episode"] = e_num
                existing["ep_code"] = ep_code
                existing["is_episode_watched"] = is_ep_watched
            if not existing.get("episode_title") and ev.get("episode_title"):
                existing["episode_title"] = ev["episode_title"]
            if lib_item.get("title_it") and ev.get("media_type") == "movie":
                existing["title"] = lib_item["title_it"]
        else:
            enriched = dict(ev)
            if lib_item.get("title_it") and ev.get("media_type") == "movie":
                enriched["title"] = lib_item["title_it"]
            if not enriched.get("poster") and lib_item.get("poster"):
                enriched["poster"] = lib_item["poster"]
            enriched["library_item"] = {
                "id": lib_item["id"],
                "title_it": lib_item["title_it"],
                "title_original": lib_item["title_original"],
                "media_type": lib_item["media_type"],
                "status": lib_item["status"],
                "rating": lib_item.get("rating") or 0,
            }
            enriched["ep_code"] = ep_code
            enriched["is_episode_watched"] = is_ep_watched
            enriched["has_reminder"] = ev["id"] in reminder_ids
            deduped_slot_map[slot_key] = enriched

    # Calculate deduplicated category counts and apply view filters
    for enriched in deduped_slot_map.values():
        lib_it = enriched["library_item"]
        st = lib_it["status"]
        mtype = lib_it["media_type"]

        counts_by_category["all"] += 1
        if st == "wishlist":
            counts_by_category["wishlist"] += 1
        elif st == "watched" and mtype == "movie":
            counts_by_category["watched_movies"] += 1
        elif st in ("watched", "watching") and mtype == "series":
            counts_by_category["watched_series"] += 1

        if filter_mode == "wishlist" and st != "wishlist":
            continue
        if filter_mode == "watched_movies" and not (st == "watched" and mtype == "movie"):
            continue
        if filter_mode == "watched_series" and not (st in ("watched", "watching") and mtype == "series"):
            continue

        if day_filter != "all" and enriched["date"] != day_filter:
            continue
        if lcn_filter and enriched["lcn"] != lcn_filter:
            continue

        hh_mm = enriched.get("start_time") or "00:00"
        if time_slot == "primetime" and not ("20:20" <= hh_mm <= "23:15"):
            continue
        elif time_slot == "evening" and not (hh_mm >= "19:00" or hh_mm <= "00:30"):
            continue
        elif time_slot == "daytime" and not ("06:00" <= hh_mm < "19:00"):
            continue

        if only_unwatched_episodes and enriched.get("is_episode_watched"):
            continue

        matched_broadcasts.append(enriched)

    return {
        "matches": matched_broadcasts,
        "counts": counts_by_category,
    }


def build_cloud_snapshot() -> Dict:
    """Build complete state snapshot (Library + Watched Episodes + Reminders + 7-day Matches) for Cloud Sync."""
    s_date, events, fetched_iso = get_7day_epg_cached()
    lib_items = get_all_library_items()
    match_res = match_epg_with_library(events, lib_items, filter_mode="all")

    with _DB_LOCK:
        conn = get_db()
        rem_rows = [dict(r) for r in conn.execute("SELECT * FROM reminders").fetchall()]
        del_rows = [r["norm_key"] for r in conn.execute("SELECT norm_key FROM deleted_items").fetchall()]
        conn.close()

    cfg = get_or_create_sync_config()
    return {
        "app": "NextOnTV",
        "sync_code": cfg["sync_code"],
        "updated_at": time.time(),
        "updated_iso": datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "source": "pc",
        "tunnel_url": _PUBLIC_TUNNEL_URL,
        "start_date": s_date,
        "fetched_at": fetched_iso,
        "days": [
            (datetime.date.fromisoformat(s_date) + datetime.timedelta(days=i)).isoformat()
            for i in range(7)
        ],
        "library": lib_items,
        "deleted_keys": del_rows,
        "reminders": rem_rows,
        "matches": match_res["matches"],
        "counts": match_res["counts"],
    }


def trigger_async_cloud_push() -> None:
    """Push current PC state to the Cloud in a background thread."""
    def _worker():
        try:
            cfg = get_or_create_sync_config()
            snap = build_cloud_snapshot()
            push_snapshot_to_cloud(cfg["sync_code"], snap)
        except Exception:
            pass

    threading.Thread(target=_worker, daemon=True).start()


def merge_cloud_snapshot_into_db(snapshot: Dict) -> int:
    """
    Merge a cloud snapshot (e.g. modified on the user's Android phone over 4G/5G)
    into the local PC SQLite database. Returns number of changes applied.
    """
    if not snapshot or not isinstance(snapshot, dict):
        return 0

    cloud_items = snapshot.get("library") or []
    cloud_deleted = set(snapshot.get("deleted_keys") or [])
    changes = 0
    now_iso = datetime.datetime.now().isoformat()

    with _DB_LOCK:
        conn = get_db()
        local_del_rows = conn.execute("SELECT norm_key FROM deleted_items").fetchall()
        local_deleted = {r["norm_key"] for r in local_del_rows}

        # Apply cloud deletions
        for d_key in cloud_deleted:
            if d_key not in local_deleted:
                conn.execute("INSERT OR IGNORE INTO deleted_items (norm_key, deleted_at) VALUES (?, ?)", (d_key, now_iso))
                local_deleted.add(d_key)

        existing_rows = conn.execute("SELECT * FROM library").fetchall()
        norm_to_local = {}
        for er in existing_rows:
            k = f"{er['media_type']}_{normalize_title(er['title_it'])}"
            if k in cloud_deleted:
                conn.execute("DELETE FROM library WHERE id = ?", (er["id"],))
                conn.execute("DELETE FROM watched_episodes WHERE series_id = ?", (er["id"],))
                changes += 1
            else:
                norm_to_local[k] = dict(er)

        # Merge cloud library items
        for c_item in cloud_items:
            title_it = (c_item.get("title_it") or "").strip()
            if not title_it:
                continue
            mtype = c_item.get("media_type") if c_item.get("media_type") in ("movie", "series") else "movie"
            k = f"{mtype}_{normalize_title(title_it)}"
            if k in local_deleted:
                conn.execute("DELETE FROM deleted_items WHERE norm_key = ?", (k,))
                local_deleted.discard(k)

            status = c_item.get("status") if c_item.get("status") in ("wishlist", "watched") else "wishlist"
            title_orig = (c_item.get("title_original") or title_it).strip()
            aliases = c_item.get("aliases") or get_aliases_for_titles(title_it, title_orig)

            if k not in norm_to_local:
                cur = conn.execute(
                    """
                    INSERT OR IGNORE INTO library (
                        external_id, media_type, status, title_it, title_original,
                        aliases_json, year, poster, genre, description,
                        tvmaze_id, imdb_id, rating, notes, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        c_item.get("external_id") or f"cloud_{k.replace(' ', '_')}",
                        mtype,
                        status,
                        title_it,
                        title_orig,
                        json.dumps(aliases, ensure_ascii=False),
                        str(c_item.get("year") or ""),
                        c_item.get("poster") or "",
                        c_item.get("genre") or ("Serie TV" if mtype == "series" else "Film"),
                        c_item.get("description") or "",
                        c_item.get("tvmaze_id"),
                        c_item.get("imdb_id") or "",
                        int(c_item.get("rating") or 0),
                        c_item.get("notes") or "",
                        c_item.get("created_at") or now_iso,
                    ),
                )
                series_id = cur.lastrowid
                changes += 1
            else:
                loc = norm_to_local[k]
                series_id = loc["id"]
                if loc["status"] != status and snapshot.get("source") == "mobile":
                    conn.execute("UPDATE library SET status = ? WHERE id = ?", (status, series_id))
                    changes += 1

            # Merge watched episodes for series
            if mtype == "series" and series_id:
                for ep_code in c_item.get("watched_episodes") or []:
                    m_ep = re.match(r"^S(\d+)E(\d+)$", str(ep_code))
                    if m_ep:
                        conn.execute(
                            "INSERT OR IGNORE INTO watched_episodes (series_id, season, episode, watched_at) VALUES (?, ?, ?, ?)",
                            (series_id, int(m_ep.group(1)), int(m_ep.group(2)), now_iso),
                        )

        conn.commit()
        conn.close()

    if changes > 0:
        try:
            export_library_to_json_file()
        except Exception:
            pass

    return changes


class NextOnTVRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _send_json(self, data: object, status: int = 200) -> None:
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(raw)

    def _read_body_json(self) -> Dict:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8", errors="ignore")
        return json.loads(raw) if raw else {}

    def do_OPTIONS(self):
        self._send_json({"ok": True})

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)

        if path == "/api/status":
            start_date = (qs.get("start_date") or [None])[0]
            s_date, events, fetched_iso = get_7day_epg_cached(start_date)
            seed_starter_library_if_empty(events)
            lib_items = get_all_library_items()
            days_available = sorted({e["date"] for e in events})
            lan_ip = get_lan_ip()
            cfg = get_or_create_sync_config()
            sync_code = cfg["sync_code"]
            return self._send_json({
                "ok": True,
                "start_date": s_date,
                "fetched_at": fetched_iso,
                "total_epg_events": len(events),
                "total_movies_in_epg": sum(1 for e in events if e["media_type"] == "movie"),
                "total_series_in_epg": sum(1 for e in events if e["media_type"] == "series"),
                "channels_count": len(DTT_CHANNELS),
                "days": days_available,
                "library_count": len(lib_items),
                "lan_ip": lan_ip,
                "mobile_url": f"http://{lan_ip}:8080/?sync={sync_code}",
                "public_url": f"{_PUBLIC_TUNNEL_URL}/?sync={sync_code}" if _PUBLIC_TUNNEL_URL else "",
                "sync_code": sync_code,
            })

        if path == "/api/channels":
            return self._send_json({
                "channels": ALL_CHANNELS,
                "dtt_channels": DTT_CHANNELS,
                "sky_channels": SKY_CHANNELS,
            })

        if path == "/api/streaming":
            start_date = (qs.get("start_date") or [None])[0]
            _, events, _ = get_7day_epg_cached(start_date)
            seed_starter_library_if_empty(events)
            items = get_all_library_items()
            for item in items:
                if not item.get("streaming_providers"):
                    offers = resolve_item_streaming_offers(
                        item.get("title_it") or "",
                        item.get("title_original") or "",
                        item.get("media_type") or "movie",
                        str(item.get("year") or ""),
                        allow_live_fetch=True,
                    )
                    item["streaming_providers"] = offers
                    if item.get("id"):
                        with _DB_LOCK:
                            conn = get_db()
                            conn.execute(
                                "UPDATE library SET streaming_json = ? WHERE id = ?",
                                (json.dumps(offers, ensure_ascii=False), item["id"]),
                            )
                            conn.commit()
                            conn.close()
            return self._send_json({
                "platforms": STREAMING_PLATFORMS,
                "items": items,
            })

        if path == "/api/library":
            start_date = (qs.get("start_date") or [None])[0]
            include_sky = (qs.get("include_sky") or ["0"])[0] == "1"
            _, events, _ = get_7day_epg_cached(start_date)
            seed_starter_library_if_empty(events)
            items = get_all_library_items()
            epg_norm_counts: Dict[str, List[Dict]] = {}
            for ev in events:
                is_sky_ev = bool(ev.get("is_sky") or (ev.get("lcn") or 0) >= 100)
                if not include_sky and is_sky_ev:
                    continue
                if ev["media_type"] in ("movie", "series") and ev.get("norm_title"):
                    epg_norm_counts.setdefault(ev["norm_title"], []).append({
                        "date": ev["date"],
                        "start_time": ev["start_time"],
                        "lcn": ev["lcn"],
                        "channel_name": ev["channel_name"],
                        "season": ev.get("season"),
                        "episode": ev.get("episode"),
                        "episode_title": ev.get("episode_title"),
                        "is_sky": is_sky_ev,
                    })
            for item in items:
                upcoming = []
                for al in item.get("aliases") or []:
                    upcoming.extend(epg_norm_counts.get(al) or [])
                seen_u = set()
                clean_u = []
                for u in sorted(upcoming, key=lambda x: (x["date"], x["start_time"])):
                    k = (u["date"], u["start_time"], u["lcn"])
                    if k not in seen_u:
                        seen_u.add(k)
                        clean_u.append(u)
                item["upcoming_airings"] = clean_u
            return self._send_json({"items": items})

        if path == "/api/matches":
            start_date = (qs.get("start_date") or [None])[0]
            force = (qs.get("refresh") or ["0"])[0] == "1"
            filter_mode = (qs.get("filter_mode") or ["all"])[0]
            day_filter = (qs.get("day") or ["all"])[0]
            time_slot = (qs.get("time_slot") or ["all"])[0]
            only_unwatched = (qs.get("only_unwatched") or ["0"])[0] == "1"
            include_sky = (qs.get("include_sky") or ["0"])[0] == "1"
            lcn_str = (qs.get("lcn") or [""])[0]
            lcn_filter = int(lcn_str) if lcn_str.isdigit() else None

            s_date, events, fetched_iso = get_7day_epg_cached(start_date, force_refresh=force)
            seed_starter_library_if_empty(events)
            lib_items = get_all_library_items()
            res = match_epg_with_library(
                events=events,
                library_items=lib_items,
                filter_mode=filter_mode,
                day_filter=day_filter,
                time_slot=time_slot,
                only_unwatched_episodes=only_unwatched,
                lcn_filter=lcn_filter,
                include_sky=include_sky,
            )
            days_available = [
                (datetime.date.fromisoformat(s_date) + datetime.timedelta(days=i)).isoformat()
                for i in range(7)
            ]
            return self._send_json({
                "start_date": s_date,
                "fetched_at": fetched_iso,
                "days": days_available,
                "total_epg_events": len(events),
                "channels_polled": len({e["lcn"] for e in events}),
                "matches": res["matches"],
                "counts": res["counts"],
                "include_sky": include_sky,
            })

        if path == "/api/explore_epg":
            start_date = (qs.get("start_date") or [None])[0]
            media_filter = (qs.get("media_type") or ["all"])[0]
            day_filter = (qs.get("day") or ["all"])[0]
            time_slot = (qs.get("time_slot") or ["primetime"])[0]
            include_sky = (qs.get("include_sky") or ["0"])[0] == "1"
            lcn_str = (qs.get("lcn") or [""])[0]
            q_raw = (qs.get("q") or [""])[0].strip()

            s_date, events, fetched_iso = get_7day_epg_cached(start_date)
            lib_items = get_all_library_items()
            lib_map = {}
            for it in lib_items:
                for al in it.get("aliases") or []:
                    lib_map[al] = it
                    c_al = strip_conjunctions(al)
                    if c_al:
                        lib_map[c_al] = it

            filtered = []
            for ev in events:
                if ev["media_type"] not in ("movie", "series"):
                    continue
                is_sky_ev = bool(ev.get("is_sky") or (ev.get("lcn") or 0) >= 100)
                if not include_sky and is_sky_ev:
                    continue
                if media_filter in ("movie", "series") and ev["media_type"] != media_filter:
                    continue
                if day_filter != "all" and ev["date"] != day_filter:
                    continue
                if lcn_str.isdigit() and ev["lcn"] != int(lcn_str):
                    continue
                hh_mm = ev.get("start_time") or "00:00"
                if time_slot == "primetime" and not ("20:20" <= hh_mm <= "23:15"):
                    continue
                elif time_slot == "evening" and not (hh_mm >= "19:00" or hh_mm <= "00:30"):
                    continue
                if q_raw:
                    ok_m, _ = fuzzy_match_title(q_raw, ev.get("title") or ev.get("norm_title") or "")
                    if not ok_m:
                        continue

                ev_copy = dict(ev)
                ev_norm = ev.get("norm_title") or ""
                matched_lib = lib_map.get(ev_norm) or lib_map.get(strip_conjunctions(ev_norm))
                ev_copy["in_library_status"] = matched_lib["status"] if matched_lib else None
                ev_copy["in_library_id"] = matched_lib["id"] if matched_lib else None
                filtered.append(ev_copy)

            return self._send_json({
                "start_date": s_date,
                "fetched_at": fetched_iso,
                "events": filtered[:250],
                "total": len(filtered),
            })

        if path == "/api/search":
            q = (qs.get("q") or [""])[0].strip()
            _, events, _ = get_7day_epg_cached()
            results = search_catalog(q, epg_events=events)
            lib_items = get_all_library_items()
            lib_by_norm = {}
            for it in lib_items:
                for al in it.get("aliases") or []:
                    lib_by_norm[al] = it
                    c_al = strip_conjunctions(al)
                    if c_al:
                        lib_by_norm[c_al] = it

            for r in results:
                n_it = normalize_title(r["title_it"])
                n_or = normalize_title(r["title_original"])
                existing = (
                    lib_by_norm.get(n_it)
                    or lib_by_norm.get(n_or)
                    or lib_by_norm.get(strip_conjunctions(n_it))
                    or lib_by_norm.get(strip_conjunctions(n_or))
                )
                r["in_library_status"] = existing["status"] if existing else None
                r["in_library_id"] = existing["id"] if existing else None
                r["watched_episodes_count"] = existing.get("watched_episodes_count", 0) if existing else 0
            return self._send_json({"results": results})

        if path == "/api/series_episodes":
            series_id_str = (qs.get("series_id") or ["0"])[0]
            series_id = int(series_id_str) if series_id_str.isdigit() else 0
            q_title_it = (qs.get("title_it") or [""])[0].strip()
            q_title_orig = (qs.get("title_original") or [q_title_it])[0].strip()
            q_tvmaze_str = (qs.get("tvmaze_id") or [""])[0].strip()
            q_tvmaze_id = int(q_tvmaze_str) if q_tvmaze_str.isdigit() else None

            row = None
            watched_rows = []
            with _DB_LOCK:
                conn = get_db()
                if series_id > 0:
                    row = conn.execute("SELECT * FROM library WHERE id = ?", (series_id,)).fetchone()
                elif q_title_it:
                    n_target = normalize_title(q_title_it)
                    for cand in conn.execute("SELECT * FROM library WHERE media_type = 'series'").fetchall():
                        if normalize_title(cand["title_it"]) == n_target:
                            row = cand
                            series_id = cand["id"]
                            break
                if series_id > 0:
                    watched_rows = conn.execute(
                        "SELECT season, episode FROM watched_episodes WHERE series_id = ?",
                        (series_id,),
                    ).fetchall()
                conn.close()

            if not row and not q_title_it and not q_tvmaze_id:
                return self._send_json({"error": "Serie non trovata"}, 404)

            resolved_tvmaze = (row["tvmaze_id"] if row else None) or q_tvmaze_id
            resolved_title_orig = (row["title_original"] if row else "") or q_title_orig or q_title_it
            resolved_title_it = (row["title_it"] if row else "") or q_title_it or q_title_orig

            _, events, _ = get_7day_epg_cached()
            episodes = fetch_series_episodes(
                tvmaze_id=resolved_tvmaze,
                title_original=resolved_title_orig,
                title_it=resolved_title_it,
                epg_events=events,
            )
            watched_set = {(wr["season"], wr["episode"]) for wr in watched_rows}
            is_completed = bool(row and row["status"] == "watched")
            if is_completed and episodes:
                now_iso = datetime.datetime.now().isoformat()
                with _DB_LOCK:
                    conn = get_db()
                    for ep in episodes:
                        conn.execute(
                            "INSERT OR IGNORE INTO watched_episodes (series_id, season, episode, watched_at) VALUES (?, ?, ?, ?)",
                            (series_id, int(ep["season"]), int(ep["episode"]), now_iso),
                        )
                    conn.commit()
                    conn.close()
                for ep in episodes:
                    ep["watched"] = True
            else:
                for ep in episodes:
                    ep["watched"] = (ep["season"], ep["episode"]) in watched_set

            return self._send_json({
                "series_id": series_id,
                "title_it": resolved_title_it,
                "episodes": episodes,
                "total_episodes": len(episodes),
                "watched_count": sum(1 for ep in episodes if ep["watched"]),
            })

        if path == "/api/reminders":
            with _DB_LOCK:
                conn = get_db()
                rows = conn.execute("SELECT * FROM reminders ORDER BY date ASC, start_time ASC").fetchall()
                conn.close()
            return self._send_json({"reminders": [dict(r) for r in rows]})

        if path == "/" or path == "/index.html":
            file_path = os.path.join(BASE_DIR, "index.html")
        else:
            rel = path.lstrip("/").replace("/", os.sep)
            file_path = os.path.join(BASE_DIR, rel)
            if not os.path.isfile(file_path) and os.path.isdir(STATIC_DIR):
                file_path = os.path.join(STATIC_DIR, rel)

        if os.path.isfile(file_path):
            mime, _ = mimetypes.guess_type(file_path)
            mime = mime or "application/octet-stream"
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", f"{mime}; charset=utf-8" if mime.startswith("text/") or mime.endswith("json") or mime.endswith("javascript") else mime)
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return

        self._send_json({"error": "Not found"}, 404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self._read_body_json()

        if path == "/api/library":
            title_it = (body.get("title_it") or body.get("title") or "").strip()
            if not title_it:
                return self._send_json({"error": "Titolo obbligatorio"}, 400)
            title_orig = (body.get("title_original") or title_it).strip()
            media_type = body.get("media_type") if body.get("media_type") in ("movie", "series") else "movie"
            status = body.get("status") if body.get("status") in ("wishlist", "watching", "watched") else "wishlist"
            n_target = normalize_title(title_it)
            ext_id = body.get("external_id") or f"custom_{media_type}_{n_target.replace(' ', '_')}"
            aliases = get_aliases_for_titles(title_it, title_orig)
            now_iso = datetime.datetime.now().isoformat()

            all_eps_to_mark = []
            if media_type == "series" and status == "watched":
                _, events_cached, _ = get_7day_epg_cached()
                all_eps_to_mark = fetch_series_episodes(
                    tvmaze_id=body.get("tvmaze_id"),
                    title_original=title_orig,
                    title_it=title_it,
                    epg_events=events_cached,
                )

            streaming_offers = body.get("streaming_providers")
            if not isinstance(streaming_offers, list) or not streaming_offers:
                streaming_offers = resolve_item_streaming_offers(
                    title_it,
                    title_orig,
                    media_type,
                    str(body.get("year") or ""),
                    allow_live_fetch=True,
                )

            with _DB_LOCK:
                conn = get_db()
                # Remove from deleted tombstones if re-added
                conn.execute("DELETE FROM deleted_items WHERE norm_key = ?", (f"{media_type}_{n_target}",))

                existing_rows = conn.execute("SELECT id, title_it, aliases_json FROM library WHERE media_type = ?", (media_type,)).fetchall()
                matched_id = None
                for er in existing_rows:
                    if normalize_title(er["title_it"]) == n_target:
                        matched_id = er["id"]
                        break

                if matched_id:
                    conn.execute(
                        "UPDATE library SET status = ?, rating = COALESCE(?, rating), notes = COALESCE(?, notes), streaming_json = ? WHERE id = ?",
                        (status, body.get("rating"), body.get("notes"), json.dumps(streaming_offers, ensure_ascii=False), matched_id),
                    )
                    item_id = matched_id
                else:
                    cur = conn.execute(
                        """
                        INSERT OR REPLACE INTO library (
                            external_id, media_type, status, title_it, title_original,
                            aliases_json, year, poster, genre, description,
                            tvmaze_id, imdb_id, rating, notes, streaming_json, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            ext_id,
                            media_type,
                            status,
                            title_it,
                            title_orig,
                            json.dumps(aliases, ensure_ascii=False),
                            str(body.get("year") or ""),
                            body.get("poster") or "",
                            body.get("genre") or ("Serie TV" if media_type == "series" else "Film"),
                            body.get("description") or "",
                            body.get("tvmaze_id"),
                            body.get("imdb_id") or "",
                            int(body.get("rating") or 0),
                            body.get("notes") or "",
                            json.dumps(streaming_offers, ensure_ascii=False),
                            now_iso,
                        ),
                    )
                    item_id = cur.lastrowid

                if media_type == "series":
                    if status == "wishlist":
                        conn.execute("DELETE FROM watched_episodes WHERE series_id = ?", (item_id,))
                    elif status == "watched" and all_eps_to_mark:
                        for ep in all_eps_to_mark:
                            conn.execute(
                                "INSERT OR REPLACE INTO watched_episodes (series_id, season, episode, watched_at) VALUES (?, ?, ?, ?)",
                                (item_id, int(ep["season"]), int(ep["episode"]), now_iso),
                            )

                ep_cnt = (
                    conn.execute("SELECT COUNT(*) AS c FROM watched_episodes WHERE series_id = ?", (item_id,)).fetchone()["c"]
                    if media_type == "series"
                    else 0
                )
                conn.commit()
                conn.close()

            try:
                export_library_to_json_file()
            except Exception:
                pass
            trigger_async_cloud_push()
            return self._send_json({
                "ok": True,
                "id": item_id,
                "status": status,
                "title_it": title_it,
                "watched_episodes_count": ep_cnt,
                "streaming_providers": streaming_offers,
            })

        if path == "/api/library/status":
            item_id = body.get("id")
            new_status = body.get("status")
            rating = body.get("rating")
            notes = body.get("notes")
            if not item_id:
                return self._send_json({"error": "ID mancante"}, 400)
            now_iso = datetime.datetime.now().isoformat()

            row_meta = None
            with _DB_LOCK:
                conn = get_db()
                row_meta = conn.execute("SELECT * FROM library WHERE id = ?", (item_id,)).fetchone()
                conn.close()

            all_eps_to_mark = []
            if row_meta and row_meta["media_type"] == "series" and new_status == "watched":
                _, events_cached, _ = get_7day_epg_cached()
                all_eps_to_mark = fetch_series_episodes(
                    tvmaze_id=row_meta["tvmaze_id"],
                    title_original=row_meta["title_original"] or "",
                    title_it=row_meta["title_it"] or "",
                    epg_events=events_cached,
                )

            with _DB_LOCK:
                conn = get_db()
                if new_status in ("wishlist", "watching", "watched"):
                    conn.execute("UPDATE library SET status = ? WHERE id = ?", (new_status, item_id))
                    if row_meta and row_meta["media_type"] == "series":
                        if new_status == "wishlist":
                            conn.execute("DELETE FROM watched_episodes WHERE series_id = ?", (item_id,))
                        elif new_status == "watched" and all_eps_to_mark:
                            for ep in all_eps_to_mark:
                                conn.execute(
                                    "INSERT OR REPLACE INTO watched_episodes (series_id, season, episode, watched_at) VALUES (?, ?, ?, ?)",
                                    (item_id, int(ep["season"]), int(ep["episode"]), now_iso),
                                )
                if rating is not None:
                    conn.execute("UPDATE library SET rating = ? WHERE id = ?", (int(rating), item_id))
                if notes is not None:
                    conn.execute("UPDATE library SET notes = ? WHERE id = ?", (str(notes), item_id))
                conn.commit()
                conn.close()

            try:
                export_library_to_json_file()
            except Exception:
                pass
            trigger_async_cloud_push()
            return self._send_json({"ok": True})

        if path == "/api/library/delete":
            item_id = body.get("id")
            title_it = (body.get("title_it") or body.get("title") or "").strip()
            title_original = (body.get("title_original") or "").strip()
            media_type = body.get("media_type") or ""
            now_iso = datetime.datetime.now().isoformat()
            with _DB_LOCK:
                conn = get_db()
                row = None
                if item_id:
                    row = conn.execute("SELECT id, media_type, title_it FROM library WHERE id = ?", (item_id,)).fetchone()
                if not row and (title_it or title_original):
                    n_target = normalize_title(title_it)
                    n_target_clean = strip_conjunctions(n_target)
                    n_orig = normalize_title(title_original)
                    n_orig_clean = strip_conjunctions(n_orig)
                    candidates = conn.execute("SELECT id, media_type, title_it, title_original, aliases FROM library").fetchall()
                    for c in candidates:
                        if media_type and c["media_type"] != media_type:
                            continue
                        c_norm = normalize_title(c["title_it"])
                        c_clean = strip_conjunctions(c_norm)
                        c_orig = normalize_title(c["title_original"] or "")
                        c_orig_clean = strip_conjunctions(c_orig)
                        if n_target and (c_norm == n_target or c_clean == n_target_clean):
                            row = c
                            break
                        if n_orig and (c_norm == n_orig or c_orig == n_orig or c_clean == n_orig_clean or c_orig_clean == n_orig_clean):
                            row = c
                            break
                        try:
                            al_list = json.loads(c["aliases"] or "[]")
                            if any(normalize_title(a) in (n_target, n_orig) for a in al_list):
                                row = c
                                break
                        except Exception:
                            pass
                if row:
                    target_id = row["id"]
                    d_key = f"{row['media_type']}_{normalize_title(row['title_it'])}"
                    conn.execute(
                        "INSERT OR REPLACE INTO deleted_items (norm_key, deleted_at) VALUES (?, ?)",
                        (d_key, now_iso),
                    )
                    conn.execute("DELETE FROM library WHERE id = ?", (target_id,))
                    conn.execute("DELETE FROM watched_episodes WHERE series_id = ?", (target_id,))
                conn.commit()
                conn.close()

            try:
                export_library_to_json_file()
            except Exception:
                pass
            trigger_async_cloud_push()
            return self._send_json({"ok": True})

        if path == "/api/library/batch":
            action = body.get("action")  # "wishlist", "watching", "watched", or "delete"
            items = body.get("items") or []
            if action not in ("wishlist", "watching", "watched", "delete", "restore") or not isinstance(items, list):
                return self._send_json({"error": "Parametri batch non validi"}, 400)

            if action == "restore":
                with _DB_LOCK:
                    conn = get_db()
                    conn.execute("DELETE FROM library")
                    conn.execute("DELETE FROM watched_episodes")
                    conn.execute("DELETE FROM deleted_items")
                    conn.commit()
                    conn.close()

            now_iso = datetime.datetime.now().isoformat()
            _, events_cached, _ = get_7day_epg_cached()
            processed = 0
            with _DB_LOCK:
                conn = get_db()
                existing_rows = conn.execute("SELECT id, media_type, title_it, title_original, tvmaze_id FROM library").fetchall()
                existing_map = {
                    (r["media_type"], normalize_title(r["title_it"])): r["id"]
                    for r in existing_rows
                }

                for it in items:
                    title_it = (it.get("title_it") or it.get("title") or "").strip()
                    if not title_it:
                        continue
                    title_orig = (it.get("title_original") or title_it).strip()
                    media_type = it.get("media_type") if it.get("media_type") in ("movie", "series") else "movie"
                    n_target = normalize_title(title_it)
                    d_key = f"{media_type}_{n_target}"
                    matched_id = it.get("id") or it.get("in_library_id") or existing_map.get((media_type, n_target))

                    if action == "delete":
                        if matched_id:
                            conn.execute(
                                "INSERT OR REPLACE INTO deleted_items (norm_key, deleted_at) VALUES (?, ?)",
                                (d_key, now_iso),
                            )
                            conn.execute("DELETE FROM library WHERE id = ?", (matched_id,))
                            conn.execute("DELETE FROM watched_episodes WHERE series_id = ?", (matched_id,))
                            existing_map.pop((media_type, n_target), None)
                            processed += 1
                    else:
                        conn.execute("DELETE FROM deleted_items WHERE norm_key = ?", (d_key,))
                        item_status = it.get("status") or "wishlist" if action == "restore" else action
                        if matched_id and action != "restore":
                            conn.execute("UPDATE library SET status = ? WHERE id = ?", (action, matched_id))
                            target_series_id = matched_id
                            processed += 1
                        else:
                            ext_id = it.get("external_id") or f"custom_{media_type}_{n_target.replace(' ', '_')}"
                            aliases = get_aliases_for_titles(title_it, title_orig)
                            cur = conn.execute(
                                """
                                INSERT OR REPLACE INTO library (
                                    external_id, media_type, status, title_it, title_original,
                                    aliases_json, year, poster, genre, description,
                                    tvmaze_id, imdb_id, rating, notes, created_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """,
                                (
                                    ext_id,
                                    media_type,
                                    item_status,
                                    title_it,
                                    title_orig,
                                    json.dumps(aliases, ensure_ascii=False),
                                    str(it.get("year") or ""),
                                    it.get("poster") or "",
                                    it.get("genre") or ("Serie TV" if media_type == "series" else "Film"),
                                    it.get("description") or "",
                                    it.get("tvmaze_id"),
                                    it.get("imdb_id") or "",
                                    int(it.get("rating") or 0),
                                    it.get("notes") or "",
                                    it.get("created_at") or now_iso,
                                ),
                            )
                            target_series_id = cur.lastrowid
                            existing_map[(media_type, n_target)] = target_series_id
                            processed += 1

                        if media_type == "series" and target_series_id:
                            if action == "restore" and it.get("watched_episodes"):
                                for ep_code in it.get("watched_episodes", []):
                                    m_code = re.match(r"S(\d+)E(\d+)", str(ep_code), re.I)
                                    if m_code:
                                        conn.execute(
                                            "INSERT OR IGNORE INTO watched_episodes (series_id, season, episode, watched_at) VALUES (?, ?, ?, ?)",
                                            (target_series_id, int(m_code.group(1)), int(m_code.group(2)), now_iso),
                                        )
                            elif item_status == "wishlist":
                                conn.execute("DELETE FROM watched_episodes WHERE series_id = ?", (target_series_id,))
                            elif item_status == "watched":
                                eps_all = fetch_series_episodes(
                                    tvmaze_id=it.get("tvmaze_id"),
                                    title_original=title_orig,
                                    title_it=title_it,
                                    epg_events=events_cached,
                                )
                                for ep in eps_all:
                                    conn.execute(
                                        "INSERT OR REPLACE INTO watched_episodes (series_id, season, episode, watched_at) VALUES (?, ?, ?, ?)",
                                        (target_series_id, int(ep["season"]), int(ep["episode"]), now_iso),
                                    )

                conn.commit()
                conn.close()

            try:
                export_library_to_json_file()
            except Exception:
                pass
            trigger_async_cloud_push()
            return self._send_json({"ok": True, "action": action, "processed": processed})

        if path == "/api/episodes/toggle":
            series_id = int(body.get("series_id") or 0)
            season = int(body.get("season") or 1)
            episode = int(body.get("episode") or 1)
            watched = bool(body.get("watched", True))
            total_episodes = int(body.get("total_episodes") or 0)
            series_meta = body.get("series_meta") or {}
            created_from_search = bool(body.get("created_from_search", False))
            now_iso = datetime.datetime.now().isoformat()
            with _DB_LOCK:
                conn = get_db()
                if series_id <= 0 and series_meta:
                    title_it = (series_meta.get("title_it") or series_meta.get("title") or "").strip()
                    title_orig = (series_meta.get("title_original") or title_it).strip()
                    n_target = normalize_title(title_it)
                    conn.execute("DELETE FROM deleted_items WHERE norm_key = ?", (f"series_{n_target}",))
                    for er in conn.execute("SELECT id, title_it FROM library WHERE media_type = 'series'").fetchall():
                        if normalize_title(er["title_it"]) == n_target:
                            series_id = er["id"]
                            break
                    if series_id <= 0 and title_it:
                        ext_id = series_meta.get("external_id") or f"custom_series_{n_target.replace(' ', '_')}"
                        aliases = get_aliases_for_titles(title_it, title_orig)
                        cur = conn.execute(
                            """
                            INSERT OR REPLACE INTO library (
                                external_id, media_type, status, title_it, title_original,
                                aliases_json, year, poster, genre, description,
                                tvmaze_id, imdb_id, rating, notes, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                ext_id,
                                "series",
                                "watching",
                                title_it,
                                title_orig,
                                json.dumps(aliases, ensure_ascii=False),
                                str(series_meta.get("year") or ""),
                                series_meta.get("poster") or "",
                                series_meta.get("genre") or "Serie TV",
                                series_meta.get("description") or "",
                                series_meta.get("tvmaze_id"),
                                series_meta.get("imdb_id") or "",
                                0,
                                "",
                                now_iso,
                            ),
                        )
                        series_id = cur.lastrowid

                if watched and series_id > 0:
                    conn.execute(
                        "INSERT OR REPLACE INTO watched_episodes (series_id, season, episode, watched_at) VALUES (?, ?, ?, ?)",
                        (series_id, season, episode, now_iso),
                    )
                elif series_id > 0:
                    conn.execute(
                        "DELETE FROM watched_episodes WHERE series_id = ? AND season = ? AND episode = ?",
                        (series_id, season, episode),
                    )
                ep_cnt = (
                    conn.execute(
                        "SELECT COUNT(*) AS c FROM watched_episodes WHERE series_id = ?",
                        (series_id,),
                    ).fetchone()["c"]
                    if series_id > 0
                    else 0
                )
                if ep_cnt == 0:
                    if created_from_search and series_id > 0:
                        conn.execute("DELETE FROM library WHERE id = ?", (series_id,))
                        series_id = 0
                        new_st = None
                    else:
                        new_st = "wishlist"
                        if series_id > 0:
                            conn.execute("UPDATE library SET status = ? WHERE id = ?", (new_st, series_id))
                elif total_episodes > 0 and ep_cnt >= total_episodes:
                    new_st = "watched"
                    conn.execute("UPDATE library SET status = ? WHERE id = ?", (new_st, series_id))
                else:
                    new_st = "watching"
                    conn.execute("UPDATE library SET status = ? WHERE id = ?", (new_st, series_id))
                conn.commit()
                conn.close()

            try:
                export_library_to_json_file()
            except Exception:
                pass
            trigger_async_cloud_push()
            return self._send_json({"ok": True, "series_id": series_id, "watched": watched, "status": new_st, "watched_count": ep_cnt})

        if path == "/api/episodes/mark_season":
            series_id = int(body.get("series_id") or 0)
            season = int(body.get("season") or 1)
            episodes_list = body.get("episodes") or []
            watched = bool(body.get("watched", True))
            total_episodes = int(body.get("total_episodes") or 0)
            series_meta = body.get("series_meta") or {}
            created_from_search = bool(body.get("created_from_search", False))
            now_iso = datetime.datetime.now().isoformat()
            with _DB_LOCK:
                conn = get_db()
                if series_id <= 0 and series_meta:
                    title_it = (series_meta.get("title_it") or series_meta.get("title") or "").strip()
                    title_orig = (series_meta.get("title_original") or title_it).strip()
                    n_target = normalize_title(title_it)
                    conn.execute("DELETE FROM deleted_items WHERE norm_key = ?", (f"series_{n_target}",))
                    for er in conn.execute("SELECT id, title_it FROM library WHERE media_type = 'series'").fetchall():
                        if normalize_title(er["title_it"]) == n_target:
                            series_id = er["id"]
                            break
                    if series_id <= 0 and title_it:
                        ext_id = series_meta.get("external_id") or f"custom_series_{n_target.replace(' ', '_')}"
                        aliases = get_aliases_for_titles(title_it, title_orig)
                        cur = conn.execute(
                            """
                            INSERT OR REPLACE INTO library (
                                external_id, media_type, status, title_it, title_original,
                                aliases_json, year, poster, genre, description,
                                tvmaze_id, imdb_id, rating, notes, created_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                ext_id,
                                "series",
                                "watching",
                                title_it,
                                title_orig,
                                json.dumps(aliases, ensure_ascii=False),
                                str(series_meta.get("year") or ""),
                                series_meta.get("poster") or "",
                                series_meta.get("genre") or "Serie TV",
                                series_meta.get("description") or "",
                                series_meta.get("tvmaze_id"),
                                series_meta.get("imdb_id") or "",
                                0,
                                "",
                                now_iso,
                            ),
                        )
                        series_id = cur.lastrowid

                if watched and series_id > 0:
                    for ep_num in episodes_list:
                        conn.execute(
                            "INSERT OR REPLACE INTO watched_episodes (series_id, season, episode, watched_at) VALUES (?, ?, ?, ?)",
                            (series_id, season, int(ep_num), now_iso),
                        )
                elif series_id > 0:
                    conn.execute(
                        "DELETE FROM watched_episodes WHERE series_id = ? AND season = ?",
                        (series_id, season),
                    )
                ep_cnt = (
                    conn.execute(
                        "SELECT COUNT(*) AS c FROM watched_episodes WHERE series_id = ?",
                        (series_id,),
                    ).fetchone()["c"]
                    if series_id > 0
                    else 0
                )
                if ep_cnt == 0:
                    if created_from_search and series_id > 0:
                        conn.execute("DELETE FROM library WHERE id = ?", (series_id,))
                        series_id = 0
                        new_st = None
                    else:
                        new_st = "wishlist"
                        if series_id > 0:
                            conn.execute("UPDATE library SET status = ? WHERE id = ?", (new_st, series_id))
                elif total_episodes > 0 and ep_cnt >= total_episodes:
                    new_st = "watched"
                    conn.execute("UPDATE library SET status = ? WHERE id = ?", (new_st, series_id))
                else:
                    new_st = "watching"
                    conn.execute("UPDATE library SET status = ? WHERE id = ?", (new_st, series_id))
                conn.commit()
                conn.close()

            try:
                export_library_to_json_file()
            except Exception:
                pass
            trigger_async_cloud_push()
            return self._send_json({"ok": True, "series_id": series_id, "status": new_st, "watched_count": ep_cnt})

        if path == "/api/episodes/mark_all":
            series_id = int(body.get("series_id") or 0)
            watched = bool(body.get("watched", True))
            total_episodes = int(body.get("total_episodes") or 0)
            series_meta = body.get("series_meta") or {}
            created_from_search = bool(body.get("created_from_search", False))
            now_iso = datetime.datetime.now().isoformat()
            with _DB_LOCK:
                conn = get_db()
                if series_id <= 0 and series_meta:
                    title_it = (series_meta.get("title_it") or series_meta.get("title") or "").strip()
                    title_orig = (series_meta.get("title_original") or title_it).strip()
                    n_target = normalize_title(title_it)
                    conn.execute("DELETE FROM deleted_items WHERE norm_key = ?", (f"series_{n_target}",))
                    row = conn.execute("SELECT id FROM library WHERE media_type = 'series' AND title_it = ?", (title_it,)).fetchone()
                    if row:
                        series_id = row["id"]
                    else:
                        ext_id = series_meta.get("external_id") or f"custom_series_{n_target.replace(' ', '_')}"
                        aliases = get_aliases_for_titles(title_it, title_orig)
                        cur = conn.execute(
                            """
                            INSERT OR REPLACE INTO library (
                                external_id, media_type, status, title_it, title_original,
                                aliases_json, year, poster, genre, description,
                                tvmaze_id, imdb_id, rating, notes, created_at
                            ) VALUES (?, 'series', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '', ?)
                            """,
                            (
                                ext_id,
                                "watched" if watched else "wishlist",
                                title_it,
                                title_orig,
                                json.dumps(aliases, ensure_ascii=False),
                                str(series_meta.get("year") or ""),
                                series_meta.get("poster") or "",
                                series_meta.get("genre") or "Serie TV",
                                series_meta.get("description") or "",
                                series_meta.get("tvmaze_id"),
                                series_meta.get("imdb_id") or "",
                                now_iso,
                            ),
                        )
                        series_id = cur.lastrowid

                if watched:
                    _, events_cached, _ = get_7day_epg_cached()
                    r_meta = conn.execute("SELECT * FROM library WHERE id = ?", (series_id,)).fetchone()
                    all_eps = fetch_series_episodes(
                        tvmaze_id=r_meta["tvmaze_id"] if r_meta else None,
                        title_original=r_meta["title_original"] if r_meta else "",
                        title_it=r_meta["title_it"] if r_meta else "",
                        epg_events=events_cached,
                    )
                    for ep in all_eps:
                        conn.execute(
                            "INSERT OR REPLACE INTO watched_episodes (series_id, season, episode, watched_at) VALUES (?, ?, ?, ?)",
                            (series_id, int(ep["season"]), int(ep["episode"]), now_iso),
                        )
                    conn.execute("UPDATE library SET status = 'watched' WHERE id = ?", (series_id,))
                    new_st = "watched"
                    ep_cnt = len(all_eps)
                else:
                    conn.execute("DELETE FROM watched_episodes WHERE series_id = ?", (series_id,))
                    if created_from_search:
                        conn.execute("DELETE FROM library WHERE id = ?", (series_id,))
                        series_id = 0
                        new_st = None
                        ep_cnt = 0
                    else:
                        new_st = "wishlist"
                        conn.execute("UPDATE library SET status = 'wishlist' WHERE id = ?", (series_id,))
                        ep_cnt = 0
                conn.commit()
                conn.close()

            try:
                export_library_to_json_file()
            except Exception:
                pass
            trigger_async_cloud_push()
            return self._send_json({"ok": True, "series_id": series_id, "status": new_st, "watched_count": ep_cnt})

        if path == "/api/reminders/toggle":
            event_id = body.get("event_id")
            if not event_id:
                return self._send_json({"error": "event_id mancante"}, 400)
            with _DB_LOCK:
                conn = get_db()
                existing = conn.execute("SELECT event_id FROM reminders WHERE event_id = ?", (event_id,)).fetchone()
                if existing:
                    conn.execute("DELETE FROM reminders WHERE event_id = ?", (event_id,))
                    active = False
                else:
                    conn.execute(
                        """
                        INSERT INTO reminders (
                            event_id, library_id, title, lcn, channel_name,
                            date, start_time, start_iso, episode_info, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            event_id,
                            body.get("library_id"),
                            body.get("title") or "",
                            int(body.get("lcn") or 0),
                            body.get("channel_name") or "",
                            body.get("date") or "",
                            body.get("start_time") or "",
                            body.get("start_iso") or "",
                            body.get("episode_info") or "",
                            datetime.datetime.now().isoformat(),
                        ),
                    )
                    active = True
                conn.commit()
                conn.close()

            try:
                export_library_to_json_file()
            except Exception:
                pass
            trigger_async_cloud_push()
            return self._send_json({"ok": True, "active": active})

        if path == "/api/sync":
            cfg = get_or_create_sync_config()
            new_code = (body.get("sync_code") or "").strip().lower()
            if new_code:
                cfg["sync_code"] = re.sub(r"[^a-z0-9\-_]", "", new_code)
                save_sync_config(cfg)
            sync_code = cfg["sync_code"]

            # 1. Pull latest from cloud and merge any mobile changes
            cloud_snap = pull_latest_snapshot_from_cloud(sync_code)
            merged_changes = 0
            if cloud_snap:
                merged_changes = merge_cloud_snapshot_into_db(cloud_snap)

            # 2. Push unified snapshot back to cloud
            unified_snap = build_cloud_snapshot()
            b_key = push_snapshot_to_cloud(sync_code, unified_snap)

            return self._send_json({
                "ok": True,
                "sync_code": sync_code,
                "bytebin_key": b_key,
                "merged_changes": merged_changes,
                "library_count": len(unified_snap["library"]),
                "public_url": f"{_PUBLIC_TUNNEL_URL}/?sync={sync_code}" if _PUBLIC_TUNNEL_URL else "",
            })

        self._send_json({"error": "Endpoint non trovato"}, 404)


def get_lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def start_background_cloud_sync_daemon() -> None:
    """
    Periodically poll the Cloud Sync channel so any movie/series added on the phone
    over 4G/5G is automatically imported into the PC database.
    """
    def _sync_worker():
        # Initial push after EPG warms up
        time.sleep(2)
        try:
            _, events, _ = get_7day_epg_cached()
            seed_starter_library_if_empty(events)
            cfg = get_or_create_sync_config()
            cloud_snap = pull_latest_snapshot_from_cloud(cfg["sync_code"])
            if cloud_snap:
                merge_cloud_snapshot_into_db(cloud_snap)
            push_snapshot_to_cloud(cfg["sync_code"], build_cloud_snapshot())
        except Exception:
            pass

        while True:
            time.sleep(20)
            try:
                cfg = get_or_create_sync_config()
                cloud_snap = pull_latest_snapshot_from_cloud(cfg["sync_code"])
                if cloud_snap and cloud_snap.get("source") == "mobile":
                    changes = merge_cloud_snapshot_into_db(cloud_snap)
                    if changes > 0:
                        push_snapshot_to_cloud(cfg["sync_code"], build_cloud_snapshot())
            except Exception:
                pass

    threading.Thread(target=_sync_worker, daemon=True).start()


def run_server(port: int = 8080) -> None:
    init_db()
    cfg = get_or_create_sync_config()
    sync_code = cfg["sync_code"]
    lan_ip = get_lan_ip()
    start_background_cloud_sync_daemon()

    server = ThreadingHTTPServer(("0.0.0.0", port), NextOnTVRequestHandler)
    print("=" * 72)
    print(" NEXTONTV - Tracker Film & Serie TV + Palinsesti DTT (LCN 1-70)")
    print("=" * 72)
    print(f" [PC]      Su questo PC apri:            http://localhost:{port}")
    print(f" [WIFI]    Sul telefono in Wi-Fi apri:   http://{lan_ip}:{port}/?sync={sync_code}")
    print(f" [SICURO]  Rete Privata Locale (LAN) - Nessuna porta esposta su Internet")
    print(f" [CLOUD]   Codice Cloud Sync PC/Mobile:  {sync_code}")
    print("=" * 72)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nChiusura server in corso...")
        server.server_close()


if __name__ == "__main__":
    run_server(8080)
