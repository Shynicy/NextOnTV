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
    Upload full database & matches snapshot to ntfy.sh and bytebin so any device
    (PC or Android on 4G/5G) can sync bi-directionally without loss.
    """
    if not sync_code:
        return None
    topic = f"nextontv_sync_{sync_code.strip().lower()}"
    raw_payload = json.dumps(snapshot, ensure_ascii=False).encode("utf-8")
    att_url = None

    # 1. Upload snapshot directly to ntfy.sh attachment
    try:
        req_ntfy_file = urllib.request.Request(
            f"https://ntfy.sh/{topic}?filename=snapshot.json",
            data=raw_payload,
            headers={
                "User-Agent": USER_AGENT,
                "Title": "NextOnTV Cloud Snapshot",
                "Tags": "package",
            },
            method="PUT",
        )
        with urllib.request.urlopen(req_ntfy_file, timeout=12, context=SSL_CTX) as resp_f:
            f_data = json.loads(resp_f.read().decode("utf-8", errors="ignore"))
            att_url = (f_data.get("attachment") or {}).get("url")
    except Exception:
        pass

    # 2. Try bytebin as secondary mirror
    bytebin_key = None
    try:
        req_b = urllib.request.Request(
            "https://bytebin.lucko.me/post",
            data=raw_payload,
            headers={"Content-Type": "application/json", "User-Agent": USER_AGENT},
            method="POST",
        )
        with urllib.request.urlopen(req_b, timeout=8, context=SSL_CTX) as resp_b:
            res_data = json.loads(resp_b.read().decode("utf-8", errors="ignore"))
            bytebin_key = res_data.get("key")
    except Exception:
        pass

    # 3. Post summary message to ntfy
    try:
        ntfy_msg = json.dumps({
            "bytebin_key": bytebin_key or "",
            "attachment_url": att_url or "",
            "updated_at": snapshot.get("updated_at") or time.time(),
            "source": snapshot.get("source") or "pc",
            "items_count": len(snapshot.get("library") or []),
        })
        req_ntfy = urllib.request.Request(
            f"https://ntfy.sh/{topic}",
            data=ntfy_msg.encode("utf-8"),
            headers={"User-Agent": USER_AGENT, "Title": "NextOnTV Sync Notice"},
            method="POST",
        )
        with urllib.request.urlopen(req_ntfy, timeout=8, context=SSL_CTX) as _:
            pass
    except Exception:
        pass

    cfg = get_or_create_sync_config()
    cfg["sync_code"] = sync_code.strip().lower()
    if bytebin_key:
        cfg["last_bytebin_key"] = bytebin_key
    cfg["last_synced_at"] = snapshot.get("updated_at") or time.time()
    save_sync_config(cfg)
    return att_url or bytebin_key or "ok"


def pull_latest_snapshot_from_cloud(sync_code: str) -> Optional[Dict]:
    """
    Query ntfy.sh/nextontv_sync_{sync_code} for the newest snapshot, checking:
      1. Direct ntfy file attachments
      2. Inlined JSON messages
      3. Bytebin key references
    """
    if not sync_code:
        return None
    topic = f"nextontv_sync_{sync_code.strip().lower()}"
    try:
        req = urllib.request.Request(
            f"https://ntfy.sh/{topic}/json?poll=1&since=all",
            headers={"User-Agent": USER_AGENT},
        )
        with urllib.request.urlopen(req, timeout=10, context=SSL_CTX) as resp:
            lines = resp.read().decode("utf-8", errors="ignore").strip().splitlines()

        latest_snap = None
        latest_ts = -1.0

        for line in lines:
            line = line.strip()
            if not line:
                continue
            try:
                ev = json.loads(line)
                if ev.get("event") != "message":
                    continue
                ev_time = float(ev.get("time") or 0)

                # Check attachment first
                att = ev.get("attachment") or {}
                if att.get("url"):
                    try:
                        req_att = urllib.request.Request(att["url"], headers={"User-Agent": USER_AGENT})
                        with urllib.request.urlopen(req_att, timeout=10, context=SSL_CTX) as a_resp:
                            snap_obj = json.loads(a_resp.read().decode("utf-8", errors="ignore"))
                            if isinstance(snap_obj, dict) and isinstance(snap_obj.get("library"), list):
                                u_ts = float(snap_obj.get("updated_at") or ev_time)
                                if u_ts >= latest_ts:
                                    latest_ts = u_ts
                                    latest_snap = snap_obj
                                    continue
                    except Exception:
                        pass

                # Check inlined JSON message or bytebin key
                msg_raw = (ev.get("message") or "").strip()
                if msg_raw.startswith("{") and msg_raw.endswith("}"):
                    try:
                        msg_obj = json.loads(msg_raw)
                        if isinstance(msg_obj, dict) and isinstance(msg_obj.get("library"), list):
                            u_ts = float(msg_obj.get("updated_at") or ev_time)
                            if u_ts >= latest_ts:
                                latest_ts = u_ts
                                latest_snap = msg_obj
                                continue
                        
                        b_key = msg_obj.get("bytebin_key")
                        if b_key:
                            req_blob = urllib.request.Request(
                                f"https://bytebin.lucko.me/{b_key}",
                                headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
                            )
                            with urllib.request.urlopen(req_blob, timeout=8, context=SSL_CTX) as resp_b:
                                snap_obj = json.loads(resp_b.read().decode("utf-8", errors="ignore"))
                                if isinstance(snap_obj, dict) and isinstance(snap_obj.get("library"), list):
                                    u_ts = float(snap_obj.get("updated_at") or ev_time)
                                    if u_ts >= latest_ts:
                                        latest_ts = u_ts
                                        latest_snap = snap_obj
                                        continue
                    except Exception:
                        pass
            except Exception:
                continue

        return latest_snap
    except Exception:
        return None

