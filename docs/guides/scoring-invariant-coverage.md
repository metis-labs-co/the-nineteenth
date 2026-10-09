# Scoring Invariant Coverage

> Invariant definitions and the blast-radius map: see [SCORING_ARCHITECTURE.md](./SCORING_ARCHITECTURE.md).

| Invariant | Locked by | Status |
|---|---|---|
| I1 singles match-play difference method | `utils/scoring.golden.test.ts` | ✅ |
| I2 four-ball relative-to-lowest | `utils/scoring.golden.test.ts` | ✅ |
| I3 pickup = net double bogey | `utils/scoring.golden.test.ts`, `services/scoreMismatch/recomputeScorecardTotals.golden.test.ts` (resolve / bypass / force-finalise totals) | ✅ |
| I4 nine-aware daily handicap (half index, single rounding; store == sync) | `utils/dailyHandicap.golden.test.ts`, `store/utils/scorecardCalculations.test.ts`, `src/__tests__/services/offline/calculateHandicapData.test.ts` | ✅ |
| I5 alt-shot split differential | `services/rounds/altShotSplit.golden.test.ts` | ✅ |
| I6 alt-shot combined 50% net-lowest | `services/scoring/altShotCombined.golden.test.ts` | ✅ |
| I7 stableford/par off round daily handicap | `services/scoring/StablefordEngine.test.ts` | ⬜ verify |
| I8 differential uses WHS adjusted gross (NDB cap) | `utils/adjustedGross.test.ts`, `services/offline/calculateHandicapData.test.ts` | ✅ |
| I9 GA handicapping score uses uncapped Rule 21.1 table | `utils/handicappingScore.test.ts` | ✅ |
| I10 no holes remaining ⇒ "N up"/"A/S", never "N&0"; ended early preserves a planned-hole close-out, otherwise final lead | `MatchPlayScoringScreen/utils/matchPlayCalculations.test.ts`, `TeamMatchPlayScoringScreen/utils/teamMatchPlayCalculations.test.ts`, `__tests__/utils/matchPlayResult.test.ts` (including ended early) | ✅ |
| I11 skins priced on planned holes, settled on holes played; individual skins zero-sum within cent rounding | `__tests__/utils/skinsCalculations.test.ts`, `utils/skins/holeCounts.test.ts`, `__tests__/services/skins/finalizeSkinsGame.test.ts` | ✅ (team skins: known gap) |
| I12 only full scorecards count (card gate + `holes_played` belts + server triggers; no-hole-data cards keep the gross-only rule unless ended early) | `utils/handicapEligibility.test.ts`, `__tests__/services/offline/calculateHandicapData.test.ts`, `__tests__/services/handicap/*.test.ts` (incl. `*.endedEarly.test.ts`), `supabase/tests/full_scorecards_only_handicap.verify.sql` + `supabase/tests/end_round_early_verify.sql` (authored; PostgreSQL execution pending) | ✅ |

Checkmarks record client test coverage. SQL fixtures are authored verification,
with PostgreSQL execution and real lock/RLS/native device QA still pending in
[the release runbook](END_ROUND_EARLY_ROLLOUT.md).
