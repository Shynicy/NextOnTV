import json
import os
import random
import ssl
import string
import time
import urllib.request
from typing import Dict, Optional

SSL_CTX = ssl._create_unverified_context()
USER_AGENT = "NextOnTV/1.0 (CloudSync)"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SYNC_CONFIG_PATH = os.path.join(BASE_DIR, "sync_config.json")


def get_or_create_sync_config() -> Dict:
    if os.path.isfile(SYNC_CONFIG_PATH):
        try:
            with open(SYNC_CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                if cfg.get("sync_code"):
                    return cfg
        except Exception:
            pass

    rand_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    cfg = {
        "sync_code": f"nextontv-{rand_suffix}",
        "last_bytebin_key": "",
        "last_synced_at": 0,
    }
    save_sync_config(cfg)
    return cfg


def save_sync_config(cfg: Dict) -> None:
    try:
        with open(SYNC_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
    except Exception:
        pass


def push_snapshot_to_cloud(sync_code: str, snapshot: Dict) -> Optional[str]:
    """
    Upload full database & matches snapshot to bytebin.lucko.me and announce the key
    on ntfy.sh/nextontv_sync_{sync_code} so any device (PC or Android on 4G/5G) can sync.
    """
    if not sync_code:
        return None
    try:
        raw_payload = json.dumps(snapshot, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            "https://bytebin.lucko.me/post",
            data=raw_payload,
            headers={"Content-Type": "application/json", "User-Agent": USER_AGENT},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10, context=SSL_CTX) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            bytebin_key = res_data.get("key")

        if not bytebin_key:
            return None

        # Announce on ntfy.sh topic
        topic = f"nextontv_sync_{sync_code.strip().lower()}"
        ntfy_msg = json.dumps({
            "bytebin_key": bytebin_key,
            "updated_at": snapshot.get("updated_at") or time.time(),
            "source": snapshot.get("source") or "pc",
            "tunnel_url": snapshot.get("tunnel_url") or "",
            "items_count": len(snapshot.get("library") or []),
        })
        req_ntfy = urllib.request.Request(
            f"https://ntfy.sh/{topic}",
            data=ntfy_msg.encode("utf-8"),
            headers={"User-Agent": USER_AGENT, "Title": "NextOnTV Cloud Sync"},
            method="POST",
        )
        with urllib.request.urlopen(req_ntfy, timeout=8, context=SSL_CTX) as _:
            pass

        cfg = get_or_create_sync_config()
        cfg["sync_code"] = sync_code.strip().lower()
        cfg["last_bytebin_key"] = bytebin_key
        cfg["last_synced_at"] = snapshot.get("updated_at") or time.time()
        save_sync_config(cfg)
        return bytebin_key
    except Exception:
        return None


def pull_latest_snapshot_from_cloud(sync_code: str) -> Optional[Dict]:
    """
    Query ntfy.sh/nextontv_sync_{sync_code} for the newest bytebin_key and download
    the full cloud snapshot from bytebin.lucko.me.
    """
    if not sync_code:
        return None
    topic = f"nextontv_sync_{sync_code.strip().lower()}"
    try:
        req = urllib.request.Request(
            f"https://ntfy.sh/{topic}/json?poll=1&since=all",
            headers={"User-Agent": USER_AGENT},
        )
        with urllib.request.urlopen(req, timeout=8, context=SSL_CTX) as resp:
            lines = resp.read().decode("utf-8", errors="ignore").strip().splitlines()

        latest_key = None
        latest_ts = -1.0
        for line in lines:
            try:
                ev = json.loads(line)
                if ev.get("event") != "message":
                    continue
                msg_obj = json.loads(ev.get("message") or "{}")
                b_key = msg_obj.get("bytebin_key")
                u_ts = float(msg_obj.get("updated_at") or ev.get("time") or 0)
                if b_key and u_ts >= latest_ts:
                    latest_ts = u_ts
                    latest_key = b_key
            except Exception:
                continue

        if not latest_key:
            cfg = get_or_create_sync_config()
            latest_key = cfg.get("last_bytebin_key")
        if not latest_key:
            return None

        req_blob = urllib.request.Request(
            f"https://bytebin.lucko.me/{latest_key}",
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        )
        with urllib.request.urlopen(req_blob, timeout=10, context=SSL_CTX) as resp_b:
            snapshot = json.loads(resp_b.read().decode("utf-8", errors="ignore"))
            snapshot["bytebin_key"] = latest_key
            return snapshot
    except Exception:
        return None

