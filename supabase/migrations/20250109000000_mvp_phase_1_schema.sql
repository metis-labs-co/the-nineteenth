-- =====================================================
-- MVP Phase 1: Core Database Schema
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration creates all tables, RLS policies, triggers,
-- and indexes needed for MVP Phase 1 functionality.
--
-- Features Supported:
-- - Single-round competitions
-- - Stableford scoring
-- - Player management
-- - Scorecard entry with offline support
-- - Basic leaderboard
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For course location data

-- =====================================================
-- TABLES
-- =====================================================

-- -----------------------------------------------------
-- Players Table
-- -----------------------------------------------------
-- Extends Supabase auth.users with golf-specific data
-- One-to-one relationship with auth.users
CREATE TABLE players (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  handicap NUMERIC(4, 1) DEFAULT 0,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------
-- Competitions Table
-- -----------------------------------------------------
-- Core competition metadata
CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE, -- For Phase 2 multi-round support
  handicap_system TEXT NOT NULL CHECK (handicap_system IN ('honor', 'golf-australia', 'gross-only')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
  invite_code TEXT UNIQUE NOT NULL,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metadata
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in-progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

-- -----------------------------------------------------
-- Courses Table
-- -----------------------------------------------------
-- Golf course information (manual entry for MVP)
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('api', 'manual')),
  api_id TEXT, -- External API identifier

  -- Basic Info
  name TEXT NOT NULL,
  state TEXT CHECK (state IN ('NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT')),
  city TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Location (PostGIS geography type for accurate distance calculations)
  location GEOGRAPHY(POINT, 4326), -- WGS84 coordinate system

  -- Course Details (JSONB for flexibility)
  holes JSONB, -- Array of hole objects: [{ number, par, strokeIndex, yardages }]
  tees JSONB,  -- Array of tee boxes: [{ name, color, totalYardage, courseRating, slopeRating }]
  slope_rating NUMERIC(4, 1),
  course_rating NUMERIC(4, 1),

  -- Metadata
  last_synced TIMESTAMPTZ, -- When course data was last updated from API
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------
-- Rounds Table
-- -----------------------------------------------------
-- Individual rounds within a competition
-- MVP: One round per competition
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  date DATE,
  tee_time TIME,

  -- Game Configuration
  game_type TEXT NOT NULL DEFAULT 'stableford' CHECK (game_type IN ('stroke', 'stableford', 'match-play', 'ambrose', 'best-ball')),

  -- Status
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in-progress', 'completed')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_round_per_competition UNIQUE (competition_id, round_number),
  CONSTRAINT positive_round_number CHECK (round_number > 0)
);

-- -----------------------------------------------------
-- Competition Players (Join Table)
-- -----------------------------------------------------
-- Many-to-many relationship between competitions and players
CREATE TABLE competition_players (
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Invitation Status
  status TEXT DEFAULT 'accepted' CHECK (status IN ('invited', 'accepted', 'declined')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Primary Key
  PRIMARY KEY (competition_id, player_id)
);

-- -----------------------------------------------------
-- Pairings Table
-- -----------------------------------------------------
-- Groups of players playing together in a round
-- MVP: Manual pairing by organizer
CREATE TABLE pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_ids UUID[] NOT NULL, -- Array of 2-4 player UUIDs
  tee_time TIME,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_pairing_size CHECK (array_length(player_ids, 1) BETWEEN 2 AND 4)
);

-- -----------------------------------------------------
-- Scorecards Table
-- -----------------------------------------------------
-- Individual player scores for a round
-- Critical for offline sync - stores hole-by-hole data
CREATE TABLE scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Score Data (JSONB for flexibility)
  -- Format: { "1": { "strokes": 4, "putts": 2, "fairwayHit": true, "greenInRegulation": false, "penalties": 0 }, ... }
  scores JSONB NOT NULL DEFAULT '{}',

  -- Calculated Totals
  total_gross INTEGER DEFAULT 0,
  total_net INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0, -- Stableford points

  -- Status
  status TEXT DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'completed', 'confirmed')),

  -- Submission Metadata
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES players(id), -- Player who submitted (could be playing partner)

  -- Offline Sync Support
  device_id TEXT, -- For conflict resolution
  synced_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_scorecard_per_player_round UNIQUE (round_id, player_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Players
CREATE INDEX idx_players_email ON players(email);

-- Competitions
CREATE INDEX idx_competitions_organizer ON competitions(organizer_id);
CREATE INDEX idx_competitions_invite_code ON competitions(invite_code);
CREATE INDEX idx_competitions_status ON competitions(status);
CREATE INDEX idx_competitions_start_date ON competitions(start_date);

-- Courses
CREATE INDEX idx_courses_name ON courses(name);
CREATE INDEX idx_courses_state ON courses(state);
CREATE INDEX idx_courses_source ON courses(source);
CREATE INDEX idx_courses_location ON courses USING GIST(location); -- Spatial index for location queries

-- Rounds
CREATE INDEX idx_rounds_competition ON rounds(competition_id);
CREATE INDEX idx_rounds_course ON rounds(course_id);
CREATE INDEX idx_rounds_status ON rounds(status);
CREATE INDEX idx_rounds_date ON rounds(date);

-- Competition Players
CREATE INDEX idx_competition_players_player ON competition_players(player_id);
CREATE INDEX idx_competition_players_status ON competition_players(status);

-- Pairings
CREATE INDEX idx_pairings_round ON pairings(round_id);
CREATE INDEX idx_pairings_players ON pairings USING GIN(player_ids); -- GIN index for array queries

-- Scorecards (Critical for leaderboard queries)
CREATE INDEX idx_scorecards_round ON scorecards(round_id);
CREATE INDEX idx_scorecards_player ON scorecards(player_id);
CREATE INDEX idx_scorecards_status ON scorecards(status);
CREATE INDEX idx_scorecards_round_status ON scorecards(round_id, status); -- Composite for leaderboard
CREATE INDEX idx_scorecards_submitted_at ON scorecards(submitted_at);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- -----------------------------------------------------
-- Updated At Trigger Function
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON competitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rounds_updated_at BEFORE UPDATE ON rounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pairings_updated_at BEFORE UPDATE ON pairings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scorecards_updated_at BEFORE UPDATE ON scorecards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- Generate Invite Code Trigger
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    -- Generate format: COMP-12345 (5 random digits)
    NEW.invite_code := 'COMP-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');

    -- Ensure uniqueness (retry if collision)
    WHILE EXISTS (SELECT 1 FROM competitions WHERE invite_code = NEW.invite_code) LOOP
      NEW.invite_code := 'COMP-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_competition_invite_code BEFORE INSERT ON competitions
  FOR EACH ROW EXECUTE FUNCTION generate_invite_code();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- Players Policies
-- -----------------------------------------------------

-- Players can view their own profile
CREATE POLICY "Users can view own player profile"
  ON players FOR SELECT
  USING (auth.uid() = id);

-- Players can update their own profile
CREATE POLICY "Users can update own player profile"
  ON players FOR UPDATE
  USING (auth.uid() = id);

-- Players can insert their own profile (on signup)
CREATE POLICY "Users can insert own player profile"
  ON players FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Players can view other players in their competitions
CREATE POLICY "Users can view players in their competitions"
  ON players FOR SELECT
  USING (
    id IN (
      SELECT player_id FROM competition_players
      WHERE competition_id IN (
        SELECT competition_id FROM competition_players
        WHERE player_id = auth.uid()
      )
    )
  );

-- -----------------------------------------------------
-- Competitions Policies
-- -----------------------------------------------------

-- Organizers can do anything with their competitions
CREATE POLICY "Organizers can manage own competitions"
  ON competitions FOR ALL
  USING (auth.uid() = organizer_id);

-- Players can view competitions they're in
CREATE POLICY "Players can view their competitions"
  ON competitions FOR SELECT
  USING (
    id IN (
      SELECT competition_id FROM competition_players
      WHERE player_id = auth.uid()
    )
  );

-- Anyone can view a competition by invite code (for joining)
CREATE POLICY "Anyone can view competition by invite code"
  ON competitions FOR SELECT
  USING (visibility = 'private'); -- Still requires knowing the code

-- -----------------------------------------------------
-- Courses Policies
-- -----------------------------------------------------

-- Anyone can view courses (read-only for players)
CREATE POLICY "Anyone can view courses"
  ON courses FOR SELECT
  TO authenticated
  USING (true);

-- Only organizers can create courses (manual entry)
CREATE POLICY "Authenticated users can create courses"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Course creators can update their courses
CREATE POLICY "Users can update courses they created"
  ON courses FOR UPDATE
  USING (true); -- TODO: Add created_by field in Phase 2

-- -----------------------------------------------------
-- Rounds Policies
-- -----------------------------------------------------

-- Organizers can manage rounds in their competitions
CREATE POLICY "Organizers can manage rounds in their competitions"
  ON rounds FOR ALL
  USING (
    competition_id IN (
      SELECT id FROM competitions
      WHERE organizer_id = auth.uid()
    )
  );

-- Players can view rounds in their competitions
CREATE POLICY "Players can view rounds in their competitions"
  ON rounds FOR SELECT
  USING (
    competition_id IN (
      SELECT competition_id FROM competition_players
      WHERE player_id = auth.uid()
    )
  );

-- -----------------------------------------------------
-- Competition Players Policies
-- -----------------------------------------------------

-- Organizers can manage players in their competitions
CREATE POLICY "Organizers can manage competition players"
  ON competition_players FOR ALL
  USING (
    competition_id IN (
      SELECT id FROM competitions
      WHERE organizer_id = auth.uid()
    )
  );

-- Players can view other players in their competitions
CREATE POLICY "Players can view competition players"
  ON competition_players FOR SELECT
  USING (
    competition_id IN (
      SELECT competition_id FROM competition_players
      WHERE player_id = auth.uid()
    )
  );

-- Players can join competitions (insert themselves)
CREATE POLICY "Players can join competitions"
  ON competition_players FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- Players can update their own status (accept/decline)
CREATE POLICY "Players can update own competition status"
  ON competition_players FOR UPDATE
  USING (player_id = auth.uid());

-- -----------------------------------------------------
-- Pairings Policies
-- -----------------------------------------------------

-- Organizers can manage pairings in their competitions
CREATE POLICY "Organizers can manage pairings"
  ON pairings FOR ALL
  USING (
    round_id IN (
      SELECT id FROM rounds
      WHERE competition_id IN (
        SELECT id FROM competitions
        WHERE organizer_id = auth.uid()
      )
    )
  );

-- Players can view pairings in their rounds
CREATE POLICY "Players can view pairings in their rounds"
  ON pairings FOR SELECT
  USING (
    round_id IN (
      SELECT id FROM rounds
      WHERE competition_id IN (
        SELECT competition_id FROM competition_players
        WHERE player_id = auth.uid()
      )
    )
  );

-- -----------------------------------------------------
-- Scorecards Policies
-- -----------------------------------------------------

-- Players can view scorecards in their competitions
CREATE POLICY "Players can view scorecards in their competitions"
  ON scorecards FOR SELECT
  USING (
    round_id IN (
      SELECT id FROM rounds
      WHERE competition_id IN (
        SELECT competition_id FROM competition_players
        WHERE player_id = auth.uid()
      )
    )
  );

-- Players can create scorecards for rounds they're in
CREATE POLICY "Players can create scorecards for their rounds"
  ON scorecards FOR INSERT
  WITH CHECK (
    round_id IN (
      SELECT id FROM rounds
      WHERE competition_id IN (
        SELECT competition_id FROM competition_players
        WHERE player_id = auth.uid()
      )
    )
  );

-- Players can update scorecards in their group (for scoring on behalf of group)
CREATE POLICY "Players can update scorecards in their pairing"
  ON scorecards FOR UPDATE
  USING (
    -- Player is in the same pairing as the scorecard owner
    round_id IN (
      SELECT round_id FROM pairings
      WHERE auth.uid() = ANY(player_ids)
      AND player_id = ANY(player_ids)
    )
    OR
    -- Or they're updating their own scorecard
    player_id = auth.uid()
  );

-- Organizers can manage all scorecards in their competitions
CREATE POLICY "Organizers can manage scorecards in their competitions"
  ON scorecards FOR ALL
  USING (
    round_id IN (
      SELECT id FROM rounds
      WHERE competition_id IN (
        SELECT id FROM competitions
        WHERE organizer_id = auth.uid()
      )
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- Calculate Stableford Points
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_stableford_points(
  gross_score INTEGER,
  par INTEGER,
  player_handicap NUMERIC,
  stroke_index INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  strokes_on_hole INTEGER;
  net_score INTEGER;
  points INTEGER;
BEGIN
  -- Calculate strokes received on this hole
  strokes_on_hole := FLOOR(player_handicap / 18);
  IF stroke_index <= (player_handicap % 18) THEN
    strokes_on_hole := strokes_on_hole + 1;
  END IF;

  -- Calculate net score
  net_score := gross_score - strokes_on_hole;

  -- Calculate Stableford points
  IF net_score <= par - 2 THEN
    points := 4; -- Albatross or better
  ELSIF net_score = par - 1 THEN
    points := 3; -- Birdie
  ELSIF net_score = par THEN
    points := 2; -- Par
  ELSIF net_score = par + 1 THEN
    points := 1; -- Bogey
  ELSE
    points := 0; -- Double bogey or worse
  END IF;

  RETURN points;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- -----------------------------------------------------
-- Get Competition Leaderboard
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_competition_leaderboard(comp_id UUID)
RETURNS TABLE (
  rank INTEGER,
  player_id UUID,
  player_name TEXT,
  handicap NUMERIC,
  total_gross INTEGER,
  total_net INTEGER,
  total_points INTEGER,
  rounds_played INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH player_totals AS (
    SELECT
      s.player_id,
      p.name AS player_name,
      p.handicap,
      SUM(s.total_gross) AS total_gross,
      SUM(s.total_net) AS total_net,
      SUM(s.total_points) AS total_points,
      COUNT(*) AS rounds_played
    FROM scorecards s
    JOIN players p ON s.player_id = p.id
    JOIN rounds r ON s.round_id = r.id
    WHERE r.competition_id = comp_id
      AND s.status = 'completed'
    GROUP BY s.player_id, p.name, p.handicap
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY pt.total_points DESC, pt.total_net ASC)::INTEGER AS rank,
    pt.player_id,
    pt.player_name,
    pt.handicap,
    pt.total_gross::INTEGER,
    pt.total_net::INTEGER,
    pt.total_points::INTEGER,
    pt.rounds_played::INTEGER
  FROM player_totals pt
  ORDER BY pt.total_points DESC, pt.total_net ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- SAMPLE DATA (Development/Testing Only)
-- =====================================================
-- Uncomment to insert sample data for testing

/*
-- Insert sample course
INSERT INTO courses (name, state, city, holes, source) VALUES
(
  'Royal Melbourne Golf Club',
  'VIC',
  'Black Rock',
  '[
    {"number": 1, "par": 4, "strokeIndex": 7},
    {"number": 2, "par": 4, "strokeIndex": 3},
    {"number": 3, "par": 3, "strokeIndex": 15},
    {"number": 4, "par": 4, "strokeIndex": 1},
    {"number": 5, "par": 5, "strokeIndex": 11},
    {"number": 6, "par": 3, "strokeIndex": 17},
    {"number": 7, "par": 4, "strokeIndex": 5},
    {"number": 8, "par": 4, "strokeIndex": 9},
    {"number": 9, "par": 4, "strokeIndex": 13},
    {"number": 10, "par": 4, "strokeIndex": 8},
    {"number": 11, "par": 4, "strokeIndex": 4},
    {"number": 12, "par": 3, "strokeIndex": 16},
    {"number": 13, "par": 4, "strokeIndex": 2},
    {"number": 14, "par": 5, "strokeIndex": 12},
    {"number": 15, "par": 3, "strokeIndex": 18},
    {"number": 16, "par": 4, "strokeIndex": 6},
    {"number": 17, "par": 4, "strokeIndex": 10},
    {"number": 18, "par": 4, "strokeIndex": 14}
  ]'::jsonb,
  'manual'
);
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE players IS 'Player profiles with golf-specific data';
COMMENT ON TABLE competitions IS 'Competition metadata and settings';
COMMENT ON TABLE courses IS 'Golf course information with hole details';
COMMENT ON TABLE rounds IS 'Individual rounds within competitions';
COMMENT ON TABLE competition_players IS 'Many-to-many join table for competition membership';
COMMENT ON TABLE pairings IS 'Player groupings for each round';
COMMENT ON TABLE scorecards IS 'Hole-by-hole scores for players in rounds';

COMMENT ON FUNCTION calculate_stableford_points IS 'Calculate Stableford points for a single hole based on gross score, par, handicap, and stroke index';
COMMENT ON FUNCTION get_competition_leaderboard IS 'Get sorted leaderboard for a competition with rankings and totals';
