-- =====================================================
-- Migration: Multi-Scorer Submission Lock
-- =====================================================
-- Extends the scoring-pairs verification flow to free-for-all multi-scorer
-- rounds (where any pairing member can score anyone). Three changes:
--
-- 1. score_mismatches.entries (JSONB) — N-way conflict storage so 3+
--    scorers disagreeing on a hole can be surfaced for resolution.
-- 2. score_submission_status.partner_id nullable — multi-scorer waits on
--    a list of incomplete scorers; there isn't one canonical "partner".
-- 3. RLS hard-lock once a scorecard is `completed` — closes the gap where
--    submitted scorecards could still be overwritten via the API.
-- =====================================================

-- ============================================================================
-- STEP 1: Add N-way entries column to score_mismatches
-- ============================================================================
-- Stores the full list of conflicting entries for a (player, hole). Populated
-- whenever 2+ scorers have written different strokes. Legacy self/partner
-- columns are retained for back-compat with the original 2-way scoring-pairs
-- flow but are now nullable so N-way callers don't need to supply them.

ALTER TABLE score_mismatches
  ADD COLUMN IF NOT EXISTS entries JSONB;

COMMENT ON COLUMN score_mismatches.entries IS
  'N-way conflict list: [{scorer_id, strokes}, ...]. Populated for multi-scorer mismatches; null for legacy 2-way pairs mismatches.';

ALTER TABLE score_mismatches
  ALTER COLUMN self_score DROP NOT NULL,
  ALTER COLUMN partner_score DROP NOT NULL,
  ALTER COLUMN self_scorer_id DROP NOT NULL,
  ALTER COLUMN partner_scorer_id DROP NOT NULL;

-- ============================================================================
-- STEP 2: Make score_submission_status.partner_id nullable
-- ============================================================================
-- Multi-scorer rounds may be waiting on multiple distinct scorers, so there's
-- no single canonical "partner" to record. Nullable allows the same row shape.

ALTER TABLE score_submission_status
  ALTER COLUMN partner_id DROP NOT NULL;

COMMENT ON COLUMN score_submission_status.partner_id IS
  'The scoring partner whose verification is awaited. Null for multi-scorer rounds where verification spans multiple scorers.';

-- ============================================================================
-- STEP 3: Expand mismatch RLS policies to cover N-way scorers
-- ============================================================================
-- The original SELECT/UPDATE/INSERT policies only allow the two named scorers
-- (self_scorer_id, partner_scorer_id). For N-way mismatches the conflicting
-- scorer might appear only in the entries JSONB. Extend the policies to allow
-- any scorer listed in entries, plus any pairing member of the round.

DROP POLICY IF EXISTS "Players can view their own score mismatches" ON score_mismatches;
CREATE POLICY "Players can view their own score mismatches"
  ON score_mismatches FOR SELECT
  USING (
    player_id = auth.uid()
    OR self_scorer_id = auth.uid()
    OR partner_scorer_id = auth.uid()
    OR (
      entries IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(entries) e
        WHERE (e->>'scorer_id')::uuid = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.round_id = score_mismatches.round_id
        AND auth.uid() = ANY(p.player_ids)
    )
    OR EXISTS (
      SELECT 1 FROM round_players rp
      WHERE rp.round_id = score_mismatches.round_id
        AND rp.player_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Players can resolve their score mismatches" ON score_mismatches;
CREATE POLICY "Players can resolve their score mismatches"
  ON score_mismatches FOR UPDATE
  USING (
    player_id = auth.uid()
    OR self_scorer_id = auth.uid()
    OR partner_scorer_id = auth.uid()
    OR (
      entries IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(entries) e
        WHERE (e->>'scorer_id')::uuid = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.round_id = score_mismatches.round_id
        AND auth.uid() = ANY(p.player_ids)
    )
    OR EXISTS (
      SELECT 1 FROM round_players rp
      WHERE rp.round_id = score_mismatches.round_id
        AND rp.player_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Organizers can insert score mismatches" ON score_mismatches;
CREATE POLICY "Authorized users can insert score mismatches"
  ON score_mismatches FOR INSERT
  WITH CHECK (
    -- Organiser of the competition
    round_id IN (
      SELECT r.id FROM rounds r
      JOIN competitions c ON c.id = r.competition_id
      WHERE c.organizer_id = auth.uid()
    )
    -- Owner of a standalone round
    OR round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.user_id = auth.uid()
    )
    -- Any directly-named scorer (legacy 2-way pairs flow)
    OR self_scorer_id = auth.uid()
    OR partner_scorer_id = auth.uid()
    -- Any scorer listed in the N-way entries JSONB
    OR (
      entries IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(entries) e
        WHERE (e->>'scorer_id')::uuid = auth.uid()
      )
    )
    -- Any pairing/round_players member (multi-scorer rounds where the
    -- discovering user isn't necessarily one of the conflicting scorers)
    OR EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.round_id = score_mismatches.round_id
        AND auth.uid() = ANY(p.player_ids)
    )
    OR EXISTS (
      SELECT 1 FROM round_players rp
      WHERE rp.round_id = score_mismatches.round_id
        AND rp.player_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: Lock scorecards UPDATE once status = 'completed'
-- ============================================================================
-- Replaces the policy from 20250132000000_fix_scorecard_rls_for_round_players
-- with the same access checks PLUS a status<>'completed' guard. Organiser
-- override preserved so disputes can still be corrected post-submit.

DROP POLICY IF EXISTS "Users can update scorecards" ON scorecards;

CREATE POLICY "Users can update scorecards" ON scorecards
FOR UPDATE
USING (
  -- Existing access checks
  (
    player_id = auth.uid()
    OR EXISTS (SELECT 1 FROM rounds r WHERE r.id = scorecards.round_id AND r.user_id = auth.uid())
    OR (
      EXISTS (SELECT 1 FROM round_players rp1 WHERE rp1.round_id = scorecards.round_id AND rp1.player_id = auth.uid())
      AND EXISTS (SELECT 1 FROM round_players rp2 WHERE rp2.round_id = scorecards.round_id AND rp2.player_id = scorecards.player_id)
    )
    OR EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.round_id = scorecards.round_id
        AND auth.uid() = ANY(p.player_ids)
        AND scorecards.player_id = ANY(p.player_ids)
    )
    OR EXISTS (
      SELECT 1 FROM rounds r
      JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = scorecards.round_id AND c.organizer_id = auth.uid()
    )
  )
  -- Hard lock: deny once submitted, except for the competition organiser
  AND (
    status <> 'completed'
    OR EXISTS (
      SELECT 1 FROM rounds r
      JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = scorecards.round_id AND c.organizer_id = auth.uid()
    )
  )
);

-- ============================================================================
-- STEP 5: Lock score_entries writes once parent scorecard is completed
-- ============================================================================
-- Mirrors the scorecard lock so post-submit edits can't sneak in via the
-- entries audit table. Organiser override preserved.

DROP POLICY IF EXISTS "Players can insert their own score entries" ON score_entries;
CREATE POLICY "Players can insert their own score entries"
  ON score_entries FOR INSERT
  WITH CHECK (
    scorer_id = auth.uid()
    AND (
      NOT EXISTS (
        SELECT 1 FROM scorecards sc
        WHERE sc.round_id = score_entries.round_id
          AND sc.player_id = score_entries.player_id
          AND sc.status = 'completed'
      )
      OR EXISTS (
        SELECT 1 FROM rounds r
        JOIN competitions c ON c.id = r.competition_id
        WHERE r.id = score_entries.round_id AND c.organizer_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Players can update their own score entries" ON score_entries;
CREATE POLICY "Players can update their own score entries"
  ON score_entries FOR UPDATE
  USING (
    scorer_id = auth.uid()
    AND (
      NOT EXISTS (
        SELECT 1 FROM scorecards sc
        WHERE sc.round_id = score_entries.round_id
          AND sc.player_id = score_entries.player_id
          AND sc.status = 'completed'
      )
      OR EXISTS (
        SELECT 1 FROM rounds r
        JOIN competitions c ON c.id = r.competition_id
        WHERE r.id = score_entries.round_id AND c.organizer_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
