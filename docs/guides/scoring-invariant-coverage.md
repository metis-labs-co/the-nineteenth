# Scoring Invariant Coverage

| Invariant | Locked by | Status |
|---|---|---|
| I1 singles match-play difference method | `utils/scoring.golden.test.ts` | ✅ |
| I2 four-ball relative-to-lowest | `utils/scoring.golden.test.ts` | ✅ |
| I3 pickup = net double bogey | `utils/scoring.golden.test.ts` | ✅ |
| I4 nine-aware daily handicap | `utils/dailyHandicap.golden.test.ts` | ✅ |
| I5 alt-shot split differential | `services/rounds/altShotSplit.golden.test.ts` | ✅ |
| I6 alt-shot combined 50% net-lowest | `services/scoring/altShotCombined.golden.test.ts` | ✅ |
| I7 stableford/par off round daily handicap | `services/scoring/StablefordEngine.test.ts` | ⬜ verify |
