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
from cloud_sync import pull_latest_snapshot_from_cloud
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


def sync_cloud_backup_to_github(data_dir: str, default_sync_code: str = "shynicy_nextontv") -> bool:
    """
    Recupera l'ultimo snapshot della libreria dal cloud (ntfy.sh + bytebin) salvato da cellulare o PC
    e aggiorna automaticamente data/library.json e data/library_backup.json prima del commit GitHub.
    Ritorna True se sono state salvate nuove modifiche, False altrimenti.
    """
    sync_code = os.environ.get("NEXTONTV_SYNC_CODE", "").strip().lower()
    if not sync_code:
        cfg_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sync_config.json")
        if os.path.isfile(cfg_path):
            try:
                with open(cfg_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    sync_code = (cfg.get("sync_code") or "").strip().lower()
            except Exception:
                pass
    if not sync_code:
        sync_code = default_sync_code

    topic = f"nextontv_sync_{sync_code}"
    print(f"[Cloud Backup] Controllo modifiche liste salvate nel cloud (topic: {topic})...")

    lib_path = os.path.join(data_dir, "library.json")
    backup_path = os.path.join(data_dir, "library_backup.json")

    existing_items = []
    if os.path.isfile(lib_path):
        try:
            with open(lib_path, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, list):
                    existing_items = loaded
        except Exception:
            pass

    try:
        snap_data = pull_latest_snapshot_from_cloud(sync_code)
        if not snap_data or not isinstance(snap_data.get("library"), list):
            print(f"[Cloud Backup] Nessun nuovo snapshot remoto su cloud (la libreria locale con {len(existing_items)} titoli resta invariata).")
            return False

        cloud_lib = snap_data.get("library")
        if len(cloud_lib) == 0:
            print("[Cloud Backup] ⚠️ Snapshot remoto vuoto: ignorato per sicurezza per preservare la libreria esistente.")
            return False

        # Protezione anti-cancellazione accidentale
        if len(existing_items) > 100 and len(cloud_lib) < 10:
            print(f"[Cloud Backup] ⚠️ Snapshot remoto con soli {len(cloud_lib)} titoli a fronte dei {len(existing_items)} locali: ignorato per sicurezza.")
            return False

        # Verifica se ci sono reali differenze rispetto ai file locali
        def _lib_signature(items):
            return [
                (
                    it.get("id"),
                    (it.get("title_it") or "").strip().lower(),
                    it.get("status"),
                    it.get("watched_episodes_count"),
                    len(it.get("watched_episodes") or []),
                )
                for it in items
            ]

        if existing_items and _lib_signature(existing_items) == _lib_signature(cloud_lib):
            print(f"[Cloud Backup] Le liste locali sono già perfettamente allineate con il cloud ({len(cloud_lib)} titoli).")
            return False

        with open(lib_path, "w", encoding="utf-8") as f:
            json.dump(cloud_lib, f, ensure_ascii=False, indent=2)
        with open(backup_path, "w", encoding="utf-8") as f:
            json.dump(cloud_lib, f, ensure_ascii=False, indent=2)

        source = snap_data.get("source") or "remoto"
        print(f"[Cloud Backup] ✅ Nuove modifiche rilevate da {source}! Aggiornati {len(cloud_lib)} titoli in library.json e library_backup.json.")
        return True

    except Exception as e:
        print(f"[Cloud Backup] Controllo completato con avviso (nessun errore bloccante): {e}")
        return False

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

    # 2a. Sincronizza modifiche delle liste dal Cloud (salvate da telefono o PC il giorno prima)
    cloud_synced = sync_cloud_backup_to_github(data_dir)

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
    print(f"[Streaming] Verifica disponibilita' streaming IT (Netflix, Prime, Disney+, NOW, Sky Go, HBO, ecc.) per {len(lib_items)} titoli in lista + {len(alias_probe_items)} titoli catalogo...")
    stream_map = {}

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
        "library_count": len(lib_items),
        "library_synced_from_cloud": bool(cloud_synced),
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

