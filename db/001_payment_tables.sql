-- ============================================================
-- MORPHEUS PAYMENT INTELLIGENCE SYSTEM — MIGRATION 001
-- Run on: morpheus_core (OVH PostgreSQL)
-- Command: psql $POSTGRES_URL -f db/001_payment_tables.sql
-- ============================================================

-- ── INVOICES ─────────────────────────────────────────────────────────────────
-- Every payment is pre-traced before it arrives.
-- reference is the human-readable code on bank transfers.

CREATE TABLE IF NOT EXISTS invoices (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID,
  amount      NUMERIC(10,2) NOT NULL,
  currency    TEXT        NOT NULL DEFAULT 'GBP',
  reference   TEXT        UNIQUE NOT NULL,
  description TEXT,
  client_name TEXT,
  client_email TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','paid','cancelled','refunded','partial')),
  paid_at     TIMESTAMP,
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_reference ON invoices(reference);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_lead_id   ON invoices(lead_id);

-- ── TRANSACTIONS ─────────────────────────────────────────────────────────────
-- Raw inbound payments from all providers (Tide, Stripe, crypto).
-- id is the provider's own transaction ID — guarantees idempotency.

CREATE TABLE IF NOT EXISTS transactions (
  id          TEXT        PRIMARY KEY,
  provider    TEXT        NOT NULL DEFAULT 'tide'
                          CHECK (provider IN ('tide','stripe','crypto','manual')),
  amount      NUMERIC(10,2) NOT NULL,
  currency    TEXT        NOT NULL DEFAULT 'GBP',
  reference   TEXT,
  sender_name TEXT,
  sender_ref  TEXT,
  raw         JSONB,
  processed   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_processed ON transactions(processed);
CREATE INDEX IF NOT EXISTS idx_transactions_provider  ON transactions(provider);

-- ── PAYMENT MATCHES ───────────────────────────────────────────────────────────
-- Anti-replay + audit trail. One row per matched pair.
-- confidence: 100 = exact reference, 70–99 = fuzzy, <70 = rejected.

CREATE TABLE IF NOT EXISTS payment_matches (
  id             UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT      NOT NULL REFERENCES transactions(id),
  invoice_id     UUID      NOT NULL REFERENCES invoices(id),
  confidence     INT       NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  match_type     TEXT      NOT NULL DEFAULT 'reference'
                           CHECK (match_type IN ('reference','fuzzy','manual')),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(transaction_id)
);

-- ── REVENUE LEDGER ────────────────────────────────────────────────────────────
-- Immutable record of every confirmed revenue event.

CREATE TABLE IF NOT EXISTS revenue (
  id             UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        UUID,
  invoice_id     UUID      REFERENCES invoices(id),
  transaction_id TEXT      REFERENCES transactions(id),
  total_value    NUMERIC(10,2) NOT NULL,
  currency       TEXT      NOT NULL DEFAULT 'GBP',
  stream         TEXT      DEFAULT 'websites'
                           CHECK (stream IN ('websites','property','trust','academy','other')),
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── AFFILIATES ────────────────────────────────────────────────────────────────
-- Ledger-only for now. No payouts until manually authorised.

CREATE TABLE IF NOT EXISTS affiliates (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL,
  email      TEXT    UNIQUE NOT NULL,
  code       TEXT    UNIQUE NOT NULL,
  rate_pct   NUMERIC(5,2) DEFAULT 10.00,
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_earnings (
  id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID      NOT NULL REFERENCES affiliates(id),
  invoice_id   UUID      REFERENCES invoices(id),
  amount       NUMERIC(10,2) NOT NULL,
  status       TEXT      NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','approved','paid','rejected')),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── TRIGGER: auto-update updated_at on invoices ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
