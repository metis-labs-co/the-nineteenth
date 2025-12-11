-- =====================================================
-- Get Venue and Course Table Columns with Types
-- Run in Supabase SQL Editor
-- =====================================================

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('venues', 'courses')
ORDER BY table_name, ordinal_position;
