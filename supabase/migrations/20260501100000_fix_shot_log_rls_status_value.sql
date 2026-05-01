-- =====================================================
-- FIX shot_log RLS — round status enum value
-- The original Phase C2 policies checked r.status = 'in_progress'
-- but the rounds.status enum uses 'in-progress' (hyphen, not
-- underscore). Every INSERT/UPDATE/DELETE was being rejected with
-- "new row violates row-level security policy".
-- =====================================================

DROP POLICY IF EXISTS shot_log_insert ON shot_log;
DROP POLICY IF EXISTS shot_log_update ON shot_log;
DROP POLICY IF EXISTS shot_log_delete ON shot_log;

CREATE POLICY shot_log_insert ON shot_log FOR INSERT
WITH CHECK (
  auth.uid() = player_id
  AND EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.id = shot_log.round_id AND r.status = 'in-progress'
  )
);

CREATE POLICY shot_log_update ON shot_log FOR UPDATE
USING (auth.uid() = player_id)
WITH CHECK (
  auth.uid() = player_id
  AND EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.id = shot_log.round_id AND r.status = 'in-progress'
  )
);

CREATE POLICY shot_log_delete ON shot_log FOR DELETE
USING (
  auth.uid() = player_id
  AND EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.id = shot_log.round_id AND r.status = 'in-progress'
  )
);
