# Skins Game - Phase 1 Implementation Plan

**Goal:** Add core Skins side-game feature with per-round configuration, hole-by-hole tracking, and settlement display
**Status:** Not Started - 0% (0/28 tasks)

---

## Overview

This plan implements **Phase 1** of the Skins gambling feature - a side-game that runs alongside any existing game type (Stableford, Stroke Play, etc.) where players compete hole-by-hole for a pot of money. Tied holes result in carryover to the next hole.

### Key Features
- **Per-round configuration** - Skins enabled/configured at the round level
- **Works for ANY round** - Standalone rounds AND competition rounds
- **Pot configuration** - Per-hole value OR total pot amount
- **Scoring type** - Configurable gross or net scoring
- **Carryover logic** - Tied holes roll money to next hole
- **Hole 18 split** - Any remaining carryover splits evenly
- **Premium tier** - Requires Premium subscription
- **Gambling disclaimer** - Legal acknowledgment required

### Configuration Locations

| Round Type | Where to Configure Skins |
|------------|-------------------------|
| **Standalone Rounds** | CreateRoundBottomSheet (ScoringSetupStep) |
| **Competition Rounds** | AddRoundScreen / EditRoundScreen |

### Round-Level Skins Configuration

Each round can independently have skins enabled with its own configuration:
- **Pot Type**: Per-hole ($X per hole) OR Total pot ($Y for 18 holes)
- **Pot Value**: Dollar amount
- **Scoring Type**: Gross (raw strokes) OR Net (handicap-adjusted)
- **Pool Source** (competition rounds only, Phase 2): Direct pot OR from competition prize pool

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
**Status:** Not Started
**Command:**
```bash
/db "Create migration for skins gambling feature. New tables: (1) skins_games - id UUID PK, round_id UUID FK to rounds ON DELETE CASCADE, pairing_id UUID FK to pairings NULL, participant_ids UUID[] NOT NULL with CHECK array_length BETWEEN 2 AND 4, pot_type TEXT NOT NULL CHECK IN ('per_hole', 'total_pot'), pot_value DECIMAL(10,2) NOT NULL CHECK > 0, currency TEXT DEFAULT 'AUD', scoring_type TEXT NOT NULL CHECK IN ('gross', 'net') DEFAULT 'gross', pool_source TEXT CHECK IN ('direct', 'prize_pool') DEFAULT 'direct', status TEXT DEFAULT 'active' CHECK IN ('active', 'completed', 'cancelled'), disclaimer_accepted_at TIMESTAMPTZ NOT NULL, disclaimer_accepted_by UUID FK to players NOT NULL, created_by UUID FK to players NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), completed_at TIMESTAMPTZ NULL. (2) skins_results - id UUID PK, skins_game_id UUID FK to skins_games ON DELETE CASCADE, hole_number INTEGER NOT NULL CHECK BETWEEN 1 AND 18, winner_id UUID FK to players NULL (null if carryover), is_carryover BOOLEAN DEFAULT FALSE, hole_scores JSONB NOT NULL (format: player_id -> {gross, net, strokes_received}), hole_pot_value DECIMAL(10,2) NOT NULL, carryover_to_next DECIMAL(10,2) DEFAULT 0, payout_amount DECIMAL(10,2) DEFAULT 0, calculated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (skins_game_id, hole_number). (3) skins_payouts - id UUID PK, skins_game_id UUID FK ON DELETE CASCADE, player_id UUID FK to players, buy_in DECIMAL(10,2) NOT NULL, total_winnings DECIMAL(10,2) DEFAULT 0, net_result DECIMAL(10,2) DEFAULT 0, holes_won INTEGER DEFAULT 0, holes_tied INTEGER DEFAULT 0, holes_lost INTEGER DEFAULT 0, calculated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (skins_game_id, player_id). Add indexes on all foreign keys and status columns. Add updated_at trigger on skins_games."
```
**Deliverables:**
- [ ] `supabase/migrations/XXXXXXXX_skins_games.sql`
- [ ] `skins_games` table with all constraints
- [ ] `skins_results` table with unique constraint
- [ ] `skins_payouts` table with unique constraint
- [ ] Indexes for efficient lookups
- [ ] Updated_at trigger

**Dependencies:** None

---

### Task 2: Database Migration - RLS Policies
**Status:** Not Started
**Command:**
```bash
/db "Add RLS policies for skins tables. skins_games: enable RLS, policy 'participants_view_games' SELECT using auth.uid() = ANY(participant_ids), policy 'creators_manage_games' ALL using created_by = auth.uid(), policy 'round_organizers_manage' ALL using round_id IN (SELECT r.id FROM rounds r WHERE r.competition_id IN (SELECT c.id FROM competitions c WHERE c.organizer_id = auth.uid()) OR r.user_id = auth.uid()). skins_results: enable RLS, policy 'participants_view_results' SELECT using skins_game_id IN (SELECT id FROM skins_games WHERE auth.uid() = ANY(participant_ids)), policy 'creators_manage_results' ALL using skins_game_id IN (SELECT id FROM skins_games WHERE created_by = auth.uid()). skins_payouts: enable RLS, policy 'players_view_own_payouts' SELECT using player_id = auth.uid(), policy 'participants_view_game_payouts' SELECT using skins_game_id IN (SELECT id FROM skins_games WHERE auth.uid() = ANY(participant_ids)), policy 'creators_manage_payouts' ALL using skins_game_id IN (SELECT id FROM skins_games WHERE created_by = auth.uid())."
```
**Deliverables:**
- [ ] RLS enabled on all 3 tables
- [ ] SELECT policies for participants
- [ ] ALL policies for game creators
- [ ] Organizer override policies (both competition and standalone round owners)

**Dependencies:** Task 1

---

### Task 3: Database Migration - Tier Limits Update
**Status:** Not Started
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

---

## Sprint 2: TypeScript Types

### Task 5: Skins Type Definitions
**Status:** Not Started
**Command:**
```bash
/refactor "Create src/types/database/skins.types.ts with TypeScript types. Types: SkinsPotType = 'per_hole' | 'total_pot', SkinsScoringType = 'gross' | 'net', SkinsGameStatus = 'active' | 'completed' | 'cancelled', SkinsPoolSource = 'direct' | 'prize_pool'. Interfaces: SkinsHoleScoreData (gross number, net number, strokes_received number), SkinsHoleScores = Record<string, SkinsHoleScoreData>. SkinsGame (id, round_id, pairing_id nullable, participant_ids string[], pot_type, pot_value number, currency string, scoring_type, pool_source, status, disclaimer_accepted_at string, disclaimer_accepted_by string, created_by string, created_at, updated_at, completed_at nullable). SkinsGameWithParticipants extends SkinsGame with participants array of {id, name, handicap}. SkinsResult (id, skins_game_id, hole_number, winner_id nullable, is_carryover boolean, hole_scores SkinsHoleScores, hole_pot_value, carryover_to_next, payout_amount, calculated_at). SkinsResultWithWinner extends with winner object nullable. SkinsPayout (id, skins_game_id, player_id, buy_in, total_winnings, net_result, holes_won, holes_tied, holes_lost, calculated_at). SkinsPayoutWithPlayer extends with player object. CreateSkinsGameInput (round_id, pairing_id optional, participant_ids, pot_type, pot_value, currency optional, scoring_type, pool_source optional). ProcessSkinsHoleInput (skins_game_id, hole_number, hole_scores). SkinsGameSummary (game, results array, payouts array, current_carryover, holes_completed, total_pot, per_hole_value). SkinsConfig (pot_type, pot_value, currency, scoring_type). Export all from src/types/database/index.ts."
```
**Deliverables:**
- [ ] `src/types/database/skins.types.ts`
- [ ] All type definitions (enums, game, result, payout interfaces)
- [ ] Input types for mutations (`CreateSkinsGameInput`, `ProcessSkinsHoleInput`)
- [ ] Summary type for UI display (`SkinsGameSummary`, `SkinsConfig`)
- [ ] Export from `src/types/database/index.ts`

**Dependencies:** Task 1 (schema reference)

---

### Task 6: Update Enums and Index Exports
**Status:** Not Started
**Command:**
```bash
/refactor "Update src/types/database/enums.ts to add skins enums: export type SkinsPotType, SkinsScoringType, SkinsGameStatus, SkinsPoolSource from skins.types.ts. Add 'skins' to TierFeature union type. Update src/types/index.ts to re-export all skins types. Ensure types match database schema exactly."
```
**Deliverables:**
- [ ] Enums re-exported in `src/types/database/enums.ts`
- [ ] 'skins' added to TierFeature
- [ ] All skins types exported from `src/types/index.ts`

**Dependencies:** Task 5

---

## Sprint 3: Calculation Utilities

### Task 7: Skins Calculation Utilities
**Status:** Not Started
**Command:**
```bash
/refactor "Create src/utils/skinsCalculations.ts with pure calculation functions. Import Hole type from types. Functions: (1) calculateHoleValue(potType, potValue) - returns potValue if per_hole, potValue/18 rounded to 2 decimals if total_pot. (2) calculateTotalPot(potType, potValue) - returns potValue*18 if per_hole, potValue if total_pot. (3) calculateBuyIn(potType, potValue, participantCount) - calculates total pot / participants rounded to 2 decimals. (4) prepareHoleScores(participants array with id/handicap, scorecards Record with strokes, hole Hole) - calculates gross, net, strokes_received for each participant, returns SkinsHoleScores. (5) determineHoleWinner(holeScores, scoringType) - finds minimum score, counts players with that score, returns {winnerId nullable, isCarryover boolean, minScore, tiedPlayerIds array}. (6) calculateCurrentCarryover(results SkinsResult[]) - gets carryover from last result. (7) processHoleResult(holeNumber, holeScores, baseHoleValue, currentCarryover, scoringType) - returns result object without id/skins_game_id. (8) calculateHole18Split(carryoverAmount, participantCount) - splits evenly rounded to 2 decimals. (9) calculateFinalPayouts(game, results, participants) - calculates buy_in, winnings, net_result, holes stats for each participant. (10) validateSkinsGame(participantIds, potValue) - returns {isValid, errors array}. (11) validateHoleScores(holeScores, participantIds) - returns {isValid, missingPlayerIds}. (12) calculateNetPositions(payouts) - returns net positions for debt calculation. (13) simplifyDebts(netPositions) - minimizes transactions. (14) formatDebtTransactions(transactions, playerMap) - human-readable strings. All functions with JSDoc documentation and examples. Export from src/utils/index.ts."
```
**Deliverables:**
- [ ] `src/utils/skinsCalculations.ts`
- [ ] All calculation functions (14 total)
- [ ] Input validation functions
- [ ] Debt simplification utilities
- [ ] JSDoc documentation with examples
- [ ] Export from `src/utils/index.ts`

**Dependencies:** Task 5 (types)

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
- [ ] Exported and added to `allQueryKeys` array

**Dependencies:** None

---

### Task 9: Skins Query Hooks
**Status:** Not Started
**Command:**
```bash
/hook "Create src/hooks/useSkins.ts with TanStack Query hooks for skins. Queries: (1) useSkinsGame(gameId) - fetches skins_game with participant details via join, returns SkinsGameWithParticipants, staleTime 30s. (2) useSkinsGamesByRound(roundId) - fetches all skins games for round with participants, returns array, staleTime 30s. (3) useSkinsResults(gameId) - fetches skins_results with winner player details ordered by hole_number, staleTime 10s. (4) useSkinsPayouts(gameId) - fetches skins_payouts with player details ordered by net_result DESC, staleTime 30s. (5) useSkinsSummary(gameId) - combines game, results, payouts with calculated current_carryover, holes_completed, total_pot, per_hole_value, staleTime 10s. Mutations: (6) useCreateSkinsGame() - inserts skins_game with disclaimer timestamp, invalidates gamesByRound. (7) useProcessSkinsHole() - calls process_skins_hole RPC, invalidates results and summary. (8) useFinalizeSkinsGame() - calls finalize_skins_game RPC, invalidates all skins queries for game. (9) useCancelSkinsGame() - updates status to cancelled, invalidates game. Utility: (10) useCanUseSkins(userId) - calls user_has_feature RPC with 'skins', staleTime 5min. (11) useActiveSkinsGameForRound(roundId) - convenience hook to get active skins game for a round. (12) useProcessSkinsIfNeeded(roundId) - encapsulates skins processing logic with offline queue. Export all hooks and add to src/hooks/index.ts."
```
**Deliverables:**
- [ ] `src/hooks/useSkins.ts`
- [ ] 5 query hooks
- [ ] 4 mutation hooks
- [ ] 3 utility hooks
- [ ] Export from `src/hooks/index.ts`

**Dependencies:** Task 5 (types), Task 8 (query keys)

---

## Sprint 5: UI Components - Setup

### Task 10: SkinsConfigBottomSheet Component
**Status:** Not Started
**Command:**
```bash
/component "SkinsConfigBottomSheet - Configure skins game settings. Props: visible (boolean), onDismiss (() => void), initialConfig (SkinsConfig nullable), onSave ((config: SkinsConfig) => void). Use BottomSheet component with snapPoints ['65%']. Layout: (1) Header 'Skins Configuration' with X close button. (2) POT SETUP section with TextInput for dollar amount, radio buttons for 'Per Hole' vs 'Total Pot', calculated display showing 'x 18 = $Y total' or '/ 18 = $Y per hole'. (3) SCORING TYPE section with radio buttons 'Gross' (raw strokes) and 'Net' (with handicap). (4) PARTICIPANTS info text 'All players in your group participate'. (5) Save button at bottom. Validation: amount > 0, max $100 per hole. Use React Hook Form + Zod for form state. Follow existing BottomSheet patterns."
```
**Deliverables:**
- [ ] `src/components/skins/SkinsConfigBottomSheet.tsx`
- [ ] Pot type selection (per-hole/total)
- [ ] Amount input with validation
- [ ] Scoring type selection (gross/net)
- [ ] Calculated display
- [ ] Form validation using React Hook Form + Zod
- [ ] Export added to `src/components/skins/index.ts`

**Dependencies:** Task 5 (types)

---

### Task 11: SkinsDisclaimerModal Component
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
- [ ] Helper functions: `hasAcceptedSkinsDisclaimer()`, `clearSkinsDisclaimerAcceptance()`

**Dependencies:** None

---

## Sprint 6: UI Components - Scoring

### Task 12: SkinsIndicator Component
**Status:** Not Started
**Command:**
```bash
/component "SkinsIndicator - Small indicator for scorecard header showing skins is active. Props: roundId (string), onPress (() => void optional). Use useActiveSkinsGameForRound(roundId) to check if active skins game exists. If no active game, return null. Layout: Small dice icon with badge showing current carryover holes if > 0. On press, show tooltip/popover with quick summary: 'Pot: $X/hole', 'Carryover: $Y (Z holes)', 'Last winner: PlayerName (Hole N)'. Use useSkinsSummary() for data. Icon color from theme primary. Tooltip follows existing tooltip patterns in codebase."
```
**Deliverables:**
- [ ] `src/components/skins/SkinsIndicator.tsx`
- [ ] Conditional render if skins active
- [ ] Dice icon with carryover badge
- [ ] Press handler for summary
- [ ] Tooltip/popover display

**Dependencies:** Task 9 (hooks)

---

### Task 13: Update ScorecardEntryScreen Header
**Status:** Not Started
**Command:**
```bash
/refactor "Update src/screens/scoring/ScorecardEntryScreen to add SkinsIndicator to header. Import SkinsIndicator from @/components/skins. In header right section (next to sync icon), add SkinsIndicator with roundId from route params. Pass onPress handler that navigates to future SkinsTrackerScreen (for now, just shows alert with 'Skins tracking coming soon'). Only show if round has skins enabled - check via useActiveSkinsGameForRound hook. Ensure header layout accommodates new icon without breaking existing sync indicator."
```
**Deliverables:**
- [ ] SkinsIndicator added to header
- [ ] Conditional render based on skins status
- [ ] Press handler
- [ ] Header layout adjusted

**Dependencies:** Task 12 (SkinsIndicator)

---

## Sprint 7: UI Components - Results

### Task 14: SkinsResultsCard Component
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
- [ ] FlatList for performance

**Dependencies:** Task 5 (types)

---

### Task 15: SkinsSettlementCard Component
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

---

### Task 15a: Add Skins Indicator to CompetitionRoundCard
**Status:** Not Started
**Command:**
```bash
/refactor "Update src/components/competitions/detail/CompetitionRoundCard.tsx to show skins game indicator. Add optional hasSkins (boolean) and skinsConfig (SkinsConfig nullable) props to CompetitionRoundCardProps. Update RoundWithCourse type to include has_skins and skins_config fields. When hasSkins is true, display a skins indicator in the badgeRow: use dice icon (IconDice or similar from tabler-icons) with amber/gold background. Show pot value tooltip on press (e.g., '$5/hole'). Add indicator text below the date showing 'Skins: $X/hole' or 'Skins: $Y total'. Ensure indicator is visually distinct but not overpowering. Update accessibility labels."
```
**Deliverables:**
- [ ] `hasSkins` and `skinsConfig` props added to `CompetitionRoundCardProps`
- [ ] Update `RoundWithCourse` type in `types.ts`
- [ ] Dice icon badge in badgeRow when skins enabled
- [ ] Pot value display (e.g., 'Skins: $5/hole')
- [ ] Amber/gold styling for skins indicator
- [ ] Updated accessibility labels

**Dependencies:** Task 5 (SkinsConfig type)

---

## Sprint 8: Round Creation Integration - Standalone Rounds

### Task 16: Extend WizardData Types for Skins
**Status:** Not Started
**Command:**
```bash
/refactor "Add standalone skins types to src/screens/rounds/CreateRoundBottomSheet/types.ts. Add new interface StandaloneSkinsConfig { enabled: boolean, config: SkinsConfig } where SkinsConfig is imported from '@/types'. Extend WizardData interface to add: skinsEnabled: boolean (default false), skinsConfig: SkinsConfig | null (default null). Update CreateRoundBottomSheetProps.onStartRound signature to include optional skinsConfig?: StandaloneSkinsConfig as the last parameter. Export StandaloneSkinsConfig from the file."
```
**Deliverables:**
- [ ] `StandaloneSkinsConfig` interface
- [ ] `skinsEnabled` and `skinsConfig` in `WizardData`
- [ ] Updated `onStartRound` callback signature
- [ ] Export added

**Dependencies:** Task 5 (SkinsConfig type)

---

### Task 17: Add Skins State Handlers to Wizard Hook
**Status:** Not Started
**Command:**
```bash
/refactor "Update src/screens/rounds/CreateRoundBottomSheet/hooks/useCreateRoundWizard.ts to add skins state management. (1) Update initialData to include skinsEnabled: false, skinsConfig: null. (2) Add setSkinsEnabled callback: toggles skinsEnabled, resets skinsConfig to null when disabled. (3) Add handleSkinsConfigChange callback: updates skinsConfig with new SkinsConfig value. (4) Update handleStartScoring to build standaloneSkinsConfig object when skins is enabled and config exists, pass to onStartRound callback as last parameter. (5) Add setSkinsEnabled and handleSkinsConfigChange to UseCreateRoundWizardReturn interface and return object."
```
**Deliverables:**
- [ ] `skinsEnabled` and `skinsConfig` in `initialData`
- [ ] `setSkinsEnabled` callback
- [ ] `handleSkinsConfigChange` callback
- [ ] Updated `handleStartScoring` to pass skins config
- [ ] Updated return type and values

**Dependencies:** Task 16

---

### Task 18: Add Skins Section to ScoringSetupStep
**Status:** Not Started
**Command:**
```bash
/refactor "Add skins configuration section to src/screens/rounds/CreateRoundBottomSheet/steps/ScoringSetupStep.tsx. Add new props: skinsEnabled (boolean), skinsConfig (SkinsConfig | null), onSkinsEnabledChange ((enabled: boolean) => void), onSkinsConfigChange ((config: SkinsConfig) => void). Import SkinsConfigBottomSheet and SkinsDisclaimerModal and hasAcceptedSkinsDisclaimer from @/components/skins. Add local state: showSkinsConfigSheet (boolean), showSkinsDisclaimer (boolean). Add skins section AFTER scoring pairs section with condition selectedPartners.length >= 1 (requires 2+ players). Layout: (1) Divider. (2) If isPremium: TouchableOpacity toggle with dice icon (amber when enabled), 'Add Skins Game' label, 'Hole-by-hole betting between players' description, checkbox on right. (3) If not isPremium: locked state with lock icon and Premium badge. (4) When skinsEnabled && skinsConfig: show config summary card with pot value, pot type, scoring type, tap to edit. (5) SkinsConfigBottomSheet with visible=showSkinsConfigSheet. (6) SkinsDisclaimerModal with visible=showSkinsDisclaimer. On toggle enable: check hasAcceptedSkinsDisclaimer(), if not accepted show disclaimer modal, on accept show config sheet, on save config call onSkinsConfigChange and onSkinsEnabledChange(true)."
```
**Deliverables:**
- [ ] New skins props added to interface
- [ ] Skins toggle UI (Premium and locked states)
- [ ] Config summary display when enabled
- [ ] SkinsConfigBottomSheet integration
- [ ] SkinsDisclaimerModal integration
- [ ] Disclaimer flow (first-time check)
- [ ] Only shown for 2+ players

**Dependencies:** Task 10, Task 11 (UI components), Task 17

---

### Task 19: Pass Skins Props Through Bottom Sheet
**Status:** Not Started
**Command:**
```bash
/refactor "Update src/screens/rounds/CreateRoundBottomSheet/index.tsx to pass skins props to ScoringSetupStep. In the scoringSetup step render, add props: skinsEnabled={wizard.data.skinsEnabled}, skinsConfig={wizard.data.skinsConfig}, onSkinsEnabledChange={wizard.setSkinsEnabled}, onSkinsConfigChange={wizard.handleSkinsConfigChange}. Ensure StandaloneSkinsConfig is exported from index.tsx via 'export type { StandaloneSkinsConfig } from ./types'."
```
**Deliverables:**
- [ ] Skins props passed to ScoringSetupStep
- [ ] `StandaloneSkinsConfig` type exported

**Dependencies:** Task 18

---

### Task 20: Create skins_games Record on Round Start
**Status:** Not Started
**Command:**
```bash
/refactor "Update src/screens/rounds/RoundListScreen/hooks/useStartNewRound.ts to create skins_games record when skins is enabled. Import StandaloneSkinsConfig from CreateRoundBottomSheet types, useAuth hook. Update handleStartNewRound function signature to accept optional skinsConfig?: StandaloneSkinsConfig as last parameter. After creating round_players records, add skins game creation: if skinsConfig?.enabled && skinsConfig.config && partners.length >= 1 && user?.id, insert into skins_games table with fields: round_id (from newly created round), pairing_id: null, participant_ids: [user.id, ...partners.map(p => p.id)], pot_type: skinsConfig.config.pot_type, pot_value: skinsConfig.config.pot_value, currency: skinsConfig.config.currency ?? 'AUD', scoring_type: skinsConfig.config.scoring_type, pool_source: 'direct', status: 'active', disclaimer_accepted_at: new Date().toISOString(), disclaimer_accepted_by: user.id, created_by: user.id. Wrap in try/catch - log errors but don't fail round creation."
```
**Deliverables:**
- [ ] Updated function signature with `skinsConfig` parameter
- [ ] `skins_games` record creation logic
- [ ] Participant IDs array (current user + partners)
- [ ] Error handling (non-blocking)

**Dependencies:** Task 19

---

### Task 21: Wire Up onStartRound Callback
**Status:** Not Started
**Command:**
```bash
/refactor "Update src/screens/rounds/RoundListScreen/index.tsx to pass skinsConfig to handleStartNewRound. The callback should accept skinsConfig?: StandaloneSkinsConfig as the last parameter and forward it to the handleStartNewRound function from useStartNewRound hook. Verify the full data flow: CreateRoundBottomSheet → onStartRound callback → handleStartNewRound → database insert."
```
**Deliverables:**
- [ ] `onStartRound` callback updated to accept `skinsConfig`
- [ ] `skinsConfig` forwarded to `handleStartNewRound`
- [ ] Full data flow verified

**Dependencies:** Task 20

---

## Sprint 9: Competition Round Integration

### Task 22: Add Skins Section to AddRoundScreen
**Status:** Not Started
**Command:**
```bash
/refactor "Add skins configuration section to src/screens/admin/AddRoundScreen/index.tsx for competition rounds. Import SkinsConfigBottomSheet, SkinsDisclaimerModal, hasAcceptedSkinsDisclaimer from @/components/skins. Add skins state: skinsEnabled (boolean), skinsConfig (SkinsConfig | null), showSkinsConfigSheet, showSkinsDisclaimer. Add SkinsSection component (similar to ScoringSetupStep pattern) after game type selector. Layout: Toggle 'Enable Skins Game', config summary when enabled, configure button. Premium tier gating. Only show if round will have 2+ players (check if pairings/players configured). On save: include skins config in round creation payload. Create skins_games record after round is created if enabled."
```
**Deliverables:**
- [ ] Skins state management in AddRoundScreen
- [ ] SkinsSection UI component
- [ ] Premium tier gating
- [ ] Integration with round creation flow
- [ ] skins_games record created for competition rounds

**Dependencies:** Task 10, Task 11 (UI components), Task 9 (hooks)

---

### Task 23: Add Skins Section to EditRoundScreen
**Status:** Not Started
**Command:**
```bash
/refactor "Add skins configuration to src/screens/admin/EditRoundScreen (or AddRoundScreen if same screen handles edit). Load existing skins_games for the round via useActiveSkinsGameForRound. If round status is 'scheduled': allow editing skins config. If round has started: show read-only skins info with 'Cannot edit after round starts' message. On save: update existing skins_games record OR create new one if skins newly enabled OR delete if disabled. Handle the case where round already has scores - skins config locked."
```
**Deliverables:**
- [ ] Load existing skins config for round
- [ ] Edit mode for scheduled rounds
- [ ] Read-only mode for started rounds
- [ ] Update/create/delete skins_games on save
- [ ] Locking when round has started

**Dependencies:** Task 22

---

## Sprint 10: Score Processing Integration

### Task 24: Integrate Skins with Score Submission
**Status:** Not Started
**Command:**
```bash
/refactor "Update score submission flow to process skins results. In src/store/scorecardStore.ts or relevant score submission hook: after saving hole scores, check if round has active skins game via useActiveSkinsGameForRound. If skins game exists and all participants have scores for current hole, call processSkinsHole mutation with prepared hole scores (using prepareHoleScores utility). Handle errors gracefully - skins processing failure should not block scorecard save. When all 18 holes complete and scorecard submitted, call finalizeSkinsGame. Update src/hooks/useSkins.ts useProcessSkinsIfNeeded hook to encapsulate this logic. Consider offline support - queue skins processing for when online."
```
**Deliverables:**
- [ ] Score submission triggers skins processing
- [ ] All participants checked before processing
- [ ] Graceful error handling
- [ ] Finalize on completion
- [ ] Offline queue consideration

**Dependencies:** Task 9 (hooks), Task 7 (calculations)

---

### Task 25: Update ReviewScorecardScreen with Skins Tab
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

**Dependencies:** Task 14, Task 15 (components), Task 9 (hooks)

---

## Sprint 11: Testing & Documentation

### Task 26: Unit Tests for Skins Calculations
**Status:** Not Started
**Command:**
```bash
/test "Create comprehensive test suite for src/utils/skinsCalculations.ts. Test: (1) calculateHoleValue - per_hole returns exact value, total_pot divides by 18. (2) calculateTotalPot - inverse of above. (3) calculateBuyIn - correct division with rounding. (4) determineHoleWinner - single winner, tie detection, all tied. (5) processHoleResult - winner result, carryover result, accumulated carryover. (6) calculateHole18Split - even split, odd amounts. (7) calculateFinalPayouts - complete payout calculation. (8) simplifyDebts - 2-player, 4-player, complex scenarios. (9) Validation functions - valid/invalid inputs. Edge cases: all tied game, single winner takes all, zero pot (invalid)."
```
**Deliverables:**
- [ ] `src/__tests__/utils/skinsCalculations.test.ts`
- [ ] Tests for all 14+ functions
- [ ] Edge case coverage
- [ ] At least 90% code coverage

**Dependencies:** Task 7

---

### Task 27: Component Tests
**Status:** Not Started
**Command:**
```bash
/test-component "Test skins UI components. For SkinsConfigBottomSheet: renders with/without initial config, form validation, save callback. For SkinsDisclaimerModal: checkbox enables button, accept/cancel callbacks, AsyncStorage integration. For SkinsResultsCard: renders results, handles empty state, carryover styling. For SkinsSettlementCard: calculates debt correctly, share button works. For SkinsIndicator: shows/hides based on active game, badge displays carryover."
```
**Deliverables:**
- [ ] Component test files for all skins components
- [ ] Snapshot tests
- [ ] Interaction tests
- [ ] Mock hook data

**Dependencies:** Task 10-15 (all components)

---

### Task 28: Documentation Update
**Status:** Not Started
**Command:**
```bash
/docs "Update documentation for skins gambling feature. Files: (1) docs/database/DATABASE_SCHEMA.md - add skins_games, skins_results, skins_payouts tables with columns, constraints, RLS policies, indexes, all database functions. (2) CLAUDE.md - add 'Skins Game' to Data Model section explaining side-game concept, add to Documentation Map. (3) Create docs/guides/SKINS_GAME.md - comprehensive guide explaining skins concept, configuration options (per-round), carryover rules, settlement calculation, UI flow, database schema, API reference. Include examples with numbers. (4) Update docs/guides/SUBSCRIPTION_TIERS.md to mention skins as Premium feature."
```
**Deliverables:**
- [ ] `docs/database/DATABASE_SCHEMA.md` updated with skins tables, functions
- [ ] `CLAUDE.md` updated with SkinsGame entity
- [ ] `docs/guides/SKINS_GAME.md` created - comprehensive guide
- [ ] `docs/guides/SUBSCRIPTION_TIERS.md` updated with skins feature

**Dependencies:** All previous tasks

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 29
- **Completed:** 0 (0%)
- **In Progress:** 0 (0%)
- **Not Started:** 29 (100%)

### Sprint Progress

| Sprint | Description | Tasks | Status |
|--------|-------------|-------|--------|
| Sprint 1 | Database Foundation | 4 | Not Started |
| Sprint 2 | TypeScript Types | 2 | Not Started |
| Sprint 3 | Calculation Utilities | 1 | Not Started |
| Sprint 4 | React Query Hooks | 2 | Not Started |
| Sprint 5 | UI Components - Setup | 2 | Not Started |
| Sprint 6 | UI Components - Scoring | 2 | Not Started |
| Sprint 7 | UI Components - Results | 3 | Not Started |
| Sprint 8 | Standalone Rounds Integration | 6 | Not Started |
| Sprint 9 | Competition Rounds Integration | 2 | Not Started |
| Sprint 10 | Score Processing Integration | 2 | Not Started |
| Sprint 11 | Testing & Documentation | 3 | Not Started |

---

## Critical Files

### New Files (To Create)
| File | Purpose |
|------|---------|
| `supabase/migrations/XXXXXXXX_skins_games.sql` | Database migration |
| `src/types/database/skins.types.ts` | TypeScript type definitions |
| `src/utils/skinsCalculations.ts` | Pure calculation functions |
| `src/hooks/useSkins.ts` | TanStack Query hooks |
| `src/components/skins/SkinsConfigBottomSheet.tsx` | Configuration UI |
| `src/components/skins/SkinsDisclaimerModal.tsx` | Legal disclaimer |
| `src/components/skins/SkinsIndicator.tsx` | Scoring header icon |
| `src/components/skins/SkinsResultsCard.tsx` | Hole-by-hole results |
| `src/components/skins/SkinsSettlementCard.tsx` | Settlement summary |
| `src/components/skins/index.ts` | Barrel export |
| `docs/guides/SKINS_GAME.md` | Feature documentation |

### Files to Modify
| File | Changes |
|------|---------|
| `src/types/database/enums.ts` | Add skins enums |
| `src/types/database/index.ts` | Export skins types |
| `src/hooks/queryKeys.ts` | Add skinsKeys |
| `src/hooks/index.ts` | Export skins hooks |
| `src/utils/index.ts` | Export skins calculations |
| `src/screens/rounds/CreateRoundBottomSheet/types.ts` | Add skins to wizard |
| `src/screens/rounds/CreateRoundBottomSheet/hooks/useCreateRoundWizard.ts` | Skins state |
| `src/screens/rounds/CreateRoundBottomSheet/steps/ScoringSetupStep.tsx` | Skins UI |
| `src/screens/rounds/CreateRoundBottomSheet/index.tsx` | Pass skins props |
| `src/screens/rounds/RoundListScreen/hooks/useStartNewRound.ts` | Create skins record |
| `src/screens/rounds/RoundListScreen/index.tsx` | Forward skins config |
| `src/screens/admin/AddRoundScreen/index.tsx` | Competition round skins |
| `src/screens/scoring/ScorecardEntryScreen/index.tsx` | SkinsIndicator, processing |
| `src/screens/scoring/ReviewScorecardScreen/index.tsx` | Skins tab |
| `src/components/competitions/detail/CompetitionRoundCard.tsx` | Add skins indicator |
| `src/components/competitions/detail/types.ts` | Add skins fields to RoundWithCourse |
| `docs/database/DATABASE_SCHEMA.md` | Document skins tables |
| `CLAUDE.md` | Add skins to data model |
| `docs/guides/SUBSCRIPTION_TIERS.md` | Add skins as Premium feature |

---

## Key Design Decisions

1. **Per-Round Configuration**: Skins configured at round level, not competition level
2. **Works for Any Round**: Both standalone and competition rounds supported
3. **Pool Source**: Rounds can use direct pot OR draw from competition prize pool (Phase 2)
4. **Participants = Group**: All players in the round/pairing participate (no opt-out for MVP)
5. **Hole 18 Split**: Simplest fair resolution for end-of-round carryover
6. **Premium Only**: Gambling features gated to paid tier
7. **Disclaimer Required**: Legal protection via acknowledgment flow
8. **Non-blocking Skins**: Skins failures don't block scorecard saves
9. **Locking**: Skins config locked when round starts

---

**Last Updated:** 2026-01-09
**Status:** Not Started
**Current Sprint:** Sprint 1 - Database Foundation
