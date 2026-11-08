#!/usr/bin/env python3
"""
update_epg.py - Script autonomo per GitHub Actions e aggiornamento locale.
Scarica il palinsesto ufficiale dei primi 50+ canali del Digitale Terrestre Italiano (LCN 1-70)
per i prossimi 7 giorni a partire dalla data italiana odierna (Europe/Rome).
Salva i file in data/epg_7days.json, data/channels.json e data/status.json.
"""

import datetime
import json
import os
import sys
import time

try:
    import zoneinfo
except ImportError:
    from backports import zoneinfo  # type: ignore

from catalog_service import ITALIAN_ORIGINAL_ALIASES, enrich_items_with_streaming
from epg_engine import ALL_CHANNELS, DTT_CHANNELS, SKY_CHANNELS, fetch_7day_epg


def get_italian_today() -> datetime.date:
    """Restituisce la data odierna nel fuso orario ufficiale italiano (Europe/Rome)."""
    try:
        tz = zoneinfo.ZoneInfo("Europe/Rome")
        return datetime.datetime.now(tz).date()
    except Exception:
        # Fallback a orario UTC+1 (CET standard)
        tz_fallback = datetime.timezone(datetime.timedelta(hours=1))
        return datetime.datetime.now(tz_fallback).date()



def sync_cloud_backup_to_github(data_dir: str, sync_code: str = "shynicy_nextontv"):
    """
    Recupera l'ultimo snapshot della libreria dal cloud (ntfy.sh + bytebin) salvato da cellulare
    e aggiorna automaticamente data/library.json e data/library_backup.json prima del commit GitHub.
    """
    import urllib.request
    import urllib.error

    topic = f"nextontv_sync_{sync_code.strip().lower()}"
    ntfy_url = f"https://ntfy.sh/{topic}/json?poll=1&since=all"
    print(f"[Cloud Backup] Controllo salvataggi da cellulare su topic cloud: {topic}...")

    try:
        req = urllib.request.Request(ntfy_url, headers={"User-Agent": "NextOnTV-Bot/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw_text = resp.read().decode("utf-8")

        snap_data = None
        for line in reversed(raw_text.strip().split("\n")):
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
                if msg.get("attachment") and msg["attachment"].get("url"):
                    attachment_url = msg["attachment"]["url"]
                    try:
                        with urllib.request.urlopen(urllib.request.Request(attachment_url, headers={"User-Agent": "NextOnTV-Bot/1.0"}), timeout=10) as b_resp:
                            data_parsed = json.loads(b_resp.read().decode("utf-8"))
                            if isinstance(data_parsed, dict) and isinstance(data_parsed.get("library"), list):
                                snap_data = data_parsed
                                break
                    except Exception:
                        pass
                
                # Check inlined JSON message
                msg_body = (msg.get("message") or "").strip()
                if msg_body.startswith("{") and msg_body.endswith("}"):
                    try:
                        data_parsed = json.loads(msg_body)
                        if isinstance(data_parsed, dict) and isinstance(data_parsed.get("library"), list):
                            snap_data = data_parsed
                            break
                    except Exception:
                        pass
            except Exception:
                pass

        if not snap_data or not isinstance(snap_data.get("library"), list) or len(snap_data["library"]) == 0:
            print("[Cloud Backup] Nessun nuovo snapshot remoto su topic (i file locali restano validi).")
            return

        cloud_lib = snap_data.get("library")
        if isinstance(cloud_lib, list) and len(cloud_lib) > 0:
            lib_path = os.path.join(data_dir, "library.json")
            backup_path = os.path.join(data_dir, "library_backup.json")

            with open(lib_path, "w", encoding="utf-8") as f:
                json.dump(cloud_lib, f, ensure_ascii=False, indent=2)
            with open(backup_path, "w", encoding="utf-8") as f:
                json.dump(cloud_lib, f, ensure_ascii=False, indent=2)

            print(f"[Cloud Backup] ✅ Backup automatico da telefono completato: {len(cloud_lib)} titoli aggiornati in library.json.")
    except Exception as e:
        print(f"[Cloud Backup] Controllo completato (nessun errore bloccante): {e}")

def main():
    print("=" * 60)
    print("NextOnTV — Generatore Palinsesti 7 Giorni DTT (GitHub Actions)")
    print("=" * 60)

    start_time = time.time()
    today_it = get_italian_today()
    days_count = 7
    days_list = [(today_it + datetime.timedelta(days=i)).isoformat() for i in range(days_count)]

    print(f"Data corrente Italia (Europe/Rome): {today_it.isoformat()}")
    print(f"Finestra temporale: da {days_list[0]} a {days_list[-1]} ({days_count} giorni)")
    print(f"Canali configurati: {len(DTT_CHANNELS)} DTT + {len(SKY_CHANNELS)} Sky = {len(ALL_CHANNELS)} totali")

    # Cartella di output
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    os.makedirs(data_dir, exist_ok=True)

    # Scarica gli eventi EPG per i 7 giorni (DTT + Sky)
    events = fetch_7day_epg(start_date=today_it, days=days_count)
    elapsed = time.time() - start_time

    movies = [e for e in events if e.get("media_type") == "movie"]
    series = [e for e in events if e.get("media_type") == "series"]
    active_lcns = {e.get("lcn") for e in events}
    sky_events_cnt = sum(1 for e in events if e.get("is_sky"))

    print(f"Download completato in {elapsed:.2f} secondi!")
    print(f"Totale programmi TV analizzati: {len(events)} (di cui {sky_events_cnt} su Sky)")
    print(f"Film trovati: {len(movies)} | Episodi Serie TV: {len(series)}")
    print(f"Canali attivi con palinsesto: {len(active_lcns)} su {len(ALL_CHANNELS)}")

    # 1. Salva data/epg_7days.json
    epg_path = os.path.join(data_dir, "epg_7days.json")
    with open(epg_path, "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Salvati {len(events)} eventi in {epg_path} ({os.path.getsize(epg_path) / 1024:.1f} KB)")

    # 2. Salva data/channels.json (DTT + Sky)
    channels_path = os.path.join(data_dir, "channels.json")
    with open(channels_path, "w", encoding="utf-8") as f:
        json.dump({"channels": ALL_CHANNELS}, f, ensure_ascii=False, indent=2)
    print(f"Salvati {len(ALL_CHANNELS)} canali in {channels_path}")

    # 2b. Aggiorna catalogo Piattaforme Streaming (JustWatch IT gratuito) per Le Mie Liste + Saghe
    lib_path = os.path.join(data_dir, "library.json")
    backup_path = os.path.join(data_dir, "library_backup.json")
    streaming_cat_path = os.path.join(data_dir, "streaming_catalog.json")
    lib_items = []
    if os.path.isfile(lib_path):
        try:
            with open(lib_path, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, list):
                    lib_items = loaded
        except Exception:
            pass

    alias_probe_items = [
        {
            "title_it": al["it"],
            "title_original": al["orig"],
            "media_type": al["type"],
            "year": al.get("year") or "",
            "aliases": al.get("aliases") or [],
        }
        for al in ITALIAN_ORIGINAL_ALIASES
    ]
    print(f"[Streaming] Verifica disponibilita' streaming IT (Netflix, Prime, Disney+, Sky/NOW, HBO, ecc.) per {len(lib_items)} titoli in lista + {len(alias_probe_items)} titoli catalogo...")
    stream_map = {}
    if os.path.isfile(streaming_cat_path):
        try:
            with open(streaming_cat_path, "r", encoding="utf-8") as f:
                existing_map = json.load(f)
                if isinstance(existing_map, dict):
                    stream_map.update(existing_map)
        except Exception:
            pass

    stream_map.update(enrich_items_with_streaming(alias_probe_items, max_workers=10))
    if lib_items:
        stream_map.update(enrich_items_with_streaming(lib_items, max_workers=8))
        with open(lib_path, "w", encoding="utf-8") as f:
            json.dump(lib_items, f, ensure_ascii=False, indent=2)
        with open(backup_path, "w", encoding="utf-8") as f:
            json.dump(lib_items, f, ensure_ascii=False, indent=2)

    with open(streaming_cat_path, "w", encoding="utf-8") as f:
        json.dump(stream_map, f, ensure_ascii=False, separators=(",", ":"))
    print(f"[Streaming] Salvata mappa streaming in {streaming_cat_path} ({len(stream_map)} chiavi)")

    # 3. Salva data/status.json
    status_path = os.path.join(data_dir, "status.json")
    try:
        tz_it = zoneinfo.ZoneInfo("Europe/Rome")
        now_iso = datetime.datetime.now(tz_it).strftime("%d/%m/%Y %H:%M")
    except Exception:
        now_iso = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    status_data = {
        "ok": True,
        "start_date": today_it.isoformat(),
        "fetched_at": f"{now_iso} (Ora Italiana)",
        "days": days_list,
        "channels_count": len(active_lcns),
        "total_epg_events": len(events),
        "movies_count": len(movies),
        "series_count": len(series),
        "generator": "NextOnTV GitHub Actions Bot",
    }
    with open(status_path, "w", encoding="utf-8") as f:
        json.dump(status_data, f, ensure_ascii=False, indent=2)
    print(f"Salvati metadati di stato in {status_path}")

    # 4. Assicura file .nojekyll nella root del repository per GitHub Pages
    nojekyll_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".nojekyll")
    if not os.path.exists(nojekyll_path):
        with open(nojekyll_path, "w", encoding="utf-8") as f:
            f.write("")
        print("Creato file .nojekyll per GitHub Pages")

    print("=" * 60)
    print("AGGIORNAMENTO COMPLETATO CON SUCCESSO!")
    print("=" * 60)


if __name__ == "__main__":
    main()

