-- =====================================================
-- Add WhatsApp group invite link to competitions
-- =====================================================
-- Lets organisers paste a WhatsApp group invite link (created manually in
-- WhatsApp) into competition settings. Members see a "Join WhatsApp Group"
-- entry on the settings screen; organisers also get a "Share with members"
-- helper. WhatsApp does not expose programmatic group creation, so this is
-- the practical integration surface.
-- =====================================================

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS whatsapp_group_invite_url TEXT;

ALTER TABLE competitions
  DROP CONSTRAINT IF EXISTS competitions_whatsapp_invite_format_check;

-- Validate the standard WhatsApp invite URL shape so the column can't be
-- populated with arbitrary URLs that would silently fail when tapped.
-- The code portion can include letters, digits, underscores, and hyphens.
-- Newer WhatsApp invites append a "?mode=gi_t" query string, so we accept an
-- optional trailing slash and optional query string. Length is kept generous
-- to avoid false rejections on newer/longer codes.
ALTER TABLE competitions
  ADD CONSTRAINT competitions_whatsapp_invite_format_check
    CHECK (
      whatsapp_group_invite_url IS NULL
      OR whatsapp_group_invite_url ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9_-]{5,60}/?(\?[A-Za-z0-9_=&%.-]+)?$'
    );

COMMENT ON COLUMN competitions.whatsapp_group_invite_url IS
  'Optional WhatsApp group invite link (https://chat.whatsapp.com/<code>) for organiser-led member coordination. Editable by the organiser only.';
