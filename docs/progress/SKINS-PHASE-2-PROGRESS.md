# Skins Game - Phase 2 Implementation Plan

**Goal:** Add Competition Prize Pools for funding skins games and other competition prizes
**Status:** Not Started - 0% (0/22 tasks)
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
**Status:** Not Started
**Command:**
```bash
/db "Create migration for competition prize pools. New table competition_prize_pools: id UUID PK DEFAULT gen_random_uuid(), competition_id UUID FK to competitions ON DELETE CASCADE UNIQUE NOT NULL, funding_type TEXT NOT NULL CHECK IN ('per_player', 'fixed_total') DEFAULT 'per_player', funding_amount DECIMAL(10,2) NOT NULL CHECK > 0, currency TEXT DEFAULT 'AUD', total_pool_amount DECIMAL(12,2) NOT NULL (calculated: per_player × player_count OR fixed_total), skins_allocation_percent DECIMAL(5,2) DEFAULT 0 CHECK BETWEEN 0 AND 100, winner_allocation_percent DECIMAL(5,2) DEFAULT 0 CHECK BETWEEN 0 AND 100, other_allocation_percent DECIMAL(5,2) DEFAULT 0 CHECK BETWEEN 0 AND 100, skins_budget DECIMAL(12,2) DEFAULT 0 (calculated from percent), winner_budget DECIMAL(12,2) DEFAULT 0, other_budget DECIMAL(12,2) DEFAULT 0, auto_split_skins BOOLEAN DEFAULT FALSE (auto-enable skins on all rounds with equal pots), skins_pot_per_round DECIMAL(10,2) NULL (calculated when auto_split enabled), is_locked BOOLEAN DEFAULT FALSE, locked_at TIMESTAMPTZ NULL, status TEXT NOT NULL CHECK IN ('draft', 'active', 'settled') DEFAULT 'draft', created_by UUID FK to players NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(). Add CHECK constraint: skins_allocation + winner_allocation + other_allocation <= 100. Add indexes on competition_id, status. Add updated_at trigger."
```
**Deliverables:**
- [ ] `supabase/migrations/XXXXXXXX_competition_prize_pools.sql`
- [ ] `competition_prize_pools` table with all constraints
- [ ] CHECK constraints for allocations
- [ ] Indexes
- [ ] Updated_at trigger

**Dependencies:** None

---

### Task 2: Pool Transactions Table
**Status:** Not Started
**Command:**
```bash
/db "Create pool transactions table for tracking pool usage. New table pool_transactions: id UUID PK DEFAULT gen_random_uuid(), pool_id UUID FK to competition_prize_pools ON DELETE CASCADE NOT NULL, transaction_type TEXT NOT NULL CHECK IN ('allocation', 'skins_draw', 'skins_return', 'prize_payout', 'adjustment'), amount DECIMAL(10,2) NOT NULL, round_id UUID FK to rounds NULL (for skins transactions), description TEXT, balance_after DECIMAL(12,2) NOT NULL, created_by UUID FK to players NULL, created_at TIMESTAMPTZ DEFAULT NOW(). Add index on pool_id, transaction_type, round_id."
```
**Deliverables:**
- [ ] `pool_transactions` table
- [ ] Transaction type tracking
- [ ] Balance tracking
- [ ] Indexes

**Dependencies:** Task 1

---

### Task 3: RLS Policies for Prize Pools
**Status:** Not Started
**Command:**
```bash
/db "Add RLS policies for prize pool tables. competition_prize_pools: enable RLS, policy 'organizers_manage_pools' ALL using competition_id IN (SELECT id FROM competitions WHERE organizer_id = auth.uid()), policy 'members_view_pools' SELECT using competition_id IN (SELECT competition_id FROM competition_players WHERE player_id = auth.uid()). pool_transactions: enable RLS, policy 'pool_access_transactions' SELECT using pool_id IN (SELECT id FROM competition_prize_pools WHERE competition_id IN (SELECT id FROM competitions WHERE organizer_id = auth.uid() OR id IN (SELECT competition_id FROM competition_players WHERE player_id = auth.uid()))), policy 'organizers_create_transactions' INSERT using pool_id IN (SELECT id FROM competition_prize_pools WHERE competition_id IN (SELECT id FROM competitions WHERE organizer_id = auth.uid()))."
```
**Deliverables:**
- [ ] RLS enabled on both tables
- [ ] Organizer management policies
- [ ] Member view policies
- [ ] Transaction creation policies

**Dependencies:** Task 1, Task 2

---

### Task 4: Prize Pool Functions
**Status:** Not Started
**Command:**
```bash
/db "Create PostgreSQL functions for prize pool management. (1) calculate_pool_total(p_funding_type TEXT, p_funding_amount DECIMAL, p_player_count INTEGER) RETURNS DECIMAL - returns funding_amount × player_count if per_player, funding_amount if fixed_total, IMMUTABLE. (2) calculate_pool_allocations(p_pool_id UUID) RETURNS VOID - updates skins_budget, winner_budget, other_budget based on percentages and total_pool_amount, SECURITY DEFINER. (3) lock_prize_pool(p_pool_id UUID) RETURNS VOID - sets is_locked=true, locked_at=NOW(), SECURITY DEFINER. (4) draw_from_pool(p_pool_id UUID, p_round_id UUID, p_amount DECIMAL) RETURNS DECIMAL - creates skins_draw transaction, returns amount drawn (may be less if insufficient funds), SECURITY DEFINER. (5) return_to_pool(p_pool_id UUID, p_round_id UUID, p_amount DECIMAL, p_description TEXT) RETURNS VOID - creates skins_return transaction for carryover returns, SECURITY DEFINER. (6) get_pool_balance(p_pool_id UUID, p_category TEXT DEFAULT 'skins') RETURNS DECIMAL - returns remaining balance for category, STABLE. (7) can_draw_from_pool(p_pool_id UUID, p_amount DECIMAL) RETURNS BOOLEAN - checks if skins budget has sufficient funds, STABLE. (8) auto_split_pool_for_skins(p_pool_id UUID, p_round_count INTEGER) RETURNS VOID - calculates skins_pot_per_round = skins_budget / round_count, SECURITY DEFINER."
```
**Deliverables:**
- [ ] `calculate_pool_total()` function
- [ ] `calculate_pool_allocations()` function
- [ ] `lock_prize_pool()` function
- [ ] `draw_from_pool()` function
- [ ] `return_to_pool()` function
- [ ] `get_pool_balance()` function
- [ ] `can_draw_from_pool()` function
- [ ] `auto_split_pool_for_skins()` function

**Dependencies:** Task 1, Task 2

---

### Task 5: Pool Locking Trigger
**Status:** Not Started
**Command:**
```bash
/db "Create trigger to auto-lock prize pool when a round starts. Trigger function lock_pool_on_round_start() - AFTER UPDATE ON rounds, when OLD.status = 'scheduled' AND NEW.status != 'scheduled', check if round belongs to competition with prize pool, if pool exists and not locked, call lock_prize_pool(). Also create trigger to prevent pool updates after lock - BEFORE UPDATE ON competition_prize_pools, if OLD.is_locked = true AND (funding or allocation fields changed), RAISE EXCEPTION 'Prize pool is locked after round starts'."
```
**Deliverables:**
- [ ] `lock_pool_on_round_start()` trigger function
- [ ] Trigger on rounds table
- [ ] Prevention trigger for updates
- [ ] Exception handling

**Dependencies:** Task 4

---

### Task 6: Update skins_games for Pool Source
**Status:** Not Started
**Command:**
```bash
/db "Update skins_games table to track pool source and return carryover to pool. Add column pool_draw_amount DECIMAL(10,2) DEFAULT 0 (amount drawn from prize pool for this game). Add column carryover_returned DECIMAL(10,2) DEFAULT 0 (carryover returned to pool on completion). Create trigger on_skins_game_complete_return_carryover - AFTER UPDATE ON skins_games, when OLD.status != 'completed' AND NEW.status = 'completed', if pool_source = 'prize_pool', calculate remaining carryover and call return_to_pool()."
```
**Deliverables:**
- [ ] `pool_draw_amount` column
- [ ] `carryover_returned` column
- [ ] Carryover return trigger
- [ ] Pool transaction creation

**Dependencies:** Task 4, Phase 1 Task 1

---

## Sprint 2: TypeScript Types

### Task 7: Prize Pool Type Definitions
**Status:** Not Started
**Command:**
```bash
/refactor "Create src/types/database/prizePool.types.ts with TypeScript types. Types: PoolFundingType = 'per_player' | 'fixed_total', PoolStatus = 'draft' | 'active' | 'settled', PoolTransactionType = 'allocation' | 'skins_draw' | 'skins_return' | 'prize_payout' | 'adjustment'. Interfaces: CompetitionPrizePool (id, competition_id, funding_type, funding_amount, currency, total_pool_amount, skins_allocation_percent, winner_allocation_percent, other_allocation_percent, skins_budget, winner_budget, other_budget, auto_split_skins, skins_pot_per_round nullable, is_locked, locked_at nullable, status, created_by, created_at, updated_at). PoolTransaction (id, pool_id, transaction_type, amount, round_id nullable, description nullable, balance_after, created_by nullable, created_at). CreatePrizePoolInput (competition_id, funding_type, funding_amount, currency optional, skins_allocation_percent, winner_allocation_percent optional, other_allocation_percent optional, auto_split_skins optional). UpdatePrizePoolInput (funding_type optional, funding_amount optional, allocations optional, auto_split_skins optional). PoolAllocationSummary (skins: {percent, budget, used, remaining}, winner: {...}, other: {...}). PoolBalanceSummary (total, skins_remaining, winner_remaining, other_remaining, transactions_count). Export all from src/types/database/index.ts."
```
**Deliverables:**
- [ ] `src/types/database/prizePool.types.ts`
- [ ] Enum types (PoolFundingType, PoolStatus, PoolTransactionType)
- [ ] CompetitionPrizePool interface
- [ ] PoolTransaction interface
- [ ] Input types
- [ ] Summary types
- [ ] Export from index

**Dependencies:** Task 1 (schema reference)

---

### Task 8: Update Skins Types for Pool Source
**Status:** Not Started
**Command:**
```bash
/refactor "Update src/types/database/skins.types.ts to include pool-related fields. Add to SkinsGame interface: pool_draw_amount: number, carryover_returned: number. Add SkinsPoolSourceConfig interface: source: SkinsPoolSource, pool_id: string nullable (when source='prize_pool'), draw_amount: number nullable. Update CreateSkinsGameInput to include pool_id optional for tracking which pool funds the game."
```
**Deliverables:**
- [ ] `pool_draw_amount` and `carryover_returned` in SkinsGame
- [ ] `SkinsPoolSourceConfig` interface
- [ ] Updated CreateSkinsGameInput

**Dependencies:** Task 7, Phase 1 Task 5

---

## Sprint 3: React Query Hooks

### Task 9: Query Keys for Prize Pools
**Status:** Not Started
**Command:**
```bash
/refactor "Update src/hooks/queryKeys.ts to add prize pool query keys. Add prizePoolKeys object: all: ['prizePool'] as const, pool: (competitionId) => [...all, competitionId], transactions: (poolId) => [...all, 'transactions', poolId], balance: (poolId) => [...all, 'balance', poolId], summary: (competitionId) => [...all, 'summary', competitionId]. Export prizePoolKeys and add to allQueryKeys."
```
**Deliverables:**
- [ ] `prizePoolKeys` object
- [ ] All key patterns
- [ ] Exported and in allQueryKeys

**Dependencies:** None

---

### Task 10: Prize Pool Hooks
**Status:** Not Started
**Command:**
```bash
/hook "Create src/hooks/usePrizePool.ts with TanStack Query hooks. Queries: (1) useCompetitionPrizePool(competitionId) - fetches prize pool for competition, returns CompetitionPrizePool or null, staleTime 1min. (2) usePoolTransactions(poolId, options?: {limit, type}) - fetches transactions with optional filtering, staleTime 30s. (3) usePoolBalance(poolId) - fetches current balances via get_pool_balance RPC, staleTime 10s. (4) usePoolAllocationSummary(competitionId) - calculates allocation summary with used/remaining, staleTime 30s. (5) useCanDrawFromPool(poolId, amount) - checks if amount can be drawn, staleTime 10s. Mutations: (6) useCreatePrizePool() - inserts prize pool, invalidates pool query. (7) useUpdatePrizePool() - updates pool (only if not locked), invalidates pool. (8) useDeletePrizePool() - deletes pool (only if not locked), invalidates pool. (9) useAutoSplitPool() - calls auto_split_pool_for_skins RPC, invalidates pool. Export all hooks."
```
**Deliverables:**
- [ ] `src/hooks/usePrizePool.ts`
- [ ] 5 query hooks
- [ ] 4 mutation hooks
- [ ] Export from `src/hooks/index.ts`

**Dependencies:** Task 7 (types), Task 9 (query keys)

---

## Sprint 4: UI Components - Prize Pool Setup

### Task 11: PrizePoolSection Component
**Status:** Not Started
**Command:**
```bash
/component "PrizePoolSection - Prize pool configuration section for competition setup. Props: competitionId (string), pool (CompetitionPrizePool nullable), playerCount (number), roundCount (number), onPoolChange ((pool: CompetitionPrizePool) => void), disabled (boolean for locked state). Layout: Surface card with trophy icon, 'Prize Pool' header. (1) If no pool: 'Add Prize Pool' button with description 'Fund skins games and competition prizes'. (2) If pool exists: funding type toggle (Per Player / Fixed Total), amount input with calculated total display, allocation sliders (Skins %, Winner %, Other %), auto-split toggle for skins with calculated per-round amount. (3) If locked: read-only display with 'Locked' badge, edit disabled. Premium tier gating. Use React Hook Form for form state."
```
**Deliverables:**
- [ ] `src/components/prizePool/PrizePoolSection.tsx`
- [ ] Add/Edit pool UI
- [ ] Funding type toggle
- [ ] Allocation sliders
- [ ] Auto-split toggle
- [ ] Locked state display
- [ ] Premium gating

**Dependencies:** Task 7 (types)

---

### Task 12: PrizePoolSummaryCard Component
**Status:** Not Started
**Command:**
```bash
/component "PrizePoolSummaryCard - Display prize pool summary with balances. Props: pool (CompetitionPrizePool), summary (PoolAllocationSummary), isLocked (boolean), onEditPress (() => void optional). Layout: Card with header showing total pool amount and lock status. Three sections: (1) SKINS BUDGET - allocation %, budget amount, used amount, remaining amount with progress bar. (2) WINNER PRIZES - same layout. (3) OTHER - same layout. If auto_split_skins enabled, show 'Auto-split: $X per round for Y rounds'. Show 'View Transactions' link. Edit button (disabled if locked)."
```
**Deliverables:**
- [ ] `src/components/prizePool/PrizePoolSummaryCard.tsx`
- [ ] Total pool display
- [ ] Allocation breakdown with progress bars
- [ ] Auto-split info
- [ ] Edit/View actions
- [ ] Locked state

**Dependencies:** Task 7 (types)

---

### Task 13: PoolTransactionsList Component
**Status:** Not Started
**Command:**
```bash
/component "PoolTransactionsList - List of pool transactions for audit. Props: transactions (PoolTransaction[]), isLoading (boolean), onEndReached (() => void optional). Layout: FlatList with transaction rows. Each row: Icon based on type (arrow-down for draw, arrow-up for return, trophy for prize), description, amount (+/- formatted), running balance, timestamp. Filter tabs: All, Skins, Prizes. Empty state 'No transactions yet'. Pull-to-refresh."
```
**Deliverables:**
- [ ] `src/components/prizePool/PoolTransactionsList.tsx`
- [ ] Transaction row component
- [ ] Type-based icons
- [ ] Filter tabs
- [ ] Empty state

**Dependencies:** Task 7 (types)

---

## Sprint 5: Competition Integration

### Task 14: Add Prize Pool to CreateCompetitionScreen
**Status:** Not Started
**Command:**
```bash
/refactor "Add prize pool configuration to CreateCompetitionScreen wizard. The current wizard has 3 steps: (1) Competition Details, (2) Rounds Configuration, (3) Review & Create. Implementation: (A) In CompetitionDetailsStep (Step 1), add a 'Prize Pool' toggle switch at the bottom of the form with label 'Add Prize Pool' and description 'Fund skins games and competition prizes'. Premium tier gating - show lock icon for non-premium users. Store prizePoolEnabled boolean in wizard state. (B) When prizePoolEnabled is true, dynamically insert a new 'Prize Pool Setup' step between current Step 2 (Rounds) and Step 3 (Review). This makes the wizard 4 steps when prize pool is enabled. (C) Create PrizePoolSetupStep component that uses PrizePoolSection for configuration (funding type, amount, allocations, auto-split toggle). (D) Update SimplifiedReviewStep to show prize pool summary when configured. (E) On competition create: if prizePool configured, create competition first, then create prize pool with competition_id. If auto_split_skins enabled, create skins_games for each round drawing from pool. Handle errors - pool creation failure should show warning but not fail competition creation."
```
**Deliverables:**
- [ ] Prize pool toggle in CompetitionDetailsStep (Step 1)
- [ ] Premium tier gating for toggle
- [ ] `prizePoolEnabled` state in wizard
- [ ] Dynamic step insertion when prize pool enabled (wizard becomes 4 steps)
- [ ] `PrizePoolSetupStep` component for Step 3 (when enabled)
- [ ] Review step shows prize pool summary
- [ ] Pool creation on submit
- [ ] Auto-split skins creation
- [ ] Error handling

**Dependencies:** Task 11 (component)

---

### Task 15: Add Prize Pool to EditCompetitionScreen
**Status:** Not Started
**Command:**
```bash
/refactor "Add prize pool management to EditCompetitionScreen. Import PrizePoolSection, PrizePoolSummaryCard from @/components/prizePool. Use useCompetitionPrizePool hook to fetch existing pool. If no pool: show PrizePoolSection to add. If pool exists and not locked: show PrizePoolSection to edit. If pool locked: show PrizePoolSummaryCard (read-only). On save: create/update prize pool. Show warning if changing allocations will affect skins already configured."
```
**Deliverables:**
- [ ] Load existing prize pool
- [ ] Add/Edit/View modes based on lock status
- [ ] Save pool changes
- [ ] Warning for allocation changes

**Dependencies:** Task 11, Task 12 (components), Task 10 (hooks)

---

### Task 16: Update Round Skins to Support Pool Source
**Status:** Not Started
**Command:**
```bash
/refactor "Update AddRoundScreen/EditRoundScreen skins section to support pool source selection. When competition has prize pool, add pool source toggle: 'Direct Pot' vs 'From Prize Pool'. If 'From Prize Pool': show available skins budget from pool, validate amount doesn't exceed budget (block if insufficient), when enabled call draw_from_pool to reserve amount. If pool has auto_split_skins enabled, pre-fill pot value with skins_pot_per_round and show 'Using auto-split amount' message. Show pool balance after this round's allocation."
```
**Deliverables:**
- [ ] Pool source toggle UI
- [ ] Available budget display
- [ ] Validation against pool balance
- [ ] Auto-split pre-fill
- [ ] Balance preview

**Dependencies:** Phase 1 Task 22, Task 10 (hooks)

---

### Task 16a: Add Prize Pool Indicator to CompetitionListCard
**Status:** Not Started
**Command:**
```bash
/refactor "Update src/components/competitions/CompetitionListCard.tsx to show prize pool indicator. Add optional hasPrizePool (boolean) and prizePoolAmount (number) props to CompetitionListCardData interface. When hasPrizePool is true, display a money icon (IconCurrencyDollar or IconCash from tabler-icons) in the metaRow next to rounds and players counts. Show the icon in amber/gold color to indicate prize money. Format as '$X pool' where X is the formatted amount. Update accessibility label to mention prize pool when present. Export updated types."
```
**Deliverables:**
- [ ] `hasPrizePool` and `prizePoolAmount` added to `CompetitionListCardData`
- [ ] Money icon displayed in metaRow when prize pool exists
- [ ] Formatted amount display (e.g., '$400 pool')
- [ ] Amber/gold color styling for money indicator
- [ ] Updated accessibility label
- [ ] Update stories/tests

**Dependencies:** Task 7 (types)

---

### Task 16b: Add PrizePoolSection to Competition Details Screen
**Status:** Not Started
**Command:**
```bash
/refactor "Create src/components/competitions/detail/sections/PrizePoolSection.tsx for displaying prize pool in competition details. Props: pool (CompetitionPrizePool | null), isOrganizer (boolean), isLocked (boolean), onEdit (() => void optional). Layout: (1) Section header 'Prize Pool' with trophy-money icon. (2) If no pool: show 'No prize pool configured' message, organizer sees 'Add Prize Pool' button. (3) If pool exists: show PrizePoolSummaryCard with total amount, allocation breakdown (Skins %, Winner %, Other %), and remaining balances. (4) If locked, show lock badge. (5) Organizers see 'Edit' button (disabled if locked). Add to sections/index.ts exports. Update DetailsTab.tsx to render PrizePoolSection between SettingsSection and CoursesSection, passing competition's prize pool data."
```
**Deliverables:**
- [ ] `src/components/competitions/detail/sections/PrizePoolSection.tsx`
- [ ] No pool state with add button for organizers
- [ ] Pool summary display with allocations
- [ ] Locked state indicator
- [ ] Edit button for organizers (respects lock)
- [ ] Export from `sections/index.ts`
- [ ] Integration in `DetailsTab.tsx`

**Dependencies:** Task 12 (PrizePoolSummaryCard), Task 10 (hooks)

---

## Sprint 6: Pool-Skins Integration

### Task 17: Carryover Return to Pool
**Status:** Not Started
**Command:**
```bash
/refactor "Update skins finalization to return carryover to pool. In finalize_skins_game or useFinalizeSkinsGame: after calculating payouts, if pool_source = 'prize_pool' and there's remaining carryover (after hole 18 split), call return_to_pool with the carryover amount. Update skins_games.carryover_returned field. Create pool_transaction record with type 'skins_return', description 'Round X carryover returned'. Update the Phase 1 hole 18 split logic to only split what's needed, return remainder to pool."
```
**Deliverables:**
- [ ] Carryover return logic
- [ ] Pool transaction creation
- [ ] carryover_returned field update
- [ ] Updated hole 18 split

**Dependencies:** Phase 1 Task 24, Task 4 (functions)

---

### Task 18: Auto-Split Implementation
**Status:** Not Started
**Command:**
```bash
/refactor "Implement auto-split skins for all rounds. When auto_split_skins is enabled on prize pool: (1) Calculate skins_pot_per_round = skins_budget / round_count. (2) On pool creation/update with auto_split: for each scheduled round in competition, create skins_games record with pool_source='prize_pool', pot_value=skins_pot_per_round, pool_draw_amount=skins_pot_per_round. (3) Draw from pool for each round (draw_from_pool). (4) If rounds are added later, recalculate and create skins for new rounds. (5) If rounds are removed, cancel skins and return to pool. Create useAutoSplitSkinsForCompetition hook that handles this logic."
```
**Deliverables:**
- [ ] Auto-split calculation
- [ ] Skins games creation for all rounds
- [ ] Pool draw transactions
- [ ] Handle round additions/removals
- [ ] `useAutoSplitSkinsForCompetition` hook

**Dependencies:** Task 10 (hooks), Phase 1 Task 9 (skins hooks)

---

## Sprint 7: Statistics & Leaderboards

### Task 19: Player Statistics Table
**Status:** Not Started
**Command:**
```bash
/db "Create migration for skins player statistics table. New table skins_player_statistics: id UUID PK, player_id UUID FK to players ON DELETE CASCADE UNIQUE, games_played INTEGER DEFAULT 0, games_won INTEGER DEFAULT 0, total_holes_played INTEGER DEFAULT 0, total_holes_won INTEGER DEFAULT 0, total_holes_tied INTEGER DEFAULT 0, total_buy_ins DECIMAL(12,2) DEFAULT 0, total_winnings DECIMAL(12,2) DEFAULT 0, total_net_result DECIMAL(12,2) DEFAULT 0, current_win_streak INTEGER DEFAULT 0, longest_win_streak INTEGER DEFAULT 0, win_rate DECIMAL(5,2) NULL, last_game_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(). Add trigger to update stats when skins_games completes. Add RLS for own stats + friends stats."
```
**Deliverables:**
- [ ] `skins_player_statistics` table
- [ ] Update trigger on game completion
- [ ] RLS policies
- [ ] Indexes for leaderboard queries

**Dependencies:** Phase 1 complete

---

### Task 20: Statistics & Leaderboard Hooks
**Status:** Not Started
**Command:**
```bash
/hook "Add statistics hooks to src/hooks/useSkins.ts. Query keys: statistics: (playerId) => [...skinsKeys.all, 'stats', playerId], leaderboard: () => [...skinsKeys.all, 'leaderboard'], history: (playerId) => [...skinsKeys.all, 'history', playerId]. Hooks: (1) useSkinsStatistics(playerId) - fetches player statistics, staleTime 1min. (2) useMySkinsStatistics() - convenience for current user. (3) useSkinsLeaderboard(options?: {limit, friendsOnly}) - fetches top players by net result, staleTime 5min. (4) useSkinsGameHistory(playerId, options?: {limit, offset}) - fetches past games with payouts, staleTime 1min."
```
**Deliverables:**
- [ ] `useSkinsStatistics()` hook
- [ ] `useMySkinsStatistics()` hook
- [ ] `useSkinsLeaderboard()` hook
- [ ] `useSkinsGameHistory()` hook

**Dependencies:** Task 19

---

### Task 21: Statistics UI Components
**Status:** Not Started
**Command:**
```bash
/component "Create skins statistics components. (1) SkinsStatsCard - Props: statistics (SkinsPlayerStatistics). Shows games played, holes won %, total net, win rate, current/longest streak. (2) SkinsLeaderboard - Props: entries (LeaderboardEntry[]), currentUserId. Shows rank, player, games, win rate, net result. Medal icons for top 3. Current user highlighted. (3) SkinsGameHistoryList - Props: games array. FlatList of past games with course, date, holes won, net result. Tap for details."
```
**Deliverables:**
- [ ] `src/components/skins/SkinsStatsCard.tsx`
- [ ] `src/components/skins/SkinsLeaderboard.tsx`
- [ ] `src/components/skins/SkinsGameHistoryList.tsx`

**Dependencies:** Task 20

---

## Sprint 8: Documentation

### Task 22: Documentation Update
**Status:** Not Started
**Command:**
```bash
/docs "Update documentation for prize pools and statistics. Files: (1) docs/database/DATABASE_SCHEMA.md - add competition_prize_pools, pool_transactions, skins_player_statistics tables with columns, constraints, functions, triggers. (2) docs/guides/SKINS_GAME.md - add 'Competition Prize Pools' section explaining pool setup, funding types, allocations, auto-split, carryover return. Add 'Statistics & Leaderboards' section. (3) CLAUDE.md - add CompetitionPrizePool and SkinsPlayerStatistics to Data Model. (4) Update docs/guides/SUBSCRIPTION_TIERS.md if prize pools have tier restrictions."
```
**Deliverables:**
- [ ] DATABASE_SCHEMA.md updated
- [ ] SKINS_GAME.md extended
- [ ] CLAUDE.md updated
- [ ] SUBSCRIPTION_TIERS.md updated if needed

**Dependencies:** All previous tasks

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 24
- **Completed:** 0 (0%)
- **In Progress:** 0 (0%)
- **Not Started:** 24 (100%)

### Sprint Progress

| Sprint | Description | Tasks | Status |
|--------|-------------|-------|--------|
| Sprint 1 | Database Foundation | 6 | Not Started |
| Sprint 2 | TypeScript Types | 2 | Not Started |
| Sprint 3 | React Query Hooks | 2 | Not Started |
| Sprint 4 | UI Components - Setup | 3 | Not Started |
| Sprint 5 | Competition Integration | 5 | Not Started |
| Sprint 6 | Pool-Skins Integration | 2 | Not Started |
| Sprint 7 | Statistics & Leaderboards | 3 | Not Started |
| Sprint 8 | Documentation | 1 | Not Started |

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

**Last Updated:** 2026-01-09
**Prerequisites:** Phase 1 must be complete
**Status:** Not Started
**Current Sprint:** Sprint 1 - Database Foundation
