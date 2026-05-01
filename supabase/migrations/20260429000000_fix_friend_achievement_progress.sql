-- =====================================================
-- Fix Friend Achievement Progress
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Problem: achievement_progress.current_value for FIRST_FRIEND_1,
-- SOCIAL_CIRCLE_1 and SOCIAL_CIRCLE was only updated client-side in one
-- direction (when the current user accepts an incoming request). When the
-- other party accepted an outgoing request, this user's progress was never
-- updated. Removing a friend never decremented progress either. Direct
-- inserts (seed data, retroactive) also bypassed the counter.
--
-- Fix:
--   1. Add a database trigger on `friendships` that recomputes both
--      players' accepted-friend counts whenever a row is created, updated,
--      or deleted, and upserts achievement_progress accordingly.
--   2. Award player_achievements that are now over-threshold.
--   3. Backfill all existing players based on the current state of the
--      friendships table.
--
-- Achievement code mapping (per achievementChecker base_code resolution):
--   - FIRST_FRIEND_1: progress key = 'FIRST_FRIEND_1' (base_achievement NULL)
--   - SOCIAL_CIRCLE_1: progress key = 'SOCIAL_CIRCLE_1' (base_achievement NULL)
--   - SOCIAL_CIRCLE_2..5: progress key = 'SOCIAL_CIRCLE' (shared base)
-- All three keys are kept in sync to the friend count.
-- =====================================================

-- =====================================================
-- FUNCTION: sync_friend_achievement_progress
-- Recomputes a single player's friend-related achievement progress and
-- awards any newly-earned tier achievements. Idempotent.
-- =====================================================
CREATE OR REPLACE FUNCTION sync_friend_achievement_progress(p_player_id UUID)
RETURNS VOID AS $$
DECLARE
  v_friend_count INTEGER;
  v_achievement RECORD;
BEGIN
  IF p_player_id IS NULL THEN
    RETURN;
  END IF;

  -- Compute the player's current accepted-friend count.
  SELECT COUNT(*) INTO v_friend_count
  FROM friendships
  WHERE (requester_id = p_player_id OR addressee_id = p_player_id)
    AND status = 'accepted';

  -- Upsert progress for each tracked code. We set the value (not GREATEST)
  -- because the friend count can decrease when a friendship is removed.
  INSERT INTO achievement_progress (player_id, achievement_code, current_value)
  VALUES (p_player_id, 'FIRST_FRIEND_1', v_friend_count)
  ON CONFLICT (player_id, achievement_code) DO UPDATE
  SET current_value = EXCLUDED.current_value, last_updated = NOW();

  INSERT INTO achievement_progress (player_id, achievement_code, current_value)
  VALUES (p_player_id, 'SOCIAL_CIRCLE_1', v_friend_count)
  ON CONFLICT (player_id, achievement_code) DO UPDATE
  SET current_value = EXCLUDED.current_value, last_updated = NOW();

  INSERT INTO achievement_progress (player_id, achievement_code, current_value)
  VALUES (p_player_id, 'SOCIAL_CIRCLE', v_friend_count)
  ON CONFLICT (player_id, achievement_code) DO UPDATE
  SET current_value = EXCLUDED.current_value, last_updated = NOW();

  -- Award any social-category tier achievements whose threshold is now met.
  -- ON CONFLICT DO NOTHING ensures idempotency for already-earned rows.
  FOR v_achievement IN
    SELECT ad.id, ad.code, ad.threshold
    FROM achievement_definitions ad
    WHERE ad.code IN (
        'FIRST_FRIEND_1',
        'SOCIAL_CIRCLE_1',
        'SOCIAL_CIRCLE_2',
        'SOCIAL_CIRCLE_3',
        'SOCIAL_CIRCLE_4',
        'SOCIAL_CIRCLE_5'
      )
      AND v_friend_count >= ad.threshold
  LOOP
    INSERT INTO player_achievements (player_id, achievement_id, progress, earned_at)
    VALUES (p_player_id, v_achievement.id, v_friend_count, NOW())
    ON CONFLICT (player_id, achievement_id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_friend_achievement_progress(UUID) IS
  'Recomputes a player''s accepted-friend count and updates achievement_progress + player_achievements for the FIRST_FRIEND and SOCIAL_CIRCLE achievement families. Safe to call repeatedly.';

-- =====================================================
-- FUNCTION: trigger_sync_friend_achievements
-- Trigger wrapper invoked from friendships INSERT/UPDATE/DELETE.
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_sync_friend_achievements()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only sync when the row is created already-accepted (rare).
    IF NEW.status = 'accepted' THEN
      PERFORM sync_friend_achievement_progress(NEW.requester_id);
      PERFORM sync_friend_achievement_progress(NEW.addressee_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Sync if accepted-ness changed in either direction. We sync both
    -- players to keep their counters truthful even if the row's accepted
    -- state didn't actually change (idempotent and cheap).
    IF NEW.status = 'accepted' OR OLD.status = 'accepted' THEN
      PERFORM sync_friend_achievement_progress(NEW.requester_id);
      PERFORM sync_friend_achievement_progress(NEW.addressee_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement only matters if the row was accepted.
    IF OLD.status = 'accepted' THEN
      PERFORM sync_friend_achievement_progress(OLD.requester_id);
      PERFORM sync_friend_achievement_progress(OLD.addressee_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace any prior version of the trigger before recreating.
DROP TRIGGER IF EXISTS friendships_sync_achievements ON friendships;

CREATE TRIGGER friendships_sync_achievements
  AFTER INSERT OR UPDATE OR DELETE ON friendships
  FOR EACH ROW EXECUTE FUNCTION trigger_sync_friend_achievements();

-- =====================================================
-- BACKFILL: Reconcile every existing player.
-- =====================================================
-- We iterate every non-placeholder player so progress is also explicitly
-- zeroed for users who currently have no friends but may have stale
-- progress rows from prior buggy increments.
DO $$
DECLARE
  v_player RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Backfilling friend achievement progress ===';

  FOR v_player IN
    SELECT p.id
    FROM players p
    WHERE p.is_placeholder = FALSE
  LOOP
    PERFORM sync_friend_achievement_progress(v_player.id);
    v_count := v_count + 1;
    IF v_count % 100 = 0 THEN
      RAISE NOTICE 'Synced % players', v_count;
    END IF;
  END LOOP;

  RAISE NOTICE 'Friend achievement progress backfill complete (% players)', v_count;
END;
$$;
