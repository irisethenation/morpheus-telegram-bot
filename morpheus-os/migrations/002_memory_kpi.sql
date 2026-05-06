-- Morpheus OS — Migration 002: Pipeline, Memory, KPIs

-- ─────────────────────────────────────────────
-- PIPELINE — full lead lifecycle state machine
-- ─────────────────────────────────────────────
CREATE TYPE pipeline_stage AS ENUM (
  'new',
  'outreach_sent',
  'replied',
  'call_booked',
  'call_done',
  'closed',
  'invoiced',
  'follow_up',
  'upsold',
  'dead'
);

CREATE TABLE IF NOT EXISTS pipeline_entries (
  id               SERIAL PRIMARY KEY,
  lead_id          INTEGER REFERENCES leads (id) ON DELETE CASCADE,
  engine           VARCHAR(64) NOT NULL,          -- agency | property | academy | grant
  stage            pipeline_stage NOT NULL DEFAULT 'new',
  outreach_count   INTEGER NOT NULL DEFAULT 0,
  last_outreach_at TIMESTAMPTZ,
  reply_received   BOOLEAN NOT NULL DEFAULT FALSE,
  call_booked_at   TIMESTAMPTZ,
  call_done_at     TIMESTAMPTZ,
  closed_at        TIMESTAMPTZ,
  deal_value_gbp   NUMERIC(12,2),
  invoice_id       VARCHAR(256),                  -- Stripe invoice ID
  follow_up_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  upsell_offered   BOOLEAN NOT NULL DEFAULT FALSE,
  notes            TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_lead_id   ON pipeline_entries (lead_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_engine     ON pipeline_entries (engine);
CREATE INDEX IF NOT EXISTS idx_pipeline_stage      ON pipeline_entries (stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_updated_at ON pipeline_entries (updated_at DESC);

-- Outreach event log (calls, SMS, emails per pipeline entry)
CREATE TABLE IF NOT EXISTS outreach_events (
  id              SERIAL PRIMARY KEY,
  pipeline_id     INTEGER REFERENCES pipeline_entries (id) ON DELETE CASCADE,
  lead_id         INTEGER REFERENCES leads (id) ON DELETE CASCADE,
  channel         VARCHAR(32) NOT NULL,           -- sms | voice | vapi | email
  direction       VARCHAR(16) NOT NULL DEFAULT 'outbound',
  status          VARCHAR(32) NOT NULL DEFAULT 'sent',
  external_id     VARCHAR(256),                   -- Twilio SID / VAPI call ID
  script_asset_id INTEGER,                        -- FK to winning_assets
  duration_s      INTEGER,
  outcome         VARCHAR(64),                    -- answered | voicemail | no_answer | booked | rejected
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_pipeline_id ON outreach_events (pipeline_id);
CREATE INDEX IF NOT EXISTS idx_outreach_lead_id      ON outreach_events (lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_channel       ON outreach_events (channel);
CREATE INDEX IF NOT EXISTS idx_outreach_created_at    ON outreach_events (created_at DESC);

-- ─────────────────────────────────────────────
-- MEMORY — winning assets + SOPs
-- ─────────────────────────────────────────────
CREATE TYPE asset_type AS ENUM (
  'script',
  'offer',
  'email_template',
  'sms_template',
  'sop',
  'improvement',
  'skill'
);

CREATE TABLE IF NOT EXISTS winning_assets (
  id            SERIAL PRIMARY KEY,
  type          asset_type NOT NULL,
  name          VARCHAR(256) NOT NULL,
  engine        VARCHAR(64),                      -- null = global
  context       VARCHAR(256),                     -- e.g. 'cold_outreach', 'follow_up'
  content       TEXT NOT NULL,
  success_rate  NUMERIC(5,4) NOT NULL DEFAULT 0,  -- 0.0000 to 1.0000
  uses          INTEGER NOT NULL DEFAULT 0,
  wins          INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_type        ON winning_assets (type);
CREATE INDEX IF NOT EXISTS idx_assets_engine      ON winning_assets (engine);
CREATE INDEX IF NOT EXISTS idx_assets_context     ON winning_assets (context);
CREATE INDEX IF NOT EXISTS idx_assets_success     ON winning_assets (success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_assets_active      ON winning_assets (active);

CREATE TABLE IF NOT EXISTS sop_procedures (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(256) NOT NULL UNIQUE,
  engine      VARCHAR(64),
  version     INTEGER NOT NULL DEFAULT 1,
  steps       JSONB NOT NULL DEFAULT '[]',        -- [{step, action, agent, condition}]
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- KPIs — daily snapshots per engine
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id              SERIAL PRIMARY KEY,
  engine          VARCHAR(64) NOT NULL,
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  metrics         JSONB NOT NULL DEFAULT '{}',    -- flexible per-engine KPIs
  targets         JSONB NOT NULL DEFAULT '{}',
  corrections     JSONB NOT NULL DEFAULT '[]',    -- auto-corrections applied
  score           NUMERIC(5,2),                   -- 0-100 performance score
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (engine, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_kpi_engine        ON kpi_snapshots (engine);
CREATE INDEX IF NOT EXISTS idx_kpi_date          ON kpi_snapshots (snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_score         ON kpi_snapshots (score);

-- Engine run log
CREATE TABLE IF NOT EXISTS engine_runs (
  id            SERIAL PRIMARY KEY,
  engine        VARCHAR(64) NOT NULL,
  run_type      VARCHAR(32) NOT NULL DEFAULT 'scheduled', -- scheduled | manual | triggered
  status        VARCHAR(32) NOT NULL DEFAULT 'running',
  tasks_created INTEGER NOT NULL DEFAULT 0,
  corrections   JSONB NOT NULL DEFAULT '[]',
  error         TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_engine_runs_engine ON engine_runs (engine);
CREATE INDEX IF NOT EXISTS idx_engine_runs_date   ON engine_runs (started_at DESC);

-- Morpheus improvement suggestions (from learning loop)
CREATE TABLE IF NOT EXISTS morpheus_suggestions (
  id          SERIAL PRIMARY KEY,
  category    VARCHAR(64) NOT NULL,               -- 'skill' | 'workflow' | 'script' | 'outreach'
  engine      VARCHAR(64),
  title       VARCHAR(256) NOT NULL,
  description TEXT NOT NULL,
  priority    VARCHAR(16) NOT NULL DEFAULT 'medium',
  status      VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending | accepted | rejected | implemented
  evidence    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_suggestions_status ON morpheus_suggestions (status);
