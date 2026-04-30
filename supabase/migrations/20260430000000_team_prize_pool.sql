-- =====================================================
-- Team Prize Pool Migration
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Adds support for team prize pools alongside the existing individual
-- prize pool. Key changes:
--
--   * competition_prize_pools.target_type discriminates 'individual' from
--     'team' pools. A competition can have one of each.
--   * prize_pool_placements gains team_id (XOR with player_id).
--   * teams.final_position is written on team-pool settlement.
--   * pool_transactions gains player_id and team_id so per-member team-
--     pool payouts are queryable.
--   * Triggers enforce that team pools require team_mode='fixed' and that
--     placement participant columns match the parent pool's target_type.
--   * settle_team_prize_pool() RPC mirrors settle_prize_pool() but reads
--     teams.final_position and writes per-member share transactions.
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. competition_prize_pools.target_type
-- -----------------------------------------------------

ALTER TABLE competition_prize_pools
  ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (target_type IN ('individual', 'team'));

COMMENT ON COLUMN competition_prize_pools.target_type IS
  'Discriminator: ''individual'' pays players, ''team'' pays teams (auto-split among members).';

-- The original migration declared `competition_id UUID NOT NULL UNIQUE ...`,
-- producing an auto-named unique index. Drop it and replace with a composite
-- so a competition can have one pool per target_type.
ALTER TABLE competition_prize_pools
  DROP CONSTRAINT IF EXISTS competition_prize_pools_competition_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_pool_per_competition_target'
      AND conrelid = 'competition_prize_pools'::regclass
  ) THEN
    ALTER TABLE competition_prize_pools
      ADD CONSTRAINT unique_pool_per_competition_target
      UNIQUE (competition_id, target_type);
  END IF;
END $$;

-- -----------------------------------------------------
-- 2. prize_pool_placements.team_id
-- -----------------------------------------------------

ALTER TABLE prize_pool_placements
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

COMMENT ON COLUMN prize_pool_placements.team_id IS
  'Team assigned to this placement on settlement (team pools only). XOR with player_id.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'placement_xor_player_or_team'
      AND conrelid = 'prize_pool_placements'::regclass
  ) THEN
    ALTER TABLE prize_pool_placements
      ADD CONSTRAINT placement_xor_player_or_team CHECK (
        (player_id IS NOT NULL AND team_id IS NULL) OR
        (player_id IS NULL AND team_id IS NOT NULL) OR
        (player_id IS NULL AND team_id IS NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prize_pool_placements_team_id
  ON prize_pool_placements(team_id) WHERE team_id IS NOT NULL;

-- -----------------------------------------------------
-- 3. teams.final_position
-- -----------------------------------------------------

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS final_position INTEGER NULL;

COMMENT ON COLUMN teams.final_position IS
  'Set on team-pool settlement to map placements to teams. NULL pre-settlement.';

CREATE INDEX IF NOT EXISTS idx_teams_competition_final_position
  ON teams(competition_id, final_position);

-- -----------------------------------------------------
-- 4. pool_transactions.player_id, team_id
-- -----------------------------------------------------

ALTER TABLE pool_transactions
  ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

COMMENT ON COLUMN pool_transactions.player_id IS
  'Recipient player (set on prize_payout rows for individual pools and per-member team-pool shares).';
COMMENT ON COLUMN pool_transactions.team_id IS
  'Source team (set on team-pool prize_payout rows alongside player_id).';

CREATE INDEX IF NOT EXISTS idx_pool_transactions_player_id
  ON pool_transactions(player_id) WHERE player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pool_transactions_team_id
  ON pool_transactions(team_id) WHERE team_id IS NOT NULL;

-- -----------------------------------------------------
-- 5. Trigger: team pools require team_mode = 'fixed'
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION enforce_team_pool_requires_fixed_teams()
RETURNS TRIGGER AS $$
DECLARE
  v_team_mode TEXT;
BEGIN
  IF NEW.target_type = 'team' THEN
    SELECT team_mode::TEXT INTO v_team_mode
    FROM competitions
    WHERE id = NEW.competition_id;

    IF v_team_mode IS DISTINCT FROM 'fixed' THEN
      RAISE EXCEPTION 'Team prize pools require competition team_mode = ''fixed'' (got: %)',
        COALESCE(v_team_mode, 'NULL');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_team_pool_team_mode ON competition_prize_pools;
CREATE TRIGGER check_team_pool_team_mode
  BEFORE INSERT OR UPDATE ON competition_prize_pools
  FOR EACH ROW
  EXECUTE FUNCTION enforce_team_pool_requires_fixed_teams();

-- -----------------------------------------------------
-- 6. Trigger: placement participant matches pool target_type
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION enforce_placement_target_alignment()
RETURNS TRIGGER AS $$
DECLARE
  v_target TEXT;
BEGIN
  -- Pre-settlement rows have neither player_id nor team_id; allow.
  IF NEW.player_id IS NULL AND NEW.team_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT target_type INTO v_target
  FROM competition_prize_pools
  WHERE id = NEW.pool_id;

  IF v_target = 'individual' AND NEW.team_id IS NOT NULL THEN
    RAISE EXCEPTION 'Individual pool placements cannot have team_id';
  END IF;

  IF v_target = 'team' AND NEW.player_id IS NOT NULL THEN
    RAISE EXCEPTION 'Team pool placements cannot have player_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_placement_target_alignment ON prize_pool_placements;
CREATE TRIGGER check_placement_target_alignment
  BEFORE INSERT OR UPDATE ON prize_pool_placements
  FOR EACH ROW
  EXECUTE FUNCTION enforce_placement_target_alignment();

-- -----------------------------------------------------
-- 7. settle_team_prize_pool RPC
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION settle_team_prize_pool(p_pool_id UUID)
RETURNS VOID AS $$
DECLARE
  v_competition_id UUID;
  v_target TEXT;
  v_placement RECORD;
  v_team_id UUID;
  v_member_count INTEGER;
  v_share DECIMAL(10, 2);
  v_member RECORD;
BEGIN
  SELECT competition_id, target_type INTO v_competition_id, v_target
  FROM competition_prize_pools
  WHERE id = p_pool_id;

  IF v_competition_id IS NULL THEN
    RAISE EXCEPTION 'Prize pool not found: %', p_pool_id;
  END IF;

  IF v_target IS DISTINCT FROM 'team' THEN
    RAISE EXCEPTION 'settle_team_prize_pool called on non-team pool (target=%)', v_target;
  END IF;

  FOR v_placement IN
    SELECT id, position, payout_amount
    FROM prize_pool_placements
    WHERE pool_id = p_pool_id
    ORDER BY position
  LOOP
    -- Reset and find team at this position
    v_team_id := NULL;
    SELECT id INTO v_team_id
    FROM teams
    WHERE competition_id = v_competition_id
      AND final_position = v_placement.position
    LIMIT 1;

    IF v_team_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Assign team to placement
    UPDATE prize_pool_placements
    SET team_id = v_team_id, paid_at = NOW(), updated_at = NOW()
    WHERE id = v_placement.id;

    -- Per-member share
    SELECT COUNT(*) INTO v_member_count
    FROM team_members
    WHERE team_id = v_team_id;

    IF v_member_count = 0 THEN
      CONTINUE;
    END IF;

    v_share := ROUND(v_placement.payout_amount / v_member_count, 2);

    -- One transaction row per team member
    FOR v_member IN
      SELECT player_id FROM team_members WHERE team_id = v_team_id
    LOOP
      INSERT INTO pool_transactions
        (pool_id, transaction_type, amount, description, balance_after, team_id, player_id)
      VALUES (
        p_pool_id,
        'prize_payout',
        -v_share,
        'Team payout: position ' || v_placement.position,
        get_pool_balance(p_pool_id),
        v_team_id,
        v_member.player_id
      );
    END LOOP;
  END LOOP;

  UPDATE competition_prize_pools
  SET status = 'settled', updated_at = NOW()
  WHERE id = p_pool_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION settle_team_prize_pool(UUID) IS
  'Assigns teams to placements via teams.final_position and writes per-member prize_payout transactions at payout_amount / team_size.';

COMMIT;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
