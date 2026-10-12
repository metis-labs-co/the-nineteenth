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
