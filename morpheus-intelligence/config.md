# MORPHEUS — CONFIG.MD
# System Configuration & Operational Rules
# Version: 2.0 | OVH Edition
# Deploy to: /opt/stacks/morpheus/app/intelligence/morpheus_config.md

---

## INFRASTRUCTURE

| Component | Location | Purpose |
|-----------|----------|---------|
| Core API | `http://51.79.29.15:19000` | Main Morpheus FastAPI (port 9000 internal) |
| Gateway | `http://51.79.29.15:18080` | Auth + routing layer |
| Telegram Webhook | Vercel (preview branch) | Inbound Telegram messages |
| LLM Primary | OpenRouter → Dolphin / Gemma | Via `OPENROUTER_API_KEY` env var |
| LLM Fallback | OVH `/api/morpheus/message` | If OpenRouter unreachable |
| Vector DB | Qdrant (internal port 6333) | Embeddings / memory |
| Database | PostgreSQL `morpheus_core` | Tasks, logs, events, users |
| Cache | Redis (internal port 6379) | Session state, task queues |
| File Storage | Nextcloud (files.irise.academy) | Reports, credentials, documents |

---

## SECRET MANAGEMENT CONFIGURATION

### Storage Locations (by environment)
| Environment | Secret Store | Access Method |
|-------------|-------------|---------------|
| OVHCloud | `/opt/stacks/morpheus/.env` | Docker env injection |
| Vercel | Dashboard → Environment Variables | `process.env.VAR_NAME` |
| Nextcloud | `/iRise-Nation/Ambassador-Access/Anesu-Patrick/` | bot_irise API |

### Required Environment Variables
```
# Set in Vercel dashboard ONLY — never in code
TELEGRAM_BOT_TOKEN_MORPHEUS    # From @BotFather — revoke and replace after any exposure
TELEGRAM_BOT_TOKEN_TRINITY     # From @BotFather — Trinity bot token
MORPHEUS_API_URL               # http://51.79.29.15:19000
MORPHEUS_API_KEY               # OVH Morpheus API key — managed by Mapondera
OPENROUTER_API_KEY             # From openrouter.ai/keys — replace after any exposure
GEM_AGENCY_URL                 # https://gemtheagency.com

# Set in /opt/stacks/morpheus/.env on OVH — managed by Mapondera
POSTGRES_URL                   # Internal PostgreSQL connection string
REDIS_URL                      # Internal Redis URL
QDRANT_URL                     # Internal Qdrant URL
SMTP_HOST / SMTP_USER / SMTP_PASS  # ox.livemail.co.uk credentials
NEXTCLOUD_URL / NEXTCLOUD_USER / NEXTCLOUD_PASS  # files.irise.academy / bot_irise
```

### Rotation Policy (enforced by Mapondera)
- All tokens rotated every 90 days minimum
- Immediate rotation on any exposure detection
- Rotation events logged to `security_events` table in `morpheus_core`
- New credentials uploaded to Nextcloud `/iRise-Nation/Security/Credentials/` (encrypted)

---

## MAPONDERA AGENT — CONFIGURATION

### Identity
```
Agent: Mapondera
Type: Security & Infrastructure
Stack: /opt/stacks/morpheus/app/agents/mapondera.py
Skill access: ALL (security clearance level: root)
Spawning authority: Yes — can activate Ruflo swarm
Reports to: Morpheus (direct)
```

### Mapondera Scheduled Tasks
| Task | Schedule | Action |
|------|----------|--------|
| Secret scan | Every 6h | Scan repo + containers for exposed credentials |
| Health check | Every 5m | Ping all containers, report to morpheus_core |
| Log rotation | Daily 02:00 UTC | Archive logs, compact memory files |
| Vulnerability report | Weekly Sunday 08:00 UTC | Full audit → upload to Nextcloud |
| Credential rotation check | Monthly 1st | Flag any credentials older than 90 days |

### Mapondera Sub-Agent Spawning Rules
```
Trigger: Task requires multiple independent skills
Rule: One sub-agent = one skill
Max concurrent sub-agents: 10 (Ruflo managed)
Skill assignment: Mapondera assigns from /opt/stacks/morpheus/app/skills/registry.py
Result collection: Mapondera aggregates all sub-agent results before reporting to Morpheus
```

---

## RUFLO SWARM — CONFIGURATION

### Activation Criteria
- Minimum 3 simultaneous skills required
- OR single task estimated duration > 30 seconds
- OR security incident affecting 2+ systems simultaneously

### Swarm Architecture
```
Ruflo receives: Task manifest (list of {skill, payload} objects)
Ruflo spawns: N sub-agents (one per skill, simultaneously)
Ruflo monitors: Progress of each sub-agent
Ruflo collects: All results when complete (or timeout after 120s)
Ruflo reports: Consolidated result to activating agent (Mapondera/Trinity)
```

### Sub-Agent Template
```python
{
  "agent_id": "ruflo-sub-{uuid}",
  "skill": "{single_skill_name}",
  "payload": {...},
  "timeout": 60,
  "spawned_by": "ruflo",
  "task_id": "{parent_task_id}"
}
```

---

## TRINITY AGENT — CONFIGURATION

### Identity
```
Agent: Trinity
Type: Dispatcher & Outreach
Soul: /opt/stacks/morpheus/app/intelligence/trinity_soul.md
Stack: /opt/stacks/morpheus-gateway/gateway/trinity.py
Spawning authority: Yes — single-skill sub-agents only
Activates Ruflo: Yes — for batch outreach (50+ simultaneous)
Reports to: Morpheus
```

### Trinity Dispatch Rules
- Receives task batches from Morpheus
- Decomposes into atomic single-skill tasks
- Assigns each to a sub-agent
- For outreach batches (50–100 businesses): activates Ruflo swarm
- Tracks completion, reports failures back to Morpheus for retry

---

## VULNERABILITY REPORT TEMPLATE

When Mapondera generates a security report, it follows this structure:

```markdown
# VULNERABILITY REPORT
Date: {ISO timestamp}
Generated by: Mapondera
Severity: CRITICAL / HIGH / MEDIUM / LOW

## Incident Summary
{Brief description}

## Affected Systems
- {System 1}: {description}
- {System 2}: {description}

## Exposed Credentials
| Credential | Exposure Location | Status |
|------------|-------------------|--------|
| {type} | {location} | REVOKED / PENDING REVOCATION |

## Actions Taken
1. {Action 1}
2. {Action 2}

## Actions Required (Ambassador)
1. {Manual step 1}
2. {Manual step 2}

## Timeline
- {timestamp}: Detection
- {timestamp}: Mapondera notified
- {timestamp}: Auto-revocation attempted
- {timestamp}: Ambassador notified
- {timestamp}: Report uploaded to Nextcloud

## References
- Nextcloud path: /iRise-Nation/Security/Vulnerability-Reports/{date}-{id}.md
- DB record: morpheus_core.security_events id={id}
```

---

## LLM ROUTING TABLE

| Keyword Category | Examples | Model | Reason |
|-----------------|---------|-------|--------|
| Legal instruments | deed, affidavit, clause, solicitor | Dolphin | Uncensored analysis |
| Mortgage/finance | mortgage, LTV, DSR, conveyancing | Dolphin | Uncensored case work |
| Property analysis | ARV, rehab, ROI, wholesaling | Dolphin | Direct numbers, no hedging |
| Trust/estate | probate, beneficial, fiduciary | Dolphin | Legal precision required |
| Disputes/claims | tribunal, court, CCJ, eviction | Dolphin | Advocacy language |
| General | greetings, academy, pricing | Gemma | Standard conversation |
| Fallback | API unavailable | OVH Morpheus | Resilience |

---

## NEXTCLOUD INTEGRATION

| Purpose | Path | Access |
|---------|------|--------|
| Security reports | `/iRise-Nation/Security/Vulnerability-Reports/` | Mapondera (write), Anesu (read) |
| Credentials (encrypted) | `/iRise-Nation/Ambassador-Access/Anesu-Patrick/` | Anesu only |
| Deal packs | `/iRise-Nation/Property/Deal-Packs/` | Morpheus (write), Ambassadors (read) |
| Trust documents | `/iRise-Nation/Trust/Delivered/` | Morpheus (write), Client (read) |
| Agent reports | `/iRise-Nation/Agent-Logs/` | All agents (write), Anesu (read) |

Upload endpoint: `https://files.irise.academy/index.php/apps/openconnector/api`
Bot credentials: `bot_irise` (password in `/opt/stacks/morpheus/.env`)

---

## DOMAIN ROUTING (pending GoDaddy DNS update → 51.79.29.15)

| Domain | Destination | Status |
|--------|-------------|--------|
| morpheus.irise.academy | morpheus-system:9000 | DNS PENDING |
| files.irise.academy | nextcloud-app:80 | LIVE |
| chat.irise.academy | open-webui:8080 | DNS PENDING |
| admin.irise.academy | admin-ui:3000 | DNS PENDING |
| gemtheagency.com | GoHighLevel | DO NOT TOUCH |

---

*Managed by: Mapondera Agent*
*Authority: Ambassador Anesu Patrick*
*Last updated: May 2026*
