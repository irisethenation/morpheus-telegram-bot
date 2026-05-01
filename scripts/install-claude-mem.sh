#!/usr/bin/env bash
# claude-mem install & configuration for Morpheus / iRise Nation Claude Code sessions
set -euo pipefail

echo "=== claude-mem install sequence for Morpheus Claude Code ==="

# 1. Check prerequisites
echo "[1/6] Checking prerequisites..."
node --version >/dev/null 2>&1 || { echo "ERROR: Node.js >= 18 required"; exit 1; }
echo "  Node: $(node --version)"

# Check Bun (auto-installed by claude-mem if missing)
if command -v bun >/dev/null 2>&1; then
  echo "  Bun: $(bun --version)"
else
  echo "  Bun: not found — claude-mem will install it"
fi

# 2. Install claude-mem plugin for Claude Code
echo "[2/6] Installing claude-mem..."
npx claude-mem install --ide claude-code

# 3. Verify worker is running
echo "[3/6] Verifying worker..."
WORKER_PORT=37700
sleep 3
if curl -sf "http://localhost:${WORKER_PORT}/api/status" >/dev/null 2>&1; then
  echo "  Worker running at http://localhost:${WORKER_PORT}"
else
  echo "  Worker not yet ready — starting manually..."
  npx claude-mem start
  sleep 5
  curl -sf "http://localhost:${WORKER_PORT}/api/status" >/dev/null 2>&1 \
    && echo "  Worker started." \
    || echo "  WARNING: Worker did not respond. Run: npx claude-mem status"
fi

# 4. Write ~/.claude-mem/settings.json
echo "[4/6] Writing claude-mem settings..."
SETTINGS_DIR="$HOME/.claude-mem"
mkdir -p "$SETTINGS_DIR"
cat > "$SETTINGS_DIR/settings.json" <<'SETTINGS'
{
  "CLAUDE_MEM_MODE": "code",
  "workerPort": 37700,
  "logLevel": "info",
  "contextInjection": {
    "enabled": true,
    "maxTokens": 4000,
    "layers": ["summary", "observations"]
  },
  "dataDir": "~/.claude-mem/data",
  "projectFilter": true
}
SETTINGS
echo "  Settings written to $SETTINGS_DIR/settings.json"

# 5. Write global .claude-mem-ignore
echo "[5/6] Writing .claude-mem-ignore..."
cat > "$HOME/.claude-mem-ignore" <<'IGNORE'
*.env
.env.*
*credentials*
*api_key*
*secret*
*token*
*password*
*.pem
*.key
IGNORE
echo "  Ignore rules written to $HOME/.claude-mem-ignore"

# 6. Confirm
echo "[6/6] Done."
echo ""
echo "=== NEXT STEPS ==="
echo "1. Restart Claude Code to activate all lifecycle hooks."
echo "2. Open a session in this project — memory injection starts automatically."
echo "3. View memory stream: http://localhost:37700"
echo "4. Search past work: /mem-search <query> inside Claude Code"
echo ""
echo "ARCHITECTURE GROUND TRUTH to seed on first session:"
cat <<'ARCH'

Paste this as your opening prompt to anchor Morpheus canonical architecture:

---
ARCHITECTURE GROUND TRUTH — load and retain:

Canonical server: OVHCloud 51.79.29.15 (Ubuntu) — NOT GCP/34.13.32.211 (obsolete)
Local execution: Hermes (Desktop PC) — replaced Minimax node
Architect: Claude Code / MacBook
Orchestrator: Morpheus / OVH

Execution hierarchy:
1. Hermes/PC = local node + shared bus
2. Claude Code/MacBook = architect
3. Morpheus/OVH = orchestrator

MORPHEUS is sovereign super agent. All sub-agents (Trinity, Kappa, Phoenix,
Sentinel, Creator, Outreach, Steward) report TO Morpheus — not as peers.

Key paths: /opt/stacks/morpheus/ and /opt/agent-sandbox/
Agent routing: OpenRouter — Gemma 4, GLM-5, Qwen models
Ground Truth Drive ID: 1WvSrYsF3KbmYyUN2CZClPM732fY_qKZ8

Active P0 blockers:
- SMTP_PASS missing in agent-sandbox .env
- Nextcloud admin password requires change
- Whisper transcription pipeline needs SSH trigger
---
ARCH

echo "=== claude-mem install complete ==="
