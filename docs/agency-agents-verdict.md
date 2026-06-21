# agency-agents Integration Verdict

**Repo:** https://github.com/msitarzewski/agency-agents  
**Assessed:** 2026-05-05  
**Decision: DO NOT INTEGRATE**

---

## What agency-agents is

A library of 144+ `.md` prompt files with YAML frontmatter — persona definitions for local IDE AI assistants (Claude Code, Cursor, Copilot). No runnable code, no API, no Dockerfile.

Install scripts copy `.md` files into `~/.claude/agents/` or `.cursor/rules/`. That's the entire deployment model.

---

## Why it doesn't fit the Morpheus OVH stack

**Wrong abstraction layer.** agency-agents are client-side IDE personas. The Morpheus stack runs autonomous agents as independent services on OVH (Trinity, Mapondera, Kappa, Sigma, Lambda, Delta, Omega, Sentinel etc.). A `.md` persona file does nothing for a service communicating over HTTP/Redis/task queues.

**No stack integration.** Trinity (orchestrator) doesn't read `.md` files. The Docker Compose setup has no mechanism to invoke persona definitions. Zero hooks for Meta Graph API, lead capture, CRM connectors, or any of the verticals Morpheus operates.

**Doesn't accelerate build.** Sigma, Lambda, Delta engines still need to be built from scratch — FastAPI services, soul files, task routing. agency-agents contributes zero lines toward that.

---

## What it could offer (marginal)

If building Sigma's soul file for ODF sales automation, agency-agents' sales/support persona files could be read once for structural phrasing patterns and objection-routing logic — then discarded. Not worth cloning the repo for.

---

## What to build instead

For the OVH stack's actual needs (ODF sales + Meta lead gen):

1. Meta webhook listener (Sigma/Lambda) → captures leads from Meta conversions pixel
2. Lead enrichment (Kappa RAG / Delta) → CRM / property database context pull
3. Qualification engine (Sentinel) → routes to human or deal automation
4. Deal progression (Omega) → documents, soul-templated comms, deadline tracking

40 hours to a working Sigma + Meta pipeline is the real target.

---

**Final call: Do not clone agency-agents into Morpheus.**
