import concurrent.futures
import datetime
import html
import json
import re
import ssl
import time
import unicodedata
import urllib.parse
import urllib.request
from typing import Dict, List, Optional, Tuple

SSL_CTX = ssl._create_unverified_context()
USER_AGENT = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"

# Official Italian Digital Terrestrial (DTT) Channels LCN 1-70
DTT_CHANNELS: List[Dict] = [
    {"lcn": 1, "name": "Rai 1", "sky_id": 899, "rai_slug": "rai-1", "group": "Rai", "color": "#0046ad"},
    {"lcn": 2, "name": "Rai 2", "sky_id": 898, "rai_slug": "rai-2", "group": "Rai", "color": "#c8102e"},
    {"lcn": 3, "name": "Rai 3", "sky_id": 897, "rai_slug": "rai-3", "group": "Rai", "color": "#00843d"},
    {"lcn": 4, "name": "Rete 4", "sky_id": 10464, "group": "Mediaset", "color": "#f39200"},
    {"lcn": 5, "name": "Canale 5", "sky_id": 10354, "group": "Mediaset", "color": "#0055a5"},
    {"lcn": 6, "name": "Italia 1", "sky_id": 10454, "group": "Mediaset", "color": "#009fe3"},
    {"lcn": 7, "name": "LA7", "sky_id": 319, "group": "Cairo", "color": "#e30613"},
    {"lcn": 8, "name": "TV8", "sky_id": 8195, "group": "Sky", "color": "#0033a0"},
    {"lcn": 9, "name": "NOVE", "sky_id": 12116, "group": "Discovery", "color": "#ff004c"},
    {"lcn": 20, "name": "20 Mediaset", "sky_id": 10458, "group": "Mediaset", "color": "#e50051"},
    {"lcn": 21, "name": "Rai 4", "sky_id": 6622, "rai_slug": "rai-4", "group": "Rai", "color": "#7b2cbf"},
    {"lcn": 22, "name": "Iris", "sky_id": 10467, "group": "Mediaset", "color": "#8b1e41"},
    {"lcn": 23, "name": "Rai 5", "sky_id": 6607, "rai_slug": "rai-5", "group": "Rai", "color": "#e07a16"},
    {"lcn": 24, "name": "Rai Movie", "sky_id": 6608, "rai_slug": "rai-movie", "group": "Rai", "color": "#9b0047"},
    {"lcn": 25, "name": "Rai Premium", "sky_id": 6623, "rai_slug": "rai-premium", "group": "Rai", "color": "#b58500"},
    {"lcn": 26, "name": "Cielo", "sky_id": 8133, "group": "Sky", "color": "#00a3e0"},
    {"lcn": 27, "name": "27 Twentyseven", "sky_id": 11342, "group": "Mediaset", "color": "#ff6b00"},
    {"lcn": 28, "name": "TV2000", "sky_id": 7588, "group": "Altro", "color": "#0066cc"},
    {"lcn": 29, "name": "LA7 Cinema / LA7d", "sky_id": 11430, "group": "Cairo", "color": "#b71c1c"},
    {"lcn": 30, "name": "La 5", "sky_id": 10466, "group": "Mediaset", "color": "#d81b60"},
    {"lcn": 31, "name": "Real Time", "sky_id": 12117, "group": "Discovery", "color": "#00acc1"},
    {"lcn": 33, "name": "Food Network", "sky_id": 12123, "group": "Discovery", "color": "#d32f2f"},
    {"lcn": 34, "name": "Cine34", "sky_id": 10893, "group": "Mediaset", "color": "#c62828"},
    {"lcn": 35, "name": "Focus", "sky_id": 10470, "group": "Mediaset", "color": "#ad1457"},
    {"lcn": 36, "name": "RTL 102.5 TV", "sky_id": 6885, "group": "Musica", "color": "#d50000"},
    {"lcn": 37, "name": "Warner TV", "sitv_slug": "warner_tv", "group": "Discovery", "color": "#003399"},
    {"lcn": 38, "name": "Giallo", "sky_id": 12126, "group": "Discovery", "color": "#fbc02d"},
    {"lcn": 39, "name": "TOP Crime", "sky_id": 10468, "group": "Mediaset", "color": "#1565c0"},
    {"lcn": 40, "name": "Boing", "sitv_slug": "boing", "group": "Kids", "color": "#0288d1"},
    {"lcn": 41, "name": "K2", "sitv_slug": "k2", "group": "Kids", "color": "#ff5722"},
    {"lcn": 42, "name": "Rai Gulp", "rai_slug": "rai-gulp", "group": "Kids", "color": "#e91e63"},
    {"lcn": 43, "name": "Rai Yoyo", "rai_slug": "rai-yoyo", "group": "Kids", "color": "#8bc34a"},
    {"lcn": 44, "name": "Frisbee", "sitv_slug": "frisbee", "group": "Kids", "color": "#e91e63"},
    {"lcn": 46, "name": "Cartoonito", "sitv_slug": "cartoonito", "group": "Kids", "color": "#fdd835"},
    {"lcn": 47, "name": "Super!", "sky_id": 6460, "group": "Kids", "color": "#ab47bc"},
    {"lcn": 48, "name": "Rai News 24", "sky_id": 895, "group": "Rai", "color": "#1b5e20"},
    {"lcn": 49, "name": "Italia 2", "sky_id": 10469, "group": "Mediaset", "color": "#d32f2f"},
    {"lcn": 50, "name": "Sky TG24", "sky_id": 9117, "group": "Sky", "color": "#b71c1c"},
    {"lcn": 51, "name": "TGCOM24", "sky_id": 10473, "group": "Mediaset", "color": "#0d47a1"},
    {"lcn": 52, "name": "DMAX", "sky_id": 12120, "group": "Discovery", "color": "#ff6f00"},
    {"lcn": 54, "name": "Rai Storia", "sky_id": 6630, "rai_slug": "rai-storia", "group": "Rai", "color": "#33691e"},
    {"lcn": 55, "name": "Mediaset Extra", "sky_id": 10465, "group": "Mediaset", "color": "#6a1b9a"},
    {"lcn": 56, "name": "HGTV", "sky_id": 12127, "group": "Discovery", "color": "#00897b"},
    {"lcn": 58, "name": "Rai Sport", "sky_id": 807, "rai_slug": "rai-sport", "group": "Rai", "color": "#0277bd"},
    {"lcn": 59, "name": "Motor Trend", "sky_id": 12131, "sitv_slug": "motor_trend", "group": "Discovery", "color": "#c62828"},
    {"lcn": 60, "name": "Sportitalia", "sitv_slug": "sportitalia", "group": "Altro", "color": "#1565c0"},
    {"lcn": 62, "name": "Donna TV", "sitv_slug": "donnatv", "group": "Altro", "color": "#ec407a"},
    {"lcn": 64, "name": "SuperTennis", "sky_id": 6000, "group": "Altro", "color": "#2e7d32"},
    {"lcn": 65, "name": "Alma TV", "sitv_slug": "almatv", "group": "Altro", "color": "#ef6c00"},
    {"lcn": 67, "name": "MTV Music / R101", "sky_id": 11054, "group": "Musica", "color": "#4527a0"},
    {"lcn": 68, "name": "Travel TV", "sitv_slug": "travel_tv", "group": "Altro", "color": "#00838f"},
    {"lcn": 69, "name": "Deejay TV", "sky_id": 462, "group": "Musica", "color": "#d32f2f"},
    {"lcn": 70, "name": "RadioItaliaTV", "sky_id": 9833, "group": "Musica", "color": "#283593"},
]

# Official Sky Italia Satellite / Pay TV Channels (Cinema & Serie/Intrattenimento LCN 108-310)
SKY_CHANNELS: List[Dict] = [
    {"lcn": 108, "name": "Sky Uno", "sky_id": 9115, "group": "Sky Serie & Show", "color": "#0072ce", "is_sky": True},
    {"lcn": 111, "name": "Sky Atlantic", "sky_id": 9095, "group": "Sky Serie & Show", "color": "#0055a5", "is_sky": True},
    {"lcn": 112, "name": "Sky Serie", "sky_id": 11244, "group": "Sky Serie & Show", "color": "#6a1b9a", "is_sky": True},
    {"lcn": 113, "name": "Sky Investigation", "sky_id": 11246, "group": "Sky Serie & Show", "color": "#1565c0", "is_sky": True},
    {"lcn": 115, "name": "Sky Crime", "sky_id": 8336, "group": "Sky Serie & Show", "color": "#b71c1c", "is_sky": True},
    {"lcn": 117, "name": "Sky Documentaries", "sky_id": 11239, "group": "Sky Doc & Arte", "color": "#e65100", "is_sky": True},
    {"lcn": 119, "name": "Sky Nature", "sky_id": 11242, "group": "Sky Doc & Arte", "color": "#2e7d32", "is_sky": True},
    {"lcn": 120, "name": "Sky Arte", "sky_id": 8473, "group": "Sky Doc & Arte", "color": "#ad1457", "is_sky": True},
    {"lcn": 122, "name": "Sky Adventure", "sky_id": 11889, "group": "Sky Doc & Arte", "color": "#00838f", "is_sky": True},
    {"lcn": 129, "name": "Comedy Central", "sky_id": 318, "group": "Sky Serie & Show", "color": "#f57c00", "is_sky": True},
    {"lcn": 301, "name": "Sky Cinema Uno", "sky_id": 9044, "group": "Sky Cinema", "color": "#c62828", "is_sky": True},
    {"lcn": 302, "name": "Sky Cinema Stories", "sky_id": 9034, "group": "Sky Cinema", "color": "#ad1457", "is_sky": True},
    {"lcn": 303, "name": "Sky Cinema Collection", "sky_id": 9047, "group": "Sky Cinema", "color": "#d84315", "is_sky": True},
    {"lcn": 304, "name": "Sky Cinema Family", "sky_id": 9042, "group": "Sky Cinema", "color": "#00897b", "is_sky": True},
    {"lcn": 305, "name": "Sky Cinema Action", "sky_id": 9050, "group": "Sky Cinema", "color": "#d32f2f", "is_sky": True},
    {"lcn": 306, "name": "Sky Cinema Suspense", "sky_id": 10515, "group": "Sky Cinema", "color": "#37474f", "is_sky": True},
    {"lcn": 307, "name": "Sky Cinema Comedy", "sky_id": 9039, "group": "Sky Cinema", "color": "#fbc02d", "is_sky": True},
    {"lcn": 308, "name": "Sky Cinema Romance", "sky_id": 9055, "group": "Sky Cinema", "color": "#e91e63", "is_sky": True},
    {"lcn": 309, "name": "Sky Cinema Drama", "sky_id": 10518, "group": "Sky Cinema", "color": "#5e35b1", "is_sky": True},
    {"lcn": 310, "name": "Sky Cinema Uno +24", "sky_id": 9037, "group": "Sky Cinema", "color": "#b71c1c", "is_sky": True},
]

DTT_CHANNEL_COLOR = "#009fe3"  # Azzurro uniforme per Digitale Terrestre
SKY_CHANNEL_COLOR = "#dc2626"  # Rosso uniforme per Sky

for _ch in DTT_CHANNELS:
    _ch["is_sky"] = False
    _ch["color"] = DTT_CHANNEL_COLOR

for _ch in SKY_CHANNELS:
    _ch["is_sky"] = True
    _ch["color"] = SKY_CHANNEL_COLOR

ALL_CHANNELS: List[Dict] = DTT_CHANNELS + SKY_CHANNELS

SKY_ID_TO_CHANNEL = {ch["sky_id"]: ch for ch in ALL_CHANNELS if "sky_id" in ch}
LCN_TO_CHANNEL = {ch["lcn"]: ch for ch in ALL_CHANNELS}


def normalize_title(text: str) -> str:
    """Normalize a movie or series title for resilient matching."""
    if not text:
        return ""
    t = html.unescape(text).strip().lower()
    # Remove accents
    t = "".join(c for c in unicodedata.normalize("NFD", t) if unicodedata.category(c) != "Mn")
    # Remove common EPG prefixes/suffixes
    t = re.sub(r"^(film|telefilm|serie tv|fiction|1\^?\s*tv|prima tv)\s*[:\-]\s*", "", t)
    t = re.sub(r"\s*\((film|telefilm|serie tv|fiction|1\^?\s*tv|prima tv|replica)\)\s*$", "", t)
    # Remove season/episode markers if still attached (require word boundaries so 'Parte 1' is never stripped!)
    t = re.sub(r"\s*[-–:]?\s*\b(stagione|stag\.?)\s*\d+.*$", "", t)
    t = re.sub(r"\s*[-–:]?\s*\b(episodio|ep\.?)\s*\d+.*$", "", t)
    t = re.sub(r"\s*[-–:]?\s*\bs\d+\s*e\d+\b.*$", "", t)
    # Replace punctuation with space
    t = re.sub(r"[^a-z0-9\s]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def strip_leading_article(norm_title: str) -> str:
    """Remove Italian/English leading articles for secondary fuzzy matching."""
    return re.sub(r"^(il|lo|la|i|gli|le|l|un|uno|una|the|a|an)\s+", "", norm_title).strip()


def strip_conjunctions(norm_title: str) -> str:
    """
    Remove standalone conjunction words ('and', 'end', 'e', 'ed', 'n') so that
    'Fast & Furious', 'Fast and Furious', 'Fast end Furious', and 'Fast e Furious'
    all normalize to the exact same canonical form ('fast furious').
    """
    if not norm_title:
        return ""
    t = re.sub(r"\b(and|end|e|ed|n)\b", " ", norm_title.lower())
    return re.sub(r"\s+", " ", t).strip()


def parse_series_and_episode(raw_title: str, epg_title: str = "", url_hint: str = "", season_num=None, ep_num=None) -> Tuple[str, str, Optional[int], Optional[int]]:
    """
    Extract (clean_series_or_movie_title, episode_title, season_number, episode_number)
    from Italian EPG strings such as:
      - epgEventTitle: 'S7 Ep2 - NCIS: New Orleans', raw_title: 'Ep. 4 - Noi contro loro'
      - raw_title: 'Delitti e misteri a Gibsons - Stag. 1 Ep. 3 - Pioggia fredda'
      - raw_title: 'F.B.I. - Francesco Bertolazzi Investigatore - S1E6 - Getto della spugna'
      - raw_title: 'Supernatural - Stagione 9 Episodio 20 - Linee di sangue (Telefilm)'
    """
    s_out = int(season_num) if season_num not in (None, "", 0, "0") and str(season_num).isdigit() else None
    e_out = int(ep_num) if ep_num not in (None, "", 0, "0") and str(ep_num).isdigit() else None
    ep_title = ""
    main_title = (raw_title or "").strip()
    epg_t = (epg_title or "").strip()

    # Case 1: epgEventTitle is formatted like 'S7 Ep2 - NCIS: New Orleans' or 'S1 Ep11 - Forever'
    m_epg = re.match(r"^[Ss](\d+)\s*[Ee][Pp]?\.?\s*(\d+)\s*[-–:]\s*(.+)$", epg_t)
    if m_epg:
        if s_out is None:
            s_out = int(m_epg.group(1))
        if e_out is None:
            e_out = int(m_epg.group(2))
        candidate_series = m_epg.group(3).strip()
        # Check if raw_title is the episode title (e.g. 'Ep. 11 - Il bagnante nudo' or 'Quarantena')
        cleaned_ep = re.sub(r"^[Ee][Pp]\.?\s*\d+\s*[-–:]\s*", "", main_title).strip()
        if cleaned_ep.lower() != candidate_series.lower():
            ep_title = cleaned_ep
        main_title = candidate_series
        return main_title, ep_title, s_out, e_out

    # Case 2: epgEventTitle is 'Ep2 - Something'
    m_epg2 = re.match(r"^[Ee][Pp]\.?\s*(\d+)\s*[-–:]\s*(.+)$", epg_t)
    if m_epg2 and re.match(r"^[Ee][Pp]\.?\s*\d+", main_title):
        if e_out is None:
            e_out = int(m_epg2.group(1))
        main_title = m_epg2.group(2).strip()

    # Case 3: Pattern 'Title - Stag. X Ep. Y - Episode Title' or 'Title - Stagione X Episodio Y - Episode Title'
    m_stag = re.match(
        r"^(.+?)\s*[-–]\s*(?:Stagione|Stag\.?|S\.?)\s*(\d+)\s*(?:Episodio|Ep\.?|E\.?)\s*(\d+)(?:\s*[-–:]\s*(.+))?$",
        main_title,
        re.IGNORECASE,
    )
    if m_stag:
        main_title = m_stag.group(1).strip()
        if s_out is None:
            s_out = int(m_stag.group(2))
        if e_out is None:
            e_out = int(m_stag.group(3))
        if m_stag.group(4):
            ep_title = m_stag.group(4).strip()
        return main_title, ep_title, s_out, e_out

    # Case 4: Pattern 'Title - S1E6 - Episode Title'
    m_se = re.match(
        r"^(.+?)\s*[-–]\s*[Ss](\d+)\s*[Ee](\d+)(?:\s*[-–:]\s*(.+))?$",
        main_title,
    )
    if m_se:
        main_title = m_se.group(1).strip()
        if s_out is None:
            s_out = int(m_se.group(2))
        if e_out is None:
            e_out = int(m_se.group(3))
        if m_se.group(4):
            ep_title = m_se.group(4).strip()
        return main_title, ep_title, s_out, e_out

    # Case 5: If main_title is still just 'Ep. 4 - Something' and url_hint has '/serie-tv/<slug>/'
    if re.match(r"^(?:Ep\.?|Episodio|Stag\.?)\s*\d+", main_title, re.IGNORECASE) and url_hint:
        m_url = re.search(r"/(?:serie-tv|fiction|telefilm)/([^/]+)/", url_hint)
        if m_url:
            slug = m_url.group(1).replace("-", " ").title()
            ep_title = re.sub(r"^(?:Ep\.?|Episodio)\s*\d+\s*[-–:]?\s*", "", main_title, flags=re.IGNORECASE).strip()
            main_title = slug

    # Clean trailing '(Telefilm)' or '(Film)'
    main_title = re.sub(r"\s*\((?:Telefilm|Film|Serie TV|Fiction|1\^TV)\)\s*$", "", main_title, flags=re.IGNORECASE).strip()
    ep_title = re.sub(r"\s*\((?:Telefilm|Film|Serie TV|Fiction|1\^TV)\)\s*$", "", ep_title, flags=re.IGNORECASE).strip()
    return main_title, ep_title, s_out, e_out


def utc_iso_to_rome(iso_str: str) -> datetime.datetime:
    """Convert UTC ISO timestamp ('2026-11-01T20:20:00Z') to Italian local time (Europe/Rome)."""
    dt_utc = datetime.datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    # Calculate Europe/Rome offset (CET = UTC+1, CEST = UTC+2 from last Sunday of March to last Sunday of October)
    year = dt_utc.year
    # Last Sunday of March at 01:00 UTC
    march_31 = datetime.datetime(year, 3, 31, 1, 0, tzinfo=datetime.timezone.utc)
    dst_start = march_31 - datetime.timedelta(days=(march_31.weekday() + 1) % 7)
    # Last Sunday of October at 01:00 UTC
    oct_31 = datetime.datetime(year, 10, 31, 1, 0, tzinfo=datetime.timezone.utc)
    dst_end = oct_31 - datetime.timedelta(days=(oct_31.weekday() + 1) % 7)
    offset_hours = 2 if (dst_start <= dt_utc < dst_end) else 1
    rome_tz = datetime.timezone(datetime.timedelta(hours=offset_hours))
    return dt_utc.astimezone(rome_tz)


def _http_get_json(url: str, timeout: int = 9) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
        return json.loads(resp.read().decode("utf-8", errors="ignore"))


def _fetch_sky_batch(sky_ids: List[int], env: str, day_date: datetime.date) -> List[Dict]:
    """Fetch 24 hours of events for a batch of Sky GTV channel IDs."""
    if not sky_ids:
        return []
    # Query from 22:00 UTC previous day to 23:59 UTC current day to cover full Rome local date
    d_start = datetime.datetime.combine(day_date - datetime.timedelta(days=1), datetime.time(22, 0)).isoformat() + "Z"
    d_end = datetime.datetime.combine(day_date, datetime.time(23, 59, 59)).isoformat() + "Z"
    ch_param = ",".join(str(cid) for cid in sky_ids)
    url = (
        f"https://apid.sky.it/gtv/v1/events?channels={ch_param}"
        f"&from={d_start}&to={d_end}&pageSize=1000&pageNum=0&env={env}"
    )
    try:
        data = _http_get_json(url, timeout=10)
    except Exception:
        return []

    results = []
    for ev in data.get("events", []):
        ch_obj = ev.get("channel") or {}
        sky_id = ch_obj.get("id")
        ch_meta = SKY_ID_TO_CHANNEL.get(sky_id)
        if not ch_meta:
            continue

        start_iso = ev.get("starttime")
        end_iso = ev.get("endtime")
        if not start_iso:
            continue

        dt_start = utc_iso_to_rome(start_iso)
        if dt_start.date() != day_date:
            continue
        dt_end = utc_iso_to_rome(end_iso) if end_iso else (dt_start + datetime.timedelta(minutes=60))
        duration_min = max(1, int((dt_end - dt_start).total_seconds() // 60))

        content = ev.get("content") or {}
        genre = (content.get("genre") or {}).get("name") or ""
        subgenre = (content.get("subgenre") or {}).get("name") or ""
        raw_title = content.get("contentTitle") or ev.get("eventTitle") or ""
        epg_title = ev.get("epgEventTitle") or ""
        url_hint = content.get("url") or ""
        synopsis = ev.get("eventSynopsis") or ""

        clean_title, ep_title, season_num, ep_num = parse_series_and_episode(
            raw_title,
            epg_title=epg_title,
            url_hint=url_hint,
            season_num=content.get("seasonNumber"),
            ep_num=content.get("episodeNumber"),
        )

        # Determine media_type: 'movie', 'series', or 'other'
        g_low = genre.lower()
        sg_low = subgenre.lower()
        if g_low == "film" or sg_low == "film" or "/film/" in url_hint:
            media_type = "movie"
        elif (
            sg_low in ("fiction", "serie tv", "telefilm", "sitcom", "soap opera", "miniserie", "cartoni animati", "serie animata")
            or g_low in ("serie tv", "fiction")
            or "/serie-tv/" in url_hint
            or (season_num is not None and g_low not in ("intrattenimento", "mondo e tendenze", "sport", "informazione"))
            or (re.match(r"^[Ss]\d+\s*[Ee][Pp]?\d+", epg_title) and sg_low not in ("talk show", "reality show", "show", "attualita", "cultura"))
        ):
            media_type = "series"
        else:
            media_type = "other"

        # Extract poster/cover image if available
        poster_url = ""
        for img_entry in content.get("imagesMap") or []:
            if img_entry.get("key") in ("cover_23", "cover", "scene"):
                img_path = (img_entry.get("img") or {}).get("url") or ""
                if img_path:
                    poster_url = f"https://guidatv.sky.it{img_path}" if img_path.startswith("/") else img_path
                    break

        results.append({
            "id": f"sky_{ev.get('eventId') or (str(sky_id) + '_' + start_iso)}",
            "lcn": ch_meta["lcn"],
            "channel_name": ch_meta["name"],
            "channel_group": ch_meta["group"],
            "channel_color": ch_meta["color"],
            "date": dt_start.strftime("%Y-%m-%d"),
            "start_time": dt_start.strftime("%H:%M"),
            "end_time": dt_end.strftime("%H:%M"),
            "start_iso": dt_start.isoformat(),
            "duration_min": duration_min,
            "title": clean_title,
            "norm_title": normalize_title(clean_title),
            "episode_title": ep_title,
            "season": season_num,
            "episode": ep_num,
            "media_type": media_type,
            "genre": subgenre or genre,
            "description": synopsis,
            "poster": poster_url,
            "source": "sky_gtv",
            "is_sky": bool(ch_meta.get("is_sky", False)),
        })
    return results


def _fetch_raiplay_channel_day(ch_meta: Dict, day_date: datetime.date) -> List[Dict]:
    """Fetch official RaiPlay schedule for a Rai channel on a given day."""
    slug = ch_meta.get("rai_slug")
    if not slug:
        return []
    d_str = day_date.strftime("%d-%m-%Y")
    url = f"https://www.raiplay.it/palinsesto/app/{slug}/{d_str}.json"
    try:
        data = _http_get_json(url, timeout=8)
    except Exception:
        return []

    results = []
    for ev in data.get("events", []):
        raw_name = (ev.get("name") or "").strip()
        hour_str = (ev.get("hour") or "00:00").strip()
        if not raw_name or not re.match(r"^\d{2}:\d{2}$", hour_str):
            continue

        dfp = ev.get("dfp") or {}
        typology = (dfp.get("escaped_typology_name") or "").lower()
        genre_name = dfp.get("escaped_genre_name") or ""

        clean_title, ep_title, season_num, ep_num = parse_series_and_episode(
            raw_name,
            epg_title="",
            url_hint=ev.get("weblink") or ev.get("event_weblink") or "",
            season_num=ev.get("season"),
            ep_num=ev.get("episode"),
        )
        if not ep_title and ev.get("episode_title") and ev.get("episode_title") != clean_title:
            ep_title = ev.get("episode_title").strip()

        dur_str = ev.get("duration_in_minutes") or "60"
        m_dur = re.search(r"(\d+)", str(dur_str))
        duration_min = int(m_dur.group(1)) if m_dur else 60

        if "film" in typology or (ch_meta["lcn"] == 24 and season_num is None and ep_num is None and duration_min >= 50):
            media_type = "movie"
        elif any(k in typology for k in ("serie", "fiction", "telefilm", "sitcom", "soap", "carton")) or (season_num is not None or ep_num is not None):
            media_type = "series"
        else:
            media_type = "other"

        h_int, m_int = map(int, hour_str.split(":"))
        dt_start = datetime.datetime(day_date.year, day_date.month, day_date.day, h_int, m_int)
        dt_end = dt_start + datetime.timedelta(minutes=duration_min)

        img_path = (ev.get("images") or {}).get("landscape_logo") or ev.get("image") or ""
        poster_url = f"https://www.raiplay.it{img_path}" if img_path.startswith("/") else img_path

        results.append({
            "id": f"rai_{ch_meta['lcn']}_{day_date.isoformat()}_{hour_str}",
            "lcn": ch_meta["lcn"],
            "channel_name": ch_meta["name"],
            "channel_group": ch_meta["group"],
            "channel_color": ch_meta["color"],
            "date": day_date.isoformat(),
            "start_time": hour_str,
            "end_time": dt_end.strftime("%H:%M"),
            "start_iso": dt_start.isoformat(),
            "duration_min": duration_min,
            "title": clean_title,
            "norm_title": normalize_title(clean_title),
            "episode_title": ep_title,
            "season": season_num,
            "episode": ep_num,
            "media_type": media_type,
            "genre": genre_name or typology.title() or "Programma TV",
            "description": (ev.get("description") or "").strip(),
            "poster": poster_url,
            "source": "raiplay",
            "is_sky": False,
        })
    return results


def _fetch_sitv_channel(ch_meta: Dict, day_offset: int, day_date: datetime.date) -> List[Dict]:
    """Fetch StaseraInTV schedule for supplemental DTT channels (e.g. Warner TV LCN 37, K2, Frisbee)."""
    slug = ch_meta.get("sitv_slug")
    if not slug or day_offset not in (0, 1):
        return []
    day_word = "stasera" if day_offset == 0 else "domani"
    url = f"https://www.staseraintv.com/programmi_{day_word}_{slug}.html"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=7, context=SSL_CTX) as resp:
            raw_html = resp.read().decode("utf-8", errors="ignore")
    except Exception:
        return []

    m_box = re.search(r'<div class="listingbox"[^>]*>.*?<h4[^>]*>(.*?)</h4>', raw_html, re.DOTALL | re.IGNORECASE)
    if not m_box:
        return []

    lines = [line.strip() for line in re.split(r"<br\s*/?>", m_box.group(1), flags=re.IGNORECASE) if line.strip()]
    results = []
    for idx, line in enumerate(lines):
        clean_line = html.unescape(re.sub(r"<[^>]+>", "", line)).strip()
        m_line = re.match(r"^(\d{2}:\d{2})\s*-\s*(.+)$", clean_line)
        if not m_line:
            continue
        hour_str, raw_prog = m_line.group(1), m_line.group(2).strip()
        clean_title, ep_title, season_num, ep_num = parse_series_and_episode(raw_prog)
        is_series = (season_num is not None or ep_num is not None or "(telefilm)" in raw_prog.lower())
        is_movie = "(film)" in raw_prog.lower() or (not is_series and ch_meta["lcn"] == 37)
        media_type = "series" if is_series else ("movie" if is_movie else "other")

        results.append({
            "id": f"sitv_{ch_meta['lcn']}_{day_date.isoformat()}_{hour_str}_{idx}",
            "lcn": ch_meta["lcn"],
            "channel_name": ch_meta["name"],
            "channel_group": ch_meta["group"],
            "channel_color": ch_meta["color"],
            "date": day_date.isoformat(),
            "start_time": hour_str,
            "end_time": "",
            "start_iso": f"{day_date.isoformat()}T{hour_str}:00",
            "duration_min": 55,
            "title": clean_title,
            "norm_title": normalize_title(clean_title),
            "episode_title": ep_title,
            "season": season_num,
            "episode": ep_num,
            "media_type": media_type,
            "genre": "Telefilm / Serie TV" if media_type == "series" else ("Film" if media_type == "movie" else "Programma"),
            "description": f"In onda su {ch_meta['name']} (Canale {ch_meta['lcn']}).",
            "poster": "",
            "source": "staseraintv",
            "is_sky": False,
        })
    return results


def fetch_7day_epg(start_date: Optional[datetime.date] = None, days: int = 7) -> List[Dict]:
    """
    Fetch the complete 7-day EPG across all 50+ official DTT channels (LCN 1-70)
    plus the 20 official Sky Cinema & Sky Serie/Show channels (LCN 108-310) in parallel.
    """
    if start_date is None:
        start_date = datetime.date.today()

    # Sky GTV separates channels into compatible query tiers:
    sky_tier2_set = {6885, 6460, 895, 9117, 10473, 12131, 462, 9833}
    tier1_ids = [ch["sky_id"] for ch in DTT_CHANNELS if "sky_id" in ch and ch["sky_id"] not in sky_tier2_set]
    tier2_ids = [ch["sky_id"] for ch in DTT_CHANNELS if "sky_id" in ch and ch["sky_id"] in sky_tier2_set]
    sky_pay_ids = [ch["sky_id"] for ch in SKY_CHANNELS if "sky_id" in ch]

    # Split into batches of ~10-11 channels so 24h events never exceed the page cap
    sky_batches = [
        tier1_ids[:11],
        tier1_ids[11:22],
        tier1_ids[22:],
        tier2_ids,
        sky_pay_ids[:10],
        sky_pay_ids[10:],
    ]

    # RaiPlay channels for rich series/movie metadata and Rai Gulp / Yoyo / Movie / Premium / 4
    rai_channels = [ch for ch in DTT_CHANNELS if ch.get("rai_slug") in ("rai-4", "rai-movie", "rai-premium", "rai-gulp", "rai-yoyo")]
    sitv_channels = [ch for ch in DTT_CHANNELS if "sitv_slug" in ch]

    tasks = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as executor:
        for day_offset in range(days):
            day_date = start_date + datetime.timedelta(days=day_offset)
            for batch in sky_batches:
                if batch:
                    tasks.append(executor.submit(_fetch_sky_batch, batch, "DTH", day_date))
            for r_ch in rai_channels:
                tasks.append(executor.submit(_fetch_raiplay_channel_day, r_ch, day_date))
            if day_offset in (0, 1):
                for s_ch in sitv_channels:
                    tasks.append(executor.submit(_fetch_sitv_channel, s_ch, day_offset, day_date))

        raw_events = []
        for fut in concurrent.futures.as_completed(tasks):
            try:
                raw_events.extend(fut.result())
            except Exception:
                pass

    # Deduplicate multi-source events (Sky GTV, RaiPlay, StaseraInTV)
    def _is_placeholder(p: Optional[str]) -> bool:
        if not p:
            return True
        p_lower = p.lower()
        return "placeholder" in p_lower or "logo" in p_lower or "blank" in p_lower

    def _strip_conj(t: str) -> str:
        t = re.sub(r"\b(e|ed|and|et|y)\b", " ", t.lower())
        return re.sub(r"\s+", " ", t).strip()

    def _titles_match(t1: str, t2: str) -> bool:
        if not t1 or not t2:
            return False
        if t1 == t2:
            return True
        if _strip_conj(t1) == _strip_conj(t2):
            return True
        if len(t1) >= 5 and t1 in t2:
            return True
        if len(t2) >= 5 and t2 in t1:
            return True
        return False

    # Pass 1: Exact channel, date and start_time deduplication
    by_exact: Dict[Tuple[int, str, str], Dict] = {}
    for ev in raw_events:
        if not ev.get("norm_title"):
            continue
        key = (ev["lcn"], ev["date"], ev["start_time"])
        existing = by_exact.get(key)
        if not existing:
            by_exact[key] = dict(ev)
        else:
            # Prefer movie/series classification over 'other'
            if existing["media_type"] == "other" and ev["media_type"] != "other":
                existing["media_type"] = ev["media_type"]
            # Prefer real poster over generic placeholder or empty
            if _is_placeholder(existing.get("poster")) and not _is_placeholder(ev.get("poster")):
                existing["poster"] = ev["poster"]
            # Prefer episode / season numbers if available
            if existing.get("season") is None and ev.get("season") is not None:
                existing["season"] = ev["season"]
            if existing.get("episode") is None and ev.get("episode") is not None:
                existing["episode"] = ev["episode"]
            if not existing.get("episode_title") and ev.get("episode_title"):
                existing["episode_title"] = ev["episode_title"]
            # Prefer richer description
            if len(ev.get("description") or "") > len(existing.get("description") or ""):
                existing["description"] = ev["description"]
            # Prefer title with clean & symbol if titles match
            if "&" in ev.get("title", "") and "&" not in existing.get("title", ""):
                existing["title"] = ev["title"]
                existing["norm_title"] = ev["norm_title"]

    # Pass 2: Merge multi-source near-duplicates (within <= 5 mins on same channel & date where titles match)
    from collections import defaultdict
    by_chan_date = defaultdict(list)
    for x in by_exact.values():
        by_chan_date[(x["lcn"], x["date"])].append(x)

    deduped_events = []
    for (lcn, d_str), ch_evs in by_chan_date.items():
        ch_evs.sort(key=lambda x: x["start_time"])
        idx = 0
        while idx < len(ch_evs):
            curr = ch_evs[idx]
            if idx + 1 < len(ch_evs):
                nxt = ch_evs[idx + 1]
                if curr.get("source") != nxt.get("source"):
                    try:
                        t1 = datetime.datetime.strptime(curr["start_time"], "%H:%M")
                        t2 = datetime.datetime.strptime(nxt["start_time"], "%H:%M")
                        diff_m = abs((t2 - t1).total_seconds()) / 60
                        if 0 < diff_m <= 5:
                            n1 = curr.get("norm_title", "")
                            n2 = nxt.get("norm_title", "")
                            if _titles_match(n1, n2):
                                # Merge nxt into curr
                                if nxt.get("source") == "sky_gtv":
                                    curr["start_time"] = nxt["start_time"]
                                    curr["end_time"] = nxt["end_time"]
                                    curr["start_iso"] = nxt["start_iso"]
                                    curr["duration_min"] = nxt["duration_min"]
                                if _is_placeholder(curr.get("poster")) and not _is_placeholder(nxt.get("poster")):
                                    curr["poster"] = nxt["poster"]
                                if curr.get("season") is None and nxt.get("season") is not None:
                                    curr["season"] = nxt["season"]
                                if curr.get("episode") is None and nxt.get("episode") is not None:
                                    curr["episode"] = nxt["episode"]
                                if not curr.get("episode_title") and nxt.get("episode_title"):
                                    curr["episode_title"] = nxt["episode_title"]
                                if len(nxt.get("description") or "") > len(curr.get("description") or ""):
                                    curr["description"] = nxt["description"]
                                if "&" in nxt.get("title", "") and "&" not in curr.get("title", ""):
                                    curr["title"] = nxt["title"]
                                    curr["norm_title"] = nxt["norm_title"]
                                deduped_events.append(curr)
                                idx += 2
                                continue
                    except Exception:
                        pass
            deduped_events.append(curr)
            idx += 1

    sorted_events = sorted(deduped_events, key=lambda x: (x["date"], x["start_time"], x["lcn"]))
    return sorted_events


if __name__ == "__main__":
    t0 = time.time()
    events = fetch_7day_epg(datetime.date(2026, 10, 31), days=7)
    dt = time.time() - t0
    movies = [e for e in events if e["media_type"] == "movie"]
    series = [e for e in events if e["media_type"] == "series"]
    print(f"Fetched {len(events)} total broadcasts in {dt:.2f}s across {len({e['lcn'] for e in events})} DTT channels!")
    print(f"Movies: {len(movies)} | TV Series episodes: {len(series)}")
    for m in movies[:5]:
        print("  MOVIE:", m["date"], m["start_time"], f"LCN {m['lcn']} {m['channel_name']}", "->", m["title"])
    for s in series[:5]:
        print("  SERIES:", s["date"], s["start_time"], f"LCN {s['lcn']} {s['channel_name']}", "->", s["title"], f"S{s['season']}E{s['episode']}", s["episode_title"])
