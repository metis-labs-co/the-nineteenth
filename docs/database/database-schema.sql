-- ⚠️ DEPRECATED: This file is the original MVP Phase 1 schema from January 2025.
-- The authoritative schema is defined by the migration files in supabase/migrations/
-- and documented in docs/database/DATABASE_SCHEMA.md.
-- This file is kept for historical reference only.
--
-- The Nineteenth - Supabase Database Schema (MVP Phase 1 - HISTORICAL)
-- PostgreSQL 15+ with Row-Level Security (RLS)
-- Last Updated: January 2025

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE handicap_system AS ENUM ('honor', 'golf-australia', 'gross-only');
CREATE TYPE game_type AS ENUM ('stableford', 'stroke', 'match-play', 'ambrose', 'best-ball');
CREATE TYPE australian_state AS ENUM ('NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT');
CREATE TYPE round_status AS ENUM ('upcoming', 'in-progress', 'completed');
CREATE TYPE scorecard_status AS ENUM ('not-started', 'in-progress', 'completed', 'confirmed');
CREATE TYPE invitation_status AS ENUM ('invited', 'accepted', 'declined');

-- ============================================
-- EXTENSIONS
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for course coordinates (Phase 2)
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- TABLES
-- ============================================

-- ----------------
-- Users (extends auth.users)
-- ----------------
-- Note: Supabase Auth manages auth.users table
-- This table extends it with app-specific profile data

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  handicap NUMERIC(4, 1), -- e.g., 12.5
  photo_url TEXT, -- Phase 2
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.users IS 'Player profiles extending Supabase Auth users';
COMMENT ON COLUMN public.users.handicap IS 'Official or self-reported handicap (0.0 to 54.0)';

-- ----------------
-- Competitions
-- ----------------

CREATE TABLE public.competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  handicap_system handicap_system NOT NULL DEFAULT 'honor',
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public')), -- MVP: private only
  invite_code TEXT UNIQUE NOT NULL, -- e.g., 'COMP-94821'
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.competitions IS 'Golf competitions created by organizers';
COMMENT ON COLUMN public.competitions.invite_code IS 'Unique code for players to join (e.g., COMP-94821)';

-- Indexes
CREATE INDEX idx_competitions_organizer ON public.competitions(organizer_id);
CREATE INDEX idx_competitions_invite_code ON public.competitions(invite_code);
CREATE INDEX idx_competitions_start_date ON public.competitions(start_date);

-- ----------------
-- Courses
-- ----------------

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL CHECK (source IN ('api', 'manual')),
  api_id TEXT, -- External API identifier (if source = 'api')

  -- Basic Info
  name TEXT NOT NULL,
  state australian_state,
  city TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Coordinates (Phase 2 with PostGIS)
  -- location GEOGRAPHY(POINT, 4326), -- lat/long
  latitude NUMERIC(10, 7), -- MVP: simple lat/long
  longitude NUMERIC(10, 7),

  -- Course Details (JSONB for flexibility)
  holes JSONB, -- Array of hole data: [{number: 1, par: 4, strokeIndex: 7, yardages: {...}}, ...]
  tees JSONB, -- Tee box configurations (Phase 2)
  slope_rating NUMERIC(4, 1), -- Phase 2
  course_rating NUMERIC(4, 1), -- Phase 2

  -- Metadata
  last_synced TIMESTAMPTZ, -- For API-sourced courses
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.courses IS 'Golf course data (API-sourced or manual entry)';
COMMENT ON COLUMN public.courses.holes IS 'JSON array of hole data: [{number: 1, par: 4, strokeIndex: 7}, ...]';

-- Indexes
CREATE INDEX idx_courses_state ON public.courses(state);
CREATE INDEX idx_courses_name ON public.courses(name);

-- Example holes JSONB structure:
-- [
--   {
--     "number": 1,
--     "par": 4,
--     "strokeIndex": 7,
--     "yardages": {
--       "blue": 425,
--       "white": 400,
--       "red": 350
--     }
--   },
--   ...
-- ]

-- ----------------
-- Rounds
-- ----------------

CREATE TABLE public.rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1, -- MVP: always 1 (single round)
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  date DATE,
  tee_time TIME, -- Phase 2
  game_type game_type NOT NULL DEFAULT 'stableford', -- MVP: always stableford
  status round_status DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT unique_competition_round UNIQUE (competition_id, round_number)
);

COMMENT ON TABLE public.rounds IS 'Individual rounds within competitions (MVP: one round per competition)';
COMMENT ON COLUMN public.rounds.round_number IS 'Sequential round number (MVP: always 1)';

-- Indexes
CREATE INDEX idx_rounds_competition ON public.rounds(competition_id);
CREATE INDEX idx_rounds_date ON public.rounds(date);
CREATE INDEX idx_rounds_status ON public.rounds(status);

-- ----------------
-- Competition Players (Join Table)
-- ----------------

CREATE TABLE public.competition_players (
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status invitation_status DEFAULT 'invited',
  invited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  responded_at TIMESTAMPTZ,

  PRIMARY KEY (competition_id, player_id)
);

COMMENT ON TABLE public.competition_players IS 'Players in each competition (join table)';

-- Indexes
CREATE INDEX idx_competition_players_player ON public.competition_players(player_id);
CREATE INDEX idx_competition_players_status ON public.competition_players(status);

-- ----------------
-- Pairings (Phase 2 - Auto-pairing)
-- ----------------

CREATE TABLE public.pairings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  player_ids UUID[] NOT NULL, -- Array of 2-4 player UUIDs
  tee_time TIME, -- Phase 2
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.pairings IS 'Player groupings for each round (Phase 2)';
COMMENT ON COLUMN public.pairings.player_ids IS 'Array of 2-4 player UUIDs in this group';

-- Indexes
CREATE INDEX idx_pairings_round ON public.pairings(round_id);

-- ----------------
-- Scorecards
-- ----------------

CREATE TABLE public.scorecards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Scores (JSONB for flexibility)
  scores JSONB NOT NULL DEFAULT '{}', -- { "1": {"strokes": 4, "putts": 2, ...}, "2": {...}, ... }

  -- Calculated totals
  total_gross INTEGER DEFAULT 0,
  total_net INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0, -- Stableford points

  -- Status
  status scorecard_status DEFAULT 'not-started',
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES public.users(id), -- Player who submitted (may not be the player)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT unique_round_player UNIQUE (round_id, player_id)
);

COMMENT ON TABLE public.scorecards IS 'Individual player scores for each round';
COMMENT ON COLUMN public.scorecards.scores IS 'JSON object: {"1": {"strokes": 4, "putts": 2}, "2": {...}}';
COMMENT ON COLUMN public.scorecards.submitted_by IS 'Player who submitted scorecard (may differ from player_id)';

-- Indexes
CREATE INDEX idx_scorecards_round ON public.scorecards(round_id);
CREATE INDEX idx_scorecards_player ON public.scorecards(player_id);
CREATE INDEX idx_scorecards_status ON public.scorecards(status);

-- Example scores JSONB structure:
-- {
--   "1": {
--     "strokes": 4,
--     "putts": 2,         -- Phase 2
--     "fairwayHit": true, -- Phase 2
--     "gir": false        -- Phase 2
--   },
--   "2": {
--     "strokes": 3
--   },
--   ...
-- }

-- ============================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;

-- ----------------
-- Users Policies
-- ----------------

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Users can view other players in their competitions
CREATE POLICY "Users can view competition players"
  ON public.users FOR SELECT
  USING (
    id IN (
      SELECT cp.player_id
      FROM public.competition_players cp
      WHERE cp.competition_id IN (
        SELECT competition_id
        FROM public.competition_players
        WHERE player_id = auth.uid()
      )
    )
  );

-- ----------------
-- Competitions Policies
-- ----------------

-- Organizers can CRUD their own competitions
CREATE POLICY "Organizers can view own competitions"
  ON public.competitions FOR SELECT
  USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can create competitions"
  ON public.competitions FOR INSERT
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizers can update own competitions"
  ON public.competitions FOR UPDATE
  USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can delete own competitions"
  ON public.competitions FOR DELETE
  USING (organizer_id = auth.uid());

-- Players can view competitions they're in
CREATE POLICY "Players can view joined competitions"
  ON public.competitions FOR SELECT
  USING (
    id IN (
      SELECT competition_id
      FROM public.competition_players
      WHERE player_id = auth.uid()
    )
  );

-- Anyone can view competition by invite code (to preview before joining)
CREATE POLICY "Anyone can view by invite code"
  ON public.competitions FOR SELECT
  USING (true); -- Filter by invite_code in query

-- ----------------
-- Courses Policies
-- ----------------

-- Anyone can view courses (read-only)
CREATE POLICY "Anyone can view courses"
  ON public.courses FOR SELECT
  USING (true);

-- Only authenticated users can create courses (manual entry)
CREATE POLICY "Authenticated users can create courses"
  ON public.courses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ----------------
-- Rounds Policies
-- ----------------

-- Organizers can CRUD rounds for their competitions
CREATE POLICY "Organizers can manage rounds"
  ON public.rounds FOR ALL
  USING (
    competition_id IN (
      SELECT id FROM public.competitions WHERE organizer_id = auth.uid()
    )
  );

-- Players can view rounds in their competitions
CREATE POLICY "Players can view rounds"
  ON public.rounds FOR SELECT
  USING (
    competition_id IN (
      SELECT competition_id
      FROM public.competition_players
      WHERE player_id = auth.uid()
    )
  );

-- ----------------
-- Competition Players Policies
-- ----------------

-- Organizers can manage players in their competitions
CREATE POLICY "Organizers can manage players"
  ON public.competition_players FOR ALL
  USING (
    competition_id IN (
      SELECT id FROM public.competitions WHERE organizer_id = auth.uid()
    )
  );

-- Players can view all players in their competitions
CREATE POLICY "Players can view competition players"
  ON public.competition_players FOR SELECT
  USING (
    competition_id IN (
      SELECT competition_id
      FROM public.competition_players
      WHERE player_id = auth.uid()
    )
  );

-- Players can join competitions (insert themselves)
CREATE POLICY "Players can join competitions"
  ON public.competition_players FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- ----------------
-- Pairings Policies
-- ----------------

-- Organizers can manage pairings
CREATE POLICY "Organizers can manage pairings"
  ON public.pairings FOR ALL
  USING (
    round_id IN (
      SELECT r.id
      FROM public.rounds r
      JOIN public.competitions c ON r.competition_id = c.id
      WHERE c.organizer_id = auth.uid()
    )
  );

-- Players can view pairings in their rounds
CREATE POLICY "Players can view pairings"
  ON public.pairings FOR SELECT
  USING (
    round_id IN (
      SELECT r.id
      FROM public.rounds r
      WHERE r.competition_id IN (
        SELECT competition_id
        FROM public.competition_players
        WHERE player_id = auth.uid()
      )
    )
  );

-- ----------------
-- Scorecards Policies
-- ----------------

-- Players can view scorecards in their competitions
CREATE POLICY "Players can view scorecards"
  ON public.scorecards FOR SELECT
  USING (
    round_id IN (
      SELECT r.id
      FROM public.rounds r
      WHERE r.competition_id IN (
        SELECT competition_id
        FROM public.competition_players
        WHERE player_id = auth.uid()
      )
    )
  );

-- Players can create/update scorecards for anyone in their group
-- (In MVP, one player scores for entire group)
CREATE POLICY "Players can submit scorecards"
  ON public.scorecards FOR INSERT
  WITH CHECK (
    round_id IN (
      SELECT r.id
      FROM public.rounds r
      WHERE r.competition_id IN (
        SELECT competition_id
        FROM public.competition_players
        WHERE player_id = auth.uid()
      )
    )
  );

CREATE POLICY "Players can update scorecards"
  ON public.scorecards FOR UPDATE
  USING (
    round_id IN (
      SELECT r.id
      FROM public.rounds r
      WHERE r.competition_id IN (
        SELECT competition_id
        FROM public.competition_players
        WHERE player_id = auth.uid()
      )
    )
  );

-- Organizers can view/update all scorecards in their competitions
CREATE POLICY "Organizers can manage scorecards"
  ON public.scorecards FOR ALL
  USING (
    round_id IN (
      SELECT r.id
      FROM public.rounds r
      JOIN public.competitions c ON r.competition_id = c.id
      WHERE c.organizer_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- ----------------
-- Update updated_at timestamp
-- ----------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rounds_updated_at BEFORE UPDATE ON public.rounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scorecards_updated_at BEFORE UPDATE ON public.scorecards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------
-- Generate unique invite code
-- ----------------

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code like 'COMP-94821'
    code := 'COMP-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');

    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM public.competitions WHERE invite_code = code) INTO exists;

    -- Exit loop if unique
    EXIT WHEN NOT exists;
  END LOOP;

  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- ----------------
-- Calculate Stableford points for a hole
-- ----------------

CREATE OR REPLACE FUNCTION calculate_stableford_points(
  strokes INTEGER,
  par INTEGER,
  handicap_strokes INTEGER -- Strokes received on this hole based on player handicap
)
RETURNS INTEGER AS $$
DECLARE
  net_score INTEGER;
  points INTEGER;
BEGIN
  net_score := strokes - handicap_strokes;

  -- Stableford points calculation
  points := CASE
    WHEN net_score <= (par - 2) THEN 4  -- Eagle or better
    WHEN net_score = (par - 1) THEN 3   -- Birdie
    WHEN net_score = par THEN 2         -- Par
    WHEN net_score = (par + 1) THEN 1   -- Bogey
    ELSE 0                               -- Double bogey or worse
  END;

  RETURN points;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_stableford_points IS 'Calculate Stableford points for a hole based on net score';

-- ============================================
-- MATERIALIZED VIEW - Leaderboard (Phase 2)
-- ============================================

-- For Phase 2: Real-time leaderboard updates
-- CREATE MATERIALIZED VIEW leaderboard_cache AS ...
-- Refresh on scorecard insert/update

-- ============================================
-- SEED DATA (Development Only)
-- ============================================

-- Example course with full hole data
-- INSERT INTO public.courses (name, state, city, source, holes) VALUES (
--   'Royal Melbourne (West)',
--   'VIC',
--   'Black Rock',
--   'manual',
--   '[
--     {"number": 1, "par": 4, "strokeIndex": 7},
--     {"number": 2, "par": 4, "strokeIndex": 11},
--     {"number": 3, "par": 4, "strokeIndex": 3},
--     {"number": 4, "par": 3, "strokeIndex": 17},
--     {"number": 5, "par": 5, "strokeIndex": 1},
--     {"number": 6, "par": 3, "strokeIndex": 15},
--     {"number": 7, "par": 4, "strokeIndex": 5},
--     {"number": 8, "par": 4, "strokeIndex": 13},
--     {"number": 9, "par": 4, "strokeIndex": 9},
--     {"number": 10, "par": 4, "strokeIndex": 6},
--     {"number": 11, "par": 4, "strokeIndex": 10},
--     {"number": 12, "par": 4, "strokeIndex": 2},
--     {"number": 13, "par": 3, "strokeIndex": 18},
--     {"number": 14, "par": 5, "strokeIndex": 4},
--     {"number": 15, "par": 3, "strokeIndex": 16},
--     {"number": 16, "par": 4, "strokeIndex": 8},
--     {"number": 17, "par": 4, "strokeIndex": 12},
--     {"number": 18, "par": 4, "strokeIndex": 14}
--   ]'
-- );
