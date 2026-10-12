# Round Options Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner of a social/practice round change holes, add/remove players, change tees, end early, or delete the round from a ⋮ "Round options" sheet on the score entry screen, with other scoring devices reconciling the roster.

**Architecture:** Server-first edits through two new SECURITY DEFINER RPCs (`add_round_player`, `remove_round_player`) that lock the round row; client flows run inside `withRoundScoringWrite` and then update the Zustand scorecard store and SQLite. A `useRoundRosterSync` hook re-fetches the roster on a Broadcast ping, screen focus, or an upload that lost access, and reconciles via a pure `reconcileRoster` decision function.

**Tech Stack:** Expo / React Native, TypeScript, Zustand, React Query, expo-sqlite, Supabase (Postgres RPCs, Realtime Broadcast), Jest + React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-12-round-options-menu-design.md` (rev 2)

## Global Constraints

- Scope: `ScorecardEntryScreen` only, standalone rounds only (`competitionId === 'standalone'`). Match play screens unchanged.
- Owner = `rounds.user_id`. New actions (Holes, Players, Delete) are owner only. Change tees and End round early keep their existing rules.
- Player editing only when `gameType ∈ {'stableford','stroke','par'}` and no team format, no Skins, no Wolf, no scoring pairs, not multi-ball.
- Player cap: `getRoundPreset(presetIdForGameType(gameType)).standalone?.maxPlayers` (4 for these formats). Server hard-caps at 4.
- All new actions are online-only except End round early. Offline rows show "Needs a connection".
- Never use `flushPendingScorecardSyncs()` in new code (it cancels every timer). Use `cancelPendingScorecardSync(scorecardId)`.
- Never call `manualSync` inside `withRoundScoringWrite` (non-reentrant).
- Copy (exact): "Remove <name>? Their scores for this round will be deleted." · "<name> was removed from the round" · "You were removed from this round" · "This round was deleted" · "This round is no longer available" · "Needs a connection" · "Not available for this format" · "Round has been ended" · "Scores have been submitted" · delete confirm "Delete this round? You can undo for a few seconds afterwards." · timeout prompt "Some scores haven't uploaded. Delete anyway?" · notification "<owner> added you to a round at <venue>".
- Scoring guardrails (CLAUDE.md) apply to `src/store/initializeRoundSlice.ts` and `src/store/scorecardStore.ts`.
- Colours via `useThemeColors()`; static tokens from `@/constants/theme`; any RN `<Modal>` content wrapped in `<SystemModalTheme>` (BottomSheet already handles this — check `src/components/common/BottomSheet.tsx`; if it uses RN Modal without SystemModalTheme, wrap sheet content).
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Removed player's phone was offline when they were removed** → when it comes back online its first upload fails with 42501; the phone must exit the round cleanly ("This round is no longer available") with no stuck "changes not uploaded" banner. Test: Task 6 `reconcileRoster` returns `exit_unavailable` for a null round with no error; Task 4 orchestrator emits `roundAccessLost` on 42501.
2. **Remove then immediately re-add the same player** → they get a fresh blank card, not their old scores revived from SQLite. Test: Task 5 store test asserts `deleteScorecard` called for the removed card and a subsequent `ensureTeamMemberScorecards` creates a card with `scores: {}`.
3. **A slow reconcile fetch that started before the owner's own remove** must not re-add the removed player. Test: Task 6 hook test with sequence guard.
4. **A reconcile read that comes back empty or without the owner** (RLS hiccup, partial data) must never delete local cards. Test: Task 6 `reconcileRoster` `ignore` cases.
5. **Delete while scores are still uploading and the sync times out** → user is asked "Delete anyway?"; cancelling leaves the round and local scores untouched. Test: Task 8 `useScorecardSubmission` test.

## 1.15.0 Compatibility (checked 2026-10-12 against local main 2083fb62)

Every change below is additive or scoped to the new owner-only menu; the rest of 1.15.0 behaves exactly as before.

| 1.15.0 area | Touch point in this plan | Outcome |
|---|---|---|
| Round invite notifications (`notify_round_player_invited`, latest def 20260327000000; scheduled rounds and age-gate migrations don't redefine it) | Task 1 trigger edit | New copy only when `add_round_player` sets a transaction-local flag. Round creation (also accepted + in-progress) and scheduled-round invites unchanged; placeholder handling unchanged. Regression assert 3b. |
| Blocking (`is_blocked_pair`, 20260905000000) | `add_round_player` is SECURITY DEFINER | Explicit block check added (HINT `player_blocked`). |
| Player privacy column lock (pending) | `fetchRoundRoster` | Uses `COMPETITION_PLAYERS_SELECT` (public columns only: name, handicap, handicap_index, gender). No email/phone. |
| End round early + scoring-write guard (20261007000200/0300) | Locks, RPC lock order, ⋮ | RPCs lock the round row then cards `NOWAIT`, same order as `end_round_early`; refuse when `holes_played` set. Scorecard guard trigger is INSERT/UPDATE only, so the hard DELETE needs no write context. Non-owners and match-play screens keep the direct End-early ⋮. |
| Scorecard FKs (league tags, combined 9s) | `remove_round_player` DELETE | Only possible on submitted cards, which the RPC refuses first. No DELETE triggers on `scorecards`. |
| Rounds-tab / Home swipe delete, Round Settings delete (`useDeleteRound` → `deleteRound`) | Task 8 | `deleteRound` untouched. Only shared change: `deleteScorecardsByRound` also clears queued `type:'round'` items (finalize / end-early intents) for the deleted round — they could only fail forever against a deleted round. Its only caller is `deleteRound`. |
| ViewRound holes sheet (`EditNineTypeSheet`, only used by RoundDetailsTab) | Task 7 | New props optional. One behaviour change: `deleteHoles` is awaited before `resetRound()` instead of fire-and-forget — strictly safer; ViewRound rarely holds that round in the store. |
| `RoundHeader` (also MatchPlay, TeamMatchPlay, ScheduledRound) | Task 9 | Optional prop; existing ⋮ path unchanged when it isn't passed. Tests cover the fallback. |
| Sync orchestrator retention (1.14.1 self-conflict fix, contention fix) | Task 4 | Adds a notify call only; retention/marking logic unchanged. No listener exists unless score entry mounts the hook. |
| `useRoundPlayers` / `useRoundData` | Tasks 5, 7, 11 | `useRoundPlayers` untouched; `useRoundData` only gains returned fields (`refetchMetadata`, `refetchPlayers`, `courseHoleCount`). |
| Watch bridge | none | Re-sends its snapshot when `currentPlayers` changes; a missing card makes watch writes a no-op. |

**Release gating:** keep `feat/round-options-menu` unmerged until you decide which release it ships in. If it goes into 1.15.0, `20261012000000_round_roster_rpcs.sql` must reach prod before the 1.15.0 binary is released; otherwise it ships in the next release. Run `pnpm verify:gate` on the merge result either way.

**Not in 1.15.0, will conflict later:** the blocked live multi-scorer worktree (`useLiveScorecardMerge`, social scoring mode). Whichever lands second must re-run Task 6's tests against the other's merge logic.

---

### Task 0: Scoring guardrails and characterisation

**Files:**
- Read: `docs/guides/SCORING_ARCHITECTURE.md`, `docs/guides/scoring-invariant-coverage.md`, `docs/guides/OFFLINE_ARCHITECTURE.md`
- Test: `src/__tests__/store/scorecardStore.roster.test.ts` (create)

**Interfaces:**
- Produces: test file skeleton reused by Task 5.

- [ ] **Step 1: Read the three guides.** Note the invariants touching roster/scorecard creation and sync conflicts (OFFLINE_ARCHITECTURE.md "conflicts are never silently dropped").

- [ ] **Step 2: Run the impact analyst.** Dispatch the `scoring-impact-analyst` agent on `src/store/initializeRoundSlice.ts` and `src/store/scorecardStore.ts`. Paste its blast-radius summary into the PR description draft (`docs/superpowers/plans/2026-10-12-round-options-menu.notes.md`, create).

- [ ] **Step 3: Create the test file with the shared mock block.** Copy lines 1–206 of `src/__tests__/store/scorecardStore.endRoundEarly.test.ts` (imports, every `jest.mock`, the fixtures `ROUND_ID`, `P1`, `P2`, `P3`, `TEE_WHITE`, `getStore`, `cardId`, and the `beforeEach`) into `src/__tests__/store/scorecardStore.roster.test.ts`. Change the header comment to:

```ts
/**
 * Scorecard store — roster edits (round options menu).
 * Mock block copied from scorecardStore.endRoundEarly.test.ts.
 * @see docs/superpowers/specs/2026-10-12-round-options-menu-design.md §2
 */
```

Add `deleteScorecard: jest.fn(() => Promise.resolve()),` to the `@/services/offline/database` mock object, and `deleteScorecard` to the import list from `@/services/offline/database`.

- [ ] **Step 4: Characterise standalone backfill (currently unprotected — it is only used for team rounds).**

```ts
describe('characterization: ensureTeamMemberScorecards on a standalone round', () => {
  it('adds a blank in-progress card for a non-team player and persists it', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stroke', false, [], TEE_WHITE);
    (saveScorecard as jest.Mock).mockClear();

    await getStore().ensureTeamMemberScorecards([P2]);

    const card = getStore().groupScorecards.get(P2.id);
    expect(card).toMatchObject({ id: cardId(P2.id), playerId: P2.id, scores: {}, status: 'in-progress' });
    expect(getStore().currentPlayers.map((p) => p.id)).toEqual([P1.id, P2.id]);
    expect(saveScorecard).toHaveBeenCalledWith(expect.objectContaining({ id: cardId(P2.id) }), expect.anything());
  });

  it('is idempotent for a player who already has a card', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_WHITE);
    const before = getStore().groupScorecards.get(P2.id);
    await getStore().ensureTeamMemberScorecards([P2]);
    expect(getStore().groupScorecards.get(P2.id)).toBe(before);
  });
});
```

- [ ] **Step 5: Run and confirm it passes against current code.**

Run: `pnpm test src/__tests__/store/scorecardStore.roster.test.ts`
Expected: PASS (2 tests). If the first fails because the init signature differs, adjust the `initializeRound` call to match the copied endRoundEarly tests exactly — do not change production code.

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/store/scorecardStore.roster.test.ts docs/superpowers/plans/2026-10-12-round-options-menu.notes.md
git commit -m "test(scoring): characterise standalone scorecard backfill before roster edits

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Migration — roster RPCs and notification wording

**Files:**
- Create: `supabase/migrations/20261012000000_round_roster_rpcs.sql`
- Create: `supabase/tests/round_roster_rpcs_verify.sql`

**Interfaces:**
- Produces (SQL):
  - `public.add_round_player(p_round_id UUID, p_player_id UUID) RETURNS VOID`
  - `public.remove_round_player(p_round_id UUID, p_player_id UUID) RETURNS VOID`
  - Error HINTs: `not_owner`, `round_not_editable`, `round_ended`, `round_has_submitted_scorecards`, `player_already_in_round`, `round_full`, `player_blocked`, `cannot_remove_owner`, `player_not_in_round`, `round_scorecards_busy`
  - Notification data key `added_mid_round: true` on `social_round_invitation` rows created by `add_round_player` only (transaction-local flag). Every other insert path is byte-for-byte unchanged.

- [ ] **Step 1: Write the migration.**

```sql
-- =====================================================
-- Round roster RPCs (round options menu)
-- =====================================================
-- Owner-only add/remove of players on an in-progress social round.
-- Both lock the round row FOR UPDATE (same order as end_round_early) so a
-- concurrent end-early or submission can't interleave.
-- Spec: docs/superpowers/specs/2026-10-12-round-options-menu-design.md §2

CREATE OR REPLACE FUNCTION public.assert_round_roster_editable(p_round_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_owner UUID;
  v_competition_id UUID;
  v_status TEXT;
  v_holes_played INT;
BEGIN
  SELECT user_id, competition_id, status, holes_played
    INTO v_owner, v_competition_id, v_status, v_holes_played
  FROM rounds
  WHERE id = p_round_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round % not found', p_round_id USING ERRCODE = 'P0002';
  END IF;
  IF v_owner IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION 'Only the round owner can change players' USING ERRCODE = '42501', HINT = 'not_owner';
  END IF;
  IF v_competition_id IS NOT NULL OR v_status = 'completed' THEN
    RAISE EXCEPTION 'Players can only be changed on a social round in play'
      USING ERRCODE = '22023', HINT = 'round_not_editable';
  END IF;
  IF v_holes_played IS NOT NULL THEN
    RAISE EXCEPTION 'Round has been ended' USING ERRCODE = '22023', HINT = 'round_ended';
  END IF;

  BEGIN
    PERFORM sc.id FROM public.scorecards sc
     WHERE sc.round_id = p_round_id ORDER BY sc.id FOR UPDATE NOWAIT;
  EXCEPTION WHEN lock_not_available THEN
    RAISE EXCEPTION 'Round scores are changing; try again'
      USING ERRCODE = '22023', HINT = 'round_scorecards_busy';
  END;

  IF EXISTS (SELECT 1 FROM public.scorecards sc
              WHERE sc.round_id = p_round_id AND sc.status IN ('completed', 'confirmed')) THEN
    RAISE EXCEPTION 'Scores have been submitted'
      USING ERRCODE = '22023', HINT = 'round_has_submitted_scorecards';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.assert_round_roster_editable(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.add_round_player(p_round_id UUID, p_player_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_round_roster_editable(p_round_id);

  IF EXISTS (SELECT 1 FROM round_players WHERE round_id = p_round_id AND player_id = p_player_id) THEN
    RAISE EXCEPTION 'Player is already in this round'
      USING ERRCODE = '23505', HINT = 'player_already_in_round';
  END IF;
  IF (SELECT COUNT(*) FROM round_players WHERE round_id = p_round_id) >= 4 THEN
    RAISE EXCEPTION 'This round is full' USING ERRCODE = '22023', HINT = 'round_full';
  END IF;
  -- SECURITY DEFINER bypasses RLS, so honour 1.15.0 blocking explicitly.
  IF is_blocked_pair(auth.uid(), p_player_id) THEN
    RAISE EXCEPTION 'This player can''t be added' USING ERRCODE = '42501', HINT = 'player_blocked';
  END IF;

  -- Transaction-local flag read by notify_round_player_invited so only this
  -- path gets "added you to a round" copy. Normal round creation also inserts
  -- accepted rows into an in-progress round and must keep "invited you to play".
  PERFORM set_config('app.round_player_added_mid_round', 'on', true);
  INSERT INTO round_players (round_id, player_id, added_by, invitation_status, responded_at)
  VALUES (p_round_id, p_player_id, auth.uid(), 'accepted', NOW());
  PERFORM set_config('app.round_player_added_mid_round', 'off', true);
END;
$$;
REVOKE ALL ON FUNCTION public.add_round_player(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_round_player(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_round_player(p_round_id UUID, p_player_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_round_roster_editable(p_round_id);

  IF p_player_id = auth.uid() THEN
    RAISE EXCEPTION 'The round owner cannot be removed'
      USING ERRCODE = '22023', HINT = 'cannot_remove_owner';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM round_players WHERE round_id = p_round_id AND player_id = p_player_id) THEN
    RAISE EXCEPTION 'Player is not in this round'
      USING ERRCODE = 'P0002', HINT = 'player_not_in_round';
  END IF;

  -- None of these reference scorecards, so nothing cascades from the card.
  DELETE FROM score_entries
   WHERE round_id = p_round_id AND (player_id = p_player_id OR scorer_id = p_player_id);
  DELETE FROM score_mismatches
   WHERE round_id = p_round_id
     AND (player_id = p_player_id OR self_scorer_id = p_player_id OR partner_scorer_id = p_player_id);
  DELETE FROM score_submission_status
   WHERE round_id = p_round_id AND (player_id = p_player_id OR partner_id = p_player_id);
  DELETE FROM shot_log WHERE round_id = p_round_id AND player_id = p_player_id;
  -- Hard delete: unique_scorecard_per_player_round is a full constraint, so a
  -- soft-deleted card would block re-adding the same player.
  DELETE FROM scorecards WHERE round_id = p_round_id AND player_id = p_player_id;
  -- Must go too, or any participant device could re-insert the card.
  DELETE FROM round_players WHERE round_id = p_round_id AND player_id = p_player_id;
END;
$$;
REVOKE ALL ON FUNCTION public.remove_round_player(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_round_player(UUID, UUID) TO authenticated;
```

Append the notification change: copy the full `notify_round_player_invited()` body from `supabase/migrations/20260327000000_fix_standalone_round_visibility_and_notifications.sql:98-174` and apply exactly these edits:

```sql
-- in DECLARE, add:
  added_mid_round BOOLEAN := COALESCE(current_setting('app.round_player_added_mid_round', true), '') = 'on';
-- (no other logic changes: owner skip, placeholder handling and the
--  invite path stay exactly as in 20260327000000)
-- in the create_notification jsonb_build_object, add:
      'added_mid_round', added_mid_round,
-- replace the push title/body arguments with:
    CASE WHEN added_mid_round THEN 'Added to a Round' ELSE 'Round Invitation' END,
    CASE WHEN added_mid_round
      THEN inviter_name || ' added you to a round at ' || COALESCE(club_name, course_name)
      ELSE inviter_name || ' invited you to play at ' || COALESCE(club_name, course_name)
    END,
-- in the push data jsonb_build_object, add:
      'added_mid_round', added_mid_round,
```

- [ ] **Step 2: Write the verify script** `supabase/tests/round_roster_rpcs_verify.sql`, following the header and BEGIN … ROLLBACK + `SET LOCAL role authenticated` / `request.jwt.claims` pattern of `supabase/tests/end_round_early_verify.sql:1-35`. Fixture: one club/course, owner O, friend F, guest G (`is_placeholder = TRUE, created_by = O`), outsider X; a standalone round owned by O, `status = 'in-progress'`, `round_players` for O.

```sql
-- 1. Outsider cannot add.
SET LOCAL request.jwt.claims = '{"sub":"<X>","role":"authenticated"}';
DO $$ BEGIN
  PERFORM add_round_player('<R>', '<F>');
  RAISE EXCEPTION 'expected not_owner';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;

-- 2. Owner adds F; row is accepted.
SET LOCAL request.jwt.claims = '{"sub":"<O>","role":"authenticated"}';
SELECT add_round_player('<R>', '<F>');
DO $$ BEGIN ASSERT (SELECT invitation_status FROM round_players WHERE round_id='<R>' AND player_id='<F>') = 'accepted', 'F accepted'; END $$;

-- 3. Notification for F has added_mid_round = true.
DO $$ BEGIN
  ASSERT (SELECT (data->>'added_mid_round')::BOOLEAN FROM notifications WHERE user_id='<F>' ORDER BY created_at DESC LIMIT 1), 'F notified as added';
END $$;

-- 3b. Regression: a plain owner INSERT (how round creation adds partners,
--     also accepted + in-progress) still produces added_mid_round = false.
INSERT INTO round_players (round_id, player_id, added_by, invitation_status) VALUES ('<R2>', '<F>', '<O>', 'accepted');
DO $$ BEGIN
  ASSERT NOT (SELECT (data->>'added_mid_round')::BOOLEAN FROM notifications WHERE user_id='<F>' AND round_id='<R2>' LIMIT 1), 'normal invite unchanged';
END $$;

-- 3c. Blocked pair rejected (insert user_blocks O->X as fixture admin first).
DO $$ BEGIN PERFORM add_round_player('<R>', '<X>'); RAISE EXCEPTION 'expected player_blocked';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;

-- 4. Duplicate add rejected.
DO $$ BEGIN PERFORM add_round_player('<R>', '<F>'); RAISE EXCEPTION 'expected duplicate';
EXCEPTION WHEN unique_violation THEN NULL; END $$;

-- 5. Remove F deletes card, entries, mismatches, status, shot_log and round_players.
--    (insert one row of each for F first, as the fixture admin)
SELECT remove_round_player('<R>', '<F>');
DO $$ BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM scorecards WHERE round_id='<R>' AND player_id='<F>'), 'card gone';
  ASSERT NOT EXISTS (SELECT 1 FROM score_entries WHERE round_id='<R>' AND (player_id='<F>' OR scorer_id='<F>')), 'entries gone';
  ASSERT NOT EXISTS (SELECT 1 FROM score_mismatches WHERE round_id='<R>' AND player_id='<F>'), 'mismatches gone';
  ASSERT NOT EXISTS (SELECT 1 FROM score_submission_status WHERE round_id='<R>' AND player_id='<F>'), 'status gone';
  ASSERT NOT EXISTS (SELECT 1 FROM shot_log WHERE round_id='<R>' AND player_id='<F>'), 'shots gone';
  ASSERT NOT EXISTS (SELECT 1 FROM round_players WHERE round_id='<R>' AND player_id='<F>'), 'row gone';
END $$;

-- 6. Re-add after remove works.
SELECT add_round_player('<R>', '<F>');

-- 7. Owner cannot remove self.
DO $$ BEGIN PERFORM remove_round_player('<R>', '<O>'); RAISE EXCEPTION 'expected cannot_remove_owner';
EXCEPTION WHEN invalid_parameter_value THEN NULL; END $$;

-- 8. Ended round rejects both (set holes_played via end_round_early after scoring hole 1 for all).
-- 9. Submitted card rejects both (set one card status = 'completed' as fixture admin).
-- 10. Fifth player rejected with round_full.

ROLLBACK;
```

Fill in steps 8–10 with the same DO-block pattern (`EXCEPTION WHEN invalid_parameter_value`, since all three use ERRCODE 22023).

- [ ] **Step 3: Apply to a local or staging database and run the verify script.**

Run: `psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20261012000000_round_roster_rpcs.sql` then the verify script per its header (staging access: see memory note "Staging DB access & data"; never the prod-linked CLI).
Expected: script completes and ends with `ROLLBACK`. Record the result in the notes file. If no DB access is available to the implementer, mark this step "deferred to deploy" in the notes file and continue — do not skip writing the script.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261012000000_round_roster_rpcs.sql supabase/tests/round_roster_rpcs_verify.sql
git commit -m "feat(rounds): owner-only add/remove player RPCs and added-to-round notification

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: "Added to a round" notification copy

**Files:**
- Modify: `src/components/notifications/NotificationItem.tsx:95-100`
- Modify: `src/components/common/Toast/variants/NotificationToastCard.tsx:85-90`
- Test: `src/components/notifications/NotificationItem.test.tsx`

**Interfaces:**
- Consumes: notification `data.added_mid_round: boolean` (Task 1).

- [ ] **Step 1: Write the failing test** inside the existing `social_round_invitation` describe block of `NotificationItem.test.tsx`:

```ts
it('shows "added you to a round" when added mid-round', () => {
  const notification = createMockNotification('social_round_invitation', {
    inviter_name: 'Golf Buddy',
    venue_name: 'Kingston Heath',
    added_mid_round: true,
  });
  render(<NotificationItem notification={notification} onPress={jest.fn()} />);
  expect(screen.getByText('Added to a Round')).toBeTruthy();
  expect(screen.getByText('Golf Buddy added you to a round at Kingston Heath')).toBeTruthy();
});
```

- [ ] **Step 2: Run it to see it fail.**

Run: `pnpm test src/components/notifications/NotificationItem.test.tsx -t "added mid-round"`
Expected: FAIL — text not found.

- [ ] **Step 3: Implement in both files** (same shape):

```ts
  social_round_invitation: {
    icon: 'golf-tee',
    getTitle: (data) => (data.added_mid_round ? 'Added to a Round' : 'Round Invitation'),
    getMessage: (data) => {
      const venue = data.venue_name ? ` at ${data.venue_name}` : '';
      const who = data.inviter_name || 'Someone';
      return data.added_mid_round
        ? `${who} added you to a round${venue}`
        : `${who} invited you to play${venue}`;
    },
  },
```

In `NotificationToastCard.tsx` keep its existing `getTitle: () =>` signature style but accept `data` the same way. If the `data` type there doesn't declare `added_mid_round`, add `added_mid_round?: boolean;` to the `social_round_invitation` data interface in `src/types/database/notification.types.ts` (near line 40).

- [ ] **Step 4: Run the whole file.**

Run: `pnpm test src/components/notifications/NotificationItem.test.tsx`
Expected: PASS (existing invitation tests unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/components/notifications/NotificationItem.tsx src/components/common/Toast/variants/NotificationToastCard.tsx src/components/notifications/NotificationItem.test.tsx src/types/database/notification.types.ts
git commit -m "feat(notifications): 'added you to a round' copy for mid-round adds

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Pure helpers — player cap, back-fill gaps, menu rows

**Files:**
- Create: `src/utils/roundRoster.ts`
- Create: `src/components/scorecard/RoundOptionsSheet/roundOptionsRows.ts`
- Test: `src/utils/roundRoster.test.ts`
- Test: `src/components/scorecard/RoundOptionsSheet/roundOptionsRows.test.ts`

**Interfaces:**
- Produces:
  - `getStandaloneMaxPlayers(gameType: GameType): number`
  - `isRosterEditableFormat(input: { gameType: GameType; teamFormat: TeamFormat | null; hasSkins: boolean; hasWolf: boolean; scoringPairsEnabled: boolean; isMultiBall: boolean }): boolean`
  - `findBackfillGaps(input: { holes: Hole[]; nineType: NineType; players: { id: string; name: string }[]; scorecards: Map<string, { scores: Scorecard['scores'] }> }): { playerId: string; playerName: string; holes: number[] }[]`
  - `formatHoleRange(holes: number[]): string` (e.g. `[1,2,3,5]` → `"1–3, 5"`)
  - `type RoundOptionKey = 'holes' | 'players' | 'tees' | 'endEarly' | 'delete'`
  - `interface RoundOptionRow { key: RoundOptionKey; label: string; icon: string; disabled: boolean; caption?: string; destructive?: boolean }`
  - `getRoundOptionsRows(input: RoundOptionsInput): RoundOptionRow[]` with
    `interface RoundOptionsInput { isOnline: boolean; courseHoleCount: number; isEnded: boolean; anyCardSubmitted: boolean; rosterEditableFormat: boolean; canChangeTees: boolean; canEndRoundEarly: boolean; endEarlyBlockedReason: string | null }`

- [ ] **Step 1: Write failing tests for `roundRoster.ts`.**

```ts
import { create18Holes } from '@/__tests__/utils/testFixtures';
import { findBackfillGaps, formatHoleRange, getStandaloneMaxPlayers, isRosterEditableFormat } from './roundRoster';

const base = { gameType: 'stableford' as const, teamFormat: null, hasSkins: false, hasWolf: false, scoringPairsEnabled: false, isMultiBall: false };
const s = (strokes: number) => ({ strokes });

describe('getStandaloneMaxPlayers', () => {
  it.each(['stableford', 'stroke', 'par'] as const)('is 4 for %s', (g) => {
    expect(getStandaloneMaxPlayers(g)).toBe(4);
  });
});

describe('isRosterEditableFormat', () => {
  it('allows plain individual formats', () => {
    expect(isRosterEditableFormat(base)).toBe(true);
    expect(isRosterEditableFormat({ ...base, gameType: 'stroke' })).toBe(true);
    expect(isRosterEditableFormat({ ...base, gameType: 'par' })).toBe(true);
  });
  it.each([
    ['match play', { gameType: 'match-play' as const }],
    ['team format', { teamFormat: 'best-ball' as const }],
    ['skins', { hasSkins: true }],
    ['wolf', { hasWolf: true }],
    ['scoring pairs', { scoringPairsEnabled: true }],
    ['multi-ball', { isMultiBall: true }],
  ])('blocks %s', (_label, override) => {
    expect(isRosterEditableFormat({ ...base, ...override })).toBe(false);
  });
});

describe('findBackfillGaps', () => {
  const players = [{ id: 'a', name: 'Sam' }, { id: 'b', name: 'Dave' }];
  it('reports holes a late joiner is missing up to the furthest scored hole', () => {
    const scorecards = new Map([
      ['a', { scores: { 1: s(4), 2: s(5), 3: s(4) } }],
      ['b', { scores: { 3: s(5) } }],
    ]);
    expect(findBackfillGaps({ holes: create18Holes(), nineType: 'full', players, scorecards }))
      .toEqual([{ playerId: 'b', playerName: 'Dave', holes: [1, 2] }]);
  });
  it('is empty when everyone is level', () => {
    const scorecards = new Map([['a', { scores: { 1: s(4) } }], ['b', { scores: { 1: s(4) } }]]);
    expect(findBackfillGaps({ holes: create18Holes(), nineType: 'full', players, scorecards })).toEqual([]);
  });
  it('treats a pickup as scored and respects back 9', () => {
    const scorecards = new Map([
      ['a', { scores: { 10: s(4), 11: s(10) } }],
      ['b', { scores: { 10: s(4) } }],
    ]);
    expect(findBackfillGaps({ holes: create18Holes(), nineType: 'back9', players, scorecards }))
      .toEqual([{ playerId: 'b', playerName: 'Dave', holes: [11] }]);
  });
});

describe('formatHoleRange', () => {
  it('compresses runs', () => {
    expect(formatHoleRange([1, 2, 3, 5])).toBe('1–3, 5');
    expect(formatHoleRange([7])).toBe('7');
  });
});
```

- [ ] **Step 2: Run to see them fail.**

Run: `pnpm test src/utils/roundRoster.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/utils/roundRoster.ts`.**

```ts
/**
 * Roster rules for editing players on a social round mid-round.
 * @see docs/superpowers/specs/2026-10-12-round-options-menu-design.md
 */

import { getRoundPreset, presetIdForGameType } from '@/constants/roundPresets';
import { isHoleScored } from '@/utils/endRoundEarly';
import { filterHolesByNineType } from '@/utils/holeTransformers';
import type { Hole, Scorecard } from '@/types';
import type { GameType, NineType, TeamFormat } from '@/types/database/enums';

const ROSTER_EDITABLE_GAME_TYPES: ReadonlySet<GameType> = new Set(['stableford', 'stroke', 'par']);

export function getStandaloneMaxPlayers(gameType: GameType): number {
  return getRoundPreset(presetIdForGameType(gameType)).standalone?.maxPlayers ?? 4;
}

export function isRosterEditableFormat(input: {
  gameType: GameType;
  teamFormat: TeamFormat | null;
  hasSkins: boolean;
  hasWolf: boolean;
  scoringPairsEnabled: boolean;
  isMultiBall: boolean;
}): boolean {
  return (
    ROSTER_EDITABLE_GAME_TYPES.has(input.gameType) &&
    !input.teamFormat &&
    !input.hasSkins &&
    !input.hasWolf &&
    !input.scoringPairsEnabled &&
    !input.isMultiBall
  );
}

export function findBackfillGaps(input: {
  holes: Hole[];
  nineType: NineType;
  players: { id: string; name: string }[];
  scorecards: Map<string, { scores: Scorecard['scores'] }>;
}): { playerId: string; playerName: string; holes: number[] }[] {
  const planned = filterHolesByNineType(input.holes, input.nineType).map((h) => h.number).sort((a, b) => a - b);
  const scored = (playerId: string, hole: number) =>
    isHoleScored(input.scorecards.get(playerId)?.scores[hole]);

  const furthest = planned.filter((hole) => input.players.some((p) => scored(p.id, hole))).pop();
  if (furthest == null) return [];

  return input.players
    .map((p) => ({
      playerId: p.id,
      playerName: p.name,
      holes: planned.filter((hole) => hole <= furthest && !scored(p.id, hole)),
    }))
    .filter((gap) => gap.holes.length > 0);
}

export function formatHoleRange(holes: number[]): string {
  const sorted = [...holes].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) { prev = cur; continue; }
    if (start !== undefined) parts.push(start === prev ? String(start) : `${start}–${prev}`);
    start = cur;
    prev = cur;
  }
  return parts.join(', ');
}
```

If `isHoleScored` / `filterHolesByNineType` import paths differ, use the paths imported at the top of `src/utils/endRoundEarly.ts`.

- [ ] **Step 4: Run.** `pnpm test src/utils/roundRoster.test.ts` → PASS.

- [ ] **Step 5: Write failing tests for the menu rows.**

```ts
import { getRoundOptionsRows, type RoundOptionsInput } from './roundOptionsRows';

const input: RoundOptionsInput = {
  isOnline: true, courseHoleCount: 18, isEnded: false, anyCardSubmitted: false,
  rosterEditableFormat: true, canChangeTees: true, canEndRoundEarly: true, endEarlyBlockedReason: null,
};
const row = (i: RoundOptionsInput, key: string) => getRoundOptionsRows(i).find((r) => r.key === key);

describe('getRoundOptionsRows', () => {
  it('lists rows in order with everything enabled', () => {
    expect(getRoundOptionsRows(input).map((r) => [r.key, r.disabled])).toEqual([
      ['holes', false], ['players', false], ['tees', false], ['endEarly', false], ['delete', false],
    ]);
    expect(row(input, 'delete')?.destructive).toBe(true);
  });
  it('hides Holes on a 9-hole course', () => {
    expect(row({ ...input, courseHoleCount: 9 }, 'holes')).toBeUndefined();
  });
  it('greys online-only rows offline but keeps End round early', () => {
    const off = { ...input, isOnline: false };
    for (const key of ['holes', 'players', 'tees', 'delete']) {
      expect(row(off, key)).toMatchObject({ disabled: true, caption: 'Needs a connection' });
    }
    expect(row(off, 'endEarly')?.disabled).toBe(false);
  });
  it('locks Players for other formats', () => {
    expect(row({ ...input, rosterEditableFormat: false }, 'players'))
      .toMatchObject({ disabled: true, caption: 'Not available for this format' });
  });
  it('locks Holes and Players once ended', () => {
    const ended = { ...input, isEnded: true };
    expect(row(ended, 'holes')).toMatchObject({ disabled: true, caption: 'Round has been ended' });
    expect(row(ended, 'players')).toMatchObject({ disabled: true, caption: 'Round has been ended' });
  });
  it('locks Players once a card is submitted', () => {
    expect(row({ ...input, anyCardSubmitted: true }, 'players'))
      .toMatchObject({ disabled: true, caption: 'Scores have been submitted' });
  });
  it('shows the end-early blocked reason', () => {
    expect(row({ ...input, canEndRoundEarly: false, endEarlyBlockedReason: 'Needs scores for Dave on holes 1–2' }, 'endEarly'))
      .toMatchObject({ disabled: true, caption: 'Needs scores for Dave on holes 1–2' });
  });
  it('hides Change tees when not permitted', () => {
    expect(row({ ...input, canChangeTees: false }, 'tees')).toBeUndefined();
  });
});
```

- [ ] **Step 6: Run to see them fail.** `pnpm test src/components/scorecard/RoundOptionsSheet/roundOptionsRows.test.ts` → FAIL.

- [ ] **Step 7: Implement `roundOptionsRows.ts`.**

```ts
export type RoundOptionKey = 'holes' | 'players' | 'tees' | 'endEarly' | 'delete';

export interface RoundOptionRow {
  key: RoundOptionKey;
  label: string;
  icon: string;
  disabled: boolean;
  caption?: string;
  destructive?: boolean;
}

export interface RoundOptionsInput {
  isOnline: boolean;
  courseHoleCount: number;
  isEnded: boolean;
  anyCardSubmitted: boolean;
  rosterEditableFormat: boolean;
  canChangeTees: boolean;
  canEndRoundEarly: boolean;
  endEarlyBlockedReason: string | null;
}

const OFFLINE = 'Needs a connection';

function lock(reasons: (string | false)[]): { disabled: boolean; caption?: string } {
  const caption = reasons.find((r): r is string => typeof r === 'string');
  return caption ? { disabled: true, caption } : { disabled: false };
}

export function getRoundOptionsRows(i: RoundOptionsInput): RoundOptionRow[] {
  const rows: RoundOptionRow[] = [];
  const offline = !i.isOnline && OFFLINE;

  if (i.courseHoleCount > 9) {
    rows.push({ key: 'holes', label: 'Holes', icon: 'flag-variant-outline',
      ...lock([offline, i.isEnded && 'Round has been ended']) });
  }
  rows.push({ key: 'players', label: 'Players', icon: 'account-multiple-outline',
    ...lock([
      offline,
      !i.rosterEditableFormat && 'Not available for this format',
      i.isEnded && 'Round has been ended',
      i.anyCardSubmitted && 'Scores have been submitted',
    ]) });
  if (i.canChangeTees) {
    rows.push({ key: 'tees', label: 'Change tees', icon: 'golf-tee', ...lock([offline]) });
  }
  rows.push({ key: 'endEarly', label: 'End round early', icon: 'flag-checkered',
    ...lock([!i.canEndRoundEarly && (i.endEarlyBlockedReason ?? 'Not available right now')]) });
  rows.push({ key: 'delete', label: 'Delete round', icon: 'trash-can-outline', destructive: true,
    ...lock([offline]) });
  return rows;
}
```

- [ ] **Step 8: Run both test files.** Expected PASS.

- [ ] **Step 9: Commit**

```bash
git add src/utils/roundRoster.ts src/utils/roundRoster.test.ts src/components/scorecard/RoundOptionsSheet/roundOptionsRows.ts src/components/scorecard/RoundOptionsSheet/roundOptionsRows.test.ts
git commit -m "feat(scoring): roster rules and round options row model

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Per-card debounce cancel and round-access-lost signal

**Files:**
- Modify: `src/store/scorecardSyncDebounce.ts` (append)
- Create: `src/services/rounds/roundAccessEvents.ts`
- Modify: `src/services/offline/sync/syncOrchestrator.ts:348-377` (conflict + RLS branches)
- Test: `src/store/scorecardSyncDebounce.test.ts` (create if absent), `src/services/rounds/roundAccessEvents.test.ts`

**Interfaces:**
- Produces:
  - `cancelPendingScorecardSync(scorecardId: string): boolean` (true if a timer was cancelled)
  - `onRoundAccessLost(listener: (roundId: string) => void): () => void`
  - `notifyRoundAccessLost(roundId: string): void`

- [ ] **Step 1: Failing tests.**

```ts
// src/store/scorecardSyncDebounce.test.ts
import { cancelPendingScorecardSync, debouncedQueueScorecardSync } from './scorecardSyncDebounce';

jest.mock('@/services/offline/sync', () => ({
  queueScorecardSync: jest.fn(), getIsOnline: jest.fn(() => false), manualSync: jest.fn(),
}));

describe('cancelPendingScorecardSync', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('cancels only the named card', () => {
    const a = jest.fn(() => undefined);
    const b = jest.fn(() => undefined);
    debouncedQueueScorecardSync('a', a);
    debouncedQueueScorecardSync('b', b);
    expect(cancelPendingScorecardSync('a')).toBe(true);
    jest.advanceTimersByTime(2500);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  it('returns false when nothing is pending', () => {
    expect(cancelPendingScorecardSync('none')).toBe(false);
  });
});
```

```ts
// src/services/rounds/roundAccessEvents.test.ts
import { notifyRoundAccessLost, onRoundAccessLost } from './roundAccessEvents';

it('notifies subscribers until they unsubscribe', () => {
  const listener = jest.fn();
  const off = onRoundAccessLost(listener);
  notifyRoundAccessLost('r1');
  off();
  notifyRoundAccessLost('r2');
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener).toHaveBeenCalledWith('r1');
});
```

- [ ] **Step 2: Run both.** `pnpm test src/store/scorecardSyncDebounce.test.ts src/services/rounds/roundAccessEvents.test.ts` → FAIL.

- [ ] **Step 3: Implement.** Append to `scorecardSyncDebounce.ts`:

```ts
/**
 * Cancel one card's pending debounced sync. Used when that player is removed
 * from the round; unlike flushPendingScorecardSyncs it leaves other cards'
 * pending uploads alone.
 */
export function cancelPendingScorecardSync(scorecardId: string): boolean {
  const timer = timers.get(scorecardId);
  if (!timer) return false;
  clearTimeout(timer);
  timers.delete(scorecardId);
  return true;
}
```

Create `src/services/rounds/roundAccessEvents.ts`:

```ts
/**
 * Raised by the sync orchestrator when an upload for a round fails in a way
 * that suggests the roster changed (RLS 42501, or a conflict with no live
 * server row). useRoundRosterSync listens and re-checks the roster.
 */

type Listener = (roundId: string) => void;
const listeners = new Set<Listener>();

export function onRoundAccessLost(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyRoundAccessLost(roundId: string): void {
  for (const listener of listeners) listener(roundId);
}
```

In `syncOrchestrator.ts`, import `notifyRoundAccessLost` from `@/services/rounds/roundAccessEvents`. In the `ScorecardConflictError` branch, after `markPendingSyncFailed(...)`, and in the `isRlsError` branch, after `markPendingSyncFailed(...)`, add:

```ts
          if (sync.type === 'scorecard' && sync.data?.roundId) notifyRoundAccessLost(sync.data.roundId);
```

Do not change what gets retained — the reconcile (Task 6) decides whether to discard.

- [ ] **Step 4: Add an orchestrator test** in the existing orchestrator test file (`grep -rl "ScorecardConflictError" src/__tests__ src/services/offline/sync | grep test` to find it) that drives an RLS failure for a scorecard sync and asserts `notifyRoundAccessLost` (mocked via `jest.mock('@/services/rounds/roundAccessEvents')`) was called with the round id. Follow the existing RLS-failure test in that file for setup.

- [ ] **Step 5: Run.** `pnpm test src/store/scorecardSyncDebounce.test.ts src/services/rounds/roundAccessEvents.test.ts` plus the orchestrator test file → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store/scorecardSyncDebounce.ts src/store/scorecardSyncDebounce.test.ts src/services/rounds/roundAccessEvents.ts src/services/rounds/roundAccessEvents.test.ts src/services/offline/sync/syncOrchestrator.ts <orchestrator test file>
git commit -m "feat(sync): per-card debounce cancel and round-access-lost signal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Store removal action and client add/remove flows

**Files:**
- Modify: `src/store/initializeRoundSlice.ts` (add `removePlayerScorecard` after `ensureTeamMemberScorecards`)
- Modify: `src/store/scorecardStore.ts` (interface ~line 145, implementation ~line 440)
- Create: `src/services/rounds/roundRoster.ts`
- Test: `src/__tests__/store/scorecardStore.roster.test.ts`, `src/services/rounds/roundRoster.test.ts`

**Interfaces:**
- Consumes: `cancelPendingScorecardSync` (Task 4), `ensureTeamMemberScorecards` (existing).
- Produces:
  - Store: `removePlayerFromRound(playerId: string): Promise<void>`
  - `rowToPlayer(row: SupabaseCompetitionPlayerData): Player | null`
  - `fetchRoundRoster(roundId: string): Promise<RoundRosterSnapshot>` where `interface RoundRosterSnapshot { round: { id: string; userId: string; deletedAt: string | null } | null; players: Player[] }` — throws on any Supabase error.
  - `addPlayerToRound(roundId: string, playerId: string): Promise<Player>`
  - `removePlayerFromRound(roundId: string, playerId: string): Promise<void>`
  - `class RoundRosterError extends Error { hint: string | null }`

- [ ] **Step 1: Failing store test** (append to `scorecardStore.roster.test.ts`):

```ts
describe('removePlayerFromRound', () => {
  it('deletes the local card and drops the player from the store', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_WHITE);
    useScorecardStore.setState({ allowedPlayerIds: [P1.id, P2.id] });

    await getStore().removePlayerFromRound(P2.id);

    expect(deleteScorecard).toHaveBeenCalledWith(cardId(P2.id));
    expect(getStore().groupScorecards.has(P2.id)).toBe(false);
    expect(getStore().currentPlayers.map((p) => p.id)).toEqual([P1.id]);
    expect(getStore().allowedPlayerIds).toEqual([P1.id]);
  });

  it('re-adding after removal creates a fresh blank card (Review Focus #2)', async () => {
    await getStore().initializeRound(ROUND_ID, [P1, P2], create18Holes(), 'stroke', false, [], TEE_WHITE);
    await getStore().setPlayerScore(P2.id, 1, 5);
    await getStore().removePlayerFromRound(P2.id);
    (getScorecardsByRound as jest.Mock).mockResolvedValue([]); // SQLite card is gone

    await getStore().ensureTeamMemberScorecards([P2]);

    expect(getStore().groupScorecards.get(P2.id)?.scores).toEqual({});
  });

  it('is a no-op for an unknown player', async () => {
    await getStore().initializeRound(ROUND_ID, [P1], create18Holes(), 'stroke', false, [], TEE_WHITE);
    await getStore().removePlayerFromRound('nobody');
    expect(deleteScorecard).not.toHaveBeenCalled();
    expect(getStore().currentPlayers).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run.** `pnpm test src/__tests__/store/scorecardStore.roster.test.ts` → FAIL (`removePlayerFromRound` is not a function).

- [ ] **Step 3: Implement the slice function** in `initializeRoundSlice.ts` (add `deleteScorecard` to its `@/services/offline/database` import):

```ts
/**
 * Remove a player's card from this device after the server removed them
 * (owner action or roster reconcile). Deletes the local card + hole scores so
 * a later re-add can't revive old scores from SQLite.
 */
export async function removePlayerScorecard(set: SetFn, get: GetFn, playerId: string): Promise<string | null> {
  const state = get();
  const roundId = state.currentRoundId;
  const card = state.groupScorecards.get(playerId);
  if (!roundId || !card) return null;

  await withRoundPersistence(captureRoundPersistenceSource(roundId), async () => {
    await deleteScorecard(card.id);
  });

  const latest = get();
  if (latest.currentRoundId !== roundId) return card.id;
  const cards = new Map(latest.groupScorecards);
  cards.delete(playerId);
  set({
    groupScorecards: cards,
    currentPlayers: latest.currentPlayers.filter((p) => p.id !== playerId),
    allowedPlayerIds: latest.allowedPlayerIds.filter((id) => id !== playerId),
  });
  return card.id;
}
```

In `scorecardStore.ts` add to the interface next to `ensureTeamMemberScorecards`:

```ts
  /** Drop a removed player's card from this device (memory + SQLite). */
  removePlayerFromRound: (playerId: string) => Promise<void>;
```

and to the implementation next to `ensureTeamMemberScorecards`:

```ts
    removePlayerFromRound: async (playerId) => {
      const removedId = await initSlice.removePlayerScorecard(set, get, playerId);
      if (removedId) liveScorecardOrigins.delete(removedId);
    },
```

- [ ] **Step 4: Run.** Store test → PASS. Then run the scoring subset (Step 10) early to catch regressions.

- [ ] **Step 5: Failing service tests** `src/services/rounds/roundRoster.test.ts`:

```ts
import { addPlayerToRound, removePlayerFromRound, RoundRosterError, rowToPlayer } from './roundRoster';
import { supabase } from '@/services/supabase/client';
import { useScorecardStore } from '@/store/scorecardStore';
import { cancelPendingScorecardSync, debouncedQueueScorecardSync } from '@/store/scorecardSyncDebounce';
import { removePendingSyncByEntityKey } from '@/services/offline/database';

jest.mock('@/services/supabase/client', () => ({ supabase: { rpc: jest.fn(), from: jest.fn() } }));
jest.mock('@/store/scorecardSyncDebounce', () => ({
  cancelPendingScorecardSync: jest.fn(), debouncedQueueScorecardSync: jest.fn(),
}));
jest.mock('@/services/offline/database', () => ({ removePendingSyncByEntityKey: jest.fn() }));
jest.mock('@/services/rounds/roundScoringCoordinator', () => ({
  withRoundScoringWrite: (_id: string, op: () => Promise<unknown>) => op(),
}));
jest.mock('@/store/scorecardStore', () => {
  const state = {
    groupScorecards: new Map([['p2', { id: 'card-p2' }]]),
    ensureTeamMemberScorecards: jest.fn(),
    removePlayerFromRound: jest.fn(),
  };
  return { useScorecardStore: { getState: () => state } };
});

const rpc = supabase.rpc as jest.Mock;
const from = supabase.from as jest.Mock;

function mockRoster(players: { id: string; name: string }[]) {
  from.mockImplementation((table: string) => ({
    select: () => ({
      eq: () =>
        table === 'rounds'
          ? { maybeSingle: async () => ({ data: { id: 'r1', user_id: 'owner', deleted_at: null }, error: null }) }
          : Promise.resolve({
              data: players.map((p) => ({ player_id: p.id, players: { ...p, handicap: 10, handicap_index: null, gender: null } })),
              error: null,
            }),
    }),
  }));
}

beforeEach(() => jest.clearAllMocks());

it('rowToPlayer maps a round_players row', () => {
  expect(rowToPlayer({ player_id: 'p', players: { id: 'p', name: 'Sam', handicap: 12, handicap_index: 9.1, gender: 'male' } } as never))
    .toMatchObject({ id: 'p', name: 'Sam', handicap: 12, handicapIndex: 9.1, gender: 'male' });
  expect(rowToPlayer({ player_id: 'p', players: null } as never)).toBeNull();
});

it('addPlayerToRound calls the RPC then backfills the card', async () => {
  rpc.mockResolvedValue({ error: null });
  mockRoster([{ id: 'owner', name: 'Owner' }, { id: 'p3', name: 'Ben' }]);
  const player = await addPlayerToRound('r1', 'p3');
  expect(rpc).toHaveBeenCalledWith('add_round_player', { p_round_id: 'r1', p_player_id: 'p3' });
  expect(player.id).toBe('p3');
  expect(useScorecardStore.getState().ensureTeamMemberScorecards).toHaveBeenCalledWith([expect.objectContaining({ id: 'p3' })]);
});

it('addPlayerToRound surfaces the server hint and changes nothing locally', async () => {
  rpc.mockResolvedValue({ error: { message: 'This round is full', hint: 'round_full' } });
  await expect(addPlayerToRound('r1', 'p3')).rejects.toMatchObject({ hint: 'round_full' });
  expect(useScorecardStore.getState().ensureTeamMemberScorecards).not.toHaveBeenCalled();
});

it('removePlayerFromRound cancels that card, calls the RPC, drops its queue item and local card', async () => {
  rpc.mockResolvedValue({ error: null });
  await removePlayerFromRound('r1', 'p2');
  expect(cancelPendingScorecardSync).toHaveBeenCalledWith('card-p2');
  expect(rpc).toHaveBeenCalledWith('remove_round_player', { p_round_id: 'r1', p_player_id: 'p2' });
  expect(removePendingSyncByEntityKey).toHaveBeenCalledWith('scorecard:r1:p2');
  expect(useScorecardStore.getState().removePlayerFromRound).toHaveBeenCalledWith('p2');
});

it('removePlayerFromRound re-arms the debounce when the RPC fails', async () => {
  rpc.mockResolvedValue({ error: { message: 'Scores have been submitted', hint: 'round_has_submitted_scorecards' } });
  (cancelPendingScorecardSync as jest.Mock).mockReturnValue(true);
  await expect(removePlayerFromRound('r1', 'p2')).rejects.toBeInstanceOf(RoundRosterError);
  expect(debouncedQueueScorecardSync).toHaveBeenCalledWith('card-p2', expect.any(Function));
  expect(useScorecardStore.getState().removePlayerFromRound).not.toHaveBeenCalled();
});
```

- [ ] **Step 6: Run.** `pnpm test src/services/rounds/roundRoster.test.ts` → FAIL.

- [ ] **Step 7: Implement `src/services/rounds/roundRoster.ts`.**

```ts
/**
 * Client side of mid-round roster edits on a social round.
 * Server first (owner-only RPCs), then this device's store + SQLite.
 * @see docs/superpowers/specs/2026-10-12-round-options-menu-design.md §2
 */

import { supabase } from '@/services/supabase/client';
import { removePendingSyncByEntityKey } from '@/services/offline/database';
import { withRoundScoringWrite } from '@/services/rounds/roundScoringCoordinator';
import { useScorecardStore } from '@/store/scorecardStore';
import { cancelPendingScorecardSync, debouncedQueueScorecardSync } from '@/store/scorecardSyncDebounce';
import { COMPETITION_PLAYERS_SELECT, type SupabaseCompetitionPlayerData } from '@/types/supabase/roundQueries';
import { getDisplayName } from '@/utils/formatting';
import type { Player } from '@/types';

export class RoundRosterError extends Error {
  constructor(message: string, readonly hint: string | null = null) {
    super(message);
    this.name = 'RoundRosterError';
  }
}

export interface RoundRosterSnapshot {
  round: { id: string; userId: string; deletedAt: string | null } | null;
  players: Player[];
}

export function rowToPlayer(row: SupabaseCompetitionPlayerData): Player | null {
  const p = row.players;
  if (!p) return null;
  return {
    id: p.id,
    name: getDisplayName(p.name, 'Unknown'),
    email: '',
    phone: null,
    handicap: p.handicap || 0,
    handicapIndex: p.handicap_index ?? null,
    gender: p.gender ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Same select and (no) status filter as useRoundPlayers. Throws on error. */
export async function fetchRoundRoster(roundId: string): Promise<RoundRosterSnapshot> {
  const [roundRes, playersRes] = await Promise.all([
    supabase.from('rounds').select('id, user_id, deleted_at').eq('id', roundId).maybeSingle(),
    supabase.from('round_players').select(COMPETITION_PLAYERS_SELECT).eq('round_id', roundId),
  ]);
  if (roundRes.error) throw new RoundRosterError(roundRes.error.message);
  if (playersRes.error) throw new RoundRosterError(playersRes.error.message);
  const round = roundRes.data as { id: string; user_id: string; deleted_at: string | null } | null;
  return {
    round: round ? { id: round.id, userId: round.user_id, deletedAt: round.deleted_at } : null,
    players: ((playersRes.data ?? []) as SupabaseCompetitionPlayerData[])
      .map(rowToPlayer)
      .filter((p): p is Player => p !== null),
  };
}

function rpcError(error: { message: string; hint?: string | null }): RoundRosterError {
  return new RoundRosterError(error.message, error.hint ?? null);
}

export async function addPlayerToRound(roundId: string, playerId: string): Promise<Player> {
  return withRoundScoringWrite(roundId, async () => {
    const { error } = await supabase.rpc('add_round_player' as never, {
      p_round_id: roundId,
      p_player_id: playerId,
    } as never);
    if (error) throw rpcError(error);

    const roster = await fetchRoundRoster(roundId);
    const player = roster.players.find((p) => p.id === playerId);
    if (!player) throw new RoundRosterError('Player was added but could not be loaded');
    // Idempotent backfill; not team-specific despite its name.
    await useScorecardStore.getState().ensureTeamMemberScorecards([player]);
    return player;
  });
}

export async function removePlayerFromRound(roundId: string, playerId: string): Promise<void> {
  return withRoundScoringWrite(roundId, async () => {
    const card = useScorecardStore.getState().groupScorecards.get(playerId);
    const hadPending = card ? cancelPendingScorecardSync(card.id) : false;

    const { error } = await supabase.rpc('remove_round_player' as never, {
      p_round_id: roundId,
      p_player_id: playerId,
    } as never);
    if (error) {
      if (card && hadPending) {
        debouncedQueueScorecardSync(card.id, () => useScorecardStore.getState().groupScorecards.get(playerId));
      }
      throw rpcError(error);
    }

    await removePendingSyncByEntityKey(`scorecard:${roundId}:${playerId}`);
    await useScorecardStore.getState().removePlayerFromRound(playerId);
  });
}
```

Check `SupabaseCompetitionPlayerData` is exported from `@/types/supabase/roundQueries` (it's used in `useRoundPlayers.ts`). `getDisplayName`'s import path: copy it from `useRoundPlayers.ts`.

- [ ] **Step 8: Leave `useRoundPlayers` untouched** (1.15.0 safety: no refactor of the shared score-entry player fetch). `rowToPlayer` mirrors its mapping; keep them in step. Do not add `email`/`phone` to `COMPETITION_PLAYERS_SELECT` — they are private under the pending player column lock (`supabase/migrations_pending/player_column_privileges.sql`); `rowToPlayer` sets `email: ''`, `phone: null`.

- [ ] **Step 9: Run.** `pnpm test src/services/rounds/roundRoster.test.ts src/__tests__/hooks/scorecard/useRoundData.test.tsx` → PASS.

- [ ] **Step 10: Scoring subset.**

Run: `pnpm test --testPathPattern='(golden|services/scoring|utils/(scoring|dailyHandicap|subMatches)|components/scorecard|store/scorecardStore|services/offline|services/scoreMismatch)'`
Expected: PASS apart from the known flaky tests listed in the "Jest baseline noise" memory note; compare against `main`.

- [ ] **Step 11: Commit**

```bash
git add src/store/initializeRoundSlice.ts src/store/scorecardStore.ts src/services/rounds/roundRoster.ts src/services/rounds/roundRoster.test.ts src/__tests__/store/scorecardStore.roster.test.ts
git commit -m "feat(scoring): add/remove players mid-round on social rounds

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Roster reconcile on other devices

**Files:**
- Create: `src/services/rounds/reconcileRoster.ts`
- Create: `src/services/rounds/roundRosterChannel.ts`
- Create: `src/hooks/scorecard/useRoundRosterSync.ts`
- Modify: `src/hooks/scorecard/index.ts` (export the hook)
- Test: `src/services/rounds/reconcileRoster.test.ts`, `src/hooks/scorecard/useRoundRosterSync.test.ts`

**Interfaces:**
- Consumes: `fetchRoundRoster`, `RoundRosterSnapshot` (Task 5); `onRoundAccessLost` (Task 4); store `removePlayerFromRound`, `ensureTeamMemberScorecards`, `resetRound`; `activeRoundSession.clear()`; `deleteScorecardsByRound`; `cancelPendingScorecardSync`; `removePendingSyncByEntityKey`.
- Produces:
  - `type RosterDecision = { kind: 'ignore' } | { kind: 'exit_removed' } | { kind: 'exit_deleted' } | { kind: 'exit_unavailable' } | { kind: 'apply'; added: Player[]; removed: { id: string; name: string }[] }`
  - `reconcileRoster(snapshot: RoundRosterSnapshot, storePlayers: { id: string; name: string }[], currentUserId: string): RosterDecision`
  - `type RoundEvent = 'roster_changed' | 'round_deleted'`
  - `registerRoundChannel(roundId: string, channel: RealtimeChannel): () => void`
  - `sendRoundEvent(roundId: string, event: RoundEvent): Promise<void>` (no-op if no channel registered)
  - `useRoundRosterSync(args: { roundId: string; enabled: boolean; isOnline: boolean; currentUserId: string | undefined; onExit: (message: string) => void }): { refresh: () => Promise<void>; markLocalEdit: () => void }`

Note on spec deviation: the spec lists two exits; a removed user can't read the round at all, so "round not visible" can't be told apart from "deleted". This plan adds `exit_unavailable` ("This round is no longer available") for that case and keeps `exit_deleted` for a visible round with `deleted_at` set.

- [ ] **Step 1: Failing pure tests.**

```ts
import { reconcileRoster } from './reconcileRoster';
import type { Player } from '@/types';

const p = (id: string, name = id): Player => ({ id, name, email: '', handicap: 0, createdAt: new Date(), updatedAt: new Date() } as Player);
const round = { id: 'r', userId: 'owner', deletedAt: null };
const store = [{ id: 'owner', name: 'Owner' }, { id: 'me', name: 'Me' }, { id: 'b', name: 'Ben' }];

describe('reconcileRoster', () => {
  it('ignores an empty list or one without the owner (Review Focus #4)', () => {
    expect(reconcileRoster({ round, players: [] }, store, 'me')).toEqual({ kind: 'ignore' });
    expect(reconcileRoster({ round, players: [p('me'), p('b')] }, store, 'me')).toEqual({ kind: 'ignore' });
  });
  it('exits when the round is not visible (Review Focus #1)', () => {
    expect(reconcileRoster({ round: null, players: [] }, store, 'me')).toEqual({ kind: 'exit_unavailable' });
  });
  it('exits when the round is deleted', () => {
    expect(reconcileRoster({ round: { ...round, deletedAt: '2026-10-12' }, players: [p('owner'), p('me')] }, store, 'me'))
      .toEqual({ kind: 'exit_deleted' });
  });
  it('exits when the current user was removed', () => {
    expect(reconcileRoster({ round, players: [p('owner'), p('b')] }, store, 'me')).toEqual({ kind: 'exit_removed' });
  });
  it('applies adds and removes', () => {
    expect(reconcileRoster({ round, players: [p('owner'), p('me'), p('c', 'Cat')] }, store, 'me')).toEqual({
      kind: 'apply',
      added: [expect.objectContaining({ id: 'c' })],
      removed: [{ id: 'b', name: 'Ben' }],
    });
  });
  it('is a no-op apply when nothing changed', () => {
    expect(reconcileRoster({ round, players: [p('owner'), p('me'), p('b')] }, store, 'me'))
      .toEqual({ kind: 'apply', added: [], removed: [] });
  });
});
```

- [ ] **Step 2: Run.** → FAIL.

- [ ] **Step 3: Implement `reconcileRoster.ts`.**

```ts
import type { Player } from '@/types';
import type { RoundRosterSnapshot } from './roundRoster';

export type RosterDecision =
  | { kind: 'ignore' }
  | { kind: 'exit_removed' }
  | { kind: 'exit_deleted' }
  | { kind: 'exit_unavailable' }
  | { kind: 'apply'; added: Player[]; removed: { id: string; name: string }[] };

/**
 * Decide what a scoring device should do with a fresh roster read.
 * Never removes from a doubtful read: an empty list or one missing the owner
 * is ignored (fetch errors never reach here — fetchRoundRoster throws).
 */
export function reconcileRoster(
  snapshot: RoundRosterSnapshot,
  storePlayers: { id: string; name: string }[],
  currentUserId: string,
): RosterDecision {
  if (!snapshot.round) return { kind: 'exit_unavailable' };
  if (snapshot.round.deletedAt) return { kind: 'exit_deleted' };

  const serverIds = new Set(snapshot.players.map((p) => p.id));
  if (serverIds.size === 0 || !serverIds.has(snapshot.round.userId)) return { kind: 'ignore' };
  if (!serverIds.has(currentUserId)) return { kind: 'exit_removed' };

  const storeIds = new Set(storePlayers.map((p) => p.id));
  return {
    kind: 'apply',
    added: snapshot.players.filter((p) => !storeIds.has(p.id)),
    removed: storePlayers.filter((p) => !serverIds.has(p.id)).map(({ id, name }) => ({ id, name })),
  };
}
```

- [ ] **Step 4: Run.** → PASS.

- [ ] **Step 5: Implement `roundRosterChannel.ts`.**

```ts
/**
 * Broadcast pings for roster changes on a social round. The payload carries
 * only the event name; receivers re-read the roster under their own RLS.
 * Postgres-changes can't be used: on RLS tables DELETE payloads carry only the
 * primary key, and a removed player loses SELECT on round_players.
 */

import type { RealtimeChannel } from '@supabase/supabase-js';

export type RoundEvent = 'roster_changed' | 'round_deleted';

const channels = new Map<string, RealtimeChannel>();

export const roundChannelName = (roundId: string) => `round:${roundId}`;

export function registerRoundChannel(roundId: string, channel: RealtimeChannel): () => void {
  channels.set(roundId, channel);
  return () => {
    if (channels.get(roundId) === channel) channels.delete(roundId);
  };
}

export async function sendRoundEvent(roundId: string, event: RoundEvent): Promise<void> {
  const channel = channels.get(roundId);
  if (!channel) return;
  try {
    await channel.send({ type: 'broadcast', event, payload: {} });
  } catch {
    // Best effort: peers also reconcile on focus and on upload failure.
  }
}
```

- [ ] **Step 6: Failing hook test** `src/hooks/scorecard/useRoundRosterSync.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react-native';
import { useRoundRosterSync } from './useRoundRosterSync';
import { fetchRoundRoster } from '@/services/rounds/roundRoster';
import { useScorecardStore } from '@/store/scorecardStore';
import { deleteScorecardsByRound, removePendingSyncByEntityKey } from '@/services/offline/database';

jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('@/services/supabase/client', () => {
  const channel = { on: jest.fn().mockReturnThis(), subscribe: jest.fn().mockReturnThis(), send: jest.fn() };
  return { supabase: { channel: jest.fn(() => channel), removeChannel: jest.fn() } };
});
jest.mock('@/services/rounds/roundRoster', () => ({ fetchRoundRoster: jest.fn() }));
jest.mock('@/services/offline/database', () => ({
  deleteScorecardsByRound: jest.fn(), removePendingSyncByEntityKey: jest.fn(),
}));
jest.mock('@/services/activeRoundSession', () => ({ activeRoundSession: { clear: jest.fn() } }));
jest.mock('@/store/scorecardSyncDebounce', () => ({ cancelPendingScorecardSync: jest.fn() }));
jest.mock('@/services/rounds/roundScoringCoordinator', () => ({
  withRoundScoringWrite: (_id: string, op: () => Promise<unknown>) => op(),
}));
jest.mock('@/context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));

const state = {
  currentRoundId: 'r',
  currentPlayers: [{ id: 'owner', name: 'Owner' }, { id: 'me', name: 'Me' }, { id: 'b', name: 'Ben' }],
  groupScorecards: new Map([['b', { id: 'card-b' }]]),
  removePlayerFromRound: jest.fn(),
  ensureTeamMemberScorecards: jest.fn(),
  resetRound: jest.fn(),
};
jest.mock('@/store/scorecardStore', () => ({ useScorecardStore: { getState: () => state } }));

const player = (id: string) => ({ id, name: id });
const fetchMock = fetchRoundRoster as jest.Mock;
const args = { roundId: 'r', enabled: true, isOnline: true, currentUserId: 'me', onExit: jest.fn() };

beforeEach(() => jest.clearAllMocks());

it('removes a player the server no longer has', async () => {
  fetchMock.mockResolvedValue({ round: { id: 'r', userId: 'owner', deletedAt: null }, players: [player('owner'), player('me')] });
  const { result } = renderHook(() => useRoundRosterSync(args));
  await act(() => result.current.refresh());
  expect(removePendingSyncByEntityKey).toHaveBeenCalledWith('scorecard:r:b');
  expect(state.removePlayerFromRound).toHaveBeenCalledWith('b');
});

it('exits and clears local data when the user was removed', async () => {
  fetchMock.mockResolvedValue({ round: { id: 'r', userId: 'owner', deletedAt: null }, players: [player('owner'), player('b')] });
  const { result } = renderHook(() => useRoundRosterSync(args));
  await act(() => result.current.refresh());
  expect(deleteScorecardsByRound).toHaveBeenCalledWith('r');
  expect(state.resetRound).toHaveBeenCalled();
  expect(args.onExit).toHaveBeenCalledWith('You were removed from this round');
});

it('drops a fetch that started before a local edit (Review Focus #3)', async () => {
  let resolve!: (v: unknown) => void;
  fetchMock.mockReturnValue(new Promise((r) => { resolve = r; }));
  const { result } = renderHook(() => useRoundRosterSync(args));
  let pending!: Promise<void>;
  act(() => { pending = result.current.refresh(); });
  act(() => result.current.markLocalEdit());
  resolve({ round: { id: 'r', userId: 'owner', deletedAt: null }, players: [player('owner'), player('me')] });
  await act(() => pending);
  expect(state.removePlayerFromRound).not.toHaveBeenCalled();
});

it('ignores fetch errors', async () => {
  fetchMock.mockRejectedValue(new Error('network'));
  const { result } = renderHook(() => useRoundRosterSync(args));
  await act(() => result.current.refresh());
  expect(state.removePlayerFromRound).not.toHaveBeenCalled();
  expect(args.onExit).not.toHaveBeenCalled();
});
```

- [ ] **Step 7: Run.** → FAIL.

- [ ] **Step 8: Implement `useRoundRosterSync.ts`.**

```ts
/**
 * Keeps this device's roster in step with the server for a social round.
 * Re-reads on a Broadcast ping, on focus while online, and when an upload for
 * this round loses access. A confirmed read with this user still in the round
 * is the only thing allowed to discard a removed player's local writes.
 * @see docs/superpowers/specs/2026-10-12-round-options-menu-design.md §4
 */

import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/services/supabase/client';
import { fetchRoundRoster } from '@/services/rounds/roundRoster';
import { reconcileRoster } from '@/services/rounds/reconcileRoster';
import { registerRoundChannel, roundChannelName } from '@/services/rounds/roundRosterChannel';
import { onRoundAccessLost } from '@/services/rounds/roundAccessEvents';
import { withRoundScoringWrite } from '@/services/rounds/roundScoringCoordinator';
import { deleteScorecardsByRound, removePendingSyncByEntityKey } from '@/services/offline/database';
import { activeRoundSession } from '@/services/activeRoundSession';
import { useScorecardStore } from '@/store/scorecardStore';
import { cancelPendingScorecardSync } from '@/store/scorecardSyncDebounce';
import { useToast } from '@/context/ToastContext';

const EXIT_MESSAGES = {
  exit_removed: 'You were removed from this round',
  exit_deleted: 'This round was deleted',
  exit_unavailable: 'This round is no longer available',
} as const;

interface Args {
  roundId: string;
  enabled: boolean;
  isOnline: boolean;
  currentUserId: string | undefined;
  onExit: (message: string) => void;
}

export function useRoundRosterSync({ roundId, enabled, isOnline, currentUserId, onExit }: Args) {
  const { showToast } = useToast();
  const editSeq = useRef(0);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  const markLocalEdit = useCallback(() => {
    editSeq.current += 1;
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled || !currentUserId) return;
    const startedAt = editSeq.current;
    let snapshot;
    try {
      snapshot = await fetchRoundRoster(roundId);
    } catch {
      return; // never act on a failed read
    }
    if (editSeq.current !== startedAt) return; // a local edit happened meanwhile

    const store = useScorecardStore.getState();
    if (store.currentRoundId !== roundId) return;
    const decision = reconcileRoster(snapshot, store.currentPlayers, currentUserId);

    if (decision.kind === 'ignore') return;

    if (decision.kind === 'apply') {
      if (!decision.added.length && !decision.removed.length) return;
      await withRoundScoringWrite(roundId, async () => {
        for (const removed of decision.removed) {
          const card = useScorecardStore.getState().groupScorecards.get(removed.id);
          if (card) cancelPendingScorecardSync(card.id);
          await removePendingSyncByEntityKey(`scorecard:${roundId}:${removed.id}`);
          await useScorecardStore.getState().removePlayerFromRound(removed.id);
          showToast({ variant: 'info', title: `${removed.name} was removed from the round` });
        }
        if (decision.added.length) {
          await useScorecardStore.getState().ensureTeamMemberScorecards(decision.added);
        }
      });
      return;
    }

    await withRoundScoringWrite(roundId, async () => {
      for (const card of useScorecardStore.getState().groupScorecards.values()) {
        cancelPendingScorecardSync(card.id);
      }
      await deleteScorecardsByRound(roundId);
    });
    await activeRoundSession.clear();
    useScorecardStore.getState().resetRound();
    onExitRef.current(EXIT_MESSAGES[decision.kind]);
  }, [enabled, currentUserId, roundId, showToast]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  // Broadcast pings from the owner's device.
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(roundChannelName(roundId))
      .on('broadcast', { event: 'roster_changed' }, () => void refreshRef.current())
      .on('broadcast', { event: 'round_deleted' }, () => void refreshRef.current())
      .subscribe();
    const unregister = registerRoundChannel(roundId, channel);
    return () => {
      unregister();
      void supabase.removeChannel(channel);
    };
  }, [enabled, roundId]);

  // Uploads that lost access.
  useEffect(() => {
    if (!enabled) return;
    return onRoundAccessLost((lostRoundId) => {
      if (lostRoundId === roundId) void refreshRef.current();
    });
  }, [enabled, roundId]);

  // Open / focus while online.
  useFocusEffect(
    useCallback(() => {
      if (enabled && isOnline) void refreshRef.current();
    }, [enabled, isOnline])
  );

  return { refresh, markLocalEdit };
}
```

Add `export { useRoundRosterSync } from './useRoundRosterSync';` to `src/hooks/scorecard/index.ts`.

- [ ] **Step 9: Run.** `pnpm test src/services/rounds/reconcileRoster.test.ts src/hooks/scorecard/useRoundRosterSync.test.ts` → PASS.

- [ ] **Step 10: Commit**

```bash
git add src/services/rounds/reconcileRoster.ts src/services/rounds/reconcileRoster.test.ts src/services/rounds/roundRosterChannel.ts src/hooks/scorecard/useRoundRosterSync.ts src/hooks/scorecard/useRoundRosterSync.test.ts src/hooks/scorecard/index.ts
git commit -m "feat(scoring): reconcile social-round roster across devices

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Holes change from score entry

**Files:**
- Modify: `src/hooks/scorecard/useRoundData.ts:67-69` (result type) and `:965-976` (return)
- Modify: `src/components/rounds/ViewRound/RoundDetailsTab/sheets/EditNineTypeSheet.tsx` (props + mutation `onSuccess`)
- Test: `src/components/rounds/ViewRound/RoundDetailsTab/sheets/EditNineTypeSheet.test.tsx`, `src/__tests__/services/rounds/nineTypeShapeAdoption.test.ts` (create)

**Interfaces:**
- Produces:
  - `useRoundData` result gains `refetchMetadata: () => Promise<void>` and `refetchPlayers: () => Promise<void>`
  - `EditNineTypeSheetProps` gains `scoredHoleNumbers?: number[]` (overrides the server-card scan) and `beforeReset?: () => Promise<void>` (awaited before `resetRound()`), and `onChanged?: (nineType: NineType) => void` (called after success).

- [ ] **Step 1: Failing sheet tests** (append to `EditNineTypeSheet.test.tsx`, reusing its render helper and mocks):

```ts
it('uses scoredHoleNumbers instead of server cards for the hidden-holes warning', async () => {
  renderSheet({ currentNineType: 'full', scoredHoleNumbers: [10, 11] });
  fireEvent.press(screen.getByText('Front 9'));
  expect(await screen.findByText(/10–11/)).toBeTruthy();
});

it('awaits beforeReset before resetting the store, then calls onChanged', async () => {
  const order: string[] = [];
  const beforeReset = jest.fn(async () => { order.push('beforeReset'); });
  const onChanged = jest.fn(() => order.push('onChanged'));
  jest.spyOn(useScorecardStore.getState(), 'resetRound').mockImplementation(() => { order.push('reset'); });
  useScorecardStore.setState({ currentRoundId: ROUND_ID });
  renderSheet({ currentNineType: 'full', scoredHoleNumbers: [], beforeReset, onChanged });
  fireEvent.press(screen.getByText('Front 9'));
  await waitFor(() => expect(onChanged).toHaveBeenCalledWith('front9'));
  expect(order).toEqual(['beforeReset', 'reset', 'onChanged']);
});
```

Adapt `renderSheet` / `ROUND_ID` to the helper names that file already uses.

- [ ] **Step 2: Run.** `pnpm test src/components/rounds/ViewRound/RoundDetailsTab/sheets/EditNineTypeSheet.test.tsx` → FAIL.

- [ ] **Step 3: Implement the sheet changes.**

```ts
export interface EditNineTypeSheetProps {
  visible: boolean;
  onDismiss: () => void;
  roundId: string;
  currentNineType: NineType;
  /** Any non-null rounds.holes_played marker fixes the round's hole count. */
  holesPlayed?: number | null;
  /** Live scored holes (score entry); when set, server cards aren't read. */
  scoredHoleNumbers?: number[];
  /** Awaited before resetRound(): refetch metadata + players so re-init isn't stale. */
  beforeReset?: () => Promise<void>;
  /** Called after a successful change (e.g. to broadcast to peers). */
  onChanged?: (nineType: NineType) => void;
}
```

```ts
  const { data: scorecards } = useRoundScorecards(scoredHoleNumbers ? undefined : roundId);
  const scoredHoles = useMemo(
    () => (scoredHoleNumbers ? new Set(scoredHoleNumbers) : collectScoredHoles(scorecards ?? [])),
    [scoredHoleNumbers, scorecards]
  );
```

(If `useRoundScorecards(undefined)` is not allowed by its signature, pass `roundId` and an `{ enabled: !scoredHoleNumbers }` option if supported; otherwise keep the query and just ignore its data when `scoredHoleNumbers` is set.)

Make `onSuccess` async and order it:

```ts
    onSuccess: async (_data, nineType) => {
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
      queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaderboardKeys.all });
      await deleteHoles(roundId).catch(() => undefined);
      await beforeReset?.().catch(() => undefined);
      const scorecardState = useScorecardStore.getState();
      if (scorecardState.currentRoundId === roundId) {
        scorecardState.resetRound();
      }
      onChanged?.(nineType);
      setPendingChange(null);
      onDismiss();
    },
```

Keep the existing long comment above the reset. `deleteHoles` is now awaited before the reset so the re-init can't read the old hole cache.

- [ ] **Step 4: Expose refetchers from `useRoundData`.**

```ts
interface UseRoundDataResult extends RoundDataState {
  retryFetch: () => void;
  refetchMetadata: () => Promise<void>;
  refetchPlayers: () => Promise<void>;
}
```

```ts
  return {
    ...state,
    retryFetch,
    refetchMetadata: metadata.refetch,
    refetchPlayers: playersHook.refetch,
  };
```

- [ ] **Step 5: Shape-adoption test for a nine_type-only change.** Create `src/__tests__/services/rounds/nineTypeShapeAdoption.test.ts`. Find the existing test that covers `round_shape_changed` adoption for `holes_played` (`grep -rln "adoptRoundShapeWithinScoringWrite\|round_shape_changed" src/__tests__ src/services | grep test`) and copy its setup; change the server shape to `{ nine_type: 'front9', holes_played: null }` with a local card on `{ nine_type: 'full', holes_played: null }`, and assert the card is rebuilt to front-9 holes with scores on holes 1–9 kept and the queued write re-sent with `expected_round_shape: { nine_type: 'front9', holes_played: null }`. If it fails, stop and report — this is a spec assumption (peers self-heal on a holes change) and must be fixed before Task 11 wires the Holes row.

- [ ] **Step 6: Run.** Sheet tests, `src/__tests__/hooks/scorecard/useRoundData.test.tsx`, and the new adoption test → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/scorecard/useRoundData.ts src/components/rounds/ViewRound/RoundDetailsTab/sheets/EditNineTypeSheet.tsx src/components/rounds/ViewRound/RoundDetailsTab/sheets/EditNineTypeSheet.test.tsx src/__tests__/services/rounds/nineTypeShapeAdoption.test.ts
git commit -m "feat(scoring): live-safe holes change (fresh roster/metadata before re-init)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Delete from score entry (sync first, keep Undo)

**Files:**
- Create: `src/services/rounds/syncRoundNow.ts`
- Modify: `src/services/offline/dao/ScorecardDAO.ts:362-400` (`deleteScorecardsByRound`)
- Modify: `src/screens/scoring/ScorecardEntryScreen/hooks/useScorecardSubmission.ts:119-145`
- Test: `src/services/rounds/syncRoundNow.test.ts`, `src/services/offline/dao/ScorecardDAO.deleteByRound.test.ts` (create), `src/screens/scoring/ScorecardEntryScreen/hooks/useScorecardSubmission.delete.test.ts` (create)

**Interfaces:**
- Consumes: `cancelPendingScorecardSync` (Task 4), `sendRoundEvent` (Task 6).
- Produces:
  - `syncRoundNow(roundId: string, cards: Scorecard[], timeoutMs?: number): Promise<boolean>` — true when nothing for the round is left unsynced.
  - `useScorecardSubmission` gains option `onDeleted?: () => void` and its `handleDeleteRound` now syncs first.

- [ ] **Step 1: Failing `syncRoundNow` tests.**

```ts
import { syncRoundNow } from './syncRoundNow';
import { manualSync, queueScorecardSync } from '@/services/offline/sync';
import { hasUnsyncedScorecardsForRound } from '@/services/offline/database';
import { cancelPendingScorecardSync } from '@/store/scorecardSyncDebounce';

jest.mock('@/services/offline/sync', () => ({ manualSync: jest.fn(), queueScorecardSync: jest.fn() }));
jest.mock('@/services/offline/database', () => ({ hasUnsyncedScorecardsForRound: jest.fn() }));
jest.mock('@/store/scorecardSyncDebounce', () => ({ cancelPendingScorecardSync: jest.fn() }));
jest.mock('@/services/offline/roundPersistenceBarrier', () => ({
  captureRoundPersistenceSource: jest.fn(() => ({})),
  withRoundPersistence: (_s: unknown, work: (lease: unknown) => Promise<unknown>) => work('lease'),
}));

const card = { id: 'c1', roundId: 'r', status: 'in-progress' } as never;

it('re-queues pending cards, syncs and reports success', async () => {
  (cancelPendingScorecardSync as jest.Mock).mockReturnValue(true);
  (manualSync as jest.Mock).mockResolvedValue(true);
  (hasUnsyncedScorecardsForRound as jest.Mock).mockResolvedValue(false);
  await expect(syncRoundNow('r', [card])).resolves.toBe(true);
  expect(queueScorecardSync).toHaveBeenCalledWith(card, 'update', { lease: 'lease' });
});

it('reports false when the sync times out', async () => {
  (manualSync as jest.Mock).mockReturnValue(new Promise(() => undefined));
  (hasUnsyncedScorecardsForRound as jest.Mock).mockResolvedValue(true);
  await expect(syncRoundNow('r', [card], 10)).resolves.toBe(false);
});
```

- [ ] **Step 2: Run.** → FAIL.

- [ ] **Step 3: Implement `syncRoundNow.ts`.**

```ts
/**
 * Push this round's latest scores before a destructive action (delete), so
 * the Undo toast restores everything. Cancels debounce timers by queueing the
 * cards' current state directly.
 */

import { manualSync, queueScorecardSync } from '@/services/offline/sync';
import { hasUnsyncedScorecardsForRound } from '@/services/offline/database';
import { captureRoundPersistenceSource, withRoundPersistence } from '@/services/offline/roundPersistenceBarrier';
import { cancelPendingScorecardSync } from '@/store/scorecardSyncDebounce';
import type { Scorecard } from '@/types';

export async function syncRoundNow(roundId: string, cards: Scorecard[], timeoutMs = 5000): Promise<boolean> {
  for (const card of cards) {
    const hadPending = cancelPendingScorecardSync(card.id);
    if (hadPending && card.status !== 'completed') {
      await withRoundPersistence(captureRoundPersistenceSource(roundId), (lease) =>
        queueScorecardSync(card, 'update', { lease })
      );
    }
  }
  await Promise.race([
    manualSync().catch(() => false),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
  return !(await hasUnsyncedScorecardsForRound(roundId));
}
```

Note: the first test expects `queueScorecardSync` when `cancelPendingScorecardSync` returns true; keep that coupling.

- [ ] **Step 4: Failing DAO test** for `deleteScorecardsByRound` removing round-level queue items. Mock `getDb` as in `src/services/offline/dao/HoleScoreDAO.test.ts` (copy its `getDb` mock setup) with `getAllAsync` returning pending syncs:

```ts
[{ id: 1, data: JSON.stringify({ roundId: 'r' }) },
 { id: 2, data: JSON.stringify({ id: 'r', action: 'end_early' }) },
 { id: 3, data: JSON.stringify({ roundId: 'other' }) }]
```

and assert `runAsync` was called with `DELETE FROM pending_syncs WHERE id = ?` for ids 1 and 2 only (use the `TABLE_NAMES.PENDING_SYNCS` value from `src/services/offline/schema`).

- [ ] **Step 5: Run.** → FAIL.

- [ ] **Step 6: Implement.** In `deleteScorecardsByRound`, change the match to:

```ts
      // Scorecard items carry data.roundId; round-level items (finalize /
      // end-early intents) carry data.id.
      if (data.roundId === roundId || data.id === roundId) {
```

Do **not** change `deleteRound` in `src/hooks/rounds/mutations.ts` — it is shared with the Rounds-tab and Home swipe deletes and Round Settings in 1.15.0. The score-entry path already cancels timers and syncs before calling it.

- [ ] **Step 7: Failing submission-hook delete tests** `useScorecardSubmission.delete.test.ts`. Render the hook with `renderHook` and mocks for `useDeleteRound` (`mutateAsync: jest.fn()`), `activeRoundSession.clear`, `syncRoundNow`, `sendRoundEvent`, navigation (`goBack: jest.fn()`), and `useConfirmationDialog` (copy the mocking approach from any existing `useScorecardSubmission` test: `grep -rl useScorecardSubmission src | grep test`). Cases:

```ts
it('uses the undo-friendly confirmation copy', () => {
  result.current.handleDeleteRound();
  expect(showDialog).toHaveBeenCalledWith(expect.objectContaining({
    message: 'Delete this round? You can undo for a few seconds afterwards.',
  }));
});

it('syncs, deletes, broadcasts and leaves', async () => {
  (syncRoundNow as jest.Mock).mockResolvedValue(true);
  await act(() => lastDialog().onConfirm());
  expect(syncRoundNow).toHaveBeenCalled();
  expect(mutateAsync).toHaveBeenCalledWith({ roundId: 'r' });
  expect(sendRoundEvent).toHaveBeenCalledWith('r', 'round_deleted');
  expect(goBack).toHaveBeenCalled();
});

it('asks before deleting when the sync times out, and cancelling keeps the round (Review Focus #5)', async () => {
  (syncRoundNow as jest.Mock).mockResolvedValue(false);
  await act(() => lastDialog().onConfirm());
  expect(lastDialog()).toMatchObject({ message: "Some scores haven't uploaded. Delete anyway?" });
  act(() => lastDialog().onCancel?.());
  expect(mutateAsync).not.toHaveBeenCalled();
});
```

`lastDialog()` returns the last argument passed to the mocked `showDialog`.

- [ ] **Step 8: Run.** → FAIL.

- [ ] **Step 9: Implement in `useScorecardSubmission.ts`.** Import `syncRoundNow` and `sendRoundEvent`, read `groupScorecards` via `useScorecardStore.getState()`, and replace `performDelete` / `handleDeleteRound` with:

```ts
  const performDelete = useCallback(async () => {
    try {
      await deleteRoundMutation.mutateAsync({ roundId });
      await sendRoundEvent(roundId, 'round_deleted');
      await activeRoundSession.clear();
      resetRound();
      navigation.goBack();
    } catch (error) {
      console.error('[ScorecardEntryScreen] Error deleting round:', error);
      showAlert('Error', 'Failed to delete round. Please try again.');
    }
  }, [roundId, deleteRoundMutation, navigation, resetRound, showAlert]);

  const syncThenDelete = useCallback(async () => {
    const cards = [...useScorecardStore.getState().groupScorecards.values()];
    const synced = await syncRoundNow(roundId, cards);
    if (synced) {
      await performDelete();
      return;
    }
    showDialog({
      title: 'Delete Round',
      message: "Some scores haven't uploaded. Delete anyway?",
      confirmLabel: 'Delete',
      confirmVariant: 'destructive',
      icon: 'trash-can-outline',
      onConfirm: () => {
        dismissDialog();
        void performDelete();
      },
    });
  }, [roundId, performDelete, showDialog, dismissDialog]);

  const handleDeleteRound = useCallback(() => {
    showDialog({
      title: 'Delete Round',
      message: 'Delete this round? You can undo for a few seconds afterwards.',
      confirmLabel: 'Delete',
      confirmVariant: 'destructive',
      icon: 'trash-can-outline',
      onConfirm: () => {
        dismissDialog();
        void syncThenDelete();
      },
    });
  }, [showDialog, dismissDialog, syncThenDelete]);
```

The existing `useDeleteRound` already removes local cards via `deleteScorecardsByRound` and shows the 6 s Undo toast — do not add a second cleanup.

- [ ] **Step 10: Run** the three new test files → PASS.

- [ ] **Step 11: Commit**

```bash
git add src/services/rounds/syncRoundNow.ts src/services/rounds/syncRoundNow.test.ts src/services/offline/dao/ScorecardDAO.ts src/services/offline/dao/ScorecardDAO.deleteByRound.test.ts src/screens/scoring/ScorecardEntryScreen/hooks/useScorecardSubmission.ts src/screens/scoring/ScorecardEntryScreen/hooks/useScorecardSubmission.delete.test.ts
git commit -m "feat(scoring): delete round from score entry, syncing first so Undo is complete

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: RoundHeader ⋮ and RoundOptionsSheet

**Files:**
- Modify: `src/components/scorecard/RoundHeader.tsx:73-83` (props), `:211-217` (render)
- Create: `src/components/scorecard/RoundOptionsSheet/RoundOptionsSheet.tsx`
- Create: `src/components/scorecard/RoundOptionsSheet/index.ts`
- Test: `src/components/scorecard/RoundHeader.test.tsx` (append or create), `src/components/scorecard/RoundOptionsSheet/RoundOptionsSheet.test.tsx`

**Interfaces:**
- Consumes: `RoundOptionRow`, `RoundOptionKey` (Task 3).
- Produces:
  - `RoundHeaderProps.onMorePress?: () => void`
  - `RoundOptionsSheet({ visible, onClose, rows, onSelect }: { visible: boolean; onClose: () => void; rows: RoundOptionRow[]; onSelect: (key: RoundOptionKey) => void })`

- [ ] **Step 1: Failing header tests.** Using the file's existing render helper (or `render(<RoundHeader {...minimalProps} />)` with the required props from `RoundHeaderProps`):

```ts
it('shows ⋮ and opens the menu when onMorePress is passed', () => {
  const onMorePress = jest.fn();
  const onEndRoundEarlyPress = jest.fn();
  render(<RoundHeader {...baseProps} onMorePress={onMorePress} canEndRoundEarly onEndRoundEarlyPress={onEndRoundEarlyPress} />);
  fireEvent.press(screen.getByLabelText('Round options'));
  expect(onMorePress).toHaveBeenCalled();
  expect(onEndRoundEarlyPress).not.toHaveBeenCalled();
});

it('shows ⋮ for the menu even when end-early is unavailable', () => {
  render(<RoundHeader {...baseProps} onMorePress={jest.fn()} canEndRoundEarly={false} />);
  expect(screen.getByLabelText('Round options')).toBeTruthy();
});

it('keeps the direct end-early ⋮ without onMorePress', () => {
  const onEndRoundEarlyPress = jest.fn();
  render(<RoundHeader {...baseProps} canEndRoundEarly onEndRoundEarlyPress={onEndRoundEarlyPress} />);
  fireEvent.press(screen.getByLabelText('End round early'));
  expect(onEndRoundEarlyPress).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run.** → FAIL.

- [ ] **Step 3: Implement.** Add the prop to `RoundHeaderProps` after `onEndRoundEarlyPress`:

```ts
  /** When passed, ⋮ opens the round options menu instead of End round early. */
  onMorePress?: () => void;
```

destructure it, and replace the ⋮ block with:

```tsx
      {onMorePress ? (
        <HeaderIconButton icon="dots-vertical" onPress={onMorePress} accessibilityLabel="Round options" />
      ) : canEndRoundEarly && onEndRoundEarlyPress ? (
        <HeaderIconButton
          icon="dots-vertical"
          onPress={onEndRoundEarlyPress}
          accessibilityLabel="End round early"
        />
      ) : null}
```

- [ ] **Step 4: Failing sheet tests.**

```ts
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RoundOptionsSheet } from './RoundOptionsSheet';
import type { RoundOptionRow } from './roundOptionsRows';

const rows: RoundOptionRow[] = [
  { key: 'holes', label: 'Holes', icon: 'flag-variant-outline', disabled: false },
  { key: 'players', label: 'Players', icon: 'account-multiple-outline', disabled: true, caption: 'Needs a connection' },
  { key: 'delete', label: 'Delete round', icon: 'trash-can-outline', disabled: false, destructive: true },
];

it('renders rows with captions and selects enabled ones', () => {
  const onSelect = jest.fn();
  render(<RoundOptionsSheet visible onClose={jest.fn()} rows={rows} onSelect={onSelect} />);
  expect(screen.getByText('Needs a connection')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Holes'));
  expect(onSelect).toHaveBeenCalledWith('holes');
});

it('does not select disabled rows', () => {
  const onSelect = jest.fn();
  render(<RoundOptionsSheet visible onClose={jest.fn()} rows={rows} onSelect={onSelect} />);
  fireEvent.press(screen.getByLabelText('Players'));
  expect(onSelect).not.toHaveBeenCalled();
});
```

- [ ] **Step 5: Run.** → FAIL.

- [ ] **Step 6: Implement `RoundOptionsSheet.tsx`** (row style from `PhotoSourceMenu`):

```tsx
/**
 * RoundOptionsSheet — the score-entry ⋮ menu for a social round's owner.
 * Presentational: rows come from getRoundOptionsRows.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { BottomSheet } from '@/components/common/BottomSheet';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import type { RoundOptionKey, RoundOptionRow } from './roundOptionsRows';

export interface RoundOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  rows: RoundOptionRow[];
  onSelect: (key: RoundOptionKey) => void;
}

export function RoundOptionsSheet({ visible, onClose, rows, onSelect }: RoundOptionsSheetProps) {
  const colors = useThemeColors();

  return (
    <BottomSheet visible={visible} onClose={onClose} height={0.5} title="Round options" showCloseButton testID="round-options-sheet">
      <View style={styles.container}>
        {rows.map((row) => {
          const tint = row.disabled ? colors.textTertiary : row.destructive ? colors.error : colors.textPrimary;
          return (
            <TouchableOpacity
              key={row.key}
              style={[styles.row, { borderBottomColor: colors.border }]}
              activeOpacity={0.7}
              disabled={row.disabled}
              onPress={() => onSelect(row.key)}
              accessibilityRole="button"
              accessibilityLabel={row.label}
              accessibilityState={{ disabled: row.disabled }}
              accessibilityHint={row.caption}
            >
              <Icon source={row.icon} size={22} color={tint} />
              <View style={styles.text}>
                <Text style={[styles.label, { color: tint }]}>{row.label}</Text>
                {row.caption ? (
                  <Text style={[styles.caption, { color: colors.textSecondary }]}>{row.caption}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  text: { flex: 1, gap: 2 },
  label: { ...typography.body },
  caption: { ...typography.caption },
});
```

`index.ts`:

```ts
export { RoundOptionsSheet } from './RoundOptionsSheet';
export type { RoundOptionsSheetProps } from './RoundOptionsSheet';
export { getRoundOptionsRows } from './roundOptionsRows';
export type { RoundOptionKey, RoundOptionRow, RoundOptionsInput } from './roundOptionsRows';
```

- [ ] **Step 7: Run** header + sheet tests, plus `pnpm test src/components/scorecard` (match-play screens share RoundHeader) → PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/scorecard/RoundHeader.tsx src/components/scorecard/RoundHeader.test.tsx src/components/scorecard/RoundOptionsSheet
git commit -m "feat(scoring): round options sheet and header ⋮ entry point

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: RoundPlayersSheet

**Files:**
- Create: `src/components/scorecard/RoundPlayersSheet/RoundPlayersSheet.tsx`
- Create: `src/components/scorecard/RoundPlayersSheet/useAddablePlayers.ts`
- Create: `src/components/scorecard/RoundPlayersSheet/index.ts`
- Test: `src/components/scorecard/RoundPlayersSheet/RoundPlayersSheet.test.tsx`

**Interfaces:**
- Consumes: `addPlayerToRound`, `removePlayerFromRound`, `RoundRosterError` (Task 5); `getStandaloneMaxPlayers` (Task 3); `FriendSelectorBottomSheet`, `AddPlaceholderModal`, `useFriends`, `usePlaceholderPlayers` (existing).
- Produces:
  - `RoundPlayersSheet(props: { visible: boolean; onClose: () => void; roundId: string; ownerId: string; gameType: GameType; players: Player[]; playerTeeNames: Map<string, string>; onRosterChanged: () => void })`
  - `useAddablePlayers(excludeIds: string[]): { friends: Friend[]; friendsLoading: boolean; placeholders: PlaceholderPlayerWithStats[]; searchQuery: string; setSearchQuery: (q: string) => void }`

Deviation from spec (noted): the spec said to extract the picker host state out of `PartnersStep` and share it. To avoid touching the create-round wizard in this change, `useAddablePlayers` re-implements the small amount of host state needed here (friends, placeholders, search); `PartnersStep` is unchanged. A follow-up can move `PartnersStep` onto this hook.

- [ ] **Step 1: Failing tests.**

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { RoundPlayersSheet } from './RoundPlayersSheet';
import { addPlayerToRound, removePlayerFromRound, RoundRosterError } from '@/services/rounds/roundRoster';

jest.mock('@/services/rounds/roundRoster', () => {
  class RoundRosterError extends Error { constructor(m: string, public hint: string | null = null) { super(m); } }
  return { addPlayerToRound: jest.fn(), removePlayerFromRound: jest.fn(), RoundRosterError };
});
jest.mock('./useAddablePlayers', () => ({
  useAddablePlayers: () => ({ friends: [], friendsLoading: false, placeholders: [], searchQuery: '', setSearchQuery: jest.fn() }),
}));
const showToast = jest.fn();
jest.mock('@/context/ToastContext', () => ({ useToast: () => ({ showToast }) }));

const players = [
  { id: 'owner', name: 'Owner' },
  { id: 'b', name: 'Ben' },
] as never[];
const props = {
  visible: true, onClose: jest.fn(), roundId: 'r', ownerId: 'owner', gameType: 'stableford' as const,
  players, playerTeeNames: new Map([['owner', 'White'], ['b', 'Red']]), onRosterChanged: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

it('lists players with tees and no remove for the owner', () => {
  render(<RoundPlayersSheet {...props} />);
  expect(screen.getByText('Ben')).toBeTruthy();
  expect(screen.getByText('Red')).toBeTruthy();
  expect(screen.queryByLabelText('Remove Owner')).toBeNull();
  expect(screen.getByLabelText('Remove Ben')).toBeTruthy();
});

it('confirms then removes', async () => {
  (removePlayerFromRound as jest.Mock).mockResolvedValue(undefined);
  render(<RoundPlayersSheet {...props} />);
  fireEvent.press(screen.getByLabelText('Remove Ben'));
  expect(screen.getByText('Remove Ben? Their scores for this round will be deleted.')).toBeTruthy();
  fireEvent.press(screen.getByText('Remove'));
  await waitFor(() => expect(removePlayerFromRound).toHaveBeenCalledWith('r', 'b'));
  expect(props.onRosterChanged).toHaveBeenCalled();
});

it('shows the server error and keeps the player when removal fails', async () => {
  (removePlayerFromRound as jest.Mock).mockRejectedValue(new RoundRosterError('Scores have been submitted', 'round_has_submitted_scorecards'));
  render(<RoundPlayersSheet {...props} />);
  fireEvent.press(screen.getByLabelText('Remove Ben'));
  fireEvent.press(screen.getByText('Remove'));
  await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error', message: 'Scores have been submitted' })));
  expect(props.onRosterChanged).not.toHaveBeenCalled();
});

it('hides Add player when the round is full', () => {
  const four = ['owner', 'b', 'c', 'd'].map((id) => ({ id, name: id })) as never[];
  render(<RoundPlayersSheet {...props} players={four} />);
  expect(screen.queryByText('Add player')).toBeNull();
});
```

- [ ] **Step 2: Run.** → FAIL.

- [ ] **Step 3: Implement `useAddablePlayers.ts`.**

```ts
import { useMemo, useState } from 'react';
import { useFriends } from '@/hooks/useFriends';
import { usePlaceholderPlayers } from '@/hooks/usePlaceholderPlayers';

/** Friends and guests that can still be added to a round (excludes current players). */
export function useAddablePlayers(excludeIds: string[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: friends, isLoading: friendsLoading } = useFriends();
  const { data: placeholders } = usePlaceholderPlayers();
  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);

  return {
    friends: (friends ?? []).filter((f) => f.friendship_status === 'accepted' && !exclude.has(f.id)),
    friendsLoading,
    placeholders: (placeholders ?? []).filter((p) => !exclude.has(p.id)),
    searchQuery,
    setSearchQuery,
  };
}
```

- [ ] **Step 4: Implement `RoundPlayersSheet.tsx`.**

```tsx
/**
 * RoundPlayersSheet — add or remove players on a social round mid-round.
 * Server first via roundRoster; the store updates inside those calls.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { BottomSheet } from '@/components/common/BottomSheet';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { AddPlaceholderModal } from '@/components/common/AddPlaceholderModal';
import type { SelectedPlayer } from '@/components/common/FriendSelector';
import { FriendSelectorBottomSheet } from '@/screens/rounds/CreateRoundBottomSheet/steps/FriendSelectorBottomSheet';
import { useThemeColors } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { addPlayerToRound, removePlayerFromRound, RoundRosterError } from '@/services/rounds/roundRoster';
import { getStandaloneMaxPlayers } from '@/utils/roundRoster';
import type { GameType } from '@/types/database/enums';
import type { Player } from '@/types';
import { useAddablePlayers } from './useAddablePlayers';

export interface RoundPlayersSheetProps {
  visible: boolean;
  onClose: () => void;
  roundId: string;
  ownerId: string;
  gameType: GameType;
  players: Player[];
  playerTeeNames: Map<string, string>;
  onRosterChanged: () => void;
}

function errorMessage(error: unknown): string {
  return error instanceof RoundRosterError || error instanceof Error ? error.message : 'Please try again.';
}

export function RoundPlayersSheet({
  visible, onClose, roundId, ownerId, gameType, players, playerTeeNames, onRosterChanged,
}: RoundPlayersSheetProps) {
  const colors = useThemeColors();
  const { showToast } = useToast();
  const [confirmRemove, setConfirmRemove] = useState<Player | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [pending, setPending] = useState<SelectedPlayer[]>([]);

  const maxPlayers = getStandaloneMaxPlayers(gameType);
  const slots = Math.max(0, maxPlayers - players.length);
  const addable = useAddablePlayers(players.map((p) => p.id));

  const runRemove = useCallback(async () => {
    const target = confirmRemove;
    setConfirmRemove(null);
    if (!target) return;
    setBusy(true);
    try {
      await removePlayerFromRound(roundId, target.id);
      onRosterChanged();
    } catch (error) {
      showToast({ variant: 'error', title: `Couldn't remove ${target.name}`, message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }, [confirmRemove, roundId, onRosterChanged, showToast]);

  const addPending = useCallback(async () => {
    const toAdd = pending;
    setPending([]);
    setPickerVisible(false);
    if (!toAdd.length) return;
    setBusy(true);
    let added = 0;
    for (const player of toAdd) {
      try {
        await addPlayerToRound(roundId, player.id);
        added += 1;
      } catch (error) {
        showToast({ variant: 'error', title: `Couldn't add ${player.name}`, message: errorMessage(error) });
      }
    }
    setBusy(false);
    if (added) onRosterChanged();
  }, [pending, roundId, onRosterChanged, showToast]);

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} height={0.6} title="Players" showCloseButton testID="round-players-sheet">
        <View style={styles.container}>
          {players.map((player) => (
            <View key={player.id} style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={styles.text}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{player.name}</Text>
                {playerTeeNames.get(player.id) ? (
                  <Text style={[styles.tee, { color: colors.textSecondary }]}>{playerTeeNames.get(player.id)}</Text>
                ) : null}
              </View>
              {player.id !== ownerId ? (
                <TouchableOpacity
                  style={styles.remove}
                  onPress={() => setConfirmRemove(player)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${player.name}`}
                >
                  <Icon source="account-remove-outline" size={22} color={colors.error} />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

          {busy ? <ActivityIndicator style={styles.busy} /> : null}

          {slots > 0 ? (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setPickerVisible(true)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Add player"
            >
              <Icon source="account-plus-outline" size={20} color={colors.white} />
              <Text style={{ ...typography.bodyBold, color: colors.white }}>Add player</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </BottomSheet>

      <FriendSelectorBottomSheet
        visible={pickerVisible}
        onClose={() => void addPending()}
        selectedPlayers={pending}
        onSelectionChange={setPending}
        friends={addable.friends}
        friendsLoading={addable.friendsLoading}
        searchQuery={addable.searchQuery}
        onSearchQueryChange={addable.setSearchQuery}
        maxPartners={slots}
        placeholderPlayers={addable.placeholders}
        onAddPlaceholderPress={() => {
          setPickerVisible(false);
          setTimeout(() => setGuestModalVisible(true), 300);
        }}
      />

      <AddPlaceholderModal
        visible={guestModalVisible}
        onClose={() => setGuestModalVisible(false)}
        onPlayerCreated={(created) => {
          setGuestModalVisible(false);
          setPending((prev) => [...prev, { id: created.id, name: created.name, handicap: created.handicap }]);
          setTimeout(() => setPickerVisible(true), 300);
        }}
      />

      <ConfirmationDialog
        visible={confirmRemove !== null}
        title="Remove Player"
        message={confirmRemove ? `Remove ${confirmRemove.name}? Their scores for this round will be deleted.` : ''}
        confirmLabel="Remove"
        confirmVariant="destructive"
        onConfirm={() => void runRemove()}
        onCancel={() => setConfirmRemove(null)}
        icon="account-remove-outline"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  text: { flex: 1, gap: 2 },
  name: { ...typography.body },
  tee: { ...typography.caption },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  busy: { marginVertical: spacing.sm },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
});
```

`index.ts`:

```ts
export { RoundPlayersSheet } from './RoundPlayersSheet';
export type { RoundPlayersSheetProps } from './RoundPlayersSheet';
```

Check: `ConfirmationDialog` prop names against `src/components/common/ConfirmationDialog.tsx`; `AddPlaceholderModal`'s `onPlayerCreated` param type is `Player`; `FriendSelectorBottomSheet` optional props (`selectedTee`, `coursePar`, `handicapSource`) can be omitted. Nested sheets: if two `BottomSheet`s can't be open at once on iOS, close the Players sheet before opening the picker (`onClose()` then reopen after `addPending`) — verify on device in Task 12.

- [ ] **Step 5: Run.** `pnpm test src/components/scorecard/RoundPlayersSheet` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/scorecard/RoundPlayersSheet
git commit -m "feat(scoring): players sheet to add/remove players mid-round

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Wire it into ScorecardEntryScreen

**Files:**
- Modify: `src/screens/scoring/ScorecardEntryScreen/index.tsx`
- Modify: `src/screens/scoring/ScorecardEntryScreen/hooks/useScorecardSubmission.ts` (only if `onDeleted` is needed — otherwise none)
- Test: `src/screens/scoring/ScorecardEntryScreen/ScorecardEntryScreen.roundOptions.test.tsx` (create)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Failing screen tests.** Find the existing ScorecardEntryScreen test harness (`ls src/screens/scoring/ScorecardEntryScreen/*.test.tsx`, e.g. a `.cutoff.test.tsx` or similar) and copy its mock setup. Cases:

```ts
it('owner of a social round sees ⋮ Round options', async () => {
  mockRoundDetails({ user_id: OWNER_ID, competition_id: null });
  renderScreen({ userId: OWNER_ID, competitionId: 'standalone' });
  fireEvent.press(await screen.findByLabelText('Round options'));
  expect(screen.getByText('Holes')).toBeTruthy();
  expect(screen.getByText('Players')).toBeTruthy();
  expect(screen.getByText('Delete round')).toBeTruthy();
});

it('non-owner keeps the direct End round early ⋮', async () => {
  mockRoundDetails({ user_id: OWNER_ID, competition_id: null });
  renderScreen({ userId: OTHER_ID, competitionId: 'standalone' });
  expect(screen.queryByLabelText('Round options')).toBeNull();
});

it('competition rounds never get the menu', async () => {
  mockRoundDetails({ user_id: OWNER_ID, competition_id: 'c1' });
  renderScreen({ userId: OWNER_ID, competitionId: 'c1' });
  expect(screen.queryByLabelText('Round options')).toBeNull();
});
```

- [ ] **Step 2: Run.** → FAIL.

- [ ] **Step 3: Implement the wiring** in `ScorecardEntryScreen/index.tsx`.

Imports:

```ts
import { RoundOptionsSheet, getRoundOptionsRows, type RoundOptionKey } from '@/components/scorecard/RoundOptionsSheet';
import { RoundPlayersSheet } from '@/components/scorecard/RoundPlayersSheet';
import { EditNineTypeSheet } from '@/components/rounds/ViewRound/RoundDetailsTab/sheets';
import { useRoundRosterSync } from '@/hooks/scorecard';
import { sendRoundEvent } from '@/services/rounds/roundRosterChannel';
import { findBackfillGaps, formatHoleRange, isRosterEditableFormat } from '@/utils/roundRoster';
import { isHoleScored } from '@/utils/endRoundEarly';
import { useSkinsGamesByRound } from '@/hooks/skins/queries';
import { useWolfGameByRound } from '@/hooks/wolf/queries';
```

Destructure `refetchMetadata, refetchPlayers` from `useRoundData(...)`.

After `canChangeTees`:

```ts
  const isRoundOwner = isStandaloneRound && !!user?.id && roundDetails?.user_id === user.id;
  const { data: skinsGames } = useSkinsGamesByRound(isStandaloneRound ? roundId : undefined);
  const { data: wolfGame } = useWolfGameByRound(isStandaloneRound ? roundId : undefined);
  const [roundSheet, setRoundSheet] = useState<'options' | 'players' | 'holes' | null>(null);
```

After `endEarly` is defined:

```ts
  const rosterSync = useRoundRosterSync({
    roundId,
    enabled: isStandaloneRound && isInitialized && currentRoundId === roundId,
    isOnline,
    currentUserId: user?.id,
    onExit: (message) => {
      showToast({ variant: 'info', title: message });
      navigation.goBack();
    },
  });

  const handleRosterChanged = useCallback(() => {
    rosterSync.markLocalEdit();
    void refetchPlayers();
    void sendRoundEvent(roundId, 'roster_changed');
  }, [rosterSync, refetchPlayers, roundId]);

  const endEarlyBlockedReason = useMemo(() => {
    if (endEarly.canEndRoundEarly) return null;
    const gap = findBackfillGaps({ holes, nineType, players: currentPlayers, scorecards: groupScorecards })[0];
    return gap ? `Needs scores for ${gap.playerName} on holes ${formatHoleRange(gap.holes)}` : null;
  }, [endEarly.canEndRoundEarly, holes, nineType, currentPlayers, groupScorecards]);

  const anyCardSubmitted = useMemo(
    () => [...groupScorecards.values()].some((c) =>
      c.status === 'completed' || c.status === 'confirmed' || !!c.submittedAt || !!c.submittedBy),
    [groupScorecards]
  );

  const roundOptionRows = useMemo(() => getRoundOptionsRows({
    isOnline,
    courseHoleCount: courseHoleCount,
    isEnded: endEarly.isEnded || playedRange.isEnded,
    anyCardSubmitted,
    rosterEditableFormat: isRosterEditableFormat({
      gameType,
      teamFormat,
      hasSkins: (skinsGames?.length ?? 0) > 0,
      hasWolf: wolfGame != null,
      scoringPairsEnabled: roundDetails?.scoring_pairs_required ?? scoringPairsEnabled,
      isMultiBall,
    }),
    canChangeTees,
    canEndRoundEarly: endEarly.canEndRoundEarly,
    endEarlyBlockedReason,
  }), [isOnline, courseHoleCount, endEarly.isEnded, endEarly.canEndRoundEarly, playedRange.isEnded,
       anyCardSubmitted, gameType, teamFormat, skinsGames, wolfGame, roundDetails?.scoring_pairs_required,
       scoringPairsEnabled, isMultiBall, canChangeTees, endEarlyBlockedReason]);

  const handleRoundOption = useCallback((key: RoundOptionKey) => {
    setRoundSheet(null);
    if (key === 'players') setRoundSheet('players');
    else if (key === 'holes') setRoundSheet('holes');
    else if (key === 'tees') setShowChangeTeesSheet(true);
    else if (key === 'endEarly') endEarly.open();
    else if (key === 'delete') submission.handleDeleteRound();
  }, [endEarly, submission]);

  const scoredHoleNumbers = useMemo(() => {
    const set = new Set<number>();
    for (const card of groupScorecards.values()) {
      for (const [hole, score] of Object.entries(card.scores ?? {})) {
        if (isHoleScored(score)) set.add(Number(hole));
      }
    }
    return [...set];
  }, [groupScorecards]);
```

`courseHoleCount`: use the full course hole count, not the filtered `holes` (a front-9 round still has an 18-hole course). Use `courseHook`-backed data if exposed; otherwise `Math.max(18, ...)` is wrong — add `courseHoleCount` to `useRoundData`'s state from `courseHook.holes.length` (one line in its state builder) and destructure it. `groupScorecards` / `currentRoundId` / `isMultiBall` come from the existing `useScorecardStore` destructure (add them there if missing). `playerTeeNames`: build from `playerTeeMap` (`new Map([...playerTeeMap].map(([id, tee]) => [id, tee.name]))`, falling back to `selectedTeeData?.name`).

On `<RoundHeader>` add:

```tsx
        onMorePress={isRoundOwner ? () => setRoundSheet('options') : undefined}
```

Next to `<ChangeTeesSheet>` add:

```tsx
      {isRoundOwner ? (
        <>
          <RoundOptionsSheet
            visible={roundSheet === 'options'}
            onClose={() => setRoundSheet(null)}
            rows={roundOptionRows}
            onSelect={handleRoundOption}
          />
          <RoundPlayersSheet
            visible={roundSheet === 'players'}
            onClose={() => setRoundSheet(null)}
            roundId={roundId}
            ownerId={user!.id}
            gameType={gameType}
            players={currentPlayers}
            playerTeeNames={playerTeeNames}
            onRosterChanged={handleRosterChanged}
          />
          <EditNineTypeSheet
            visible={roundSheet === 'holes'}
            onDismiss={() => setRoundSheet(null)}
            roundId={roundId}
            currentNineType={nineType}
            holesPlayed={playedRange.holesPlayed}
            scoredHoleNumbers={scoredHoleNumbers}
            beforeReset={async () => {
              rosterSync.markLocalEdit();
              await Promise.all([refetchMetadata(), refetchPlayers()]);
            }}
            onChanged={() => void sendRoundEvent(roundId, 'roster_changed')}
          />
        </>
      ) : null}
```

- [ ] **Step 4: Run** the new screen test and the existing ScorecardEntryScreen tests → PASS.

- [ ] **Step 5: Type-check and lint.**

Run: `pnpm type-check && pnpm lint`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/screens/scoring/ScorecardEntryScreen src/hooks/scorecard/useRoundData.ts
git commit -m "feat(scoring): round options menu on social-round score entry

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Verification, FAQ and handoff

**Files:**
- Modify: `src/constants/app.ts` (FAQ)
- Modify: `docs/guides/SCORING_ARCHITECTURE.md` (roster edits note)
- Modify: `docs/superpowers/plans/2026-10-12-round-options-menu.notes.md`

- [ ] **Step 1: FAQ.** In `FAQ_DATA`, after the "How do I delete a round?" item (id `'14'`), insert and renumber following ids:

```ts
  {
    id: '15',
    question: 'Can I change a round while I\'m playing it?',
    answer:
      'Yes, if you started the round. In score entry tap the ⋮ menu and choose Round options to switch between full 18, front 9 and back 9, add or remove players, change tees, end the round early or delete it. Adding and removing players works for Stableford, Stroke Play and Par rounds without Skins, Wolf or scoring pairs. Removing a player deletes their scores for that round. These changes need an internet connection; anyone else scoring the round sees them automatically.',
    category: 'scoring',
  },
```

Update the "How do I delete a round?" answer to also mention "or from Round options while scoring".

- [ ] **Step 2: Architecture doc.** Add a short "Roster edits mid-round" subsection to `docs/guides/SCORING_ARCHITECTURE.md` listing: `remove_round_player` hard-deletes and why; `reconcileRoster` is the only path that discards a removed player's local writes; `ensureTeamMemberScorecards` doubles as the standalone add path.

- [ ] **Step 3: Full checks.**

Run: `pnpm test --testPathPattern='(golden|services/scoring|utils/(scoring|dailyHandicap|subMatches)|components/scorecard|store/scorecardStore|services/offline|services/scoreMismatch)'`
Run: `pnpm verify:gate`
Expected: both green apart from known baseline flakes (compare to `main`). Record results in the notes file.

- [ ] **Step 4: Manual QA checklist** (append to notes; run on two devices against staging after the migration is applied):
  1. Owner adds a friend mid-round → friend's phone gets "added you to a round"; card appears on owner's and other scorer's phones; End round early shows "Needs scores for <name> on holes 1–N" until back-filled.
  2. Owner removes a player who is also scoring on their own phone → that phone shows "You were removed from this round" and leaves; no "not uploaded" banner anywhere.
  3. Repeat 2 with the removed player's phone offline, then bring it online.
  4. Owner switches full → front 9 while the other phone is on hole 12 → both show front 9; scores 10–12 hidden, not lost.
  5. Owner deletes the round mid-round → other phone shows "This round was deleted"; Undo restores the round with all scores.
  6. Offline: menu rows grey out with "Needs a connection"; End round early still works.
  7. Non-owner: ⋮ opens End round early directly.
  8. Skins/Wolf/scoring-pairs/match-play round: Players row locked "Not available for this format".

- [ ] **Step 5: Commit**

```bash
git add src/constants/app.ts docs/guides/SCORING_ARCHITECTURE.md docs/superpowers/plans/2026-10-12-round-options-menu.notes.md
git commit -m "docs: round options FAQ, scoring architecture note, QA checklist

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Deploy order (do not run without the user's go-ahead):** apply `20261012000000_round_roster_rpcs.sql` to staging → QA → prod → then ship the client (release or OTA). The client relies on the RPCs existing.
