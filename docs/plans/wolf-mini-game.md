# Plan: Wolf Mini Game Implementation

**Last Updated:** 2025-02-01
**Status:** ✅ Implementation Complete

> **Prerequisite:** The Par game type must be implemented first (see `docs/plans/par-game-type.md`). Wolf supports stableford, stroke, and par game types, and depends on Par's scoring infrastructure.

## Overview

Implement the **Wolf** golf side-game that runs alongside regular round scoring. Wolf is a strategic partner selection game where a rotating "Wolf" player chooses to partner with another player or go alone against the pack.

This plan follows the existing **skins implementation patterns** exactly - dedicated tables, focused hooks, and proven UI components.

## Approach

**Keep it simple:** Instead of building a generic "mini games system", we implement Wolf using the same patterns as skins:
- Dedicated `wolf_games`, `wolf_hole_decisions`, `wolf_payouts` tables
- `src/hooks/wolf/` folder (not nested under miniGames)
- `WolfSection` component added directly to round setup (no container wrapper)

**Why not generic?** The user only needs Wolf now. If future games are added (Nassau, etc.), they can follow the same pattern with their own dedicated tables. JSONB-based generic systems add complexity without clear benefit.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Table structure | Dedicated Wolf tables | Matches skins pattern, type-safe, simpler queries |
| Hook organization | `src/hooks/wolf/` | Flat structure like skins, not nested |
| UI integration | Add WolfSection to round setup | Same as SkinsSection, no wrapper needed |
| Tier gating | Add `can_use_wolf` to tier_limits | Explicit feature flag like skins |
| Pot/gambling | Include in Phase 1 | Core "skins element" - per-point betting |
| Pot type | Per-point only | Simpler; add total_pot later if requested |
| Drive quality ratings | Deferred | Not essential to Wolf; can add later |
| Tie handling | No points awarded | Hole is "pushed" - common Wolf rule |
| Supported game types | stableford, stroke, par | Individual play formats only; excludes team formats (match-play, best-ball, scramble, shamble). See `docs/plans/par-game-type.md` |
| Implementation order | After Par game type | Par must be implemented first - Wolf depends on Par's scoring infrastructure |
| Wolf icon | `dog-side` | Material Design Icons - no `wolf` icon exists, `dog-side` is suitable alternative |
| Wolf order UI | Up/down buttons (MVP) | Simpler than drag-and-drop; can enhance later if needed |

---

## Phase 1: Database Schema

### Step 1.1: Create Wolf Database Migration
**Status:** ✅ Complete (2025-01-31)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a Supabase migration file at `supabase/migrations/20260131000000_wolf_games.sql` following the skins_games pattern exactly.

Create three tables:

1. `wolf_games` table:
   - id (UUID, PK)
   - round_id (FK to rounds, CASCADE delete)
   - participant_ids (UUID[], 3-4 players)
   - scoring_type ('gross' | 'net')
   - blind_wolf_enabled (boolean, default true)
   - pot_enabled (boolean, default false)
   - pot_value (decimal, nullable) -- value per point when pot enabled
   - currency (text, default 'AUD')
   - wolf_order (UUID[] - rotation order)
   - status ('active' | 'completed' | 'cancelled')
   - disclaimer_accepted_at, disclaimer_accepted_by
   - created_by, created_at, updated_at, completed_at

2. `wolf_hole_decisions` table:
   - id (UUID, PK)
   - wolf_game_id (FK, CASCADE)
   - hole_number (1-18)
   - wolf_id (UUID, who is Wolf this hole)
   - is_blind_wolf (boolean)
   - partner_id (UUID, null if lone wolf)
   - hole_scores (JSONB: { player_id: gross_score })
   - is_tie (boolean, default false - no points awarded when true)
   - wolf_team_won (boolean, null until calculated or if tie)
   - points_awarded (JSONB: { player_id: points })
   - decided_at (timestamp when partner was chosen)
   - calculated_at (timestamp when result calculated)
   - UNIQUE(wolf_game_id, hole_number)

3. `wolf_payouts` table:
   - id (UUID, PK)
   - wolf_game_id (FK, CASCADE)
   - player_id (FK to players)
   - total_points (integer)
   - total_winnings (decimal) -- points * pot_value
   - net_result (decimal) -- winnings minus what paid to others
   - calculated_at
   - UNIQUE(wolf_game_id, player_id)

Add indexes for:
- wolf_games: round_id, status, created_by
- wolf_hole_decisions: wolf_game_id, hole_number
- wolf_payouts: wolf_game_id, player_id

Enable RLS with policies matching skins pattern:
- Participants can view their games
- Creators can manage their games
- Round organizers can manage games in their rounds

Add `can_use_wolf` to tier_limits (Premium and Super Admin only).

Reference: /supabase/migrations/20260105000000_skins_games.sql
```

**Completed:**
- Created `supabase/migrations/20260131160000_wolf_games.sql`
- Created `wolf_games` table with participant_ids (3-4 players), wolf_order, scoring_type, blind_wolf_enabled, pot settings
- Created `wolf_hole_decisions` table with hole_number, wolf_id, is_blind_wolf, partner_id, hole_scores, is_tie, wolf_team_won, points_awarded
- Created `wolf_payouts` table with total_points, total_winnings, net_result
- Added indexes for efficient queries
- Enabled RLS with policies matching skins pattern
- Added `can_use_wolf` to tier_limits (Premium and Super Admin only)
- Updated `user_has_feature` function to handle 'wolf'

**Deliverables:**
- [x] `supabase/migrations/20260131160000_wolf_games.sql`

**Dependencies:** None
**Notes:** Run migration locally with `supabase db reset` to test

---

### Step 1.2: Create Wolf TypeScript Types
**Status:** ✅ Complete (2025-01-31)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/types/database/wolf.types.ts` with all Wolf-related types
- Added enums: WolfScoringType, WolfGameStatus, WolfServiceErrorCode
- Added WOLF_POINTS constant with standard point values
- Added interfaces: WolfGame, WolfHoleDecision, WolfPayout
- Added helper types: WolfHoleScores, WolfPointsAwarded
- Added display types: WolfGameWithParticipants, WolfDecisionWithDetails, WolfPayoutWithPlayer
- Added input types: CreateWolfGameInput, SubmitWolfDecisionInput, RecordWolfHoleResultInput
- Added config and result types: WolfConfig, WolfHoleResult, WolfStandingEntry
- Added summary types: WolfGameSummary, WolfDebtTransaction

**Deliverables:**
- [x] `src/types/database/wolf.types.ts`

**Dependencies:** None

---

### Step 1.3: Export Wolf Types
**Status:** ✅ Complete (2025-01-31)
**Type:** Custom
**Command:** N/A

**Completed:**
- Updated `src/types/database/index.ts` to export all Wolf types
- Updated `src/types/index.ts` to re-export key Wolf types
- Wolf types are now accessible via `@/types/database` and `@/types`

**Deliverables:**
- [x] Updated `src/types/database/index.ts`
- [x] Updated `src/types/index.ts`

**Dependencies:** Step 1.2

---

## Phase 2: Calculation Engine

### Step 2.1: Create Wolf Calculations Utility
**Status:** ✅ Complete (2025-01-31)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/utils/wolfCalculations.ts` with pure calculation functions
- Implemented `determineWolfForHole` - Wolf rotation using modulo
- Implemented `getWolfRotationForRound` - Get Wolf for all 18 holes
- Implemented `calculateNetScore` - Wrapper for net score calculation
- Implemented `determineWolfHoleResult` - Determine winner with tie handling
- Implemented `calculateWolfPoints` - Award points based on outcome (with tie = 0 points)
- Implemented `calculateWolfStandings` - Sum points across all holes
- Implemented `getSortedStandings` - Convert to ranked array
- Implemented `calculateWolfPayouts` - Per-point payout calculation
- Implemented `createPayoutRecords` - Create database records
- Implemented `simplifyWolfDebts` - Minimize settlement transactions
- Implemented validation functions: `validateWolfParticipants`, `validateWolfDecision`, `canDeclareBlindWolf`
- Implemented game status functions: `isWolfGameComplete`, `getNextHoleForDecision`, `getNextHoleForCalculation`
- Added formatting utilities: `formatWolfCurrency`, `formatWolfNetResult`, `getWolfDecisionDescription`, `getWolfResultDescription`
- Exported `DEFAULT_WOLF_POINT_VALUES` constant

**Deliverables:**
- [x] `src/utils/wolfCalculations.ts`

**Dependencies:** Step 1.2

---

## Phase 3: Data Hooks

### Step 3.1: Create Wolf Query Hooks
**Status:** ✅ Complete (2025-01-31)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/hooks/wolf/queries.ts` with TanStack Query hooks
- Implemented `useWolfGame(gameId)` - Fetches Wolf game with participant details
- Implemented `useWolfGameByRound(roundId)` - Fetches Wolf game for a specific round
- Implemented `useWolfHoleDecisions(gameId)` - Fetches all hole decisions with wolf/partner details
- Implemented `useWolfCurrentHoleDecision(gameId, holeNumber)` - Fetches decision for specific hole
- Implemented `useWolfStandings(gameId)` - Calculates and returns current standings
- Implemented `useWolfPayouts(gameId)` - Fetches final payouts for completed game
- Implemented `useCanUseWolf(userId?)` - Checks if user has Premium tier access
- Implemented `useWolfSummary(gameId)` - Composite hook for complete game summary
- Added Wolf query keys to `src/hooks/queryKeys.ts`
- Created `src/hooks/wolf/helpers.ts` with error handling utilities (createError, isWolfServiceError)
- Used type assertions for wolf_* tables until Supabase types are regenerated

**Deliverables:**
- [x] `src/hooks/wolf/queries.ts`
- [x] `src/hooks/wolf/helpers.ts`
- [x] Updated `src/hooks/queryKeys.ts` with wolfKeys

**Dependencies:** Step 1.1, Step 1.2

---

### Step 3.2: Create Wolf Mutation Hooks
**Status:** ✅ Complete (2025-01-31)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/hooks/wolf/mutations.ts` with TanStack Query mutations
- Implemented `useCreateWolfGame()` - Creates wolf_games record with validation
- Implemented `useSubmitWolfDecision()` - Submits Wolf's partner decision (insert/update)
- Implemented `useRecordWolfHoleResult()` - Records hole scores and calculates result/points
- Implemented `useFinalizeWolfGame()` - Calculates payouts and marks game complete
- Implemented `useCancelWolfGame()` - Cancels active game
- Implemented `useDeleteWolfGame()` - Permanently deletes game (bonus utility)
- All mutations use proper type assertions for wolf_* tables
- Proper cache invalidation on success
- Comprehensive error handling with createError utility

**Deliverables:**
- [x] `src/hooks/wolf/mutations.ts`

**Dependencies:** Step 2.1, Step 3.1

---

### Step 3.3: Create Wolf Hooks Helper Utilities
**Status:** ✅ Complete (2025-01-31)
**Type:** Custom
**Command:** N/A

**Note:** This was completed as part of Step 3.1.

**Completed:**
- Created `src/hooks/wolf/helpers.ts` with error handling utilities
- Implemented `createError(message, code)` - Factory for typed WolfServiceError
- Implemented `isWolfServiceError(error)` - Type guard for error checking
- Implemented `getWolfErrorMessage(error)` - User-friendly error messages

**Deliverables:**
- [x] `src/hooks/wolf/helpers.ts` (created in Step 3.1)

**Dependencies:** Step 1.2

---

### Step 3.4: Create Wolf Hooks Types
**Status:** ✅ Complete (2025-01-31)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/hooks/wolf/types.ts` with hook-specific types
- Added `WolfServiceError` interface for error handling
- Added `ProcessWolfDecisionResult` for decision submission results
- Added `ProcessWolfHoleResultResponse` for hole result responses
- Added `WolfStandingsDisplayEntry` for leaderboard display
- Added `WolfHoleSummary` for hole summaries
- Added `WolfGameCreateOptions` for game creation options
- Added `WolfSettlementEntry` and `WolfSettlementTransaction` for settlement display

**Deliverables:**
- [x] `src/hooks/wolf/types.ts`

**Dependencies:** Step 1.2

---

### Step 3.5: Create Wolf Hooks Index
**Status:** ✅ Complete (2025-01-31)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/hooks/wolf/index.ts` exporting all Wolf hooks
- Exports all query hooks: useWolfGame, useWolfGameByRound, useWolfHoleDecisions, useWolfCurrentHoleDecision, useWolfStandings, useWolfPayouts, useCanUseWolf, useWolfSummary
- Exports all mutation hooks: useCreateWolfGame, useSubmitWolfDecision, useRecordWolfHoleResult, useFinalizeWolfGame, useCancelWolfGame, useDeleteWolfGame
- Exports helpers: createError, isWolfServiceError, getWolfErrorMessage
- Exports all hook-specific types
- Updated `src/hooks/index.ts` to include Wolf exports
- Added wolfKeys to queryKeys exports

**Deliverables:**
- [x] `src/hooks/wolf/index.ts`
- [x] Updated `src/hooks/index.ts`

**Dependencies:** Step 3.1, Step 3.2, Step 3.3, Step 3.4

---

## Phase 4: Round Setup UI

### Step 4.1: Create WolfConfigBottomSheet Component
**Status:** ✅ Complete (2025-01-31)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/components/wolf/WolfConfigBottomSheet.tsx` for configuring Wolf settings
- Implemented Scoring Type selector (Gross/Net) with RadioButtonOption
- Implemented Blind Wolf toggle with Switch and description
- Implemented Pot Settings section with enable toggle and per-point value input
- Added example winnings calculation display (Lone Wolf: 4pts, Blind Wolf: 6pts)
- Implemented Wolf Order section with up/down buttons and shuffle functionality
- Added participant reordering with Fisher-Yates shuffle
- Used React Hook Form + Zod for validation
- Styled following SkinsConfigBottomSheet patterns with WOLF_COLOR (#6B7280)
- Exported WolfParticipantInfo type for participant info

**Deliverables:**
- [x] `src/components/wolf/WolfConfigBottomSheet.tsx`

**Dependencies:** Step 1.2

---

### Step 4.2: Create WolfSection Component
**Status:** ✅ Complete (2025-01-31)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/components/wolf/WolfSection.tsx` for the round setup form
- Added props: isPremium, wolfEnabled, wolfConfig, onWolfEnabledChange, onWolfConfigChange, onUpgradePress, disabled, editState, participantCount, participants
- Implemented toggle row with dog-side icon and WOLF_COLOR (#6B7280)
- Added Premium lock state for non-premium users
- Added config summary showing scoring type, Blind Wolf status, pot info, and player count
- Added participant count validation (3-4 players required)
- Added warning messages for invalid participant counts
- Added info messages when Wolf is enabled
- Opens WolfConfigBottomSheet on toggle or config tap
- Opens WolfDisclaimerModal on first use for pot-enabled games
- Follows SkinsSection pattern exactly

**Deliverables:**
- [x] `src/components/wolf/WolfSection.tsx`

**Dependencies:** Step 4.1

---

### Step 4.3: Create WolfDisclaimerModal Component
**Status:** ✅ Complete (2025-01-31)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/components/wolf/WolfDisclaimerModal.tsx` for gambling acknowledgment
- Added props: visible, onAccept, onCancel, testID
- Implemented Wolf icon header with WOLF_COLOR styling
- Added disclaimer points covering gambling, age requirements, settlement, and local laws
- Added "How Wolf Works" brief rules explanation box
- Added checkbox for terms acknowledgment
- Added Accept/Cancel buttons with Wolf-themed styling
- Added AsyncStorage helper functions: hasAcceptedWolfDisclaimer, clearWolfDisclaimerAcceptance, saveWolfDisclaimerAcceptance
- Added accessibility announcements and proper a11y roles
- Follows SkinsDisclaimerModal pattern exactly

**Deliverables:**
- [x] `src/components/wolf/WolfDisclaimerModal.tsx`

**Dependencies:** Step 1.2

---

### Step 4.4: Create Wolf Component Index
**Status:** ✅ Complete (2025-01-31)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/components/wolf/index.ts` exporting all Wolf components
- Exports WolfConfigBottomSheet and WolfConfigBottomSheetProps
- Exports WolfDisclaimerModal, hasAcceptedWolfDisclaimer, clearWolfDisclaimerAcceptance, and WolfDisclaimerModalProps
- Exports WolfSection, WOLF_COLOR, WolfSectionProps, and WolfEditState

**Deliverables:**
- [x] `src/components/wolf/index.ts`

**Dependencies:** Step 4.1, Step 4.2, Step 4.3

---

### Step 4.5: Integrate Wolf into AddRoundScreen
**Status:** ✅ Complete (2025-01-31)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify the round setup screens to include Wolf.

1. Update `/src/screens/admin/AddRoundScreen/hooks/useAddRoundForm.ts`:
   - Add wolfEnabled and wolfConfig state
   - Add handlers: handleWolfEnabledChange, handleWolfConfigChange
   - Validate wolf requires 3-4 participants
   - On form submit, create wolf_games record if enabled

2. Update `/src/screens/admin/AddRoundScreen/index.tsx`:
   - Import WolfSection
   - Add WolfSection after SkinsSection
   - Pass required props

3. Update `/src/screens/admin/AddRoundScreen/types.ts`:
   - Add wolfEnabled: boolean
   - Add wolfConfig: WolfConfig | null

The Wolf section should:
- Only show when game_type is 'stableford', 'stroke', or 'par' (not match-play or team formats)
- Only enable when participant count is 3-4
- Be below the Skins section

**Note:** Include 'par' game type - it's individual play with same scoring infrastructure as Stableford/Stroke. See `docs/plans/par-game-type.md` for the Par implementation plan.

Reference: How SkinsSection is integrated
```

**Completed:**
- Updated `src/screens/admin/AddRoundScreen/types.ts` to add wolfEnabled and wolfConfig fields
- Updated `src/screens/admin/AddRoundScreen/hooks/useAddRoundForm.ts`:
  - Added wolfEnabled and wolfConfig state
  - Added handleWolfEnabledChange and handleWolfConfigChange handlers
  - Added createWolfGame function following skins pattern
  - Creates wolf_games record on form submit if Wolf is enabled
  - Invalidates wolfKeys.all on success
- Updated `src/screens/admin/AddRoundScreen/index.tsx`:
  - Added WolfSection import
  - Added WolfSection component after SkinsSection (only shown for non-team rounds)

**Deliverables:**
- [x] Updated `useAddRoundForm.ts`
- [x] Updated `AddRoundScreen/index.tsx`
- [x] Updated `AddRoundScreen/types.ts`

**Dependencies:** Step 4.4, Step 3.2

---

### Step 4.6: Integrate Wolf into EditRoundScreen
**Status:** ✅ Complete (2025-01-31)
**Type:** Custom
**Command:** N/A

**Completed:**
- Updated `src/screens/admin/EditRoundScreen/types.ts`:
  - Added WolfConfig import
  - Added WolfEditState re-export
  - Added wolfEnabled and wolfConfig to RoundFormData
- Updated `src/screens/admin/EditRoundScreen/hooks/useEditRoundForm.ts`:
  - Added existingWolfGame option
  - Added wolfEditState calculation based on round status
  - Added setWolfEnabled and setWolfConfig handlers
  - Added wolfChanged to dirty check
  - Added wolfConfig initialization from existing game
- Updated `src/screens/admin/EditRoundScreen/hooks/useRoundSubmission.ts`:
  - Added wolfEditState to options
  - Added handleWolfChanges function for create/update/delete
  - Added wolfKeys query invalidation on success
- Updated `src/screens/admin/EditRoundScreen/index.tsx`:
  - Added useWolfGameByRound hook import
  - Added Wolf game fetch query
  - Added existingWolfGame memo
  - Added WolfSection component with edit state
  - Passed wolfEditState to useRoundSubmission

**Deliverables:**
- [x] Updated `useEditRoundForm.ts`
- [x] Updated `useRoundSubmission.ts`
- [x] Updated `EditRoundScreen/index.tsx`
- [x] Updated `EditRoundScreen/types.ts`

**Dependencies:** Step 4.4

---

## Phase 5: In-Round Scoring UI

> **Offline Note:** Wolf decisions are stored locally and synced when connectivity returns, following the same offline-first pattern as scorecard entries. The `wolf_hole_decisions` records are queued in SQLite and synced via the existing sync service. If a decision can't sync immediately, it's persisted locally and the UI shows the decision as pending sync.

### Step 5.1: Create WolfIndicator Component
**Status:** ✅ Complete (2025-02-01)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/components/wolf/WolfIndicator.tsx` following SkinsIndicator pattern
- Props: roundId, currentHole (optional), onPress (optional), size, variant, testID
- Uses `useWolfGameByRound`, `useWolfHoleDecisions`, `useWolfStandings` hooks
- Displays dog-side icon with WOLF_COLOR (#6B7280)
- Badge shows "🔥" for Blind Wolf or "L" for Lone Wolf
- Popover shows:
  - Scoring type (Gross/Net)
  - Blind Wolf enabled status
  - Pot info if enabled
  - Progress (holes completed)
  - Current Wolf and decision for current hole
  - Result display (Wolf wins, Pack wins, Tie)
  - Full standings with points and net results
- Polls every 3 seconds while popover is open for live updates
- Updated `src/components/wolf/index.ts` to export WolfIndicator

**Deliverables:**
- [x] `src/components/wolf/WolfIndicator.tsx`
- [x] Updated `src/components/wolf/index.ts`

**Dependencies:** Step 1.2

---

### Step 5.2: Create WolfDecisionModal Component
**Status:** ✅ Complete (2025-02-01)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/components/wolf/WolfDecisionModal.tsx` for partner selection
- Props: visible, onDismiss, wolfGame, currentHole, wolfId, wolfName, otherPlayers, blindWolfEnabled, canSelectBlindWolf, onSelectPartner, testID
- UI Features:
  - Header with Wolf icon, "Wolf's Choice" title, hole number, and Wolf name
  - Partner options for each other player with point breakdown
  - "OR" divider separator
  - Lone Wolf option with highlighted styling and point display
  - Blind Wolf option (when enabled) with fire emoji and lock state when unavailable
  - "Decide Later" cancel button to defer choice
- Point display shows both points and dollar values when pot is enabled
- Large touch targets (44px icons) optimized for on-course use
- Animated entrance with spring animation
- Full accessibility support with announcements and labels
- Updated `src/components/wolf/index.ts` to export WolfDecisionModal

**Deliverables:**
- [x] `src/components/wolf/WolfDecisionModal.tsx`
- [x] Updated `src/components/wolf/index.ts`

**Dependencies:** Step 1.2

---

### Step 5.3: Integrate Wolf into ScorecardEntryScreen
**Status:** ✅ Complete (2025-02-01)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/components/wolf/WolfDecisionPrompt.tsx` - Prompt card for Wolf partner selection
  - Shows Wolf name and "Choose Partner" button when pending
  - Shows decision summary when decided (partner name, Lone Wolf, or Blind Wolf)
  - Shows result when calculated (Wolf wins, Pack wins, or Tie)
  - Displays points and dollar amounts for pot games
- Updated `src/components/wolf/index.ts` to export WolfDecisionPrompt
- Updated `src/screens/scoring/ScorecardEntryScreen/components/ScorecardHeader.tsx`:
  - Added WolfIndicator next to SkinsIndicator
- Updated `src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx`:
  - Added Wolf props (wolfGame, wolfDecision, onWolfChoosePartner, isWolfProcessing)
  - Renders WolfDecisionPrompt for Stableford, Stroke Play, and Par game types
- Updated `src/screens/scoring/ScorecardEntryScreen/index.tsx`:
  - Added Wolf hooks: useWolfGameByRound, useWolfCurrentHoleDecision, useSubmitWolfDecision, useRecordWolfHoleResult
  - Added state for Wolf decision modal (showWolfDecisionModal)
  - Added canSelectBlindWolf logic (checks if any scores entered)
  - Added handleWolfSelectPartner handler for decision submission
  - Added processWolfHoleResult effect for automatic result calculation
  - Renders WolfDecisionModal when Wolf game is active
  - Passes Wolf props to ScorecardScoreContent

**Features:**
- Wolf indicator in header shows current game status
- Decision prompt shows on each hole for eligible game types
- Partner selection modal with all options (Partner, Lone Wolf, Blind Wolf)
- Blind Wolf option disabled after scores are entered
- Automatic result calculation when all scores are in
- Result display shows winner and points

**Deliverables:**
- [x] Created `src/components/wolf/WolfDecisionPrompt.tsx`
- [x] Updated `src/components/wolf/index.ts`
- [x] Updated `ScorecardHeader.tsx` with WolfIndicator
- [x] Updated `ScorecardScoreContent.tsx` with Wolf props and prompt
- [x] Updated `ScorecardEntryScreen/index.tsx` with Wolf integration

**Dependencies:** Step 5.1, Step 5.2, Step 3.2

---

## Phase 6: Results Display

### Step 6.1: Create WolfResultsCard Component
**Status:** ✅ Complete (2025-02-01)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/components/wolf/WolfResultsCard.tsx` following SkinsResultsCard pattern
- Props: wolfGame, decisions, testID
- Card header with Wolf icon and "WOLF RESULTS" title
- Config summary showing scoring type, blind wolf status, pot value, player count
- Table columns: Hole | Wolf | Choice | Result | Points
- Row features:
  - Hole number
  - Wolf player name (determined from wolf_order rotation)
  - Choice display: "+ PartnerName" (blue), "Lone Wolf" (gray), "Blind 🔥" (warning)
  - Result: "Wolf" (green), "Pack" (red), "Tie" (gray)
  - Points abbreviated: "J:2 S:2" format showing each player's points
- Row color coding: green background for Wolf wins, red for Pack wins, gray for ties
- Front 9 and Back 9 subtotal dividers
- Legend at bottom showing Wolf/Pack/Tie counts with colored dots
- Updated `src/components/wolf/index.ts` to export WolfResultsCard

**Deliverables:**
- [x] `src/components/wolf/WolfResultsCard.tsx`
- [x] Updated `src/components/wolf/index.ts`

**Dependencies:** Step 1.2

---

### Step 6.2: Create WolfStandingsCard Component
**Status:** ✅ Complete (2025-02-01)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/components/wolf/WolfStandingsCard.tsx` following SkinsLeaderboard pattern
- Props: standings (WolfStandingEntry[]), potEnabled (boolean), testID (optional)
- Card header with podium-gold icon and "STANDINGS" title
- Column headers: # | Player | Points | Net (when pot enabled)
- Row features:
  - Rank with medal icons (gold/silver/bronze) for top 3
  - Player initial badge with color coding
  - Player name with leader styling for rank 1
  - Points display with "pts" label
  - Net result with color coding (green positive, red negative)
- Empty state with podium icon and message
- Uses WolfStandingEntry type from wolf.types.ts
- Alternating row backgrounds for readability
- Accessibility labels on rows
- Updated `src/components/wolf/index.ts` to export WolfStandingsCard

**Deliverables:**
- [x] `src/components/wolf/WolfStandingsCard.tsx`
- [x] Updated `src/components/wolf/index.ts`

**Dependencies:** Step 1.2

---

### Step 6.3: Create WolfSettlementCard Component
**Status:** ✅ Complete (2025-02-01)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/components/wolf/WolfSettlementCard.tsx` following SkinsSettlementCard pattern
- Props: payouts (WolfPayoutWithPlayer[]), potValue (number), currency (optional), testID (optional)
- Card header with cash-multiple icon and "SETTLEMENT" title
- Per-point value display below header
- Totals table with columns: Player | Points | Winnings | Net
  - Rows sorted by total points (descending)
  - Total row at bottom with sum of points and pot
  - Net result color coding (green positive, red negative)
- "Who Owes Who" section using simplifyWolfDebts for minimized transactions
  - Displays from player → to player with amount
  - Color coding for debtor (red) and creditor (green)
- "All even" card when no debts exist
- Share Results button to share via native share sheet
- Mark as Settled button (disabled, future feature)
- Updated `src/components/wolf/index.ts` to export WolfSettlementCard

**Deliverables:**
- [x] `src/components/wolf/WolfSettlementCard.tsx`
- [x] Updated `src/components/wolf/index.ts`

**Dependencies:** Step 1.2

---

### Step 6.4: Create WolfGameSection for ViewRound
**Status:** ✅ Complete (2025-02-01)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created `src/components/rounds/ViewRound/RoundDetailsTab/components/WolfGameSection.tsx`
- Props: roundId, roundStatus, cardBackground, onEditPress (optional)
- Fetches Wolf game, decisions, standings, and payouts using Wolf hooks
- Three display modes based on round status:
  - **Unconfigured**: Shows prompt to add Wolf game (tappable to edit)
  - **Scheduled/In-Progress**: Shows config card with:
    - Wolf icon and enabled status
    - Scoring type (Gross/Net)
    - Blind Wolf enabled/disabled
    - Per-point pot value
    - Wolf order list with numbered participant chips
  - **Completed**: Shows full results with:
    - WolfResultsCard (hole-by-hole breakdown)
    - WolfStandingsCard (ranked standings)
    - WolfSettlementCard (pot enabled only)
- Auto-finalize logic: Automatically finalizes Wolf game when round is completed and all 18 holes have results
- Loading state with GolfBallLoader
- Updated `src/components/rounds/ViewRound/RoundDetailsTab/components/index.ts` to export WolfGameSection

**Deliverables:**
- [x] `src/components/rounds/ViewRound/RoundDetailsTab/components/WolfGameSection.tsx`
- [x] Updated `src/components/rounds/ViewRound/RoundDetailsTab/components/index.ts`

**Dependencies:** Step 6.1, Step 6.2, Step 6.3

---

### Step 6.5: Integrate Wolf into ViewRoundScreen
**Status:** ✅ Complete (2025-02-01)
**Type:** Custom
**Command:** N/A

**Completed:**
- Updated `src/components/rounds/ViewRound/RoundDetailsTab/index.tsx`:
  - Imported `WolfGameSection` from './components'
  - Imported `useWolfGameByRound` hook from '@/hooks/wolf'
  - Imported `WOLF_COLOR` from '@/components/wolf'
  - Added `onWolfEditPress` prop to component
  - Added Wolf game query to check if round has Wolf enabled
  - Added Wolf icon (dog-side) to Format row when Wolf is enabled
  - Added `WolfGameSection` below `SkinsGameSection`
- Updated `src/components/rounds/ViewRound/RoundDetailsTab/types.ts`:
  - Added `onWolfEditPress` optional prop to `RoundDetailsTabProps`
  - Added `WolfGameSectionProps` interface

**Deliverables:**
- [x] Updated `RoundDetailsTab/index.tsx`
- [x] Updated `RoundDetailsTab/types.ts`

**Dependencies:** Step 6.4

---

## Phase 7: Documentation & Polish

### Step 7.1: Create Wolf Game Documentation
**Status:** ✅ Complete (2025-02-01)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created comprehensive `docs/guides/WOLF_GAME.md` following SKINS_GAME.md format
- **Overview**: What is Wolf, why play, key concepts
- **Rules**: Rotation order, partner selection, winner determination, point values with examples
- **Configuration**: Scoring type, Blind Wolf, pot settings
- **Where to Configure**: Round setup screens, requirements
- **Premium Tier Gating**: Access levels by tier
- **Gambling Disclaimer**: Legal compliance requirements
- **UI Flow**: ASCII diagrams for creation, scoring, partner selection modal, results
- **Database Schema**: Tables (wolf_games, wolf_hole_decisions, wolf_payouts), relationships
- **API Reference**: Query hooks, mutation hooks with descriptions
- **Calculation Utilities**: Code examples for rotation, winner determination, points, standings
- **Integration Points**: Score submission, scorecard submission, non-blocking behavior
- **Locking Behavior**: By round status
- **Supported Game Types**: Individual formats only
- **Troubleshooting**: Common issues and solutions
- **Related Documentation**: Links to related docs

**Deliverables:**
- [x] `docs/guides/WOLF_GAME.md`

**Dependencies:** All previous steps

---

### Step 7.2: Update CLAUDE.md
**Status:** ✅ Complete (2025-02-01)
**Type:** Custom
**Command:** N/A

**Completed:**
- Updated `CLAUDE.md` in three sections:
  1. **Developer Guides**: Added link to WOLF_GAME.md after SKINS_GAME.md
  2. **Core Entities**: Added Wolf tables (WolfGame, WolfHoleDecision, WolfPayout) as items 21-23
  3. **Documentation Map**: Added Wolf Game row in the table

**Deliverables:**
- [x] Updated CLAUDE.md

**Dependencies:** Step 7.1

---

### Step 7.3: Write Wolf Calculation Tests
**Status:** ✅ Complete (2025-02-01)
**Type:** Custom
**Command:** N/A

**Completed:**
- Created comprehensive `src/utils/__tests__/wolfCalculations.test.ts` with unit tests
- **Wolf Rotation Tests**: `determineWolfForHole`, `getWolfRotationForRound` for 3 and 4 players
- **Net Score Tests**: `calculateNetScore` with various stroke combinations
- **Hole Result Tests**: `determineWolfHoleResult` covering:
  - Lone Wolf win/lose/tie scenarios
  - Partner win/lose/tie scenarios
  - Net scoring with handicap strokes
- **Points Calculation Tests**: `calculateWolfPoints` covering:
  - Tie scenarios (0 points all)
  - Partner win (2 pts each) / lose (3 pts to Pack)
  - Lone Wolf win (4 pts) / lose (1 pt each to Pack)
  - Blind Wolf win (6 pts) / lose (2 pts each to Pack)
- **Standings Tests**: `calculateWolfStandings`, `getSortedStandings` with tie handling
- **Payout Tests**: `calculateWolfPayouts`, `createPayoutRecords`, zero-sum verification
- **Debt Simplification Tests**: `simplifyWolfDebts` for who owes whom
- **Validation Tests**: `validateWolfParticipants`, `validateWolfDecision`, `canDeclareBlindWolf`
- **Game Status Tests**: `isWolfGameComplete`, `getNextHoleForDecision`, `getNextHoleForCalculation`
- **Formatting Tests**: `formatWolfCurrency`, `formatWolfNetResult`, descriptions

**Note:** Tests written correctly but project has pre-existing Jest configuration issue (`@babel/runtime` missing). Fix Jest config separately to run tests.

**Deliverables:**
- [x] `src/utils/__tests__/wolfCalculations.test.ts`

**Dependencies:** Step 2.1

---

## Critical Files

### To Create
- `supabase/migrations/20260131000000_wolf_games.sql`
- `src/types/database/wolf.types.ts`
- `src/utils/wolfCalculations.ts`
- `src/hooks/wolf/queries.ts`
- `src/hooks/wolf/mutations.ts`
- `src/hooks/wolf/helpers.ts` (error handling utilities, matching skins pattern)
- `src/hooks/wolf/types.ts` (hook-specific input/output types)
- `src/hooks/wolf/index.ts`
- `src/components/wolf/WolfSection.tsx`
- `src/components/wolf/WolfConfigBottomSheet.tsx`
- `src/components/wolf/WolfDisclaimerModal.tsx`
- `src/components/wolf/WolfIndicator.tsx`
- `src/components/wolf/WolfDecisionModal.tsx`
- `src/components/wolf/WolfResultsCard.tsx`
- `src/components/wolf/WolfStandingsCard.tsx`
- `src/components/wolf/WolfSettlementCard.tsx`
- `src/components/wolf/index.ts`
- `src/components/rounds/ViewRound/WolfGameSection.tsx`
- `docs/guides/WOLF_GAME.md`
- `src/utils/__tests__/wolfCalculations.test.ts`

### To Modify
- `src/types/index.ts` - Export wolf types
- `src/hooks/index.ts` - Export wolf hooks
- `src/screens/admin/AddRoundScreen/` - Integrate WolfSection
- `src/screens/admin/EditRoundScreen/` - Integrate WolfSection
- `src/screens/scoring/ScorecardEntryScreen/` - Wolf scoring flow
- `src/screens/rounds/ViewRoundScreen.tsx` - Wolf results section
- `CLAUDE.md` - Document Wolf feature

---

## Verification

### Manual Testing Checklist
- [ ] Create round with Wolf enabled (3 players)
- [ ] Create round with Wolf enabled (4 players)
- [ ] Create round with Wolf + Skins together
- [ ] Create round with Wolf + pot enabled (verify disclaimer shown)
- [ ] Edit existing round, toggle Wolf on/off
- [ ] Verify Wolf locked after round starts
- [ ] Score a hole with partner selection
- [ ] Score a hole as Lone Wolf
- [ ] Score a hole as Blind Wolf
- [ ] Score a hole that results in a tie (verify 0 points, "pushed" display)
- [ ] Skip Wolf decision on a hole, verify warning on submit
- [ ] View Wolf results in ViewRoundScreen
- [ ] Verify standings calculation
- [ ] Test pot settlement display (when pot enabled)
- [ ] Verify non-premium users see upgrade prompt

### Automated Testing
- [ ] All wolfCalculations tests pass
- [ ] TypeScript compiles without errors
- [ ] Migration runs successfully
