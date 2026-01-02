-- =====================================================
-- Seed Achievement Definitions
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration seeds 40+ achievement definitions across all categories:
-- - Round Milestones (Practice, Competition, Total)
-- - Game Type Variety (Stableford, Stroke, Match Play, Team, Explorer)
-- - Scoring (Birdie, Eagle, Albatross, Ace, Par, Stableford Star, Low Scorer)
-- - Competitions (First Timer, Junkie, Champion, Podium, Organizer)
-- - Social (Friends, Playing Partners)
-- - Courses (Explorer, Home Advantage)
--
-- Points by Rarity:
--   common    = 10 points
--   uncommon  = 20 points
--   rare      = 50 points
--   epic      = 100 points
--   legendary = 250 points
-- =====================================================

-- =====================================================
-- ROUND MILESTONES CATEGORY
-- =====================================================

-- Practice Makes Perfect (1, 5, 10, 25, 50, 100 practice rounds)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('PRACTICE_MAKES_PERFECT_1', 'rounds', 'Practice Makes Perfect I', 'Complete your first practice round', 'golf', 1, 1, NULL, 10, 'common'),
('PRACTICE_MAKES_PERFECT_2', 'rounds', 'Practice Makes Perfect II', 'Complete 5 practice rounds', 'golf', 2, 5, 'PRACTICE_MAKES_PERFECT', 10, 'common'),
('PRACTICE_MAKES_PERFECT_3', 'rounds', 'Practice Makes Perfect III', 'Complete 10 practice rounds', 'golf', 3, 10, 'PRACTICE_MAKES_PERFECT', 20, 'uncommon'),
('PRACTICE_MAKES_PERFECT_4', 'rounds', 'Practice Makes Perfect IV', 'Complete 25 practice rounds', 'golf', 4, 25, 'PRACTICE_MAKES_PERFECT', 50, 'rare'),
('PRACTICE_MAKES_PERFECT_5', 'rounds', 'Practice Makes Perfect V', 'Complete 50 practice rounds', 'golf', 5, 50, 'PRACTICE_MAKES_PERFECT', 100, 'epic'),
('PRACTICE_MAKES_PERFECT_6', 'rounds', 'Practice Makes Perfect VI', 'Complete 100 practice rounds', 'golf', 6, 100, 'PRACTICE_MAKES_PERFECT', 250, 'legendary');

-- Competitor (1, 5, 10, 25, 50, 100 competition rounds)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('COMPETITOR_1', 'rounds', 'Competitor I', 'Complete your first competition round', 'trophy-variant', 1, 1, NULL, 10, 'common'),
('COMPETITOR_2', 'rounds', 'Competitor II', 'Complete 5 competition rounds', 'trophy-variant', 2, 5, 'COMPETITOR', 10, 'common'),
('COMPETITOR_3', 'rounds', 'Competitor III', 'Complete 10 competition rounds', 'trophy-variant', 3, 10, 'COMPETITOR', 20, 'uncommon'),
('COMPETITOR_4', 'rounds', 'Competitor IV', 'Complete 25 competition rounds', 'trophy-variant', 4, 25, 'COMPETITOR', 50, 'rare'),
('COMPETITOR_5', 'rounds', 'Competitor V', 'Complete 50 competition rounds', 'trophy-variant', 5, 50, 'COMPETITOR', 100, 'epic'),
('COMPETITOR_6', 'rounds', 'Competitor VI', 'Complete 100 competition rounds', 'trophy-variant', 6, 100, 'COMPETITOR', 250, 'legendary');

-- Round Veteran (1, 10, 25, 50, 100, 250, 500 total rounds)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('ROUND_VETERAN_1', 'rounds', 'Round Veteran I', 'Complete your first round', 'flag-checkered', 1, 1, NULL, 10, 'common'),
('ROUND_VETERAN_2', 'rounds', 'Round Veteran II', 'Complete 10 rounds', 'flag-checkered', 2, 10, 'ROUND_VETERAN', 10, 'common'),
('ROUND_VETERAN_3', 'rounds', 'Round Veteran III', 'Complete 25 rounds', 'flag-checkered', 3, 25, 'ROUND_VETERAN', 20, 'uncommon'),
('ROUND_VETERAN_4', 'rounds', 'Round Veteran IV', 'Complete 50 rounds', 'flag-checkered', 4, 50, 'ROUND_VETERAN', 50, 'rare'),
('ROUND_VETERAN_5', 'rounds', 'Round Veteran V', 'Complete 100 rounds', 'flag-checkered', 5, 100, 'ROUND_VETERAN', 100, 'epic'),
('ROUND_VETERAN_6', 'rounds', 'Round Veteran VI', 'Complete 250 rounds', 'flag-checkered', 6, 250, 'ROUND_VETERAN', 250, 'legendary');

-- =====================================================
-- GAME TYPES CATEGORY
-- =====================================================

-- Stableford Specialist (1, 10, 25, 50 Stableford rounds)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('STABLEFORD_SPECIALIST_1', 'game_types', 'Stableford Specialist I', 'Complete your first Stableford round', 'numeric', 1, 1, NULL, 10, 'common'),
('STABLEFORD_SPECIALIST_2', 'game_types', 'Stableford Specialist II', 'Complete 10 Stableford rounds', 'numeric', 2, 10, 'STABLEFORD_SPECIALIST', 20, 'uncommon'),
('STABLEFORD_SPECIALIST_3', 'game_types', 'Stableford Specialist III', 'Complete 25 Stableford rounds', 'numeric', 3, 25, 'STABLEFORD_SPECIALIST', 50, 'rare'),
('STABLEFORD_SPECIALIST_4', 'game_types', 'Stableford Specialist IV', 'Complete 50 Stableford rounds', 'numeric', 4, 50, 'STABLEFORD_SPECIALIST', 100, 'epic');

-- Stroke Player (1, 10, 25, 50 Stroke Play rounds)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('STROKE_PLAYER_1', 'game_types', 'Stroke Player I', 'Complete your first Stroke Play round', 'counter', 1, 1, NULL, 10, 'common'),
('STROKE_PLAYER_2', 'game_types', 'Stroke Player II', 'Complete 10 Stroke Play rounds', 'counter', 2, 10, 'STROKE_PLAYER', 20, 'uncommon'),
('STROKE_PLAYER_3', 'game_types', 'Stroke Player III', 'Complete 25 Stroke Play rounds', 'counter', 3, 25, 'STROKE_PLAYER', 50, 'rare'),
('STROKE_PLAYER_4', 'game_types', 'Stroke Player IV', 'Complete 50 Stroke Play rounds', 'counter', 4, 50, 'STROKE_PLAYER', 100, 'epic');

-- Match Play Master (1, 5, 10, 25 Match Play rounds)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('MATCH_PLAY_MASTER_1', 'game_types', 'Match Play Master I', 'Complete your first Match Play round', 'sword-cross', 1, 1, NULL, 10, 'common'),
('MATCH_PLAY_MASTER_2', 'game_types', 'Match Play Master II', 'Complete 5 Match Play rounds', 'sword-cross', 2, 5, 'MATCH_PLAY_MASTER', 20, 'uncommon'),
('MATCH_PLAY_MASTER_3', 'game_types', 'Match Play Master III', 'Complete 10 Match Play rounds', 'sword-cross', 3, 10, 'MATCH_PLAY_MASTER', 50, 'rare'),
('MATCH_PLAY_MASTER_4', 'game_types', 'Match Play Master IV', 'Complete 25 Match Play rounds', 'sword-cross', 4, 25, 'MATCH_PLAY_MASTER', 100, 'epic');

-- Team Player (1, 5, 10, 25 team format rounds)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('TEAM_PLAYER_1', 'game_types', 'Team Player I', 'Complete your first team format round', 'account-group', 1, 1, NULL, 10, 'common'),
('TEAM_PLAYER_2', 'game_types', 'Team Player II', 'Complete 5 team format rounds', 'account-group', 2, 5, 'TEAM_PLAYER', 20, 'uncommon'),
('TEAM_PLAYER_3', 'game_types', 'Team Player III', 'Complete 10 team format rounds', 'account-group', 3, 10, 'TEAM_PLAYER', 50, 'rare'),
('TEAM_PLAYER_4', 'game_types', 'Team Player IV', 'Complete 25 team format rounds', 'account-group', 4, 25, 'TEAM_PLAYER', 100, 'epic');

-- Format Explorer (2, 3, 4, 5 unique game types)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('FORMAT_EXPLORER_1', 'game_types', 'Format Explorer I', 'Play 2 different game types', 'compass', 1, 2, NULL, 10, 'common'),
('FORMAT_EXPLORER_2', 'game_types', 'Format Explorer II', 'Play 3 different game types', 'compass', 2, 3, 'FORMAT_EXPLORER', 20, 'uncommon'),
('FORMAT_EXPLORER_3', 'game_types', 'Format Explorer III', 'Play 4 different game types', 'compass', 3, 4, 'FORMAT_EXPLORER', 50, 'rare'),
('FORMAT_EXPLORER_4', 'game_types', 'Format Explorer IV', 'Play 5 different game types', 'compass', 4, 5, 'FORMAT_EXPLORER', 100, 'epic');

-- =====================================================
-- SCORING CATEGORY
-- =====================================================

-- Birdie Hunter (1, 10, 25, 50, 100, 250 birdies)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('BIRDIE_HUNTER_1', 'scoring', 'Birdie Hunter I', 'Record your first birdie', 'bird', 1, 1, NULL, 10, 'common'),
('BIRDIE_HUNTER_2', 'scoring', 'Birdie Hunter II', 'Record 10 birdies', 'bird', 2, 10, 'BIRDIE_HUNTER', 10, 'common'),
('BIRDIE_HUNTER_3', 'scoring', 'Birdie Hunter III', 'Record 25 birdies', 'bird', 3, 25, 'BIRDIE_HUNTER', 20, 'uncommon'),
('BIRDIE_HUNTER_4', 'scoring', 'Birdie Hunter IV', 'Record 50 birdies', 'bird', 4, 50, 'BIRDIE_HUNTER', 50, 'rare'),
('BIRDIE_HUNTER_5', 'scoring', 'Birdie Hunter V', 'Record 100 birdies', 'bird', 5, 100, 'BIRDIE_HUNTER', 100, 'epic'),
('BIRDIE_HUNTER_6', 'scoring', 'Birdie Hunter VI', 'Record 250 birdies', 'bird', 6, 250, 'BIRDIE_HUNTER', 250, 'legendary');

-- Eagle Eye (1, 5, 10, 25, 50 eagles)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('EAGLE_EYE_1', 'scoring', 'Eagle Eye I', 'Record your first eagle', 'emoticon-cool', 1, 1, NULL, 20, 'uncommon'),
('EAGLE_EYE_2', 'scoring', 'Eagle Eye II', 'Record 5 eagles', 'emoticon-cool', 2, 5, 'EAGLE_EYE', 50, 'rare'),
('EAGLE_EYE_3', 'scoring', 'Eagle Eye III', 'Record 10 eagles', 'emoticon-cool', 3, 10, 'EAGLE_EYE', 100, 'epic'),
('EAGLE_EYE_4', 'scoring', 'Eagle Eye IV', 'Record 25 eagles', 'emoticon-cool', 4, 25, 'EAGLE_EYE', 250, 'legendary'),
('EAGLE_EYE_5', 'scoring', 'Eagle Eye V', 'Record 50 eagles', 'emoticon-cool', 5, 50, 'EAGLE_EYE', 250, 'legendary');

-- Albatross Rare (1, 3, 5 albatrosses)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('ALBATROSS_RARE_1', 'scoring', 'Albatross Rare I', 'Record your first albatross', 'star-shooting', 1, 1, NULL, 100, 'epic'),
('ALBATROSS_RARE_2', 'scoring', 'Albatross Rare II', 'Record 3 albatrosses', 'star-shooting', 2, 3, 'ALBATROSS_RARE', 250, 'legendary'),
('ALBATROSS_RARE_3', 'scoring', 'Albatross Rare III', 'Record 5 albatrosses', 'star-shooting', 3, 5, 'ALBATROSS_RARE', 250, 'legendary');

-- Ace (1, 2, 3 hole-in-ones)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('ACE_1', 'scoring', 'Ace I', 'Record your first hole-in-one', 'star-circle', 1, 1, NULL, 250, 'legendary'),
('ACE_2', 'scoring', 'Ace II', 'Record 2 hole-in-ones', 'star-circle', 2, 2, 'ACE', 250, 'legendary'),
('ACE_3', 'scoring', 'Ace III', 'Record 3 hole-in-ones', 'star-circle', 3, 3, 'ACE', 250, 'legendary');

-- Par Machine (10, 50, 100, 250, 500 pars)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('PAR_MACHINE_1', 'scoring', 'Par Machine I', 'Record 10 pars', 'check-circle', 1, 10, NULL, 10, 'common'),
('PAR_MACHINE_2', 'scoring', 'Par Machine II', 'Record 50 pars', 'check-circle', 2, 50, 'PAR_MACHINE', 10, 'common'),
('PAR_MACHINE_3', 'scoring', 'Par Machine III', 'Record 100 pars', 'check-circle', 3, 100, 'PAR_MACHINE', 20, 'uncommon'),
('PAR_MACHINE_4', 'scoring', 'Par Machine IV', 'Record 250 pars', 'check-circle', 4, 250, 'PAR_MACHINE', 50, 'rare'),
('PAR_MACHINE_5', 'scoring', 'Par Machine V', 'Record 500 pars', 'check-circle', 5, 500, 'PAR_MACHINE', 100, 'epic');

-- Stableford Star (30, 36, 40, 45+ single-round points)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('STABLEFORD_STAR_1', 'scoring', 'Stableford Star I', 'Score 30+ Stableford points in a round', 'star', 1, 30, NULL, 10, 'common'),
('STABLEFORD_STAR_2', 'scoring', 'Stableford Star II', 'Score 36+ Stableford points in a round', 'star', 2, 36, 'STABLEFORD_STAR', 50, 'rare'),
('STABLEFORD_STAR_3', 'scoring', 'Stableford Star III', 'Score 40+ Stableford points in a round', 'star', 3, 40, 'STABLEFORD_STAR', 100, 'epic'),
('STABLEFORD_STAR_4', 'scoring', 'Stableford Star IV', 'Score 45+ Stableford points in a round', 'star', 4, 45, 'STABLEFORD_STAR', 250, 'legendary');

-- Low Scorer (under 100, 90, 85, 80, 75, 70 gross)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('LOW_SCORER_1', 'scoring', 'Low Scorer I', 'Shoot under 100 gross in an 18-hole round', 'trending-down', 1, 100, NULL, 10, 'common'),
('LOW_SCORER_2', 'scoring', 'Low Scorer II', 'Shoot under 90 gross in an 18-hole round', 'trending-down', 2, 90, 'LOW_SCORER', 20, 'uncommon'),
('LOW_SCORER_3', 'scoring', 'Low Scorer III', 'Shoot under 85 gross in an 18-hole round', 'trending-down', 3, 85, 'LOW_SCORER', 50, 'rare'),
('LOW_SCORER_4', 'scoring', 'Low Scorer IV', 'Shoot under 80 gross in an 18-hole round', 'trending-down', 4, 80, 'LOW_SCORER', 100, 'epic'),
('LOW_SCORER_5', 'scoring', 'Low Scorer V', 'Shoot under 75 gross in an 18-hole round', 'trending-down', 5, 75, 'LOW_SCORER', 250, 'legendary'),
('LOW_SCORER_6', 'scoring', 'Low Scorer VI', 'Shoot under 70 gross in an 18-hole round', 'trending-down', 6, 70, 'LOW_SCORER', 250, 'legendary');

-- =====================================================
-- COMPETITIONS CATEGORY
-- =====================================================

-- First Timer (1 competition)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('FIRST_TIMER_1', 'competitions', 'First Timer', 'Join your first competition', 'party-popper', 1, 1, NULL, 10, 'common');

-- Competition Junkie (1, 3, 5, 10, 20, 50 competitions)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('COMPETITION_JUNKIE_1', 'competitions', 'Competition Junkie I', 'Join your first competition', 'calendar-star', 1, 1, NULL, 10, 'common'),
('COMPETITION_JUNKIE_2', 'competitions', 'Competition Junkie II', 'Join 3 competitions', 'calendar-star', 2, 3, 'COMPETITION_JUNKIE', 10, 'common'),
('COMPETITION_JUNKIE_3', 'competitions', 'Competition Junkie III', 'Join 5 competitions', 'calendar-star', 3, 5, 'COMPETITION_JUNKIE', 20, 'uncommon'),
('COMPETITION_JUNKIE_4', 'competitions', 'Competition Junkie IV', 'Join 10 competitions', 'calendar-star', 4, 10, 'COMPETITION_JUNKIE', 50, 'rare'),
('COMPETITION_JUNKIE_5', 'competitions', 'Competition Junkie V', 'Join 20 competitions', 'calendar-star', 5, 20, 'COMPETITION_JUNKIE', 100, 'epic'),
('COMPETITION_JUNKIE_6', 'competitions', 'Competition Junkie VI', 'Join 50 competitions', 'calendar-star', 6, 50, 'COMPETITION_JUNKIE', 250, 'legendary');

-- Champion (1, 3, 5, 10, 25 wins)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('CHAMPION_1', 'competitions', 'Champion I', 'Win your first competition', 'trophy', 1, 1, NULL, 50, 'rare'),
('CHAMPION_2', 'competitions', 'Champion II', 'Win 3 competitions', 'trophy', 2, 3, 'CHAMPION', 100, 'epic'),
('CHAMPION_3', 'competitions', 'Champion III', 'Win 5 competitions', 'trophy', 3, 5, 'CHAMPION', 100, 'epic'),
('CHAMPION_4', 'competitions', 'Champion IV', 'Win 10 competitions', 'trophy', 4, 10, 'CHAMPION', 250, 'legendary'),
('CHAMPION_5', 'competitions', 'Champion V', 'Win 25 competitions', 'trophy', 5, 25, 'CHAMPION', 250, 'legendary');

-- Podium Finish (1, 5, 10, 25 top 3 finishes)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('PODIUM_FINISH_1', 'competitions', 'Podium Finish I', 'Finish in the top 3 of a competition', 'podium', 1, 1, NULL, 20, 'uncommon'),
('PODIUM_FINISH_2', 'competitions', 'Podium Finish II', 'Finish in the top 3 of 5 competitions', 'podium', 2, 5, 'PODIUM_FINISH', 50, 'rare'),
('PODIUM_FINISH_3', 'competitions', 'Podium Finish III', 'Finish in the top 3 of 10 competitions', 'podium', 3, 10, 'PODIUM_FINISH', 100, 'epic'),
('PODIUM_FINISH_4', 'competitions', 'Podium Finish IV', 'Finish in the top 3 of 25 competitions', 'podium', 4, 25, 'PODIUM_FINISH', 250, 'legendary');

-- Organizer (1, 3, 5, 10 competitions created)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('ORGANIZER_1', 'competitions', 'Organizer I', 'Create your first competition', 'clipboard-plus', 1, 1, NULL, 10, 'common'),
('ORGANIZER_2', 'competitions', 'Organizer II', 'Create 3 competitions', 'clipboard-plus', 2, 3, 'ORGANIZER', 20, 'uncommon'),
('ORGANIZER_3', 'competitions', 'Organizer III', 'Create 5 competitions', 'clipboard-plus', 3, 5, 'ORGANIZER', 50, 'rare'),
('ORGANIZER_4', 'competitions', 'Organizer IV', 'Create 10 competitions', 'clipboard-plus', 4, 10, 'ORGANIZER', 100, 'epic');

-- =====================================================
-- SOCIAL CATEGORY
-- =====================================================

-- First Friend (1 friend)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('FIRST_FRIEND_1', 'social', 'First Friend', 'Add your first friend', 'account-plus', 1, 1, NULL, 10, 'common');

-- Social Circle (5, 10, 20, 30, 50 friends)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('SOCIAL_CIRCLE_1', 'social', 'Social Circle I', 'Have 5 friends', 'account-multiple', 1, 5, NULL, 10, 'common'),
('SOCIAL_CIRCLE_2', 'social', 'Social Circle II', 'Have 10 friends', 'account-multiple', 2, 10, 'SOCIAL_CIRCLE', 20, 'uncommon'),
('SOCIAL_CIRCLE_3', 'social', 'Social Circle III', 'Have 20 friends', 'account-multiple', 3, 20, 'SOCIAL_CIRCLE', 50, 'rare'),
('SOCIAL_CIRCLE_4', 'social', 'Social Circle IV', 'Have 30 friends', 'account-multiple', 4, 30, 'SOCIAL_CIRCLE', 100, 'epic'),
('SOCIAL_CIRCLE_5', 'social', 'Social Circle V', 'Have 50 friends', 'account-multiple', 5, 50, 'SOCIAL_CIRCLE', 250, 'legendary');

-- Playing Partners (5, 10, 25, 50, 100 unique players)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('PLAYING_PARTNERS_1', 'social', 'Playing Partners I', 'Play with 5 unique players', 'account-switch', 1, 5, NULL, 10, 'common'),
('PLAYING_PARTNERS_2', 'social', 'Playing Partners II', 'Play with 10 unique players', 'account-switch', 2, 10, 'PLAYING_PARTNERS', 20, 'uncommon'),
('PLAYING_PARTNERS_3', 'social', 'Playing Partners III', 'Play with 25 unique players', 'account-switch', 3, 25, 'PLAYING_PARTNERS', 50, 'rare'),
('PLAYING_PARTNERS_4', 'social', 'Playing Partners IV', 'Play with 50 unique players', 'account-switch', 4, 50, 'PLAYING_PARTNERS', 100, 'epic'),
('PLAYING_PARTNERS_5', 'social', 'Playing Partners V', 'Play with 100 unique players', 'account-switch', 5, 100, 'PLAYING_PARTNERS', 250, 'legendary');

-- =====================================================
-- COURSES CATEGORY
-- =====================================================

-- Course Explorer (3, 5, 10, 20, 50 unique courses)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('COURSE_EXPLORER_1', 'courses', 'Course Explorer I', 'Play 3 different courses', 'map-marker-multiple', 1, 3, NULL, 10, 'common'),
('COURSE_EXPLORER_2', 'courses', 'Course Explorer II', 'Play 5 different courses', 'map-marker-multiple', 2, 5, 'COURSE_EXPLORER', 20, 'uncommon'),
('COURSE_EXPLORER_3', 'courses', 'Course Explorer III', 'Play 10 different courses', 'map-marker-multiple', 3, 10, 'COURSE_EXPLORER', 50, 'rare'),
('COURSE_EXPLORER_4', 'courses', 'Course Explorer IV', 'Play 20 different courses', 'map-marker-multiple', 4, 20, 'COURSE_EXPLORER', 100, 'epic'),
('COURSE_EXPLORER_5', 'courses', 'Course Explorer V', 'Play 50 different courses', 'map-marker-multiple', 5, 50, 'COURSE_EXPLORER', 250, 'legendary');

-- Home Advantage (5, 10, 25, 50, 100 rounds at home venue)
INSERT INTO achievement_definitions (code, category, name, description, icon, tier, threshold, base_achievement, points, rarity) VALUES
('HOME_ADVANTAGE_1', 'courses', 'Home Advantage I', 'Play 5 rounds at your home venue', 'home-circle', 1, 5, NULL, 10, 'common'),
('HOME_ADVANTAGE_2', 'courses', 'Home Advantage II', 'Play 10 rounds at your home venue', 'home-circle', 2, 10, 'HOME_ADVANTAGE', 20, 'uncommon'),
('HOME_ADVANTAGE_3', 'courses', 'Home Advantage III', 'Play 25 rounds at your home venue', 'home-circle', 3, 25, 'HOME_ADVANTAGE', 50, 'rare'),
('HOME_ADVANTAGE_4', 'courses', 'Home Advantage IV', 'Play 50 rounds at your home venue', 'home-circle', 4, 50, 'HOME_ADVANTAGE', 100, 'epic'),
('HOME_ADVANTAGE_5', 'courses', 'Home Advantage V', 'Play 100 rounds at your home venue', 'home-circle', 5, 100, 'HOME_ADVANTAGE', 250, 'legendary');

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify we have 40+ achievements
DO $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM achievement_definitions;
  IF total_count < 40 THEN
    RAISE EXCEPTION 'Expected 40+ achievements, but only % were inserted', total_count;
  ELSE
    RAISE NOTICE 'Successfully seeded % achievement definitions', total_count;
  END IF;
END;
$$;

-- =====================================================
-- SUMMARY STATS
-- =====================================================
DO $$
DECLARE
  cat_record RECORD;
  rarity_record RECORD;
BEGIN
  RAISE NOTICE '=== Achievement Summary ===';

  -- By category
  FOR cat_record IN
    SELECT category::TEXT, COUNT(*) as count
    FROM achievement_definitions
    GROUP BY category
    ORDER BY category
  LOOP
    RAISE NOTICE 'Category %: % achievements', cat_record.category, cat_record.count;
  END LOOP;

  RAISE NOTICE '---';

  -- By rarity
  FOR rarity_record IN
    SELECT rarity::TEXT, COUNT(*) as count, SUM(points) as total_points
    FROM achievement_definitions
    GROUP BY rarity
    ORDER BY CASE rarity
      WHEN 'common' THEN 1
      WHEN 'uncommon' THEN 2
      WHEN 'rare' THEN 3
      WHEN 'epic' THEN 4
      WHEN 'legendary' THEN 5
    END
  LOOP
    RAISE NOTICE 'Rarity %: % achievements (% total points)', rarity_record.rarity, rarity_record.count, rarity_record.total_points;
  END LOOP;
END;
$$;
