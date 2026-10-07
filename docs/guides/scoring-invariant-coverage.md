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
| I10 no holes remaining ⇒ "N up"/"A/S", never "N&0" | `MatchPlayScoringScreen/utils/matchPlayCalculations.test.ts`, `TeamMatchPlayScoringScreen/utils/teamMatchPlayCalculations.test.ts` | ✅ |
