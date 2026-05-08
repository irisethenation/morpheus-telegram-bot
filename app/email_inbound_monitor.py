"""
Morpheus AgentMail Inbound Bridge
Polls the AgentMail inbox, routes each message through the orchestrator,
and logs every transaction via the CommunicationLogger skill.

Required env vars:
  AGENTMAIL_API_KEY   - AgentMail API key
  POLL_INTERVAL_SEC   - seconds between polls (default 30)

Start:
  nohup python3 /opt/stacks/morpheus/app/email_inbound_monitor.py \
      > /tmp/morpheus_bridge.log 2>&1 &
"""

import json
import os
import sys
import time
import logging

import requests

sys.path.insert(0, "/app/skills")
from communication_logger import CommunicationLogger  # noqa: E402

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
AGENTMAIL_API_KEY = os.environ.get("AGENTMAIL_API_KEY", "")
AGENTMAIL_BASE_URL = "https://api.agentmail.to/v0"
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL_SEC", "30"))
SEEN_FILE = "/tmp/morpheus_seen_messages.json"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("morpheus-bridge")

logger = CommunicationLogger()


# ---------------------------------------------------------------------------
# AgentMail helpers
# ---------------------------------------------------------------------------

def _headers():
    return {"Authorization": f"Bearer {AGENTMAIL_API_KEY}"}


def get_inbox_id():
    """Auto-detect the first inbox associated with the API key."""
    resp = requests.get(f"{AGENTMAIL_BASE_URL}/inboxes", headers=_headers(), timeout=15)
    resp.raise_for_status()
    inboxes = resp.json().get("inboxes") or resp.json()
    if not inboxes:
        raise RuntimeError("No AgentMail inboxes found for this API key.")
    inbox_id = inboxes[0].get("id") or inboxes[0].get("inbox_id")
    log.info("Auto-detected inbox: %s", inbox_id)
    return inbox_id


def fetch_messages(inbox_id):
    resp = requests.get(
        f"{AGENTMAIL_BASE_URL}/inboxes/{inbox_id}/messages",
        headers=_headers(),
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("messages") or data


def mark_seen(message_id, seen: set):
    seen.add(message_id)
    with open(SEEN_FILE, "w") as f:
        json.dump(list(seen), f)


def load_seen() -> set:
    try:
        with open(SEEN_FILE) as f:
            return set(json.load(f))
    except (FileNotFoundError, json.JSONDecodeError):
        return set()


# ---------------------------------------------------------------------------
# Routing
# ---------------------------------------------------------------------------

def route_message(msg: dict, inbox_id: str):
    """Pass the message to the orchestrator router and log both directions."""
    from morpheus_orchestrator_router import route_inbound_email  # local import

    payload = {
        "direction": "inbound",
        "from_email": msg.get("from") or msg.get("sender"),
        "to_email": msg.get("to") or msg.get("recipient") or f"{inbox_id}@agentmail.to",
        "subject": msg.get("subject", "(no subject)"),
        "body": msg.get("body") or msg.get("text") or msg.get("html", ""),
        "thread_id": msg.get("thread_id") or msg.get("id"),
    }

    logger.execute(payload)
    log.info("Logged inbound: %s → %s | %s", payload["from_email"], payload["to_email"], payload["subject"])

    try:
        result = route_inbound_email(payload)
        if result.get("reply"):
            outbound = {
                "direction": "outbound",
                "from_email": payload["to_email"],
                "to_email": payload["from_email"],
                "subject": f"Re: {payload['subject']}",
                "body": result["reply"],
                "thread_id": payload["thread_id"],
            }
            logger.execute(outbound)
            log.info("Logged outbound reply to %s", payload["from_email"])
    except Exception as exc:
        log.error("Router error for message %s: %s", msg.get("id"), exc)


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def main():
    if not AGENTMAIL_API_KEY:
        log.error("AGENTMAIL_API_KEY is not set. Exiting.")
        sys.exit(1)

    log.info("Morpheus email bridge starting (poll every %ss)", POLL_INTERVAL)
    inbox_id = get_inbox_id()
    seen = load_seen()

    while True:
        try:
            messages = fetch_messages(inbox_id)
            new_count = 0
            for msg in messages:
                mid = msg.get("id") or msg.get("message_id")
                if mid and mid not in seen:
                    route_message(msg, inbox_id)
                    mark_seen(mid, seen)
                    new_count += 1
            if new_count:
                log.info("Processed %d new message(s).", new_count)
        except requests.HTTPError as exc:
            log.error("AgentMail HTTP error: %s", exc)
        except Exception as exc:
            log.exception("Unexpected error: %s", exc)

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
