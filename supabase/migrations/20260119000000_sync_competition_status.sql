-- =====================================================
-- Migration: Sync Competition Status with Round Status
-- =====================================================
-- Automatically updates competition status when round
-- status changes:
-- - Competition → 'in-progress' when first round starts
-- - Competition → 'completed' when all rounds complete
--
-- This ensures competition status stays in sync with
-- the actual state of its rounds.
-- =====================================================

-- ============================================================================
-- TRIGGER FUNCTION: sync_competition_status_on_round_change
-- ============================================================================
-- Called when a round's status changes. Updates the parent competition's
-- status based on the aggregate state of all its rounds.

CREATE OR REPLACE FUNCTION sync_competition_status_on_round_change()
RETURNS TRIGGER AS $$
DECLARE
  v_competition_id UUID;
  v_current_comp_status TEXT;
  v_total_rounds INT;
  v_completed_rounds INT;
  v_in_progress_rounds INT;
BEGIN
  -- Get competition ID (handle both INSERT and UPDATE)
  v_competition_id := COALESCE(NEW.competition_id, OLD.competition_id);

  -- Skip if no competition (standalone round)
  IF v_competition_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get current competition status
  SELECT status INTO v_current_comp_status
  FROM competitions
  WHERE id = v_competition_id;

  -- Skip if competition is cancelled (don't auto-change cancelled competitions)
  IF v_current_comp_status = 'cancelled' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Count rounds by status
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'in-progress')
  INTO v_total_rounds, v_completed_rounds, v_in_progress_rounds
  FROM rounds
  WHERE competition_id = v_competition_id;

  -- Determine and update competition status
  IF v_total_rounds > 0 THEN
    IF v_completed_rounds = v_total_rounds THEN
      -- All rounds completed → competition completed
      IF v_current_comp_status != 'completed' THEN
        UPDATE competitions
        SET status = 'completed', updated_at = NOW()
        WHERE id = v_competition_id;

        RAISE NOTICE 'Competition % marked as completed (all % rounds completed)',
          v_competition_id, v_total_rounds;
      END IF;
    ELSIF v_in_progress_rounds > 0 OR v_completed_rounds > 0 THEN
      -- At least one round started or completed → competition in-progress
      IF v_current_comp_status = 'upcoming' THEN
        UPDATE competitions
        SET status = 'in-progress', updated_at = NOW()
        WHERE id = v_competition_id;

        RAISE NOTICE 'Competition % marked as in-progress (round started)',
          v_competition_id;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_competition_status_on_round_change IS
  'Automatically syncs competition status when round status changes';

-- ============================================================================
-- TRIGGER: Sync competition status on round status UPDATE
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_sync_competition_status_on_round_update ON rounds;

CREATE TRIGGER trigger_sync_competition_status_on_round_update
  AFTER UPDATE OF status ON rounds
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_competition_status_on_round_change();

COMMENT ON TRIGGER trigger_sync_competition_status_on_round_update ON rounds IS
  'Syncs competition status when a round status changes';

-- ============================================================================
-- TRIGGER: Sync competition status on round INSERT
-- ============================================================================
-- Handle case where a round is inserted with a non-upcoming status
-- (e.g., importing historical data)

DROP TRIGGER IF EXISTS trigger_sync_competition_status_on_round_insert ON rounds;

CREATE TRIGGER trigger_sync_competition_status_on_round_insert
  AFTER INSERT ON rounds
  FOR EACH ROW
  WHEN (NEW.status != 'upcoming' AND NEW.competition_id IS NOT NULL)
  EXECUTE FUNCTION sync_competition_status_on_round_change();

COMMENT ON TRIGGER trigger_sync_competition_status_on_round_insert ON rounds IS
  'Syncs competition status when a round is inserted with non-upcoming status';

-- ============================================================================
-- TRIGGER: Sync competition status on round DELETE
-- ============================================================================
-- Handle case where a round is deleted - recheck if all remaining rounds
-- are completed

DROP TRIGGER IF EXISTS trigger_sync_competition_status_on_round_delete ON rounds;

CREATE TRIGGER trigger_sync_competition_status_on_round_delete
  AFTER DELETE ON rounds
  FOR EACH ROW
  WHEN (OLD.competition_id IS NOT NULL)
  EXECUTE FUNCTION sync_competition_status_on_round_change();

COMMENT ON TRIGGER trigger_sync_competition_status_on_round_delete ON rounds IS
  'Syncs competition status when a round is deleted';

-- ============================================================================
-- HELPER FUNCTION: Backfill competition statuses
-- ============================================================================
-- One-time function to fix existing competitions with mismatched status.
-- Run this once after deploying the migration.

CREATE OR REPLACE FUNCTION backfill_competition_statuses()
RETURNS TABLE(
  competition_id UUID,
  old_status TEXT,
  new_status TEXT
) AS $$
DECLARE
  v_comp RECORD;
  v_total_rounds INT;
  v_completed_rounds INT;
  v_in_progress_rounds INT;
  v_new_status TEXT;
BEGIN
  FOR v_comp IN
    SELECT c.id, c.status
    FROM competitions c
    WHERE c.status NOT IN ('cancelled', 'completed')
  LOOP
    -- Count rounds by status
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE r.status = 'completed'),
      COUNT(*) FILTER (WHERE r.status = 'in-progress')
    INTO v_total_rounds, v_completed_rounds, v_in_progress_rounds
    FROM rounds r
    WHERE r.competition_id = v_comp.id;

    -- Determine correct status
    IF v_total_rounds > 0 THEN
      IF v_completed_rounds = v_total_rounds THEN
        v_new_status := 'completed';
      ELSIF v_in_progress_rounds > 0 OR v_completed_rounds > 0 THEN
        v_new_status := 'in-progress';
      ELSE
        v_new_status := 'upcoming';
      END IF;

      -- Update if different
      IF v_new_status != v_comp.status THEN
        UPDATE competitions
        SET status = v_new_status, updated_at = NOW()
        WHERE id = v_comp.id;

        competition_id := v_comp.id;
        old_status := v_comp.status;
        new_status := v_new_status;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION backfill_competition_statuses IS
  'One-time function to fix existing competitions with mismatched status';

-- ============================================================================
-- RUN BACKFILL
-- ============================================================================
-- Automatically fix any existing mismatched competition statuses

DO $$
DECLARE
  v_result RECORD;
  v_count INT := 0;
BEGIN
  FOR v_result IN SELECT * FROM backfill_competition_statuses()
  LOOP
    RAISE NOTICE 'Updated competition %: % → %',
      v_result.competition_id, v_result.old_status, v_result.new_status;
    v_count := v_count + 1;
  END LOOP;

  IF v_count > 0 THEN
    RAISE NOTICE 'Backfill complete: % competitions updated', v_count;
  ELSE
    RAISE NOTICE 'Backfill complete: no competitions needed updating';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
