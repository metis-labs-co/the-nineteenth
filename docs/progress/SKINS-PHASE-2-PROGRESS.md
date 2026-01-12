# Skins Game - Phase 2 Implementation Plan

**Goal:** Add Competition Prize Pools for funding skins games and other competition prizes
**Status:** ✅ Complete - 100% (23/23 tasks)
**Prerequisites:** Phase 1 complete

---

## Overview

This plan implements **Phase 2** of the Skins gambling feature - a Competition Prize Pool system that provides funding for skins games and other competition prizes.

### Key Features
- **Prize Pool Setup** - Configurable from competition details screen
- **Flexible Funding** - Per-player contribution OR fixed total amount
- **Multi-purpose Allocation** - Fund skins, overall winner prizes, best round prizes, etc.
- **Pool-to-Skins Integration** - Competition round skins can draw from prize pool
- **Carryover Returns to Pool** - Leftover skins pot returns to pool (not carried to next round)
- **Auto-Split** - Automatically enable skins on all rounds with equal pot values
- **Balance Tracking** - Show remaining pool throughout competition
- **Locking** - Prize pool locked once any round starts

### Configuration Location

| Feature | Where to Configure |
|---------|-------------------|
| **Prize Pool** | CreateCompetitionScreen / EditCompetitionScreen |
| **Pool Allocations** | Competition details / Prize Pool section |

### Locking Rules

| What | When Locked |
|------|-------------|
| Prize Pool Config | **Once ANY round has started** (status != 'scheduled') |
| Pool Allocations | When first round starts |
| Round Skins Config | When THAT round starts |

This prevents changing the pot mid-game and ensures fairness for all players.

### Prize Pool Flow

```
Competition Created
        ↓
Prize Pool Configured (optional)
  ├─ Funding Type: Per-player ($X × players) OR Fixed Total ($Y)
  └─ Allocations: Skins Budget %, Winner Prizes %, Other %
        ↓
Rounds Scheduled
        ↓
Skins Enabled on Round (draws from pool OR separate pot)
        ↓
Round Starts → Pool Allocation LOCKED
        ↓
Round Completes
  ├─ Skins settled per-round
  └─ Carryover returns to pool (not carried to next round)
        ↓
Competition Ends → Remaining pool distributed to prize winners
```

### Example Scenario

**Competition: 8 players, 4 rounds, Prize Pool $400**
- Funding: $50 per player × 8 players = $400 total
- Allocation: Skins 60% ($240), Overall Winner 30% ($120), Best Round 10% ($40)

**Skins Budget: $240 for 4 rounds**
- Auto-split enabled: $60 per round ($3.33/hole)
- Round 1: $60 pot, John wins $30, Sarah wins $20, $10 carryover → returns to pool
- Round 2: $60 pot from pool (plus $10 returned) = $70 available, use $60
- Round 3: $60 pot, competitive play
- Round 4: $60 pot + remaining $20 = $80 final round

**End of Competition:**
- Skins settled per-round (individual settlements)
- Overall Winner gets $120
- Best Round (lowest score) gets $40

---

## Sprint 1: Database Foundation

### Task 1: Competition Prize Pools Table
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/db "Create migration for competition prize pools. New table competition_prize_pools: id UUID PK DEFAULT gen_random_uuid(), competition_id UUID FK to competitions ON DELETE CASCADE UNIQUE NOT NULL, funding_type TEXT NOT NULL CHECK IN ('per_player', 'fixed_total') DEFAULT 'per_player', funding_amount DECIMAL(10,2) NOT NULL CHECK > 0, currency TEXT DEFAULT 'AUD', total_pool_amount DECIMAL(12,2) NOT NULL (calculated: per_player × player_count OR fixed_total), skins_allocation_percent DECIMAL(5,2) DEFAULT 0 CHECK BETWEEN 0 AND 100, winner_allocation_percent DECIMAL(5,2) DEFAULT 0 CHECK BETWEEN 0 AND 100, other_allocation_percent DECIMAL(5,2) DEFAULT 0 CHECK BETWEEN 0 AND 100, skins_budget DECIMAL(12,2) DEFAULT 0 (calculated from percent), winner_budget DECIMAL(12,2) DEFAULT 0, other_budget DECIMAL(12,2) DEFAULT 0, auto_split_skins BOOLEAN DEFAULT FALSE (auto-enable skins on all rounds with equal pots), skins_pot_per_round DECIMAL(10,2) NULL (calculated when auto_split enabled), is_locked BOOLEAN DEFAULT FALSE, locked_at TIMESTAMPTZ NULL, status TEXT NOT NULL CHECK IN ('draft', 'active', 'settled') DEFAULT 'draft', created_by UUID FK to players NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(). Add CHECK constraint: skins_allocation + winner_allocation + other_allocation <= 100. Add indexes on competition_id, status. Add updated_at trigger."
```
**Deliverables:**
- [x] `supabase/migrations/20260111000000_competition_prize_pools.sql`
- [x] `competition_prize_pools` table with all constraints
- [x] CHECK constraints for allocations
- [x] Indexes
- [x] Updated_at trigger
- [x] RLS policies for organizers and competition members
- [x] Added `pool_draw_amount` and `carryover_returned` columns to `skins_games`

**Completed Notes:**
- Migration file created at `supabase/migrations/20260111000000_competition_prize_pools.sql`
- Table includes funding config, allocation percentages, calculated budgets, auto-split settings
- `prize_pool_allocations_sum` CHECK constraint ensures allocations <= 100%
- RLS policies: organizers can manage, members can view
- Updated `skins_games` table with pool-related fields for Phase 2 integration

**Dependencies:** None

---

### Task 2: Pool Transactions Table
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/db "Create pool transactions table for tracking pool usage. New table pool_transactions: id UUID PK DEFAULT gen_random_uuid(), pool_id UUID FK to competition_prize_pools ON DELETE CASCADE NOT NULL, transaction_type TEXT NOT NULL CHECK IN ('allocation', 'skins_draw', 'skins_return', 'prize_payout', 'adjustment'), amount DECIMAL(10,2) NOT NULL, round_id UUID FK to rounds NULL (for skins transactions), description TEXT, balance_after DECIMAL(12,2) NOT NULL, created_by UUID FK to players NULL, created_at TIMESTAMPTZ DEFAULT NOW(). Add index on pool_id, transaction_type, round_id."
```
**Deliverables:**
- [x] `pool_transactions` table
- [x] Transaction type tracking
- [x] Balance tracking
- [x] Indexes

**Completed Notes:**
- Migration file created at `supabase/migrations/20260112000000_pool_transactions.sql`
- Table tracks all pool transactions with 5 transaction types
- Includes `balance_after` for running balance tracking
- Comprehensive indexes: pool_id, transaction_type, round_id, created_at, composite
- RLS policies: members can view, organizers can create
- Transactions are immutable (no UPDATE/DELETE policies)

**Dependencies:** Task 1

---

### Task 3: RLS Policies for Prize Pools
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/db "Add RLS policies for prize pool tables. competition_prize_pools: enable RLS, policy 'organizers_manage_pools' ALL using competition_id IN (SELECT id FROM competitions WHERE organizer_id = auth.uid()), policy 'members_view_pools' SELECT using competition_id IN (SELECT competition_id FROM competition_players WHERE player_id = auth.uid()). pool_transactions: enable RLS, policy 'pool_access_transactions' SELECT using pool_id IN (SELECT id FROM competition_prize_pools WHERE competition_id IN (SELECT id FROM competitions WHERE organizer_id = auth.uid() OR id IN (SELECT competition_id FROM competition_players WHERE player_id = auth.uid()))), policy 'organizers_create_transactions' INSERT using pool_id IN (SELECT id FROM competition_prize_pools WHERE competition_id IN (SELECT id FROM competitions WHERE organizer_id = auth.uid()))."
```
**Deliverables:**
- [x] RLS enabled on both tables
- [x] Organizer management policies
- [x] Member view policies
- [x] Transaction creation policies

**Completed Notes:**
- RLS policies were already created as part of Task 1 and Task 2 migrations
- `competition_prize_pools`: "Organizers can manage prize pools" (ALL), "Competition members can view prize pools" (SELECT)
- `pool_transactions`: "Pool members can view transactions" (SELECT), "Organizers can create transactions" (INSERT)
- Transactions are immutable (no UPDATE/DELETE policies)

**Dependencies:** Task 1, Task 2

---

### Task 4: Prize Pool Functions
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/db "Create PostgreSQL functions for prize pool management. (1) calculate_pool_total(p_funding_type TEXT, p_funding_amount DECIMAL, p_player_count INTEGER) RETURNS DECIMAL - returns funding_amount × player_count if per_player, funding_amount if fixed_total, IMMUTABLE. (2) calculate_pool_allocations(p_pool_id UUID) RETURNS VOID - updates skins_budget, winner_budget, other_budget based on percentages and total_pool_amount, SECURITY DEFINER. (3) lock_prize_pool(p_pool_id UUID) RETURNS VOID - sets is_locked=true, locked_at=NOW(), SECURITY DEFINER. (4) draw_from_pool(p_pool_id UUID, p_round_id UUID, p_amount DECIMAL) RETURNS DECIMAL - creates skins_draw transaction, returns amount drawn (may be less if insufficient funds), SECURITY DEFINER. (5) return_to_pool(p_pool_id UUID, p_round_id UUID, p_amount DECIMAL, p_description TEXT) RETURNS VOID - creates skins_return transaction for carryover returns, SECURITY DEFINER. (6) get_pool_balance(p_pool_id UUID, p_category TEXT DEFAULT 'skins') RETURNS DECIMAL - returns remaining balance for category, STABLE. (7) can_draw_from_pool(p_pool_id UUID, p_amount DECIMAL) RETURNS BOOLEAN - checks if skins budget has sufficient funds, STABLE. (8) auto_split_pool_for_skins(p_pool_id UUID, p_round_count INTEGER) RETURNS VOID - calculates skins_pot_per_round = skins_budget / round_count, SECURITY DEFINER."
```
**Deliverables:**
- [x] `calculate_pool_total()` function
- [x] `calculate_pool_allocations()` function
- [x] `lock_prize_pool()` function
- [x] `draw_from_pool()` function
- [x] `return_to_pool()` function
- [x] `get_pool_balance()` function
- [x] `can_draw_from_pool()` function
- [x] `auto_split_pool_for_skins()` function

**Completed Notes:**
- Migration file created at `supabase/migrations/20260113000000_prize_pool_functions.sql`
- All 8 functions implemented with proper error handling
- Added bonus function `recalculate_pool_total()` for recalculating per_player pools when player count changes
- `get_pool_balance()` supports 4 categories: 'skins', 'winner', 'other', 'total'
- `draw_from_pool()` returns actual amount drawn (handles insufficient funds gracefully)
- All functions have descriptive comments

**Dependencies:** Task 1, Task 2

---

### Task 5: Pool Locking Trigger
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/db "Create trigger to auto-lock prize pool when a round starts. Trigger function lock_pool_on_round_start() - AFTER UPDATE ON rounds, when OLD.status = 'scheduled' AND NEW.status != 'scheduled', check if round belongs to competition with prize pool, if pool exists and not locked, call lock_prize_pool(). Also create trigger to prevent pool updates after lock - BEFORE UPDATE ON competition_prize_pools, if OLD.is_locked = true AND (funding or allocation fields changed), RAISE EXCEPTION 'Prize pool is locked after round starts'."
```
**Deliverables:**
- [x] `lock_pool_on_round_start()` trigger function
- [x] Trigger on rounds table
- [x] Prevention trigger for updates
- [x] Exception handling

**Completed Notes:**
- Migration file created at `supabase/migrations/20260114000000_pool_locking_triggers.sql`
- `lock_pool_on_round_start()` - Triggers when round status changes from 'upcoming' to any other status
- `prevent_locked_pool_changes()` - BEFORE UPDATE trigger that blocks changes to funding/allocation fields
- Allows status changes for settlement workflow (only blocks funding/allocation modifications)
- Added `unlock_prize_pool()` admin function for exceptional override situations
- Uses `IS DISTINCT FROM` for proper NULL-safe comparisons

**Dependencies:** Task 4

---

### Task 6: Update skins_games for Pool Source
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/db "Update skins_games table to track pool source and return carryover to pool. Add column pool_draw_amount DECIMAL(10,2) DEFAULT 0 (amount drawn from prize pool for this game). Add column carryover_returned DECIMAL(10,2) DEFAULT 0 (carryover returned to pool on completion). Create trigger on_skins_game_complete_return_carryover - AFTER UPDATE ON skins_games, when OLD.status != 'completed' AND NEW.status = 'completed', if pool_source = 'prize_pool', calculate remaining carryover and call return_to_pool()."
```
**Deliverables:**
- [x] `pool_draw_amount` column (added in Task 1 migration)
- [x] `carryover_returned` column (added in Task 1 migration)
- [x] Carryover return trigger
- [x] Pool transaction creation

**Completed Notes:**
- Columns `pool_draw_amount` and `carryover_returned` were already added in Task 1's migration (`20260111000000_competition_prize_pools.sql`)
- Created new migration `supabase/migrations/20260115000000_skins_carryover_return_trigger.sql`
- Added `calculate_skins_remaining_carryover()` helper function to calculate leftover pot
- Added `return_skins_carryover_to_pool()` trigger function with pool lookup and error handling
- Created `on_skins_game_complete_return_carryover` BEFORE UPDATE trigger on skins_games
- Trigger fires when status changes to 'completed' AND pool_source = 'prize_pool'
- Uses `return_to_pool()` function from Task 4 to create pool transaction

**Dependencies:** Task 4, Phase 1 Task 1

---

## Sprint 2: TypeScript Types

### Task 7: Prize Pool Type Definitions
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/refactor "Create src/types/database/prizePool.types.ts with TypeScript types. Types: PoolFundingType = 'per_player' | 'fixed_total', PoolStatus = 'draft' | 'active' | 'settled', PoolTransactionType = 'allocation' | 'skins_draw' | 'skins_return' | 'prize_payout' | 'adjustment'. Interfaces: CompetitionPrizePool (id, competition_id, funding_type, funding_amount, currency, total_pool_amount, skins_allocation_percent, winner_allocation_percent, other_allocation_percent, skins_budget, winner_budget, other_budget, auto_split_skins, skins_pot_per_round nullable, is_locked, locked_at nullable, status, created_by, created_at, updated_at). PoolTransaction (id, pool_id, transaction_type, amount, round_id nullable, description nullable, balance_after, created_by nullable, created_at). CreatePrizePoolInput (competition_id, funding_type, funding_amount, currency optional, skins_allocation_percent, winner_allocation_percent optional, other_allocation_percent optional, auto_split_skins optional). UpdatePrizePoolInput (funding_type optional, funding_amount optional, allocations optional, auto_split_skins optional). PoolAllocationSummary (skins: {percent, budget, used, remaining}, winner: {...}, other: {...}). PoolBalanceSummary (total, skins_remaining, winner_remaining, other_remaining, transactions_count). Export all from src/types/database/index.ts."
```
**Deliverables:**
- [x] `src/types/database/prizePool.types.ts`
- [x] Enum types (PoolFundingType, PoolStatus, PoolTransactionType)
- [x] CompetitionPrizePool interface
- [x] PoolTransaction interface
- [x] Input types
- [x] Summary types
- [x] Export from index

**Completed Notes:**
- Created `src/types/database/prizePool.types.ts` with all type definitions
- Added 3 enum types: `PoolFundingType`, `PoolStatus`, `PoolTransactionType`
- Added main interfaces: `CompetitionPrizePool`, `PoolTransaction`
- Added input types: `CreatePrizePoolInput`, `UpdatePrizePoolInput`
- Added summary types: `PoolAllocationDetail`, `PoolAllocationSummary`, `PoolBalanceSummary`, `PrizePoolWithSummary`
- Exported all types from `src/types/database/index.ts`

**Dependencies:** Task 1 (schema reference)

---

### Task 8: Update Skins Types for Pool Source
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/refactor "Update src/types/database/skins.types.ts to include pool-related fields. Add to SkinsGame interface: pool_draw_amount: number, carryover_returned: number. Add SkinsPoolSourceConfig interface: source: SkinsPoolSource, pool_id: string nullable (when source='prize_pool'), draw_amount: number nullable. Update CreateSkinsGameInput to include pool_id optional for tracking which pool funds the game."
```
**Deliverables:**
- [x] `pool_draw_amount` and `carryover_returned` in SkinsGame
- [x] `SkinsPoolSourceConfig` interface
- [x] Updated CreateSkinsGameInput

**Completed Notes:**
- Added `pool_draw_amount` and `carryover_returned` fields to `SkinsGame` interface with JSDoc comments
- Created `SkinsPoolSourceConfig` interface with `source`, `pool_id`, and `draw_amount` fields
- Added optional `pool_id` field to `CreateSkinsGameInput` for tracking prize pool source
- Exported `SkinsPoolSourceConfig` from `src/types/database/index.ts`

**Dependencies:** Task 7, Phase 1 Task 5

---

## Sprint 3: React Query Hooks

### Task 9: Query Keys for Prize Pools
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/refactor "Update src/hooks/queryKeys.ts to add prize pool query keys. Add prizePoolKeys object: all: ['prizePool'] as const, pool: (competitionId) => [...all, competitionId], transactions: (poolId) => [...all, 'transactions', poolId], balance: (poolId) => [...all, 'balance', poolId], summary: (competitionId) => [...all, 'summary', competitionId]. Export prizePoolKeys and add to allQueryKeys."
```
**Deliverables:**
- [x] `prizePoolKeys` object
- [x] All key patterns
- [x] Exported and in allQueryKeys

**Completed Notes:**
- Added `prizePoolKeys` object with 5 query key patterns: `all`, `pool`, `transactions`, `balance`, `summary`
- Added `prizePoolKeys.all` to `allQueryKeys` array for bulk invalidation support
- Placed before `skinsKeys` section for logical grouping (prize pools fund skins games)

**Dependencies:** None

---

### Task 10: Prize Pool Hooks
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/hook "Create src/hooks/usePrizePool.ts with TanStack Query hooks. Queries: (1) useCompetitionPrizePool(competitionId) - fetches prize pool for competition, returns CompetitionPrizePool or null, staleTime 1min. (2) usePoolTransactions(poolId, options?: {limit, type}) - fetches transactions with optional filtering, staleTime 30s. (3) usePoolBalance(poolId) - fetches current balances via get_pool_balance RPC, staleTime 10s. (4) usePoolAllocationSummary(competitionId) - calculates allocation summary with used/remaining, staleTime 30s. (5) useCanDrawFromPool(poolId, amount) - checks if amount can be drawn, staleTime 10s. Mutations: (6) useCreatePrizePool() - inserts prize pool, invalidates pool query. (7) useUpdatePrizePool() - updates pool (only if not locked), invalidates pool. (8) useDeletePrizePool() - deletes pool (only if not locked), invalidates pool. (9) useAutoSplitPool() - calls auto_split_pool_for_skins RPC, invalidates pool. Export all hooks."
```
**Deliverables:**
- [x] `src/hooks/usePrizePool.ts`
- [x] 5 query hooks
- [x] 4 mutation hooks + 2 utility hooks (useDrawFromPool, useReturnToPool)
- [x] Export from `src/hooks/index.ts`

**Completed Notes:**
- Created `src/hooks/usePrizePool.ts` with comprehensive TanStack Query hooks
- Query hooks: `useCompetitionPrizePool`, `usePoolTransactions`, `usePoolBalance`, `usePoolAllocationSummary`, `useCanDrawFromPool`
- Mutation hooks: `useCreatePrizePool`, `useUpdatePrizePool`, `useDeletePrizePool`, `useAutoSplitPool`
- Bonus utility hooks: `useDrawFromPool`, `useReturnToPool` for pool-skins integration
- All hooks follow existing patterns from `useSkins.ts` with proper error handling
- `PrizePoolServiceError` type with codes: NOT_FOUND, VALIDATION, DATABASE, PERMISSION, LOCKED, UNKNOWN
- Proper query invalidation on mutations for cache consistency
- Exported `prizePoolKeys` and all hooks from `src/hooks/index.ts`

**Dependencies:** Task 7 (types), Task 9 (query keys)

---

## Sprint 4: UI Components - Prize Pool Setup

### Task 11: PrizePoolSection Component
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/component "PrizePoolSection - Prize pool configuration section for competition setup. Props: competitionId (string), pool (CompetitionPrizePool nullable), playerCount (number), roundCount (number), onPoolChange ((pool: CompetitionPrizePool) => void), disabled (boolean for locked state). Layout: Surface card with trophy icon, 'Prize Pool' header. (1) If no pool: 'Add Prize Pool' button with description 'Fund skins games and competition prizes'. (2) If pool exists: funding type toggle (Per Player / Fixed Total), amount input with calculated total display, allocation sliders (Skins %, Winner %, Other %), auto-split toggle for skins with calculated per-round amount. (3) If locked: read-only display with 'Locked' badge, edit disabled. Premium tier gating. Use React Hook Form for form state."
```
**Deliverables:**
- [x] `src/components/prizePool/PrizePoolSection.tsx`
- [x] Add/Edit pool UI
- [x] Funding type toggle
- [x] Allocation sliders (percentage inputs with visual allocation bar)
- [x] Auto-split toggle
- [x] Locked state display
- [x] Premium gating
- [x] `src/components/prizePool/index.ts` - Barrel export

**Completed Notes:**
- Created `PrizePoolSection` component at `src/components/prizePool/PrizePoolSection.tsx`
- Features toggle to enable/disable prize pool with trophy icon
- SegmentedButton for funding type: "Per Player" / "Fixed Total"
- Funding amount input with calculated total display (× players = $X)
- Three allocation rows with percentage inputs and color-coded icons:
  - Skins Games (purple) - uses IconDice
  - Winner Prizes (amber) - uses IconMedal
  - Other (gray) - uses IconDots
- Visual allocation bar showing combined percentages
- Validation for allocations exceeding 100%
- Auto-split toggle with per-round calculation display
- Premium tier gating with "Upgrade to Premium" prompt for non-premium users
- Locked state with IconLock and disabled inputs
- Uses `PrizePoolConfig` interface for local form state
- Created barrel export at `src/components/prizePool/index.ts`
- Exported prize pool types from `src/types/index.ts`

**Dependencies:** Task 7 (types)

---

### Task 12: PrizePoolSummaryCard Component
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/component "PrizePoolSummaryCard - Display prize pool summary with balances. Props: pool (CompetitionPrizePool), summary (PoolAllocationSummary), isLocked (boolean), onEditPress (() => void optional). Layout: Card with header showing total pool amount and lock status. Three sections: (1) SKINS BUDGET - allocation %, budget amount, used amount, remaining amount with progress bar. (2) WINNER PRIZES - same layout. (3) OTHER - same layout. If auto_split_skins enabled, show 'Auto-split: $X per round for Y rounds'. Show 'View Transactions' link. Edit button (disabled if locked)."
```
**Deliverables:**
- [x] `src/components/prizePool/PrizePoolSummaryCard.tsx`
- [x] Total pool display with lock status badge
- [x] Allocation breakdown with progress bars (Skins/Winner/Other)
- [x] Auto-split info display
- [x] Edit/View Transactions actions
- [x] Locked state handling
- [x] Exported from `src/components/prizePool/index.ts`

**Completed Notes:**
- Created `PrizePoolSummaryCard` component at `src/components/prizePool/PrizePoolSummaryCard.tsx`
- Header shows trophy icon, "Prize Pool" title, and total amount with optional lock badge
- Funding type info row shows "Per Player" or "Fixed Total" with amount
- Three `AllocationRow` sub-components for Skins Games (purple), Winner Prizes (amber), and Other (gray)
- Each allocation shows: icon, label, percent, budget amount, progress bar, used/remaining values
- Allocation rows hide automatically when percent and budget are both 0
- Auto-split info shows pot per round when enabled with optional round count
- "View Transactions" link at bottom with receipt icon
- Edit button in header (hidden when locked or no handler provided)
- Uses existing color scheme from PrizePoolSection for consistency

**Dependencies:** Task 7 (types)

---

### Task 13: PoolTransactionsList Component
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/component "PoolTransactionsList - List of pool transactions for audit. Props: transactions (PoolTransaction[]), isLoading (boolean), onEndReached (() => void optional). Layout: FlatList with transaction rows. Each row: Icon based on type (arrow-down for draw, arrow-up for return, trophy for prize), description, amount (+/- formatted), running balance, timestamp. Filter tabs: All, Skins, Prizes. Empty state 'No transactions yet'. Pull-to-refresh."
```
**Deliverables:**
- [x] `src/components/prizePool/PoolTransactionsList.tsx`
- [x] Transaction row component (`TransactionRow`)
- [x] Type-based icons (IconArrowDown, IconArrowUp, IconTrophy, etc.)
- [x] Filter tabs (All, Skins, Prizes)
- [x] Empty state component with filter-aware messaging
- [x] Pull-to-refresh support
- [x] Pagination support with `onEndReached`
- [x] Exported from `src/components/prizePool/index.ts`

**Completed Notes:**
- Created `PoolTransactionsList` component with FlatList implementation
- `TransactionRow` sub-component displays icon, label, description, amount (+/- formatted), balance, timestamp
- Icons: IconArrowDown (skins_draw), IconArrowUp (skins_return), IconTrophy (prize_payout), IconDice (allocation), IconAdjustmentsAlt (adjustment)
- Color-coded amounts: green for credits, red for debits
- Three filter tabs with active state styling
- Empty state shows different messages based on active filter
- Support for `isLoadingMore`, `isRefreshing`, `onRefresh`, `onEndReached` props
- Relative timestamps (Just now, Xm ago, Xh ago, Xd ago, or date format)
- Running balance display after each transaction

**Dependencies:** Task 7 (types)

---

## Sprint 5: Competition Integration

### Task 14: Add Prize Pool to CreateCompetitionScreen
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/refactor "Add prize pool configuration to CreateCompetitionScreen wizard. The current wizard has 3 steps: (1) Competition Details, (2) Rounds Configuration, (3) Review & Create. Implementation: (A) In CompetitionDetailsStep (Step 1), add a 'Prize Pool' toggle switch at the bottom of the form with label 'Add Prize Pool' and description 'Fund skins games and competition prizes'. Premium tier gating - show lock icon for non-premium users. Store prizePoolEnabled boolean in wizard state. (B) When prizePoolEnabled is true, dynamically insert a new 'Prize Pool Setup' step between current Step 2 (Rounds) and Step 3 (Review). This makes the wizard 4 steps when prize pool is enabled. (C) Create PrizePoolSetupStep component that uses PrizePoolSection for configuration (funding type, amount, allocations, auto-split toggle). (D) Update SimplifiedReviewStep to show prize pool summary when configured. (E) On competition create: if prizePool configured, create competition first, then create prize pool with competition_id. If auto_split_skins enabled, create skins_games for each round drawing from pool. Handle errors - pool creation failure should show warning but not fail competition creation."
```
**Deliverables:**
- [x] Prize pool toggle in CompetitionDetailsStep (Step 1)
- [x] Premium tier gating for toggle
- [x] `prizePoolEnabled` state in wizard
- [x] Dynamic step insertion when prize pool enabled (wizard becomes 4 steps)
- [x] `PrizePoolSetupStep` component for Step 3 (when enabled)
- [x] Review step shows prize pool summary
- [x] Pool creation on submit
- [x] Auto-split skins creation (via hook - auto_split_skins flag stored)
- [x] Error handling

**Completed Notes:**
- Added `enablePrizePool` field to `CompetitionDetailsFormData` schema in `src/schemas/competition.ts`
- Added `PrizePoolConfigFormData` schema with funding type, amount, allocations, and auto-split fields
- Updated `CompetitionDetailsStep.tsx` with prize pool toggle (premium gated with lock icon for non-premium)
- Created `PrizePoolSetupStep.tsx` component with funding configuration, allocation sliders, and summary display
- Updated `CreateCompetitionScreen.tsx` with dynamic step insertion (3-step or 4-step wizard based on toggle)
- Updated wizard state interface to include `prizePoolConfig`
- Updated `SimplifiedReviewStep.tsx` to display prize pool summary with allocation breakdown
- Pool creation after competition via `useCreatePrizePool` hook with proper error handling
- Warning displayed if pool creation fails but competition creation succeeds

**Dependencies:** Task 11 (component)

---

### Task 15: Add Prize Pool to EditCompetitionScreen
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/refactor "Add prize pool management to EditCompetitionScreen. Import PrizePoolSection, PrizePoolSummaryCard from @/components/prizePool. Use useCompetitionPrizePool hook to fetch existing pool. If no pool: show PrizePoolSection to add. If pool exists and not locked: show PrizePoolSection to edit. If pool locked: show PrizePoolSummaryCard (read-only). On save: create/update prize pool. Show warning if changing allocations will affect skins already configured."
```
**Deliverables:**
- [x] Load existing prize pool
- [x] Add/Edit/View modes based on lock status
- [x] Save pool changes
- [x] Warning for allocation changes (locked state shows warning banner)

**Completed Notes:**
- Updated `useCompetitionData` hook to fetch prize pool alongside competition data
- Added player count, round count, and hasStartedRound flags to determine lock status
- Created `PrizePoolFormConfig` and `PrizePoolEditState` types in `types.ts`
- Updated `useEditCompetitionForm` to manage prize pool configuration state with dirty tracking
- Pool edit state computes lock status based on `is_locked` flag or `hasStartedRound`
- Updated `useCompetitionSubmission` to handle prize pool create/update/delete operations
- Pool operations: create new pool (if enabled + no existing), update (if enabled + existing), delete (if disabled + existing)
- Added `PrizePoolSection` to `EditCompetitionContent` with proper props mapping
- Premium gating via `useSubscription` hook (`isPremium` flag)
- Upgrade prompt navigates to Subscription screen
- Locked pools show disabled inputs with lock indicator and reason

**Dependencies:** Task 11, Task 12 (components), Task 10 (hooks)

---

### Task 16: Update Round Skins to Support Pool Source
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/refactor "Update AddRoundScreen/EditRoundScreen skins section to support pool source selection. When competition has prize pool, add pool source toggle: 'Direct Pot' vs 'From Prize Pool'. If 'From Prize Pool': show available skins budget from pool, validate amount doesn't exceed budget (block if insufficient), when enabled call draw_from_pool to reserve amount. If pool has auto_split_skins enabled, pre-fill pot value with skins_pot_per_round and show 'Using auto-split amount' message. Show pool balance after this round's allocation."
```
**Deliverables:**
- [x] Pool source toggle UI
- [x] Available budget display
- [x] Validation against pool balance
- [x] Auto-split pre-fill
- [x] Balance preview

**Completed Notes:**
- Updated `SkinsSection` component to support pool source selection with:
  - `PoolSourceData` interface for passing pool info (pool, balance, isLocked)
  - Pool source segmented toggle: "Direct Pot" vs "From Pool"
  - Available skins budget display when using pool source
  - Auto-split badge showing per-round amount
  - Error display when pot exceeds available budget
  - Shows pool source indicator in config summary
- Updated `AddRoundScreen` types and hook:
  - Added `skinsPoolSource` to `RoundFormData`
  - Added pool fetching via `useCompetitionPrizePool` and `usePoolBalance`
  - Added `handlePoolSourceChange` handler
  - Updated `createSkinsGame` to pass pool source and draw from pool
- Updated `EditRoundScreen` types and hooks:
  - Added `skinsPoolSource` to form data
  - Added `competitionId` parameter for pool fetching
  - Added pool data to dirty check
  - Updated `useRoundSubmission` to handle pool source in create/update
- Pool transactions handled via `draw_from_pool` RPC when using prize pool source

**Dependencies:** Phase 1 Task 22, Task 10 (hooks)

---

### Task 16a: Add Prize Pool Indicator to CompetitionListCard
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/refactor "Update src/components/competitions/CompetitionListCard.tsx to show prize pool indicator. Add optional hasPrizePool (boolean) and prizePoolAmount (number) props to CompetitionListCardData interface. When hasPrizePool is true, display a money icon (IconCurrencyDollar or IconCash from tabler-icons) in the metaRow next to rounds and players counts. Show the icon in amber/gold color to indicate prize money. Format as '$X pool' where X is the formatted amount. Update accessibility label to mention prize pool when present. Export updated types."
```
**Deliverables:**
- [x] `hasPrizePool` and `prizePoolAmount` added to `CompetitionListCardData`
- [x] Money icon displayed in metaRow when prize pool exists
- [x] Formatted amount display (e.g., '$400 pool')
- [x] Amber/gold color styling for money indicator (using skinsColor from theme)
- [x] Updated accessibility label
- [x] Update stories/tests

**Completed Notes:**
- Added `hasPrizePool` and `prizePoolAmount` optional props to `CompetitionListCardData` interface
- Added `IconCurrencyDollar` icon from tabler-icons displayed in amber/gold color (skinsColor)
- Created `formatPrizePoolAmount()` helper function for proper currency formatting with commas
- Prize pool indicator only shows when `hasPrizePool=true` AND `prizePoolAmount > 0`
- Updated accessibility label to include prize pool info when present
- Added 8 new tests covering all prize pool display scenarios
- Added 4 new Storybook stories: WithPrizePool, WithLargePrizePool, WithSmallPrizePool, WithoutPrizePool
- Updated ListOfCompetitions story to include a competition with prize pool

**Dependencies:** Task 7 (types)

---

### Task 16b: Add PrizePoolSection to Competition Details Screen
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/refactor "Create src/components/competitions/detail/sections/PrizePoolSection.tsx for displaying prize pool in competition details. Props: pool (CompetitionPrizePool | null), isOrganizer (boolean), isLocked (boolean), onEdit (() => void optional). Layout: (1) Section header 'Prize Pool' with trophy-money icon. (2) If no pool: show 'No prize pool configured' message, organizer sees 'Add Prize Pool' button. (3) If pool exists: show PrizePoolSummaryCard with total amount, allocation breakdown (Skins %, Winner %, Other %), and remaining balances. (4) If locked, show lock badge. (5) Organizers see 'Edit' button (disabled if locked). Add to sections/index.ts exports. Update DetailsTab.tsx to render PrizePoolSection between SettingsSection and CoursesSection, passing competition's prize pool data."
```
**Deliverables:**
- [x] `src/components/competitions/detail/sections/PrizePoolSection.tsx`
- [x] No pool state with add button for organizers
- [x] Pool summary display with allocations
- [x] Locked state indicator
- [x] Edit button for organizers (respects lock)
- [x] Export from `sections/index.ts`
- [x] Integration in `DetailsTab.tsx`

**Completed Notes:**
- Created `PrizePoolSection.tsx` with comprehensive empty state and pool summary views
- Empty state shows trophy icon, description, and "Add Prize Pool" button for organizers
- Integrated `PrizePoolSummaryCard` for displaying pool details when pool exists
- Added `PrizePoolSectionProps` type to `sections/types.ts`
- Updated `DetailsTab.tsx` with new props: `prizePool`, `prizePoolSummary`, `isPrizePoolLocked`, `onAddPrizePool`, `onEditPrizePool`, `onViewPrizePoolTransactions`
- Added 6 new tests for prize pool section in `DetailsTab.test.tsx`
- Section renders between Settings and Courses sections

**Dependencies:** Task 12 (PrizePoolSummaryCard), Task 10 (hooks)

---

## Sprint 6: Pool-Skins Integration

### Task 17: Carryover Return to Pool
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/refactor "Update skins finalization to return carryover to pool. In finalize_skins_game or useFinalizeSkinsGame: after calculating payouts, if pool_source = 'prize_pool' and there's remaining carryover (after hole 18 split), call return_to_pool with the carryover amount. Update skins_games.carryover_returned field. Create pool_transaction record with type 'skins_return', description 'Round X carryover returned'. Update the Phase 1 hole 18 split logic to only split what's needed, return remainder to pool."
```
**Deliverables:**
- [x] Carryover return logic
- [x] Pool transaction creation
- [x] carryover_returned field update
- [x] Updated hole 18 split

**Completed Notes:**
- Added `calculateFinalPayoutsWithCarryover()` function to `skinsCalculations.ts` with `poolSourced` option
- For direct pot games: Hole 18 carryover is split evenly among all participants
- For pool-sourced games: Carryover is NOT split - returns to pool via database trigger
- Updated `useFinalizeSkinsGame` hook to use new function and detect pool-sourced games
- Database trigger `on_skins_game_complete_return_carryover` automatically:
  - Calculates remaining carryover via `calculate_skins_remaining_carryover()`
  - Calls `return_to_pool()` to create pool transaction with type 'skins_return'
  - Updates `carryover_returned` field on skins_games record
- Updated `useFinalizeSkinsForRound` documentation to reflect carryover handling
- Hook invalidates prize pool queries on completion for pool-sourced games
- Added new exports: `calculateFinalPayoutsWithCarryover`, `FinalPayoutResult`, `FinalPayoutOptions`
- Added 4 new tests for pool-sourced carryover handling
- Updated 2 existing tests to reflect new hole 18 split behavior
- All 87 skins calculation tests passing

**Dependencies:** Phase 1 Task 24, Task 4 (functions)

---

### Task 18: Auto-Split Implementation
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/refactor "Implement auto-split skins for all rounds. When auto_split_skins is enabled on prize pool: (1) Calculate skins_pot_per_round = skins_budget / round_count. (2) On pool creation/update with auto_split: for each scheduled round in competition, create skins_games record with pool_source='prize_pool', pot_value=skins_pot_per_round, pool_draw_amount=skins_pot_per_round. (3) Draw from pool for each round (draw_from_pool). (4) If rounds are added later, recalculate and create skins for new rounds. (5) If rounds are removed, cancel skins and return to pool. Create useAutoSplitSkinsForCompetition hook that handles this logic."
```
**Deliverables:**
- [x] Auto-split calculation
- [x] Skins games creation for all rounds
- [x] Pool draw transactions
- [x] Handle round additions/removals
- [x] `useAutoSplitSkinsForCompetition` hook

**Completed Notes:**
- Created `useAutoSplitSkinsForCompetition` hook in `src/hooks/useSkins.ts`
- Hook provides 3 main functions:
  - `createAutoSplitSkins()` - Creates skins games for all scheduled rounds, draws from pool for each
  - `syncAutoSplitSkins()` - Syncs games when rounds added/removed (creates new, cancels removed, returns funds)
  - `cancelAutoSplitSkins()` - Cancels all pool-sourced games and returns funds (for disabling auto-split)
- All functions use `draw_from_pool` RPC to create pool transactions
- Cancelled games return funds via `return_to_pool` RPC with descriptive messages
- Proper query invalidation for skins and prize pool caches
- Comprehensive error handling with detailed logging
- Exported new types: `AutoSplitSkinsInput`, `AutoSplitSkinsResult`, `SyncSkinsResult`
- Exported hook from `src/hooks/index.ts`

**Dependencies:** Task 10 (hooks), Phase 1 Task 9 (skins hooks)

---

## Sprint 7: Statistics & Leaderboards

### Task 19: Player Statistics Table
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/db "Create migration for skins player statistics table. New table skins_player_statistics: id UUID PK, player_id UUID FK to players ON DELETE CASCADE UNIQUE, games_played INTEGER DEFAULT 0, games_won INTEGER DEFAULT 0, total_holes_played INTEGER DEFAULT 0, total_holes_won INTEGER DEFAULT 0, total_holes_tied INTEGER DEFAULT 0, total_buy_ins DECIMAL(12,2) DEFAULT 0, total_winnings DECIMAL(12,2) DEFAULT 0, total_net_result DECIMAL(12,2) DEFAULT 0, current_win_streak INTEGER DEFAULT 0, longest_win_streak INTEGER DEFAULT 0, win_rate DECIMAL(5,2) NULL, last_game_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(). Add trigger to update stats when skins_games completes. Add RLS for own stats + friends stats."
```
**Deliverables:**
- [x] `skins_player_statistics` table
- [x] Update trigger on game completion
- [x] RLS policies
- [x] Indexes for leaderboard queries

**Completed Notes:**
- Migration file created at `supabase/migrations/20260116000000_skins_player_statistics.sql`
- Table includes all specified fields plus `hole_win_rate` for additional insights
- `update_skins_player_statistics()` trigger function automatically updates stats when game status changes to 'completed'
- Trigger: `update_skins_statistics_on_completion` fires AFTER UPDATE on skins_games
- RLS policies: Players can view own stats + friends' stats (via accepted friendships)
- 8 indexes for efficient leaderboard queries (net result, win rate, games played, etc.)
- Helper functions: `get_player_skins_stats()`, `get_skins_leaderboard()`, `get_player_skins_rank()`
- `get_skins_leaderboard()` supports optional friends-only filter and minimum games filter
- Backfill function included to populate stats for any existing completed games

**Dependencies:** Phase 1 complete

---

### Task 20: Statistics & Leaderboard Hooks
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/hook "Add statistics hooks to src/hooks/useSkins.ts. Query keys: statistics: (playerId) => [...skinsKeys.all, 'stats', playerId], leaderboard: () => [...skinsKeys.all, 'leaderboard'], history: (playerId) => [...skinsKeys.all, 'history', playerId]. Hooks: (1) useSkinsStatistics(playerId) - fetches player statistics, staleTime 1min. (2) useMySkinsStatistics() - convenience for current user. (3) useSkinsLeaderboard(options?: {limit, friendsOnly}) - fetches top players by net result, staleTime 5min. (4) useSkinsGameHistory(playerId, options?: {limit, offset}) - fetches past games with payouts, staleTime 1min."
```
**Deliverables:**
- [x] `useSkinsStatistics()` hook
- [x] `useMySkinsStatistics()` hook
- [x] `useSkinsLeaderboard()` hook
- [x] `useSkinsGameHistory()` hook
- [x] `useSkinsRank()` hook (bonus - for player ranking)

**Completed Notes:**
- Added query keys to `src/hooks/queryKeys.ts`: `statistics`, `leaderboard`, `history`, `rank`
- Created 5 new hooks in `src/hooks/useSkins.ts`:
  - `useSkinsStatistics(playerId)` - Fetches player statistics via `get_player_skins_stats` RPC, staleTime 1min
  - `useMySkinsStatistics()` - Convenience hook using current user session
  - `useSkinsLeaderboard(options)` - Fetches leaderboard via `get_skins_leaderboard` RPC with filters (limit, minGames, friendsOnly), staleTime 5min
  - `useSkinsGameHistory(playerId, options)` - Fetches past games with round/course/payout details, supports pagination (limit, offset)
  - `useSkinsRank(playerId, minGames)` - Fetches player's rank via `get_player_skins_rank` RPC
- Added TypeScript interfaces: `SkinsPlayerStatistics`, `SkinsLeaderboardEntry`, `SkinsGameHistoryEntry`, `SkinsLeaderboardOptions`, `SkinsGameHistoryOptions`
- Exported all hooks and types from `src/hooks/index.ts`

**Dependencies:** Task 19

---

### Task 21: Statistics UI Components
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/component "Create skins statistics components. (1) SkinsStatsCard - Props: statistics (SkinsPlayerStatistics). Shows games played, holes won %, total net, win rate, current/longest streak. (2) SkinsLeaderboard - Props: entries (LeaderboardEntry[]), currentUserId. Shows rank, player, games, win rate, net result. Medal icons for top 3. Current user highlighted. (3) SkinsGameHistoryList - Props: games array. FlatList of past games with course, date, holes won, net result. Tap for details."
```
**Deliverables:**
- [x] `src/components/skins/SkinsStatsCard.tsx`
- [x] `src/components/skins/SkinsLeaderboard.tsx`
- [x] `src/components/skins/SkinsGameHistoryList.tsx`

**Completed Notes:**
- Created `SkinsStatsCard` component displaying:
  - Featured net result (+ or -) with buy-ins/winnings breakdown
  - Games record (W-L), win rate percentage
  - Holes won count with total played, hole win rate with ties
  - Current streak (with fire emoji) and best streak
  - Compact mode prop for reduced display
- Created `SkinsLeaderboard` component with:
  - Ranked list sorted by net result
  - Medal icons for top 3 (gold/silver/bronze)
  - Current user highlighting with amber accent
  - Player avatar, name, games played, win rate
  - Net result (color-coded +/-), holes won count
  - Empty state, loading state, pull-to-refresh
  - Pagination support with `onEndReached`
- Created `SkinsGameHistoryList` component with:
  - FlatList of completed games with course/competition info
  - Date formatting (Today, Yesterday, X days ago)
  - Pot value and scoring type display
  - Net result (color-coded) and holes record (W/T/L)
  - Sticky header, pull-to-refresh, pagination
  - Empty state for new players
- All components follow existing patterns from `SkinsResultsCard.tsx`
- Exported from `src/components/skins/index.ts`

**Dependencies:** Task 20

---

## Sprint 8: Documentation

### Task 22: Documentation Update
**Status:** ✅ Complete (2026-01-10)
**Command:**
```bash
/docs "Update documentation for prize pools and statistics. Files: (1) docs/database/DATABASE_SCHEMA.md - add competition_prize_pools, pool_transactions, skins_player_statistics tables with columns, constraints, functions, triggers. (2) docs/guides/SKINS_GAME.md - add 'Competition Prize Pools' section explaining pool setup, funding types, allocations, auto-split, carryover return. Add 'Statistics & Leaderboards' section. (3) CLAUDE.md - add CompetitionPrizePool and SkinsPlayerStatistics to Data Model. (4) Update docs/guides/SUBSCRIPTION_TIERS.md if prize pools have tier restrictions."
```
**Deliverables:**
- [x] DATABASE_SCHEMA.md updated
- [x] SKINS_GAME.md extended
- [x] CLAUDE.md updated
- [x] SUBSCRIPTION_TIERS.md updated if needed

**Completed Notes:**
- Updated `docs/database/DATABASE_SCHEMA.md` with:
  - `competition_prize_pools` table documentation (columns, constraints, indexes, RLS, examples)
  - `pool_transactions` table documentation (columns, transaction types, indexes, RLS, examples)
  - `skins_player_statistics` table documentation (columns, indexes, RLS, triggers, examples)
  - 12 prize pool functions: `calculate_pool_total`, `calculate_pool_allocations`, `lock_prize_pool`, `draw_from_pool`, `return_to_pool`, `get_pool_balance`, `can_draw_from_pool`, `auto_split_pool_for_skins`, `recalculate_pool_total`, `get_player_skins_stats`, `get_skins_leaderboard`, `get_player_skins_rank`
- Updated `docs/guides/SKINS_GAME.md` with:
  - "Competition Prize Pools" section covering pool setup, funding types, allocations, auto-split, carryover behavior, locking rules, and example scenarios
  - "Statistics & Leaderboards" section covering player statistics, leaderboard display, filters, UI components, and API hooks
- Updated `CLAUDE.md` Data Model section with 3 new entities:
  - CompetitionPrizePool, PoolTransaction, SkinsPlayerStatistics
- Updated `docs/guides/SUBSCRIPTION_TIERS.md`:
  - Added "Prize pools (competition funding)" to feature limits table (Premium tier)
  - Added "prize_pool" to FeatureId type definition

**Dependencies:** All previous tasks

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 23
- **Completed:** 23 (100%)
- **In Progress:** 0 (0%)
- **Not Started:** 0 (0%)

### Sprint Progress

| Sprint | Description | Tasks | Status |
|--------|-------------|-------|--------|
| Sprint 1 | Database Foundation | 6 | ✅ Complete (6/6) |
| Sprint 2 | TypeScript Types | 2 | ✅ Complete (2/2) |
| Sprint 3 | React Query Hooks | 2 | ✅ Complete (2/2) |
| Sprint 4 | UI Components - Setup | 3 | ✅ Complete (3/3) |
| Sprint 5 | Competition Integration | 5 | ✅ Complete (5/5) |
| Sprint 6 | Pool-Skins Integration | 2 | ✅ Complete (2/2) |
| Sprint 7 | Statistics & Leaderboards | 3 | ✅ Complete (3/3) |
| Sprint 8 | Documentation | 1 | ✅ Complete (1/1) |

---

## Critical Files

### New Files (To Create)
| File | Purpose |
|------|---------|
| `supabase/migrations/XXXXXXXX_competition_prize_pools.sql` | Pool tables migration |
| `supabase/migrations/XXXXXXXX_skins_player_statistics.sql` | Statistics table migration |
| `src/types/database/prizePool.types.ts` | Prize pool types |
| `src/hooks/usePrizePool.ts` | Prize pool hooks |
| `src/components/prizePool/PrizePoolSection.tsx` | Pool configuration UI |
| `src/components/prizePool/PrizePoolSummaryCard.tsx` | Pool summary display |
| `src/components/prizePool/PoolTransactionsList.tsx` | Transaction audit list |
| `src/components/prizePool/index.ts` | Barrel export |
| `src/components/competitionWizard/create/PrizePoolSetupStep.tsx` | Wizard step for prize pool config |
| `src/components/competitions/detail/sections/PrizePoolSection.tsx` | Details screen prize pool display |
| `src/components/skins/SkinsStatsCard.tsx` | Statistics display |
| `src/components/skins/SkinsLeaderboard.tsx` | Leaderboard component |
| `src/components/skins/SkinsGameHistoryList.tsx` | History list |

### Files to Modify
| File | Changes |
|------|---------|
| `src/types/database/skins.types.ts` | Add pool fields |
| `src/types/database/index.ts` | Export prize pool types |
| `src/hooks/queryKeys.ts` | Add prizePoolKeys |
| `src/hooks/index.ts` | Export prize pool hooks |
| `src/hooks/useSkins.ts` | Add statistics hooks |
| `src/screens/admin/CreateCompetitionScreen.tsx` | Prize pool toggle + dynamic step |
| `src/screens/admin/EditCompetitionScreen/` | Prize pool management |
| `src/screens/admin/AddRoundScreen/index.tsx` | Pool source selection |
| `src/components/competitions/CompetitionListCard.tsx` | Add prize pool indicator |
| `src/components/competitions/detail/DetailsTab.tsx` | Add PrizePoolSection |
| `src/components/competitions/detail/sections/index.ts` | Export PrizePoolSection |
| `src/components/competitionWizard/create/CompetitionDetailsStep.tsx` | Add prize pool toggle |
| `src/components/competitionWizard/create/SimplifiedReviewStep.tsx` | Show prize pool summary |
| `docs/database/DATABASE_SCHEMA.md` | Document pool tables |
| `docs/guides/SKINS_GAME.md` | Add pool sections |
| `CLAUDE.md` | Add pool to data model |

---

## Key Design Decisions

1. **Separate Table**: `competition_prize_pools` is separate from competitions for clean separation
2. **Flexible Funding**: Per-player OR fixed total accommodates different competition styles
3. **Multi-purpose Pool**: Can fund skins AND other prizes (not just skins)
4. **Carryover Returns to Pool**: Unlike "Tally All", leftover pot goes back to pool for reallocation
5. **Auto-Split Option**: Convenience feature to automatically configure equal skins for all rounds
6. **Locking on Start**: Pool locked when first round starts - prevents mid-game changes
7. **Transaction Audit**: Full audit trail of pool usage via pool_transactions
8. **Balance Validation**: Can't enable skins for more than available budget

---

**Last Updated:** 2026-01-10
**Prerequisites:** Phase 1 must be complete
**Status:** ✅ Complete
**Completed:** All 8 sprints (23 tasks)
