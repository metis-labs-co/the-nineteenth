# Plan: Auto-Split Skins Implementation

## Overview

Implement automatic creation of skins games when a competition prize pool is configured with `auto_split_skins = true`. Currently, the prize pool stores the configuration but skins games are never created on rounds.

## Problem Statement

**User's Scenario:**
- Competition with 3 rounds and $1000 prize pool
- 75% allocated to skins = $750
- Expected: Each round gets $250 skins game auto-configured
- Actual: Rounds have no skins games

**Root Cause:** The `useAutoSplitSkinsForCompetition().createAutoSplitSkins()` hook exists but is never called.

## Approach

Trigger auto-split skins creation **when players are added** (when count reaches 2+), not at pool creation time. This is necessary because the `create_auto_split_skins_batch` RPC requires 2+ players.

**Trigger Points:**
1. When viewing competition details with 2+ players and auto-split enabled
2. When adding a new round to a competition with auto-split enabled

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Trigger timing | On competition view (not pool creation) | Players are required; none exist at wizard completion |
| Hook pattern | New `useAutoSplitSkinsSync` hook | Centralizes logic, reusable across screens |
| Trigger mechanism | Auto-trigger via useEffect | Seamless UX, no manual button needed |
| Error handling | Non-blocking with toast feedback | Don't break main flow if skins creation fails |
| Scoring type default | `gross` | Most common for skins games |

---

## Phase 1: Core Hook Implementation

### Step 1.1: Create useAutoSplitSkinsSync Hook
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a new hook at src/hooks/useAutoSplitSkinsSync.ts that monitors competition state and triggers auto-split skins creation when conditions are met.

Requirements:
1. Accept competitionId as parameter
2. Use useCompetitionPrizePool to fetch pool config
3. Use useCompetitionPlayerCount (or equivalent) to get player count
4. Use useCompetitionRounds to get rounds
5. Use useAutoSplitSkinsForCompetition from useSkins.ts

Logic:
- shouldTrigger = true when ALL conditions met:
  - pool.auto_split_skins === true
  - pool.skins_pot_per_round > 0
  - playerCount >= 2
  - At least 1 upcoming round exists
  - No skins games created yet (check via useSkinsGamesByCompetition or similar)

- triggerAutoSplit() function that calls createAutoSplitSkins with:
  - competitionId
  - poolId: pool.id
  - potPerRound: pool.skins_pot_per_round
  - scoringType: 'gross'
  - createdBy: user.id

Return object:
{
  shouldTrigger: boolean;
  triggerAutoSplit: () => Promise<AutoSplitSkinsResult | null>;
  isCreating: boolean;
  hasTriggered: boolean; // Track if already triggered this session
  potPerRound: number;
  roundCount: number;
  skinsGamesCreated: number;
  error: string | null;
}

Reference existing hooks:
- src/hooks/useSkins.ts (useAutoSplitSkinsForCompetition, lines 1442-1600)
- src/hooks/usePrizePool.ts (useCompetitionPrizePool)
```

**Deliverables:**
- [x] `src/hooks/useAutoSplitSkinsSync.ts` created
- [x] Hook properly typed with TypeScript
- [x] All dependencies imported correctly

**Dependencies:** None
**Notes:** This is the core hook that other components will use.

---

### Step 1.2: Export Hook from Index
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Add export for the new hook in src/hooks/index.ts:

export { useAutoSplitSkinsSync } from './useAutoSplitSkinsSync';
```

**Deliverables:**
- [x] Export added to `src/hooks/index.ts`

**Dependencies:** Step 1.1
**Notes:** Simple export addition.

---

## Phase 2: Competition Detail Screen Integration

### Step 2.1: Add Auto-Split Trigger to CompetitionDetailScreen
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify src/screens/competitions/CompetitionDetailScreen.tsx to auto-trigger skins creation when conditions are met.

Changes:
1. Import useAutoSplitSkinsSync from '@/hooks'
2. Import useRef for tracking trigger state
3. Add the hook call with competitionId
4. Add useEffect that auto-triggers once when shouldTrigger becomes true

Implementation:
```typescript
import { useAutoSplitSkinsSync } from '@/hooks';

// Inside component:
const {
  shouldTrigger,
  triggerAutoSplit,
  isCreating,
  potPerRound,
  roundCount,
  skinsGamesCreated,
} = useAutoSplitSkinsSync(competitionId);

// Track if we've already triggered this session
const hasTriggeredRef = useRef(false);

// Auto-trigger once when conditions are met
useEffect(() => {
  if (shouldTrigger && !hasTriggeredRef.current && !isCreating) {
    hasTriggeredRef.current = true;
    triggerAutoSplit().then((result) => {
      if (result?.success && result.gamesCreated > 0) {
        // Show success toast
        setToastMessage(`${result.gamesCreated} skins games created ($${potPerRound} each)`);
        setToastVisible(true);
      } else if (result?.error) {
        console.warn('[AutoSplitSkins] Failed:', result.error);
        // Optionally show error toast
      }
    });
  }
}, [shouldTrigger, isCreating, triggerAutoSplit, potPerRound]);
```

Also ensure queries are invalidated after trigger so UI updates.

Reference the existing toast pattern in the file for consistency.
```

**Deliverables:**
- [x] Hook integrated into CompetitionDetailScreen
- [x] Auto-trigger logic with ref guard
- [x] Toast feedback on success (using Snackbar)

**Dependencies:** Step 1.1, Step 1.2
**Notes:** The ref guard prevents multiple triggers on re-renders.

---

## Phase 3: Round Addition Sync

### Step 3.1: Add Sync to AddRoundScreen
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify src/screens/admin/AddRoundScreen/hooks/useAddRoundForm.ts to sync auto-split skins when a new round is added.

Changes:
1. Import useAutoSplitSkinsForCompetition from '@/hooks/useSkins'
2. Import useCompetitionPrizePool from '@/hooks/usePrizePool'
3. Get the syncAutoSplitSkins function
4. In the onSuccess callback of the create mutation, check if pool has auto_split_skins enabled
5. If so, call syncAutoSplitSkins (non-blocking)

Implementation in onSuccess:
```typescript
onSuccess: async (result) => {
  // Existing invalidations and navigation...

  // Sync auto-split skins for new round (non-blocking)
  if (prizePool?.auto_split_skins && prizePool.skins_pot_per_round) {
    try {
      await syncAutoSplitSkins({
        competitionId,
        poolId: prizePool.id,
        potPerRound: prizePool.skins_pot_per_round,
        scoringType: 'gross',
        createdBy: user?.id ?? '',
      });
    } catch (error) {
      console.warn('[AddRound] Failed to sync auto-split skins:', error);
      // Non-blocking - round was created successfully
    }
  }

  onSuccess(result.roundId, result.scoringPairsRequired);
},
```

You'll need to add prizePool to the hook's dependencies. Use useCompetitionPrizePool(competitionId) at the hook level.
```

**Deliverables:**
- [x] Prize pool fetched in useAddRoundForm
- [x] syncAutoSplitSkins called on successful round creation
- [x] Error handling is non-blocking

**Dependencies:** Step 1.1
**Notes:** Uses the existing syncAutoSplitSkins from useSkins.ts which handles creating games for new rounds.

---

## Phase 4: UI Status Display

### Step 4.1: Add Auto-Split Status to PrizePoolSection
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Modify src/components/prizePool/PrizePoolSection.tsx to show auto-split status when enabled.

Requirements:
1. Import useAutoSplitSkinsSync hook
2. Display an info section when pool.auto_split_skins is true
3. Show different states:
   - Not enough players: "Add 2+ players to activate skins games"
   - Skins created: "X skins games configured ($Y per round)"
   - Pending: "Skins games will be created automatically"

UI Pattern:
```tsx
{pool.auto_split_skins && (
  <View style={styles.autoSplitInfo}>
    <View style={styles.infoHeader}>
      <Icon source="auto-fix" size={20} color={colors.primary} />
      <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
        Auto-Split Skins
      </Text>
    </View>
    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
      ${potPerRound}/round × {roundCount} rounds = ${potPerRound * roundCount}
    </Text>

    {playerCount < 2 ? (
      <View style={[styles.warningBox, { backgroundColor: colors.warningBackground }]}>
        <Text style={{ color: colors.warning }}>
          Add 2+ players to activate skins games
        </Text>
      </View>
    ) : skinsGamesCreated > 0 ? (
      <View style={[styles.successBox, { backgroundColor: colors.successBackground }]}>
        <Text style={{ color: colors.success }}>
          {skinsGamesCreated} games configured
        </Text>
      </View>
    ) : null}
  </View>
)}
```

Add appropriate styles to the StyleSheet.
```

**Deliverables:**
- [x] Auto-split status section added
- [x] Conditional rendering based on player count
- [x] Styled consistently with existing components

**Dependencies:** Step 1.1, Step 1.2
**Notes:** Provides visibility into the auto-split state for organizers. Added to the competition detail sections PrizePoolSection with competitionId and playerCount props.

---

## Critical Files

### Created
- `src/hooks/useAutoSplitSkinsSync.ts` - Core hook for auto-split sync logic ✅

### Modified
- `src/hooks/index.ts` - Export new hook ✅
- `src/screens/competitions/CompetitionDetailScreen.tsx` - Add auto-trigger with Snackbar ✅
- `src/screens/admin/AddRoundScreen/hooks/useAddRoundForm.ts` - Sync on round addition ✅
- `src/components/competitions/detail/sections/PrizePoolSection.tsx` - Status display ✅
- `src/components/competitions/detail/sections/types.ts` - Added competitionId and playerCount props ✅
- `src/components/competitions/detail/DetailsTab.tsx` - Pass new props to PrizePoolSection ✅

### Reference Files (Read Only)
- `src/hooks/useSkins.ts` - Existing useAutoSplitSkinsForCompetition hook (lines 1442-1700)
- `src/hooks/usePrizePool.ts` - Prize pool hooks
- `supabase/migrations/20260117000000_auto_split_batch.sql` - RPC function

---

## Verification

How to verify the plan is complete:

### Scenario 1: New Competition
- [ ] Create competition with prize pool (75% skins, auto-split enabled)
- [ ] Add 3 rounds
- [ ] Verify pool shows correct `skins_pot_per_round` value
- [ ] Add 2 players to competition
- [ ] Navigate to competition detail screen
- [ ] Verify toast shows "3 skins games created ($X each)"
- [ ] View each round - verify skins configuration is present

### Scenario 2: Add Round to Existing Competition
- [ ] With competition that has auto-split and 2+ players
- [ ] Add a new round
- [ ] Verify new round gets skins game automatically

### Scenario 3: Edge Cases
- [ ] Competition with 0-1 players: No skins created, warning shown in PrizePoolSection
- [ ] Competition where some rounds already have skins: Only creates for new rounds
- [ ] Prize pool without auto-split enabled: No automatic creation

### Database Verification
- [ ] Check `skins_games` table has entries with `pool_source = 'prize_pool'`
- [ ] Check `pool_transactions` table has `skins_draw` entries
- [ ] Verify `pool_draw_amount` matches expected per-round value
