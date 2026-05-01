-- Client diagnostics table
--
-- Lightweight, append-only event log for diagnosing client-side issues that
-- can't be reproduced locally (TestFlight stuck states, cold-start race
-- conditions, network hangs, etc). The client fires events here when it
-- enters specific instrumented checkpoints.
--
-- Use:
--   SELECT created_at, event_name, level, payload
--   FROM client_diagnostics
--   WHERE user_id = '<user-uuid>'
--   ORDER BY created_at DESC
--   LIMIT 100;
--
-- This table is intentionally minimal and may be dropped or pruned once a
-- specific issue is resolved.

CREATE TABLE IF NOT EXISTS public.client_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Defaulted to auth.uid() so the client doesn't need to plumb the user id
  -- through to every call site. RLS still scopes inserts to the caller.
  user_id uuid DEFAULT auth.uid(),
  event_name text NOT NULL,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
  payload jsonb,
  app_build text,
  -- Client clock when the event happened (subject to device clock drift).
  client_timestamp timestamptz NOT NULL DEFAULT now(),
  -- Server clock when the row landed (authoritative).
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_diagnostics_user_created_idx
  ON public.client_diagnostics (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS client_diagnostics_event_idx
  ON public.client_diagnostics (event_name, created_at DESC);

ALTER TABLE public.client_diagnostics ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert events tagged with their own user_id (or
-- null, e.g. if auth.uid() resolution fails on insert path).
CREATE POLICY "Authenticated users can insert diagnostics"
  ON public.client_diagnostics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can read their own events. Service role / dashboard reads bypass RLS.
CREATE POLICY "Users can read own diagnostics"
  ON public.client_diagnostics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
