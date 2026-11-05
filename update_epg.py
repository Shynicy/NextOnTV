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

from epg_engine import DTT_CHANNELS, fetch_7day_epg


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

        attachment_url = None
        for line in reversed(raw_text.strip().split("\n")):
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
                if msg.get("attachment") and msg["attachment"].get("url"):
                    attachment_url = msg["attachment"]["url"]
                    break
            except Exception:
                pass

        if not attachment_url:
            print("[Cloud Backup] Nessun nuovo snapshot remoto su topic (i file locali restano validi).")
            return

        print(f"[Cloud Backup] Trovato snapshot recente, download da {attachment_url}...")
        with urllib.request.urlopen(urllib.request.Request(attachment_url, headers={"User-Agent": "NextOnTV-Bot/1.0"}), timeout=10) as b_resp:
            snap_data = json.loads(b_resp.read().decode("utf-8"))

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
    print(f"Canali DTT configurati: {len(DTT_CHANNELS)}")

    # Scarica gli eventi EPG per i 7 giorni
    events = fetch_7day_epg(start_date=today_it, days=days_count)
    elapsed = time.time() - start_time

    movies = [e for e in events if e.get("media_type") == "movie"]
    series = [e for e in events if e.get("media_type") == "series"]
    active_lcns = {e.get("lcn") for e in events}

    print(f"Download completato in {elapsed:.2f} secondi!")
    print(f"Totale programmi TV analizzati: {len(events)}")
    print(f"Film trovati: {len(movies)} | Episodi Serie TV: {len(series)}")
    print(f"Canali attivi con palinsesto: {len(active_lcns)} su {len(DTT_CHANNELS)}")

    # Cartella di output
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    os.makedirs(data_dir, exist_ok=True)

    # 1. Salva data/epg_7days.json
    epg_path = os.path.join(data_dir, "epg_7days.json")
    with open(epg_path, "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Salvati {len(events)} eventi in {epg_path} ({os.path.getsize(epg_path) / 1024:.1f} KB)")

    # 2. Salva data/channels.json
    channels_path = os.path.join(data_dir, "channels.json")
    with open(channels_path, "w", encoding="utf-8") as f:
        json.dump({"channels": DTT_CHANNELS}, f, ensure_ascii=False, indent=2)
    print(f"Salvati {len(DTT_CHANNELS)} canali in {channels_path}")

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

