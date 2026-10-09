# Scoring Architecture & Change-Safety Map

> Read this before editing anything under `src/services/scoring`, the scoring
> Zustand store slices, shared handicap/points/margin utils, or
> `src/components/scorecard`. See also `.claude/agents/scoring-impact-analyst.md`
> and the "Scoring changes" rule in `CLAUDE.md`.

## Layer diagram

```
Cards / screens (PRESENTATIONAL — must NOT re-implement math)
  src/components/scorecard/**, src/screens/scoring/**
        ▼ reads state / calls selectors
Zustand store slices
  src/store/{scorecardStore, scoreUpdateSlice, initializeRoundSlice,
             scorecardPersistence, scorecardSyncDebounce}.ts
        ▼ uses
Shared scoring utils
  src/utils/{scoring, scorecardCalculations, dailyHandicap, competitionPoints,
             matchMargin, subMatches, teamHandicap, leaderboardHandicaps,
             multiBallScorecard, handicapDifferential}.ts
  src/services/scoring/utils/{handicapUtils, leaderboardUtils, netScoreUtils}.ts
  src/hooks/player/playingHandicap.ts
        ▼ composed by
Scoring engines / orchestrator (CANONICAL MATH)
  src/services/scoring/ScoringOrchestrator.ts
  src/services/scoring/engines/{MatchPlay, Par, Stableford, StrokePlay, TeamScoring}Engine.ts
```

**Core rule:** scoring math lives in engines + shared utils. Cards are
presentational. If a card needs a number, it comes from a util/selector — never
a formula re-implemented inline.

> **Verified gap:** as of this writing, `ScoringOrchestrator` and
> `services/scoring/engines/*` have **no external (non-test) consumers** — see
> the `engines/*` row in the blast-radius table below. The app's live scoring
> and finalize paths call `src/utils/scoring.ts`, `src/services/rounds/*`, and
> `src/utils/teamScoring/*` directly. The engines exist today mainly as a
> parity check (`MatchPlayEngine.matchParity.test.ts`) that the two call sites
> (display path and engine) agree. Treat the layer diagram's "composed by"
> arrow as aspirational/parity-checked, not as the sole live path, until the
> engines are wired into the app.

## Component inventory

| Card / view | Format(s) served | Screen(s) | Key shared deps |
|---|---|---|---|
| `PlayerScoreCard` (`components/scorecard/PlayerScoreCard/PlayerScoreCard.tsx`, re-exported via the top-level `PlayerScoreCard.tsx` shim) | stroke/stableford solo + multi-ball entry | `ScorecardEntryScreen` (`ScorecardScoreContent`) | `utils/scoring` (`getStrokesOnHole`, `calculateStablefordPointsNet` via `usePlayerScoreCardLogic.ts`), `constants/scoring` (`PICKUP_SCORE`) |
| `TeamScoreCard` (`components/scorecard/TeamScoreCard/TeamScoreCard.tsx`; no separate top-level impl — `TeamScoreCard.tsx` at the root does not exist, only `.stories`/`.test` files resolving to the directory) | scramble/ambrose team single-score entry | `ScorecardEntryScreen` (`ScorecardScoreContent`) | `utils/teamScoring` (`ShotSlot` type), `useTeamScoreControls` hook (handicap math is computed upstream and passed in as props, not imported here) |
| `AltShotScoreCard` | foursomes alt-shot (combined + split), one-ball entry | `ScorecardEntryScreen` (`ScorecardScoreContent`) | `utils/teamScoring` (`altShotTeePlayer`, `deriveAltShotShotCounts`), `utils/teamScoring/altShot` (`calculateAltShotTeamHandicap`), reuses `TeamScoreCard/hooks/useTeamScoreControls`. **Does NOT import `utils/subMatches`** — contribution/shot-count derivation lives in `utils/teamScoring`, not `subMatches` (see note on the `subMatches.ts` row below) |
| `StrokePlayScoreCard` | stroke play solo entry | `ScorecardEntryScreen` (`ScorecardScoreContent`) | `utils/scoring` (`getStrokesOnHole`, `calculateNetScore`, `getScoreDescription`, `calculateParScore`) |
| `MatchPlayScorecardTable` (`components/scorecard/MatchPlayScorecardTable/`) | singles match play review table | `ReviewScorecardScreen` (`MatchScorecardTabContent`, `MatchPlayLeaderboardTab`), `MatchPlayScorecardScreen`, `ViewRoundScreen` `MatchTab`; also reused internally by `TeamMatchPlayScorecardTable` | `utils/scoring` (`getMatchPlayStrokes`, via `MatchPlayScorecardTable/utils.ts`) |
| `TeamMatchPlayScorecardTable` | four-ball match play **review** table (read-only, reuses `MatchPlayScorecardTable`'s row components) | `ReviewScorecardScreen` (`MatchScorecardTabContent`, `MatchPlayLeaderboardTab`) | `utils/scoring` (`getFourBallStrokes`, via `TeamMatchPlayScorecardTable/utils.ts`) |
| `ScrambleScorecardTable` | scramble/ambrose review table | `ReviewScorecardScreen` (`ScorecardTabContent`), `ViewRoundScreen` (`ScrambleTeamScoreTab`) | `utils/scoring` (`getStrokesOnHole`, `calculateStablefordPoints`) — NOT `calculateScrambleTeamHandicap` (that function is consumed by `useViewRoundScramble.ts` / `ScrambleTeamLeaderboard.tsx`, not by this table itself) |
| `RingerScorecard` (`components/competitions/ringer/RingerScorecard.tsx`) | ringer/eclectic composite card | `RingerBoard` (Competition Breakdown) | `utils/ringer` (`RingerEntry` type only — presentational; the math is computed upstream in `utils/ringer/computeRingerBoard.ts`, which itself imports `utils/scoring`) |
| `QuickScorecardView` | quick hole-navigation strip (status indicators, all formats) | `PlayerScorecardScreen`, `ScorecardEntryScreen` | none of the shared scoring-calc utils — `constants/scoring` (`PICKUP_SCORE`), `utils/holeTransformers` (`displayHoleNumber`); purely presentational, consumes precomputed scores |
| `EclecticScorecardView` (`components/leagues/EclecticScorecardView.tsx`) | league eclectic composite card | `LeagueDetailScreen` (`MyCardTab`) | `utils/scoring` (`getScoreColor`) — NOT `leaderboardHandicaps` |
| `BestBallScoreView` *(added — not in original seed)* | best-ball team format live entry | `ScorecardEntryScreen` (`ScorecardScoreContent`) | `utils/scoring` (`getStrokesOnHole`, `calculateNetScore`, `calculateStablefordPoints`), `constants/scoring` (`PICKUP_SCORE`) |
| `TeamMatchPlayScoreView` *(added — not in original seed)* | four-ball match play **live entry** (side-by-side team score buttons) — distinct from the read-only `TeamMatchPlayScorecardTable` above | `ScorecardEntryScreen` (`ScorecardScoreContent`) | `TeamMatchPlayScoringScreen/utils/teamMatchPlayCalculations` (`calculateTeamMatchStatus`, `countHolesWon` — status against the planned `totalHoles` prop), `utils/matchMargin` (`compactMatchMargin`), `constants/scoring` (`PICKUP_SCORE`), `types/database` (`isSingleBallScore`); match-strokes math resolved upstream and passed in as props |
| `ScorecardTableBallsAsPlayers` *(added — not in original seed)* | multi-ball (solo player carrying 2 balls) review table, one card per ball | `PlayerScorecardScreen` (`ScorecardTable`), `ReviewScorecardScreen` (`ScorecardTabContent`) | `utils/scoring` (`getScoreColor`), `utils/multiBallScorecard` (`MultiBallHoleRowData`, `MultiBallStats` types) |
| `TeamScoreCard` (`components/scorecard/ContributionLeaderboard/TeamScoreCard.tsx`) *(added — not in original seed; name collision with the entry-card `TeamScoreCard` above)* | Shamble **leaderboard summary** card (to-par banner, gross/net/stableford totals) — NOT a score-entry component | `ContributionLeaderboard` (rendered from `ReviewScorecardScreen`'s `ContributionsTabContent`, `ViewRoundScreen`'s `ShambleTeamScoresTab` and `ScrambleContributionsTab`) | none directly — consumes a pre-computed `TeamScoreSummary` prop from `useContributionData` |
| `EndRoundEarlySheet` (`components/scorecard/EndRoundEarlySheet/`) | "End round early" confirmation (inline bottom sheet) — all formats, social rounds only | `ScorecardEntryScreen`, `MatchPlayScoringScreen`, `TeamMatchPlayScoringScreen` (via `hooks/scorecard/useEndRoundEarly`) | none — presentational; the plan and result preview come from `utils/endRoundEarly` (`planEndRoundEarly`, `describeEndRoundEarlyResult`) |
| `EndedEarlyBanner` (`components/scorecard/EndedEarlyBanner.tsx`) | "Ended after N of M", plus **Finish** on the scoring screens | the three scoring screens, `ReviewScorecardScreen`, `MatchPlayScorecardScreen` | `utils/roundShape` (`formatEndedEarlyLabel`) — presentational |

> Note on duplicate filenames: `src/components/scorecard/PlayerScoreCard.tsx` is
> an intentional backward-compatibility re-export shim for
> `PlayerScoreCard/PlayerScoreCard.tsx` (not a second implementation). There is
> also an unrelated, screen-local `PlayerScoreCard` at
> `src/screens/scoring/MatchPlayScoringScreen/components/PlayerScoreCard.tsx`
> (different component, same name, not part of `components/scorecard/`).

## Blast-radius table

For each shared module, "if you change this, re-run the tests for and re-check
these consumers." (Consumer lists produced by the Step-1 greps — pasted below.)

| Shared module | Owns invariant(s) | Consumers (non-test) | Locking test |
|---|---|---|---|
| `utils/scoring.ts` | match-play strokes, four-ball strokes, pickup=NDB, net score, stableford net | `src/components/leagues/EclecticScorecardView.tsx`, `src/components/rounds/ViewRound/RoundScorecardTab.tsx`, `src/components/scorecard/BestBallScoreView.tsx`, `src/components/scorecard/MatchPlayScorecardTable/utils.ts`, `src/components/scorecard/MultiBallScoreInput.tsx`, `src/components/scorecard/ParLeaderboardFull/ParLeaderboardFull.tsx`, `src/components/scorecard/PlayerScoreCard/usePlayerScoreCardLogic.ts`, `src/components/scorecard/ScorecardTable/cells/ScrollableCells.tsx`, `src/components/scorecard/ScorecardTable/cells/SoloStatsCells.tsx`, `src/components/scorecard/ScorecardTableBallsAsPlayers.tsx`, `src/components/scorecard/ScoreIndicator.tsx`, `src/components/scorecard/ScrambleScorecardTable.tsx`, `src/components/scorecard/StablefordLeaderboardFull/StablefordLeaderboardFull.tsx`, `src/components/scorecard/StrokePlayLeaderboard/StrokePlayLeaderboard.tsx`, `src/components/scorecard/StrokePlayLeaderboardFull/StrokePlayLeaderboardFull.tsx`, `src/components/scorecard/StrokePlayScoreCard/StrokePlayScoreCard.tsx`, `src/components/scorecard/TeamMatchPlayScorecardTable/utils.ts`, `src/components/scorecard/TeamScoreCard/hooks/useTeamScoreControls.ts`, `src/hooks/competitionStatistics/netScore.ts`, `src/hooks/scorecard/useMatchPlayScoring.ts`, `src/screens/leagues/LeagueQuickAddRoundScreen/useLeagueQuickAddRound.ts`, `src/screens/rounds/RoundListScreen/hooks/useRoundList.ts`, `src/screens/rounds/ViewRoundScreen/tabs/StatsTab.tsx`, `src/screens/rounds/ViewRoundScreen/tabs/SubMatchesTab.tsx`, `src/screens/scoring/MatchPlayScoringScreen/index.tsx`, `src/screens/scoring/PlayerScorecardScreen/hooks/usePlayerScorecard.ts`, `src/screens/scoring/QuickScoreEntryScreen/QuickScoreHoleRow.tsx`, `src/screens/scoring/QuickScoreEntryScreen/useQuickScoreEntry.ts`, `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts`, `src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx`, `src/screens/scoring/TeamMatchPlayScoringScreen/hooks/useTeamMatchPlayScores.ts`, `src/services/handicap/recalculateScorecardDifferential.ts`, `src/services/offline/sync/scorecardSync.ts`, `src/services/rounds/finalizePairResults.ts`, `src/services/rounds/finalizeTeamMatchPlayRound.ts`, `src/services/rounds/pairPointsCalculation.ts`, `src/services/scoreMismatch/resolution.ts`, `src/services/scoring/engines/MatchPlayEngine.ts`, `src/services/scoring/engines/ParEngine.ts`, `src/services/scoring/utils/handicapUtils.ts`, `src/services/scoring/utils/netScoreUtils.ts`, `src/store/multiBallSlice.ts`, `src/store/utils/scorecardCalculations.ts`, `src/utils/contributions/computeContributions.ts`, `src/utils/multiBallScorecard.ts`, `src/utils/ringer/computeRingerBoard.ts`, `src/utils/skins/scores.ts`, `src/utils/skins/teamScores.ts`, `src/utils/teamScoring/calculations.ts`, `src/utils/teamScoring/matchPlay.ts`, `src/utils/wolf/scoring.ts` | `utils/scoring.test.ts`, `utils/scoring.golden.test.ts` |
| `utils/dailyHandicap.ts` | nine-aware daily handicap | `src/components/common/FriendSelector/FriendListItem.tsx`, `src/components/common/FriendSelector/PlaceholderListItem.tsx`, `src/components/common/TeeSelector/TeeSelectorList.tsx`, `src/components/pairings/PlayerGroupCard.tsx`, `src/components/scorecard/ScorecardTable/cells/ScrollableCells.tsx`, `src/hooks/player/playingHandicap.ts`, `src/hooks/scorecard/useQuickScoreSubmit.ts`, `src/screens/leagues/LeagueQuickAddRoundScreen/useLeagueQuickAddRound.ts`, `src/screens/rounds/CreateRoundBottomSheet/steps/BallCountStep.tsx`, `src/screens/rounds/CreateRoundBottomSheet/steps/ScoringSetupStep/HandicapSourceSection.tsx`, `src/screens/rounds/CreateRoundBottomSheet/steps/YourSetupStep.tsx`, `src/screens/scoring/PlayerScorecardScreen/hooks/usePlayerScorecard.ts`, `src/screens/scoring/QuickScoreEntryScreen/useQuickScoreEntry.ts`, `src/services/handicap/combineHandicapRounds.ts`, `src/services/handicap/recalculateScorecardDifferential.ts`, `src/services/offline/sync/scorecardSync.ts`, `src/services/scoring/utils/handicapUtils.ts`, `src/store/utils/scorecardCalculations.ts` | `utils/dailyHandicap.golden.test.ts` |
| `utils/subMatches.ts` | user↔sub-match resolution for alt-shot/split display (exports only `resolveSubMatchForUser`) | `src/screens/scoring/MatchPlayScoringScreen/index.tsx` (single consumer) | `src/__tests__/services/rounds/altShotSplit.golden.test.ts` (locks the split math in `services/rounds/pairPointsCalculation.ts`, not `subMatches.ts` itself — see caveat below) |
| `utils/teamHandicap.ts` | team stroke allocation (average-team-handicap display) | `src/components/leaderboard/MatchPlayLeaderboard.tsx`, `src/components/leaderboard/TeamLeaderboardView.tsx` | _characterization_ |
| `utils/competitionPoints.ts` | per-round points | `src/components/competitions/detail/sections/PointsConfigSection.tsx`, `src/components/competitions/detail/sections/SettingsSection.tsx`, `src/components/competitions/detail/sections/sheets/EditCompetitionRulesSheet.tsx`, `src/components/leaderboard/LeaderboardTab.tsx`, `src/hooks/competitions/leaderboard.ts`, `src/services/competitions/winnerService.ts`, `src/services/rounds/roundResultsService.ts` | _characterization_ |
| `screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations.ts` (`calculateMatchStatus`), `screens/scoring/TeamMatchPlayScoringScreen/utils/teamMatchPlayCalculations.ts` (`calculateTeamMatchStatus`), `utils/matchMargin.ts` (`compactMatchMargin`), `utils/matchPlayResult.ts` (`computeStandaloneMatchResult` — round-list pill) | I10 | `src/hooks/scorecard/useMatchPlayScoring.ts`, `src/screens/scoring/TeamMatchPlayScoringScreen/hooks/useTeamMatchPlayState.ts`, `src/components/scorecard/MatchPlayScorecardTable/utils.ts`, `src/components/scorecard/TeamMatchPlayScorecardTable/utils.ts`, `src/components/scorecard/TeamMatchPlayScoreView.tsx`, `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts`, `src/services/rounds/finalizeTeamMatchPlayRound.ts` (persists `final_margin`) | `MatchPlayScoringScreen/utils/matchPlayCalculations.test.ts`, `TeamMatchPlayScoringScreen/utils/teamMatchPlayCalculations.test.ts`, `src/__tests__/integration/matchPlayScorecard.test.ts` |
| `engines/*` (`ScoringOrchestrator.ts`, `engines/{MatchPlay,Par,Stableford,StrokePlay,TeamScoring}Engine.ts`) | per-format leaderboard (intended canonical math; not yet the live path) | **none** — no file outside `src/services/scoring/**` imports the barrel (`@/services/scoring`), `ScoringOrchestrator`, or any individual engine. `src/hooks/player/playingHandicap.ts` imports only `services/scoring/utils/handicapUtils` (a sibling utils module used *by* the engines internally, not the engines themselves). Live leaderboard/finalize logic runs through `utils/scoring.ts` + `services/rounds/*` instead (see that row) | `src/__tests__/services/scoring/MatchPlayEngine.test.ts`, `src/__tests__/services/scoring/ParEngine.test.ts`, `src/__tests__/services/scoring/StablefordEngine.test.ts`, `src/__tests__/services/scoring/TeamScoringEngine.test.ts`, plus `src/services/scoring/engines/MatchPlayEngine.matchParity.test.ts` (a parity check confirming the engine agrees with the display-path calculation). **`StrokePlayEngine.ts` is the only engine with NO dedicated test file** — flag as unprotected if you touch it. |
| `utils/holeTransformers.ts` (`filterPlayableHoles`) | planned vs played holes | `src/components/rounds/ViewRound/RoundScorecardTab.tsx`, `src/components/scorecard/MatchPlayScorecardTable/index.tsx`, `src/components/scorecard/MatchPlayScorecardTable/utils.ts`, `src/components/scorecard/ScorecardTable/ScorecardTable.tsx`, `src/components/scorecard/TeamMatchPlayScorecardTable/index.tsx`, `src/components/scorecard/TeamMatchPlayScorecardTable/utils.ts`, `src/hooks/scorecard/useEndRoundEarly.ts`, `src/hooks/scorecard/usePlayedHoleRange.ts`, `src/hooks/scorecard/useQuickScoreSubmit.ts`, `src/screens/rounds/ViewRoundScreen/tabs/StatsTab.tsx`, `src/screens/rounds/ViewRoundScreen/viewRoundHoles.ts`, `src/screens/scoring/MatchPlayScorecardScreen/index.tsx`, `src/screens/scoring/PlayerScorecardScreen/hooks/usePlayerScorecard.ts`, `src/screens/scoring/QuickScoreEntryScreen/useQuickScoreEntry.ts`, `src/screens/scoring/ReviewScorecardScreen/components/ScorecardTabContent.tsx`, `src/screens/scoring/ReviewScorecardScreen/hooks/useScoreReview.ts`, `src/services/handicap/recalculateScorecardDifferential.ts`, `src/services/offline/sync/scorecardSync.ts`, `src/services/rounds/roundScoringContext.ts`, `src/services/scoreMismatch/resolution.ts`, `src/store/endRoundEarlySlice.ts`, `src/store/initializeRoundSlice.ts`, `src/store/scorecardStore.ts`, `src/utils/matchPlayResult.ts`, `src/utils/roundShape.ts`, `src/utils/scorecardCalculations.ts`, `src/watch/useWatchBridge.ts` | `src/utils/holeTransformers.test.ts` |
| `utils/roundShape.ts` | server/local shape and label | `src/components/activity/ActivityRoundCard.tsx`, `src/components/rounds/RoundListCard/RoundListCard.tsx`, `src/components/rounds/ViewRound/RoundDetailsTab/index.tsx`, `src/components/scorecard/EndedEarlyBanner.tsx`, `src/hooks/player/handicapHistory.ts`, `src/hooks/playerStatistics/courseQueries.ts`, `src/hooks/playerStatistics/queries.ts`, `src/hooks/playerStatistics/recentRounds.ts`, `src/hooks/scorecard/useMatchPlayData.ts`, `src/hooks/scorecard/usePlayedHoleRange.ts`, `src/hooks/scorecard/useRoundData.ts`, `src/hooks/scorecard/useRoundMetadata.ts`, `src/screens/rounds/RoundListScreen/hooks/roundListMeta.ts`, `src/screens/rounds/RoundListScreen/hooks/useRoundFilters.ts`, `src/screens/rounds/RoundSettingsScreen.tsx`, `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundHandlers.ts`, `src/screens/scoring/MatchPlayScorecardScreen/index.tsx`, `src/screens/scoring/MatchPlayScoringScreen/components/MatchPlayFooter.tsx`, `src/screens/scoring/MatchPlayScoringScreen/index.tsx`, `src/screens/scoring/PlayerScorecardScreen/index.tsx`, `src/screens/scoring/ReviewScorecardScreen/components/PayoutsTabContent.tsx`, `src/screens/scoring/ReviewScorecardScreen/index.tsx`, `src/screens/scoring/ScorecardEntryScreen/index.tsx`, `src/screens/scoring/TeamMatchPlayScoringScreen/components/TeamMatchPlayFooter.tsx`, `src/screens/scoring/TeamMatchPlayScoringScreen/hooks/useTeamMatchPlayNavigation.ts`, `src/screens/scoring/TeamMatchPlayScoringScreen/index.tsx`, `src/screens/scoring/TeamMatchPlayScoringScreen/utils/matchHoles.ts`, `src/services/api/leagues/queries.ts`, `src/services/api/partnershipLeagues.ts`, `src/services/handicap/combineHandicapRounds.ts`, `src/services/handicap/loadCombinedAndPairs.ts`, `src/services/handicap/updatePlayerHandicapIndex.ts`, `src/services/offline/sync/scorecardSync.ts`, `src/services/scoreMismatch/resolution.ts`, `src/store/endRoundEarlySlice.ts`, `src/store/initializeRoundSlice.ts`, `src/store/multiBallSlice.ts`, `src/store/scoreUpdateSlice.ts`, `src/store/scorecardStore.ts`, `src/utils/endRoundEarly.ts`, `src/utils/scorecardCalculations.ts` | `src/utils/roundShape.test.ts` |
| `utils/endRoundEarly.ts` | leading complete holes, removals and result preview | `src/components/scorecard/EndRoundEarlySheet/index.tsx`, `src/hooks/scorecard/useEndRoundEarly.ts` | `src/utils/endRoundEarly.test.ts` |
| `utils/handicapEligibility.ts` | I12 client gate | `src/hooks/player/handicapHistory.ts`, `src/hooks/scorecard/useQuickScoreSubmit.ts`, `src/screens/leagues/LeagueQuickAddRoundScreen/useLeagueQuickAddRound.ts`, `src/screens/scoring/QuickScoreEntryScreen/useQuickScoreEntry.ts`, `src/services/handicap/combineHandicapRounds.ts`, `src/services/handicap/loadCombinedAndPairs.ts`, `src/services/handicap/recalculateScorecardDifferential.ts`, `src/services/handicap/updatePlayerHandicapIndex.ts`, `src/services/offline/sync/scorecardSync.ts` | `src/utils/handicapEligibility.test.ts`, `src/__tests__/services/offline/calculateHandicapData.test.ts`, `src/__tests__/services/handicap/recalculateScorecardDifferential.test.ts` |
| `utils/matchPlayResult.ts` | I10 round-list result | `src/screens/rounds/RoundListScreen/hooks/useRoundList.ts` | `src/__tests__/utils/matchPlayResult.test.ts` |
| `utils/matchMargin.ts` (`compactMatchMargin`) | compact margin tokens | `src/components/scorecard/TeamMatchPlayScoreView.tsx`, `src/screens/scoring/ReviewScorecardScreen/components/MatchPlayLeaderboardTab.tsx`, `src/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard.ts`, `src/utils/endRoundEarly.ts` | `src/__tests__/utils/matchMargin.test.ts` |
| `utils/skins/payouts.ts` + `utils/skins/holeCounts.ts` | I11 | `src/components/rounds/ViewRound/RoundDetailsTab/components/useSkinsGameState.ts`, `src/hooks/skins/mutations.ts`, `src/hooks/skins/queries.ts`, `src/screens/scoring/ReviewScorecardScreen/index.tsx`, `src/services/skins/finalizeForSubMatch.ts`, `src/services/skins/finalizeSkinsGame.ts`, `src/services/skins/roundHoleCounts.ts`, `src/utils/index.ts` | `src/__tests__/utils/skinsCalculations.test.ts`, `src/utils/skins/holeCounts.test.ts` |
| `utils/scorecardCalculations.ts` | played display totals and net | `src/components/rounds/ViewRound/RoundPlayersTab.tsx`, `src/components/rounds/ViewRound/RoundScorecardTab.tsx`, `src/components/scorecard/ScorecardTable/ScorecardTable.tsx`, `src/hooks/home/useInProgressRounds.ts`, `src/hooks/scorecard/useEndRoundEarly.ts`, `src/screens/rounds/RoundListScreen/hooks/useRoundList.ts`, `src/screens/scoring/QuickScoreEntryScreen/useQuickScoreEntry.ts`, `src/screens/scoring/ReviewScorecardScreen/components/ScorecardTabContent.tsx`, `src/services/offline/sync/scorecardSync.ts`, `src/services/scoreMismatch/resolution.ts` | `src/utils/scorecardCalculations.test.ts`, `src/__tests__/utils/scorecardCalculations.test.ts`, `components/scorecard/*LeaderboardFull/*.parity.test.tsx` |

> **Real subMatches.ts vs. seeded "alt-shot split differential" ownership:**
> `utils/subMatches.ts` exports only `resolveSubMatchForUser` (which sub-match a
> given user belongs to, for the live match-play screen). The alt-shot **split**
> differential-total-net calculation itself lives in
> `resolveAltShotSubMatchOutcome` in
> `src/services/rounds/pairPointsCalculation.ts` (also consumed by
> `src/services/rounds/finalizePairResults.ts`), not in `utils/subMatches.ts`.
> The I5 golden test is `src/__tests__/services/rounds/altShotSplit.golden.test.ts` —
> see `docs/guides/scoring-invariant-coverage.md` (Task 2).

## Per-format invariants

Each row is a behavioural contract. **File** owns it; **Test** locks it.

| # | Invariant | File | Test |
|---|---|---|---|
| I1 | Singles match play uses the **difference method** (`getMatchPlayStrokes`): only the higher-handicap player gets strokes, equal to `getStrokesReceived(\|hcpA−hcpB\|, SI)`. | `utils/scoring.ts` | `utils/scoring.golden.test.ts` |
| I2 | Four-ball match play allocates strokes **relative to the lowest handicap in the match** (`getFourBallStrokes`); tied-lowest get 0. | `utils/scoring.ts` | `utils/scoring.golden.test.ts` |
| I3 | Pickups (`isPickupScore`, strokes ≥ PICKUP_SCORE) count as **net double bogey** everywhere (`getEffectiveGrossStrokes` = par + 2 + strokesReceived). | `utils/scoring.ts` | `utils/scoring.golden.test.ts` |
| I4 | 9-hole daily handicap is **nine-aware** (`calculateNineAwareDailyHandicap`) — must not inflate toward an 18-hole value. GA/WHS 9-hole formula: `(((HI ÷ 2) × 9-hole Slope ÷ 113) + (9-hole CR − 9-hole Par)) × 0.93 × CF`. Without dedicated 9-hole ratings it uses the 18-hole slope and CR ÷ 2 (= unrounded 18-hole DH ÷ 2), **rounded once** — never round-then-halve. The scoring store (`calculatePlayerTotals`, given `nineType`) and the sync path both go through this helper. | `utils/dailyHandicap.ts` | `utils/dailyHandicap.golden.test.ts`, `src/__tests__/utils/dailyHandicap.test.ts`, `store/utils/scorecardCalculations.test.ts` (store == sync parity), `src/__tests__/services/offline/calculateHandicapData.test.ts` |
| I5 | Alt-shot **split** = differential total-net across the pair. | `services/rounds/pairPointsCalculation.ts` (`resolveAltShotSubMatchOutcome`) | `src/__tests__/services/rounds/altShotSplit.golden.test.ts` |
| I6 | Alt-shot **combined** = own 50% handicap, net-lowest scoring. | (finalize service) | characterization (Task 3) |
| I7 | Stableford/Par leaderboards + best-ball header score off the **round daily handicap**. | engines + `leaderboardHandicaps.ts` | `src/__tests__/services/scoring/StablefordEngine.test.ts` |
| I8 | A Score Differential is computed from the **WHS Adjusted Gross Score** — every hole capped at `par + 2 + strokesReceived` via `calculateAdjustedGrossScore`, never the raw total gross. All seven differential call sites must agree. | `utils/adjustedGross.ts` | `utils/adjustedGross.test.ts`, `src/__tests__/services/offline/calculateHandicapData.test.ts` |
| I9 | GA CONNECT's `stablefordScore` uses the **uncapped Rule 21.1 table** (`2 + (par − net)`, floored at 0). The app's display tables clamp at 5 (`getStablefordPoints`) and 4 (`calculateStablefordPoints`) and must NOT be reused for it. | `utils/handicappingScore.ts` | `utils/handicappingScore.test.ts` |
| I10 | A match with **no holes remaining** is won "N up" (compact "N UP") or halved "All Square" ("A/S") — never "N & 0" / "N&0". "N & M" is only a close-out with M ≥ 1 holes still to play. Applies to singles, team match play and every display row built on them.  **Ended early:** a real close-out against planned holes stands; otherwise the final lead after `holesPlayed` decided holes wins, level = All Square. | `MatchPlayScoringScreen/utils/matchPlayCalculations.ts`, `TeamMatchPlayScoringScreen/utils/teamMatchPlayCalculations.ts`, `utils/matchPlayResult.ts` (`computeStandaloneMatchResult` — round-list pill) | `MatchPlayScoringScreen/utils/matchPlayCalculations.test.ts`, `TeamMatchPlayScoringScreen/utils/teamMatchPlayCalculations.test.ts`, `src/__tests__/utils/matchPlayResult.test.ts` |
| I11 | **Skins are priced on the planned holes and settled on the holes played.** Hole values use the planned hole count (`getHoleCount(nine_type)`, never a default 18). The settlement buy-in is `calculatePlayedPot(game, holeCounts) / participants`: `calculateTotalPot(type, value, planned)` for a complete round, and the rounded per-hole price × holes played for an ended-early one (so winnings sum to it exactly). Individual skins settlement is **zero-sum within cent rounding** (at most ½¢ per hole plus ½¢ per participant) for complete, 9-hole and ended-early rounds; a carryover on the last played hole is split. Every settlement path reads `fetchSkinsHoleCounts(roundId)`; completed games are displayed from the stored `skins_payouts`. Team skins settlement is a known pre-existing gap. | `utils/skins/payouts.ts`, `utils/skins/holeCounts.ts`, `services/skins/roundHoleCounts.ts`, `services/skins/finalizeSkinsGame.ts` | `src/__tests__/utils/skinsCalculations.test.ts`, `src/utils/skins/holeCounts.test.ts`, `src/__tests__/services/skins/roundHoleCounts.test.ts`, `src/__tests__/services/skins/finalizeSkinsGame.test.ts` |
| I12 | **Only full scorecards count toward the social handicap index.** A card earns a differential only when `isCompleteForHandicap(scores, nineType)` holds — every hole of `getHoleRange(nineType)` has strokes > 0 (a pickup counts) — **and** its round has no `holes_played`. Planned holes come from the nine type, never a hole list. A card with no per-hole data (`{}` / null: legacy imports, multi-ball) keeps the gross-only rule unless its round has `holes_played`. Enforced on the client (the seven I8 sites, `recalculateScorecardDifferential` — which writes `null`, never throws — combine validation, combinable pairs, and the index / history / recalc-candidate queries) **and** on the server (triggers `scorecards_full_card_differential` and `handicap_combined_rounds_full_cards`, via the shared helper `scorecard_eligible_for_differential` = no `holes_played` and `scorecard_is_complete_for_handicap`). | `utils/handicapEligibility.ts`; `supabase/migrations/20261007000100_full_scorecards_only_handicap.sql` + `20261007000200_end_round_early.sql` | `src/utils/handicapEligibility.test.ts`, `src/__tests__/services/offline/calculateHandicapData.test.ts`, `src/__tests__/services/handicap/*.test.ts` (incl. `*.endedEarly.test.ts`), `supabase/tests/full_scorecards_only_handicap.verify.sql` |

> This is the seed set. During Task 2/3, verify each against code and add any
> missing invariant you encounter. An invariant with no locking test is
> unprotected — flag it. (Verified for this task: `getMatchPlayStrokes`,
> `getFourBallStrokes`, `isPickupScore`, `getEffectiveGrossStrokes` all exist in
> `src/utils/scoring.ts`, and `calculateNineAwareDailyHandicap` exists in
> `src/utils/dailyHandicap.ts`. None of the `*.golden.test.ts` files referenced
> above exist yet — they are the deliverables of Task 2/3, not files created by
> this task. I5's file attribution has a caveat — see the note under the
> blast-radius table above.)

## Ended-early rounds (social rounds only)

A standalone, in-progress round can end after its leading complete holes.
Ending is final: no Resume and no conversion of 9 played holes into a front
nine. `rounds.holes_played` is a count from the round's first physical hole;
back9 with N6 means holes 10–15. NULL means played as planned. Locally every
card carries the marker and its proven calculation basis in SQLite.
`resolveRoundShape` prefers a valid positive server marker, then the local
marker; server NULL never clears a local final end.

### Eligibility and confirmation

`useEndRoundEarly` offers the action only for a standalone in-progress round
with no existing end, no scoring pairs, no submitted/confirmed local cards,
and every player assigned to this device (`allowedPlayerIds` empty or covering
all current players). `planEndRoundEarly` requires a contiguous leading
prefix complete for every player and fewer than all planned holes. Strokes >0
count, including pickups and any scored multi-ball ball. Missing physical
course-hole numbers stop the prefix. The sheet previews removed scores and
the existing format result; multi-ball omits a result preview. A handicap
round gets the R22 warning that ending makes it a practice round.

One non-reentrant `withRoundScoringWrite(roundId, operation)` coordinator
(`services/rounds/roundScoringCoordinator.ts`) covers the complete confirmation.
The hook's internal `captureRoundEndEarlyOperation` retains original owner,
private store session, source epoch, opening/route and plan proof. Online it
calls `applyEndRoundEarly` before the held local finish; offline or network
failure takes the same local finish. Every normal server-backed local finish
commits marker, later-hole removals, tee/nine/frozen basis and the owned
`round:<id>:end_early` intent in one native exclusive transaction. There is no
separate post-local enqueue. Drain is requested immediately after commit,
before postcommit checks can fail. Online success leaves intent acknowledgment
to the queued consumer. Same-owner/same-N existing work, including failed
recovery state, is preserved; incompatible or foreign work refuses. A
marker-only cache cannot create an intent for a later account.

An actual end-RPC `P0002` alone permits the captured no-new-intent local finish
and strict cleanup of an originally captured matching owned intent. A failed
shape read never implies deletion. A differing-N conflict uses the shared
held authoritative adoption service, including CURRENT submitted cards; repair
does not rerun user-end eligibility. Unknown shape or failed repair stays
blocked. The eight-second RPC/read deadline bounds the caller wait, but a
request whose abort is ignored can still settle later.

### Local persistence and authoritative adoption

`roundPersistenceBarrier.ts` separates source epoch, authenticated ownership
and private session. Marker transitions close local admission, drain whole
admitted save/queue chains, commit repair, advance epoch, apply guarded CURRENT
memory and reopen in finally. No local lease spans network or coordinator
waiting. An old captured source cannot acquire fresh proof to replay scores;
prepared hydration/backfill restarts, live edits reread current cards and
submission preserves completion intent over current scores.

`roundScoringAdoption.ts` owns `adoptAuthoritativeRoundShape`, the already-held
`adoptRoundShapeWithinScoringWrite`, and initialization repair. It repairs SQLite,
pending/failed queue payloads and guarded CURRENT memory with the same context
adapter, even for closed/submitted rounds. Prior local and authoritative masks
intersect: local N6 → server N8 never resurrects discarded holes 7–8. It
preserves retained edits, terminal metadata and monotonic accepted revisions.
`roundScoringContext.ts` reconstructs from compatible recorded tee, HI/source,
gender, planned holes/par and game/nine metadata. Complete recorded context
wins; an active proven session can supply missing live context. Historical
context cannot borrow today's profile. Explicit source `none` means DHC0 even
with absent HI and CR differing from par; missing historical evidence blocks.

### Planned and played inputs

The store keeps planned `holes`; `getPlayedHoles()` uses `filterPlayableHoles`.
Daily handicap and course par use planned holes. Calculations take those holes
plus `holesPlayed`: `calculatePlayerStats`, `calculateMatchStatus`,
`calculateTeamMatchStatus`, and mismatch `recomputeScorecardTotals`. Displays,
navigation, readiness, Review validation, player scorecards and Wolf counts
use the played range. Never derive handicap from a six-hole par sum.

Ended net is `calculateNetOverHolesPlayed`: sum of gross minus strokes received
over the played holes. `daily_handicap_used` remains the planned daily handicap.
Complete net remains gross minus DHC. A genuine match close-out against planned
holes stands; otherwise the lead after the cutoff wins “N up”, level = All
Square (`compactMatchMargin`: “N UP” / “A/S”). The three scoring screens clamp
physical navigation, show `EndedEarlyBanner` with Finish, and reuse their
existing routes: singles → MatchPlayScorecard, general/team → Review. Finish
screens show the label without another Finish action. Closed-hole store and
multi-ball writes refuse; Watch exposes played holes and reports dropped
writes as failure.

### Server and reachable writers

The final server dependency order is A7 `20261007000100`, B1
`20261007000200`, C3 `20261007000300_guard_round_scoring_writes.sql`.
`end_round_early(uuid, integer)` authenticates owner or accepted participant,
locks the round with `FOR UPDATE`, then locks all existing cards with
`FOR UPDATE NOWAIT`, and refuses submitted cards or existing combinations before
a new end. Same-N retry is a no-op even after
submission. It trims later numeric score keys and side-game/entry/mismatch/
shot-log rows, nulls differentials, and leaves revisions/totals client-owned.
See [DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md) for exact refusal hints,
expected-shape APIs, entry guards and narrow stats/metadata exceptions.

The common `syncScorecard` boundary selects CURRENT source after waiting and
covers prerequisite, preparation, snapshot, trailing entries and guarded
acknowledgment for queue, fallback, direct store submit and force-sync. Every
new snapshot sends preparation-consistent `expected_round_shape`. Shape rejection
uses an authorized read and shared adoption before fresh preparation. It never
attaches a new declaration to stale totals. Accepted server revision can survive
a later entry/repair/ack failure without claiming local sync success.

Mismatch uses narrow `write_scorecard_resolution`, preserving confirmed rights
and unchanged revision; same-shape mismatch CAS is outside scope. Stats edit
overlays only seven permitted fields onto original JSON and requires fresh user
review after shape refresh. Ended Quick Score uses the remote arm of the same
boundary, planned DHC and played net/points, with separate remote acceptance
identity and no fabricated local acknowledgment. Ordinary Quick Score keeps its
direct unended path. Tee metadata, exact `write_scorecard_handicap_patch` and
guarded local tee application share one coordinator. Metadata and patch are
separate server transactions; partial failure remains visible and fresh retry
uses persisted inputs. Completed/confirmed server-only tee edits retain their
existing compatibility.

### Handicap, side games and statistics

I12 applies client gates/index/history/combine/tagging filters and both server
full-card triggers. Ended rounds always have NULL differential, including `{}`
legacy/multi-ball cards, and are never combinable or league-tagged. Ordinary
no-per-hole-data cards retain the gross-only rule. Existing combination history
is preserved. Skins price holes on planned count, settle played count and display
stored completed payouts (I11). Wolf trims later decisions and displays “of N
holes”; finalization remains a separate follow-up.

Ended rounds count as rounds played and feed per-hole statistics and Recent
Activity. They are Practice everywhere, excluded from 18/9-hole buckets,
average gross and per-round putts/bunker/hazard averages, round trends and trend
charts. Achievement events omit hole_count and gross/net, so 18/9-hole round
achievements do not advance. Ordinary and legacy displays retain their existing
defaults; labels require a valid positive-integer marker.

### Limits and verification

The coordinator serializes same-device asynchronous writes only. Native exact
queue/disk/recovery CAS and raw end-intent proof protect acknowledgment; ordinary
web upload remains supported but native repair/strict guarded modes have no web
fallback. Identifiable malformed canonical ends remain visible and block only
their round. Declared ends without canonical keys are invalid/unscoped and
cannot establish a synthesized prerequisite; unidentifiable noncanonical invalid
JSON retains strict decoding. See [OFFLINE_ARCHITECTURE.md](OFFLINE_ARCHITECTURE.md).

Jest controlled promises/mock transactions do not establish real SQLite crash
atomicity or PostgreSQL compilation/RLS/locks/concurrency. All database, device
and rollout checks remain pending in the [1.15.0 QA/runbook](END_ROUND_EARLY_ROLLOUT.md).
Known follow-ups remain: team skins uses the individual settlement calculator;
Wolf finalization is not wired; nine-hole per-hole net uses 18-hole stroke
indexes; plus-handicap per-hole net floors returned strokes at zero; dedicated
nine-rating/live nine-aware handicap work is separate; Home continue-scoring
copy and raw multi-ball course-offset labels retain their existing limitations.

## Extending this pattern to another domain

See `docs/guides/DOMAIN_GUARDRAILS_PATTERN.md`.
