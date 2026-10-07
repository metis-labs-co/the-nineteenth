-- Migration: Fix delete_user_account (account deletion was broken)
-- Date: 2026-10-07
--
-- WHY
-- ---
-- 20260227000000_account_deletion.sql cannot succeed against the schema the
-- migrations actually build. plpgsql resolves each statement when it first
-- runs, so the first bad statement aborts the whole RPC and the
-- delete-account edge function returns 500. Defects found:
--
--   1. scorecards.player_id   is NOT NULL (mvp schema)       -> SET NULL fails
--   2. hole_scores            table does not exist           -> "relation does not exist"
--   3. score_entries.player_id is NOT NULL (20260121000000:27) -> SET NULL fails
--   4. skins_results.winner_player_id  -> real column is winner_id
--   5. skins_payouts.player_id / wolf_payouts.player_id: wolf is NOT NULL
--   6. wolf_hole_decisions.wolf_player_id / partner_player_id
--                                     -> real columns wolf_id (NOT NULL) / partner_id
--   7. round_results.player_id = NULL violates the player-xor-team CHECK
--   8. friendships(user_id, friend_id) -> real columns requester_id / addressee_id
--   9. favorite_courses.user_id         -> real column player_id
--  10. handicap_differentials           table does not exist (differentials live on scorecards)
--  11. array_remove on skins_games.participant_ids breaks the 2..4 length CHECK
--
-- And two blockers for the auth.admin.deleteUser() call that follows the RPC:
--  12. rounds.user_id REFERENCES auth.users(id) with NO ACTION, and
--      rounds_ownership_check requires user_id for standalone rounds
--      -> deleting the auth user fails if they own any standalone round.
--  13. players.created_by REFERENCES auth.users ON DELETE SET NULL, but
--      chk_placeholder_has_creator forbids a placeholder with NULL creator
--      -> deleting the auth user fails if they ever created a guest player.
--
-- APPROACH
-- --------
-- Instead of NULLing player ids (which needs NOT NULL dropped on several tables,
-- breaks the round_results CHECK, and leaves NULL-player rows that client
-- leaderboard code does not expect), historical rows are re-pointed at a fresh
-- per-user "tombstone" player: a new random UUID, name 'Deleted player', a
-- non-routable email, no other profile data. Nothing links the tombstone back
-- to the deleted person, every NOT NULL / UNIQUE / CHECK constraint keeps
-- holding (a fresh id never collides), and existing RLS policies are untouched
-- (they key on auth.uid(), which never equals a tombstone id).
--
-- Every foreign key that references players(id) and would otherwise BLOCK the
-- final DELETE (NO ACTION / RESTRICT / SET DEFAULT, or SET NULL on a NOT NULL
-- column) is discovered from the catalog and re-pointed, so the function also
-- keeps working when new tables are added or prod has drifted from migrations.
-- Personal data (profile, friendships, push tokens, stats, shot GPS, etc.) is
-- hard-deleted, explicitly or via ON DELETE CASCADE.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 13. Allow orphaned guest players (creator deleted their account)
-- ----------------------------------------------------------------------------
ALTER TABLE players DROP CONSTRAINT IF EXISTS chk_placeholder_has_creator;

COMMENT ON COLUMN players.created_by IS
  'auth user who created this placeholder. NULL for real players, and for placeholders whose creator deleted their account (orphaned guests).';

-- ----------------------------------------------------------------------------
-- Internal helpers (guarded: skip silently if the table/column does not exist)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _account_deletion_delete_rows(
  p_table TEXT, p_column TEXT, p_user_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_table AND column_name = p_column
  ) THEN
    EXECUTE format('DELETE FROM public.%I WHERE %I = $1', p_table, p_column) USING p_user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION _account_deletion_repoint(
  p_table TEXT, p_column TEXT, p_old UUID, p_new UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_type TEXT;
BEGIN
  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = p_table AND column_name = p_column;

  IF v_type IS NULL THEN
    RETURN;
  ELSIF v_type = 'ARRAY' THEN
    EXECUTE format(
      'UPDATE public.%1$I SET %2$I = array_replace(%2$I, $1, $2) WHERE $1 = ANY(%2$I)',
      p_table, p_column
    ) USING p_old, p_new;
  ELSE
    EXECUTE format('UPDATE public.%1$I SET %2$I = $2 WHERE %2$I = $1', p_table, p_column)
      USING p_old, p_new;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION _account_deletion_delete_rows(TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION _account_deletion_repoint(TEXT, TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- delete_user_account (replaces 20260227000000 version; same signature)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tombstone UUID := gen_random_uuid();
  v_fk RECORD;
  v_round RECORD;
  v_new_owner UUID;
  v_referenced BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM players WHERE id = p_user_id AND is_placeholder IS NOT TRUE) THEN
    -- Nothing to anonymise (no profile row); let the edge function delete the auth user.
    RETURN TRUE;
  END IF;

  -- ==========================================================================
  -- 1. Hard-delete personal data and memberships
  --    (most of these also cascade from players; explicit for clarity and so
  --    nothing below re-points them to the tombstone)
  -- ==========================================================================
  PERFORM _account_deletion_delete_rows('push_tokens', 'user_id', p_user_id);
  PERFORM _account_deletion_delete_rows('notifications', 'user_id', p_user_id);
  PERFORM _account_deletion_delete_rows('notifications', 'player_id', p_user_id);
  PERFORM _account_deletion_delete_rows('friendships', 'requester_id', p_user_id);
  PERFORM _account_deletion_delete_rows('friendships', 'addressee_id', p_user_id);
  PERFORM _account_deletion_delete_rows('favorite_courses', 'player_id', p_user_id);
  PERFORM _account_deletion_delete_rows('user_subscriptions', 'user_id', p_user_id);
  PERFORM _account_deletion_delete_rows('user_preferences', 'user_id', p_user_id);
  PERFORM _account_deletion_delete_rows('player_achievements', 'player_id', p_user_id);
  PERFORM _account_deletion_delete_rows('achievement_progress', 'player_id', p_user_id);
  PERFORM _account_deletion_delete_rows('player_cosmetics', 'player_id', p_user_id);
  PERFORM _account_deletion_delete_rows('skins_player_statistics', 'player_id', p_user_id);
  PERFORM _account_deletion_delete_rows('wolf_player_statistics', 'player_id', p_user_id);
  PERFORM _account_deletion_delete_rows('shot_log', 'player_id', p_user_id);
  PERFORM _account_deletion_delete_rows('custom_hole_tees', 'user_id', p_user_id);
  PERFORM _account_deletion_delete_rows('scoring_pairs', 'scorer_id', p_user_id);
  PERFORM _account_deletion_delete_rows('scoring_pairs', 'player_id', p_user_id);
  PERFORM _account_deletion_delete_rows('competition_players', 'player_id', p_user_id);
  PERFORM _account_deletion_delete_rows('league_players', 'player_id', p_user_id);

  -- ==========================================================================
  -- 2. Standalone rounds owned by the user (rounds.user_id -> auth.users is
  --    NO ACTION and required for standalone rounds). Hand ownership to another
  --    real participant; if there is none, the round is the user's own and is
  --    deleted (cascades its scorecards, shot_log, etc.).
  -- ==========================================================================
  FOR v_round IN
    SELECT id FROM rounds WHERE user_id = p_user_id AND competition_id IS NULL
  LOOP
    SELECT rp.player_id INTO v_new_owner
    FROM round_players rp
    JOIN players p ON p.id = rp.player_id
    JOIN auth.users u ON u.id = rp.player_id
    WHERE rp.round_id = v_round.id
      AND rp.player_id <> p_user_id
      AND p.is_placeholder IS NOT TRUE
    ORDER BY rp.created_at
    LIMIT 1;

    IF v_new_owner IS NOT NULL THEN
      UPDATE rounds SET user_id = v_new_owner WHERE id = v_round.id;
    ELSE
      DELETE FROM rounds WHERE id = v_round.id;
    END IF;
  END LOOP;

  -- Competition rounds may also carry user_id; it is optional there.
  UPDATE rounds SET user_id = NULL WHERE user_id = p_user_id AND competition_id IS NOT NULL;

  PERFORM _account_deletion_delete_rows('round_players', 'player_id', p_user_id);

  -- ==========================================================================
  -- 3. Create the tombstone that keeps historical rows valid
  -- ==========================================================================
  INSERT INTO players (id, name, email, is_placeholder)
  VALUES (v_tombstone, 'Deleted player', v_tombstone::TEXT || '@deleted.invalid', FALSE);

  -- AFTER INSERT triggers create default subscription/preferences rows; the
  -- tombstone is not a user, so drop them.
  PERFORM _account_deletion_delete_rows('user_subscriptions', 'user_id', v_tombstone);
  PERFORM _account_deletion_delete_rows('user_preferences', 'user_id', v_tombstone);

  -- ==========================================================================
  -- 4. Re-point historical score rows (these FKs CASCADE, so without this the
  --    final DELETE would wipe other players' leaderboards)
  -- ==========================================================================
  PERFORM _account_deletion_repoint('scorecards', 'player_id', p_user_id, v_tombstone);
  PERFORM _account_deletion_repoint('score_entries', 'player_id', p_user_id, v_tombstone);
  PERFORM _account_deletion_repoint('score_entries', 'scorer_id', p_user_id, v_tombstone);
  PERFORM _account_deletion_repoint('round_results', 'player_id', p_user_id, v_tombstone);
  PERFORM _account_deletion_repoint('team_members', 'player_id', p_user_id, v_tombstone);

  -- Player-id arrays (array_replace keeps array lengths, so the skins 2..4
  -- participant CHECK and wolf rotation stay valid)
  PERFORM _account_deletion_repoint('pairings', 'player_ids', p_user_id, v_tombstone);
  PERFORM _account_deletion_repoint('skins_games', 'participant_ids', p_user_id, v_tombstone);
  PERFORM _account_deletion_repoint('wolf_games', 'participant_ids', p_user_id, v_tombstone);
  PERFORM _account_deletion_repoint('wolf_games', 'wolf_order', p_user_id, v_tombstone);

  -- league_partnerships requires player_1_id < player_2_id: re-order the pair.
  IF to_regclass('public.league_partnerships') IS NOT NULL THEN
    UPDATE league_partnerships
    SET player_1_id = LEAST(CASE WHEN player_1_id = p_user_id THEN v_tombstone ELSE player_1_id END,
                            CASE WHEN player_2_id = p_user_id THEN v_tombstone ELSE player_2_id END),
        player_2_id = GREATEST(CASE WHEN player_1_id = p_user_id THEN v_tombstone ELSE player_1_id END,
                               CASE WHEN player_2_id = p_user_id THEN v_tombstone ELSE player_2_id END)
    WHERE player_1_id = p_user_id OR player_2_id = p_user_id;
  END IF;

  -- ==========================================================================
  -- 5. Re-point every remaining FK to players(id) that would BLOCK the delete
  --    (NO ACTION / RESTRICT / SET DEFAULT, or SET NULL on a NOT NULL column):
  --    skins/wolf payouts and hole decisions, prize pools, knockout matches,
  --    competition organiser columns, created_by audit columns, etc.
  -- ==========================================================================
  FOR v_fk IN
    SELECT c.conrelid::regclass::TEXT AS tbl, a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.players'::regclass
      AND array_length(c.conkey, 1) = 1
      AND c.conrelid <> 'public.players'::regclass
      AND (c.confdeltype IN ('a', 'r', 'd') OR (c.confdeltype = 'n' AND a.attnotnull))
  LOOP
    EXECUTE format('UPDATE %s SET %I = $2 WHERE %I = $1', v_fk.tbl, v_fk.col, v_fk.col)
      USING p_user_id, v_tombstone;
  END LOOP;

  -- Placeholders that were linked to (merged into) this user
  UPDATE players SET linked_player_id = NULL WHERE linked_player_id = p_user_id;

  -- ==========================================================================
  -- 6. Delete the player record (remaining CASCADE / SET NULL FKs fire)
  -- ==========================================================================
  DELETE FROM players WHERE id = p_user_id;

  -- ==========================================================================
  -- 7. Drop the tombstone again if nothing ended up pointing at it (e.g. a
  --    brand-new account with no history), so no empty "Deleted player" rows
  --    accumulate.
  -- ==========================================================================
  v_referenced := FALSE;
  FOR v_fk IN
    SELECT c.conrelid::regclass::TEXT AS tbl, a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.players'::regclass
      AND array_length(c.conkey, 1) = 1
  LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s WHERE %I = $1)', v_fk.tbl, v_fk.col)
      INTO v_referenced USING v_tombstone;
    EXIT WHEN v_referenced;
  END LOOP;

  IF NOT v_referenced THEN
    FOR v_fk IN
      SELECT table_name AS tbl, column_name AS col
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (table_name, column_name) IN (('pairings', 'player_ids'),
                                          ('skins_games', 'participant_ids'),
                                          ('wolf_games', 'participant_ids'),
                                          ('wolf_games', 'wolf_order'))
    LOOP
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE $1 = ANY(%I))', v_fk.tbl, v_fk.col)
        INTO v_referenced USING v_tombstone;
      EXIT WHEN v_referenced;
    END LOOP;
  END IF;

  IF NOT v_referenced THEN
    DELETE FROM players WHERE id = v_tombstone;
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION delete_user_account(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION delete_user_account(UUID) FROM anon;
REVOKE ALL ON FUNCTION delete_user_account(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO service_role;

COMMENT ON FUNCTION delete_user_account(UUID) IS
  'Deletes a user account: hard-deletes personal data, re-points historical score rows to a fresh anonymous "Deleted player" tombstone, deletes the player row. Leaves the account ready for auth.admin.deleteUser. Called via service_role from the delete-account edge function. Replaces the broken 20260227000000 version.';
