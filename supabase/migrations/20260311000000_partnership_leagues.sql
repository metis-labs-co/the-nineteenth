-- =====================================================
-- Partnership Leagues
-- Adds partnership league type: pairs compete with combined scores across courses
-- =====================================================

-- =====================================================
-- 1. EXTEND league_type CHECK CONSTRAINT
-- =====================================================

ALTER TABLE leagues DROP CONSTRAINT IF EXISTS leagues_league_type_check;
ALTER TABLE leagues ADD CONSTRAINT leagues_league_type_check
  CHECK (league_type IN ('ongoing', 'season', 'round_limit', 'ladder', 'eclectic', 'partnership'));

-- =====================================================
-- 2. ADD partnership_format COLUMN TO leagues TABLE
-- =====================================================

ALTER TABLE leagues ADD COLUMN IF NOT EXISTS partnership_format TEXT
  CHECK (partnership_format IS NULL OR partnership_format IN ('combined_stroke', 'scramble', 'shamble', 'best_ball'));

-- Partnership type requires a format
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'partnership_requires_format') THEN
    ALTER TABLE leagues ADD CONSTRAINT partnership_requires_format
      CHECK (league_type != 'partnership' OR partnership_format IS NOT NULL);
  END IF;
END $$;

-- =====================================================
-- 3. CREATE league_partnerships TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS league_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_1_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_2_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'dissolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Enforce player_1_id < player_2_id to prevent duplicate pairs
  CONSTRAINT partnership_ordered_players CHECK (player_1_id < player_2_id),
  -- Prevent same player in both slots
  CONSTRAINT partnership_different_players CHECK (player_1_id != player_2_id)
);

-- One active partnership per player per league
CREATE UNIQUE INDEX IF NOT EXISTS idx_partnership_player1_active
  ON league_partnerships(league_id, player_1_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_partnership_player2_active
  ON league_partnerships(league_id, player_2_id)
  WHERE status = 'active';

-- General indexes
CREATE INDEX IF NOT EXISTS idx_partnerships_league ON league_partnerships(league_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_status ON league_partnerships(league_id, status);

-- =====================================================
-- 4. CREATE partnership_rounds TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS partnership_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  partnership_id UUID NOT NULL REFERENCES league_partnerships(id) ON DELETE CASCADE,
  scorecard_1_id UUID NOT NULL REFERENCES scorecards(id),
  scorecard_2_id UUID REFERENCES scorecards(id), -- NULL for scramble (single team scorecard)
  player_1_id UUID NOT NULL REFERENCES players(id),
  player_2_id UUID NOT NULL REFERENCES players(id),
  course_id UUID REFERENCES courses(id),
  course_name TEXT NOT NULL,
  course_rating NUMERIC(4,1),
  slope_rating INTEGER,
  par INTEGER,
  combined_gross INTEGER NOT NULL CHECK (combined_gross > 0),
  target_score INTEGER NOT NULL CHECK (target_score > 0),
  difficulty_level TEXT NOT NULL
    CHECK (difficulty_level IN ('easy', 'standard', 'challenge', 'heroic')),
  target_differential INTEGER NOT NULL, -- combined_gross - target_score (can be negative)
  player_1_handicap NUMERIC(4,1),
  player_2_handicap NUMERIC(4,1),
  played_at DATE,
  tagged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for partnership_rounds
CREATE INDEX IF NOT EXISTS idx_partnership_rounds_league ON partnership_rounds(league_id);
CREATE INDEX IF NOT EXISTS idx_partnership_rounds_partnership ON partnership_rounds(partnership_id);
CREATE INDEX IF NOT EXISTS idx_partnership_rounds_course ON partnership_rounds(course_id);

-- Prevent same scorecard being tagged twice to same league
CREATE UNIQUE INDEX IF NOT EXISTS idx_partnership_rounds_sc1_league
  ON partnership_rounds(league_id, scorecard_1_id);

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE league_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_rounds ENABLE ROW LEVEL SECURITY;

-- LEAGUE PARTNERSHIPS

DROP POLICY IF EXISTS partnerships_select ON league_partnerships;
CREATE POLICY partnerships_select ON league_partnerships FOR SELECT
  USING (is_league_member(league_id, auth.uid()));

DROP POLICY IF EXISTS partnerships_insert ON league_partnerships;
CREATE POLICY partnerships_insert ON league_partnerships FOR INSERT
  WITH CHECK (
    auth.uid() IN (player_1_id, player_2_id)
    OR EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS partnerships_update ON league_partnerships;
CREATE POLICY partnerships_update ON league_partnerships FOR UPDATE
  USING (
    auth.uid() IN (player_1_id, player_2_id)
    OR EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND created_by = auth.uid())
  );

-- PARTNERSHIP ROUNDS

DROP POLICY IF EXISTS partnership_rounds_select ON partnership_rounds;
CREATE POLICY partnership_rounds_select ON partnership_rounds FOR SELECT
  USING (is_league_member(league_id, auth.uid()));

DROP POLICY IF EXISTS partnership_rounds_insert ON partnership_rounds;
CREATE POLICY partnership_rounds_insert ON partnership_rounds FOR INSERT
  WITH CHECK (
    auth.uid() IN (player_1_id, player_2_id)
    OR EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS partnership_rounds_delete ON partnership_rounds;
CREATE POLICY partnership_rounds_delete ON partnership_rounds FOR DELETE
  USING (
    auth.uid() IN (player_1_id, player_2_id)
    OR EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND created_by = auth.uid())
  );

-- =====================================================
-- 6. PARTNERSHIP LEADERBOARD FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_partnership_leaderboard(p_league_id UUID)
RETURNS TABLE (
  partnership_id UUID,
  partnership_name TEXT,
  player_1_id UUID,
  player_1_name TEXT,
  player_1_photo_url TEXT,
  player_2_id UUID,
  player_2_name TEXT,
  player_2_photo_url TEXT,
  rounds_played INTEGER,
  avg_target_differential NUMERIC(5,1),
  best_differential INTEGER,
  times_under_target INTEGER,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH partnership_stats AS (
    SELECT
      pr.partnership_id,
      COUNT(*)::INTEGER AS rounds_played,
      ROUND(AVG(pr.target_differential), 1) AS avg_target_differential,
      MIN(pr.target_differential)::INTEGER AS best_differential,
      COUNT(*) FILTER (WHERE pr.target_differential <= 0)::INTEGER AS times_under_target
    FROM partnership_rounds pr
    WHERE pr.league_id = p_league_id
    GROUP BY pr.partnership_id
  )
  SELECT
    lp.id AS partnership_id,
    lp.name AS partnership_name,
    lp.player_1_id,
    p1.name AS player_1_name,
    p1.photo_url AS player_1_photo_url,
    lp.player_2_id,
    p2.name AS player_2_name,
    p2.photo_url AS player_2_photo_url,
    COALESCE(ps.rounds_played, 0),
    ps.avg_target_differential,
    ps.best_differential,
    COALESCE(ps.times_under_target, 0),
    RANK() OVER (ORDER BY ps.avg_target_differential ASC NULLS LAST)::INTEGER AS rank
  FROM league_partnerships lp
  JOIN players p1 ON p1.id = lp.player_1_id
  JOIN players p2 ON p2.id = lp.player_2_id
  LEFT JOIN partnership_stats ps ON ps.partnership_id = lp.id
  WHERE lp.league_id = p_league_id
    AND lp.status = 'active'
  ORDER BY ps.avg_target_differential ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. PARTNERSHIP COURSE BESTS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_partnership_course_bests(p_league_id UUID)
RETURNS TABLE (
  partnership_id UUID,
  partnership_name TEXT,
  course_id UUID,
  course_name TEXT,
  best_combined_gross INTEGER,
  best_differential INTEGER,
  times_played INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.partnership_id,
    lp.name AS partnership_name,
    pr.course_id,
    pr.course_name,
    MIN(pr.combined_gross)::INTEGER AS best_combined_gross,
    MIN(pr.target_differential)::INTEGER AS best_differential,
    COUNT(*)::INTEGER AS times_played
  FROM partnership_rounds pr
  JOIN league_partnerships lp ON lp.id = pr.partnership_id
  WHERE pr.league_id = p_league_id
    AND lp.status = 'active'
  GROUP BY pr.partnership_id, lp.name, pr.course_id, pr.course_name
  ORDER BY pr.course_name, MIN(pr.target_differential) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. UPDATE SUBSCRIPTION TIERS
-- =====================================================

UPDATE tier_limits SET allowed_league_types = ARRAY['ongoing', 'season', 'round_limit', 'ladder', 'eclectic', 'partnership'] WHERE tier = 'premium';
UPDATE tier_limits SET allowed_league_types = ARRAY['ongoing', 'season', 'round_limit', 'ladder', 'eclectic', 'partnership'] WHERE tier = 'super_admin';

-- =====================================================
-- 9. COMMENTS
-- =====================================================

COMMENT ON TABLE league_partnerships IS 'Partnerships (pairs) within partnership leagues';
COMMENT ON TABLE partnership_rounds IS 'Tagged rounds for partnerships with target score tracking';
COMMENT ON FUNCTION get_partnership_leaderboard IS 'Returns partnership leaderboard ranked by avg target differential';
COMMENT ON FUNCTION get_partnership_course_bests IS 'Returns best combined gross and differential per partnership per course';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
