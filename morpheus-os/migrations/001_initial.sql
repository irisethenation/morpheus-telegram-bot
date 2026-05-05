-- Morpheus OS — Initial Schema
-- PostgreSQL 16

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Leads (Ambassadors)
CREATE TABLE IF NOT EXISTS leads (
  id               SERIAL PRIMARY KEY,
  telegram_user_id BIGINT UNIQUE NOT NULL,
  first_name       VARCHAR(128),
  last_name        VARCHAR(128),
  chat_id          BIGINT,
  source           VARCHAR(64) NOT NULL DEFAULT 'telegram',
  status           VARCHAR(64) NOT NULL DEFAULT 'new',
  intake_stage     INTEGER DEFAULT 0,
  intake_data      JSONB NOT NULL DEFAULT '{}',
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status        ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at    ON leads (created_at DESC);

-- Agent Tasks
CREATE TABLE IF NOT EXISTS agent_tasks (
  id             SERIAL PRIMARY KEY,
  task_uuid      UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
  agent_name     VARCHAR(64) NOT NULL,
  task_type      VARCHAR(128) NOT NULL,
  dispatched_by  VARCHAR(128),
  lead_id        INTEGER REFERENCES leads (id) ON DELETE SET NULL,
  chat_id        BIGINT,
  user_id        BIGINT,
  payload        JSONB NOT NULL DEFAULT '{}',
  result         JSONB,
  error          TEXT,
  status         VARCHAR(32) NOT NULL DEFAULT 'queued',
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_lead_id    ON agent_tasks (lead_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_name ON agent_tasks (agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status     ON agent_tasks (status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_at ON agent_tasks (created_at DESC);

-- Agent Events (audit log)
CREATE TABLE IF NOT EXISTS agent_events (
  id          SERIAL PRIMARY KEY,
  type        VARCHAR(128) NOT NULL,
  agent_name  VARCHAR(64) NOT NULL,
  lead_id     INTEGER REFERENCES leads (id) ON DELETE SET NULL,
  chat_id     BIGINT,
  payload     JSONB NOT NULL DEFAULT '{}',
  status      VARCHAR(32) NOT NULL DEFAULT 'ok',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_agent_name ON agent_events (agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_events_lead_id    ON agent_events (lead_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_created_at ON agent_events (created_at DESC);

-- Revenue Events
CREATE TABLE IF NOT EXISTS revenue_events (
  id                SERIAL PRIMARY KEY,
  lead_id           INTEGER REFERENCES leads (id) ON DELETE SET NULL,
  product_key       VARCHAR(128) NOT NULL,
  product_name      VARCHAR(256) NOT NULL,
  amount_gbp        NUMERIC(10, 2) NOT NULL,
  currency          VARCHAR(8) NOT NULL DEFAULT 'GBP',
  payment_method    VARCHAR(64),
  stripe_payment_id VARCHAR(256),
  status            VARCHAR(32) NOT NULL DEFAULT 'pending',
  confirmed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revenue_lead_id    ON revenue_events (lead_id);
CREATE INDEX IF NOT EXISTS idx_revenue_status     ON revenue_events (status);
CREATE INDEX IF NOT EXISTS idx_revenue_created_at ON revenue_events (created_at DESC);
