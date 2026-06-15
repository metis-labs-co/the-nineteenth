-- =====================================================
-- "Also commented" notifications - verification script
-- =====================================================
-- Run AFTER applying:
--   20260615000000_round_also_commented_notifications.sql
--
-- Part 1 (catalog checks) is safe to run anywhere — metadata only.
-- Part 2 (functional checks) is a commented template: fill in real ids on a
-- test/staging DB and run inside a transaction you ROLLBACK.
-- =====================================================

-- -----------------------------------------------------
-- PART 1: object existence (expect every row to say 'OK')
-- -----------------------------------------------------

SELECT 'notif_type_added' AS check,
  CASE WHEN pg_get_constraintdef(oid) LIKE '%round_also_commented%'
       THEN 'OK' ELSE 'CONSTRAINT MISSING round_also_commented' END AS result
FROM pg_constraint WHERE conname = 'notifications_type_check';

SELECT 'notif_type_preserved' AS check,
  CASE WHEN pg_get_constraintdef(oid) LIKE '%social_round_response%'
        AND pg_get_constraintdef(oid) LIKE '%round_commented%'
        AND pg_get_constraintdef(oid) LIKE '%round_liked%'
       THEN 'OK' ELSE 'CONSTRAINT DROPPED EXISTING TYPES' END AS result
FROM pg_constraint WHERE conname = 'notifications_type_check';

SELECT 'function_exists' AS check,
  CASE WHEN COUNT(*) = 1 THEN 'OK' ELSE 'MISSING' END AS result
FROM pg_proc WHERE proname = 'notify_round_commented';

SELECT 'trigger_bound' AS check,
  CASE WHEN COUNT(*) = 1 THEN 'OK' ELSE 'MISSING' END AS result
FROM pg_trigger WHERE tgname = 'trigger_notify_round_commented';

-- -----------------------------------------------------
-- PART 2: functional checks (TEMPLATE — fill in ids, run in a tx)
-- -----------------------------------------------------
-- Setup: one round with three players where
--   :owner    owns/participates in the round
--   :prior    has commented on the round earlier and is NOT a participant
--   :actor    posts a new comment; friend of :owner but not a participant-link to :prior
--
-- BEGIN;
--   -- :prior leaves an earlier comment (no friendship needed for also-commented).
--   INSERT INTO round_comments (round_id, author_id, body)
--     VALUES ('<ROUND_UUID>', '<PRIOR_UUID>', 'nice round');
--
--   -- :actor posts the triggering comment.
--   INSERT INTO round_comments (round_id, author_id, body)
--     VALUES ('<ROUND_UUID>', '<ACTOR_UUID>', 'thanks!');
--
--   -- Expect: :owner (participant-friend of actor) got 'round_commented';
--   --         :prior got 'round_also_commented'; :actor got nothing.
--   SELECT user_id, type FROM notifications
--   WHERE round_id = '<ROUND_UUID>'
--     AND type IN ('round_commented', 'round_also_commented')
--   ORDER BY type;
--
--   -- Dedupe check: if :prior is ALSO a participant-friend, they should appear
--   -- once, as 'round_commented' only (never 'round_also_commented').
-- ROLLBACK;
