# Skins Phase 2 Consolidation Plan

**Goal:** Consolidate and improve the Skins Phase 2 (Prize Pool & Statistics) implementation
**Status:** In Progress - 22% (4/18 tasks completed)
**Prerequisites:** Skins Phase 2 complete, Phase 1 Consolidation complete

---

## Overview

This plan addresses code duplication, performance issues, and consolidation opportunities identified in the Skins Phase 2 implementation review. Building on the Phase 1 consolidation patterns, this plan focuses on:

1. **Critical Fixes** - Race conditions and validation issues in auto-split
2. **Code Deduplication** - Currency formatting, error handlers, AllocationRow components
3. **Performance** - Reduce RPC calls for balance queries
4. **Component Refactoring** - Split oversized PrizePoolSection

### Impact Assessment

| Issue | Severity | Type | Lines Affected |
|-------|----------|------|----------------|
| Race conditions in auto-split | Critical | Reliability | ~100 |
| Missing funds validation | Critical | Reliability | ~20 |
| Currency formatting duplication | High | DRY | ~40 |
| AllocationRow duplication | High | DRY | ~150 |
| PrizePoolSection too large | High | Maintainability | 874 |
| Multiple RPC calls for balance | Medium | Performance | ~80 |
| Error handler duplication | Medium | DRY | ~40 |

---

## Phase 1: Critical Fixes

### Task 1: Add Pre-Validation to Auto-Split
**Status:** ✅ Complete (2026-01-10)
**Type:** Custom
**Priority:** Critical

**Prompt:**
```
Update src/hooks/useSkins.ts useAutoSplitSkinsForCompetition hook to add pre-validation before drawing funds.

In the createAutoSplitSkins mutation function (around line 1420), BEFORE the loop that draws from pool:

1. Calculate total funds needed:
   const totalNeeded = potPerRound * roundsToCreate.length;

2. Fetch current skins budget balance:
   const { data: balance } = await supabase.rpc('get_pool_balance', {
     p_pool_id: poolId,
     p_category: 'skins'
   });

3. Validate sufficient funds:
   if (!balance || totalNeeded > balance) {
     return {
       success: false,
       gamesCreated: 0,
       totalDrawn: 0,
       gameIds: [],
       error: `Insufficient funds: need $${totalNeeded.toFixed(2)}, only $${(balance ?? 0).toFixed(2)} available`
     };
   }

4. Add this validation BEFORE the for loop that creates games.

This prevents partial state where some games are created but funds run out mid-way.
```

**Deliverables:**
- [x] Total funds calculation added
- [x] Balance check before loop
- [x] Early return with error if insufficient
- [x] Error message includes amounts

**Completed:**
- Added pre-validation at line 1420-1445 in useSkins.ts
- Calculates `totalNeeded = potPerRound * roundsToCreate.length`
- Fetches balance using `get_pool_balance` RPC with 'skins' category
- Returns early with error if insufficient funds, including exact amounts
- This prevents the race condition where some games are created but funds run out mid-way

**Dependencies:** None

---

### Task 2: Add Transaction Batching RPC for Auto-Split
**Status:** ✅ Complete (2026-01-10)
**Type:** Command
**Command:** `/db`

**Prompt:**
```
Create migration for atomic auto-split skins creation.

New PostgreSQL function create_auto_split_skins_batch:
- Parameters: p_competition_id UUID, p_pool_id UUID, p_round_ids UUID[], p_pot_per_round DECIMAL, p_scoring_type TEXT, p_created_by UUID
- Returns TABLE (game_id UUID, round_id UUID, draw_amount DECIMAL)
- SECURITY DEFINER

Implementation:
1. Start transaction
2. Validate pool has sufficient skins budget for total (p_pot_per_round * array_length(p_round_ids))
3. For each round_id in p_round_ids:
   a. Call draw_from_pool() to create transaction
   b. Insert skins_game record with pool_source='prize_pool'
   c. Collect game_id and draw_amount
4. If any step fails, entire transaction rolls back
5. Return all created games

Error cases:
- RAISE EXCEPTION 'Insufficient skins budget' if validation fails
- RAISE EXCEPTION 'Pool is locked' if pool not active
- RAISE EXCEPTION 'Round already has skins' if duplicate
```

**Deliverables:**
- [x] `supabase/migrations/20260117000000_auto_split_batch.sql`
- [x] `create_auto_split_skins_batch()` function
- [x] Transaction rollback on any failure
- [x] Proper error messages

**Completed:**
- Created `create_auto_split_skins_batch()` function in migration
- Pre-validates sufficient skins budget before any operations
- Creates skins games for all rounds atomically (all or nothing)
- Uses existing `draw_from_pool()` for transaction records
- Returns TABLE with game_id, round_id, draw_amount for each created game
- Error cases handled: insufficient funds, invalid inputs, pool not active, rounds with existing games

**Dependencies:** Task 1

---

### Task 3: Update Hook to Use Batch RPC
**Status:** ✅ Complete (2026-01-10)
**Type:** Custom
**Priority:** Critical

**Prompt:**
```
Update src/hooks/useSkins.ts useAutoSplitSkinsForCompetition to use the new batch RPC.

Replace the createAutoSplitSkins mutation (lines ~1420-1480) with:

1. Single RPC call:
   const { data: results, error } = await supabase.rpc('create_auto_split_skins_batch', {
     p_competition_id: competitionId,
     p_pool_id: poolId,
     p_round_ids: roundsToCreate.map(r => r.id),
     p_pot_per_round: potPerRound,
     p_scoring_type: scoringType,
     p_created_by: userId,
   });

2. Handle error response:
   if (error) {
     return {
       success: false,
       gamesCreated: 0,
       totalDrawn: 0,
       gameIds: [],
       error: error.message,
     };
   }

3. Calculate totals from results:
   const gameIds = results.map(r => r.game_id);
   const totalDrawn = results.reduce((sum, r) => sum + r.draw_amount, 0);

4. Return success:
   return {
     success: true,
     gamesCreated: gameIds.length,
     totalDrawn,
     gameIds,
   };

This ensures atomic creation - either all games created or none.
```

**Deliverables:**
- [x] RPC call replaces loop
- [x] Error handling updated
- [x] Return value calculated from RPC response
- [x] Removed individual draw/create logic

**Completed:**
- Replaced the for-loop with single `create_auto_split_skins_batch` RPC call at line 1420-1432
- Handles RPC error by returning user-friendly error message
- Calculates `gameIds` and `totalDrawn` from batch results
- Removed pre-validation code (now handled atomically in the RPC)
- Removed individual `draw_from_pool` and skins_games insert logic
- Kept client-side participant check for early "No players" error feedback

**Dependencies:** Task 2

---

## Phase 2: Code Deduplication

### Task 4: Add formatCurrency to Shared Formatters
**Status:** ✅ Complete (2026-01-10)
**Type:** Custom

**Prompt:**
```
The formatCurrency and formatNetResult functions already exist in src/utils/skinsCalculations.ts (from Phase 1 consolidation).

However, Prize Pool components are not using them. Update src/utils/formatting.ts to re-export these for discoverability:

Add at the end of src/utils/formatting.ts:

// ============================================================================
// CURRENCY FORMATTING (re-exported from skinsCalculations for convenience)
// ============================================================================

export { formatCurrency, formatNetResult } from './skinsCalculations';

This makes currency formatting discoverable alongside other formatters without moving the functions.
```

**Deliverables:**
- [x] Re-exports added to formatting.ts
- [x] No duplicate implementations

**Completed:**
- Added re-exports for `formatCurrency` and `formatNetResult` at end of `src/utils/formatting.ts`
- Currency formatters now discoverable alongside other date/time formatters
- No code duplication - just re-exports from `skinsCalculations.ts`

**Dependencies:** Phase 1 Consolidation Task 7 (already complete)

---

### Task 5: Update PrizePoolSection to Use Shared Formatters
**Status:** Pending
**Type:** Custom

**Prompt:**
```
Update src/components/prizePool/PrizePoolSection.tsx to use shared formatCurrency.

1. Add import:
   import { formatCurrency } from '@/utils/formatting';

2. Remove local formatCurrency function (around line 273):
   // DELETE: const formatCurrency = (amount: number) => { return `$${amount.toFixed(2)}`; };

3. The imported function has the same signature, so no other changes needed.
```

**Deliverables:**
- [ ] Import added
- [ ] Local function removed
- [ ] Component renders correctly

**Dependencies:** Task 4

---

### Task 6: Update PrizePoolSummaryCard to Use Shared Formatters
**Status:** Pending
**Type:** Custom

**Prompt:**
```
Update src/components/prizePool/PrizePoolSummaryCard.tsx to use shared formatCurrency.

1. Add import:
   import { formatCurrency } from '@/utils/formatting';

2. Remove local formatCurrency function (around line 78):
   // DELETE: const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

3. The imported function has the same signature, so no other changes needed.
```

**Deliverables:**
- [ ] Import added
- [ ] Local function removed
- [ ] Component renders correctly

**Dependencies:** Task 4

---

### Task 7: Update PoolTransactionsList to Use Shared Formatters
**Status:** Pending
**Type:** Custom

**Prompt:**
```
Update src/components/prizePool/PoolTransactionsList.tsx to use shared formatters.

1. Add imports:
   import { formatCurrency, formatNetResult } from '@/utils/formatting';

2. Remove local formatAmount function (around lines 145-150):
   // DELETE: function formatAmount(amount: number): string { ... }

3. Remove local formatBalance function (around lines 152-155):
   // DELETE: function formatBalance(amount: number): string { ... }

4. Update usage:
   - Replace formatAmount(transaction.amount) with:
     formatNetResult(transaction.amount) for signed amounts
   - Replace formatBalance(transaction.balance_after) with:
     formatCurrency(transaction.balance_after) for unsigned amounts

5. Note: formatNetResult uses +/- prefix which matches the original formatAmount behavior.
```

**Deliverables:**
- [ ] Imports added
- [ ] Local functions removed
- [ ] Usage updated to match function signatures
- [ ] Amounts display correctly with signs

**Dependencies:** Task 4

---

### Task 8: Create Shared AllocationRow Component
**Status:** Pending
**Type:** Command
**Command:** `/component`

**Prompt:**
```
Create src/components/prizePool/AllocationRow.tsx - a shared component for displaying allocation progress.

Props interface:
interface AllocationRowProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  iconColor: string;
  label: string;
  percent: number;
  budget: number;
  used?: number;
  remaining?: number;
  showProgress?: boolean; // Show used/remaining progress bar
  compact?: boolean; // Smaller variant for summary cards
}

Layout:
- Row with icon, label, percentage, and budget amount
- Optional progress bar showing used vs remaining
- Compact mode reduces spacing and font sizes

Used in:
- PrizePoolSection.tsx (input mode without progress)
- PrizePoolSummaryCard.tsx (display mode with progress)

The component should consolidate the duplicate AllocationRow implementations from:
- PrizePoolSection.tsx (lines 614-653)
- PrizePoolSummaryCard.tsx (lines 231-306)

Use theme colors: colors.primary (skins), colors.warning (winner), colors.textSecondary (other)
Import skinsColor from @/constants/theme for the skins allocation color.

Export from src/components/prizePool/index.ts
```

**Deliverables:**
- [ ] `src/components/prizePool/AllocationRow.tsx`
- [ ] Supports both input and display modes
- [ ] Uses shared skinsColor from theme
- [ ] Exported from index.ts

**Dependencies:** None

---

### Task 9: Update PrizePoolSection to Use Shared AllocationRow
**Status:** Pending
**Type:** Custom

**Prompt:**
```
Update src/components/prizePool/PrizePoolSection.tsx to use the shared AllocationRow component.

1. Import AllocationRow:
   import { AllocationRow } from './AllocationRow';

2. Remove local AllocationRow component (lines 614-653)

3. Update the allocation section (around lines 400-450) to use the shared component:
   <AllocationRow
     icon={IconDice}
     iconColor={skinsColor}
     label="Skins Games"
     percent={config.skinsAllocationPercent}
     budget={skinsAllocationBudget}
   />

   Similarly for Winner Prizes and Other allocations.

4. Remove related styles that are now in the shared component:
   - allocationRow
   - allocationIcon
   - allocationLabel
   - etc.
```

**Deliverables:**
- [ ] Import added
- [ ] Local component removed
- [ ] Usage updated with correct props
- [ ] Related styles removed

**Dependencies:** Task 8

---

### Task 10: Update PrizePoolSummaryCard to Use Shared AllocationRow
**Status:** Pending
**Type:** Custom

**Prompt:**
```
Update src/components/prizePool/PrizePoolSummaryCard.tsx to use the shared AllocationRow component.

1. Import AllocationRow:
   import { AllocationRow } from './AllocationRow';

2. Remove local AllocationRow component (lines 231-306)

3. Update the allocation display (around lines 130-180) to use shared component:
   <AllocationRow
     icon={IconDice}
     iconColor={skinsColor}
     label="Skins Games"
     percent={summary.skins.percent}
     budget={summary.skins.budget}
     used={summary.skins.used}
     remaining={summary.skins.remaining}
     showProgress
   />

   Similarly for Winner Prizes and Other allocations.

4. Remove related styles that are now in the shared component
```

**Deliverables:**
- [ ] Import added
- [ ] Local component removed
- [ ] Usage updated with progress props
- [ ] Related styles removed

**Dependencies:** Task 8

---

### Task 11: Consolidate Error Handler Factories
**Status:** Pending
**Type:** Custom

**Prompt:**
```
Create src/utils/serviceErrors.ts with a shared error factory.

Content:
/**
 * Standard error codes for service operations
 */
export type ServiceErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'DATABASE'
  | 'PERMISSION'
  | 'LOCKED'
  | 'INSUFFICIENT_FUNDS'
  | 'UNKNOWN';

/**
 * Standard service error interface
 */
export interface ServiceError extends Error {
  code: ServiceErrorCode;
}

/**
 * Create a typed service error
 *
 * @param message - Error message
 * @param code - Error code
 * @returns ServiceError instance
 *
 * @example
 * throw createServiceError('Pool not found', 'NOT_FOUND');
 */
export function createServiceError(
  message: string,
  code: ServiceErrorCode
): ServiceError {
  const error = new Error(message) as ServiceError;
  error.code = code;
  return error;
}

/**
 * Type guard to check if error is a ServiceError
 */
export function isServiceError(error: unknown): error is ServiceError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as ServiceError).code === 'string'
  );
}

Export from src/utils/index.ts
```

**Deliverables:**
- [ ] `src/utils/serviceErrors.ts` created
- [ ] ServiceErrorCode type exported
- [ ] ServiceError interface exported
- [ ] createServiceError function exported
- [ ] isServiceError type guard exported
- [ ] Exported from utils/index.ts

**Dependencies:** None

---

### Task 12: Update usePrizePool to Use Shared Error Factory
**Status:** Pending
**Type:** Custom

**Prompt:**
```
Update src/hooks/usePrizePool.ts to use the shared error factory.

1. Replace imports:
   // REMOVE: Local PrizePoolServiceError type (lines 32-34)
   // REMOVE: Local createError function (lines 53-60)

   // ADD:
   import { createServiceError, ServiceError, ServiceErrorCode } from '@/utils/serviceErrors';

2. Update type alias for backwards compatibility:
   export type PrizePoolServiceError = ServiceError;

3. Replace createError usage:
   // Before: throw createError('Pool not found', 'NOT_FOUND');
   // After:  throw createServiceError('Pool not found', 'NOT_FOUND');

4. Search and replace all createError calls with createServiceError.
```

**Deliverables:**
- [ ] Import updated
- [ ] Local types removed
- [ ] Type alias added for compatibility
- [ ] All createError calls updated

**Dependencies:** Task 11

---

### Task 13: Update useSkins to Use Shared Error Factory
**Status:** Pending
**Type:** Custom

**Prompt:**
```
Update src/hooks/useSkins.ts to use the shared error factory.

1. Replace imports:
   // REMOVE: Local SkinsServiceError type (lines 52-54)
   // REMOVE: Local createError function (lines 72-79)

   // ADD:
   import { createServiceError, ServiceError, ServiceErrorCode } from '@/utils/serviceErrors';

2. Update type alias for backwards compatibility:
   export type SkinsServiceError = ServiceError;

3. Replace createError usage:
   // Before: throw createError('Game not found', 'NOT_FOUND');
   // After:  throw createServiceError('Game not found', 'NOT_FOUND');

4. Search and replace all createError calls with createServiceError.
```

**Deliverables:**
- [ ] Import updated
- [ ] Local types removed
- [ ] Type alias added for compatibility
- [ ] All createError calls updated

**Dependencies:** Task 11

---

## Phase 3: Performance Optimization

### Task 14: Create get_pool_summary RPC Function
**Status:** Pending
**Type:** Command
**Command:** `/db`

**Prompt:**
```
Create migration for pool summary RPC that returns all balances in one call.

New PostgreSQL function get_pool_summary:
- Parameters: p_pool_id UUID
- Returns: TABLE (
    total_pool_amount DECIMAL,
    skins_budget DECIMAL,
    skins_remaining DECIMAL,
    winner_budget DECIMAL,
    winner_remaining DECIMAL,
    other_budget DECIMAL,
    other_remaining DECIMAL,
    transaction_count INTEGER,
    is_locked BOOLEAN
  )
- SECURITY DEFINER
- STABLE (for query caching)

Implementation:
1. Get pool record for budgets and lock status
2. Get balances via existing get_pool_balance() for each category
3. Count transactions in pool_transactions table
4. Return as single row

This replaces 4 separate RPC calls with 1 in usePoolBalance hook.
```

**Deliverables:**
- [ ] `supabase/migrations/XXXXXXXX_pool_summary_rpc.sql`
- [ ] `get_pool_summary()` function
- [ ] Returns all needed data in one call
- [ ] STABLE for caching

**Dependencies:** None

---

### Task 15: Update usePoolBalance to Use Summary RPC
**Status:** Pending
**Type:** Custom

**Prompt:**
```
Update src/hooks/usePrizePool.ts usePoolBalance hook to use the new get_pool_summary RPC.

Current implementation (lines 200-264) makes 4 separate RPC calls:
- get_pool_balance (skins)
- get_pool_balance (winner)
- get_pool_balance (other)
- count query on pool_transactions

Replace with single call:

1. Update queryFn:
   const { data, error } = await supabase.rpc('get_pool_summary', {
     p_pool_id: poolId
   });

   if (error) throw error;

   return {
     total: data.total_pool_amount,
     skins_remaining: data.skins_remaining,
     winner_remaining: data.winner_remaining,
     other_remaining: data.other_remaining,
     transactions_count: data.transaction_count,
   };

2. Keep the same return type (PoolBalanceSummary) for compatibility.

3. Update staleTime to 10s (matches current behavior).
```

**Deliverables:**
- [ ] Single RPC call replaces 4 calls
- [ ] Same return type maintained
- [ ] Error handling preserved
- [ ] staleTime unchanged

**Dependencies:** Task 14

---

## Phase 4: Component Refactoring

### Task 16: Create PrizePoolSection Sub-Components Directory
**Status:** Pending
**Type:** Custom

**Prompt:**
```
Create directory structure for PrizePoolSection refactoring:

src/components/prizePool/PrizePoolSection/
├── index.tsx              # Main container (~200 lines)
├── FundingSection.tsx     # Funding type and amount (~150 lines)
├── AllocationSection.tsx  # Allocation percentages (~150 lines)
├── AutoSplitSection.tsx   # Auto-split toggle and info (~100 lines)
├── LockedStateInfo.tsx    # Locked state display (~80 lines)
├── types.ts               # Shared types
└── constants.ts           # Shared constants

For now, just create the directory and move the existing PrizePoolSection.tsx to:
src/components/prizePool/PrizePoolSection/index.tsx

No code changes in this task - just file reorganization.
Update the barrel export in src/components/prizePool/index.ts to import from the new path.
```

**Deliverables:**
- [ ] Directory created
- [ ] PrizePoolSection.tsx moved to index.tsx
- [ ] Barrel export updated
- [ ] Imports still work

**Dependencies:** Tasks 5, 9 (complete formatter and AllocationRow first)

---

### Task 17: Extract FundingSection Component
**Status:** Pending
**Type:** Custom

**Prompt:**
```
Extract FundingSection from src/components/prizePool/PrizePoolSection/index.tsx.

Create src/components/prizePool/PrizePoolSection/FundingSection.tsx:

Props:
interface FundingSectionProps {
  fundingType: PoolFundingType;
  fundingAmount: number;
  playerCount: number;
  totalPoolAmount: number;
  onFundingTypeChange: (type: PoolFundingType) => void;
  onFundingAmountChange: (amount: number) => void;
  disabled?: boolean;
}

Extract from index.tsx (approximately lines 300-380):
- Funding type SegmentedButton
- Funding amount TextInput
- Total pool calculation display
- Related styles

Update index.tsx to import and use FundingSection.
```

**Deliverables:**
- [ ] FundingSection.tsx created
- [ ] Props interface defined
- [ ] Component extracted with styles
- [ ] index.tsx updated to use it

**Dependencies:** Task 16

---

### Task 18: Extract AutoSplitSection Component
**Status:** Pending
**Type:** Custom

**Prompt:**
```
Extract AutoSplitSection from src/components/prizePool/PrizePoolSection/index.tsx.

Create src/components/prizePool/PrizePoolSection/AutoSplitSection.tsx:

Props:
interface AutoSplitSectionProps {
  enabled: boolean;
  potPerRound: number | null;
  roundCount: number;
  skinsAllocationPercent: number;
  totalPoolAmount: number;
  onEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
}

Extract from index.tsx (approximately lines 500-560):
- Auto-split toggle Switch
- Info text explaining auto-split
- Per-round calculation display
- Related styles

Update index.tsx to import and use AutoSplitSection.
```

**Deliverables:**
- [ ] AutoSplitSection.tsx created
- [ ] Props interface defined
- [ ] Component extracted with styles
- [ ] index.tsx updated to use it

**Dependencies:** Task 16

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 18
- **Completed:** 4 (22%)
- **In Progress:** 0 (0%)
- **Pending:** 14 (78%)

### Phase Progress

| Phase | Description | Tasks | Status |
|-------|-------------|-------|--------|
| Phase 1 | Critical Fixes | 3 | ✅ Complete |
| Phase 2 | Code Deduplication | 10 | In Progress (1/10) |
| Phase 3 | Performance Optimization | 2 | Pending |
| Phase 4 | Component Refactoring | 3 | Pending |

---

## Critical Files

### Files to Create
| File | Purpose |
|------|---------|
| `supabase/migrations/XXXXXXXX_auto_split_batch.sql` | Atomic auto-split RPC |
| `supabase/migrations/XXXXXXXX_pool_summary_rpc.sql` | Pool summary RPC |
| `src/utils/serviceErrors.ts` | Shared error factory |
| `src/components/prizePool/AllocationRow.tsx` | Shared allocation component |
| `src/components/prizePool/PrizePoolSection/FundingSection.tsx` | Funding sub-component |
| `src/components/prizePool/PrizePoolSection/AutoSplitSection.tsx` | Auto-split sub-component |

### Files to Modify
| File | Changes |
|------|---------|
| `src/utils/formatting.ts` | Re-export currency formatters |
| `src/utils/index.ts` | Export serviceErrors |
| `src/hooks/useSkins.ts` | Use batch RPC, shared errors |
| `src/hooks/usePrizePool.ts` | Use summary RPC, shared errors |
| `src/components/prizePool/PrizePoolSection.tsx` | Use shared components |
| `src/components/prizePool/PrizePoolSummaryCard.tsx` | Use shared components |
| `src/components/prizePool/PoolTransactionsList.tsx` | Use shared formatters |
| `src/components/prizePool/index.ts` | Export AllocationRow |

---

## Verification

How to verify the plan is complete:
- [ ] Auto-split creates all games atomically (no partial state)
- [ ] Insufficient funds detected before any operations
- [ ] No local formatCurrency functions in prizePool components
- [ ] Only one AllocationRow component exists
- [ ] usePoolBalance makes 1 RPC call (not 4)
- [ ] No local createError functions in hook files
- [ ] PrizePoolSection < 300 lines (down from 874)
- [ ] TypeScript compiles without errors
- [ ] All prize pool UI renders correctly
- [ ] Unit tests pass

---

## Recommended Execution Order

**Week 1 - Critical (Tasks 1-3):**
Start with auto-split fixes as they affect data integrity.

**Week 2 - Deduplication (Tasks 4-13):**
Currency formatters and error factories can be done in parallel.
AllocationRow consolidation after formatters.

**Week 3 - Performance & Refactoring (Tasks 14-18):**
RPC optimization, then component splitting.

---

**Last Updated:** 2026-01-10
**Status:** In Progress
**Current Phase:** Phase 2 - Code Deduplication (1/10 complete)
**Predecessor:** SKINS-PHASE-1-CONSOLIDATION-PLAN.md (complete)
