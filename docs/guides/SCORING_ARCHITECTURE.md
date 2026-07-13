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
| `TeamMatchPlayScoreView` *(added — not in original seed)* | four-ball match play **live entry** (side-by-side team score buttons) — distinct from the read-only `TeamMatchPlayScorecardTable` above | `ScorecardEntryScreen` (`ScorecardScoreContent`) | `constants/scoring` (`PICKUP_SCORE`), `types/database` (`isSingleBallScore`); match-strokes math resolved upstream and passed in as props |
| `ScorecardTableBallsAsPlayers` *(added — not in original seed)* | multi-ball (solo player carrying 2 balls) review table, one card per ball | `PlayerScorecardScreen` (`ScorecardTable`), `ReviewScorecardScreen` (`ScorecardTabContent`) | `utils/scoring` (`getScoreColor`), `utils/multiBallScorecard` (`MultiBallHoleRowData`, `MultiBallStats` types) |
| `TeamScoreCard` (`components/scorecard/ContributionLeaderboard/TeamScoreCard.tsx`) *(added — not in original seed; name collision with the entry-card `TeamScoreCard` above)* | Shamble **leaderboard summary** card (to-par banner, gross/net/stableford totals) — NOT a score-entry component | `ContributionLeaderboard` (rendered from `ReviewScorecardScreen`'s `ContributionsTabContent`, `ViewRoundScreen`'s `ShambleTeamScoresTab` and `ScrambleContributionsTab`) | none directly — consumes a pre-computed `TeamScoreSummary` prop from `useContributionData` |

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
| `utils/subMatches.ts` | user↔sub-match resolution for alt-shot/split display (exports only `resolveSubMatchForUser`) | `src/screens/scoring/MatchPlayScoringScreen/index.tsx` (single consumer) | `utils/subMatches.golden.test.ts` |
| `utils/teamHandicap.ts` | team stroke allocation (average-team-handicap display) | `src/components/leaderboard/MatchPlayLeaderboard.tsx`, `src/components/leaderboard/TeamLeaderboardView.tsx` | _characterization_ |
| `utils/competitionPoints.ts` | per-round points | `src/components/competitions/detail/sections/PointsConfigSection.tsx`, `src/components/competitions/detail/sections/SettingsSection.tsx`, `src/components/competitions/detail/sections/sheets/EditCompetitionRulesSheet.tsx`, `src/components/leaderboard/LeaderboardTab.tsx`, `src/hooks/competitions/leaderboard.ts`, `src/services/competitions/winnerService.ts`, `src/services/rounds/roundResultsService.ts` | _characterization_ |
| `engines/*` (`ScoringOrchestrator.ts`, `engines/{MatchPlay,Par,Stableford,StrokePlay,TeamScoring}Engine.ts`) | per-format leaderboard (intended canonical math; not yet the live path) | **none** — no file outside `src/services/scoring/**` imports the barrel (`@/services/scoring`), `ScoringOrchestrator`, or any individual engine. `src/hooks/player/playingHandicap.ts` imports only `services/scoring/utils/handicapUtils` (a sibling utils module used *by* the engines internally, not the engines themselves). Live leaderboard/finalize logic runs through `utils/scoring.ts` + `services/rounds/*` instead (see that row) | `services/scoring/engines/MatchPlayEngine.matchParity.test.ts` only — this is a **parity check** (confirms the engine agrees with the display-path calculation), not a full unit-test suite; `ParEngine.ts`, `StablefordEngine.ts`, `StrokePlayEngine.ts`, `TeamScoringEngine.ts` currently have **no dedicated test file** (`services/scoring/*Engine.test.ts` referenced in the plan does not exist yet beyond the one parity test) |

> **Real subMatches.ts vs. seeded "alt-shot split differential" ownership:**
> `utils/subMatches.ts` exports only `resolveSubMatchForUser` (which sub-match a
> given user belongs to, for the live match-play screen). The alt-shot **split**
> differential-total-net calculation itself lives in
> `src/services/rounds/finalizePairResults.ts` (consumer of `utils/scoring.ts`,
> listed in that row), not in `utils/subMatches.ts`. Task 2/3 should locate the
> exact split-calculation function there before writing the I5 golden test —
> see `docs/guides/scoring-invariant-coverage.md` (Task 2) once created.

## Per-format invariants

Each row is a behavioural contract. **File** owns it; **Test** locks it.

| # | Invariant | File | Test |
|---|---|---|---|
| I1 | Singles match play uses the **difference method** (`getMatchPlayStrokes`): only the higher-handicap player gets strokes, equal to `getStrokesReceived(|hcpA−hcpB|, SI)`. | `utils/scoring.ts` | `utils/scoring.golden.test.ts` |
| I2 | Four-ball match play allocates strokes **relative to the lowest handicap in the match** (`getFourBallStrokes`); tied-lowest get 0. | `utils/scoring.ts` | `utils/scoring.golden.test.ts` |
| I3 | Pickups (`isPickupScore`, strokes ≥ PICKUP_SCORE) count as **net double bogey** everywhere (`getEffectiveGrossStrokes` = par + 2 + strokesReceived). | `utils/scoring.ts` | `utils/scoring.golden.test.ts` |
| I4 | 9-hole daily handicap is **nine-aware** (`calculateNineAwareDailyHandicap`) — must not inflate toward an 18-hole value. | `utils/dailyHandicap.ts` | `utils/dailyHandicap.golden.test.ts` |
| I5 | Alt-shot **split** = differential total-net across the pair. | `utils/subMatches.ts` | `utils/subMatches.golden.test.ts` |
| I6 | Alt-shot **combined** = own 50% handicap, net-lowest scoring. | (finalize service) | characterization (Task 3) |
| I7 | Stableford/Par leaderboards + best-ball header score off the **round daily handicap**. | engines + `leaderboardHandicaps.ts` | `services/scoring/StablefordEngine.test.ts` |

> This is the seed set. During Task 2/3, verify each against code and add any
> missing invariant you encounter. An invariant with no locking test is
> unprotected — flag it. (Verified for this task: `getMatchPlayStrokes`,
> `getFourBallStrokes`, `isPickupScore`, `getEffectiveGrossStrokes` all exist in
> `src/utils/scoring.ts`, and `calculateNineAwareDailyHandicap` exists in
> `src/utils/dailyHandicap.ts`. None of the `*.golden.test.ts` files referenced
> above exist yet — they are the deliverables of Task 2/3, not files created by
> this task. I5's file attribution has a caveat — see the note under the
> blast-radius table above.)

## Extending this pattern to another domain

See `docs/guides/DOMAIN_GUARDRAILS_PATTERN.md`.
