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
    now_iso = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    status_data = {
        "ok": True,
        "start_date": today_it.isoformat(),
        "fetched_at": now_iso,
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

