-- =====================================================
-- Under-13 Social Gating: schema, kill switch, write path
-- The Nineteenth
-- =====================================================
-- Deployed with enforce = FALSE, so this migration is a BEHAVIOURAL NO-OP.
-- social_enabled() returns TRUE for everyone until the switch is flipped.
--
-- This is deliberate. Enforcement lands with the migration but the age prompt
-- lands with the client build, so gating immediately would strip social
-- features from every existing user for the whole of App Review and staged
-- rollout - on a client that has no way to answer the age question.
--
-- Safe to re-run.
-- =====================================================

-- -----------------------------------------------------
-- 1. Age band on the player profile
-- -----------------------------------------------------
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS age_status      TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS age_source      TEXT,
  ADD COLUMN IF NOT EXISTS age_resolved_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'players_age_status_check'
  ) THEN
    ALTER TABLE players ADD CONSTRAINT players_age_status_check
      CHECK (age_status IN ('unknown', 'under13', 'eligible'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'players_age_source_check'
  ) THEN
    ALTER TABLE players ADD CONSTRAINT players_age_source_check
      CHECK (age_source IS NULL OR age_source IN ('declared_age_range', 'self_declared'));
  END IF;
END $$;

COMMENT ON COLUMN players.age_status IS
  'Derived age band. No date of birth is ever stored - only this band.';
COMMENT ON COLUMN players.age_source IS
  'How the band was obtained, for audit: declared_age_range | self_declared.';

-- Supports social_enabled()'s existence check on a hot read path.
CREATE INDEX IF NOT EXISTS idx_players_age_eligible
  ON players (id) WHERE age_status = 'eligible';

-- -----------------------------------------------------
-- 2. Enforcement kill switch
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS age_gate_config (
  id      INT PRIMARY KEY DEFAULT 1,
  enforce BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT age_gate_config_singleton CHECK (id = 1)
);

INSERT INTO age_gate_config (id, enforce)
VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE age_gate_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS age_gate_config_select ON age_gate_config;
CREATE POLICY age_gate_config_select ON age_gate_config FOR SELECT
  TO authenticated USING (TRUE);

COMMENT ON TABLE age_gate_config IS
  'Single-row enforcement switch for the under-13 gate. Flip enforce to TRUE only
   after the gated client build has meaningful adoption. Reversible instantly.';

-- -----------------------------------------------------
-- 3. The gate
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION social_enabled(p_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    NOT COALESCE((SELECT enforce FROM age_gate_config WHERE id = 1), FALSE)
    OR EXISTS (
      SELECT 1 FROM players WHERE id = p_user AND age_status = 'eligible'
    );
$$;

COMMENT ON FUNCTION social_enabled IS
  'True when the user may use social features. Returns TRUE for everyone while
   age_gate_config.enforce is FALSE.
   NEVER call this from can_view_round() - that helper is shared with round
   visibility logic and gating it there breaks scorecard access for everyone.';

-- -----------------------------------------------------
-- 4. Guarded write path
-- -----------------------------------------------------
-- All age_status writes funnel through this RPC, giving every transition a
-- single auditable entry point.
--
-- This is NOT an anti-spoofing measure: the band is computed on the client, so
-- a determined user can still assert 'eligible'. That is accepted - Apple
-- requires that the check is performed, not that it is unforgeable, and age
-- verification is an explicit non-goal (spec section 3). What the trigger below
-- does buy is that the ordinary profile-update path cannot clobber the flag.
CREATE OR REPLACE FUNCTION set_age_status(p_status TEXT, p_source TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_status NOT IN ('unknown', 'under13', 'eligible') THEN
    RAISE EXCEPTION 'Invalid age status: %', p_status USING ERRCODE = '22023';
  END IF;

  IF p_source NOT IN ('declared_age_range', 'self_declared') THEN
    RAISE EXCEPTION 'Invalid age source: %', p_source USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.age_status_write', 'on', TRUE);

  UPDATE players
     SET age_status      = p_status,
         age_source      = p_source,
         age_resolved_at = NOW()
   WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION players_guard_age_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.age_status IS DISTINCT FROM OLD.age_status
     AND COALESCE(current_setting('app.age_status_write', TRUE), '') <> 'on' THEN
    RAISE EXCEPTION 'age_status may only be changed via set_age_status()'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS players_guard_age_status_before_update ON players;
CREATE TRIGGER players_guard_age_status_before_update
  BEFORE UPDATE OF age_status ON players
  FOR EACH ROW
  EXECUTE FUNCTION players_guard_age_status();

GRANT EXECUTE ON FUNCTION set_age_status(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION social_enabled(UUID) TO authenticated;
