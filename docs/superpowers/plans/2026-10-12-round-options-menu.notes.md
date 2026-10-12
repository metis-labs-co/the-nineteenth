# Round options menu - PR notes

## Blast radius (scoring-impact-analyst, 2026-10-12)

Targets: `src/store/initializeRoundSlice.ts`, `src/store/scorecardStore.ts`.
Classification: shared-math (store slice). No math change, but it changes round membership read by every scoring screen.

- Only current caller of `ensureTeamMemberScorecards`: `useRoundData.ts:553` (team rounds, fire-and-forget, every mount).
- Readers affected by a player disappearing: scoreUpdateSlice (`setPlayerScore` rejects players outside `allowedPlayerIds`), multiBallSlice, endRoundEarlySlice (~71-84 requires every currentPlayer and groupScorecards key in `allowedPlayerIds` when set), `scorecardStore.isHoleComplete`, useRoundData, useGroupFilter, useEndRoundEarly, recoverHydratedScorecards, useLiveScorecardMerge/remoteScorecardMerge, ScorecardEntryScreen (+ hooks), Review screen, watch/useWatchBridge, ChangeTeesSheet.
- Covering tests: `scorecardStore.test.ts`, `scorecardStore.endRoundEarly.test.ts` (only real `ensureTeamMemberScorecards` coverage), `scorecardPersistence.barrier.test.ts`, `remoteScorecardMerge.test.ts`, `endRoundEarlySlice.test.ts`, `hooks/scorecard/useRoundData*.test.tsx` (mock ensure*), `services/offline/*`.
- Shared mock to update: `src/__tests__/mocks/stores/scorecardStore.mock.ts` (add `removePlayerFromRound`).
- Invariants: I12 (which cards count); I4 only for a mid-round add with `holesPlayed` set; I10/I11 indirectly.

### Unprotected behaviours (characterise first)
1. Standalone `ensureTeamMemberScorecards` add, incl. `isStandalone` fallback when the group map is empty (covered by `scorecardStore.roster.test.ts`).
2. Removal must clear `allowedPlayerIds` / `currentPlayers` / `groupScorecards` together from one `get()` snapshot.
3. A removed player must not be resurrected by a later `ensureTeamMemberScorecards` / remote merge unless re-added.
4. Removing a player with scores; removing when only one other player remains.
5. `RoundPersistenceSourceChangedError` path for removal.

Task 1 verify script: deferred to deploy (not run)

## Task 12 verification results (2026-10-12)

- Scoring subset (`pnpm test --testPathPattern='(golden|services/scoring|utils/(scoring|dailyHandicap|subMatches)|components/scorecard|store/scorecardStore|services/offline|services/scoreMismatch)'`): 98 suites passed / 98; 2448 tests passed, 15 skipped, 0 failed; 15 snapshots passed.
- `pnpm verify:gate`: PASSED (type-check, tests green subset 77 suites / 1541 tests, lint on 48 changed files: 0 errors, 3 warnings).
- Lint warnings (all in files this branch touches): `useScorecardSubmission.ts:122` missing dep `holes.length`; `ScorecardEntryScreen/index.tsx:57-58` unused imports `resolvePlayerTee`, `getTeeColor`.
- No failures, so no flake comparison was needed.

## Manual QA checklist (two devices, staging, after the migration is applied)

1. Owner adds a friend mid-round: friend's phone gets "added you to a round"; card appears on owner's and other scorer's phones; End round early shows "Needs scores for <name> on holes 1-N" until back-filled.
2. Owner removes a player who is also scoring on their own phone: that phone shows "You were removed from this round" and leaves; no "not uploaded" banner anywhere.
3. Repeat 2 with the removed player's phone offline, then bring it online.
4. Owner switches full -> front 9 while the other phone is on hole 12: both show front 9; scores 10-12 hidden, not lost.
5. Owner deletes the round mid-round: other phone shows "This round was deleted"; Undo restores the round with all scores.
6. Offline: menu rows grey out with "Needs a connection"; End round early still works.
7. Non-owner: the ⋮ opens End round early directly.
8. Skins/Wolf/scoring-pairs/match-play round: Players row locked "Not available for this format".

## Deploy order (NOT executed; needs the user's go-ahead)

Apply `20261012000000_round_roster_rpcs.sql` to staging -> QA -> prod -> then ship the client (release or OTA). The client relies on the RPCs existing.
