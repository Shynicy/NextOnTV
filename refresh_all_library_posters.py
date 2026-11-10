import json
import time
import urllib.request
import concurrent.futures
from typing import Dict, List
import catalog_service as cs

def main():
    print("1. Fetching latest snapshot from ntfy.sh...")
    url = "https://ntfy.sh/nextontv_sync_shynicy_nextontv/json?poll=1&since=all"
    req = urllib.request.Request(url, headers={"User-Agent": "NextOnTV/1.0"})
    with urllib.request.urlopen(req) as resp:
        lines = resp.read().decode("utf-8").strip().split("\n")
    
    snap = None
    for line in reversed(lines):
        if not line:
            continue
        ev = json.loads(line)
        if ev.get("attachment") and ev["attachment"].get("url"):
            try:
                with urllib.request.urlopen(ev["attachment"]["url"]) as bresp:
                    snap = json.loads(bresp.read().decode("utf-8"))
                    break
            except Exception:
                pass
        msg = ev.get("message", "").strip()
        if msg.startswith("{") and msg.endswith("}"):
            try:
                s = json.loads(msg)
                if "library" in s:
                    snap = s
                    break
            except Exception:
                pass

    if not snap or not snap.get("library"):
        print("Fallback to data/library.json")
        try:
            with open("data/library.json", "r", encoding="utf-8") as f:
                lib = json.load(f)
                snap = {"library": lib, "updated_at": time.time()}
        except Exception:
            print("No library found!")
            return

    library: List[Dict] = snap.get("library", [])
    print(f"Total items in library: {len(library)}")

    # Upgrade from ITALIAN_ORIGINAL_ALIASES & SAGA definitions first
    alias_map = {}
    for al in cs.ITALIAN_ORIGINAL_ALIASES:
        p = al.get("poster")
        if p:
            alias_map[cs.normalize_title(al["it"])] = p
            alias_map[cs.normalize_title(al["orig"])] = p

    upgraded_alias = 0
    for it in library:
        tit = cs.normalize_title(it.get("title_it") or "")
        tor = cs.normalize_title(it.get("title_original") or "")
        best_p = alias_map.get(tit) or alias_map.get(tor)
        if best_p and cs._poster_quality_rank(best_p) > cs._poster_quality_rank(it.get("poster", "")):
            it["poster"] = best_p
            upgraded_alias += 1
    print(f"Upgraded {upgraded_alias} items from curated sagas and aliases.")

    # Find items with rank <= 3 (missing, logo, screenshot, commons file) or rank 4 (italian wiki) where higher rank exists
    candidates_to_check = []
    for it in library:
        r = cs._poster_quality_rank(it.get("poster", ""))
        if r <= 3:
            candidates_to_check.append(it)

    print(f"Items with low-quality/missing posters (rank <= 3): {len(candidates_to_check)}")

    def _resolve_best_poster(item: Dict) -> bool:
        t = (item.get("title_it") or item.get("title_original") or "").strip()
        if not t:
            return False
        cur_p = item.get("poster") or ""
        cur_r = cs._poster_quality_rank(cur_p)
        try:
            res = cs.search_catalog(t)
            best_p = cur_p
            best_r = cur_r
            for r in res[:6]:
                p = r.get("poster") or ""
                pr = cs._poster_quality_rank(p)
                if pr > best_r:
                    best_p = p
                    best_r = pr
            if best_r > cur_r and best_p != cur_p:
                item["poster"] = best_p
                return True
        except Exception as e:
            pass
        return False

    upgraded_search = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(_resolve_best_poster, it): it for it in candidates_to_check}
        for fut in concurrent.futures.as_completed(futs):
            try:
                if fut.result():
                    upgraded_search += 1
            except Exception:
                pass

    print(f"Upgraded {upgraded_search} low-rank items from search catalog!")

    # Check distribution now
    ranks = {}
    for x in library:
        r = cs._poster_quality_rank(x.get("poster"))
        ranks[r] = ranks.get(r, 0) + 1
    print("New ranks distribution:", sorted(ranks.items()))

    # Update snap timestamp
    snap["updated_at"] = time.time()
    snap["library"] = library

    # Save to data/library.json
    with open("data/library.json", "w", encoding="utf-8") as f:
        json.dump(library, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(library)} items to data/library.json")

    # Push to ntfy.sh
    print("Pushing updated snapshot to ntfy.sh topic nextontv_sync_shynicy_nextontv...")
    sync_url = "https://ntfy.sh/nextontv_sync_shynicy_nextontv"
    snap_bytes = json.dumps(snap, ensure_ascii=False).encode("utf-8")
    
    # Try uploading to bytebin if > 3.8KB, or direct
    bytebin_url = None
    try:
        bb_req = urllib.request.Request(
            "https://bytebin.lucko.me/post",
            data=snap_bytes,
            headers={"Content-Type": "application/json", "User-Agent": "NextOnTV/1.0"}
        )
        with urllib.request.urlopen(bb_req, timeout=10) as bb_resp:
            bb_data = json.loads(bb_resp.read().decode("utf-8"))
            if bb_data and bb_data.get("key"):
                bytebin_url = f"https://bytebin.lucko.me/{bb_data['key']}"
                print(f"Uploaded snapshot to bytebin: {bytebin_url}")
    except Exception as e:
        print("Bytebin upload failed:", e)

    headers = {
        "Title": "NextOnTV Posters Updated",
        "Priority": "low",
        "Tags": "art,sparkles",
        "User-Agent": "NextOnTV/1.0",
    }
    if bytebin_url:
        headers["Attach"] = bytebin_url
        msg_body = f"🎨 Locandine aggiornate in alta definizione ({len(library)} titoli)"
    else:
        msg_body = json.dumps(snap, ensure_ascii=False)[:3900]

    n_req = urllib.request.Request(sync_url, data=msg_body.encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(n_req, timeout=10) as n_resp:
        print("ntfy response status:", n_resp.status)

    print("DONE! All posters successfully upgraded and synced.")

if __name__ == "__main__":
    main()

