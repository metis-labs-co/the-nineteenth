-- =====================================================
-- Round Display Order
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Adds an organizer-controlled `display_order` column to `rounds` so
-- the competition Rounds tab can be manually reordered via drag-and-drop.
--
-- This is intentionally separate from `round_number`. `round_number`
-- remains the stable identifier referenced by notifications, deep links,
-- and team-round labels. `display_order` is the UI sort key only.
-- =====================================================

-- -----------------------------------------------------
-- 1. Column + backfill
-- -----------------------------------------------------

ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN rounds.display_order IS
  'Organizer-controlled sort order on the competition Rounds tab. Lower values render first. Initialized from round_number; mutated via reorder_competition_rounds(). round_number remains the stable reference used elsewhere.';

-- Backfill existing rows so initial sort matches today's behavior.
-- Only rows still on the default value get touched; re-runs are no-ops.
UPDATE rounds
SET display_order = round_number
WHERE display_order = 0;

CREATE INDEX IF NOT EXISTS idx_rounds_competition_display_order
  ON rounds(competition_id, display_order);

-- -----------------------------------------------------
-- 2. Insert default trigger
-- -----------------------------------------------------
-- Lets this migration be deployed before the matching app release. Old
-- app code does not know about display_order, so its INSERTs land with
-- the column default (0). Without this trigger, those rounds would sort
-- above every backfilled round once the new client deploys. The trigger
-- mirrors the backfill rule (display_order = round_number) for any row
-- that arrives at the default; the new client always sets an explicit
-- value via reorder_competition_rounds() so its writes are untouched.

CREATE OR REPLACE FUNCTION set_round_display_order_default()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_order = 0 THEN
    NEW.display_order := NEW.round_number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_round_display_order_default ON rounds;
CREATE TRIGGER trg_set_round_display_order_default
  BEFORE INSERT ON rounds
  FOR EACH ROW
  EXECUTE FUNCTION set_round_display_order_default();

-- -----------------------------------------------------
-- 3. RPC: reorder_competition_rounds
-- -----------------------------------------------------
-- Atomically rewrites display_order for every round in a competition
-- based on the caller-supplied ordered array of round IDs. The first
-- ID in the array becomes display_order = 1, the second = 2, etc.
--
-- Authorization: caller must be the competition's organizer. The
-- function runs as the invoker so RLS still applies on the UPDATE.
-- We additionally guard with an explicit organizer check so the error
-- message is meaningful when permission is denied.

CREATE OR REPLACE FUNCTION reorder_competition_rounds(
  p_competition_id UUID,
  p_round_ids UUID[]
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_organizer_id UUID;
  v_idx INTEGER;
BEGIN
  IF p_round_ids IS NULL OR array_length(p_round_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'p_round_ids must be a non-empty array';
  END IF;

  SELECT organizer_id INTO v_organizer_id
  FROM competitions
  WHERE id = p_competition_id;

  IF v_organizer_id IS NULL THEN
    RAISE EXCEPTION 'Competition % not found', p_competition_id;
  END IF;

  IF v_organizer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the competition organizer can reorder rounds';
  END IF;

  -- Guard against IDs from a different competition sneaking in.
  IF EXISTS (
    SELECT 1
    FROM unnest(p_round_ids) AS rid
    WHERE NOT EXISTS (
      SELECT 1 FROM rounds
      WHERE id = rid
        AND competition_id = p_competition_id
    )
  ) THEN
    RAISE EXCEPTION 'One or more rounds do not belong to competition %', p_competition_id;
  END IF;

  FOR v_idx IN 1..array_length(p_round_ids, 1) LOOP
    UPDATE rounds
    SET display_order = v_idx,
        updated_at = NOW()
    WHERE id = p_round_ids[v_idx]
      AND competition_id = p_competition_id;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION reorder_competition_rounds(UUID, UUID[]) TO authenticated;

COMMENT ON FUNCTION reorder_competition_rounds(UUID, UUID[]) IS
  'Atomically rewrites rounds.display_order for a competition based on an ordered array of round IDs. Caller must be the competition organizer.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
