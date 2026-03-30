-- 9-hole round support (standalone only)
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS nine_type TEXT NOT NULL DEFAULT 'full';
DO $$ BEGIN
  ALTER TABLE rounds ADD CONSTRAINT rounds_nine_type_check
    CHECK (nine_type IN ('full', 'front9', 'back9'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Per-player tee selection (standalone rounds)
ALTER TABLE round_players ADD COLUMN IF NOT EXISTS selected_tee JSONB;

-- Per-player tee selection (competition default)
ALTER TABLE competition_players ADD COLUMN IF NOT EXISTS selected_tee JSONB;

-- Per-round tee override for competition players
CREATE TABLE IF NOT EXISTS competition_round_player_tees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  selected_tee JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(round_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_crpt_round_id ON competition_round_player_tees(round_id);
CREATE INDEX IF NOT EXISTS idx_crpt_player_id ON competition_round_player_tees(player_id);

-- RLS for competition_round_player_tees
ALTER TABLE competition_round_player_tees ENABLE ROW LEVEL SECURITY;

-- SELECT: competition members or organizer
DO $$ BEGIN
  CREATE POLICY crpt_select ON competition_round_player_tees FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM rounds r
        JOIN competitions c ON c.id = r.competition_id
        JOIN competition_players cp ON cp.competition_id = c.id
        WHERE r.id = competition_round_player_tees.round_id
          AND cp.player_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM rounds r
        JOIN competitions c ON c.id = r.competition_id
        WHERE r.id = competition_round_player_tees.round_id
          AND c.organizer_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- INSERT: organizer only
DO $$ BEGIN
  CREATE POLICY crpt_insert ON competition_round_player_tees FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM rounds r
        JOIN competitions c ON c.id = r.competition_id
        WHERE r.id = competition_round_player_tees.round_id
          AND c.organizer_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- UPDATE: organizer only
DO $$ BEGIN
  CREATE POLICY crpt_update ON competition_round_player_tees FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM rounds r
        JOIN competitions c ON c.id = r.competition_id
        WHERE r.id = competition_round_player_tees.round_id
          AND c.organizer_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DELETE: organizer only
DO $$ BEGIN
  CREATE POLICY crpt_delete ON competition_round_player_tees FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM rounds r
        JOIN competitions c ON c.id = r.competition_id
        WHERE r.id = competition_round_player_tees.round_id
          AND c.organizer_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
