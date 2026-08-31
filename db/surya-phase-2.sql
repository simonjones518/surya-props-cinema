-- =====================================================================
-- Surya Cine Special Props — Phase 2 schema
-- (Staff & Field-Operations roles, dispatch logs, damage reports,
--  expense ledger, worker deployment fee, production-approved settlement)
--
-- HOW TO RUN: open your Supabase project → SQL Editor → New query →
-- paste this whole file → Run. It is safe to run more than once.
-- =====================================================================

-- 1. Staff / worker accounts (created by the manager inside the Admin ERP).
CREATE TABLE IF NOT EXISTS public.staff_accounts (
  id             BIGSERIAL PRIMARY KEY,
  staff_code     TEXT NOT NULL UNIQUE,
  full_name      TEXT NOT NULL,
  phone          TEXT NOT NULL DEFAULT '',
  staff_role     TEXT NOT NULL DEFAULT 'field',       -- 'inventory' | 'field'
  username       TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Dispatch / return field logs.
CREATE TABLE IF NOT EXISTS public.dispatch_logs (
  id             BIGSERIAL PRIMARY KEY,
  quote_id       BIGINT,
  quote_code     TEXT NOT NULL DEFAULT '',
  kind           TEXT NOT NULL DEFAULT 'dispatch',    -- 'dispatch' | 'return'
  vehicle_number TEXT NOT NULL DEFAULT '',
  photo_path     TEXT,
  notes          TEXT,
  staff_id       BIGINT,
  staff_name     TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. On-set damage / incident reports.
CREATE TABLE IF NOT EXISTS public.damage_reports (
  id             BIGSERIAL PRIMARY KEY,
  quote_id       BIGINT,
  quote_code     TEXT NOT NULL DEFAULT '',
  prop_id        BIGINT,
  prop_name      TEXT NOT NULL DEFAULT '',
  severity       TEXT NOT NULL DEFAULT 'minor',       -- 'minor' | 'major' | 'lost'
  description    TEXT NOT NULL DEFAULT '',
  photo_path     TEXT,
  staff_id       BIGINT,
  staff_name     TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'open',        -- 'open' | 'resolved'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Expense ledger (maintenance / transport / labour / admin / other).
CREATE TABLE IF NOT EXISTS public.expense_ledger (
  id             BIGSERIAL PRIMARY KEY,
  category       TEXT NOT NULL DEFAULT 'other',
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  description    TEXT NOT NULL DEFAULT '',
  spent_on       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Dual-ledger invoicing + worker deployment on the rental lifecycle.
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS worker_deployment_fee      NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS production_approved_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS assigned_staff_id          BIGINT,
  ADD COLUMN IF NOT EXISTS assigned_staff_name        TEXT;

-- 6. Asset capitalisation for warehouse valuation KPIs.
ALTER TABLE public.props
  ADD COLUMN IF NOT EXISTS acquisition_cost NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 7. These tables are reached only through the app's server layer with the
--    service role, so no anon/authenticated access is granted.
ALTER TABLE public.staff_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_ledger  ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.staff_accounts  TO service_role;
GRANT ALL ON public.dispatch_logs   TO service_role;
GRANT ALL ON public.damage_reports  TO service_role;
GRANT ALL ON public.expense_ledger  TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
