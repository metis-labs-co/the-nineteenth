-- Handicap Combined Rounds
--
-- Allows a player to pair two 9-hole scorecards (one front9, one back9)
-- on the same course into a single 18-hole entry for WHS handicap purposes.
-- The combined entry has its own pre-computed differential and is counted
-- toward the player's Social Handicap Index in place of the two 9-hole
-- scorecards that compose it.

CREATE TABLE IF NOT EXISTS handicap_combined_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  front_scorecard_id UUID NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
  back_scorecard_id UUID NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  -- Combined round metrics
  combined_gross INTEGER NOT NULL CHECK (combined_gross > 0),
  handicap_differential NUMERIC(4,1) NOT NULL,
  course_rating_used NUMERIC(4,1) NOT NULL,
  slope_rating_used INTEGER NOT NULL,
  daily_handicap_used INTEGER,
  ga_handicap_used NUMERIC(4,1),

  -- Effective timestamp used for ordering in handicap history.
  -- Defaults to the later of the two source scorecards' submitted_at.
  effective_date TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A scorecard can only participate in one combination at a time
  CONSTRAINT hcr_front_back_distinct CHECK (front_scorecard_id <> back_scorecard_id),
  CONSTRAINT hcr_unique_front UNIQUE (front_scorecard_id),
  CONSTRAINT hcr_unique_back UNIQUE (back_scorecard_id)
);

CREATE INDEX IF NOT EXISTS idx_hcr_player_id ON handicap_combined_rounds(player_id);
CREATE INDEX IF NOT EXISTS idx_hcr_course_id ON handicap_combined_rounds(course_id);
CREATE INDEX IF NOT EXISTS idx_hcr_effective_date ON handicap_combined_rounds(effective_date DESC);

-- Row-level security: a player can only see/manage their own combinations
ALTER TABLE handicap_combined_rounds ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY hcr_select_own ON handicap_combined_rounds FOR SELECT
    USING (player_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY hcr_insert_own ON handicap_combined_rounds FOR INSERT
    WITH CHECK (player_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY hcr_delete_own ON handicap_combined_rounds FOR DELETE
    USING (player_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
