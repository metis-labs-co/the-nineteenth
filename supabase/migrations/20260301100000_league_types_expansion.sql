-- =====================================================
-- League Types Expansion
-- Adds support for Season, Round Limit, Ladder, and Eclectic league types
-- =====================================================

-- =====================================================
-- 1. ENSURE league_type COLUMN EXISTS AND EXTEND CHECK CONSTRAINT
-- =====================================================

DO $$
BEGIN
  -- Add league_type column if it doesn't exist (e.g. if base migration used a different schema)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'league_type'
  ) THEN
    ALTER TABLE leagues ADD COLUMN league_type TEXT NOT NULL DEFAULT 'ongoing';
  END IF;
END $$;

ALTER TABLE leagues DROP CONSTRAINT IF EXISTS leagues_league_type_check;
ALTER TABLE leagues ADD CONSTRAINT leagues_league_type_check
  CHECK (league_type IN ('ongoing', 'season', 'round_limit', 'ladder', 'eclectic'));

-- =====================================================
-- 2. ADD NEW COLUMNS TO leagues TABLE
-- =====================================================

-- Season type fields
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS end_date DATE;

-- Round Limit type fields
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS max_rounds INTEGER;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS counting_rounds INTEGER;

-- Ladder type fields
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS challenge_range INTEGER DEFAULT 3;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS ladder_seeding TEXT DEFAULT 'join_order'
  CHECK (ladder_seeding IS NULL OR ladder_seeding IN ('join_order', 'handicap', 'random'));

-- Eclectic type fields
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id);
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS tee_id UUID REFERENCES tees(id);
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS eclectic_scoring TEXT DEFAULT 'gross'
  CHECK (eclectic_scoring IS NULL OR eclectic_scoring IN ('gross', 'net'));

-- =====================================================
-- 3. ADD TYPE-SPECIFIC CONSTRAINTS (idempotent)
-- =====================================================

DO $$
BEGIN
  -- Season must have both dates
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'season_requires_dates') THEN
    ALTER TABLE leagues ADD CONSTRAINT season_requires_dates
      CHECK (league_type != 'season' OR (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date > start_date));
  END IF;

  -- Round Limit must have max_rounds
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'round_limit_requires_max') THEN
    ALTER TABLE leagues ADD CONSTRAINT round_limit_requires_max
      CHECK (league_type != 'round_limit' OR (max_rounds IS NOT NULL AND max_rounds > 0));
  END IF;

  -- Counting rounds must be <= max_rounds
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'counting_rounds_valid') THEN
    ALTER TABLE leagues ADD CONSTRAINT counting_rounds_valid
      CHECK (counting_rounds IS NULL OR (max_rounds IS NOT NULL AND counting_rounds > 0 AND counting_rounds <= max_rounds));
  END IF;

  -- Eclectic must have course_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eclectic_requires_course') THEN
    ALTER TABLE leagues ADD CONSTRAINT eclectic_requires_course
      CHECK (league_type != 'eclectic' OR course_id IS NOT NULL);
  END IF;

  -- Eclectic net scoring requires tee_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eclectic_net_requires_tee') THEN
    ALTER TABLE leagues ADD CONSTRAINT eclectic_net_requires_tee
      CHECK (league_type != 'eclectic' OR eclectic_scoring != 'net' OR tee_id IS NOT NULL);
  END IF;
END $$;

-- =====================================================
-- 4. ADD ladder_position TO league_players
-- =====================================================

ALTER TABLE league_players ADD COLUMN IF NOT EXISTS ladder_position INTEGER;

-- =====================================================
-- 5. CREATE ladder_challenges TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ladder_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  challenger_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  challenged_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'expired', 'cancelled')),
  challenger_scorecard_id UUID REFERENCES scorecards(id),
  challenged_scorecard_id UUID REFERENCES scorecards(id),
  challenger_differential NUMERIC(4,1),
  challenged_differential NUMERIC(4,1),
  winner_id UUID REFERENCES players(id),
  challenger_position INTEGER NOT NULL,
  challenged_position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes for ladder_challenges
CREATE INDEX IF NOT EXISTS idx_ladder_challenges_league ON ladder_challenges(league_id);
CREATE INDEX IF NOT EXISTS idx_ladder_challenges_challenger ON ladder_challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_ladder_challenges_challenged ON ladder_challenges(challenged_id);
CREATE INDEX IF NOT EXISTS idx_ladder_challenges_status ON ladder_challenges(status);

-- =====================================================
-- 6. CREATE eclectic_best_scores TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS eclectic_best_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  best_gross INTEGER NOT NULL CHECK (best_gross > 0),
  best_net INTEGER CHECK (best_net > 0),
  source_scorecard_id UUID NOT NULL REFERENCES scorecards(id),
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_eclectic_hole UNIQUE (league_id, player_id, hole_number)
);

-- Indexes for eclectic_best_scores
CREATE INDEX IF NOT EXISTS idx_eclectic_best_league ON eclectic_best_scores(league_id);
CREATE INDEX IF NOT EXISTS idx_eclectic_best_player ON eclectic_best_scores(player_id);
CREATE INDEX IF NOT EXISTS idx_eclectic_best_league_player ON eclectic_best_scores(league_id, player_id);

-- =====================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE ladder_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE eclectic_best_scores ENABLE ROW LEVEL SECURITY;

-- LADDER CHALLENGES

DROP POLICY IF EXISTS ladder_challenges_select ON ladder_challenges;
CREATE POLICY ladder_challenges_select ON ladder_challenges FOR SELECT
  USING (is_league_member(league_id, auth.uid()));

DROP POLICY IF EXISTS ladder_challenges_insert ON ladder_challenges;
CREATE POLICY ladder_challenges_insert ON ladder_challenges FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

DROP POLICY IF EXISTS ladder_challenges_update ON ladder_challenges;
CREATE POLICY ladder_challenges_update ON ladder_challenges FOR UPDATE
  USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

-- ECLECTIC BEST SCORES

DROP POLICY IF EXISTS eclectic_best_select ON eclectic_best_scores;
CREATE POLICY eclectic_best_select ON eclectic_best_scores FOR SELECT
  USING (is_league_member(league_id, auth.uid()));

DROP POLICY IF EXISTS eclectic_best_insert ON eclectic_best_scores;
CREATE POLICY eclectic_best_insert ON eclectic_best_scores FOR INSERT
  WITH CHECK (auth.uid() = player_id);

DROP POLICY IF EXISTS eclectic_best_update ON eclectic_best_scores;
CREATE POLICY eclectic_best_update ON eclectic_best_scores FOR UPDATE
  USING (auth.uid() = player_id);

-- =====================================================
-- 8. UPDATE get_league_leaderboard() TO BE TYPE-AWARE
-- =====================================================

CREATE OR REPLACE FUNCTION get_league_leaderboard(p_league_id UUID)
RETURNS TABLE (
  player_id UUID,
  name TEXT,
  photo_url TEXT,
  rounds_played INTEGER,
  rounds_counting INTEGER,
  avg_differential NUMERIC(4,1),
  best_differential NUMERIC(4,1),
  rank INTEGER
) AS $$
DECLARE
  v_league_type TEXT;
  v_max_rounds INTEGER;
  v_counting_rounds INTEGER;
  v_window_size INTEGER;
  v_best_of INTEGER;
BEGIN
  -- Get league type and config
  SELECT l.league_type, l.max_rounds, l.counting_rounds
  INTO v_league_type, v_max_rounds, v_counting_rounds
  FROM leagues l
  WHERE l.id = p_league_id;

  -- Determine scoring window and best-of based on type
  CASE v_league_type
    WHEN 'round_limit' THEN
      v_window_size := v_max_rounds;
      v_best_of := COALESCE(v_counting_rounds, v_max_rounds);
    ELSE
      -- ongoing / season: standard WHS (best 8 of last 20)
      v_window_size := 20;
      v_best_of := 8;
  END CASE;

  RETURN QUERY
  WITH player_rounds AS (
    SELECT
      lr.player_id,
      lr.handicap_differential,
      ROW_NUMBER() OVER (PARTITION BY lr.player_id ORDER BY lr.tagged_at DESC) AS rn
    FROM league_rounds lr
    WHERE lr.league_id = p_league_id
  ),
  windowed AS (
    SELECT * FROM player_rounds WHERE rn <= v_window_size
  ),
  best_rounds AS (
    SELECT
      w.player_id,
      w.handicap_differential,
      ROW_NUMBER() OVER (PARTITION BY w.player_id ORDER BY w.handicap_differential ASC) AS best_rn
    FROM windowed w
  ),
  stats AS (
    SELECT
      br.player_id,
      COUNT(*) FILTER (WHERE best_rn <= v_best_of)::INTEGER AS rounds_counting,
      (SELECT COUNT(*)::INTEGER FROM windowed w2 WHERE w2.player_id = br.player_id) AS rounds_played,
      ROUND(AVG(br.handicap_differential) FILTER (WHERE best_rn <= v_best_of), 1) AS avg_differential,
      MIN(br.handicap_differential) AS best_differential
    FROM best_rounds br
    GROUP BY br.player_id
  )
  SELECT
    s.player_id,
    p.name,
    p.photo_url,
    s.rounds_played,
    s.rounds_counting,
    s.avg_differential,
    s.best_differential,
    RANK() OVER (ORDER BY s.avg_differential ASC)::INTEGER AS rank
  FROM stats s
  JOIN players p ON p.id = s.player_id
  ORDER BY s.avg_differential ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. LADDER STANDINGS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_ladder_standings(p_league_id UUID)
RETURNS TABLE (
  player_id UUID,
  name TEXT,
  photo_url TEXT,
  ladder_position INTEGER,
  wins INTEGER,
  losses INTEGER,
  active_challenge_id UUID,
  active_challenge_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lp.player_id,
    p.name,
    p.photo_url,
    lp.ladder_position,
    COALESCE((
      SELECT COUNT(*)::INTEGER FROM ladder_challenges lc
      WHERE lc.league_id = p_league_id
        AND lc.winner_id = lp.player_id
        AND lc.status = 'completed'
    ), 0) AS wins,
    COALESCE((
      SELECT COUNT(*)::INTEGER FROM ladder_challenges lc
      WHERE lc.league_id = p_league_id
        AND lc.status = 'completed'
        AND lc.winner_id IS NOT NULL
        AND lc.winner_id != lp.player_id
        AND (lc.challenger_id = lp.player_id OR lc.challenged_id = lp.player_id)
    ), 0) AS losses,
    (
      SELECT lc.id FROM ladder_challenges lc
      WHERE lc.league_id = p_league_id
        AND lc.status IN ('pending', 'accepted')
        AND (lc.challenger_id = lp.player_id OR lc.challenged_id = lp.player_id)
      LIMIT 1
    ) AS active_challenge_id,
    (
      SELECT lc.status FROM ladder_challenges lc
      WHERE lc.league_id = p_league_id
        AND lc.status IN ('pending', 'accepted')
        AND (lc.challenger_id = lp.player_id OR lc.challenged_id = lp.player_id)
      LIMIT 1
    ) AS active_challenge_status
  FROM league_players lp
  JOIN players p ON p.id = lp.player_id
  WHERE lp.league_id = p_league_id
    AND lp.status = 'accepted'
    AND lp.ladder_position IS NOT NULL
  ORDER BY lp.ladder_position ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. ECLECTIC LEADERBOARD FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_eclectic_leaderboard(p_league_id UUID)
RETURNS TABLE (
  player_id UUID,
  name TEXT,
  photo_url TEXT,
  total_best_gross INTEGER,
  total_best_net INTEGER,
  holes_completed INTEGER,
  rounds_played INTEGER,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH player_scores AS (
    SELECT
      ebs.player_id,
      SUM(ebs.best_gross)::INTEGER AS total_best_gross,
      SUM(ebs.best_net)::INTEGER AS total_best_net,
      COUNT(*)::INTEGER AS holes_completed
    FROM eclectic_best_scores ebs
    WHERE ebs.league_id = p_league_id
    GROUP BY ebs.player_id
  ),
  player_round_counts AS (
    SELECT
      lr.player_id,
      COUNT(DISTINCT lr.scorecard_id)::INTEGER AS rounds_played
    FROM league_rounds lr
    WHERE lr.league_id = p_league_id
    GROUP BY lr.player_id
  )
  SELECT
    ps.player_id,
    p.name,
    p.photo_url,
    ps.total_best_gross,
    ps.total_best_net,
    ps.holes_completed,
    COALESCE(prc.rounds_played, 0),
    RANK() OVER (
      ORDER BY
        ps.holes_completed DESC,
        CASE
          WHEN (SELECT l.eclectic_scoring FROM leagues l WHERE l.id = p_league_id) = 'net'
          THEN COALESCE(ps.total_best_net, ps.total_best_gross)
          ELSE ps.total_best_gross
        END ASC
    )::INTEGER AS rank
  FROM player_scores ps
  JOIN players p ON p.id = ps.player_id
  LEFT JOIN player_round_counts prc ON prc.player_id = ps.player_id
  ORDER BY
    ps.holes_completed DESC,
    CASE
      WHEN (SELECT l.eclectic_scoring FROM leagues l WHERE l.id = p_league_id) = 'net'
      THEN COALESCE(ps.total_best_net, ps.total_best_gross)
      ELSE ps.total_best_gross
    END ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. AUTO-ASSIGN LADDER POSITION ON JOIN
-- =====================================================

CREATE OR REPLACE FUNCTION assign_ladder_position()
RETURNS TRIGGER AS $$
DECLARE
  v_league_type TEXT;
  v_max_position INTEGER;
BEGIN
  -- Only for accepted players in ladder leagues
  IF NEW.status != 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT league_type INTO v_league_type FROM leagues WHERE id = NEW.league_id;

  IF v_league_type = 'ladder' THEN
    SELECT COALESCE(MAX(ladder_position), 0) INTO v_max_position
    FROM league_players
    WHERE league_id = NEW.league_id AND status = 'accepted' AND ladder_position IS NOT NULL;

    NEW.ladder_position := v_max_position + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS league_players_assign_ladder_position ON league_players;
CREATE TRIGGER league_players_assign_ladder_position
  BEFORE INSERT ON league_players
  FOR EACH ROW EXECUTE FUNCTION assign_ladder_position();

-- Also handle updates (e.g., re-joining after being removed)
CREATE OR REPLACE FUNCTION reassign_ladder_position()
RETURNS TRIGGER AS $$
DECLARE
  v_league_type TEXT;
  v_max_position INTEGER;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    SELECT league_type INTO v_league_type FROM leagues WHERE id = NEW.league_id;

    IF v_league_type = 'ladder' AND NEW.ladder_position IS NULL THEN
      SELECT COALESCE(MAX(ladder_position), 0) INTO v_max_position
      FROM league_players
      WHERE league_id = NEW.league_id AND status = 'accepted' AND ladder_position IS NOT NULL;

      NEW.ladder_position := v_max_position + 1;
    END IF;
  END IF;

  -- Clear position when removed/declined
  IF NEW.status IN ('removed', 'declined') AND OLD.status = 'accepted' THEN
    NEW.ladder_position := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS league_players_reassign_ladder_position ON league_players;
CREATE TRIGGER league_players_reassign_ladder_position
  BEFORE UPDATE ON league_players
  FOR EACH ROW EXECUTE FUNCTION reassign_ladder_position();

-- =====================================================
-- 12. ADD SUBSCRIPTION TIER COLUMNS FOR LEAGUE TYPE GATING
-- =====================================================

-- Add column for allowed league types per tier
ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS allowed_league_types TEXT[] DEFAULT ARRAY['ongoing', 'season', 'round_limit'];

-- Set per-tier values
UPDATE tier_limits SET allowed_league_types = ARRAY[]::TEXT[] WHERE tier = 'free';
UPDATE tier_limits SET allowed_league_types = ARRAY['ongoing', 'season', 'round_limit'] WHERE tier = 'social';
UPDATE tier_limits SET allowed_league_types = ARRAY['ongoing', 'season', 'round_limit', 'ladder', 'eclectic'] WHERE tier = 'premium';
UPDATE tier_limits SET allowed_league_types = ARRAY['ongoing', 'season', 'round_limit', 'ladder', 'eclectic'] WHERE tier = 'super_admin';

-- =====================================================
-- 13. COMMENTS
-- =====================================================

COMMENT ON TABLE ladder_challenges IS 'Ladder league challenges between two players';
COMMENT ON TABLE eclectic_best_scores IS 'Best per-hole scores for eclectic league players';
COMMENT ON FUNCTION get_ladder_standings IS 'Returns ladder standings ordered by position with W/L records';
COMMENT ON FUNCTION get_eclectic_leaderboard IS 'Returns eclectic leaderboard ranked by composite score';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
