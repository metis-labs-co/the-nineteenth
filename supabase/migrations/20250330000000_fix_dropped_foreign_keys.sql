-- =====================================================
-- Fix Dropped Foreign Keys
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration recreates foreign key constraints that
-- were accidentally dropped by the CASCADE in migration
-- 20250329000000_placeholder_players.sql when dropping
-- the players primary key constraint.
--
-- Line 48 of that migration:
--   ALTER TABLE players DROP CONSTRAINT IF EXISTS players_pkey CASCADE;
--
-- The CASCADE dropped ALL FK constraints referencing players(id).
-- =====================================================

-- =====================================================
-- FRIENDSHIPS TABLE
-- =====================================================

-- Recreate requester_id FK
ALTER TABLE friendships
  DROP CONSTRAINT IF EXISTS friendships_requester_id_fkey;

ALTER TABLE friendships
  ADD CONSTRAINT friendships_requester_id_fkey
  FOREIGN KEY (requester_id)
  REFERENCES players(id)
  ON DELETE CASCADE;

-- Recreate addressee_id FK
ALTER TABLE friendships
  DROP CONSTRAINT IF EXISTS friendships_addressee_id_fkey;

ALTER TABLE friendships
  ADD CONSTRAINT friendships_addressee_id_fkey
  FOREIGN KEY (addressee_id)
  REFERENCES players(id)
  ON DELETE CASCADE;

-- =====================================================
-- ROUND_PLAYERS TABLE
-- =====================================================

-- Recreate player_id FK
ALTER TABLE round_players
  DROP CONSTRAINT IF EXISTS round_players_player_id_fkey;

ALTER TABLE round_players
  ADD CONSTRAINT round_players_player_id_fkey
  FOREIGN KEY (player_id)
  REFERENCES players(id)
  ON DELETE CASCADE;

-- Recreate added_by FK
ALTER TABLE round_players
  DROP CONSTRAINT IF EXISTS round_players_added_by_fkey;

ALTER TABLE round_players
  ADD CONSTRAINT round_players_added_by_fkey
  FOREIGN KEY (added_by)
  REFERENCES players(id)
  ON DELETE SET NULL;

-- =====================================================
-- COMPETITION_PLAYERS TABLE
-- =====================================================

ALTER TABLE competition_players
  DROP CONSTRAINT IF EXISTS competition_players_player_id_fkey;

ALTER TABLE competition_players
  ADD CONSTRAINT competition_players_player_id_fkey
  FOREIGN KEY (player_id)
  REFERENCES players(id)
  ON DELETE CASCADE;

-- =====================================================
-- SCORECARDS TABLE
-- =====================================================

ALTER TABLE scorecards
  DROP CONSTRAINT IF EXISTS scorecards_player_id_fkey;

ALTER TABLE scorecards
  ADD CONSTRAINT scorecards_player_id_fkey
  FOREIGN KEY (player_id)
  REFERENCES players(id)
  ON DELETE CASCADE;

ALTER TABLE scorecards
  DROP CONSTRAINT IF EXISTS scorecards_submitted_by_fkey;

ALTER TABLE scorecards
  ADD CONSTRAINT scorecards_submitted_by_fkey
  FOREIGN KEY (submitted_by)
  REFERENCES players(id)
  ON DELETE SET NULL;

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES players(id)
  ON DELETE CASCADE;

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_player_id_fkey;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_player_id_fkey
  FOREIGN KEY (player_id)
  REFERENCES players(id)
  ON DELETE CASCADE;

-- =====================================================
-- PUSH_TOKENS TABLE
-- =====================================================

ALTER TABLE push_tokens
  DROP CONSTRAINT IF EXISTS push_tokens_user_id_fkey;

ALTER TABLE push_tokens
  ADD CONSTRAINT push_tokens_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES players(id)
  ON DELETE CASCADE;

-- =====================================================
-- USER_PREFERENCES TABLE
-- (conditionally applied - table may not exist yet on fresh DBs)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
    ALTER TABLE user_preferences
      DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;

    ALTER TABLE user_preferences
      ADD CONSTRAINT user_preferences_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES players(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- FAVORITE_COURSES TABLE
-- =====================================================

ALTER TABLE favorite_courses
  DROP CONSTRAINT IF EXISTS favorite_courses_player_id_fkey;

ALTER TABLE favorite_courses
  ADD CONSTRAINT favorite_courses_player_id_fkey
  FOREIGN KEY (player_id)
  REFERENCES players(id)
  ON DELETE CASCADE;

-- =====================================================
-- SCORING_PAIRS TABLE
-- =====================================================

ALTER TABLE scoring_pairs
  DROP CONSTRAINT IF EXISTS scoring_pairs_scorer_id_fkey;

ALTER TABLE scoring_pairs
  ADD CONSTRAINT scoring_pairs_scorer_id_fkey
  FOREIGN KEY (scorer_id)
  REFERENCES players(id)
  ON DELETE CASCADE;

ALTER TABLE scoring_pairs
  DROP CONSTRAINT IF EXISTS scoring_pairs_player_id_fkey;

ALTER TABLE scoring_pairs
  ADD CONSTRAINT scoring_pairs_player_id_fkey
  FOREIGN KEY (player_id)
  REFERENCES players(id)
  ON DELETE CASCADE;

-- =====================================================
-- TEAM_MEMBERS TABLE
-- =====================================================

ALTER TABLE team_members
  DROP CONSTRAINT IF EXISTS team_members_player_id_fkey;

ALTER TABLE team_members
  ADD CONSTRAINT team_members_player_id_fkey
  FOREIGN KEY (player_id)
  REFERENCES players(id)
  ON DELETE CASCADE;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON CONSTRAINT friendships_requester_id_fkey ON friendships IS 'Restored FK dropped by placeholder_players migration CASCADE';
COMMENT ON CONSTRAINT friendships_addressee_id_fkey ON friendships IS 'Restored FK dropped by placeholder_players migration CASCADE';
COMMENT ON CONSTRAINT round_players_player_id_fkey ON round_players IS 'Restored FK dropped by placeholder_players migration CASCADE';
