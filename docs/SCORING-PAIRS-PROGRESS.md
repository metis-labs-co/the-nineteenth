# Scoring Pairs - Implementation Plan

**Goal:** Add scoring pairs feature to define who is responsible for scoring whom (marker/attestation), separate from playing groups, to prevent cheating in competitions
**Status:** ✅ Complete - 100% (18/18 tasks)

---

## Overview

This plan introduces a **Scoring Pairs** feature that separates the concept of who scores whom (marker/attestation) from who walks together on the course (playing groups). The feature supports:

- **Reciprocal pairs** (even players): A↔B means A scores B AND B scores A
- **Circular chains** (odd players): A→B→C→A means each scores one, is scored by another
- **Cross-team pairing** for Team Match Play: System auto-pairs players from opposing teams to prevent cheating
- **Admin configuration**: Manual pairing with auto-generate option and override capability

### Example Scenario

**8 players, 2 teams (Team A: Alice, Bob, Charlie, Dana | Team B: Eve, Frank, Grace, Henry)**

- **Stableford Round**: Admin creates 4 reciprocal pairs manually
  - Alice ↔ Bob (score each other)
  - Charlie ↔ Dana
  - Eve ↔ Frank
  - Grace ↔ Henry

- **Team Match Play Round**: System auto-pairs cross-team
  - Alice ↔ Eve (opposing teams score each other)
  - Bob ↔ Frank
  - Charlie ↔ Grace
  - Dana ↔ Henry

This prevents teammates from scoring each other, eliminating potential for score manipulation.

---

## Sprint 1: Database Foundation

### Task 1: Database Migration - Scoring Pairs Schema
**Status:** ✅ Complete
**Implemented in:** `supabase/migrations/20250124000000_scoring_pairs.sql`
**Deliverables:**
- [x] `supabase/migrations/20250124000000_scoring_pairs.sql`
- [x] `scoring_pairs` table with all constraints
- [x] RLS policies for organizers (manage) and players (view)
- [x] Indexes for efficient lookups
- [x] `scoring_pairs_required` column on `rounds` table
- [x] Updated_at trigger
- [x] Database helper functions: `get_player_scoring_assignment()`, `get_player_scorer()`, `validate_scoring_pairs()`, `generate_reciprocal_scoring_pairs()`

**Dependencies:** None
**Estimated Time:** 2-3 hours

---

### Task 2: TypeScript Types - Scoring Pairs
**Status:** ✅ Complete
**Implemented in:** `src/types/database.types.ts`
**Deliverables:**
- [x] `src/types/database.types.ts` - ScoringPair, ScoringPairWithPlayers interfaces
- [x] `src/types/database.types.ts` - Database table definition for scoring_pairs
- [x] `src/types/database.types.ts` - ScoringPairInput, ScoringPairsValidation interfaces
- [x] `src/types/index.ts` - App-level ScoringPairCreateInput, AutoPairResult types

**Dependencies:** Task 1 (database schema)
**Estimated Time:** 1-2 hours

---

## Sprint 2: Core Algorithms

### Task 3: Scoring Pairs Generation Utilities
**Status:** ✅ Complete
**Implemented in:** `src/utils/scoringPairs.ts`
**Deliverables:**
- [x] `src/utils/scoringPairs.ts`
- [x] `generateReciprocalPairs()` - pairs of 2 (A↔B creates A→B and B→A)
- [x] `generateCircularChain()` - chain for any count (A→B→C→A)
- [x] `autoGenerateScoringPairs()` - picks strategy based on player count
- [x] `generateCrossTeamPairs()` - cross-team for Match Play with wrap/partial strategies
- [x] `validateScoringPairsCoverage()` - validation helper
- [x] `shuffleForPairing()` - randomize player order
- [x] JSDoc documentation with usage examples
- [x] Export from `src/utils/index.ts`

**Dependencies:** Task 2 (types)
**Estimated Time:** 3-4 hours

---

## Sprint 3: Services Layer

### Task 4: Scoring Pairs Service
**Status:** ✅ Complete
**Implemented in:** `src/services/scoringPairs/scoringPairsService.ts`
**Deliverables:**
- [x] `src/services/scoringPairs/scoringPairsService.ts`
- [x] `getRoundScoringPairs()` - fetch pairs with player details
- [x] `getPlayersToScore()` - players current user can score
- [x] `createScoringPairs()` - replace pairs for round
- [x] `autoGenerateAndSaveScoringPairs()` - auto-generate and save
- [x] `generateTeamMatchPlayPairs()` - cross-team pairs
- [x] `deleteScoringPairs()` - remove all pairs
- [x] `hasScoringPairs()` - check if configured
- [x] `src/services/scoringPairs/index.ts` barrel export

**Dependencies:** Task 3 (utilities)
**Estimated Time:** 3-4 hours

---

## Sprint 4: React Query Hooks

### Task 5: Query Keys for Scoring Pairs
**Status:** ✅ Complete
**Implemented in:** `src/hooks/queryKeys.ts`
**Deliverables:**
- [x] `src/hooks/queryKeys.ts` - scoringPairsKeys object
- [x] Keys: all, lists, list(roundId), playersToScore(roundId, scorerId)

**Dependencies:** None
**Estimated Time:** 30 minutes

---

### Task 6: Scoring Pairs Hooks
**Status:** ✅ Complete
**Implemented in:** `src/hooks/useScoringPairs.ts`
**Deliverables:**
- [x] `src/hooks/useScoringPairs.ts`
- [x] `useScoringPairs(roundId)` - fetch pairs query
- [x] `usePlayersToScore(roundId, scorerId)` - players to score query
- [x] `useCreateScoringPairs()` - create/update mutation
- [x] `useAutoGenerateScoringPairs()` - auto-generate mutation
- [x] `useGenerateTeamMatchPlayPairs()` - cross-team mutation
- [x] `useDeleteScoringPairs()` - delete mutation
- [x] Export from `src/hooks/index.ts`

**Dependencies:** Task 4 (service), Task 5 (query keys)
**Estimated Time:** 2-3 hours

---

## Sprint 5: Admin UI Components

### Task 7: ScoringPairCard Component
**Status:** ✅ Complete
**Implemented in:** `src/components/scoring/ScoringPairCard.tsx`
**Deliverables:**
- [x] `src/components/scoring/ScoringPairCard.tsx`
- [x] Scorer and scored player display with avatars
- [x] Arrow indicator between players
- [x] Handicap badges
- [x] Optional remove button
- [x] Accessibility labels
- [x] Theme-aware styling

**Dependencies:** Task 2 (types)
**Estimated Time:** 2-3 hours

---

### Task 8: ScoringPairFormationUI Component
**Status:** ✅ Complete
**Implemented in:** `src/components/scoring/ScoringPairFormationUI.tsx`
**Deliverables:**
- [x] `src/components/scoring/ScoringPairFormationUI.tsx` (~1500 lines)
- [x] Auto-generate button with loading state
- [x] Cross-team pair button (conditional for team match play)
- [x] Pair list using ScoringPairCard
- [x] Manual tap-to-pair interaction with PlayerSelectionChip
- [x] Coverage indicator (good/warning/error)
- [x] Save and Reset buttons
- [x] Validation (all players covered)
- [x] CircularChainDiagram component for visual chain display
- [x] PairingTypeBadge component (Reciprocal/Circular/Cross-Team/Manual)
- [x] UnevenTeamWarning component for cross-team edge cases
- [x] `src/components/scoring/index.ts` barrel export

**Dependencies:** Task 7 (ScoringPairCard), Task 6 (hooks)
**Estimated Time:** 4-5 hours

---

### Task 9: ScoringPairsScreen
**Status:** ✅ Complete
**Implemented in:** `src/screens/admin/ScoringPairsScreen.tsx`
**Deliverables:**
- [x] `src/screens/admin/ScoringPairsScreen.tsx`
- [x] Fetch round, players, teams, existing pairs via useScoringPairsData hook
- [x] ScoringPairFormationUI integration
- [x] Loading, error, success states
- [x] Header with back and title via PageHeader
- [x] Navigation in `src/navigation/types.ts` (line 62)
- [x] Registered in `src/navigation/RootNavigator.tsx` (lines 30, 210-211)
- [x] Snackbar feedback on save

**Dependencies:** Task 8 (ScoringPairFormationUI)
**Estimated Time:** 3-4 hours

---

## Sprint 6: Competition Setup Integration

### Task 10: Update AddRoundScreen - Scoring Pairs Toggle
**Status:** ✅ Complete
**Implemented in:** `src/screens/admin/AddRoundScreen.tsx`
**Deliverables:**
- [x] Form state for `scoringPairsRequired` (line 89)
- [x] Initial state `scoringPairsRequired: false` (line 314)
- [x] Pass to createRound mutation as `scoring_pairs_required` (line 135)

**Dependencies:** Task 9 (ScoringPairsScreen)
**Estimated Time:** 2-3 hours

---

### Task 11: Scoring Pairs Link in Round Detail
**Status:** ✅ Complete
**Implemented in:** `src/components/competitions/detail/RoundsTab.tsx`
**Deliverables:**
- [x] Scoring pairs status row in round detail (lines 116-150)
- [x] Configured/not configured indicator with icons (green check / yellow warning)
- [x] Navigation to ScoringPairsScreen via `onManageScoringPairs` callback
- [x] Organizer-only visibility (line 117 checks `isOrganizer`)
- [x] `scoringPairsStatus` prop for tracking pair status per round
- [x] CompetitionDetailScreen tracks and fetches scoring pair status (lines 220-227)

**Dependencies:** Task 9 (ScoringPairsScreen)
**Estimated Time:** 2-3 hours

---

## Sprint 7: Scoring Flow Integration

### Task 12: Update useRoundData Hook
**Status:** ✅ Complete
**Implemented in:** `src/hooks/scorecard/useRoundData.ts`
**Deliverables:**
- [x] Fetch `scoring_pairs_required` from round (lines 127-143)
- [x] Call `getPlayersToScore(roundId, currentUserId)` when enabled (line 267)
- [x] Filter `currentPlayers` by scoring assignment (lines 274-277)
- [x] Add `scoringPairsEnabled` to return state (lines 32, 58)
- [x] Add `playersToScore` array to return state (lines 33, 59)
- [x] Error state for unconfigured pairs (lines 250-259)
- [x] Error state for user not assigned to score (lines 278-286)
- [x] Backward compatibility - loads all players if scoring pairs not enabled

**Dependencies:** Task 4 (service), Task 6 (hooks)
**Estimated Time:** 2-3 hours

---

### Task 13: Update ScorecardEntryScreen
**Status:** ✅ Complete
**Implemented in:** `src/screens/scoring/ScorecardEntryScreen.tsx`
**Deliverables:**
- [x] Check `scoringPairsEnabled` from useRoundData
- [x] Render only assigned players' score cards (filtered by useRoundData)
- [x] Track `playersToScore` from useRoundData
- [x] Team round cross-team support via useRoundData filtering

**Dependencies:** Task 12 (useRoundData updates)
**Estimated Time:** 2-3 hours

---

### Task 14: Update Scorecard Store Validation (Optional)
**Status:** ✅ Complete (via UI filtering)
**Notes:** The useRoundData hook filters players before initializing the scorecard store. The store only receives players the user is assigned to score, making additional store-level validation unnecessary. This is a cleaner design as filtering happens at data fetch time.
**Deliverables:**
- [x] Players filtered in useRoundData before store initialization (line 304)
- [x] Store only receives valid players for the current user
- [x] No need for separate allowedPlayerIds validation layer

**Dependencies:** Task 12 (useRoundData)
**Estimated Time:** 1-2 hours

---

## Sprint 8: Edge Cases & Polish

### Task 15: Odd Player Circular Chain UI
**Status:** ✅ Complete
**Implemented in:** `src/components/scoring/ScoringPairFormationUI.tsx`
**Deliverables:**
- [x] CircularChainDiagram component (lines 202-285) - visual diagram showing A→B→C→A flow
- [x] PairingTypeBadge component showing 'Circular Chain' badge (lines 384-433)
- [x] Clear direction arrows in pair display via ScoringPairCard
- [x] Help text explaining circular chains (lines 276-281)
- [x] Distinct visual treatment with info colors and rotate icon

**Dependencies:** Task 8 (ScoringPairFormationUI)
**Estimated Time:** 2-3 hours

---

### Task 16: Uneven Teams Handling
**Status:** ✅ Complete
**Implemented in:** `src/utils/scoringPairs.ts` and `src/components/scoring/ScoringPairFormationUI.tsx`
**Deliverables:**
- [x] Wrap-around logic for uneven teams (lines 270-353 in scoringPairs.ts)
- [x] Configurable strategy: 'wrap' (default) or 'partial' (line 273)
- [x] UnevenTeamMetadata interface with reusedPlayerIds, unassignedPlayerIds, extraPairingsCount (lines 26-41)
- [x] CrossTeamPairResult interface returning pairs + metadata (lines 46-51)
- [x] UnevenTeamWarning component in UI (lines 455-543)

**Dependencies:** Task 3 (utilities)
**Estimated Time:** 2-3 hours

---

### Task 17: Player Removal Handling
**Status:** ✅ Complete
**Implemented in:** Database schema and `src/screens/competitions/CompetitionDetailScreen.tsx`
**Deliverables:**
- [x] Database cascade: `ON DELETE CASCADE` on `scoring_pairs.scorer_id` and `scoring_pairs.player_id` FKs (migration line 22-23)
- [x] Tracking affected rounds via `roundsRequiringScoringPairs` in CompetitionDetailScreen (lines 220-222)
- [x] useRemoveCompetitionPlayer hook handles cleanup (lines 194-196)

**Dependencies:** Task 1 (database)
**Estimated Time:** 2-3 hours

---

### Task 18: Documentation Update
**Status:** ✅ Complete
**Deliverables:**
- [x] `docs/database/DATABASE_SCHEMA.md` - scoring_pairs table docs (ScoringPair type at line 174)
- [x] `CLAUDE.md` - brief mention in Data Model section (line 143)
- [x] `docs/guides/SCORING_PAIRS.md` - comprehensive guide (~300 lines)
  - Overview and terminology
  - When to use (competitive vs casual)
  - Algorithm diagrams (reciprocal, circular, cross-team)
  - Admin setup flow with code examples
  - Player experience walkthrough
  - Database schema documentation
  - API reference

**Dependencies:** All previous tasks
**Estimated Time:** 2-3 hours

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 18
- **Completed:** 18 ✅ (100%)
- **In Progress:** 0 🔄 (0%)
- **Not Started:** 0 ⬜ (0%)

### Sprint Progress

**Sprint 1: Database Foundation** ✅ Complete
- ✅ Task 1: Database Migration
- ✅ Task 2: TypeScript Types

**Sprint 2: Core Algorithms** ✅ Complete
- ✅ Task 3: Scoring Pairs Generation Utilities

**Sprint 3: Services Layer** ✅ Complete
- ✅ Task 4: Scoring Pairs Service

**Sprint 4: React Query Hooks** ✅ Complete
- ✅ Task 5: Query Keys
- ✅ Task 6: Scoring Pairs Hooks

**Sprint 5: Admin UI Components** ✅ Complete
- ✅ Task 7: ScoringPairCard Component
- ✅ Task 8: ScoringPairFormationUI Component
- ✅ Task 9: ScoringPairsScreen

**Sprint 6: Competition Setup Integration** ✅ Complete
- ✅ Task 10: Update AddRoundScreen
- ✅ Task 11: Scoring Pairs Link in Round Detail

**Sprint 7: Scoring Flow Integration** ✅ Complete
- ✅ Task 12: Update useRoundData Hook
- ✅ Task 13: Update ScorecardEntryScreen
- ✅ Task 14: Update Scorecard Store Validation

**Sprint 8: Edge Cases & Polish** ✅ Complete
- ✅ Task 15: Odd Player Circular Chain UI
- ✅ Task 16: Uneven Teams Handling
- ✅ Task 17: Player Removal Handling
- ✅ Task 18: Documentation Update

---

## Critical Files

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/20250124000000_scoring_pairs.sql` | Database migration |
| `src/utils/scoringPairs.ts` | Pairing algorithms |
| `src/services/scoringPairs/scoringPairsService.ts` | CRUD operations |
| `src/services/scoringPairs/index.ts` | Barrel export |
| `src/hooks/useScoringPairs.ts` | React Query hooks |
| `src/components/scoring/ScoringPairCard.tsx` | Pair display |
| `src/components/scoring/ScoringPairFormationUI.tsx` | Pair configuration UI |
| `src/components/scoring/index.ts` | Barrel export |
| `src/screens/admin/ScoringPairsScreen.tsx` | Admin config screen |
| `docs/guides/SCORING_PAIRS.md` | Feature documentation |

### Modified Files
| File | Changes |
|------|---------|
| `docs/database/DATABASE_SCHEMA.md` | Document scoring_pairs table |
| `src/types/database.types.ts` | Add ScoringPair interfaces |
| `src/types/index.ts` | Add app-level types |
| `src/hooks/queryKeys.ts` | Add scoringPairsKeys |
| `src/hooks/index.ts` | Export new hooks |
| `src/utils/index.ts` | Export new utilities |
| `src/hooks/scorecard/useRoundData.ts` | Filter by scoring pairs |
| `src/screens/scoring/ScorecardEntryScreen.tsx` | Respect scoring pairs |
| `src/screens/admin/AddRoundScreen.tsx` | Add scoring pairs toggle |
| `src/store/scorecardStore.ts` | Optional validation |
| `src/navigation/types.ts` | Add ScoringPairs route |
| `src/navigation/RootNavigator.tsx` | Register screen |
| `CLAUDE.md` | Brief mention |

---

## Time Estimates

| Sprint | Tasks | Estimated Hours |
|--------|-------|-----------------|
| Sprint 1: Database | 2 | 3-5 hours |
| Sprint 2: Algorithms | 1 | 3-4 hours |
| Sprint 3: Services | 1 | 3-4 hours |
| Sprint 4: Hooks | 2 | 2.5-3.5 hours |
| Sprint 5: Admin UI | 3 | 9-12 hours |
| Sprint 6: Setup Integration | 2 | 4-6 hours |
| Sprint 7: Scoring Integration | 3 | 5-8 hours |
| Sprint 8: Polish | 4 | 8-12 hours |

**Total Estimated:** 37.5-54.5 hours

---

## Backward Compatibility

- `scoring_pairs_required` defaults to `false` on rounds table
- Existing rounds unaffected - they continue with "any player can score anyone"
- New rounds opt-in via admin toggle
- If scoring pairs not configured but required, show error and prevent scoring
- Falls back gracefully if service calls fail

---

## Key Design Decisions

1. **Reciprocal for Even, Circular for Odd**: Auto-generate picks appropriate strategy
2. **Cross-Team for Match Play**: Auto-suggested when team match play detected
3. **Admin Override**: Even auto-generated pairs can be manually adjusted
4. **One Scorer per Player**: Database constraint ensures exactly one scorer per player per round
5. **Defensive Validation**: Both UI filtering and optional store validation

---

## Command Usage Reference

| Command | Use For |
|---------|---------|
| `/db` | Database schema design and migrations |
| `/component` | Reusable UI components |
| `/screen` | Full screen implementations |
| `/hook` | TanStack Query hooks and services |
| `/refactor` | Modifying existing code, utilities |
| `/docs` | Documentation updates |

---

**Last Updated:** 2025-12-09
**Next Review:** After completing Sprint 1 tasks
**Current Sprint:** Not started
