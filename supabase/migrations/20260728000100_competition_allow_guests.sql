-- Phase 1B.3: per-competition gate for placeholder/guest players.

ALTER TABLE competitions
  ADD COLUMN allow_guests BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN competitions.allow_guests IS
  'Whether organisers may add placeholder guest players. Disabling does not remove existing guests.';

CREATE OR REPLACE FUNCTION enforce_competition_guest_setting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM players p
    JOIN competitions c ON c.id = NEW.competition_id
    WHERE p.id = NEW.player_id
      AND p.is_placeholder = TRUE
      AND c.allow_guests = FALSE
  ) THEN
    RAISE EXCEPTION 'Guest players are disabled for this competition'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_competition_guest_setting_before_write
  BEFORE INSERT OR UPDATE OF competition_id, player_id
  ON competition_players
  FOR EACH ROW
  EXECUTE FUNCTION enforce_competition_guest_setting();
