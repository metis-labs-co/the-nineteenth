# Prize Pool Redesign: Placement-Based Payouts

## Context

The current prize pool system is confusing. It splits funds into three allocation buckets (skins %, winner %, other %) that must sum to <= 100%, leaving the possibility of unallocated leftovers. The pool's primary integration is with skins games (pool-funded skins), but the actual need is simpler: reward top competition finishers.

This redesign replaces the allocation model with a clean placement-based payout system. The prize pool has one job — distribute prizes to top performers based on organizer-defined splits that must sum to exactly 100%.

Skins and wolf side-games continue to exist but are always funded directly by players (direct pot), removing the pool-to-skins funding path entirely.

## Design Decisions

- **Placement splits over allocation buckets**: Organizer defines 1st, 2nd, 3rd (etc.) percentage splits instead of skins/winner/other buckets
- **Splits must sum to exactly 100%**: No leftovers, no ambiguity
- **Skins/wolf always direct-pot**: Players chip in per round. No pool funding for side-games
- **Keep both funding types**: Per-player buy-in and fixed-total both remain
- **Automatic settlement**: When competition completes, placements are assigned from final standings

## Database Changes

### `competition_prize_pools` table — columns to remove

- `skins_allocation_percent`
- `winner_allocation_percent`
- `other_allocation_percent`
- `skins_budget`
- `winner_budget`
- `other_budget`
- `auto_split_skins`
- `skins_pot_per_round`

Columns to keep: `id`, `competition_id`, `funding_type`, `funding_amount`, `total_pool_amount`, `currency`, `is_locked`, `locked_at`, `status`, `created_by`, `created_at`, `updated_at`.

### New `prize_pool_placements` table

```sql
CREATE TABLE prize_pool_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES competition_prize_pools(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,           -- 1st, 2nd, 3rd, etc.
  percent DECIMAL(5,2) NOT NULL,       -- Percentage of pool (e.g. 60.00)
  payout_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- Calculated: total_pool_amount * percent / 100
  player_id UUID REFERENCES players(id), -- Filled when competition completes
  paid_at TIMESTAMPTZ,                 -- When payout was recorded
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pool_id, position),
  CHECK (percent > 0 AND percent <= 100),
  CHECK (position > 0)
);
```

**Constraint**: A database check or trigger ensures `SUM(percent) = 100` per `pool_id`.

### `pool_transactions` table — simplify

- Remove transaction types: `skins_draw`, `skins_return`
- Keep: `prize_payout`, `adjustment`
- Remove `round_id` column (no longer round-linked)

### `skins_games` table — cleanup

- Remove columns: `pool_source`, `pool_draw_amount`, `carryover_returned`
- All skins games are direct-pot going forward

### Database functions/triggers to remove

- `draw_from_pool()`
- `return_to_pool()`
- `can_draw_from_pool()`
- `auto_split_pool_for_skins()`
- `redistribute_skins_pots()`
- `get_pool_balance()` (replace with simpler version if needed)
- `calculate_pool_allocations()`
- `trigger_on_skins_game_complete_return_carryover`
- `trigger_prevent_locked_pool_changes` (update to guard new columns instead)

### Database functions/triggers to add or update

- `settle_prize_pool(pool_id)`: Assigns `player_id` to each placement row based on final leaderboard standings, creates `prize_payout` transactions, sets pool status to `settled`
- `recalculate_placement_amounts(pool_id)`: Updates `payout_amount` on all placement rows when `total_pool_amount` changes (e.g. player joins/leaves with per-player funding)
- Update pool locking trigger to guard new placement-related fields

## Skins/Wolf Changes

- Remove `pool_source` toggle from `SkinsSection.tsx` — skins are always "direct pot"
- Remove pool budget validation from skins game creation in `src/hooks/skins/mutations.ts`
- Remove `draw_from_pool` / `return_to_pool` integration from skins mutations
- Remove carryover-return-to-pool trigger (`20260115000000_skins_carryover_return_trigger.sql`)
- Hole 18 carryover always splits evenly among participants (existing "direct pot" behavior)
- Remove `poolSourced` option from `calculateFinalPayoutsWithCarryover()` in `src/utils/skins/payouts.ts`

## Frontend Changes

### EditPrizePoolBottomSheet — redesigned form

`src/components/prizePool/EditPrizePoolBottomSheet.tsx`

- Keep: Funding type selector (per-player / fixed total), funding amount input
- Remove: Skins/winner/other allocation percentage inputs, auto-split toggle
- Add: Placement splits section
  - Default 3 rows: 1st (60%), 2nd (30%), 3rd (10%)
  - "Add placement" button (capped at player count)
  - "Remove" button on each row (minimum 1 placement)
  - Live validation: percentages must sum to exactly 100%
  - Show calculated dollar amount next to each percentage
  - Error state when sum != 100%

### PrizePoolSummaryCard — redesigned display

`src/components/prizePool/PrizePoolSummaryCard.tsx`

- Remove: Skins/winner/other `AllocationRow` components with progress bars
- Add: Placement breakdown list (position, percentage, dollar amount)
- After competition settles: Show winner name/avatar next to each placement
- Keep: Header with trophy icon, total amount, funding info, locked badge, edit button

### PrizePoolSection — update

`src/components/prizePool/PrizePoolSection.tsx`

- Remove allocation percentage inputs
- Add placement split configuration UI

### Components/hooks to remove entirely

- `useAutoSplitPool` hook (`src/hooks/prizePool/mutations.ts`)
- `useDrawFromPool` hook (`src/hooks/prizePool/mutations.ts`)
- `useReturnToPool` hook (`src/hooks/prizePool/mutations.ts`)
- `useCanDrawFromPool` query (`src/hooks/prizePool/queries.ts`)
- `useSkinsAllocationStatus` query (`src/hooks/prizePool/queries.ts`)
- `usePoolAllocationSummary` query (`src/hooks/prizePool/queries.ts`) — replace with placement query
- `useAutoSplitSkinsForCompetition` hook (`src/hooks/skins/useAutoSplitSkinsForCompetition.ts`)
- Pool-source related code in `SkinsSection.tsx`

### New hooks

- `usePrizePoolPlacements(poolId)` — fetch placement rows for a pool
- `useCreatePrizePool` — update to accept placements array instead of allocation percentages
- `useUpdatePrizePool` — update to accept placements array
- `useSettlePrizePool(poolId)` — trigger settlement when competition completes

### Types to update

`src/types/database/prizePool.types.ts`:

- Remove: `PoolAllocationDetail`, `PoolAllocationSummary`, `PoolBalanceSummary`, `PrizePoolWithSummary`
- Remove from `CompetitionPrizePool`: all allocation/budget/auto-split fields
- Remove from `CreatePrizePoolInput`: allocation fields, add `placements` array
- Remove from `UpdatePrizePoolInput`: allocation fields, add `placements` array
- Remove from `PoolTransactionType`: `skins_draw`, `skins_return`
- Add: `PrizePoolPlacement` interface, `CreatePlacementInput` interface

`src/types/database/skins.types.ts`:

- Remove: `SkinsPoolSource` type
- Remove from `SkinsGame`: `pool_source`, `pool_draw_amount`, `carryover_returned`
- Remove from `CreateSkinsGameInput`: `pool_source`

## Settlement Flow

When the competition completes (all rounds finished, final standings confirmed):

1. Organizer triggers settlement (or auto-triggered on competition completion)
2. Final standings are read from the leaderboard (using existing tie-break logic)
3. Each placement row gets `player_id` assigned based on standing position
4. `payout_amount` is confirmed (already calculated from percentage)
5. A `prize_payout` transaction is created for each placement
6. Pool `status` transitions to `settled`
7. UI shows the final breakdown with winner names

## Migration Strategy

New migration file: `20260327000000_prize_pool_placement_redesign.sql`

1. Create `prize_pool_placements` table
2. Migrate existing pools:
   - For each existing pool, create placement rows
   - If `winner_allocation_percent > 0`: create single placement at 1st for 100%
   - Otherwise: create default 60/30/10 split for 1st/2nd/3rd
3. Update existing skins games: remove `pool_source` = `'prize_pool'` references, set all to `'direct'`
4. Drop old columns from `competition_prize_pools` (allocation percents, budgets, auto-split fields)
5. Drop old columns from `skins_games` (pool_source, pool_draw_amount, carryover_returned)
6. Drop `round_id` from `pool_transactions`
7. Remove old pool functions and triggers
8. Add new functions (`settle_prize_pool`, `recalculate_placement_amounts`)
9. Add new constraint trigger for 100% sum validation
10. Update RLS policies for new table

## Verification

1. **Create competition with prize pool**: Verify placement splits UI works, validates to 100%, calculates dollar amounts correctly
2. **Per-player funding**: Add/remove players, verify total recalculates and placement amounts update
3. **Fixed-total funding**: Verify static total with correct placement amounts
4. **Pool locking**: Start a round, verify pool can't be edited
5. **Skins games**: Verify skins creation has no pool-source option, always direct-pot, hole 18 carryover splits evenly
6. **Settlement**: Complete competition, verify placements are assigned to correct players from standings
7. **Migration**: Run migration on existing data, verify old pools are correctly converted to placement model

## Files to Modify

### Database
- `supabase/migrations/` — new migration file

### Types
- `src/types/database/prizePool.types.ts`
- `src/types/database/skins.types.ts`

### Hooks
- `src/hooks/prizePool/mutations.ts`
- `src/hooks/prizePool/queries.ts`
- `src/hooks/prizePool/types.ts` (if exists)
- `src/hooks/skins/mutations.ts`
- `src/hooks/skins/useAutoSplitSkinsForCompetition.ts` (delete)
- `src/hooks/skins/useFinalizeSkinsForRound.ts`

### Components
- `src/components/prizePool/EditPrizePoolBottomSheet.tsx`
- `src/components/prizePool/PrizePoolSummaryCard.tsx`
- `src/components/prizePool/PrizePoolSection.tsx`
- `src/components/prizePool/PoolTransactionsList.tsx`
- `src/components/skins/SkinsSection.tsx`

### Utils
- `src/utils/skins/payouts.ts` — remove `poolSourced` option
