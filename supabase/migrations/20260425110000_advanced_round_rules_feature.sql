-- =====================================================
-- Migration: advanced_round_rules tier feature
-- =====================================================
-- Gates the per-round rules engine behind a new Premium-tier feature flag.
--
-- What's gated:
--   * The round creation wizard "Rules Template" step
--   * The Round Settings "Scoring Rules" section (editor)
--   * The competition Knockout seeding with qualifying rounds / adjacent bracket
--
-- What's NOT gated (intentional — graceful degradation):
--   * Applying a previously-saved override during finalization. If a Premium
--     organizer saves an override then downgrades, the round still settles
--     with the saved rules. Only *editing* is blocked.
--
-- Same pattern as can_use_skins_game / can_use_wolf_game / can_use_prize_pool.
-- =====================================================

ALTER TABLE tier_limits
  ADD COLUMN IF NOT EXISTS can_use_advanced_round_rules BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN tier_limits.can_use_advanced_round_rules IS
  'Whether this tier can configure per-round rule overrides (custom team aggregation, win/tie point allocation, qualifying-based knockout seeding). TRUE for premium and above.';

-- -----------------------------------------------------
-- Enable for Premium, Enterprise, Super Admin, Developer
-- -----------------------------------------------------
-- Cast to text in the IN list so this migration is tolerant of DBs where the
-- 'enterprise' / 'developer' enum values haven't been added yet. Any row that
-- doesn't exist simply isn't updated — no error. When 20260421000000 runs
-- later the default FALSE still holds and the row gets updated by the
-- seed migration 20260421000001 which inserts enterprise / developer with
-- can_use_advanced_round_rules = TRUE explicitly.

UPDATE tier_limits
SET can_use_advanced_round_rules = TRUE
WHERE tier::text IN ('premium', 'enterprise', 'super_admin', 'developer');

-- -----------------------------------------------------
-- Extend user_has_feature() to recognize the new flag
-- -----------------------------------------------------
-- Keep parity with the existing switch in 20260421000001_add_enterprise_developer_tier_data.sql.
-- The prior definition didn't list skins_game / wolf_game / prize_pool either
-- (those are resolved client-side via limits rows). We add advanced_round_rules
-- so server-side RLS or edge functions can gate writes directly if needed.

CREATE OR REPLACE FUNCTION user_has_feature(
  p_user_id UUID,
  p_feature TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_limits tier_limits;
BEGIN
  v_limits := get_user_tier_limits(p_user_id);

  CASE p_feature
    WHEN 'team_formats' THEN RETURN v_limits.can_use_team_formats;
    WHEN 'scoring_pairs' THEN RETURN v_limits.can_use_scoring_pairs;
    WHEN 'export_data' THEN RETURN v_limits.can_export_data;
    WHEN 'api_course_search' THEN RETURN v_limits.can_use_api_course_search;
    WHEN 'basic_stats' THEN RETURN v_limits.can_view_basic_stats;
    WHEN 'score_distribution' THEN RETURN v_limits.can_view_score_distribution;
    WHEN 'advanced_stats' THEN RETURN v_limits.can_view_advanced_stats;
    WHEN 'compare_stats' THEN RETURN v_limits.can_compare_stats;
    WHEN 'admin_tools' THEN RETURN v_limits.can_access_admin_tools;
    WHEN 'beta_features' THEN RETURN v_limits.can_access_beta_features;
    WHEN 'skins_game' THEN RETURN v_limits.can_use_skins_game;
    WHEN 'wolf_game' THEN RETURN v_limits.can_use_wolf_game;
    WHEN 'prize_pool' THEN RETURN v_limits.can_use_prize_pool;
    WHEN 'advanced_round_rules' THEN RETURN v_limits.can_use_advanced_round_rules;
    ELSE RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
