-- =====================================================
-- Achievement Categories V2 - Enum Extension
-- =====================================================
-- Must be in a separate transaction (committed first) before
-- new values can be used in INSERT statements.
-- =====================================================

ALTER TYPE achievement_category ADD VALUE IF NOT EXISTS 'side_games';
ALTER TYPE achievement_category ADD VALUE IF NOT EXISTS 'leagues';
