-- =====================================================
-- Activity Feed - verification script
-- =====================================================
-- Run AFTER applying:
--   20260521000000_activity_feed_tables.sql
--   20260521000100_round_photos_storage.sql
--   20260521000200_activity_feed_rpc.sql
--   20260521000300_activity_notifications.sql
--
-- Part 1 (catalog checks) is safe to run anywhere — it only inspects
-- metadata. Part 2 (functional checks) is a commented template: fill in a
-- real user id and a friend's user id on staging, then run inside a
-- transaction you ROLLBACK.
-- =====================================================

-- -----------------------------------------------------
-- PART 1: object existence (expect every row to say 'OK')
-- -----------------------------------------------------

SELECT 'tables' AS check,
  CASE WHEN COUNT(*) = 3 THEN 'OK' ELSE 'MISSING: ' || (3 - COUNT(*))::text END AS result
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('round_likes', 'round_comments', 'round_photos');

SELECT 'functions' AS check,
  CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE 'MISSING' END AS result
FROM pg_proc
WHERE proname IN (
  'can_view_round', 'is_round_participant_any',
  'get_activity_feed', 'get_round_feed_card'
);

SELECT 'triggers' AS check,
  CASE WHEN COUNT(*) = 2 THEN 'OK' ELSE 'MISSING' END AS result
FROM pg_trigger
WHERE tgname IN ('trigger_notify_round_liked', 'trigger_notify_round_commented');

SELECT 'rls_enabled' AS check,
  CASE WHEN bool_and(rowsecurity) THEN 'OK' ELSE 'RLS NOT ENABLED' END AS result
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('round_likes', 'round_comments', 'round_photos');

SELECT 'policies' AS check,
  CASE WHEN COUNT(*) >= 8 THEN 'OK (' || COUNT(*)::text || ')' ELSE 'TOO FEW: ' || COUNT(*)::text END AS result
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('round_likes', 'round_comments', 'round_photos');

SELECT 'storage_bucket' AS check,
  CASE WHEN COUNT(*) = 1 THEN 'OK' ELSE 'MISSING' END AS result
FROM storage.buckets WHERE id = 'round-photos';

SELECT 'storage_policies' AS check,
  CASE WHEN COUNT(*) >= 3 THEN 'OK' ELSE 'TOO FEW: ' || COUNT(*)::text END AS result
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname LIKE 'round photos%';

SELECT 'notif_types' AS check,
  CASE WHEN pg_get_constraintdef(oid) LIKE '%round_liked%'
        AND pg_get_constraintdef(oid) LIKE '%round_commented%'
       THEN 'OK' ELSE 'CONSTRAINT MISSING NEW TYPES' END AS result
FROM pg_constraint WHERE conname = 'notifications_type_check';

-- -----------------------------------------------------
-- PART 2: functional checks (TEMPLATE — fill in ids, run in a tx)
-- -----------------------------------------------------
-- Replace :viewer (a player who has an accepted friend with a completed,
-- scorecard-submitted round) and :friend below.
--
-- BEGIN;
--   SET LOCAL role authenticated;
--   SET LOCAL request.jwt.claims = '{"sub":"<VIEWER_UUID>","role":"authenticated"}';
--
--   -- (a) Feed returns rounds; each card has participants + counts populated.
--   SELECT round_id, course_name, like_count, comment_count, viewer_has_liked,
--          jsonb_array_length(participants) AS players, jsonb_array_length(photos) AS photos
--   FROM get_activity_feed(20, NULL);
--
--   -- (b) Keyset paging: pass the smallest activity_at from page 1 as p_before.
--   -- SELECT round_id FROM get_activity_feed(20, '<ACTIVITY_AT_FROM_A>');
--
--   -- (c) Like a round visible in the feed, then confirm a notification was
--   --     created for a friend-participant (and NOT for the viewer).
--   --     (round_likes RLS requires player_id = auth.uid().)
--   -- INSERT INTO round_likes (round_id, player_id)
--   --   VALUES ('<ROUND_UUID>', '<VIEWER_UUID>');
--   -- SELECT user_id, type FROM notifications
--   --   WHERE type = 'round_liked' AND round_id = '<ROUND_UUID>';
--
--   -- (d) Stranger check: switch to a user with no friendship to the round's
--   --     players and confirm get_activity_feed() does NOT return it.
--   -- SET LOCAL request.jwt.claims = '{"sub":"<STRANGER_UUID>","role":"authenticated"}';
--   -- SELECT round_id FROM get_activity_feed(50, NULL) WHERE round_id = '<ROUND_UUID>';
-- ROLLBACK;
