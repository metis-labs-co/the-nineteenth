-- =====================================================
-- Relax WhatsApp invite URL CHECK constraint
-- =====================================================
-- The original constraint (added in 20260519000000) was too strict:
--   - rejected codes containing `_` or `-`
--   - rejected codes longer than 30 chars
--   - rejected the query string WhatsApp now appends (e.g. ?mode=gi_t)
-- This drops the old constraint and re-adds it with the relaxed pattern
-- that matches the client-side validation in src/utils/whatsapp.ts.
-- =====================================================

ALTER TABLE competitions
  DROP CONSTRAINT IF EXISTS competitions_whatsapp_invite_format_check;

ALTER TABLE competitions
  ADD CONSTRAINT competitions_whatsapp_invite_format_check
    CHECK (
      whatsapp_group_invite_url IS NULL
      OR whatsapp_group_invite_url ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9_-]{5,60}/?(\?[A-Za-z0-9_=&%.-]+)?$'
    );
