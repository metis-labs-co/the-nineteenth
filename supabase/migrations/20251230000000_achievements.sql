-- =====================================================
-- Achievements System
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration creates the achievements/rewards system for:
-- - Achievement definitions (seeded, admin-managed)
-- - Player achievements (earned achievements)
-- - Achievement progress tracking (real-time progress)
--
-- Features:
-- - Tiered achievements (1-6 tiers)
-- - Categories: rounds, game_types, scoring, competitions, social, courses, match_play, streaks, milestones
-- - Rarity system: common, uncommon, rare, epic, legendary
-- - Points system for leaderboards and cosmetic unlocks
-- - Hidden/secret achievements
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

-- Achievement categories
CREATE TYPE achievement_category AS ENUM (
  'rounds',
  'game_types',
  'scoring',
  'competitions',
  'social',
  'courses',
  'match_play',
  'streaks',
  'milestones'
);

-- Achievement rarity levels
CREATE TYPE achievement_rarity AS ENUM (
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary'
);

-- =====================================================
-- TABLE: achievement_definitions
-- =====================================================
-- Master table for all achievement definitions.
-- Seeded with initial achievements, can be updated by admins.
-- =====================================================

CREATE TABLE achievement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Unique identifier (e.g., 'ROUND_VETERAN_3', 'BIRDIE_HUNTER_5')
  code TEXT UNIQUE NOT NULL,

  -- Achievement category for filtering and organization
  category achievement_category NOT NULL,

  -- Display information
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Material icon name (e.g., 'trophy', 'star', 'golf-course')

  -- Tier for progressive achievements (1-6)
  tier INTEGER NOT NULL DEFAULT 1 CHECK (tier >= 1 AND tier <= 6),

  -- Threshold required to unlock (e.g., 10 rounds, 25 birdies)
  threshold INTEGER NOT NULL CHECK (threshold > 0),

  -- Parent achievement code for tiered progressions (e.g., 'ROUND_VETERAN' for all tiers)
  base_achievement TEXT NULL,

  -- Points awarded when earned
  points INTEGER NOT NULL DEFAULT 10 CHECK (points >= 0),

  -- Rarity level for display styling and sorting
  rarity achievement_rarity NOT NULL DEFAULT 'common',

  -- Hidden/secret achievements (not shown until earned)
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure base_achievement references a valid code (will be validated by app layer)
  CONSTRAINT achievement_tier_valid CHECK (
    (tier = 1 AND base_achievement IS NULL) OR
    (tier > 1 AND base_achievement IS NOT NULL)
  )
);

-- =====================================================
-- TABLE: player_achievements
-- =====================================================
-- Tracks which achievements each player has earned.
-- One row per player per achievement.
-- =====================================================

CREATE TABLE player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Player who earned the achievement
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Achievement that was earned
  achievement_id UUID NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,

  -- When the achievement was earned
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Progress value when earned (for historical tracking)
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),

  -- Whether the user has been notified about earning this
  notified BOOLEAN NOT NULL DEFAULT FALSE,

  -- Each player can only earn each achievement once
  CONSTRAINT player_achievements_unique UNIQUE (player_id, achievement_id)
);

-- =====================================================
-- TABLE: achievement_progress
-- =====================================================
-- Tracks current progress toward achievements.
-- Uses base_achievement code to track progress across tiers.
-- =====================================================

CREATE TABLE achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Player whose progress is being tracked
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Base achievement code (e.g., 'ROUND_VETERAN', 'BIRDIE_HUNTER')
  achievement_code TEXT NOT NULL,

  -- Current progress value
  current_value INTEGER NOT NULL DEFAULT 0 CHECK (current_value >= 0),

  -- Last time progress was updated
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each player has one progress row per base achievement
  CONSTRAINT achievement_progress_unique UNIQUE (player_id, achievement_code)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Achievement definitions indexes
CREATE INDEX idx_achievement_definitions_category ON achievement_definitions(category);
CREATE INDEX idx_achievement_definitions_base ON achievement_definitions(base_achievement) WHERE base_achievement IS NOT NULL;
CREATE INDEX idx_achievement_definitions_tier ON achievement_definitions(tier);
CREATE INDEX idx_achievement_definitions_rarity ON achievement_definitions(rarity);

-- Player achievements indexes
CREATE INDEX idx_player_achievements_player ON player_achievements(player_id);
CREATE INDEX idx_player_achievements_achievement ON player_achievements(achievement_id);
CREATE INDEX idx_player_achievements_earned_at ON player_achievements(earned_at DESC);
CREATE INDEX idx_player_achievements_notified ON player_achievements(player_id, notified) WHERE notified = FALSE;

-- Achievement progress indexes
CREATE INDEX idx_achievement_progress_player ON achievement_progress(player_id);
CREATE INDEX idx_achievement_progress_code ON achievement_progress(achievement_code);
CREATE INDEX idx_achievement_progress_player_code ON achievement_progress(player_id, achievement_code);

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================

-- Use existing trigger function if it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;
  END IF;
END;
$$;

-- Update last_updated on achievement_progress changes
CREATE OR REPLACE FUNCTION update_achievement_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_achievement_progress_last_updated
  BEFORE UPDATE ON achievement_progress
  FOR EACH ROW EXECUTE FUNCTION update_achievement_progress_timestamp();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_progress ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS: achievement_definitions
-- =====================================================
-- Achievement definitions are public (anyone can read)

CREATE POLICY "Anyone can read achievement definitions"
  ON achievement_definitions FOR SELECT
  USING (TRUE);

-- Only service role can modify definitions
CREATE POLICY "Service role can manage achievement definitions"
  ON achievement_definitions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- RLS: player_achievements
-- =====================================================
-- Players can see their own achievements
-- Friends can see each other's achievements (public visibility)
-- Competition members can see each other's achievements

-- Players can view their own achievements
CREATE POLICY "Players can view their own achievements"
  ON player_achievements FOR SELECT
  USING (player_id = auth.uid());

-- Friends can view each other's achievements
CREATE POLICY "Friends can view achievements"
  ON player_achievements FOR SELECT
  USING (
    player_id IN (
      SELECT
        CASE
          WHEN requester_id = auth.uid() THEN addressee_id
          ELSE requester_id
        END
      FROM friendships
      WHERE (requester_id = auth.uid() OR addressee_id = auth.uid())
        AND status = 'accepted'
    )
  );

-- Competition members can view each other's achievements
CREATE POLICY "Competition members can view achievements"
  ON player_achievements FOR SELECT
  USING (
    player_id IN (
      SELECT cp2.player_id
      FROM competition_players cp1
      JOIN competition_players cp2 ON cp1.competition_id = cp2.competition_id
      WHERE cp1.player_id = auth.uid()
        AND cp1.status = 'accepted'
        AND cp2.status = 'accepted'
    )
  );

-- Players can insert their own achievements (earned through app logic)
CREATE POLICY "Players can insert own achievements"
  ON player_achievements FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- Players can update their own achievements (e.g., mark as notified)
CREATE POLICY "Players can update own achievements"
  ON player_achievements FOR UPDATE
  USING (player_id = auth.uid());

-- Service role has full access
CREATE POLICY "Service role can manage player achievements"
  ON player_achievements FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- RLS: achievement_progress
-- =====================================================
-- Players can only see and modify their own progress

CREATE POLICY "Players can view their own progress"
  ON achievement_progress FOR SELECT
  USING (player_id = auth.uid());

CREATE POLICY "Players can insert their own progress"
  ON achievement_progress FOR INSERT
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "Players can update their own progress"
  ON achievement_progress FOR UPDATE
  USING (player_id = auth.uid());

CREATE POLICY "Players can delete their own progress"
  ON achievement_progress FOR DELETE
  USING (player_id = auth.uid());

-- Service role has full access
CREATE POLICY "Service role can manage achievement progress"
  ON achievement_progress FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- VIEW: achievement_leaderboard
-- =====================================================
-- Aggregated view for achievement leaderboard

CREATE OR REPLACE VIEW achievement_leaderboard AS
SELECT
  p.id AS player_id,
  p.name,
  p.photo_url,
  COALESCE(SUM(ad.points), 0)::INTEGER AS total_points,
  COUNT(pa.id)::INTEGER AS achievements_earned,
  MAX(pa.earned_at) AS last_achievement_at
FROM players p
LEFT JOIN player_achievements pa ON p.id = pa.player_id
LEFT JOIN achievement_definitions ad ON pa.achievement_id = ad.id
WHERE p.is_placeholder = FALSE
GROUP BY p.id, p.name, p.photo_url
ORDER BY total_points DESC, achievements_earned DESC;

-- =====================================================
-- FUNCTION: Get achievement leaderboard with scope
-- =====================================================

CREATE OR REPLACE FUNCTION get_achievement_leaderboard(
  p_scope TEXT,
  p_user_id UUID,
  p_competition_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  rank BIGINT,
  player_id UUID,
  name TEXT,
  photo_url TEXT,
  total_points INTEGER,
  achievements_earned INTEGER,
  last_achievement_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH leaderboard_base AS (
    SELECT
      p.id AS player_id,
      p.name,
      p.photo_url,
      COALESCE(SUM(ad.points), 0)::INTEGER AS total_points,
      COUNT(pa.id)::INTEGER AS achievements_earned,
      MAX(pa.earned_at) AS last_achievement_at
    FROM players p
    LEFT JOIN player_achievements pa ON p.id = pa.player_id
    LEFT JOIN achievement_definitions ad ON pa.achievement_id = ad.id
    WHERE p.is_placeholder = FALSE
    GROUP BY p.id, p.name, p.photo_url
  ),
  filtered AS (
    SELECT lb.*
    FROM leaderboard_base lb
    WHERE
      CASE p_scope
        WHEN 'global' THEN TRUE
        WHEN 'friends' THEN
          lb.player_id = p_user_id OR
          lb.player_id IN (
            SELECT
              CASE
                WHEN requester_id = p_user_id THEN addressee_id
                ELSE requester_id
              END
            FROM friendships
            WHERE (requester_id = p_user_id OR addressee_id = p_user_id)
              AND status = 'accepted'
          )
        WHEN 'competition' THEN
          lb.player_id IN (
            SELECT cp.player_id
            FROM competition_players cp
            WHERE cp.competition_id = p_competition_id
              AND cp.status = 'accepted'
          )
        ELSE FALSE
      END
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY f.total_points DESC, f.achievements_earned DESC) AS rank,
    f.player_id,
    f.name,
    f.photo_url,
    f.total_points,
    f.achievements_earned,
    f.last_achievement_at
  FROM filtered f
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get player achievement summary
-- =====================================================

CREATE OR REPLACE FUNCTION get_player_achievement_summary(p_player_id UUID)
RETURNS TABLE (
  total_earned INTEGER,
  total_available INTEGER,
  total_points INTEGER,
  completion_percentage NUMERIC,
  recent_achievements JSONB,
  by_category JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH earned AS (
    SELECT
      pa.achievement_id,
      pa.earned_at,
      ad.category,
      ad.points,
      ad.name,
      ad.icon
    FROM player_achievements pa
    JOIN achievement_definitions ad ON pa.achievement_id = ad.id
    WHERE pa.player_id = p_player_id
  ),
  available AS (
    SELECT
      category,
      COUNT(*)::INTEGER as count
    FROM achievement_definitions
    WHERE is_hidden = FALSE
    GROUP BY category
  ),
  earned_by_category AS (
    SELECT
      category,
      COUNT(*)::INTEGER as count
    FROM earned
    GROUP BY category
  ),
  recent AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'achievement_id', achievement_id,
        'name', name,
        'icon', icon,
        'earned_at', earned_at,
        'points', points
      ) ORDER BY earned_at DESC
    ) as data
    FROM (
      SELECT * FROM earned ORDER BY earned_at DESC LIMIT 5
    ) r
  ),
  category_summary AS (
    SELECT jsonb_object_agg(
      a.category::TEXT,
      jsonb_build_object(
        'earned', COALESCE(e.count, 0),
        'total', a.count
      )
    ) as data
    FROM available a
    LEFT JOIN earned_by_category e ON a.category = e.category
  )
  SELECT
    (SELECT COUNT(*)::INTEGER FROM earned) as total_earned,
    (SELECT COUNT(*)::INTEGER FROM achievement_definitions WHERE is_hidden = FALSE) as total_available,
    (SELECT COALESCE(SUM(points), 0)::INTEGER FROM earned) as total_points,
    CASE
      WHEN (SELECT COUNT(*) FROM achievement_definitions WHERE is_hidden = FALSE) = 0 THEN 0
      ELSE ROUND(
        (SELECT COUNT(*)::NUMERIC FROM earned) /
        (SELECT COUNT(*)::NUMERIC FROM achievement_definitions WHERE is_hidden = FALSE) * 100,
        1
      )
    END as completion_percentage,
    COALESCE((SELECT data FROM recent), '[]'::JSONB) as recent_achievements,
    COALESCE((SELECT data FROM category_summary), '{}'::JSONB) as by_category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Upsert achievement progress
-- =====================================================

CREATE OR REPLACE FUNCTION upsert_achievement_progress(
  p_player_id UUID,
  p_achievement_code TEXT,
  p_new_value INTEGER
)
RETURNS achievement_progress AS $$
DECLARE
  v_result achievement_progress;
BEGIN
  INSERT INTO achievement_progress (player_id, achievement_code, current_value)
  VALUES (p_player_id, p_achievement_code, p_new_value)
  ON CONFLICT (player_id, achievement_code)
  DO UPDATE SET
    current_value = p_new_value,
    last_updated = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Increment achievement progress
-- =====================================================

CREATE OR REPLACE FUNCTION increment_achievement_progress(
  p_player_id UUID,
  p_achievement_code TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS achievement_progress AS $$
DECLARE
  v_result achievement_progress;
BEGIN
  INSERT INTO achievement_progress (player_id, achievement_code, current_value)
  VALUES (p_player_id, p_achievement_code, p_increment)
  ON CONFLICT (player_id, achievement_code)
  DO UPDATE SET
    current_value = achievement_progress.current_value + p_increment,
    last_updated = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Award achievement
-- =====================================================

CREATE OR REPLACE FUNCTION award_achievement(
  p_player_id UUID,
  p_achievement_id UUID,
  p_progress INTEGER DEFAULT 0
)
RETURNS player_achievements AS $$
DECLARE
  v_result player_achievements;
BEGIN
  INSERT INTO player_achievements (player_id, achievement_id, progress)
  VALUES (p_player_id, p_achievement_id, p_progress)
  ON CONFLICT (player_id, achievement_id) DO NOTHING
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get achievements with progress for player
-- =====================================================

CREATE OR REPLACE FUNCTION get_achievements_with_progress(p_player_id UUID)
RETURNS TABLE (
  id UUID,
  code TEXT,
  category achievement_category,
  name TEXT,
  description TEXT,
  icon TEXT,
  tier INTEGER,
  threshold INTEGER,
  base_achievement TEXT,
  points INTEGER,
  rarity achievement_rarity,
  is_hidden BOOLEAN,
  earned BOOLEAN,
  earned_at TIMESTAMPTZ,
  current_progress INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ad.id,
    ad.code,
    ad.category,
    ad.name,
    ad.description,
    ad.icon,
    ad.tier,
    ad.threshold,
    ad.base_achievement,
    ad.points,
    ad.rarity,
    ad.is_hidden,
    (pa.id IS NOT NULL) AS earned,
    pa.earned_at,
    COALESCE(
      ap.current_value,
      CASE WHEN pa.id IS NOT NULL THEN ad.threshold ELSE 0 END
    )::INTEGER AS current_progress
  FROM achievement_definitions ad
  LEFT JOIN player_achievements pa ON ad.id = pa.achievement_id AND pa.player_id = p_player_id
  LEFT JOIN achievement_progress ap ON
    COALESCE(ad.base_achievement, ad.code) = ap.achievement_code
    AND ap.player_id = p_player_id
  WHERE ad.is_hidden = FALSE OR pa.id IS NOT NULL
  ORDER BY ad.category, ad.tier, ad.threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE achievement_definitions IS 'Master table of all achievement definitions with tiers, thresholds, and points';
COMMENT ON COLUMN achievement_definitions.code IS 'Unique code like ROUND_VETERAN_3 (base + tier) or EARLY_ADOPTER (special)';
COMMENT ON COLUMN achievement_definitions.category IS 'Achievement category for filtering: rounds, scoring, social, etc.';
COMMENT ON COLUMN achievement_definitions.tier IS 'Tier level 1-6 for progressive achievements';
COMMENT ON COLUMN achievement_definitions.threshold IS 'Number required to unlock (e.g., 25 rounds, 100 birdies)';
COMMENT ON COLUMN achievement_definitions.base_achievement IS 'Parent achievement code for tiered progressions (NULL for tier 1)';
COMMENT ON COLUMN achievement_definitions.points IS 'Points awarded when achievement is earned';
COMMENT ON COLUMN achievement_definitions.rarity IS 'Rarity level: common (10pts), uncommon (20pts), rare (50pts), epic (100pts), legendary (250pts)';
COMMENT ON COLUMN achievement_definitions.is_hidden IS 'Secret achievements not shown until earned';

COMMENT ON TABLE player_achievements IS 'Tracks earned achievements per player';
COMMENT ON COLUMN player_achievements.progress IS 'Progress value when achievement was earned (historical tracking)';
COMMENT ON COLUMN player_achievements.notified IS 'Whether user has been shown the unlock notification';

COMMENT ON TABLE achievement_progress IS 'Real-time progress tracking toward achievements';
COMMENT ON COLUMN achievement_progress.achievement_code IS 'Base achievement code (e.g., ROUND_VETERAN, not ROUND_VETERAN_3)';
COMMENT ON COLUMN achievement_progress.current_value IS 'Current progress toward achievement thresholds';

-- =====================================================
-- COSMETICS SYSTEM
-- =====================================================
-- Cosmetics are unlockable rewards based on achievement points.
-- Types: badges (displayed next to name), frames (around avatar), titles (below name)
-- Players can equip one of each type to customize their profile.
-- =====================================================

-- =====================================================
-- ENUM: cosmetic_type
-- =====================================================

CREATE TYPE cosmetic_type AS ENUM ('badge', 'frame', 'title');

-- =====================================================
-- TABLE: cosmetic_definitions
-- =====================================================
-- Master table of all cosmetic rewards.
-- Unlocked when player reaches required points threshold.
-- =====================================================

CREATE TABLE cosmetic_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Unique code identifier (e.g., 'BADGE_ROOKIE', 'FRAME_GOLD', 'TITLE_LEGEND')
  code TEXT UNIQUE NOT NULL,

  -- Type of cosmetic
  type cosmetic_type NOT NULL,

  -- Display information
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Material icon name or image reference

  -- Points required to unlock this cosmetic
  points_required INTEGER NOT NULL CHECK (points_required >= 0),

  -- Display order within type (lower = first)
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: player_cosmetics
-- =====================================================
-- Tracks which cosmetics each player has unlocked.
-- =====================================================

CREATE TABLE player_cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Player who unlocked the cosmetic
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Cosmetic that was unlocked
  cosmetic_id UUID NOT NULL REFERENCES cosmetic_definitions(id) ON DELETE CASCADE,

  -- When the cosmetic was unlocked
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each player can only unlock each cosmetic once
  CONSTRAINT player_cosmetics_unique UNIQUE (player_id, cosmetic_id)
);

-- =====================================================
-- ALTER TABLE: players - Add equipped cosmetic columns
-- =====================================================
-- Players can equip one badge, one frame, and one title.
-- =====================================================

ALTER TABLE players
  ADD COLUMN equipped_badge_id UUID REFERENCES cosmetic_definitions(id) ON DELETE SET NULL,
  ADD COLUMN equipped_frame_id UUID REFERENCES cosmetic_definitions(id) ON DELETE SET NULL,
  ADD COLUMN equipped_title_id UUID REFERENCES cosmetic_definitions(id) ON DELETE SET NULL;

-- =====================================================
-- INDEXES: cosmetic_definitions
-- =====================================================

CREATE INDEX idx_cosmetic_definitions_type ON cosmetic_definitions(type);
CREATE INDEX idx_cosmetic_definitions_points ON cosmetic_definitions(points_required);
CREATE INDEX idx_cosmetic_definitions_type_sort ON cosmetic_definitions(type, sort_order);

-- =====================================================
-- INDEXES: player_cosmetics
-- =====================================================

CREATE INDEX idx_player_cosmetics_player ON player_cosmetics(player_id);
CREATE INDEX idx_player_cosmetics_cosmetic ON player_cosmetics(cosmetic_id);
CREATE INDEX idx_player_cosmetics_unlocked ON player_cosmetics(unlocked_at DESC);

-- =====================================================
-- INDEXES: players equipped columns
-- =====================================================

CREATE INDEX idx_players_equipped_badge ON players(equipped_badge_id) WHERE equipped_badge_id IS NOT NULL;
CREATE INDEX idx_players_equipped_frame ON players(equipped_frame_id) WHERE equipped_frame_id IS NOT NULL;
CREATE INDEX idx_players_equipped_title ON players(equipped_title_id) WHERE equipped_title_id IS NOT NULL;

-- =====================================================
-- ROW LEVEL SECURITY: cosmetic_definitions
-- =====================================================
-- Cosmetic definitions are public (anyone can read)

ALTER TABLE cosmetic_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cosmetic definitions"
  ON cosmetic_definitions FOR SELECT
  USING (TRUE);

-- Only service role can modify definitions
CREATE POLICY "Service role can manage cosmetic definitions"
  ON cosmetic_definitions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- ROW LEVEL SECURITY: player_cosmetics
-- =====================================================
-- Players can see their own unlocked cosmetics
-- Friends and competition members can see each other's cosmetics

ALTER TABLE player_cosmetics ENABLE ROW LEVEL SECURITY;

-- Players can view their own cosmetics
CREATE POLICY "Players can view their own cosmetics"
  ON player_cosmetics FOR SELECT
  USING (player_id = auth.uid());

-- Friends can view each other's cosmetics
CREATE POLICY "Friends can view cosmetics"
  ON player_cosmetics FOR SELECT
  USING (
    player_id IN (
      SELECT
        CASE
          WHEN requester_id = auth.uid() THEN addressee_id
          ELSE requester_id
        END
      FROM friendships
      WHERE (requester_id = auth.uid() OR addressee_id = auth.uid())
        AND status = 'accepted'
    )
  );

-- Competition members can view each other's cosmetics
CREATE POLICY "Competition members can view cosmetics"
  ON player_cosmetics FOR SELECT
  USING (
    player_id IN (
      SELECT cp2.player_id
      FROM competition_players cp1
      JOIN competition_players cp2 ON cp1.competition_id = cp2.competition_id
      WHERE cp1.player_id = auth.uid()
        AND cp1.status = 'accepted'
        AND cp2.status = 'accepted'
    )
  );

-- Players can insert their own cosmetics (unlocked through app logic)
CREATE POLICY "Players can insert own cosmetics"
  ON player_cosmetics FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- Service role has full access
CREATE POLICY "Service role can manage player cosmetics"
  ON player_cosmetics FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- FUNCTION: Get player equipped cosmetics
-- =====================================================

CREATE OR REPLACE FUNCTION get_player_equipped_cosmetics(p_player_id UUID)
RETURNS TABLE (
  badge_id UUID,
  badge_code TEXT,
  badge_name TEXT,
  badge_icon TEXT,
  frame_id UUID,
  frame_code TEXT,
  frame_name TEXT,
  frame_icon TEXT,
  title_id UUID,
  title_code TEXT,
  title_name TEXT,
  title_icon TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS badge_id,
    b.code AS badge_code,
    b.name AS badge_name,
    b.icon AS badge_icon,
    f.id AS frame_id,
    f.code AS frame_code,
    f.name AS frame_name,
    f.icon AS frame_icon,
    t.id AS title_id,
    t.code AS title_code,
    t.name AS title_name,
    t.icon AS title_icon
  FROM players p
  LEFT JOIN cosmetic_definitions b ON p.equipped_badge_id = b.id
  LEFT JOIN cosmetic_definitions f ON p.equipped_frame_id = f.id
  LEFT JOIN cosmetic_definitions t ON p.equipped_title_id = t.id
  WHERE p.id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get unlocked cosmetics for player
-- =====================================================

CREATE OR REPLACE FUNCTION get_player_unlocked_cosmetics(p_player_id UUID)
RETURNS TABLE (
  id UUID,
  code TEXT,
  type cosmetic_type,
  name TEXT,
  description TEXT,
  icon TEXT,
  points_required INTEGER,
  sort_order INTEGER,
  unlocked_at TIMESTAMPTZ,
  is_equipped BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cd.id,
    cd.code,
    cd.type,
    cd.name,
    cd.description,
    cd.icon,
    cd.points_required,
    cd.sort_order,
    pc.unlocked_at,
    CASE
      WHEN cd.type = 'badge' AND p.equipped_badge_id = cd.id THEN TRUE
      WHEN cd.type = 'frame' AND p.equipped_frame_id = cd.id THEN TRUE
      WHEN cd.type = 'title' AND p.equipped_title_id = cd.id THEN TRUE
      ELSE FALSE
    END AS is_equipped
  FROM player_cosmetics pc
  JOIN cosmetic_definitions cd ON pc.cosmetic_id = cd.id
  JOIN players p ON pc.player_id = p.id
  WHERE pc.player_id = p_player_id
  ORDER BY cd.type, cd.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get all cosmetics with unlock status
-- =====================================================

CREATE OR REPLACE FUNCTION get_cosmetics_with_status(p_player_id UUID)
RETURNS TABLE (
  id UUID,
  code TEXT,
  type cosmetic_type,
  name TEXT,
  description TEXT,
  icon TEXT,
  points_required INTEGER,
  sort_order INTEGER,
  is_unlocked BOOLEAN,
  unlocked_at TIMESTAMPTZ,
  is_equipped BOOLEAN
) AS $$
DECLARE
  v_total_points INTEGER;
BEGIN
  -- Get player's total achievement points
  SELECT COALESCE(SUM(ad.points), 0)::INTEGER INTO v_total_points
  FROM player_achievements pa
  JOIN achievement_definitions ad ON pa.achievement_id = ad.id
  WHERE pa.player_id = p_player_id;

  RETURN QUERY
  SELECT
    cd.id,
    cd.code,
    cd.type,
    cd.name,
    cd.description,
    cd.icon,
    cd.points_required,
    cd.sort_order,
    (pc.id IS NOT NULL) AS is_unlocked,
    pc.unlocked_at,
    CASE
      WHEN cd.type = 'badge' AND p.equipped_badge_id = cd.id THEN TRUE
      WHEN cd.type = 'frame' AND p.equipped_frame_id = cd.id THEN TRUE
      WHEN cd.type = 'title' AND p.equipped_title_id = cd.id THEN TRUE
      ELSE FALSE
    END AS is_equipped
  FROM cosmetic_definitions cd
  LEFT JOIN player_cosmetics pc ON cd.id = pc.cosmetic_id AND pc.player_id = p_player_id
  LEFT JOIN players p ON p.id = p_player_id
  ORDER BY cd.type, cd.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Equip cosmetic
-- =====================================================

CREATE OR REPLACE FUNCTION equip_cosmetic(
  p_player_id UUID,
  p_cosmetic_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_cosmetic_type cosmetic_type;
  v_is_unlocked BOOLEAN;
BEGIN
  -- Check if player has unlocked this cosmetic
  SELECT EXISTS (
    SELECT 1 FROM player_cosmetics
    WHERE player_id = p_player_id AND cosmetic_id = p_cosmetic_id
  ) INTO v_is_unlocked;

  IF NOT v_is_unlocked THEN
    RAISE EXCEPTION 'Cosmetic not unlocked by player';
  END IF;

  -- Get cosmetic type
  SELECT type INTO v_cosmetic_type
  FROM cosmetic_definitions
  WHERE id = p_cosmetic_id;

  IF v_cosmetic_type IS NULL THEN
    RAISE EXCEPTION 'Cosmetic not found';
  END IF;

  -- Equip based on type
  CASE v_cosmetic_type
    WHEN 'badge' THEN
      UPDATE players SET equipped_badge_id = p_cosmetic_id WHERE id = p_player_id;
    WHEN 'frame' THEN
      UPDATE players SET equipped_frame_id = p_cosmetic_id WHERE id = p_player_id;
    WHEN 'title' THEN
      UPDATE players SET equipped_title_id = p_cosmetic_id WHERE id = p_player_id;
  END CASE;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Unequip cosmetic
-- =====================================================

CREATE OR REPLACE FUNCTION unequip_cosmetic(
  p_player_id UUID,
  p_cosmetic_type cosmetic_type
)
RETURNS BOOLEAN AS $$
BEGIN
  CASE p_cosmetic_type
    WHEN 'badge' THEN
      UPDATE players SET equipped_badge_id = NULL WHERE id = p_player_id;
    WHEN 'frame' THEN
      UPDATE players SET equipped_frame_id = NULL WHERE id = p_player_id;
    WHEN 'title' THEN
      UPDATE players SET equipped_title_id = NULL WHERE id = p_player_id;
  END CASE;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Unlock cosmetic for player
-- =====================================================

CREATE OR REPLACE FUNCTION unlock_cosmetic(
  p_player_id UUID,
  p_cosmetic_id UUID
)
RETURNS player_cosmetics AS $$
DECLARE
  v_result player_cosmetics;
BEGIN
  INSERT INTO player_cosmetics (player_id, cosmetic_id)
  VALUES (p_player_id, p_cosmetic_id)
  ON CONFLICT (player_id, cosmetic_id) DO NOTHING
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Check and unlock cosmetics based on points
-- =====================================================

CREATE OR REPLACE FUNCTION check_cosmetic_unlocks(p_player_id UUID)
RETURNS TABLE (
  cosmetic_id UUID,
  code TEXT,
  name TEXT,
  type cosmetic_type,
  points_required INTEGER
) AS $$
DECLARE
  v_total_points INTEGER;
BEGIN
  -- Get player's total achievement points
  SELECT COALESCE(SUM(ad.points), 0)::INTEGER INTO v_total_points
  FROM player_achievements pa
  JOIN achievement_definitions ad ON pa.achievement_id = ad.id
  WHERE pa.player_id = p_player_id;

  -- Find and unlock any cosmetics the player qualifies for but hasn't unlocked
  RETURN QUERY
  WITH unlockable AS (
    SELECT cd.id, cd.code, cd.name, cd.type, cd.points_required
    FROM cosmetic_definitions cd
    WHERE cd.points_required <= v_total_points
      AND NOT EXISTS (
        SELECT 1 FROM player_cosmetics pc
        WHERE pc.player_id = p_player_id AND pc.cosmetic_id = cd.id
      )
  ),
  newly_unlocked AS (
    INSERT INTO player_cosmetics (player_id, cosmetic_id)
    SELECT p_player_id, u.id
    FROM unlockable u
    ON CONFLICT (player_id, cosmetic_id) DO NOTHING
    RETURNING cosmetic_id
  )
  SELECT u.id, u.code, u.name, u.type, u.points_required
  FROM unlockable u
  JOIN newly_unlocked nu ON u.id = nu.cosmetic_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATE: achievement_leaderboard view to include cosmetics
-- =====================================================

DROP VIEW IF EXISTS achievement_leaderboard;

CREATE OR REPLACE VIEW achievement_leaderboard AS
SELECT
  p.id AS player_id,
  p.name,
  p.photo_url,
  p.equipped_badge_id,
  p.equipped_frame_id,
  p.equipped_title_id,
  COALESCE(SUM(ad.points), 0)::INTEGER AS total_points,
  COUNT(pa.id)::INTEGER AS achievements_earned,
  MAX(pa.earned_at) AS last_achievement_at
FROM players p
LEFT JOIN player_achievements pa ON p.id = pa.player_id
LEFT JOIN achievement_definitions ad ON pa.achievement_id = ad.id
WHERE p.is_placeholder = FALSE
GROUP BY p.id, p.name, p.photo_url, p.equipped_badge_id, p.equipped_frame_id, p.equipped_title_id
ORDER BY total_points DESC, achievements_earned DESC;

-- =====================================================
-- UPDATE: get_achievement_leaderboard function
-- =====================================================

DROP FUNCTION IF EXISTS get_achievement_leaderboard(TEXT, UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_achievement_leaderboard(
  p_scope TEXT,
  p_user_id UUID,
  p_competition_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  rank BIGINT,
  player_id UUID,
  name TEXT,
  photo_url TEXT,
  equipped_badge_id UUID,
  equipped_frame_id UUID,
  equipped_title_id UUID,
  total_points INTEGER,
  achievements_earned INTEGER,
  last_achievement_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH leaderboard_base AS (
    SELECT
      p.id AS player_id,
      p.name,
      p.photo_url,
      p.equipped_badge_id,
      p.equipped_frame_id,
      p.equipped_title_id,
      COALESCE(SUM(ad.points), 0)::INTEGER AS total_points,
      COUNT(pa.id)::INTEGER AS achievements_earned,
      MAX(pa.earned_at) AS last_achievement_at
    FROM players p
    LEFT JOIN player_achievements pa ON p.id = pa.player_id
    LEFT JOIN achievement_definitions ad ON pa.achievement_id = ad.id
    WHERE p.is_placeholder = FALSE
    GROUP BY p.id, p.name, p.photo_url, p.equipped_badge_id, p.equipped_frame_id, p.equipped_title_id
  ),
  filtered AS (
    SELECT lb.*
    FROM leaderboard_base lb
    WHERE
      CASE p_scope
        WHEN 'global' THEN TRUE
        WHEN 'friends' THEN
          lb.player_id = p_user_id OR
          lb.player_id IN (
            SELECT
              CASE
                WHEN requester_id = p_user_id THEN addressee_id
                ELSE requester_id
              END
            FROM friendships
            WHERE (requester_id = p_user_id OR addressee_id = p_user_id)
              AND status = 'accepted'
          )
        WHEN 'competition' THEN
          lb.player_id IN (
            SELECT cp.player_id
            FROM competition_players cp
            WHERE cp.competition_id = p_competition_id
              AND cp.status = 'accepted'
          )
        ELSE FALSE
      END
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY f.total_points DESC, f.achievements_earned DESC) AS rank,
    f.player_id,
    f.name,
    f.photo_url,
    f.equipped_badge_id,
    f.equipped_frame_id,
    f.equipped_title_id,
    f.total_points,
    f.achievements_earned,
    f.last_achievement_at
  FROM filtered f
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS: Cosmetics
-- =====================================================

COMMENT ON TABLE cosmetic_definitions IS 'Master table of all cosmetic rewards unlocked by achievement points';
COMMENT ON COLUMN cosmetic_definitions.code IS 'Unique code like BADGE_ROOKIE, FRAME_GOLD, TITLE_LEGEND';
COMMENT ON COLUMN cosmetic_definitions.type IS 'Type: badge (next to name), frame (around avatar), title (below name)';
COMMENT ON COLUMN cosmetic_definitions.points_required IS 'Achievement points needed to unlock this cosmetic';
COMMENT ON COLUMN cosmetic_definitions.sort_order IS 'Display order within type (lower = first)';

COMMENT ON TABLE player_cosmetics IS 'Tracks which cosmetics each player has unlocked';
COMMENT ON COLUMN player_cosmetics.unlocked_at IS 'When the cosmetic was unlocked';

COMMENT ON COLUMN players.equipped_badge_id IS 'Currently equipped badge cosmetic';
COMMENT ON COLUMN players.equipped_frame_id IS 'Currently equipped frame cosmetic';
COMMENT ON COLUMN players.equipped_title_id IS 'Currently equipped title cosmetic';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
