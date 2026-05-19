-- =====================================================
-- Competition slot capacity + organizer-not-playing
-- =====================================================
-- Lets an organizer fully set up a competition before any players join,
-- with an optional player slot capacity (e.g. "12 slots"), an optional
-- "lock when full" toggle, and an optional "I'm organizing, not playing"
-- flag so the organizer is not auto-added to competition_players.
-- =====================================================

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS max_players INTEGER,
  ADD COLUMN IF NOT EXISTS lock_at_capacity BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS organizer_is_player BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE competitions
  DROP CONSTRAINT IF EXISTS competitions_max_players_check;

ALTER TABLE competitions
  ADD CONSTRAINT competitions_max_players_check
    CHECK (max_players IS NULL OR max_players >= 2);

COMMENT ON COLUMN competitions.max_players IS
  'Optional capacity for total accepted players. NULL = no limit.';
COMMENT ON COLUMN competitions.lock_at_capacity IS
  'When true and max_players is set, joins are blocked once capacity is reached.';
COMMENT ON COLUMN competitions.organizer_is_player IS
  'When false, the organizer is not auto-added to competition_players and does not appear in pairings, scoring, or leaderboards.';

-- -----------------------------------------------------
-- Enforce capacity at the DB level
-- -----------------------------------------------------
-- Client checks capacity before insert, but a trigger guarantees the cap is
-- never exceeded even if multiple joins race against each other.
CREATE OR REPLACE FUNCTION public.enforce_competition_capacity()
RETURNS TRIGGER AS $$
DECLARE
  cap INTEGER;
  lock_flag BOOLEAN;
  current_count INTEGER;
BEGIN
  -- Only enforce when transitioning into 'accepted' (joins or invite responses)
  IF NEW.status IS DISTINCT FROM 'accepted' THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, if the row was already accepted, the count is unchanged
  IF TG_OP = 'UPDATE' AND OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT max_players, lock_at_capacity
    INTO cap, lock_flag
    FROM competitions
   WHERE id = NEW.competition_id;

  IF cap IS NULL OR lock_flag IS FALSE THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO current_count
    FROM competition_players
   WHERE competition_id = NEW.competition_id
     AND status = 'accepted';

  IF current_count >= cap THEN
    RAISE EXCEPTION 'Competition is full (% of % slots filled)', current_count, cap
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_competition_capacity ON competition_players;

CREATE TRIGGER trg_enforce_competition_capacity
  BEFORE INSERT OR UPDATE ON competition_players
  FOR EACH ROW EXECUTE FUNCTION public.enforce_competition_capacity();

COMMENT ON FUNCTION public.enforce_competition_capacity IS
  'Blocks acceptance of a competition_players row when competitions.max_players is set and competitions.lock_at_capacity is true and the cap has been reached.';
