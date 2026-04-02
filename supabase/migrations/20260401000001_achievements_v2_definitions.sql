-- =====================================================
-- Achievement Definitions V2 - New Definitions
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Requires 20260401000000_achievements_v2_enum.sql to have
-- been committed first (adds 'side_games' and 'leagues' enums).
-- =====================================================

-- =====================================================
-- SIDE GAMES: SKINS
-- =====================================================

-- First Skin (play your first skins game — standalone single-tier)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('FIRST_SKIN_1', 'side_games', 'First Skin', 'Play your first skins game', 'cash-register', 1, 1, NULL, 10, 'common');

-- Skins Shark (1, 5, 10, 25 skins games played)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('SKINS_SHARK_1', 'side_games', 'Skins Shark I', 'Complete your first skins game', 'cards-playing-outline', 1, 1, NULL, 10, 'common'),
('SKINS_SHARK_2', 'side_games', 'Skins Shark II', 'Complete 5 skins games', 'cards-playing-outline', 2, 5, 'SKINS_SHARK', 20, 'uncommon'),
('SKINS_SHARK_3', 'side_games', 'Skins Shark III', 'Complete 10 skins games', 'cards-playing-outline', 3, 10, 'SKINS_SHARK', 50, 'rare'),
('SKINS_SHARK_4', 'side_games', 'Skins Shark IV', 'Complete 25 skins games', 'cards-playing-outline', 4, 25, 'SKINS_SHARK', 100, 'epic');

-- Skin Collector (5, 25, 50, 100 total skins holes won)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('SKIN_COLLECTOR_1', 'side_games', 'Skin Collector I', 'Win 5 skins holes', 'cash', 1, 5, NULL, 10, 'common'),
('SKIN_COLLECTOR_2', 'side_games', 'Skin Collector II', 'Win 25 skins holes', 'cash', 2, 25, 'SKIN_COLLECTOR', 20, 'uncommon'),
('SKIN_COLLECTOR_3', 'side_games', 'Skin Collector III', 'Win 50 skins holes', 'cash', 3, 50, 'SKIN_COLLECTOR', 50, 'rare'),
('SKIN_COLLECTOR_4', 'side_games', 'Skin Collector IV', 'Win 100 skins holes', 'cash', 4, 100, 'SKIN_COLLECTOR', 100, 'epic');

-- Clean Sweep (win 5+ skins in a single game — 1, 3, 5 times)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('CLEAN_SWEEP_1', 'side_games', 'Clean Sweep I', 'Win 5+ skins in a single game', 'broom', 1, 1, NULL, 20, 'uncommon'),
('CLEAN_SWEEP_2', 'side_games', 'Clean Sweep II', 'Win 5+ skins in 3 different games', 'broom', 2, 3, 'CLEAN_SWEEP', 50, 'rare'),
('CLEAN_SWEEP_3', 'side_games', 'Clean Sweep III', 'Win 5+ skins in 5 different games', 'broom', 3, 5, 'CLEAN_SWEEP', 100, 'epic');

-- Carry King (win a hole with carryovers — 1, 5, 10 times)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('CARRY_KING_1', 'side_games', 'Carry King I', 'Win a skins hole with carryovers', 'crown', 1, 1, NULL, 20, 'uncommon'),
('CARRY_KING_2', 'side_games', 'Carry King II', 'Win 5 skins holes with carryovers', 'crown', 2, 5, 'CARRY_KING', 50, 'rare'),
('CARRY_KING_3', 'side_games', 'Carry King III', 'Win 10 skins holes with carryovers', 'crown', 3, 10, 'CARRY_KING', 100, 'epic');

-- =====================================================
-- SIDE GAMES: WOLF
-- =====================================================

-- First Hunt (play your first wolf game — standalone single-tier)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('FIRST_HUNT_1', 'side_games', 'First Hunt', 'Play your first wolf game', 'paw-outline', 1, 1, NULL, 10, 'common');

-- Wolf Pack (1, 5, 10, 25 wolf games played)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('WOLF_PACK_1', 'side_games', 'Wolf Pack I', 'Complete your first wolf game', 'paw', 1, 1, NULL, 10, 'common'),
('WOLF_PACK_2', 'side_games', 'Wolf Pack II', 'Complete 5 wolf games', 'paw', 2, 5, 'WOLF_PACK', 20, 'uncommon'),
('WOLF_PACK_3', 'side_games', 'Wolf Pack III', 'Complete 10 wolf games', 'paw', 3, 10, 'WOLF_PACK', 50, 'rare'),
('WOLF_PACK_4', 'side_games', 'Wolf Pack IV', 'Complete 25 wolf games', 'paw', 4, 25, 'WOLF_PACK', 100, 'epic');

-- Lone Wolf (1, 5, 10 lone wolf wins)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('LONE_WOLF_1', 'side_games', 'Lone Wolf I', 'Win your first lone wolf hole', 'wolf', 1, 1, NULL, 20, 'uncommon'),
('LONE_WOLF_2', 'side_games', 'Lone Wolf II', 'Win 5 lone wolf holes', 'wolf', 2, 5, 'LONE_WOLF', 50, 'rare'),
('LONE_WOLF_3', 'side_games', 'Lone Wolf III', 'Win 10 lone wolf holes', 'wolf', 3, 10, 'LONE_WOLF', 100, 'epic');

-- Blind Wolf (1, 3, 5 blind wolf wins)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('BLIND_WOLF_1', 'side_games', 'Blind Wolf I', 'Win your first blind wolf hole', 'eye-off', 1, 1, NULL, 50, 'rare'),
('BLIND_WOLF_2', 'side_games', 'Blind Wolf II', 'Win 3 blind wolf holes', 'eye-off', 2, 3, 'BLIND_WOLF', 100, 'epic'),
('BLIND_WOLF_3', 'side_games', 'Blind Wolf III', 'Win 5 blind wolf holes', 'eye-off', 3, 5, 'BLIND_WOLF', 250, 'legendary');

-- =====================================================
-- LEAGUES
-- =====================================================

-- League Member (join 1, 3, 5 leagues)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('LEAGUE_MEMBER_1', 'leagues', 'League Member I', 'Join your first league', 'shield-star-outline', 1, 1, NULL, 10, 'common'),
('LEAGUE_MEMBER_2', 'leagues', 'League Member II', 'Join 3 leagues', 'shield-star-outline', 2, 3, 'LEAGUE_MEMBER', 20, 'uncommon'),
('LEAGUE_MEMBER_3', 'leagues', 'League Member III', 'Join 5 leagues', 'shield-star-outline', 3, 5, 'LEAGUE_MEMBER', 50, 'rare');

-- League Regular (1, 5, 10, 25, 50 league rounds)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('LEAGUE_REGULAR_1', 'leagues', 'League Regular I', 'Complete your first league round', 'shield-check', 1, 1, NULL, 10, 'common'),
('LEAGUE_REGULAR_2', 'leagues', 'League Regular II', 'Complete 5 league rounds', 'shield-check', 2, 5, 'LEAGUE_REGULAR', 20, 'uncommon'),
('LEAGUE_REGULAR_3', 'leagues', 'League Regular III', 'Complete 10 league rounds', 'shield-check', 3, 10, 'LEAGUE_REGULAR', 50, 'rare'),
('LEAGUE_REGULAR_4', 'leagues', 'League Regular IV', 'Complete 25 league rounds', 'shield-check', 4, 25, 'LEAGUE_REGULAR', 100, 'epic'),
('LEAGUE_REGULAR_5', 'leagues', 'League Regular V', 'Complete 50 league rounds', 'shield-check', 5, 50, 'LEAGUE_REGULAR', 250, 'legendary');

-- =====================================================
-- GAME TYPES: PAR SPECIALIST (new)
-- =====================================================

INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('PAR_SPECIALIST_1', 'game_types', 'Par Specialist I', 'Complete your first Par game round', 'plus-minus-variant', 1, 1, NULL, 10, 'common'),
('PAR_SPECIALIST_2', 'game_types', 'Par Specialist II', 'Complete 10 Par game rounds', 'plus-minus-variant', 2, 10, 'PAR_SPECIALIST', 20, 'uncommon'),
('PAR_SPECIALIST_3', 'game_types', 'Par Specialist III', 'Complete 25 Par game rounds', 'plus-minus-variant', 3, 25, 'PAR_SPECIALIST', 50, 'rare'),
('PAR_SPECIALIST_4', 'game_types', 'Par Specialist IV', 'Complete 50 Par game rounds', 'plus-minus-variant', 4, 50, 'PAR_SPECIALIST', 100, 'epic');

-- =====================================================
-- GAME TYPES: FORMAT EXPLORER expansion (tiers 5-6)
-- =====================================================

-- Existing FORMAT_EXPLORER has tiers 1-4 (2, 3, 4, 5 game types)
-- Add tiers 5-6 for 6 and 7 game types
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('FORMAT_EXPLORER_5', 'game_types', 'Format Explorer V', 'Play 6 different game types', 'compass', 5, 6, 'FORMAT_EXPLORER', 100, 'epic'),
('FORMAT_EXPLORER_6', 'game_types', 'Format Explorer VI', 'Play all 7 game types', 'compass', 6, 7, 'FORMAT_EXPLORER', 250, 'legendary');

-- =====================================================
-- COMPETITIONS: KNOCKOUT
-- =====================================================

INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('KNOCKOUT_KING_1', 'competitions', 'Knockout King I', 'Win your first knockout tournament', 'bracket-outline', 1, 1, NULL, 50, 'rare'),
('KNOCKOUT_KING_2', 'competitions', 'Knockout King II', 'Win 3 knockout tournaments', 'bracket-outline', 2, 3, 'KNOCKOUT_KING', 100, 'epic'),
('KNOCKOUT_KING_3', 'competitions', 'Knockout King III', 'Win 5 knockout tournaments', 'bracket-outline', 3, 5, 'KNOCKOUT_KING', 250, 'legendary');

-- =====================================================
-- ROUNDS: 9-HOLE SPECIALIST (new)
-- =====================================================

INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('NINE_HOLE_SPECIALIST_1', 'rounds', 'Quick Nine I', 'Complete your first 9-hole round', 'numeric-9-circle', 1, 1, NULL, 10, 'common'),
('NINE_HOLE_SPECIALIST_2', 'rounds', 'Quick Nine II', 'Complete 10 nine-hole rounds', 'numeric-9-circle', 2, 10, 'NINE_HOLE_SPECIALIST', 20, 'uncommon'),
('NINE_HOLE_SPECIALIST_3', 'rounds', 'Quick Nine III', 'Complete 25 nine-hole rounds', 'numeric-9-circle', 3, 25, 'NINE_HOLE_SPECIALIST', 50, 'rare');

-- =====================================================
-- STREAKS (category existed but was empty)
-- =====================================================

-- Weekend Warrior (4, 8, 12 consecutive weeks playing)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('WEEKEND_WARRIOR_1', 'streaks', 'Weekend Warrior I', 'Play a round 4 weeks in a row', 'calendar-check', 1, 4, NULL, 20, 'uncommon'),
('WEEKEND_WARRIOR_2', 'streaks', 'Weekend Warrior II', 'Play a round 8 weeks in a row', 'calendar-check', 2, 8, 'WEEKEND_WARRIOR', 50, 'rare'),
('WEEKEND_WARRIOR_3', 'streaks', 'Weekend Warrior III', 'Play a round 12 weeks in a row', 'calendar-check', 3, 12, 'WEEKEND_WARRIOR', 100, 'epic');

-- Hot Streak (2, 3, 5 consecutive competition wins)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('HOT_STREAK_1', 'streaks', 'Hot Streak I', 'Win 2 competition rounds in a row', 'fire', 1, 2, NULL, 20, 'uncommon'),
('HOT_STREAK_2', 'streaks', 'Hot Streak II', 'Win 3 competition rounds in a row', 'fire', 2, 3, 'HOT_STREAK', 50, 'rare'),
('HOT_STREAK_3', 'streaks', 'Hot Streak III', 'Win 5 competition rounds in a row', 'fire', 3, 5, 'HOT_STREAK', 250, 'legendary');

-- =====================================================
-- MILESTONES (category existed but was empty)
-- =====================================================

-- Scoring Machine (submit 50, 100, 250, 500 scorecards)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('SCORING_MACHINE_1', 'milestones', 'Scoring Machine I', 'Submit 50 scorecards', 'clipboard-check-multiple', 1, 50, NULL, 20, 'uncommon'),
('SCORING_MACHINE_2', 'milestones', 'Scoring Machine II', 'Submit 100 scorecards', 'clipboard-check-multiple', 2, 100, 'SCORING_MACHINE', 50, 'rare'),
('SCORING_MACHINE_3', 'milestones', 'Scoring Machine III', 'Submit 250 scorecards', 'clipboard-check-multiple', 3, 250, 'SCORING_MACHINE', 100, 'epic'),
('SCORING_MACHINE_4', 'milestones', 'Scoring Machine IV', 'Submit 500 scorecards', 'clipboard-check-multiple', 4, 500, 'SCORING_MACHINE', 250, 'legendary');
