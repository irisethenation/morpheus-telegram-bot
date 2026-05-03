# Morpheus × iRise Academy — Autonomous Workflow Architecture

**Version:** 2.0  
**Date:** May 2026  
**Status:** Phase 1–2 live on branch `claude/setup-trypost-deployment-naMej`

---

## 1. System Overview

Morpheus is the sovereign super-agent of iRise Nation. All intelligence, routing, and agent orchestration flows through Morpheus. No sub-agent acts independently — Morpheus holds complete override control over every function in the stack.

```
User / External Trigger
        │
        ▼
  MORPHEUS (super-agent)
  ├── override() control
  ├── Trinity intelligence lookup
  └── dispatch() to sub-agents
        │
   ┌────┼────────────────────────┐
   │    │                        │
TrustAgent  AcademyAgent   PublisherAgent
   │    │                        │
PaymentAgent  ContentAgent  TrinityAgent
   │
EmailAgent ← LOCKED (operator approval required)
```

---

## 2. Agent Registry

| Agent | Role | Status |
|---|---|---|
| **Morpheus** | Super-agent, orchestrator, override controller | Live |
| **TrinityAgent** | Student intelligence — segment lookup before every route | Live |
| **TrustAgent** | Trust packages, multi-fork intake, Living Estate design | Live |
| **AcademyAgent** | Course catalogue, enrollment routing | Live |
| **PaymentAgent** | Price matrix, payment link generation | Live |
| **PublisherAgent** | Telegram channel posts (text, photo, video) | Live |
| **ContentAgent** | Post generation (rotation + Claude API) | Live |
| **EmailAgent** | Email dispatch — **blocked at startup, operator unlock required** | Locked |

---

## 3. Student Segmentation (Trinity Intelligence)

The `COMPLETE_STUDENT_LIST_FULL.docx` is the **ALL_TIME registry** — every person who has ever interacted with iRise Nation. It must not be used as a current student list.

Trinity resolves every user to one of seven segments before Morpheus routes:

| Segment | Definition | Morpheus Default Routing |
|---|---|---|
| `trust_client` | Currently in trust delivery process | TrustAgent → update |
| `active_student` | Enrolled, paying, currently attending | AcademyAgent → portal |
| `trust_prospect` | Completed intake, not yet purchased | TrustAgent → intake resume |
| `academy_prospect` | Expressed interest, not enrolled | AcademyAgent → enroll |
| `former_student` | Completed course(s), no active enrolment | TrustAgent → Living Estate upsell |
| `all_time` | In master list, no current relationship | AcademyAgent → catalogue |
| `unknown` | No record found — new prospect | TrustAgent → view packages |

**Key rule:** Former students are NOT current students. Morpheus routes them toward the Living Estate (trust) as their natural next step after academy graduation.

---

## 4. Trust Intake — Multi-Fork Flow

The trust intake is a 6-stage conversation with branching based on answers:

```
Stage 1: Jurisdiction (country of residence)
    │
Stage 2: Endeavours (business type)
    ├── Has company / combination → Stage 2b: Business Detail
    ├── Holds property → Stage 2b: Property Detail
    └── Other → Stage 3
    │
Stage 3: Assets to protect (multi-select)
    │
Stage 4: Beneficiaries
    │
Stage 5: SPV requirement
    ├── Yes → Recommendation: Full Estate Trust + SPV (£4,997)
    ├── No  → Recommendation: Foundational Trust (£2,997)
    └── Unsure → Consultation route
    │
Stage 6: Confirmation + payment link
```

**Marketing positioning for Stage 2:**
> "Now it is time to design the structure of your trust by understanding what your current business operations are like — or how you would like them to be — so that your trust protects you and we can create your custom guide based on your intended endeavours throughout your Living Estate."

**Delivery promises:**
- Foundational Trust: 28 days from completed intake
- Full Estate Trust + SPV: 45 days from completed intake
- Sovereign Legacy Suite: 90 days from completed intake

**Trust Review** (standalone offering): £497 — independent audit of existing trust structures, available to any client.

---

## 5. Autonomous Social Media Pipeline

### Immediate (live now — Telegram channel)

Vercel Cron fires daily at **09:00 UTC**:

```
api/cron/social-post.js
  → ContentAgent.execute()
      → Claude API (if ANTHROPIC_API_KEY set) OR pre-written rotation
  → PublisherAgent.execute()
      → Telegram Bot API → IRISE_CHANNEL_ID
```

Six-post rotation (cycles daily):
1. What is a Living Estate? (trust education)
2. iRise Academy — course overview
3. Trust Review offering
4. SPV advantage
5. Urgency — estate unprotected
6. Academy launch / domain announcement

### Phase 2 (requires TryPost live + domain resolved)

Once `irise.academy` resolves and TryPost is deployed to `social.irise.academy`:

```
ContentAgent generates post
  → TryPost API schedules to: Facebook, Instagram, X, TikTok, YouTube Shorts
  → PublisherAgent posts simultaneously to Telegram channel
```

---

## 6. Known Blockers

| Blocker | Impact | Action Required |
|---|---|---|
| `irise.academy` domain not resolving | Academy enrollment page unreachable | Check DNS A record → 51.79.29.15; check Caddy/Nginx config on OVH |
| `IRISE_CHANNEL_ID` not set | Telegram channel posts silent | Set in Vercel dashboard (numeric ID or @handle) |
| `CRON_SECRET` not set | Cron endpoint unprotected | Generate and set in Vercel dashboard |
| `ANTHROPIC_API_KEY` not set | ContentAgent uses rotation only (fine for now) | Add when ready for AI-generated posts |
| TryPost not deployed | Multi-platform posting blocked | Deploy to social.irise.academy per deployment brief |
| Trinity endpoint not live | Morpheus defaults all users to UNKNOWN | Deploy Trinity API or connect student KV store |
| `COMPLETE_STUDENT_LIST_FULL.docx` not ingested | Segmentation uses no data | Upload/sync to Trinity or Vercel KV |

---

## 7. Environment Variables — Full Reference

Set all of these in the Vercel project dashboard (Settings → Environment Variables):

| Variable | Purpose | Required |
|---|---|---|
| `TELEGRAM_BOT_TOKEN_MORPHEUS` | Morpheus bot token | Yes |
| `TELEGRAM_BOT_TOKEN_TRINITY` | Trinity bot token | Yes |
| `MORPHEUS_AGENT_ENDPOINT` | Morpheus/Trinity agent API base URL | Phase 2 |
| `IRISE_CHANNEL_ID` | Telegram channel ID for publishing | Yes |
| `PUBLISH_SECRET` | Auth header for /api/publish endpoint | Yes |
| `CRON_SECRET` | Auth for Vercel Cron calls | Yes |
| `ANTHROPIC_API_KEY` | Claude API for AI content generation | Optional |
| `BREVO_API_KEY` | Email (EmailAgent locked — not active) | Future |
| `STRIPE_SECRET_KEY` | Payment processing | Phase 2 |

---

## 8. Deployment Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `POST /api/webhook` | POST | Telegram bot webhook |
| `POST /api/publish` | POST | Publish to Telegram channel (auth required) |
| `GET /api/cron/social-post` | GET | Daily social post (Vercel Cron) |

---

## 9. Phase Roadmap

| Phase | Deliverable | Status |
|---|---|---|
| 1 | Morpheus orchestrator + agent registry | ✅ Complete |
| 1 | Trinity segmentation model | ✅ Complete |
| 1 | Multi-fork trust intake (6 stages) | ✅ Complete |
| 1 | ContentAgent + daily Telegram cron | ✅ Complete |
| 1 | Email operator lock | ✅ Complete |
| 2 | Vercel KV — intake state persistence | Pending |
| 2 | Stripe webhook → PaymentAgent → access provision | Pending |
| 2 | TryPost deployment + multi-platform scheduling | Pending (domain blocker) |
| 3 | LeadAgent — CRM + follow-up sequences | Pending |
| 3 | Operator Telegram control panel (/status, /override, /report) | Pending |
| 4 | React trust intake app (full fork UI) | Pending |
| 4 | Document generation pipeline | Pending |

---

*iRise Nation — Sovereignty through Intelligence.*  
*Morpheus Orchestration Stack — confidential internal document.*
