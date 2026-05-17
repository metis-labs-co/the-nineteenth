-- =====================================================
-- Relax shot_log RLS — drop round-status check
-- =====================================================
-- Previous policies (20260501100000_fix_shot_log_rls_status_value)
-- required rounds.status = 'in-progress' for INSERT/UPDATE/DELETE.
-- Players can edit shots from the View Round screen after a round
-- is completed, so the status gate blocked a supported flow with a
-- "row-level security policy" error at save time.
--
-- New policies restrict writes to the owning player only.
-- =====================================================

DROP POLICY IF EXISTS shot_log_insert ON shot_log;
DROP POLICY IF EXISTS shot_log_update ON shot_log;
DROP POLICY IF EXISTS shot_log_delete ON shot_log;

CREATE POLICY shot_log_insert ON shot_log FOR INSERT
WITH CHECK (auth.uid() = player_id);

CREATE POLICY shot_log_update ON shot_log FOR UPDATE
USING (auth.uid() = player_id)
WITH CHECK (auth.uid() = player_id);

CREATE POLICY shot_log_delete ON shot_log FOR DELETE
USING (auth.uid() = player_id);
