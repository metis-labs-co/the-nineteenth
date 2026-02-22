-- Expand tier_limits with 9 new feature columns
-- Social tier: detailed_stats, handicap_history, achievement_leaderboard, ai_competition, manage_guests, gps_distance
-- Premium tier: skins_game, wolf_game, prize_pool

-- Add new columns (default false = Free tier gets no access)
ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS can_view_detailed_stats BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS can_view_handicap_history BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS can_view_achievement_leaderboard BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS can_use_ai_competition BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS can_manage_guests BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS can_use_gps_distance BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS can_use_skins_game BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS can_use_wolf_game BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS can_use_prize_pool BOOLEAN NOT NULL DEFAULT false;

-- Set Social tier values (Social features only)
UPDATE tier_limits SET
  can_view_detailed_stats = true,
  can_view_handicap_history = true,
  can_view_achievement_leaderboard = true,
  can_use_ai_competition = true,
  can_manage_guests = true,
  can_use_gps_distance = true
WHERE tier = 'social';

-- Set Premium tier values (Social + Premium features)
UPDATE tier_limits SET
  can_view_detailed_stats = true,
  can_view_handicap_history = true,
  can_view_achievement_leaderboard = true,
  can_use_ai_competition = true,
  can_manage_guests = true,
  can_use_gps_distance = true,
  can_use_skins_game = true,
  can_use_wolf_game = true,
  can_use_prize_pool = true
WHERE tier = 'premium';

-- Set Super Admin tier values (all features)
UPDATE tier_limits SET
  can_view_detailed_stats = true,
  can_view_handicap_history = true,
  can_view_achievement_leaderboard = true,
  can_use_ai_competition = true,
  can_manage_guests = true,
  can_use_gps_distance = true,
  can_use_skins_game = true,
  can_use_wolf_game = true,
  can_use_prize_pool = true
WHERE tier = 'super_admin';
