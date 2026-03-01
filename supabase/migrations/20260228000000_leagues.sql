-- =====================================================
-- Leagues Feature
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Leagues allow players to compete across any course using
-- WHS handicap differentials. Scoring: best 8 of last 20 rounds.
-- =====================================================

-- =====================================================
-- TABLE: leagues
-- =====================================================

CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  league_type TEXT NOT NULL DEFAULT 'ongoing' CHECK (league_type IN ('ongoing')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: league_players
-- =====================================================

CREATE TABLE league_players (
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('invited', 'accepted', 'declined', 'removed')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (league_id, player_id)
);

-- =====================================================
-- TABLE: league_rounds
-- Links existing scorecards to leagues
-- =====================================================

CREATE TABLE league_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  scorecard_id UUID NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  handicap_differential NUMERIC(4,1) NOT NULL CHECK (handicap_differential BETWEEN -10 AND 80),
  tagged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_scorecard_per_league UNIQUE (league_id, scorecard_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_league_players_player ON league_players(player_id);
CREATE INDEX idx_league_players_status ON league_players(status);
CREATE INDEX idx_league_rounds_league ON league_rounds(league_id);
CREATE INDEX idx_league_rounds_player ON league_rounds(player_id);
CREATE INDEX idx_league_rounds_scorecard ON league_rounds(scorecard_id);
CREATE INDEX idx_leagues_status ON leagues(status);
CREATE INDEX idx_leagues_invite_code ON leagues(invite_code) WHERE status = 'active';

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_rounds ENABLE ROW LEVEL SECURITY;

-- Helper: check league membership without triggering RLS on league_players
CREATE OR REPLACE FUNCTION is_league_member(p_league_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM league_players
    WHERE league_id = p_league_id AND player_id = p_user_id AND status = 'accepted'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- LEAGUES

-- Anyone can view leagues they're a member of (or creator)
CREATE POLICY leagues_select ON leagues FOR SELECT
  USING (
    auth.uid() = created_by
    OR is_league_member(id, auth.uid())
  );

-- Authenticated users can create leagues (tier check in app layer)
CREATE POLICY leagues_insert ON leagues FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Only creator can update league settings
CREATE POLICY leagues_update ON leagues FOR UPDATE
  USING (auth.uid() = created_by);

-- LEAGUE_PLAYERS

-- Members can view other members of their leagues
CREATE POLICY league_players_select ON league_players FOR SELECT
  USING (
    is_league_member(league_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM leagues WHERE id = league_players.league_id AND created_by = auth.uid()
    )
  );

-- Players can join (insert themselves)
CREATE POLICY league_players_insert ON league_players FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Creator can manage members; players can update their own status (leave)
CREATE POLICY league_players_update ON league_players FOR UPDATE
  USING (
    auth.uid() = player_id
    OR EXISTS (SELECT 1 FROM leagues WHERE id = league_players.league_id AND created_by = auth.uid())
  );

-- LEAGUE_ROUNDS

-- Members can view rounds in their leagues
CREATE POLICY league_rounds_select ON league_rounds FOR SELECT
  USING (
    is_league_member(league_id, auth.uid())
  );

-- Players can tag their own rounds
CREATE POLICY league_rounds_insert ON league_rounds FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Players can untag their own rounds
CREATE POLICY league_rounds_delete ON league_rounds FOR DELETE
  USING (auth.uid() = player_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE TRIGGER update_leagues_updated_at
  BEFORE UPDATE ON leagues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate invite code with LGE- prefix
CREATE OR REPLACE FUNCTION generate_league_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := 'LGE-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    WHILE EXISTS (
      SELECT 1 FROM leagues
      WHERE invite_code = NEW.invite_code AND status = 'active'
    ) LOOP
      NEW.invite_code := 'LGE-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leagues_generate_invite_code
  BEFORE INSERT ON leagues
  FOR EACH ROW EXECUTE FUNCTION generate_league_invite_code();

-- =====================================================
-- LEAGUE LEADERBOARD FUNCTION
-- Returns ranked players by avg of best 8 differentials
-- from their last 20 tagged rounds
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
BEGIN
  RETURN QUERY
  WITH player_rounds AS (
    -- Get last 20 rounds per player, ordered by tagged_at DESC
    SELECT
      lr.player_id,
      lr.handicap_differential,
      ROW_NUMBER() OVER (PARTITION BY lr.player_id ORDER BY lr.tagged_at DESC) AS rn
    FROM league_rounds lr
    WHERE lr.league_id = p_league_id
  ),
  windowed AS (
    -- Only keep last 20 (the scoring window)
    SELECT * FROM player_rounds WHERE rn <= 20
  ),
  best_rounds AS (
    -- Take best 8 differentials from the window
    SELECT
      w.player_id,
      w.handicap_differential,
      ROW_NUMBER() OVER (PARTITION BY w.player_id ORDER BY w.handicap_differential ASC) AS best_rn
    FROM windowed w
  ),
  stats AS (
    SELECT
      br.player_id,
      COUNT(*) FILTER (WHERE best_rn <= 8)::INTEGER AS rounds_counting,
      (SELECT COUNT(*)::INTEGER FROM windowed w2 WHERE w2.player_id = br.player_id) AS rounds_played,
      ROUND(AVG(br.handicap_differential) FILTER (WHERE best_rn <= 8), 1) AS avg_differential,
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
-- SUBSCRIPTION TIER INTEGRATION
-- =====================================================

-- Add league columns to tier_limits
ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS max_leagues_owned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS can_create_league BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS can_join_league BOOLEAN NOT NULL DEFAULT FALSE;

-- Set per-tier values
UPDATE tier_limits SET max_leagues_owned = 0, can_create_league = FALSE, can_join_league = FALSE WHERE tier = 'free';
UPDATE tier_limits SET max_leagues_owned = 3, can_create_league = TRUE, can_join_league = TRUE WHERE tier = 'social';
UPDATE tier_limits SET max_leagues_owned = -1, can_create_league = TRUE, can_join_league = TRUE WHERE tier = 'premium';
UPDATE tier_limits SET max_leagues_owned = -2, can_create_league = TRUE, can_join_league = TRUE WHERE tier = 'super_admin';

-- =====================================================
-- HELPER FUNCTION: Check if user can create more leagues
-- =====================================================

CREATE OR REPLACE FUNCTION user_can_create_league(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_limits tier_limits;
  v_current_count INTEGER;
BEGIN
  v_limits := get_user_tier_limits(p_user_id);

  -- -2 means no system limit (super admin bypass)
  IF v_limits.max_leagues_owned = -2 THEN
    RETURN TRUE;
  END IF;

  -- -1 means unlimited
  IF v_limits.max_leagues_owned = -1 THEN
    RETURN TRUE;
  END IF;

  -- 0 means cannot create
  IF v_limits.max_leagues_owned = 0 THEN
    RETURN FALSE;
  END IF;

  -- Count current active leagues owned by user
  SELECT COUNT(*) INTO v_current_count
  FROM leagues
  WHERE created_by = p_user_id
    AND status = 'active';

  RETURN v_current_count < v_limits.max_leagues_owned;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE leagues IS 'Leagues for cross-course competition using WHS handicap differentials';
COMMENT ON TABLE league_players IS 'Players who are members of a league';
COMMENT ON TABLE league_rounds IS 'Scorecards tagged to a league with their handicap differential';
COMMENT ON COLUMN league_rounds.handicap_differential IS 'WHS handicap differential for this round (lower = better)';
COMMENT ON FUNCTION get_league_leaderboard IS 'Returns league leaderboard ranked by avg of best 8 differentials from last 20 rounds';
COMMENT ON FUNCTION generate_league_invite_code IS 'Auto-generates unique LGE-XXXXX invite code for new leagues';
COMMENT ON FUNCTION user_can_create_league IS 'Check if a user can create more leagues based on their tier limits';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
