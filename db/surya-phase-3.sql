-- =====================================================================
-- Surya Cine Special Props — Phase 3
-- (Crew deployment on dispatch, separate daily-labour invoice,
--  client-issued / production-approved settlement closing amounts)
--
-- HOW TO RUN: open your Supabase project → SQL Editor → New query →
-- paste this whole file → Run. It is safe to run more than once.
-- =====================================================================

ALTER TABLE public.quote_requests
  -- Field-operations workers deployed with these props (array of
  -- { staff_id, staff_code, staff_name, phone }).
  ADD COLUMN IF NOT EXISTS crew_assignments      JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Day-wise labour charge sheet (array of
  -- { date, workers, rate, amount, note }).
  ADD COLUMN IF NOT EXISTS labour_days           JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS labour_total          NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Amount the client finally agreed to pay on the labour invoice.
  ADD COLUMN IF NOT EXISTS labour_settled_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labour_status         TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'closed'
  ADD COLUMN IF NOT EXISTS labour_cleared_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS labour_invoice_no     TEXT,
  -- Amount the client finally agreed to pay on the props settlement invoice.
  ADD COLUMN IF NOT EXISTS settled_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS settlement_waived     NUMERIC(12,2) NOT NULL DEFAULT 0;

GRANT ALL ON public.quote_requests TO service_role;
GRANT ALL ON public.staff_accounts TO service_role;

-- Ask the REST schema layer to refresh immediately after this migration.
NOTIFY pgrst, 'reload schema';
