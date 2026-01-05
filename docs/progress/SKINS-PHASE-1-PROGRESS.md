# Skins Game - Phase 1 Implementation Plan

**Goal:** Add Skins side-game feature with pot configuration, hole-by-hole tracking, and settlement display
**Status:** In Progress - 5% (1/21 tasks)

---

## Overview

This plan implements **Phase 1** of the Skins gambling feature - a side-game that runs alongside any existing game type (Stableford, Stroke Play, etc.) where players compete hole-by-hole for a pot of money. Tied holes result in carryover to the next hole.

### Key Features
- **Add-on game type** - Works alongside Stableford, Stroke, Match Play
- **Competition-level configuration** - Enable skins for all rounds or select specific rounds
- **Pot configuration** - Per-hole value OR total pot amount
- **Scoring type** - Configurable gross or net scoring
- **Carryover logic** - Tied holes roll money to next hole
- **Hole 18 split** - Any remaining carryover splits evenly
- **Premium tier** - Requires Premium subscription
- **Gambling disclaimer** - Legal acknowledgment required

### Competition-Level Skins Setup

**Round Selection (3-way toggle):**
| Setting | Behavior |
|---------|----------|
| **No Skins** | Skins disabled for entire competition |
| **All Rounds** | Every round automatically has skins with same config |
| **Select Rounds** | User picks specific rounds to have skins |

**Settlement Mode (Phase 1):**
- **Per Round** - Each round is independent, settle after each round

**Settlement Mode (Phase 2 - Tally All Rounds):**
- Accumulate carryovers across all rounds
- One settlement at competition end

### Example Scenario

**4 players, $5 per hole skins game:**
- Hole 1: John (4), Sarah (4), Mike (5), You (5) → Tied (John/Sarah), $5 carries
- Hole 2: John (3), Sarah (4), Mike (4), You (4) → John wins $10 (2 holes)
- Hole 3: John (5), Sarah (4), Mike (4), You (4) → Tied (3 players), $5 carries
- Hole 18: All tied → Remaining pot ($20) splits 4 ways = $5 each

**Final Settlement:**
- John: Won $45, Paid $22.50 buy-in = +$22.50
- Sarah: Won $25, Paid $22.50 buy-in = +$2.50
- Mike: Won $10, Paid $22.50 buy-in = -$12.50
- You: Won $10, Paid $22.50 buy-in = -$12.50

---

## Sprint 1: Database Foundation

### Task 1: Database Migration - Skins Tables
**Status:** ✅ Completed (2026-01-05)
**Command:**
```bash
/db "Create migration for skins gambling feature. New tables: (1) skins_games - id UUID PK, round_id UUID FK to rounds ON DELETE CASCADE, pairing_id UUID FK to pairings NULL, participant_ids UUID[] NOT NULL with CHECK array_length BETWEEN 2 AND 4, pot_type TEXT NOT NULL CHECK IN ('per_hole', 'total_pot'), pot_value DECIMAL(10,2) NOT NULL CHECK > 0, currency TEXT DEFAULT 'AUD', scoring_type TEXT NOT NULL CHECK IN ('gross', 'net') DEFAULT 'gross', status TEXT DEFAULT 'active' CHECK IN ('active', 'completed', 'cancelled'), disclaimer_accepted_at TIMESTAMPTZ NOT NULL, disclaimer_accepted_by UUID FK to players NOT NULL, created_by UUID FK to players NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ NULL. (2) skins_results - id UUID PK, skins_game_id UUID FK to skins_games ON DELETE CASCADE, hole_number INTEGER NOT NULL CHECK BETWEEN 1 AND 18, winner_id UUID FK to players NULL (null if carryover), is_carryover BOOLEAN DEFAULT FALSE, hole_scores JSONB NOT NULL (format: player_id -> {gross, net, strokes_received}), hole_pot_value DECIMAL(10,2) NOT NULL, carryover_to_next DECIMAL(10,2) DEFAULT 0, payout_amount DECIMAL(10,2) DEFAULT 0, calculated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (skins_game_id, hole_number). (3) skins_payouts - id UUID PK, skins_game_id UUID FK ON DELETE CASCADE, player_id UUID FK to players, buy_in DECIMAL(10,2) NOT NULL, total_winnings DECIMAL(10,2) DEFAULT 0, net_result DECIMAL(10,2) DEFAULT 0, holes_won INTEGER DEFAULT 0, holes_tied INTEGER DEFAULT 0, holes_lost INTEGER DEFAULT 0, calculated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (skins_game_id, player_id). Add indexes on all foreign keys and status columns. Add updated_at trigger on skins_games."
```
**Deliverables:**
- [x] `supabase/migrations/20260105000000_skins_games.sql`
- [x] `skins_games` table with all constraints
- [x] `skins_results` table with unique constraint
- [x] `skins_payouts` table with unique constraint
- [x] Indexes for efficient lookups
- [x] Updated_at trigger
- [x] RLS policies for all 3 tables (combined Tasks 1 & 2)
- [x] `can_use_skins` column in tier_limits (combined Task 3)
- [x] Updated `user_has_feature()` function for 'skins' feature
- [x] TypeScript types in `src/types/database/skins.types.ts`
- [x] TierFeature updated with 'skins' in `src/types/database/enums.ts`
- [x] Exports added to `src/types/database/index.ts`

**Dependencies:** None
**Actual Time:** ~1 hour

**Notes:**
- This migration also includes RLS policies (originally Task 2) and tier limits update (originally Task 3)
- TypeScript types were also created as part of this implementation

---

### Task 2: Database Migration - RLS Policies
**Status:** ✅ Completed (2026-01-05) - Combined with Task 1
**Command:**
```bash
/db "Add RLS policies for skins tables. skins_games: enable RLS, policy 'participants_view_games' SELECT using auth.uid() = ANY(participant_ids), policy 'creators_manage_games' ALL using created_by = auth.uid(), policy 'round_organizers_manage' ALL using round_id IN (SELECT r.id FROM rounds r WHERE r.competition_id IN (SELECT c.id FROM competitions c WHERE c.organizer_id = auth.uid()) OR r.user_id = auth.uid()). skins_results: enable RLS, policy 'participants_view_results' SELECT using skins_game_id IN (SELECT id FROM skins_games WHERE auth.uid() = ANY(participant_ids)), policy 'creators_manage_results' ALL using skins_game_id IN (SELECT id FROM skins_games WHERE created_by = auth.uid()). skins_payouts: enable RLS, policy 'players_view_own_payouts' SELECT using player_id = auth.uid(), policy 'participants_view_game_payouts' SELECT using skins_game_id IN (SELECT id FROM skins_games WHERE auth.uid() = ANY(participant_ids)), policy 'creators_manage_payouts' ALL using skins_game_id IN (SELECT id FROM skins_games WHERE created_by = auth.uid())."
```
**Deliverables:**
- [ ] RLS enabled on all 3 tables
- [ ] SELECT policies for participants
- [ ] ALL policies for game creators
- [ ] Organizer override policies

**Dependencies:** Task 1
**Estimated Time:** 1-2 hours

---

### Task 3: Database Migration - Tier Limits Update
**Status:** ✅ Completed (2026-01-05) - Combined with Task 1
**Command:**
```bash
/db "Update tier_limits table to add skins feature flag. ALTER TABLE tier_limits ADD COLUMN IF NOT EXISTS can_use_skins BOOLEAN NOT NULL DEFAULT FALSE. UPDATE tier_limits SET can_use_skins = FALSE WHERE tier IN ('free', 'social'). UPDATE tier_limits SET can_use_skins = TRUE WHERE tier IN ('premium', 'super_admin'). Add COMMENT ON COLUMN tier_limits.can_use_skins IS 'Whether tier can create/join skins games'. Update user_has_feature() function to handle 'skins' feature check: WHEN 'skins' THEN RETURN v_limits.can_use_skins."
```
**Deliverables:**
- [ ] `can_use_skins` column added to tier_limits
- [ ] Premium and Super Admin have access
- [ ] Free and Social do not have access
- [ ] `user_has_feature()` updated

**Dependencies:** Task 1
**Estimated Time:** 30 minutes

---

### Task 4: Database Functions - Skins Calculations
**Status:** Not Started
**Command:**
```bash
/db "Create PostgreSQL functions for skins calculations. (1) calculate_skins_hole_value(p_pot_type TEXT, p_pot_value DECIMAL) RETURNS DECIMAL - returns pot_value if per_hole, pot_value/18 if total_pot, IMMUTABLE. (2) calculate_skins_buy_in(p_pot_type TEXT, p_pot_value DECIMAL, p_participant_count INTEGER) RETURNS DECIMAL - calculates total pot then divides by participants, IMMUTABLE. (3) get_skins_current_carryover(p_skins_game_id UUID) RETURNS DECIMAL - gets carryover_to_next from last hole result, returns 0 if no results, STABLE. (4) process_skins_hole(p_skins_game_id UUID, p_hole_number INTEGER, p_hole_scores JSONB) RETURNS skins_results - determines winner or carryover, inserts/upserts result, handles tie detection, calculates pot value including carryover, SECURITY DEFINER. (5) handle_hole_18_carryover(p_skins_game_id UUID) RETURNS VOID - splits remaining carryover among all participants, updates hole 18 result, updates payouts, SECURITY DEFINER. (6) finalize_skins_game(p_skins_game_id UUID) RETURNS VOID - calculates all payouts for participants, handles hole 18 split if needed, marks game completed, SECURITY DEFINER. All functions with proper error handling and RAISE EXCEPTION for invalid inputs."
```
**Deliverables:**
- [ ] `calculate_skins_hole_value()` function
- [ ] `calculate_skins_buy_in()` function
- [ ] `get_skins_current_carryover()` function
- [ ] `process_skins_hole()` function
- [ ] `handle_hole_18_carryover()` function
- [ ] `finalize_skins_game()` function
- [ ] Proper error handling

**Dependencies:** Task 1
**Estimated Time:** 3-4 hours

---

## Sprint 2: TypeScript Types

### Task 5: Skins Type Definitions
**Status:** ✅ Completed (2026-01-05)
**Command:**
```bash
/refactor "Create src/types/database/skins.types.ts with TypeScript types. Types: SkinsPotType = 'per_hole' | 'total_pot', SkinsScoringType = 'gross' | 'net', SkinsGameStatus = 'active' | 'completed' | 'cancelled'. Interfaces: SkinsHoleScoreData (gross number, net number, strokes_received number), SkinsHoleScores = Record<string, SkinsHoleScoreData>. SkinsGame (id, round_id, pairing_id nullable, participant_ids string[], pot_type, pot_value number, currency string, scoring_type, status, disclaimer_accepted_at string, disclaimer_accepted_by string, created_by string, created_at, updated_at, completed_at nullable). SkinsGameWithParticipants extends SkinsGame with participants array of {id, name, handicap}. SkinsResult (id, skins_game_id, hole_number, winner_id nullable, is_carryover boolean, hole_scores SkinsHoleScores, hole_pot_value, carryover_to_next, payout_amount, calculated_at). SkinsResultWithWinner extends with winner object nullable. SkinsPayout (id, skins_game_id, player_id, buy_in, total_winnings, net_result, holes_won, holes_tied, holes_lost, calculated_at). SkinsPayoutWithPlayer extends with player object. CreateSkinsGameInput (round_id, pairing_id optional, participant_ids, pot_type, pot_value, currency optional, scoring_type). ProcessSkinsHoleInput (skins_game_id, hole_number, hole_scores). SkinsGameSummary (game, results array, payouts array, current_carryover, holes_completed, total_pot, per_hole_value). Export all from src/types/database/index.ts."
```
**Deliverables:**
- [ ] `src/types/database/skins.types.ts`
- [ ] All type definitions
- [ ] Input types for mutations
- [ ] Summary type for UI display
- [ ] Export from `src/types/database/index.ts`

**Dependencies:** Task 1 (schema reference)
**Estimated Time:** 1-2 hours

---

### Task 6: Update Enums and Index Exports
**Status:** ✅ Completed (2026-01-05)
**Command:**
```bash
/refactor "Update src/types/database/enums.ts to add skins enums: export type SkinsPotType, SkinsScoringType, SkinsGameStatus from skins.types.ts. Add 'skins' to TierFeature union type. Update src/types/index.ts to re-export all skins types. Ensure types match database schema exactly."
```
**Deliverables:**
- [ ] Enums added to `src/types/database/enums.ts`
- [ ] 'skins' added to TierFeature
- [ ] Types exported from `src/types/index.ts`

**Dependencies:** Task 5
**Estimated Time:** 30 minutes

---

## Sprint 3: Calculation Utilities

### Task 7: Skins Calculation Utilities
**Status:** Not Started
**Command:**
```bash
/refactor "Create src/utils/skinsCalculations.ts with pure calculation functions. Import Hole type from types. Functions: (1) calculateHoleValue(potType, potValue) - returns potValue if per_hole, potValue/18 rounded to 2 decimals if total_pot. (2) calculateTotalPot(potType, potValue) - returns potValue*18 if per_hole, potValue if total_pot. (3) calculateBuyIn(potType, potValue, participantCount) - calculates total pot / participants rounded to 2 decimals. (4) prepareHoleScores(participants array with id/handicap, scorecards Record with strokes, hole Hole) - calculates gross, net, strokes_received for each participant, returns SkinsHoleScores. (5) determineHoleWinner(holeScores, scoringType) - finds minimum score, counts players with that score, returns {winnerId nullable, isCarryover boolean, minScore, tiedPlayerIds array}. (6) calculateCurrentCarryover(results SkinsResult[]) - gets carryover from last result. (7) processHoleResult(holeNumber, holeScores, baseHoleValue, currentCarryover, scoringType) - returns result object without id/skins_game_id. (8) calculateHole18Split(carryoverAmount, participantCount) - splits evenly rounded to 2 decimals. (9) calculateFinalPayouts(game, results, participants) - calculates buy_in, winnings, net_result, holes stats for each participant. (10) validateSkinsGame(participantIds, potValue) - returns {isValid, errors array}. (11) validateHoleScores(holeScores, participantIds) - returns {isValid, missingPlayerIds}. All functions with JSDoc documentation and examples. Export from src/utils/index.ts."
```
**Deliverables:**
- [ ] `src/utils/skinsCalculations.ts`
- [ ] All calculation functions
- [ ] Input validation functions
- [ ] JSDoc documentation
- [ ] Export from `src/utils/index.ts`

**Dependencies:** Task 5 (types)
**Estimated Time:** 3-4 hours

---

## Sprint 4: React Query Hooks

### Task 8: Query Keys for Skins
**Status:** Not Started
**Command:**
```bash
/refactor "Update src/hooks/queryKeys.ts to add skins query keys. Add skinsKeys object: all: ['skins'] as const, games: () => [...all, 'games'], game: (id) => [...games(), id], gamesByRound: (roundId) => [...games(), 'round', roundId], gamesByPlayer: (playerId) => [...games(), 'player', playerId], results: (gameId) => [...all, 'results', gameId], payouts: (gameId) => [...all, 'payouts', gameId], summary: (gameId) => [...all, 'summary', gameId]. Export skinsKeys."
```
**Deliverables:**
- [ ] `skinsKeys` object in queryKeys.ts
- [ ] All key patterns defined
- [ ] Exported

**Dependencies:** None
**Estimated Time:** 30 minutes

---

### Task 9: Skins Query Hooks
**Status:** Not Started
**Command:**
```bash
/hook "Create src/hooks/useSkins.ts with TanStack Query hooks for skins. Queries: (1) useSkinsGame(gameId) - fetches skins_game with participant details via join, returns SkinsGameWithParticipants, staleTime 30s. (2) useSkinsGamesByRound(roundId) - fetches all skins games for round with participants, returns array, staleTime 30s. (3) useSkinsResults(gameId) - fetches skins_results with winner player details ordered by hole_number, staleTime 10s. (4) useSkinsPayouts(gameId) - fetches skins_payouts with player details ordered by net_result DESC, staleTime 30s. (5) useSkinsSummary(gameId) - combines game, results, payouts with calculated current_carryover, holes_completed, total_pot, per_hole_value, staleTime 10s. Mutations: (6) useCreateSkinsGame() - inserts skins_game with disclaimer timestamp, invalidates gamesByRound. (7) useProcessSkinsHole() - calls process_skins_hole RPC, invalidates results and summary. (8) useFinalizeSkinsGame() - calls finalize_skins_game RPC, invalidates all skins queries for game. (9) useCancelSkinsGame() - updates status to cancelled, invalidates game. Utility: (10) useCanUseSkins(userId) - calls user_has_feature RPC with 'skins', staleTime 5min. Export all hooks and add to src/hooks/index.ts."
```
**Deliverables:**
- [ ] `src/hooks/useSkins.ts`
- [ ] 5 query hooks
- [ ] 4 mutation hooks
- [ ] 1 permission check hook
- [ ] Export from `src/hooks/index.ts`

**Dependencies:** Task 5 (types), Task 8 (query keys)
**Estimated Time:** 3-4 hours

---

## Sprint 5: UI Components - Setup

### Task 10: SkinsSection Component
**Status:** Not Started
**Command:**
```bash
/component "SkinsSection - Toggle to enable skins in round setup. Props: enabled (boolean), onToggle ((enabled: boolean) => void), config (SkinsConfig nullable with potType, potValue, scoringType), onConfigPress (() => void), disabled (boolean optional). Layout: Surface card with dice icon, 'Enable Skins Game' label, toggle switch on right. When enabled, show summary text below '$X per hole, gross/net scoring' and 'Configure Skins' button. When disabled (tier locked), show lock icon and 'Premium' badge instead of toggle, tap navigates to upgrade. Use useCanUseSkins() hook to check tier access. Use useThemeColors() for colors. Follow ScoringPairsSection.tsx pattern exactly. Accessibility: proper labels for toggle state."
```
**Deliverables:**
- [ ] `src/components/skins/SkinsSection.tsx`
- [ ] Toggle with tier gating
- [ ] Config summary display
- [ ] Configure button
- [ ] Premium lock state
- [ ] `src/components/skins/index.ts` barrel

**Dependencies:** Task 9 (hooks)
**Estimated Time:** 2-3 hours

---

### Task 11: SkinsConfigBottomSheet Component
**Status:** Not Started
**Command:**
```bash
/component "SkinsConfigBottomSheet - Configure skins game settings. Props: visible (boolean), onDismiss (() => void), initialConfig (SkinsConfig nullable), onSave ((config: SkinsConfig) => void). Use BottomSheet component with snapPoints ['65%']. Layout: (1) Header 'Skins Configuration' with X close button. (2) POT SETUP section with TextInput for dollar amount, radio buttons for 'Per Hole' vs 'Total Pot', calculated display showing 'x 18 = $Y total' or '/ 18 = $Y per hole'. (3) SCORING TYPE section with radio buttons 'Gross' (raw strokes) and 'Net' (with handicap). (4) PARTICIPANTS info text 'All players in your pairing participate'. (5) Save button at bottom. Validation: amount > 0, max $100 per hole. Use React Hook Form + Zod for form state. Follow existing BottomSheet patterns."
```
**Deliverables:**
- [ ] `src/components/skins/SkinsConfigBottomSheet.tsx`
- [ ] Pot type selection (per-hole/total)
- [ ] Amount input with validation
- [ ] Scoring type selection
- [ ] Calculated display
- [ ] Form validation

**Dependencies:** Task 5 (types)
**Estimated Time:** 3-4 hours

---

### Task 12: SkinsDisclaimerModal Component
**Status:** Not Started
**Command:**
```bash
/component "SkinsDisclaimerModal - Gambling disclaimer acknowledgment. Props: visible (boolean), onAccept (() => void), onCancel (() => void). Modal with warning-triangle icon in amber, title 'Gambling Feature Notice'. Body text: 'Skins is a betting feature for friendly wagers between players. Please be aware:' followed by bullet points: 'This feature is for social entertainment only', 'All players must be of legal gambling age', 'The app does not process real money', 'Settlement is handled between players', 'Check local laws regarding gambling'. Checkbox 'I understand and accept these terms' that enables Accept button. Two buttons: 'Cancel' (outline) and 'I Understand, Continue' (primary, disabled until checkbox). Store acknowledgment in AsyncStorage key 'skins_disclaimer_accepted' to not show again. Follow UpgradePrompt.tsx pattern for modal styling."
```
**Deliverables:**
- [ ] `src/components/skins/SkinsDisclaimerModal.tsx`
- [ ] Warning icon and title
- [ ] Disclaimer bullet points
- [ ] Checkbox acknowledgment
- [ ] AsyncStorage persistence
- [ ] Accept/Cancel buttons

**Dependencies:** None
**Estimated Time:** 2-3 hours

---

## Sprint 6: UI Components - Scoring

### Task 13: SkinsIndicator Component
**Status:** Not Started
**Command:**
```bash
/component "SkinsIndicator - Small indicator for scorecard header showing skins is active. Props: roundId (string), onPress (() => void optional). Use useSkinsGamesByRound(roundId) to check if active skins game exists. If no active game, return null. Layout: Small dice icon with badge showing current carryover if > 0. On press, show tooltip/popover with quick summary: 'Pot: $X/hole', 'Carryover: $Y (Z holes)', 'Last winner: PlayerName (Hole N)'. Use useSkinsSummary() for data. Icon color from theme primary. Tooltip follows existing tooltip patterns in codebase."
```
**Deliverables:**
- [ ] `src/components/skins/SkinsIndicator.tsx`
- [ ] Conditional render if skins active
- [ ] Dice icon with carryover badge
- [ ] Press handler for summary
- [ ] Tooltip/popover display

**Dependencies:** Task 9 (hooks)
**Estimated Time:** 2-3 hours

---

### Task 14: Update ScorecardEntryScreen Header
**Status:** Not Started
**Command:**
```bash
/refactor "Update src/screens/scoring/ScorecardEntryScreen/index.tsx to add SkinsIndicator to header. Import SkinsIndicator from @/components/skins. In header right section (next to sync icon), add SkinsIndicator with roundId from route params. Pass onPress handler that navigates to future SkinsTrackerScreen (for now, just shows alert with 'Skins tracking coming soon'). Only show if round has skins enabled - check via useSkinsGamesByRound hook. Ensure header layout accommodates new icon without breaking existing sync indicator."
```
**Deliverables:**
- [ ] SkinsIndicator added to header
- [ ] Conditional render based on skins status
- [ ] Press handler (alert for now)
- [ ] Header layout adjusted

**Dependencies:** Task 13 (SkinsIndicator)
**Estimated Time:** 1-2 hours

---

## Sprint 7: UI Components - Results

### Task 15: SkinsResultsCard Component
**Status:** Not Started
**Command:**
```bash
/component "SkinsResultsCard - Hole-by-hole skins breakdown table. Props: results (SkinsResultWithWinner[]), potType (SkinsPotType), potValue (number), scoringType (SkinsScoringType). Layout: Card with header 'SKINS RESULTS' and config summary '$X per hole | Gross/Net | 18 holes'. Table with columns: Hole #, Par (if available), Winner name or '--' if carryover, Value (pot amount), Notes ('Tied, carried' or score info). Show front 9 subtotal row after hole 9. Show back 9 subtotal row after hole 18. Show total row at bottom with any unsettled carryover noted. Use FlatList for performance. Carryover rows styled differently (italic, muted). Winner rows highlighted. Amounts formatted as currency."
```
**Deliverables:**
- [ ] `src/components/skins/SkinsResultsCard.tsx`
- [ ] Header with config summary
- [ ] Hole-by-hole table rows
- [ ] Front 9/Back 9 subtotals
- [ ] Total with carryover note
- [ ] Carryover styling

**Dependencies:** Task 5 (types)
**Estimated Time:** 3-4 hours

---

### Task 16: SkinsSettlementCard Component
**Status:** Not Started
**Command:**
```bash
/component "SkinsSettlementCard - Final settlement showing who owes who. Props: payouts (SkinsPayoutWithPlayer[]), game (SkinsGame). Layout: Card with header 'SETTLEMENT SUMMARY'. (1) TOTALS WON section - table with Player name, Amount Won columns, sorted by total_winnings DESC. (2) WHO OWES WHO section - calculated from payouts, shows list of 'PlayerA owes PlayerB: $X' entries, minimize transactions using debt simplification algorithm. (3) If any unsettled carryover, show UNSETTLED POT section with note 'Suggestion: Split evenly ($X each)'. (4) Action buttons: 'Mark as Settled' (future feature, disabled for now), 'Share Results' (uses Share API). Import debt calculation from skinsCalculations.ts."
```
**Deliverables:**
- [ ] `src/components/skins/SkinsSettlementCard.tsx`
- [ ] Totals won table
- [ ] Who owes who calculation
- [ ] Unsettled pot display
- [ ] Share button

**Dependencies:** Task 7 (calculations), Task 5 (types)
**Estimated Time:** 3-4 hours

---

### Task 17: Add Debt Calculation Utility
**Status:** Not Started
**Command:**
```bash
/refactor "Add debt simplification to src/utils/skinsCalculations.ts. New functions: (1) calculateNetPositions(payouts: SkinsPayout[]) - returns array of {playerId, netAmount} where netAmount = total_winnings - buy_in. (2) simplifyDebts(netPositions: array) - implements debt simplification algorithm: separate into creditors (positive) and debtors (negative), sort both by amount, match largest debtor to largest creditor, create transaction, reduce amounts, repeat until all settled. Returns array of {fromPlayerId, toPlayerId, amount}. (3) formatDebtTransactions(transactions, playerMap) - returns human-readable strings like 'PlayerA owes PlayerB: $X'. Add tests for edge cases: all tied (no transactions), one winner takes all, complex multi-way splits."
```
**Deliverables:**
- [ ] `calculateNetPositions()` function
- [ ] `simplifyDebts()` function
- [ ] `formatDebtTransactions()` function
- [ ] Edge case handling

**Dependencies:** Task 7
**Estimated Time:** 2-3 hours

---

## Sprint 8: Screen Integration

### Task 18: Update AddRoundScreen with Skins
**Status:** Not Started
**Command:**
```bash
/refactor "Update src/screens/admin/AddRoundScreen/index.tsx to add skins configuration. Import SkinsSection, SkinsConfigBottomSheet, SkinsDisclaimerModal from @/components/skins. Add form state: skinsEnabled (boolean), skinsConfig ({potType, potValue, scoringType} or null). Add SkinsSection after RoundGameTypeSelector, before ScoringPairsSection. Wire up toggle to set skinsEnabled. When toggling on: check AsyncStorage for disclaimer acceptance, show SkinsDisclaimerModal if not accepted, show SkinsConfigBottomSheet after acceptance. On config save, update skinsConfig state. On round creation, if skinsEnabled && skinsConfig, call createSkinsGame mutation after round is created using the new round_id. Handle errors gracefully with Alert."
```
**Deliverables:**
- [ ] SkinsSection added to form
- [ ] skinsEnabled and skinsConfig state
- [ ] Disclaimer modal flow
- [ ] Config bottom sheet flow
- [ ] Create skins game on round submit

**Dependencies:** Tasks 10, 11, 12 (components)
**Estimated Time:** 3-4 hours

---

### Task 19: Update ReviewScorecardScreen with Skins Tab
**Status:** Not Started
**Command:**
```bash
/refactor "Update src/screens/scoring/ReviewScorecardScreen/index.tsx to add skins results display. Import SkinsResultsCard, SkinsSettlementCard from @/components/skins. Import useSkinsSummary hook. Add tab navigation at top: 'Scorecard' | 'Skins' (only show Skins tab if skins game exists for round). On Skins tab: fetch skins summary using useSkinsSummary(skinsGameId). Show loading state while fetching. Render SkinsResultsCard with results data. Render SkinsSettlementCard with payouts data below. Handle empty state if skins game exists but no results yet. Call finalize mutation when scorecard is submitted if skins game active."
```
**Deliverables:**
- [ ] Tab navigation added
- [ ] Skins tab conditional render
- [ ] SkinsResultsCard integration
- [ ] SkinsSettlementCard integration
- [ ] Finalize on submit

**Dependencies:** Tasks 15, 16 (components), Task 9 (hooks)
**Estimated Time:** 3-4 hours

---

## Sprint 9: Score Processing Integration

### Task 20: Integrate Skins with Score Submission
**Status:** Not Started
**Command:**
```bash
/refactor "Update score submission flow to process skins results. In src/store/scorecardStore.ts or relevant score submission hook: after saving hole scores, check if round has active skins game via useSkinsGamesByRound. If skins game exists and all participants have scores for current hole, call processSkinsHole mutation with prepared hole scores (using prepareHoleScores utility). Handle errors gracefully - skins processing failure should not block scorecard save. When all 18 holes complete and scorecard submitted, call finalizeSkinsGame. Update src/hooks/useSkins.ts to export a convenience hook useProcessSkinsIfNeeded(roundId) that encapsulates this logic. Consider offline support - queue skins processing for when online."
```
**Deliverables:**
- [ ] Score submission triggers skins processing
- [ ] All participants checked before processing
- [ ] Graceful error handling
- [ ] Finalize on completion
- [ ] Offline queue consideration

**Dependencies:** Task 9 (hooks), Task 7 (calculations)
**Estimated Time:** 3-4 hours

---

## Sprint 10: Documentation

### Task 21: Documentation Update
**Status:** Not Started
**Command:**
```bash
/docs "Update documentation for skins gambling feature. Files: (1) docs/database/DATABASE_SCHEMA.md - add skins_games, skins_results, skins_payouts tables with columns, constraints, RLS policies, indexes, all database functions. (2) CLAUDE.md - add 'Skins Game' to Data Model section explaining side-game concept, add to Documentation Map. (3) Create docs/guides/SKINS_GAME.md - comprehensive guide explaining skins concept, configuration options, carryover rules, settlement calculation, UI flow, database schema, API reference. Include examples with numbers. (4) Update docs/guides/SUBSCRIPTION_TIERS.md to mention skins as Premium feature."
```
**Deliverables:**
- [ ] `docs/database/DATABASE_SCHEMA.md` updated
- [ ] `CLAUDE.md` updated
- [ ] `docs/guides/SKINS_GAME.md` created
- [ ] `docs/guides/SUBSCRIPTION_TIERS.md` updated

**Dependencies:** All previous tasks
**Estimated Time:** 2-3 hours

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 21
- **Completed:** 3 (14%) - Tasks 1, 2, 3 combined in single migration + TypeScript types
- **In Progress:** 0 (0%)
- **Not Started:** 18 (86%)

### Sprint Progress

**Sprint 1: Database Foundation** - Partially Complete (75%)
- Task 1: Database Migration - Tables ✅
- Task 2: Database Migration - RLS ✅ (combined with Task 1)
- Task 3: Database Migration - Tier Limits ✅ (combined with Task 1)
- Task 4: Database Functions - Not Started

**Sprint 2: TypeScript Types** - Complete (100%)
- Task 5: Skins Type Definitions ✅ (created `src/types/database/skins.types.ts`)
- Task 6: Update Enums and Exports ✅ (updated `enums.ts` and `index.ts`)

**Sprint 3: Calculation Utilities** - Not Started
- Task 7: Skins Calculation Utilities

**Sprint 4: React Query Hooks** - Not Started
- Task 8: Query Keys
- Task 9: Skins Query Hooks

**Sprint 5: UI Components - Setup** - Not Started
- Task 10: SkinsSection
- Task 11: SkinsConfigBottomSheet
- Task 12: SkinsDisclaimerModal

**Sprint 6: UI Components - Scoring** - Not Started
- Task 13: SkinsIndicator
- Task 14: Update ScorecardEntryScreen

**Sprint 7: UI Components - Results** - Not Started
- Task 15: SkinsResultsCard
- Task 16: SkinsSettlementCard
- Task 17: Debt Calculation Utility

**Sprint 8: Screen Integration** - Not Started
- Task 18: Update AddRoundScreen
- Task 19: Update ReviewScorecardScreen

**Sprint 9: Score Processing Integration** - Not Started
- Task 20: Integrate with Score Submission

**Sprint 10: Documentation** - Not Started
- Task 21: Documentation Update

---

## Critical Files

### New Files (Created)
| File | Purpose | Status |
|------|---------|--------|
| `supabase/migrations/20260105000000_skins_games.sql` | Database migration (tables, RLS, tier limits) | ✅ Created |
| `src/types/database/skins.types.ts` | TypeScript type definitions | ✅ Created |
| `src/utils/skinsCalculations.ts` | Pure calculation functions |
| `src/hooks/useSkins.ts` | TanStack Query hooks |
| `src/components/skins/SkinsSection.tsx` | Round setup toggle |
| `src/components/skins/SkinsConfigBottomSheet.tsx` | Configuration UI |
| `src/components/skins/SkinsDisclaimerModal.tsx` | Legal disclaimer |
| `src/components/skins/SkinsIndicator.tsx` | Scoring header icon |
| `src/components/skins/SkinsResultsCard.tsx` | Hole-by-hole results |
| `src/components/skins/SkinsSettlementCard.tsx` | Settlement summary |
| `src/components/skins/index.ts` | Barrel export |
| `docs/guides/SKINS_GAME.md` | Feature documentation |

### Modified Files
| File | Changes | Status |
|------|---------|--------|
| `src/types/database/enums.ts` | Added 'skins' to TierFeature union | ✅ Updated |
| `src/types/database/index.ts` | Export all skins types | ✅ Updated |
| `src/types/index.ts` | Re-export skins types | Pending |
| `src/hooks/queryKeys.ts` | Add skinsKeys |
| `src/hooks/index.ts` | Export skins hooks |
| `src/utils/index.ts` | Export skins calculations |
| `src/screens/admin/AddRoundScreen/index.tsx` | Add skins setup |
| `src/screens/scoring/ScorecardEntryScreen/index.tsx` | Add indicator |
| `src/screens/scoring/ReviewScorecardScreen/index.tsx` | Add results tab |
| `docs/database/DATABASE_SCHEMA.md` | Document skins tables |
| `CLAUDE.md` | Brief mention |

---

## Time Estimates

| Sprint | Tasks | Estimated Hours |
|--------|-------|-----------------|
| Sprint 1: Database | 4 | 7-10 hours |
| Sprint 2: Types | 2 | 1.5-2.5 hours |
| Sprint 3: Calculations | 1 | 3-4 hours |
| Sprint 4: Hooks | 2 | 3.5-4.5 hours |
| Sprint 5: Setup UI | 3 | 7-10 hours |
| Sprint 6: Scoring UI | 2 | 3-5 hours |
| Sprint 7: Results UI | 3 | 8-11 hours |
| Sprint 8: Integration | 2 | 6-8 hours |
| Sprint 9: Processing | 1 | 3-4 hours |
| Sprint 10: Docs | 1 | 2-3 hours |

**Total Estimated:** 44-62 hours

---

## Key Design Decisions

1. **Add-on not Game Type**: Skins is an overlay feature, not a replacement for Stableford/Stroke
2. **Participants = Pairing**: All players in a pairing participate (no opt-out for MVP)
3. **Hole 18 Split**: Simplest fair resolution for end-of-round carryover
4. **Premium Only**: Gambling features gated to paid tier
5. **Disclaimer Required**: Legal protection via acknowledgment flow
6. **Client-side Calculations**: Pure functions for testability, DB functions for consistency
7. **Real-time Optional**: Results calculated per-hole but can be batch-processed

---

## Command Usage Reference

| Command | Use For |
|---------|---------|
| `/db` | Database schema design and migrations |
| `/component` | Reusable UI components |
| `/screen` | Full screen implementations |
| `/hook` | TanStack Query hooks |
| `/refactor` | Modifying existing code, utilities |
| `/docs` | Documentation updates |

---

**Last Updated:** 2026-01-05
**Next Review:** After completing Sprint 1
**Current Sprint:** Sprint 1 (Database Foundation) - 75% complete
