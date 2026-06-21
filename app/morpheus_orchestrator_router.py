"""
Morpheus Orchestrator Router
Routes inbound emails to the correct vertical handler.

Verticals:
  - Wholesaling  : property lead forwarding, seller/buyer matching
  - Trust        : trust intake, document requests
  - Academy      : enrollment inquiries, course questions
  - General      : fallback / human hand-off
"""

import os
import logging

import requests

log = logging.getLogger("morpheus-router")

ABACUS_API_ENDPOINT = os.environ.get("ABACUS_API_ENDPOINT", "")
AGENTMAIL_API_KEY = os.environ.get("AGENTMAIL_API_KEY", "")
AGENTMAIL_BASE_URL = "https://api.agentmail.to/v0"

# ---------------------------------------------------------------------------
# Vertical keyword maps
# ---------------------------------------------------------------------------

WHOLESALING_KEYWORDS = {
    "wholesale", "wholesaling", "motivated seller", "cash buyer",
    "property deal", "off market", "off-market", "lead", "flip",
    "distressed", "probate", "foreclosure", "assignment",
}

TRUST_KEYWORDS = {
    "trust", "estate", "spv", "llp", "beneficiary", "trustee",
    "affidavit", "declaration", "sovereign", "lawful",
}

ACADEMY_KEYWORDS = {
    "course", "academy", "enroll", "enrolment", "training",
    "agnotology", "status correction", "epistemic", "irise",
}


def _classify(payload: dict) -> str:
    text = (
        (payload.get("subject") or "") + " " + (payload.get("body") or "")
    ).lower()

    if any(k in text for k in WHOLESALING_KEYWORDS):
        return "wholesaling"
    if any(k in text for k in TRUST_KEYWORDS):
        return "trust"
    if any(k in text for k in ACADEMY_KEYWORDS):
        return "academy"
    return "general"


# ---------------------------------------------------------------------------
# Vertical handlers
# ---------------------------------------------------------------------------

def _handle_wholesaling(payload: dict) -> dict:
    """
    Wholesaling Vertical: acknowledge the lead, notify the deal desk,
    and return a personalised reply.
    """
    sender = payload.get("from_email", "Ambassador")
    subject = payload.get("subject", "")

    log.info("[WHOLESALING] Lead received from %s | %s", sender, subject)

    # Optionally notify via Abacus AI agent
    if ABACUS_API_ENDPOINT:
        try:
            requests.post(
                ABACUS_API_ENDPOINT,
                json={
                    "agent_type": "WholesalingAgent",
                    "vertical": "wholesaling",
                    "payload": payload,
                },
                timeout=10,
            )
        except Exception as exc:
            log.warning("Abacus notify failed: %s", exc)

    reply = (
        f"Peace and Balance,\n\n"
        f"Thank you for reaching out regarding your property inquiry. "
        f"Your lead has been received by the Morpheus deal desk and a member of "
        f"the iRise Wholesaling team will contact you within 24 hours to discuss "
        f"next steps.\n\n"
        f"In the meantime, please reply with any additional details about the "
        f"property — address, asking price, condition, and your timeline.\n\n"
        f"Sovereignty through Intelligence.\n"
        f"Morpheus | iRise Nation"
    )
    return {"vertical": "wholesaling", "reply": reply}


def _handle_trust(payload: dict) -> dict:
    sender = payload.get("from_email", "Ambassador")
    log.info("[TRUST] Inquiry from %s", sender)

    reply = (
        f"Peace and Balance,\n\n"
        f"Thank you for your trust inquiry. Morpheus has received your message "
        f"and your consultation request is now queued.\n\n"
        f"A senior trust consultant will reach out within 48 hours. "
        f"In the meantime, you may review our trust packages at "
        f"https://irise.academy/trust or send /trust via our Telegram bot "
        f"(@MorpheusiRise_bot).\n\n"
        f"Sovereignty through Intelligence.\n"
        f"Morpheus | iRise Nation"
    )
    return {"vertical": "trust", "reply": reply}


def _handle_academy(payload: dict) -> dict:
    sender = payload.get("from_email", "Ambassador")
    log.info("[ACADEMY] Enrollment inquiry from %s", sender)

    reply = (
        f"Peace and Balance,\n\n"
        f"Thank you for your interest in iRise Academy. "
        f"We offer a range of courses in Agnotology, Status Correction, "
        f"Trust Law, and Sovereign Governance.\n\n"
        f"To view course details and pricing, visit https://irise.academy/courses "
        f"or send /academy via our Telegram bot (@MorpheusiRise_bot).\n\n"
        f"A team member will follow up with enrollment instructions.\n\n"
        f"Sovereignty through Intelligence.\n"
        f"Morpheus | iRise Nation"
    )
    return {"vertical": "academy", "reply": reply}


def _handle_general(payload: dict) -> dict:
    sender = payload.get("from_email", "Ambassador")
    log.info("[GENERAL] Message from %s", sender)

    reply = (
        f"Peace and Balance,\n\n"
        f"Thank you for contacting iRise Nation. Your message has been received "
        f"by Morpheus and will be reviewed by the appropriate team member.\n\n"
        f"For immediate assistance:\n"
        f"• Trust inquiries: /trust via @MorpheusiRise_bot\n"
        f"• Academy courses: /academy via @MorpheusiRise_bot\n"
        f"• Wholesaling leads: reply to this email with property details\n\n"
        f"Sovereignty through Intelligence.\n"
        f"Morpheus | iRise Nation"
    )
    return {"vertical": "general", "reply": reply}


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

_HANDLERS = {
    "wholesaling": _handle_wholesaling,
    "trust": _handle_trust,
    "academy": _handle_academy,
    "general": _handle_general,
}


def route_inbound_email(payload: dict) -> dict:
    """
    Classify and route an inbound email payload.

    Args:
        payload: dict with keys direction, from_email, to_email,
                 subject, body, thread_id.

    Returns:
        dict with at minimum {"vertical": str, "reply": str | None}
    """
    vertical = _classify(payload)
    handler = _HANDLERS.get(vertical, _handle_general)
    result = handler(payload)
    log.info("Routed to vertical=%s for %s", vertical, payload.get("from_email"))
    return result
