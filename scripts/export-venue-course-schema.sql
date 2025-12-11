-- =====================================================
-- Export Venue and Course Table Schemas
-- Run this in Supabase SQL Editor or psql
-- =====================================================

-- Get VENUES table columns
SELECT
  'VENUES TABLE' as table_info,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'venues'
ORDER BY ordinal_position;

-- Get COURSES table columns
SELECT
  'COURSES TABLE' as table_info,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'courses'
ORDER BY ordinal_position;

-- Get indexes for both tables
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('venues', 'courses')
ORDER BY tablename, indexname;

-- Get constraints for both tables
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
  AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('venues', 'courses')
ORDER BY tc.table_name, tc.constraint_type;

-- Get RLS policies
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('venues', 'courses')
ORDER BY tablename, policyname;
