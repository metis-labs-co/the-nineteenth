# Test Suite Implementation Plan

> **Document Location:** `docs/progress/TESTING_PLAN.md`
> **Created:** December 2024
> **Status:** Ready for Implementation

## Objective
Create comprehensive tests for all major functions in The Nineteenth golf app, with emphasis on the critical score entry functionality that must work perfectly.

## Configuration
- **Test Scope:** Both unit tests AND integration tests for critical flows
- **Coverage Target:** 90%+ for critical scoring files
- **Mock Strategy:** Partial mocking (mock network, use real SQLite for database behavior)

---

## Current State Analysis

### Existing Tests
- `src/__tests__/utils/scoring.test.ts` (663 lines) - Core scoring algorithms
- `src/__tests__/utils/competitionPoints.test.ts` (611 lines) - Competition standings
- `src/__tests__/utils/teamGeneration.test.ts` (409 lines) - Team formation
- `src/__tests__/utils/testFixtures.ts` (516 lines) - Test helpers

### Coverage Thresholds (jest.config.js)
- `competitionPoints.ts`: 90% (branches, functions, lines, statements)
- `teamGeneration.ts`: 90%
- `scoring.ts`: 70%

### Key Files Requiring Tests

**TIER 1 - Critical (Score Entry & Scoring)**
| File | Current Coverage | Priority |
|------|-----------------|----------|
| `src/store/scorecardStore.ts` | 0% | CRITICAL |
| `src/utils/scoring.ts` | ~70% | HIGH |
| `src/utils/scorecardCalculations.ts` | 0% | HIGH |
| `src/hooks/scorecard/useSubmitScorecard.ts` | 0% | HIGH |
| `src/hooks/scorecard/useOfflineSync.ts` | 0% | HIGH |
| `src/services/offline/database.ts` | 0% | HIGH |
| `src/services/offline/sync.ts` | 0% | HIGH |

**TIER 2 - Important (Business Logic)**
| File | Current Coverage | Priority |
|------|-----------------|----------|
| `src/utils/teamScoring.ts` | 0% | MEDIUM |
| `src/utils/scoringPairs.ts` | 0% | MEDIUM |
| `src/services/rounds/roundResultsService.ts` | 0% | MEDIUM |
| `src/hooks/useLeaderboard.ts` | 0% | MEDIUM |
| `src/hooks/useSubscription.ts` | 0% | MEDIUM |

**TIER 3 - Standard (Supporting Functions)**
| File | Current Coverage | Priority |
|------|-----------------|----------|
| `src/utils/displayHelpers.ts` | 0% | LOW |
| `src/utils/formatting.ts` | 0% | LOW |
| `src/hooks/useAuth.ts` | 0% | LOW |
| `src/hooks/useCourses.ts` | 0% | LOW |

---

## Implementation Plan

### Phase 1: Scorecard Store Tests (CRITICAL)
**File:** `src/__tests__/store/scorecardStore.test.ts`

Test the Zustand store that manages all scoring state:

1. **Initialization Tests**
   - `initializeRound()` - Creates scorecards for all players
   - `initializeRound()` - Saves holes to SQLite
   - `initializeRound()` - Handles allowed player IDs filtering
   - `loadFromOffline()` - Loads cached scorecards
   - `loadFromOffline()` - Rejects invalid UUID mock data
   - `loadFromOffline()` - Finds first incomplete hole correctly

2. **Score Entry Tests**
   - `setPlayerScore()` - Updates score correctly
   - `setPlayerScore()` - Rejects scores for non-allowed players
   - `setPlayerScore()` - Preserves existing stats (putts, FIR, GIR)
   - `setPlayerScore()` - Recalculates totals after update
   - `setPlayerScore()` - Saves to SQLite
   - `setPlayerScore()` - Queues for sync
   - `updatePlayerHoleScore()` - Merges partial updates

3. **Retrieval Tests**
   - `getPlayerScore()` - Returns correct hole score
   - `getPlayerTotals()` - Calculates gross/net/points correctly
   - `getHoleInfo()` - Returns correct hole data
   - `isHoleComplete()` - Detects when all players scored
   - `getCompletedHolesCount()` - Counts completed holes

4. **Submission Tests**
   - `submitScorecards()` - Sets status to 'completed'
   - `submitScorecards()` - Sets submittedAt timestamp
   - `submitScorecards()` - Queues all for sync
   - `submitScorecards()` - Throws error if roundId not set

5. **Edge Cases**
   - Score validation (1-12 range)
   - Hole number validation (1-18)
   - Handling missing player
   - Handling missing hole data
   - Concurrent score updates

### Phase 2: Scoring Utilities Enhancement
**File:** `src/__tests__/utils/scoring.test.ts` (extend existing)

Add missing coverage:

1. **calculatePlayingHandicap()** - USGA slope formula
2. **calculateTotalScore()** - Full scorecard aggregation
3. **calculateStatistics()** - Additional edge cases
4. **Edge cases** for existing functions:
   - Picked-up scores (10+)
   - Zero handicap edge cases
   - Negative handicap handling

### Phase 3: Scorecard Calculations Tests
**File:** `src/__tests__/utils/scorecardCalculations.test.ts`

1. **calculatePlayerStats()**
   - Front 9 / Back 9 aggregation
   - Stableford totals per player
   - Gross/net totals
   - Empty scores handling

2. **calculateParTotals()**
   - Standard 18-hole course
   - Par 3 course
   - Mixed par values

3. **splitHolesByNine()**
   - Standard split
   - Less than 18 holes

4. **generateDefaultHoles()**
   - Creates 18 holes
   - Correct par distribution
   - Unique stroke indexes

5. **calculateHoleStableford()**
   - All point scenarios (0-4)

### Phase 4: Team Scoring Tests
**File:** `src/__tests__/utils/teamScoring.test.ts`

1. **Best Ball**
   - `calculateBestBallHole()` - Returns lowest net
   - Team with picked-up player
   - All players same score

2. **Scramble**
   - `calculateScrambleHole()` - Team handicap applied
   - `calculateTeamHandicap()` - USGA percentages

3. **Match Play**
   - `calculateMatchPlayHoleResult()` - Win/loss/halve
   - `calculateMatchPlayHoleResultWithHandicaps()` - With strokes
   - `calculateMatchPlayMatchResult()` - Full match status
   - Early finish scenarios (3&2, 4&3, etc.)
   - Dormie scenarios
   - All square scenarios

4. **formatMatchPlayScore()**
   - "2 UP", "1 DN", "A/S" formats

### Phase 5: Scoring Pairs Tests
**File:** `src/__tests__/utils/scoringPairs.test.ts`

1. **Generation Strategies**
   - `generateReciprocalPairs()` - Even players only
   - `generateCircularChain()` - Any count
   - `autoGenerateScoringPairs()` - Strategy selection
   - `generateCrossTeamPairs()` - Both strategies

2. **Validation**
   - `validateScoringPairsCoverage()` - All scenarios

3. **Edge Cases**
   - Odd number of players
   - Single player
   - Uneven teams

### Phase 6: Offline Sync Tests
**File:** `src/__tests__/services/offline/database.test.ts`

1. **Database Operations**
   - `initDatabase()` - Table creation
   - `saveScorecard()` - Insert/update
   - `saveHoleScore()` - Insert/update
   - `getScorecardsByRound()` - Fetch with scores
   - `getHoles()` - Fetch hole data
   - `saveHoles()` - Batch insert

2. **Sync Queue**
   - `addPendingSync()` - Queues item
   - `removePendingSync()` - Removes after sync
   - `getPendingSyncCount()` - Correct count
   - `getUnsyncedScorecards()` - Filters correctly

**File:** `src/__tests__/services/offline/sync.test.ts`

1. **Sync State**
   - `initSyncService()` - Initializes correctly
   - `handleNetworkChange()` - Triggers sync on reconnect
   - `getSyncState()` - Returns correct state

2. **Sync Operations**
   - `manualSync()` - Syncs pending items
   - `syncAll()` - Batches all items
   - `syncScorecard()` - Handles conflicts

### Phase 7: Round Results Service Tests
**File:** `src/__tests__/services/rounds/roundResultsService.test.ts`

1. **Save/Fetch**
   - `saveRoundResults()` - Validates player/team ID
   - `getRoundResults()` - Joins correctly
   - `getCompetitionResults()` - Groups by round

2. **Finalization**
   - `finalizeRound()` - Stableford sorting
   - `finalizeRound()` - Stroke Play sorting
   - `calculateMatchPlayResults()` - Points allocation

3. **Edge Cases**
   - Re-finalization (deletes old)
   - Empty scorecards
   - Missing opponent in match play

### Phase 8: Hook Integration Tests
**File:** `src/__tests__/hooks/scorecard/useSubmitScorecard.test.ts`

1. **useSubmitScorecards()**
   - Saves to SQLite first
   - Queues for sync
   - Attempts immediate sync if online
   - Invalidates queries on success

2. **useUpdateScore()**
   - Optimistic update
   - Rollback on error
   - Query invalidation

**File:** `src/__tests__/hooks/scorecard/useOfflineSync.test.ts`

1. **useOfflineSync()**
   - Returns correct sync state
   - triggerSync() works
   - Subscribes to state changes

**File:** `src/__tests__/hooks/useSubscription.test.ts`

1. **Feature Checking**
   - `checkFeature()` - All feature types
   - `checkLimitFeature()` - Limit validation
   - `checkGameTypeFeature()` - Game type access

---

## Integration Tests

### Full Scoring Flow Integration Test
**File:** `src/__tests__/integration/scoringFlow.test.ts`

Test the complete scoring lifecycle:

1. **Happy Path Flow**
   - Initialize round with players and holes
   - Enter scores hole by hole (1-18)
   - Verify totals recalculate after each score
   - Submit scorecards
   - Verify status changes to 'completed'
   - Verify all scorecards queued for sync

2. **Offline to Online Flow**
   - Start scoring while offline
   - Enter multiple scores
   - Verify scores saved to SQLite
   - Simulate network reconnection
   - Verify sync triggered automatically
   - Verify data matches after sync

3. **Resume Incomplete Round**
   - Initialize round and enter partial scores
   - Close/reset store
   - Load from offline storage
   - Verify resumes at correct hole
   - Continue scoring to completion

4. **Multi-Player Concurrent Scoring**
   - Initialize round with 4 players
   - Enter scores for different holes in sequence
   - Verify all player totals correct
   - Submit and verify all synced

### Team Scoring Integration Test
**File:** `src/__tests__/integration/teamScoring.test.ts`

1. **Best Ball Full Round**
   - 2 teams of 2 players each
   - Score all 18 holes
   - Verify best ball selected correctly per hole
   - Verify team totals

2. **Scramble Full Round**
   - Team of 4 players
   - Single team score per hole with handicap
   - Verify team handicap calculation
   - Verify final team score

3. **Match Play Full Match**
   - 2 players head-to-head
   - Score until early finish (e.g., 4&3)
   - Verify match status updates
   - Test dormie scenario

---

## Test Infrastructure Updates

### 1. Extend Test Fixtures
**File:** `src/__tests__/utils/testFixtures.ts`

Add helpers for:
- `createScorecardStore()` - Real store with test data
- `createTestDatabase()` - Real SQLite in-memory database
- `createMockNetInfo()` - Network state mocking (mock only)
- `simulateOffline()` / `simulateOnline()` - Toggle network state

### 2. Mock Setup
**File:** `jest.setup.js`

Add mocks for:
- `@react-native-community/netinfo` - Network state (MOCK)
- `expo-sqlite` - Use real SQLite with in-memory database (PARTIAL MOCK)
- `zustand` - Store testing utilities

### 3. Update Jest Config
**File:** `jest.config.js`

Add coverage thresholds (90%+ for critical):
```javascript
'src/store/scorecardStore.ts': { branches: 90, functions: 90, lines: 90, statements: 90 },
'src/utils/teamScoring.ts': { branches: 90, functions: 90, lines: 90, statements: 90 },
'src/utils/scoringPairs.ts': { branches: 90, functions: 90, lines: 90, statements: 90 },
'src/utils/scorecardCalculations.ts': { branches: 90, functions: 90, lines: 90, statements: 90 },
```

---

## Estimated Test Count

| Phase | Test File | Estimated Tests |
|-------|-----------|-----------------|
| 1 | scorecardStore.test.ts | ~35 tests |
| 2 | scoring.test.ts (extend) | ~15 tests |
| 3 | scorecardCalculations.test.ts | ~20 tests |
| 4 | teamScoring.test.ts | ~25 tests |
| 5 | scoringPairs.test.ts | ~18 tests |
| 6 | offline/database.test.ts | ~15 tests |
| 6 | offline/sync.test.ts | ~12 tests |
| 7 | roundResultsService.test.ts | ~18 tests |
| 8 | useSubmitScorecard.test.ts | ~10 tests |
| 8 | useOfflineSync.test.ts | ~8 tests |
| 8 | useSubscription.test.ts | ~12 tests |
| Int | integration/scoringFlow.test.ts | ~15 tests |
| Int | integration/teamScoring.test.ts | ~12 tests |
| **Total** | | **~215 tests** |

---

## Execution Order

1. **Phase 1** - Scorecard Store (most critical - score entry core)
2. **Phase 3** - Scorecard Calculations (pure functions, easy wins)
3. **Phase 4** - Team Scoring (pure functions)
4. **Phase 5** - Scoring Pairs (pure functions)
5. **Phase 2** - Extend Scoring Tests (fill gaps)
6. **Phase 6** - Offline Sync (requires partial mocking)
7. **Phase 7** - Round Results Service
8. **Phase 8** - Hook Integration Tests
9. **Integration Tests** - Full flow tests (after all unit tests pass)

---

## Files to Create/Modify

### New Files (13 total)
- `src/__tests__/store/scorecardStore.test.ts`
- `src/__tests__/utils/scorecardCalculations.test.ts`
- `src/__tests__/utils/teamScoring.test.ts`
- `src/__tests__/utils/scoringPairs.test.ts`
- `src/__tests__/services/offline/database.test.ts`
- `src/__tests__/services/offline/sync.test.ts`
- `src/__tests__/services/rounds/roundResultsService.test.ts`
- `src/__tests__/hooks/scorecard/useSubmitScorecard.test.ts`
- `src/__tests__/hooks/scorecard/useOfflineSync.test.ts`
- `src/__tests__/hooks/useSubscription.test.ts`
- `src/__tests__/integration/scoringFlow.test.ts`
- `src/__tests__/integration/teamScoring.test.ts`
- `src/__tests__/utils/integrationHelpers.ts` (shared integration test utilities)

### Modified Files (4 total)
- `src/__tests__/utils/scoring.test.ts` - Extend coverage
- `src/__tests__/utils/testFixtures.ts` - Add new helpers
- `jest.setup.js` - Add partial mocks (NetInfo only)
- `jest.config.js` - Add 90% coverage thresholds

---

## Success Criteria

1. All ~215 new tests pass
2. **90%+ coverage** for critical files:
   - `scorecardStore.ts` - 90%+ (branches, functions, lines, statements)
   - `scoring.ts` - 90%+ (up from 70%)
   - `teamScoring.ts` - 90%+
   - `scoringPairs.ts` - 90%+
   - `scorecardCalculations.ts` - 90%+
3. Score entry flow fully tested (happy path + all edge cases)
4. Offline sync scenarios covered with real SQLite
5. Team scoring formulas validated (Best Ball, Scramble, Match Play)
6. Integration tests pass for complete scoring workflows
7. No regressions in existing tests

---

## Phase Status Tracking

| Phase | Description | Status | Completed |
|-------|-------------|--------|-----------|
| 0 | Setup (plan + command) | COMPLETED | 2024-12-17 |
| 1 | Scorecard Store Tests | COMPLETED | 2024-12-17 |
| 2 | Scoring Utilities Enhancement | COMPLETED | 2024-12-17 |
| 3 | Scorecard Calculations Tests | COMPLETED | 2024-12-17 |
| 4 | Team Scoring Tests | COMPLETED | 2024-12-17 |
| 5 | Scoring Pairs Tests | COMPLETED | 2024-12-17 |
| 6 | Offline Sync Tests | COMPLETED | 2024-12-17 |
| 7 | Round Results Service Tests | COMPLETED | 2024-12-17 |
| 8 | Hook Integration Tests | COMPLETED | 2024-12-17 |
| 9 | Integration Tests | PENDING | - |

**Status Legend:** PENDING | IN_PROGRESS | REVIEW | COMPLETED | BLOCKED
