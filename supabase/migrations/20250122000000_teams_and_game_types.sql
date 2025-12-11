-- =====================================================
-- Teams and Multiple Game Types Migration
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration adds support for:
-- - Team-based competitions (fixed teams or per-round teams)
-- - Multiple game types (Match Play, Best Ball, Scramble, etc.)
-- - Competition points system for unified leaderboards
-- - Round results tracking for all game formats
-- =====================================================

-- =====================================================
-- NEW TYPES (Enums)
-- =====================================================

-- Team mode for competitions
-- 'none': Individual competition, no teams
-- 'fixed': Teams persist across all rounds
-- 'per-round': Teams can change each round
CREATE TYPE team_mode AS ENUM ('none', 'fixed', 'per-round');

-- Team format for team-based rounds
-- 'best-ball': Each player plays own ball, best score counts
-- 'scramble': Team plays from best position each shot
-- 'aggregate': Sum of team members' scores
-- 'match-play-team': Team vs team match play
CREATE TYPE team_format AS ENUM ('best-ball', 'scramble', 'aggregate', 'match-play-team');

-- =====================================================
-- NEW TABLES
-- =====================================================

-- -----------------------------------------------------
-- Teams Table
-- -----------------------------------------------------
-- Teams for competition-wide or per-round team play
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_team_name_per_competition UNIQUE (competition_id, name)
);

COMMENT ON TABLE teams IS 'Teams for team-based competitions. Teams can be fixed for competition or change per-round.';

-- -----------------------------------------------------
-- Team Members Join Table
-- -----------------------------------------------------
-- Links players to teams
CREATE TABLE team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite primary key
  PRIMARY KEY (team_id, player_id)
);

COMMENT ON TABLE team_members IS 'Many-to-many join table linking players to teams.';

-- -----------------------------------------------------
-- Round Results Table
-- -----------------------------------------------------
-- Stores finalized round results for all game types
-- Supports both individual and team results
CREATE TABLE round_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,

  -- Participant (either player OR team, not both)
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

  -- Raw score data
  raw_score NUMERIC(10, 2), -- Primary score (Stableford points, gross strokes, etc.)
  raw_result_data JSONB NOT NULL DEFAULT '{}', -- Format-specific data (match play results, hole-by-hole, etc.)

  -- Position and points
  position INTEGER, -- 1, 2, 3... (NULL for match play without standings)
  competition_points NUMERIC(10, 2) DEFAULT 0, -- Points earned toward competition standings

  -- Result type flag
  is_team_result BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  -- Either player_id OR team_id must be set, but not both
  CONSTRAINT xor_player_or_team CHECK (
    (player_id IS NOT NULL AND team_id IS NULL AND is_team_result = FALSE) OR
    (player_id IS NULL AND team_id IS NOT NULL AND is_team_result = TRUE)
  ),

  -- One result per player/team per round
  CONSTRAINT unique_player_result_per_round UNIQUE (round_id, player_id),
  CONSTRAINT unique_team_result_per_round UNIQUE (round_id, team_id)
);

COMMENT ON TABLE round_results IS 'Finalized results for rounds. Supports individual and team results for all game types.';
COMMENT ON COLUMN round_results.raw_score IS 'Primary score value: Stableford points (desc), gross strokes (asc), etc.';
COMMENT ON COLUMN round_results.raw_result_data IS 'Game-type specific data: {opponentId, matchResult, holesWon, holesLost, holesHalved} for match play, etc.';
COMMENT ON COLUMN round_results.competition_points IS 'Points toward competition standings, calculated from point_system config.';

-- =====================================================
-- ALTER EXISTING TABLES
-- =====================================================

-- -----------------------------------------------------
-- Competitions Table - Add Team Settings
-- -----------------------------------------------------
ALTER TABLE competitions
  ADD COLUMN team_mode team_mode NOT NULL DEFAULT 'none',
  ADD COLUMN team_size INTEGER CHECK (team_size IS NULL OR team_size BETWEEN 2 AND 4),
  ADD COLUMN point_system JSONB NOT NULL DEFAULT '{
    "type": "position",
    "rules": {
      "1": 10,
      "2": 8,
      "3": 6,
      "4": 5,
      "5": 4,
      "6": 3,
      "7": 2,
      "8": 1,
      "default": 0
    },
    "matchPlay": {
      "win": 3,
      "draw": 1,
      "loss": 0
    }
  }';

COMMENT ON COLUMN competitions.team_mode IS 'none: individual, fixed: same teams all rounds, per-round: teams vary';
COMMENT ON COLUMN competitions.team_size IS 'Number of players per team (2-4), NULL if team_mode is none';
COMMENT ON COLUMN competitions.point_system IS 'JSON config for converting round results to competition points';

-- Add constraint: team_size required when team_mode is not 'none'
ALTER TABLE competitions
  ADD CONSTRAINT team_size_required_for_teams CHECK (
    (team_mode = 'none' AND team_size IS NULL) OR
    (team_mode != 'none' AND team_size IS NOT NULL)
  );

-- -----------------------------------------------------
-- Rounds Table - Add Team Round Settings
-- -----------------------------------------------------
ALTER TABLE rounds
  ADD COLUMN is_team_round BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN team_format team_format;

COMMENT ON COLUMN rounds.is_team_round IS 'TRUE if this round uses team scoring';
COMMENT ON COLUMN rounds.team_format IS 'Team scoring format: best-ball, scramble, aggregate, match-play-team';

-- Add constraint: team_format required when is_team_round is true
ALTER TABLE rounds
  ADD CONSTRAINT team_format_required_for_team_rounds CHECK (
    (is_team_round = FALSE AND team_format IS NULL) OR
    (is_team_round = TRUE AND team_format IS NOT NULL)
  );

-- =====================================================
-- INDEXES
-- =====================================================

-- Teams
CREATE INDEX idx_teams_competition ON teams(competition_id);

-- Team Members
CREATE INDEX idx_team_members_player ON team_members(player_id);

-- Round Results
CREATE INDEX idx_round_results_round ON round_results(round_id);
CREATE INDEX idx_round_results_player ON round_results(player_id) WHERE player_id IS NOT NULL;
CREATE INDEX idx_round_results_team ON round_results(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_round_results_position ON round_results(round_id, position);

-- Competition standings query (aggregating across rounds)
CREATE INDEX idx_round_results_competition_player ON round_results(round_id, player_id, competition_points)
  WHERE player_id IS NOT NULL;
CREATE INDEX idx_round_results_competition_team ON round_results(round_id, team_id, competition_points)
  WHERE team_id IS NOT NULL;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Apply updated_at trigger to new tables
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_round_results_updated_at
  BEFORE UPDATE ON round_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_results ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- Teams Policies
-- -----------------------------------------------------

-- Organizers can manage teams in their competitions
CREATE POLICY "Organizers can manage teams in their competitions"
  ON teams FOR ALL
  USING (
    competition_id IN (
      SELECT id FROM competitions
      WHERE organizer_id = auth.uid()
    )
  );

-- Players can view teams in their competitions
CREATE POLICY "Players can view teams in their competitions"
  ON teams FOR SELECT
  USING (
    competition_id IN (
      SELECT competition_id FROM competition_players
      WHERE player_id = auth.uid()
    )
  );

-- -----------------------------------------------------
-- Team Members Policies
-- -----------------------------------------------------

-- Organizers can manage team members
CREATE POLICY "Organizers can manage team members"
  ON team_members FOR ALL
  USING (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN competitions c ON t.competition_id = c.id
      WHERE c.organizer_id = auth.uid()
    )
  );

-- Players can view team members in their competitions
CREATE POLICY "Players can view team members in their competitions"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT t.id FROM teams t
      WHERE t.competition_id IN (
        SELECT competition_id FROM competition_players
        WHERE player_id = auth.uid()
      )
    )
  );

-- -----------------------------------------------------
-- Round Results Policies
-- -----------------------------------------------------

-- Organizers can manage round results in their competitions
CREATE POLICY "Organizers can manage round results"
  ON round_results FOR ALL
  USING (
    round_id IN (
      SELECT r.id FROM rounds r
      JOIN competitions c ON r.competition_id = c.id
      WHERE c.organizer_id = auth.uid()
    )
  );

-- Players can view round results in their competitions
CREATE POLICY "Players can view round results in their competitions"
  ON round_results FOR SELECT
  USING (
    round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.competition_id IN (
        SELECT competition_id FROM competition_players
        WHERE player_id = auth.uid()
      )
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- Get Team with Members
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_team_with_members(team_uuid UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  competition_id UUID,
  player_id UUID,
  player_name TEXT,
  player_handicap NUMERIC,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS team_id,
    t.name AS team_name,
    t.competition_id,
    p.id AS player_id,
    p.name AS player_name,
    p.handicap AS player_handicap,
    tm.joined_at
  FROM teams t
  JOIN team_members tm ON t.id = tm.team_id
  JOIN players p ON tm.player_id = p.id
  WHERE t.id = team_uuid
  ORDER BY p.handicap ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_team_with_members IS 'Get team details with all member information, ordered by handicap.';

-- -----------------------------------------------------
-- Get Competition Team Standings
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_competition_team_standings(comp_id UUID)
RETURNS TABLE (
  rank INTEGER,
  team_id UUID,
  team_name TEXT,
  total_points NUMERIC,
  rounds_played INTEGER,
  avg_handicap NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH team_totals AS (
    SELECT
      rr.team_id,
      t.name AS team_name,
      SUM(rr.competition_points) AS total_points,
      COUNT(DISTINCT rr.round_id) AS rounds_played
    FROM round_results rr
    JOIN teams t ON rr.team_id = t.id
    JOIN rounds r ON rr.round_id = r.id
    WHERE r.competition_id = comp_id
      AND rr.team_id IS NOT NULL
    GROUP BY rr.team_id, t.name
  ),
  team_handicaps AS (
    SELECT
      tm.team_id,
      AVG(p.handicap) AS avg_handicap
    FROM team_members tm
    JOIN players p ON tm.player_id = p.id
    GROUP BY tm.team_id
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY tt.total_points DESC)::INTEGER AS rank,
    tt.team_id,
    tt.team_name,
    tt.total_points,
    tt.rounds_played::INTEGER,
    COALESCE(th.avg_handicap, 0)::NUMERIC AS avg_handicap
  FROM team_totals tt
  LEFT JOIN team_handicaps th ON tt.team_id = th.team_id
  ORDER BY tt.total_points DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_competition_team_standings IS 'Get team standings for a competition based on competition points.';

-- -----------------------------------------------------
-- Get Competition Individual Standings (Points-Based)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_competition_individual_standings(comp_id UUID)
RETURNS TABLE (
  rank INTEGER,
  player_id UUID,
  player_name TEXT,
  handicap NUMERIC,
  total_points NUMERIC,
  rounds_played INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH player_totals AS (
    SELECT
      rr.player_id,
      p.name AS player_name,
      p.handicap,
      SUM(rr.competition_points) AS total_points,
      COUNT(DISTINCT rr.round_id) AS rounds_played
    FROM round_results rr
    JOIN players p ON rr.player_id = p.id
    JOIN rounds r ON rr.round_id = r.id
    WHERE r.competition_id = comp_id
      AND rr.player_id IS NOT NULL
    GROUP BY rr.player_id, p.name, p.handicap
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY pt.total_points DESC)::INTEGER AS rank,
    pt.player_id,
    pt.player_name,
    pt.handicap,
    pt.total_points,
    pt.rounds_played::INTEGER
  FROM player_totals pt
  ORDER BY pt.total_points DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_competition_individual_standings IS 'Get individual player standings for a competition based on competition points.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON COLUMN competitions.point_system IS 'Default point system: position-based with 1st=10, 2nd=8, etc. Match play: win=3, draw=1, loss=0';
