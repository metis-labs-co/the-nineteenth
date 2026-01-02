-- =====================================================
-- Seed Cosmetic Definitions
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Seeds the cosmetic_definitions table with unlockable rewards:
-- - 5 Badges (displayed next to player name)
-- - 5 Frames (border around player avatar)
-- - 5 Titles (text displayed below player name)
--
-- Cosmetics are unlocked based on total achievement points.
-- sort_order matches points_required for display ordering.
-- =====================================================

-- =====================================================
-- BADGES
-- Displayed next to player name
-- Icons: medal, star, shield, trophy, crown themed
-- =====================================================

INSERT INTO cosmetic_definitions (code, type, name, description, icon, points_required, sort_order) VALUES

-- Badge: Rookie (100 points)
('BADGE_ROOKIE', 'badge', 'Rookie', 'Awarded for earning your first 100 achievement points. Welcome to the club!', 'medal-outline', 100, 100),

-- Badge: Rising Star (750 points)
('BADGE_RISING_STAR', 'badge', 'Rising Star', 'Awarded for earning 750 achievement points. Your golf journey is taking off!', 'star-rising', 750, 750),

-- Badge: Achiever (1500 points)
('BADGE_ACHIEVER', 'badge', 'Achiever', 'Awarded for earning 1500 achievement points. A dedicated golfer through and through.', 'shield-star', 1500, 1500),

-- Badge: Legend (3000 points)
('BADGE_LEGEND', 'badge', 'Legend', 'Awarded for earning 3000 achievement points. Your name will be remembered on the fairways.', 'trophy-award', 3000, 3000),

-- Badge: Champion (5000 points)
('BADGE_CHAMPION', 'badge', 'Champion', 'Awarded for earning 5000 achievement points. A true master of the game.', 'crown', 5000, 5000),

-- =====================================================
-- FRAMES
-- Border/frame around player avatar
-- Metallic progression: Bronze → Silver → Gold → Platinum → Diamond
-- =====================================================

-- Frame: Bronze (250 points)
('FRAME_BRONZE', 'frame', 'Bronze', 'A bronze frame for your avatar. The first step on the path to greatness.', 'hexagon-outline', 250, 250),

-- Frame: Silver (1000 points)
('FRAME_SILVER', 'frame', 'Silver', 'A silver frame for your avatar. You''re making your mark.', 'hexagon-slice-4', 1000, 1000),

-- Frame: Gold (2000 points)
('FRAME_GOLD', 'frame', 'Gold', 'A prestigious gold frame for your avatar. Excellence recognized.', 'hexagon-slice-6', 2000, 2000),

-- Frame: Platinum (4000 points)
('FRAME_PLATINUM', 'frame', 'Platinum', 'A rare platinum frame for your avatar. Reserved for the elite.', 'octagon', 4000, 4000),

-- Frame: Diamond (6000 points)
('FRAME_DIAMOND', 'frame', 'Diamond', 'The legendary diamond frame. The pinnacle of achievement.', 'octagram', 6000, 6000),

-- =====================================================
-- TITLES
-- Text displayed below player name
-- Progression themed around golf mastery
-- =====================================================

-- Title: Weekend Warrior (500 points)
('TITLE_WEEKEND_WARRIOR', 'title', 'Weekend Warrior', 'Display "Weekend Warrior" below your name. For those who never miss a weekend round.', 'golf', 500, 500),

-- Title: Course Conqueror (1500 points)
('TITLE_COURSE_CONQUEROR', 'title', 'Course Conqueror', 'Display "Course Conqueror" below your name. You''ve mastered many fairways.', 'flag-checkered', 1500, 1500),

-- Title: Golf Legend (3000 points)
('TITLE_GOLF_LEGEND', 'title', 'Golf Legend', 'Display "Golf Legend" below your name. Your skills are the stuff of legends.', 'trophy', 3000, 3000),

-- Title: Hall of Famer (5000 points)
('TITLE_HALL_OF_FAMER', 'title', 'Hall of Famer', 'Display "Hall of Famer" below your name. A permanent place among the greats.', 'star-circle', 5000, 5000),

-- Title: The Greatest (10000 points)
('TITLE_THE_GREATEST', 'title', 'The Greatest', 'Display "The Greatest" below your name. The ultimate recognition. Untouchable.', 'crown-circle', 10000, 10000);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify counts
DO $$
DECLARE
  badge_count INTEGER;
  frame_count INTEGER;
  title_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO badge_count FROM cosmetic_definitions WHERE type = 'badge';
  SELECT COUNT(*) INTO frame_count FROM cosmetic_definitions WHERE type = 'frame';
  SELECT COUNT(*) INTO title_count FROM cosmetic_definitions WHERE type = 'title';

  RAISE NOTICE 'Cosmetics seeded: % badges, % frames, % titles', badge_count, frame_count, title_count;

  IF badge_count != 5 OR frame_count != 5 OR title_count != 5 THEN
    RAISE WARNING 'Expected 5 of each cosmetic type, but got badges=%, frames=%, titles=%', badge_count, frame_count, title_count;
  END IF;
END;
$$;

-- =====================================================
-- SEED COMPLETE
-- =====================================================
-- Summary:
--
-- BADGES (5):
--   BADGE_ROOKIE        - 100 pts  - medal-outline
--   BADGE_RISING_STAR   - 750 pts  - star-rising
--   BADGE_ACHIEVER      - 1500 pts - shield-star
--   BADGE_LEGEND        - 3000 pts - trophy-award
--   BADGE_CHAMPION      - 5000 pts - crown
--
-- FRAMES (5):
--   FRAME_BRONZE        - 250 pts  - hexagon-outline
--   FRAME_SILVER        - 1000 pts - hexagon-slice-4
--   FRAME_GOLD          - 2000 pts - hexagon-slice-6
--   FRAME_PLATINUM      - 4000 pts - octagon
--   FRAME_DIAMOND       - 6000 pts - octagram
--
-- TITLES (5):
--   TITLE_WEEKEND_WARRIOR  - 500 pts   - golf
--   TITLE_COURSE_CONQUEROR - 1500 pts  - flag-checkered
--   TITLE_GOLF_LEGEND      - 3000 pts  - trophy
--   TITLE_HALL_OF_FAMER    - 5000 pts  - star-circle
--   TITLE_THE_GREATEST     - 10000 pts - crown-circle
-- =====================================================
