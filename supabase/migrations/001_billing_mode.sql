-- Migration: Dual billing mode support
-- Run this in your Supabase SQL editor or via the Supabase CLI.

-- 1. Add billing_mode to sessions
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS billing_mode TEXT NOT NULL DEFAULT 'time'
    CHECK (billing_mode IN ('time', 'consumption'));

-- 2. Create session_consumptions table (used for consumption billing mode)
CREATE TABLE IF NOT EXISTS session_consumptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL,
  product_name  TEXT NOT NULL,
  quantity      INT  NOT NULL CHECK (quantity > 0),
  unit_price    NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_consumptions_session_id
  ON session_consumptions(session_id);

-- 3. Add billing_mode and breakdown to balance_transactions
ALTER TABLE balance_transactions
  ADD COLUMN IF NOT EXISTS billing_mode TEXT
    CHECK (billing_mode IN ('time', 'consumption'));

ALTER TABLE balance_transactions
  ADD COLUMN IF NOT EXISTS breakdown JSONB;

-- 4. Enable RLS on new table (add your policies after confirming venue_id strategy)
ALTER TABLE session_consumptions ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (adjust to match your auth setup):
-- CREATE POLICY "cafe_owner_access" ON session_consumptions
--   USING (
--     session_id IN (
--       SELECT id FROM sessions WHERE cafe_id IN (
--         SELECT id FROM cafes WHERE owner_id = auth.uid()
--       )
--     )
--   );
