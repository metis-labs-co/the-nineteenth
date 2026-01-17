# Plan: Prize Pool Auto-Split Skins Fix

## Overview

Fix critical bugs in the prize pool auto-split skins feature and enhance it so that:
1. Skins games are automatically created when a prize pool with skins allocation is saved
2. ALL competition players participate in each round's skins game (no 4-player limit)
3. Pot amounts are redistributed evenly when rounds are added/removed

## Problem Statement

**Current State:** The auto-split skins feature was implemented but has multiple bugs that prevent it from working:

1. **RPC Validation Bug** - Always rejects new pools due to wrong validation logic
2. **Player Status Mismatch** - Hook checks 'accepted' but RPC checks 'confirmed'
3. **skins_pot_per_round Never Calculated** - Nothing calls the calculation RPC on pool save
4. **4-Player Limit** - RPC limits skins games to 4 players
5. **Triggers Only on Navigation** - Doesn't trigger when prize pool is saved

**Expected Behavior:**
- Competition with $120 skins budget and 3 rounds
- Each round should get $40 skins game automatically
- All players (e.g., 8 players) should be participants
- Adding round 4 should redistribute to $30 each

## Approach

1. Fix database RPC function bugs
2. Add pot redistribution RPC for dynamic rebalancing
3. Trigger auto-split on prize pool save (not just navigation)
4. Trigger redistribution when rounds are added/removed
5. Remove 4-player limit for pool-sourced skins games

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Participant scope | All competition players | User requirement - not per-pairing |
| Trigger timing | On pool save + round add/remove | User requirement - both triggers |
| Player limit | Remove for pool-sourced | User requirement - support larger groups |
| Redistribution rule | Lock in-progress rounds, split remaining | Fairness - don't change active games |
| Round deletion | Return funds to pool | User requirement - reclaim unspent |

---

## Phase 1: Database Fixes

### Step 1.1: Fix create_auto_split_skins_batch RPC
**Status:** ✅ Complete (2026-01-14)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create new migration at supabase/migrations/20260118000000_fix_auto_split_batch.sql

This migration will replace the create_auto_split_skins_batch function to fix:

1. VALIDATION BUG (Line 70-72 of original):
   Current (WRONG):
   IF NOT v_pool.is_locked OR v_pool.status != 'active' THEN

   Fix: Allow both draft pools (before first round) AND active pools (after start):
   IF v_pool.status NOT IN ('draft', 'active') THEN
     RAISE EXCEPTION 'Pool status must be draft or active, got: %', v_pool.status;
   END IF;

2. PLAYER STATUS MISMATCH (Line 103 of original):
   Current: AND cp.status = 'confirmed'
   Fix: AND cp.status = 'accepted'

3. REMOVE 4-PLAYER LIMIT (Lines 111-115 of original):
   Remove this entire block:
   IF array_length(v_participant_ids, 1) > 4 THEN
     v_participant_ids := v_participant_ids[1:4];
   END IF;

Reference the original function at:
supabase/migrations/20260117000000_auto_split_batch.sql

Use CREATE OR REPLACE FUNCTION to update the existing function.
Include a comment block explaining what was fixed.
```

**Deliverables:**
- [x] Migration file created
- [x] Validation logic fixed
- [x] Player status changed to 'accepted'
- [x] 4-player limit removed

**Completed:**
- Created `supabase/migrations/20260118000000_fix_auto_split_batch.sql`
- Fixed validation to allow 'draft' and 'active' pool status
- Changed player status check from 'confirmed' to 'accepted'
- Removed the 4-player limit entirely for pool-sourced skins games

**Dependencies:** None
**Notes:** This is the critical fix that unblocks the entire feature.

---

### Step 1.2: Create Pot Redistribution RPC Function
**Status:** ✅ Complete (2026-01-14)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create new migration at supabase/migrations/20260118000001_redistribute_skins_pots.sql

Create function redistribute_skins_pots(p_competition_id UUID) that:

1. Get prize pool for competition (fail if none)
2. Get all rounds with their skins games and round status
3. Calculate locked amount:
   SELECT COALESCE(SUM(sg.pot_value), 0)
   FROM skins_games sg
   JOIN rounds r ON r.id = sg.round_id
   WHERE r.competition_id = p_competition_id
     AND r.status IN ('in_progress', 'completed')
     AND sg.pool_source = 'prize_pool'
     AND sg.status != 'cancelled'

4. Calculate remaining budget:
   remaining = pool.skins_budget - locked_amount

5. Count upcoming rounds:
   SELECT COUNT(*) FROM rounds
   WHERE competition_id = p_competition_id
     AND status = 'upcoming'

6. If upcoming_rounds > 0:
   new_pot_per_round = remaining / upcoming_rounds

7. For each upcoming round WITH existing pool-sourced skins game:
   - Return current pot via return_to_pool(pool_id, round_id, current_pot)
   - Draw new pot via draw_from_pool(pool_id, round_id, new_pot_per_round)
   - Update skins_games.pot_value and pool_draw_amount

8. For each upcoming round WITHOUT skins game:
   - Create new skins game with new_pot_per_round
   - Use all competition players as participants

9. Update pool.skins_pot_per_round = new_pot_per_round

Return:
TABLE (
  rounds_updated INT,
  rounds_created INT,
  new_pot_per_round DECIMAL,
  locked_amount DECIMAL
)

Include proper error handling and transaction safety.
Reference existing functions:
- draw_from_pool (supabase/migrations/20260113000000_prize_pool_functions.sql)
- return_to_pool (same file)
- create_auto_split_skins_batch (for game creation pattern)
```

**Deliverables:**
- [x] Migration file created
- [x] Function handles locked rounds correctly
- [x] Function creates games for new rounds
- [x] Function updates existing games
- [x] Transaction audit trail maintained

**Completed:**
- Created `supabase/migrations/20260118000001_redistribute_skins_pots.sql`
- Function calculates locked amount from in_progress/completed rounds
- Function evenly distributes remaining budget across upcoming rounds
- For existing skins games: returns old pot, draws new pot, updates game record
- For new rounds: draws from pool and creates skins game with all accepted players
- Uses return_to_pool/draw_from_pool for complete transaction audit trail
- Returns summary of rounds updated/created and new pot amounts

**Dependencies:** Step 1.1
**Notes:** This is the core redistribution logic.

---

## Phase 2: Hook Updates

### Step 2.1: Add Auto-Split Trigger to Prize Pool Mutations
**Status:** ✅ Complete (2026-01-14)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify src/hooks/usePrizePool.ts to trigger auto-split when prize pool is saved.

Changes to useCreatePrizePool and useUpdatePrizePool:

1. Import useAutoSplitSkinsForCompetition from '@/hooks/useSkins'
2. Import useAuth for user ID

3. In mutationFn or onSuccess, after pool is saved:
   a. If auto_split_skins = true:
      - Fetch round count for competition
      - If rounds > 0:
        - Call auto_split_pool_for_skins RPC to calculate skins_pot_per_round
        - Call redistribute_skins_pots RPC to create/update skins games

4. Handle this as a sequential operation:
   - First create/update pool
   - Then trigger redistribution

Implementation approach - add to onSuccess callback:
```typescript
onSuccess: async (data) => {
  // Existing query invalidations...

  if (data.auto_split_skins) {
    try {
      // Fetch round count
      const { count } = await supabase
        .from('rounds')
        .select('*', { count: 'exact', head: true })
        .eq('competition_id', data.competition_id)
        .eq('status', 'upcoming');

      if (count && count > 0) {
        // Trigger redistribution (handles both calculation and game creation)
        await supabase.rpc('redistribute_skins_pots', {
          p_competition_id: data.competition_id,
        });

        // Invalidate skins queries
        queryClient.invalidateQueries({ queryKey: skinsKeys.all });
      }
    } catch (error) {
      console.warn('[PrizePool] Auto-split trigger failed:', error);
      // Non-blocking - pool was saved successfully
    }
  }
},
```

Reference:
- src/hooks/usePrizePool.ts (useCreatePrizePool at ~line 430)
- src/hooks/usePrizePool.ts (useUpdatePrizePool at ~line 530)
```

**Deliverables:**
- [x] Auto-split triggered on pool create
- [x] Auto-split triggered on pool update
- [x] Error handling is non-blocking
- [x] Query invalidation after trigger

**Completed:**
- Added async `onSuccess` callback to `useCreatePrizePool` that checks `auto_split_skins` flag
- Added async `onSuccess` callback to `useUpdatePrizePool` that checks `auto_split_skins` flag
- Both mutations now fetch upcoming round count and call `redistribute_skins_pots` RPC
- Error handling is non-blocking (console.warn only, pool save succeeds regardless)
- Query invalidation for `skinsKeys.all` and `roundKeys.all` after successful redistribution

**Dependencies:** Step 1.1, Step 1.2
**Notes:** This makes auto-split work immediately when prize pool is configured.

---

### Step 2.2: Update Round Add to Trigger Redistribution
**Status:** ✅ Complete (2026-01-14)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify src/screens/admin/AddRoundScreen/hooks/useAddRoundForm.ts

In the onSuccess callback after round is created:

1. Check if competition has prize pool with auto_split_skins = true
2. If yes, call redistribute_skins_pots RPC
3. This will:
   - Recalculate pot per round
   - Update existing upcoming games
   - Create game for new round

Replace the existing syncAutoSplitSkins call with:
```typescript
// After round creation succeeds
if (prizePool?.auto_split_skins) {
  try {
    const { data, error } = await supabase.rpc('redistribute_skins_pots', {
      p_competition_id: competitionId,
    });

    if (error) {
      console.warn('[AddRound] Redistribution failed:', error);
    } else {
      console.log('[AddRound] Redistribution result:', data);
      // Invalidate skins queries
      queryClient.invalidateQueries({ queryKey: skinsKeys.all });
    }
  } catch (error) {
    console.warn('[AddRound] Redistribution error:', error);
  }
}
```

Reference:
- src/screens/admin/AddRoundScreen/hooks/useAddRoundForm.ts (lines 295-317)
```

**Deliverables:**
- [x] Redistribution called on round add
- [x] Query invalidation after redistribution
- [x] Non-blocking error handling

**Completed:**
- Replaced `useAutoSplitSkinsForCompetition` hook with direct RPC call to `redistribute_skins_pots`
- Added `skinsKeys` and `roundKeys` imports from `@/hooks/queryKeys`
- Updated `onSuccess` callback to call redistribution RPC when `auto_split_skins` is enabled
- Error handling is non-blocking (console.warn only, round creation succeeds regardless)
- Query invalidation for `skinsKeys.all` and `roundKeys.all` after successful redistribution
- Simplified condition to only check `auto_split_skins` flag (removed dependency on `skins_pot_per_round` pre-existence)

**Dependencies:** Step 1.2, Step 2.1
**Notes:** This ensures pot is redistributed when rounds are added.

---

### Step 2.3: Handle Round Deletion
**Status:** ✅ Complete (2026-01-15)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Find where rounds are deleted and add skins cleanup logic.

Search for round deletion in:
- src/hooks/useRoundMutations.ts (or similar)
- src/screens/admin/* (round management screens)

Add to the round deletion logic:

1. Before deleting round, check if it has a pool-sourced skins game
2. If yes:
   - Cancel the skins game (set status = 'cancelled')
   - Return pot to pool via return_to_pool RPC
3. After round deletion:
   - Call redistribute_skins_pots to rebalance remaining rounds

Implementation:
```typescript
const handleDeleteRound = async (roundId: string, competitionId: string) => {
  // Check for skins game
  const { data: skinsGame } = await supabase
    .from('skins_games')
    .select('id, pot_value, pool_source')
    .eq('round_id', roundId)
    .eq('pool_source', 'prize_pool')
    .neq('status', 'cancelled')
    .single();

  if (skinsGame) {
    // Get pool ID
    const { data: pool } = await supabase
      .from('competition_prize_pools')
      .select('id')
      .eq('competition_id', competitionId)
      .single();

    if (pool) {
      // Return funds to pool
      await supabase.rpc('return_to_pool', {
        p_pool_id: pool.id,
        p_round_id: roundId,
        p_amount: skinsGame.pot_value,
        p_description: 'Round deleted - skins pot returned',
      });

      // Cancel skins game
      await supabase
        .from('skins_games')
        .update({ status: 'cancelled' })
        .eq('id', skinsGame.id);
    }
  }

  // Delete the round
  await supabase.from('rounds').delete().eq('id', roundId);

  // Redistribute remaining budget
  const { data: prizePool } = await supabase
    .from('competition_prize_pools')
    .select('auto_split_skins')
    .eq('competition_id', competitionId)
    .single();

  if (prizePool?.auto_split_skins) {
    await supabase.rpc('redistribute_skins_pots', {
      p_competition_id: competitionId,
    });
  }
};
```

If no central round deletion hook exists, create one.
```

**Deliverables:**
- [x] Skins game cancelled on round delete
- [x] Pot returned to pool
- [x] Redistribution triggered for remaining rounds
- [x] Transaction audit trail maintained

**Completed:**
- Found two locations where rounds are deleted:
  1. `src/hooks/useDeleteRound.ts` - Main dedicated hook for round deletion
  2. `src/screens/rounds/RoundListScreen/hooks/useRoundActions.ts` - Inline mutation for standalone rounds
- Updated both files to include skins cleanup logic:
  - Before deletion: Check for pool-sourced skins game, return pot to pool, cancel game
  - After deletion: Trigger `redistribute_skins_pots` if `auto_split_skins` is enabled
- Added query invalidation for skins and prize pool data after deletion
- Error handling is non-blocking (console.warn only, deletion succeeds regardless)

**Dependencies:** Step 1.2
**Notes:** Ensures funds are recovered when rounds are removed.

---

## Phase 3: Cleanup

### Step 3.1: Simplify useAutoSplitSkinsSync Hook
**Status:** ✅ Complete (2026-01-15)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify src/hooks/useAutoSplitSkinsSync.ts

Since auto-split is now triggered:
- On prize pool save (Phase 2.1)
- On round add (Phase 2.2)
- On round delete (Phase 2.3)

The passive detection in useAutoSplitSkinsSync is no longer needed.

Options:
1. Keep for backwards compatibility but mark shouldTrigger as always false
2. Remove the shouldTrigger logic entirely
3. Deprecate the hook

Recommended approach: Simplify to only provide status information:
- Remove shouldTrigger logic
- Keep pot/round info queries for display purposes
- Remove triggerAutoSplit function (now handled elsewhere)

Or keep as manual fallback trigger if automatic fails.

Review existing usage:
- src/screens/competitions/CompetitionDetailScreen.tsx
- Update to remove auto-trigger useEffect if hook changes
```

**Deliverables:**
- [x] Hook simplified or deprecated
- [x] CompetitionDetailScreen updated if needed
- [x] No broken references

**Completed:**
- Simplified `useAutoSplitSkinsSync` to be a read-only status hook:
  - Removed `shouldTrigger` logic
  - Removed `triggerAutoSplit` function
  - Removed `isCreating` and `error` state
  - Kept only status info: `isLoading`, `potPerRound`, `roundCount`, `skinsGamesCreated`, `playerCount`
  - Marked hook as `@deprecated` with guidance to use `useCompetitionPrizePool` directly
- Updated `CompetitionDetailScreen`:
  - Removed `useAutoSplitSkinsSync` import and hook call
  - Removed auto-trigger `useEffect` and related ref
  - Removed snackbar state for auto-split feedback
  - Removed `Snackbar` component import and usage
  - Added comment explaining auto-split is now handled by mutations
- Updated `src/hooks/index.ts`:
  - Removed `AutoSplitTriggerResult` export (type no longer exists)
  - Updated comment to indicate hook is deprecated

**Dependencies:** Step 2.1, Step 2.2, Step 2.3
**Notes:** Clean up old passive detection approach.

---

## Critical Files

### To Create
- `supabase/migrations/20260118000000_fix_auto_split_batch.sql` - RPC bug fixes
- `supabase/migrations/20260118000001_redistribute_skins_pots.sql` - Redistribution RPC

### To Modify
- `src/hooks/usePrizePool.ts` - Add auto-split trigger to mutations
- `src/screens/admin/AddRoundScreen/hooks/useAddRoundForm.ts` - Call redistribution on round add
- `src/hooks/useRoundMutations.ts` (or equivalent) - Handle round deletion
- `src/hooks/useAutoSplitSkinsSync.ts` - Simplify or deprecate

### Reference Files (Read Only)
- `supabase/migrations/20260117000000_auto_split_batch.sql` - Original buggy RPC
- `supabase/migrations/20260113000000_prize_pool_functions.sql` - draw_from_pool, return_to_pool
- `src/hooks/useSkins.ts` - Existing auto-split functions

---

## Verification

### Test 1: Basic Auto-Split on Pool Creation
1. Create competition
2. Add 2 rounds
3. Add 4 players (status = 'accepted')
4. Enable prize pool with $120 total, 60% skins allocation = $72 budget
5. Enable auto-split toggle
6. Save prize pool

**Expected:**
- [ ] `skins_pot_per_round` = $36
- [ ] 2 skins games created (one per round)
- [ ] Each skins game has all 4 players as participants
- [ ] `pool_transactions` has 2 `skins_draw` entries of $36 each

### Test 2: Add Round - Redistribution
1. Using competition from Test 1
2. Add round 3

**Expected:**
- [ ] Round 1 & 2 skins games get pot adjusted to $24
- [ ] Round 3 skins game created with $24 pot
- [ ] Transaction log shows return + redraw for adjusted games

### Test 3: Round In Progress - Locked Pot
1. Start round 1 (status = 'in_progress')
2. Add round 4

**Expected:**
- [ ] Round 1 pot stays at $24 (locked)
- [ ] Remaining budget = $72 - $24 = $48
- [ ] Rounds 2, 3, 4 get $16 each ($48 / 3)

### Test 4: Round Deletion
1. Delete round 4

**Expected:**
- [ ] Round 4 skins game cancelled
- [ ] $16 returned to pool
- [ ] Rounds 2 & 3 redistributed to $24 each

### Test 5: Large Player Count
1. Create competition with 8 players
2. Enable prize pool with auto-split
3. Add 2 rounds

**Expected:**
- [ ] Skins games created with all 8 players
- [ ] No 4-player limit enforced

### Test 6: Database Integrity
- [ ] Verify `pool_transactions` audit trail is complete
- [ ] Verify `skins_games.pool_draw_amount` matches transactions
- [ ] Verify pool balance matches expected after all operations

---

## Pot Redistribution Algorithm

When rounds are added or removed:

```
total_budget = prize_pool.skins_budget
locked_amount = SUM(skins_games.pot_value WHERE round.status IN ('in_progress', 'completed'))
remaining_budget = total_budget - locked_amount
upcoming_round_count = COUNT(rounds WHERE status = 'upcoming')
pot_per_upcoming_round = remaining_budget / upcoming_round_count
```

**Example:**
- Total skins budget: $120
- 3 rounds exist, Round 1 is in progress with $40 pot
- User adds Round 4
- Locked amount: $40 (Round 1)
- Remaining: $80
- Upcoming rounds: 3 (Rounds 2, 3, 4)
- New pot per upcoming round: $80 / 3 = $26.67
