-- =====================================================
-- Avatars Storage - verification script
-- =====================================================
-- Run AFTER applying 20260521000400_avatars_storage.sql.
-- Safe to run anywhere; inspects metadata only. Expect every row 'OK'.
-- =====================================================

SELECT 'bucket' AS check,
  CASE WHEN COUNT(*) = 1 THEN 'OK' ELSE 'MISSING' END AS result
FROM storage.buckets
WHERE id = 'avatars' AND public = true;

SELECT 'policies' AS check,
  CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE 'MISSING: expected 4, got ' || COUNT(*)::text END AS result
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname IN ('avatars read', 'avatars insert', 'avatars update', 'avatars delete');
