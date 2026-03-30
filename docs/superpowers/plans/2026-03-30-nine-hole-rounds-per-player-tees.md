# 9-Hole Rounds + Per-Player Tee Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable 9-hole standalone rounds (front/back 9) and per-player tee selection for both standalone and competition rounds.

**Architecture:** Two database-level changes (nine_type column + per-player tee columns/table) flow through the scorecard store, wizard, and scoring screens. All hardcoded `18` references become dynamic bounds from the `holes` array. Tee data moves from a single round-level value to a per-player map resolved at scoring time.

**Tech Stack:** React Native, TypeScript, Zustand, Supabase (PostgreSQL), React Navigation

**Spec:** `docs/superpowers/specs/2026-03-30-nine-hole-rounds-per-player-tees-design.md`

---

## File Structure

### New Files
- `supabase/migrations/YYYYMMDD000000_nine_hole_rounds_per_player_tees.sql` — DB migration
- `src/screens/rounds/CreateRoundBottomSheet/steps/NineTypeStep.tsx` — Nine type wizard step
- `src/screens/rounds/CreateRoundBottomSheet/steps/YourSetupStep.tsx` — Solo round tee + ball count step
- `src/utils/teeResolution.ts` — Tee resolution utilities (per-player tee lookup, effective ratings)

### Modified Files
- `src/types/database/enums.ts` — Add `NineType`
- `src/types/database/round.types.ts` — Add `nine_type` to `Round`, `selected_tee` to `RoundPlayer`
- `src/types/database/competition.types.ts` — Add `selected_tee` to `CompetitionPlayer`
- `src/types/database/base.ts` — Extend `TeeBox` with 9-hole rating fields
- `src/constants/scoring.ts` — Add `getHoleCount`, `getHoleRange` helpers
- `src/store/scorecardStore.ts` — Add `playerTeeMap`, `nineType`, fix hardcoded 18
- `src/store/initializeRoundSlice.ts` — Accept `playerTeeMap`/`nineType`, fix resume loop
- `src/screens/rounds/CreateRoundBottomSheet/types.ts` — Update wizard types
- `src/screens/rounds/CreateRoundBottomSheet/index.tsx` — Wire new steps
- `src/screens/rounds/CreateRoundBottomSheet/hooks/useCreateRoundWizard.ts` — Orchestrate new flow
- `src/screens/rounds/CreateRoundBottomSheet/hooks/useWizardNavigation.ts` — Update step transitions
- `src/screens/rounds/CreateRoundBottomSheet/hooks/useWizardTeeSelection.ts` — Remove (replaced by inline tee)
- `src/screens/rounds/CreateRoundBottomSheet/steps/PartnersStep.tsx` — Add inline tee pickers
- `src/screens/rounds/RoundListScreen/hooks/useStartNewRound.ts` — Accept nineType, per-player tees
- `src/screens/scoring/ScorecardEntryScreen/hooks/useScorecardNavigation.ts` — Dynamic bounds
- `src/screens/scoring/ScorecardEntryScreen/hooks/useScorecardSubmission.ts` — Dynamic hole count
- `src/screens/scoring/ScorecardEntryScreen/index.tsx` — Per-player tee in handicap map
- `src/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations.ts` — Dynamic hole count
- `src/utils/skins/validation.ts` — Add `totalHoles` param
- `src/utils/skins/pot.ts` — Add `totalHoles` param
- `src/utils/wolf/validation.ts` — Add `totalHoles` param
- `src/utils/wolf/rotation.ts` — Add `totalHoles` param
- `src/hooks/scorecard/useRoundMetadata.ts` — Fetch per-player tees
- `src/services/competitionPlayers/competitionPlayersService.ts` — Add `updatePlayerTee`
- `src/screens/competitions/CompetitionSettingsScreen.tsx` — Player tees section

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/YYYYMMDD000000_nine_hole_rounds_per_player_tees.sql`

- [ ] **Step 1: Create migration file**

```sql
-- 9-hole round support (standalone only)
ALTER TABLE rounds ADD COLUMN nine_type TEXT NOT NULL DEFAULT 'full';
ALTER TABLE rounds ADD CONSTRAINT rounds_nine_type_check
  CHECK (nine_type IN ('full', 'front9', 'back9'));

-- Per-player tee selection (standalone rounds)
ALTER TABLE round_players ADD COLUMN selected_tee JSONB;

-- Per-player tee selection (competition default)
ALTER TABLE competition_players ADD COLUMN selected_tee JSONB;

-- Per-round tee override for competition players
CREATE TABLE competition_round_player_tees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  selected_tee JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(round_id, player_id)
);

CREATE INDEX idx_crpt_round_id ON competition_round_player_tees(round_id);
CREATE INDEX idx_crpt_player_id ON competition_round_player_tees(player_id);

-- RLS for competition_round_player_tees
ALTER TABLE competition_round_player_tees ENABLE ROW LEVEL SECURITY;

-- SELECT: competition members or organizer
CREATE POLICY crpt_select ON competition_round_player_tees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competitions c ON c.id = r.competition_id
      JOIN competition_players cp ON cp.competition_id = c.id
      WHERE r.id = competition_round_player_tees.round_id
        AND cp.player_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM rounds r
      JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = competition_round_player_tees.round_id
        AND c.created_by = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: organizer only
CREATE POLICY crpt_insert ON competition_round_player_tees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = competition_round_player_tees.round_id
        AND c.created_by = auth.uid()
    )
  );

CREATE POLICY crpt_update ON competition_round_player_tees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = competition_round_player_tees.round_id
        AND c.created_by = auth.uid()
    )
  );

CREATE POLICY crpt_delete ON competition_round_player_tees FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = competition_round_player_tees.round_id
        AND c.created_by = auth.uid()
    )
  );
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add migration for nine_type, per-player tees, and competition_round_player_tees table"
```

---

## Task 2: Type Definitions & Constants

**Files:**
- Modify: `src/types/database/enums.ts`
- Modify: `src/types/database/round.types.ts`
- Modify: `src/types/database/competition.types.ts`
- Modify: `src/types/database/base.ts`
- Modify: `src/constants/scoring.ts`
- Create: `src/utils/teeResolution.ts`

- [ ] **Step 1: Add NineType to enums.ts**

Add after the `HandicapSource` type (line 8):

```typescript
/**
 * Which holes to play in a round
 * 'full' = all 18, 'front9' = holes 1-9, 'back9' = holes 10-18
 */
export type NineType = 'full' | 'front9' | 'back9';
```

- [ ] **Step 2: Add nine_type to Round interface in round.types.ts**

Add the import of `NineType` to the imports on line 6, then add `nine_type` field after `game_type` (line 25):

```typescript
import type { GameType, HandicapSource, NineType, RoundStatus, TeamFormat } from './enums';
```

Add to the Round interface after `game_type: GameType;`:

```typescript
  nine_type: NineType; // 'full' | 'front9' | 'back9' — standalone only
```

- [ ] **Step 3: Add selected_tee to RoundPlayer in round.types.ts**

Add to the `RoundPlayer` interface (after `created_at` on line 73):

```typescript
  selected_tee: TeeBox | null; // Per-player tee override (null = use round default)
```

Add `TeeBox` to the imports at the top:

```typescript
import type { TeeBox } from './base';
```

- [ ] **Step 4: Add selected_tee to CompetitionPlayer in competition.types.ts**

Add to the `CompetitionPlayer` interface (after `created_at` on line 97):

```typescript
  selected_tee: TeeBox | null; // Per-player tee default for the competition (null = use round default)
```

Add `TeeBox` import from `'./base'`.

- [ ] **Step 5: Extend TeeBox with 9-hole rating fields in base.ts**

Add to the `TeeBox` interface (after `slopeRating` on line 34):

```typescript
  courseRatingFront9?: number; // 9-hole course rating (front)
  slopeRatingFront9?: number; // 9-hole slope rating (front)
  courseRatingBack9?: number; // 9-hole course rating (back)
  slopeRatingBack9?: number; // 9-hole slope rating (back)
```

- [ ] **Step 6: Add helper functions to constants/scoring.ts**

Add at the end of the file (after line 97):

```typescript
import type { NineType } from '@/types/database/enums';

/**
 * Get the number of holes for a given nine type
 */
export function getHoleCount(nineType: NineType): number {
  return nineType === 'full' ? HOLES_PER_ROUND : HOLES_PER_HALF;
}

/**
 * Get the hole number range for a given nine type
 */
export function getHoleRange(nineType: NineType): { start: number; end: number } {
  switch (nineType) {
    case 'front9': return { start: 1, end: 9 };
    case 'back9': return { start: 10, end: 18 };
    default: return { start: 1, end: 18 };
  }
}
```

- [ ] **Step 7: Create tee resolution utility**

Create `src/utils/teeResolution.ts`:

```typescript
/**
 * Tee Resolution Utilities
 *
 * Resolves the effective tee for a player based on the resolution order:
 * - Standalone: round_players.selected_tee → rounds.selected_tee
 * - Competition: competition_round_player_tees → competition_players → rounds.selected_tee
 *
 * Also provides 9-hole rating selection based on nine_type.
 */

import type { TeeBox } from '@/types/database/base';
import type { NineType } from '@/types/database/enums';

/**
 * Get effective slope and course rating for a tee based on nine type.
 * Falls back to full-round ratings when 9-hole ratings are unavailable.
 */
export function getEffectiveTeeRatings(
  tee: TeeBox,
  nineType: NineType,
): { slope: number | undefined; cr: number | undefined } {
  if (nineType === 'front9') {
    return {
      slope: tee.slopeRatingFront9 ?? tee.slopeRating,
      cr: tee.courseRatingFront9 ?? tee.courseRating,
    };
  }
  if (nineType === 'back9') {
    return {
      slope: tee.slopeRatingBack9 ?? tee.slopeRating,
      cr: tee.courseRatingBack9 ?? tee.courseRating,
    };
  }
  return { slope: tee.slopeRating, cr: tee.courseRating };
}

/**
 * Resolve a player's tee from a player tee map, falling back to the round default.
 */
export function resolvePlayerTee(
  playerId: string,
  playerTeeMap: Map<string, TeeBox>,
  roundDefaultTee: TeeBox | null,
): TeeBox | null {
  return playerTeeMap.get(playerId) ?? roundDefaultTee;
}

/**
 * Check if players in a group have different tees (for showing tee dots).
 */
export function hasMultipleTees(
  playerIds: string[],
  playerTeeMap: Map<string, TeeBox>,
  roundDefaultTee: TeeBox | null,
): boolean {
  const teeNames = new Set<string>();
  for (const id of playerIds) {
    const tee = resolvePlayerTee(id, playerTeeMap, roundDefaultTee);
    teeNames.add(tee?.name ?? '');
  }
  return teeNames.size > 1;
}
```

- [ ] **Step 8: Run type check**

Run: `pnpm type-check`
Expected: PASS (new types don't break existing code since new fields are optional or have defaults)

- [ ] **Step 9: Commit**

```bash
git add src/types/database/enums.ts src/types/database/round.types.ts src/types/database/competition.types.ts src/types/database/base.ts src/constants/scoring.ts src/utils/teeResolution.ts
git commit -m "feat: add NineType, per-player tee types, and tee resolution utilities"
```

---

## Task 3: Scorecard Store — Dynamic Holes + Per-Player Tees

**Files:**
- Modify: `src/store/scorecardStore.ts`
- Modify: `src/store/initializeRoundSlice.ts`

- [ ] **Step 1: Add new state fields to ScorecardState interface**

In `src/store/scorecardStore.ts`, add to the `ScorecardState` interface (after `selectedTeeData` around line 37):

```typescript
  // Per-player tee data (playerId -> their tee)
  playerTeeMap: Map<string, TeeBox>;
  nineType: NineType;
```

Add to imports at top:

```typescript
import type { NineType } from '@/types/database/enums';
```

- [ ] **Step 2: Add getPlayerTee getter**

Add to the ScorecardState interface (after `getHoleInfo` around line 83):

```typescript
  getPlayerTee: (playerId: string) => TeeBox | null;
```

Implement in the store (after `getHoleInfo` implementation around line 194):

```typescript
    getPlayerTee: (playerId) => {
      const { playerTeeMap, selectedTeeData } = get();
      return playerTeeMap.get(playerId) ?? selectedTeeData;
    },
```

- [ ] **Step 3: Fix setCurrentHole — replace hardcoded 18**

Replace `setCurrentHole` (lines 141-145) from:

```typescript
    setCurrentHole: (hole) => {
      if (hole >= 1 && hole <= 18) {
        set({ currentHole: hole });
      }
    },
```

To:

```typescript
    setCurrentHole: (hole) => {
      const { holes } = get();
      const validNumbers = new Set(holes.map((h) => h.number));
      if (validNumbers.has(hole as any)) {
        set({ currentHole: hole });
      }
    },
```

- [ ] **Step 4: Fix getCompletedHolesCount — replace hardcoded 18**

Replace `getCompletedHolesCount` (lines 205-211) from:

```typescript
    getCompletedHolesCount: () => {
      let count = 0;
      for (let h = 1; h <= 18; h++) {
        if (get().isHoleComplete(h)) count++;
      }
      return count;
    },
```

To:

```typescript
    getCompletedHolesCount: () => {
      const { holes } = get();
      let count = 0;
      for (const hole of holes) {
        if (get().isHoleComplete(hole.number)) count++;
      }
      return count;
    },
```

- [ ] **Step 5: Initialize new state fields with defaults**

In the `create` call, add default values alongside the existing defaults (around line 103):

```typescript
    playerTeeMap: new Map(),
    nineType: 'full' as NineType,
```

- [ ] **Step 6: Update initializeRound in initializeRoundSlice.ts**

Update the function signature (lines 19-30) to add `playerTeeMap` and `nineType`:

```typescript
export async function initializeRound(
  set: SetFn,
  initSyncListener: () => void,
  roundId: string,
  players: Player[],
  holes: Hole[],
  gameType: GameType = 'stableford',
  isStandalone = false,
  allowedPlayerIds: string[] = [],
  selectedTeeData: TeeBox | null = null,
  handicapSource: HandicapSource = 'profile',
  playerTeeMap: Map<string, TeeBox> = new Map(),
  nineType: NineType = 'full',
): Promise<void>
```

Add `NineType` to imports:

```typescript
import type { NineType } from '@/types/database/enums';
```

In the `set()` call (around lines 74-85), add the new fields:

```typescript
    playerTeeMap,
    nineType,
```

- [ ] **Step 7: Fix loadFromOffline resume loop**

Replace the resume loop in `loadFromOffline` (lines 150-164) from:

```typescript
      let currentHole = 1;
      for (let h = 1; h <= 18; h++) {
        const allComplete = players.every((player) => {
          const sc = newScorecards.get(player.id);
          const score = sc?.scores[h];
          return score && (isSingleBallScore(score) ? score.strokes !== undefined : score.balls?.length > 0);
        });
        if (!allComplete) {
          currentHole = h;
          break;
        }
        if (h === 18) {
          currentHole = 18;
        }
      }
```

To:

```typescript
      const holeNumbers = holes.map((h: any) => h.number ?? h.hole_number);
      let currentHole = holeNumbers[0] ?? 1;
      for (const h of holeNumbers) {
        const allComplete = players.every((player) => {
          const sc = newScorecards.get(player.id);
          const score = sc?.scores[h];
          return score && (isSingleBallScore(score) ? score.strokes !== undefined : score.balls?.length > 0);
        });
        if (!allComplete) {
          currentHole = h;
          break;
        }
        if (h === holeNumbers[holeNumbers.length - 1]) {
          currentHole = h;
        }
      }
```

- [ ] **Step 8: Update the store's initializeRound call**

In `scorecardStore.ts`, update the `initializeRound` delegation (around line 134) to pass the new params:

```typescript
    initializeRound: (roundId, players, holes, gameType, isStandalone, allowedPlayerIds, selectedTeeData, handicapSource, playerTeeMap, nineType) =>
      initSlice.initializeRound(set, initSyncListener, roundId, players, holes, gameType, isStandalone, allowedPlayerIds, selectedTeeData, handicapSource, playerTeeMap, nineType),
```

Update the interface signature to match (around line 60):

```typescript
  initializeRound: (
    roundId: string,
    players: Player[],
    holes: Hole[],
    gameType?: GameType,
    isStandalone?: boolean,
    allowedPlayerIds?: string[],
    selectedTeeData?: TeeBox | null,
    handicapSource?: HandicapSource,
    playerTeeMap?: Map<string, TeeBox>,
    nineType?: NineType,
  ) => Promise<void>;
```

- [ ] **Step 9: Run type check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/store/scorecardStore.ts src/store/initializeRoundSlice.ts
git commit -m "feat: add playerTeeMap and nineType to scorecard store, fix hardcoded 18"
```

---

## Task 4: Scoring Navigation — Dynamic Bounds

**Files:**
- Modify: `src/screens/scoring/ScorecardEntryScreen/hooks/useScorecardNavigation.ts`
- Modify: `src/screens/scoring/ScorecardEntryScreen/hooks/useScorecardSubmission.ts`
- Modify: `src/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations.ts`

- [ ] **Step 1: Update useScorecardNavigation to accept holes array**

Add `holes` to the params interface (line 18):

```typescript
import type { Hole } from '@/types';
```

Add to `UseScorecardNavigationParams`:

```typescript
  holes: Hole[];
```

- [ ] **Step 2: Derive dynamic bounds and replace hardcoded 18**

Replace `handlePreviousHole` (lines 60-68):

```typescript
  const firstHole = holes[0]?.number ?? 1;
  const lastHole = holes[holes.length - 1]?.number ?? 18;

  const handlePreviousHole = useCallback(() => {
    if (currentHole > firstHole) {
      scoringLogger.info('Navigation: Previous hole', {
        from: currentHole,
        to: currentHole - 1,
      });
      setCurrentHole(currentHole - 1);
    }
  }, [currentHole, setCurrentHole, firstHole]);
```

Replace `handleNextHole` (lines 71-79):

```typescript
  const handleNextHole = useCallback(() => {
    if (currentHole < lastHole) {
      scoringLogger.info('Navigation: Next hole', {
        from: currentHole,
        to: currentHole + 1,
      });
      setCurrentHole(currentHole + 1);
    }
  }, [currentHole, setCurrentHole, lastHole]);
```

Replace the return values (lines 108-109):

```typescript
    canGoPrevious: currentHole > firstHole,
    canGoNext: currentHole < lastHole,
```

- [ ] **Step 3: Update useScorecardSubmission — replace hardcoded 18**

Replace lines 96-108 in `handleSubmit`:

```typescript
  const handleSubmit = useCallback(async () => {
    const completedCount = getCompletedHolesCount();
    const totalHoles = holes.length;
    scoringLogger.info('SUBMIT: Submit button pressed', {
      completedHoles: completedCount,
      totalHoles,
      isComplete: completedCount === totalHoles,
    });
    if (completedCount < totalHoles) {
      onIncompleteRound(completedCount);
    } else {
      await performSubmit();
    }
  }, [getCompletedHolesCount, holes.length, performSubmit, onIncompleteRound]);
```

- [ ] **Step 4: Update matchPlayCalculations.ts — replace hardcoded 18**

In `src/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations.ts`, replace line 27:

```typescript
  for (let i = 1; i <= 18; i++) {
```

With (accept `holes` array as parameter):

```typescript
  for (const hole of holes) {
    const i = hole.number;
```

Replace line 39:

```typescript
  const holesRemaining = 18 - holesPlayed;
```

With:

```typescript
  const holesRemaining = totalHoles - holesPlayed;
```

Where `totalHoles` is passed as a parameter (defaults to 18 for backward compatibility).

- [ ] **Step 5: Run type check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/screens/scoring/
git commit -m "feat: replace hardcoded 18 with dynamic hole bounds in scoring navigation"
```

---

## Task 5: Side Games — Parameterize Hole Count

**Files:**
- Modify: `src/utils/skins/validation.ts`
- Modify: `src/utils/skins/pot.ts`
- Modify: `src/utils/wolf/validation.ts`
- Modify: `src/utils/wolf/rotation.ts`

- [ ] **Step 1: Update skins validation.ts**

Add `totalHoles` param to `isSkinsGameComplete` (line 96):

```typescript
export function isSkinsGameComplete(
  results: SkinsResult[],
  totalHoles: number = HOLES_PER_ROUND,
): boolean {
  return results.length >= totalHoles;
}
```

Add `totalHoles` and `startHole` params to `getNextHoleNumber` (line 108-111):

```typescript
export function getNextHoleNumber(
  results: SkinsResult[],
  totalHoles: number = HOLES_PER_ROUND,
  startHole: number = 1,
): number | null {
  const endHole = startHole + totalHoles - 1;
  if (results.length >= totalHoles) return null;
  const completedHoles = new Set(results.map((r) => r.hole_number));
  for (let i = startHole; i <= endHole; i++) {
    if (!completedHoles.has(i)) return i;
  }
  return null;
}
```

- [ ] **Step 2: Update skins pot.ts**

Add `totalHoles` param to `calculateHoleValue` (line 29):

```typescript
export function calculateHoleValue(
  potType: SkinsPotType,
  potValue: number,
  totalHoles: number = HOLES_PER_ROUND,
): number {
  if (potType === 'per-hole') return roundCurrency(potValue);
  return roundCurrency(potValue / totalHoles);
}
```

Add `totalHoles` param to `calculateTotalPot` (line 48):

```typescript
export function calculateTotalPot(
  potType: SkinsPotType,
  potValue: number,
  totalHoles: number = HOLES_PER_ROUND,
): number {
  if (potType === 'per-hole') return roundCurrency(potValue * totalHoles);
  return roundCurrency(potValue);
}
```

- [ ] **Step 3: Update wolf validation.ts**

Add `totalHoles` param to `isWolfGameComplete` (line 127):

```typescript
export function isWolfGameComplete(
  decisions: WolfHoleDecision[],
  totalHoles: number = HOLES_PER_ROUND,
): boolean {
  const completedHoles = decisions.filter((d) => d.outcome !== null);
  return completedHoles.length >= totalHoles;
}
```

Add `totalHoles` and `startHole` params to `getNextHoleForDecision` (line 143):

```typescript
export function getNextHoleForDecision(
  decisions: WolfHoleDecision[],
  totalHoles: number = HOLES_PER_ROUND,
  startHole: number = 1,
): number | null {
  const endHole = startHole + totalHoles - 1;
  const decidedHoles = new Set(decisions.map((d) => d.hole_number));
  for (let hole = startHole; hole <= endHole; hole++) {
    if (!decidedHoles.has(hole)) return hole;
  }
  return null;
}
```

- [ ] **Step 4: Update wolf rotation.ts**

Add `totalHoles` and `startHole` params to `getWolfRotationForRound` (line 53):

```typescript
export function getWolfRotationForRound(
  wolfOrder: string[],
  totalHoles: number = HOLES_PER_ROUND,
  startHole: number = 1,
): Map<number, string> {
  const rotation = new Map<number, string>();
  const playerCount = wolfOrder.length;
  if (playerCount === 0) return rotation;
  for (let i = 0; i < totalHoles; i++) {
    const hole = startHole + i;
    rotation.set(hole, wolfOrder[i % playerCount]);
  }
  return rotation;
}
```

- [ ] **Step 5: Run type check and tests**

Run: `pnpm type-check && pnpm test -- --testPathPattern="skins|wolf" --passWithNoTests`
Expected: PASS (all changes are backward-compatible with defaults)

- [ ] **Step 6: Commit**

```bash
git add src/utils/skins/ src/utils/wolf/
git commit -m "feat: parameterize hole count in skins and wolf utilities"
```

---

## Task 6: Wizard Types & NineType Step

**Files:**
- Modify: `src/screens/rounds/CreateRoundBottomSheet/types.ts`
- Create: `src/screens/rounds/CreateRoundBottomSheet/steps/NineTypeStep.tsx`

- [ ] **Step 1: Update wizard types**

In `types.ts`, update `WizardStep` (line 33):

```typescript
export type WizardStep = 'course' | 'nineType' | 'matchType' | 'partners' | 'ballCount' | 'scoringSetup' | 'yourSetup';
```

Note: `'tee'` is removed. `'yourSetup'` replaces `'tee'` + `'ballCount'` for solo rounds.

Add to `WizardData` interface (after `handicapSource` on line 147):

```typescript
  /** Nine type selection for 9-hole rounds */
  nineType: NineType;
```

Add `NineType` import at top:

```typescript
import type { NineType } from '@/types/database/enums';
```

Add `selectedTee` to `PlayingPartner` (after `gender` on line 45):

```typescript
  /** Per-player tee override */
  selectedTee?: TeeBox;
```

Add `TeeBox` import if not already present.

Add `nineType` to the `onStartRound` callback (line 168, before the closing paren):

```typescript
    nineType?: NineType,
```

- [ ] **Step 2: Create NineTypeStep component**

Create `src/screens/rounds/CreateRoundBottomSheet/steps/NineTypeStep.tsx`:

```typescript
/**
 * NineTypeStep - Select full 18, front 9, or back 9
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import type { NineType } from '@/types/database/enums';

interface NineTypeStepProps {
  selectedNineType: NineType;
  onSelectNineType: (nineType: NineType) => void;
}

const OPTIONS: { value: NineType; label: string; holes: string; count: string }[] = [
  { value: 'full', label: 'Full Round', holes: 'All 18 holes', count: '18' },
  { value: 'front9', label: 'Front 9', holes: 'Holes 1–9', count: '9' },
  { value: 'back9', label: 'Back 9', holes: 'Holes 10–18', count: '9' },
];

export default function NineTypeStep({ selectedNineType, onSelectNineType }: NineTypeStepProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        How many holes are you playing?
      </Text>
      <View style={styles.options}>
        {OPTIONS.map((opt) => {
          const isSelected = selectedNineType === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => onSelectNineType(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.count, { color: isSelected ? colors.primary : colors.textPrimary }]}>
                {opt.count}
              </Text>
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                {opt.label}
              </Text>
              <Text style={[styles.holes, { color: colors.textSecondary }]}>
                {opt.holes}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  options: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  count: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  holes: {
    ...typography.caption,
  },
});
```

- [ ] **Step 3: Run type check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/screens/rounds/CreateRoundBottomSheet/types.ts src/screens/rounds/CreateRoundBottomSheet/steps/NineTypeStep.tsx
git commit -m "feat: add NineTypeStep component and update wizard types"
```

---

## Task 7: Wizard Flow Rewiring

**Files:**
- Modify: `src/screens/rounds/CreateRoundBottomSheet/hooks/useCreateRoundWizard.ts`
- Modify: `src/screens/rounds/CreateRoundBottomSheet/hooks/useWizardNavigation.ts`
- Modify: `src/screens/rounds/CreateRoundBottomSheet/hooks/useWizardTeeSelection.ts`
- Modify: `src/screens/rounds/CreateRoundBottomSheet/index.tsx`
- Modify: `src/screens/rounds/CreateRoundBottomSheet/steps/PartnersStep.tsx`

This is the most complex task — it rewires the entire wizard flow. The key changes:
- Remove the dedicated `'tee'` step
- Add `'nineType'` step after course
- Add `'yourSetup'` step for solo rounds (replaces tee + ballCount)
- Add inline tee pickers to PartnersStep
- Thread `nineType` and per-player tees through `onStartRound`

- [ ] **Step 1: Remove tee step from wizard flow**

The dedicated `TeeSelectionStep` is no longer needed — tee selection moves inline to player cards. In `useWizardTeeSelection.ts`, change `handleSelectTee` and `handleSkipTeeSelection` to navigate to `'nineType'` instead of `'matchType'`. Since course selection currently navigates to `'tee'`, update the course selection handler in `useWizardCourseSelection` (or wherever the post-course transition happens) to go directly to `'nineType'` instead of `'tee'`.

- [ ] **Step 2: Update useWizardNavigation**

Add `handleBackToNineType` callback:

```typescript
  const handleBackToNineType = useCallback(() => {
    setCurrentStep('nineType');
  }, [setCurrentStep]);
```

Update `handleBackToMatchType` to go back to `'nineType'` instead of `'tee'`:

```typescript
  const handleBackToMatchType = useCallback(() => {
    if (initialMatchType) {
      setCurrentStep('nineType');
      setData((prev) => ({ ...prev, friendSearchQuery: '' }));
    } else {
      setCurrentStep('matchType');
      setData((prev) => ({ ...prev, friendSearchQuery: '' }));
    }
  }, [initialMatchType, setCurrentStep, setData]);
```

Thread `nineType` through all `onStartRound` calls in `handleStartSoloRound`, `handleStartScoring`, and `handleContinueToScoringSetup`. Add `data.nineType` as the last argument to each call.

Return `handleBackToNineType` from the hook.

- [ ] **Step 3: Update PartnersStep with inline tee pickers**

Add new props to `PartnersStep`:

```typescript
interface PartnersStepProps {
  // ... existing props
  availableTees: TeeBox[];
  currentUserTee: TeeBox | null;
  onCurrentUserTeeChange: (tee: TeeBox) => void;
  onPartnerTeeChange: (partnerId: string, tee: TeeBox) => void;
}
```

In the partner list rendering, show the current user at the top with an inline tee picker (row of pill buttons matching available tees). Each partner row also gets the same tee picker. Use `TouchableOpacity` pills styled with the tee color.

The tee pill component pattern:

```typescript
function TeePill({ tee, isSelected, onPress, colors }: { tee: TeeBox; isSelected: boolean; onPress: () => void; colors: any }) {
  const teeColor = getTeeColor(tee.color, colors.textSecondary);
  return (
    <TouchableOpacity
      style={[
        styles.teePill,
        {
          borderColor: isSelected ? teeColor : colors.border,
          borderWidth: isSelected ? 2 : 1,
          backgroundColor: isSelected ? `${teeColor}15` : 'transparent',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.teeDot, { backgroundColor: teeColor }]} />
      <Text style={[styles.teePillText, { color: isSelected ? teeColor : colors.textSecondary }]}>
        {tee.name}
      </Text>
    </TouchableOpacity>
  );
}
```

When tees array is empty, hide the tee picker entirely (no tees available).

- [ ] **Step 4: Update useCreateRoundWizard orchestrator**

Add `nineType: 'full' as NineType` to the `initialData` state.

Add a `handleSelectNineType` callback:

```typescript
const handleSelectNineType = useCallback((nineType: NineType) => {
  setData((prev) => ({ ...prev, nineType }));
  setCurrentStep('matchType');
}, [setData, setCurrentStep]);
```

Add a `handlePlayerTeeChange` callback:

```typescript
const handlePlayerTeeChange = useCallback((playerId: string, tee: TeeBox) => {
  setData((prev) => ({
    ...prev,
    selectedPartners: prev.selectedPartners.map((p) =>
      p.id === playerId ? { ...p, selectedTee: tee } : p
    ),
  }));
}, [setData]);
```

Add a `handleCurrentUserTeeChange` callback that stores the user's tee in data:

```typescript
const handleCurrentUserTeeChange = useCallback((tee: TeeBox) => {
  setData((prev) => ({ ...prev, selectedTee: tee }));
}, [setData]);
```

When a new partner is added (in `handleTogglePartner`), set their `selectedTee` to the current `data.selectedTee` (creator's tee).

Pass these through in the return value.

- [ ] **Step 5: Update index.tsx — wire new steps**

In the step indicator logic (lines 356-368), replace the old flow with:

```typescript
const stepIndicatorSteps = useMemo(() => {
  const steps: WizardStep[] = ['course', 'nineType', 'matchType'];
  if (wizard.data.selectedPartners.length > 0 || !skipPartnerStep) {
    steps.push('partners');
    steps.push('scoringSetup');
  } else {
    steps.push('yourSetup');
  }
  // Remove matchType if locked
  if (initialMatchType) {
    return steps.filter((s) => s !== 'matchType');
  }
  return steps;
}, [wizard.data.selectedPartners.length, skipPartnerStep, initialMatchType]);
```

In the step rendering (around lines 511-587), remove the `TeeSelectionStep` rendering and add:

```typescript
{wizard.currentStep === 'nineType' && (
  <NineTypeStep
    selectedNineType={wizard.data.nineType}
    onSelectNineType={wizard.handleSelectNineType}
  />
)}
```

Add `getStepTitle` entry for `'nineType'`: `return 'Holes';`

Update back navigation for `'nineType'`:

```typescript
case 'nineType': return wizard.handleBackToCourse;
case 'matchType': return wizard.handleBackToNineType;
```

- [ ] **Step 6: Create YourSetupStep for solo rounds**

Create `src/screens/rounds/CreateRoundBottomSheet/steps/YourSetupStep.tsx`:

```typescript
/**
 * YourSetupStep - Solo round: pick your tee + ball count
 * Replaces the old dedicated TeeSelectionStep and BallCountStep for solo rounds.
 * Skipped entirely if no tees available AND not Social tier.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { getTeeColor } from '../types';
import type { TeeBox } from '@/types/database/base';
import type { BallCount } from '@/types/multiball.types';

interface YourSetupStepProps {
  availableTees: TeeBox[];
  selectedTee: TeeBox | null;
  onSelectTee: (tee: TeeBox) => void;
  ballCount: BallCount;
  onBallCountChange: (count: BallCount) => void;
  showBallCount: boolean; // Social tier+ only
  onStartRound: () => void;
}

export default function YourSetupStep({
  availableTees,
  selectedTee,
  onSelectTee,
  ballCount,
  onBallCountChange,
  showBallCount,
  onStartRound,
}: YourSetupStepProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {availableTees.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Your Tee</Text>
          <View style={styles.teeRow}>
            {availableTees.map((tee) => {
              const isSelected = selectedTee?.name === tee.name;
              const teeColor = getTeeColor(tee.color, colors.textSecondary);
              return (
                <TouchableOpacity
                  key={tee.name}
                  style={[
                    styles.teePill,
                    {
                      borderColor: isSelected ? teeColor : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                      backgroundColor: isSelected ? `${teeColor}15` : 'transparent',
                    },
                  ]}
                  onPress={() => onSelectTee(tee)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.teeDot, { backgroundColor: teeColor }]} />
                  <Text style={{ color: isSelected ? teeColor : colors.textSecondary, fontSize: 13 }}>
                    {tee.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {showBallCount && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Balls per Hole</Text>
          <View style={styles.teeRow}>
            {([1, 2, 3, 4] as BallCount[]).map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.ballPill,
                  {
                    borderColor: ballCount === count ? colors.primary : colors.border,
                    backgroundColor: ballCount === count ? colors.primary + '15' : 'transparent',
                  },
                ]}
                onPress={() => onBallCountChange(count)}
              >
                <Text style={{ color: ballCount === count ? colors.primary : colors.textSecondary }}>
                  {count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.bodyBold, marginBottom: spacing.md },
  teeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  teePill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, gap: 6 },
  teeDot: { width: 8, height: 8, borderRadius: 4 },
  ballPill: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
```

**Skip condition**: In the wizard navigation, if `availableTees.length === 0 && !isSocialOrHigher`, skip this step entirely and call `onStartRound` directly after Match Type selection.

- [ ] **Step 7: Auto-skip nineType for 9-hole courses**

In the course selection handler (in `useWizardCourseSelection` or `useCreateRoundWizard`), when a course is selected:

```typescript
if (selectedCourse.holes && selectedCourse.holes.length <= 9) {
  setData((prev) => ({ ...prev, nineType: 'front9' as NineType }));
  setCurrentStep('matchType'); // Skip nineType step
} else {
  setCurrentStep('nineType');
}
```

- [ ] **Step 8: Run type check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/screens/rounds/CreateRoundBottomSheet/
git commit -m "feat: rewire wizard with NineType step, inline tee pickers, and YourSetup step"
```

---

## Task 8: Round Creation — Wire nineType + Per-Player Tees

**Files:**
- Modify: `src/screens/rounds/RoundListScreen/hooks/useStartNewRound.ts`

- [ ] **Step 1: Accept nineType parameter**

Add `nineType` to the `handleStartNewRound` function parameters (with `NineType` import):

```typescript
import type { NineType } from '@/types/database/enums';
```

Add after `handicapSource` parameter:

```typescript
  nineType: NineType = 'full',
```

- [ ] **Step 2: Filter holes by nineType**

After fetching/building the holes array (around line 23-37), add filtering:

```typescript
function filterHolesByNineType(holes: Hole[], nineType: NineType): Hole[] {
  if (nineType === 'front9') return holes.filter((h) => h.number <= 9);
  if (nineType === 'back9') return holes.filter((h) => h.number >= 10);
  return holes;
}
```

Apply to both `DEFAULT_HOLES` / fetched holes and `PLACEHOLDER_HOLES` before passing to `initializeRound`.

- [ ] **Step 3: Insert nine_type into round DB record**

In the `supabase.from('rounds').insert()` call, add:

```typescript
  nine_type: nineType,
```

- [ ] **Step 4: Insert selected_tee per player into round_players**

In the `round_players` insert (around lines 190-209), add `selected_tee`:

```typescript
const roundPlayersData = [
  { round_id: roundId, player_id: user.id, added_by: null, selected_tee: selectedTee ?? null },
  ...partners.map((p) => ({
    round_id: roundId,
    player_id: p.id,
    added_by: user.id,
    selected_tee: p.selectedTee ?? selectedTee ?? null,
  })),
];
```

- [ ] **Step 5: Build playerTeeMap and pass to initializeRound**

```typescript
const playerTeeMap = new Map<string, TeeBox>();
if (selectedTee) {
  playerTeeMap.set(user.id, selectedTee);
}
for (const partner of partners) {
  const tee = partner.selectedTee ?? selectedTee;
  if (tee) {
    playerTeeMap.set(partner.id, tee);
  }
}

const filteredHoles = filterHolesByNineType(courseHoles, nineType);

initializeRound(
  roundId, allPlayers, filteredHoles, gameType, true, [],
  selectedTee, handicapSource, playerTeeMap, nineType
);
```

- [ ] **Step 6: Run type check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/screens/rounds/RoundListScreen/hooks/useStartNewRound.ts
git commit -m "feat: wire nineType and per-player tees into round creation"
```

---

## Task 9: Scoring Screen — Per-Player Handicap Map

**Files:**
- Modify: `src/screens/scoring/ScorecardEntryScreen/index.tsx`

- [ ] **Step 1: Update playerHandicapMap to use per-player tees**

In the `playerHandicapMap` computation (around lines 104-118), change from using a single `selectedTeeData` to per-player:

```typescript
const playerHandicapMap = useMemo(() => {
  const map = new Map<string, number>();
  for (const player of currentPlayers) {
    const playerTee = playerTeeMap.get(player.id) || selectedTeeData;
    const { playingHandicap } = calculatePlayingHandicap({
      player,
      selectedTeeData: playerTee,
      holes,
      handicapSource,
      gameType: undefined,
      applyDailyHandicap: isPremium,
    });
    map.set(player.id, playingHandicap);
  }
  return map;
}, [currentPlayers, playerTeeMap, selectedTeeData, holes, handicapSource, isPremium]);
```

Extract `playerTeeMap` from the store:

```typescript
const playerTeeMap = useScorecardStore((s) => s.playerTeeMap);
```

- [ ] **Step 2: Pass holes to useScorecardNavigation**

Update the `useScorecardNavigation` call to pass `holes`:

```typescript
const navigation = useScorecardNavigation({
  navigation: nav,
  currentHole,
  setCurrentHole,
  pendingSyncCount,
  onLeaveAttempt,
  triggerSync,
  holes,
});
```

- [ ] **Step 3: Add tee dot indicators**

Import `hasMultipleTees` and `resolvePlayerTee` from `@/utils/teeResolution`. In the player name rendering, conditionally show a colored dot:

```typescript
const showTeeDots = hasMultipleTees(
  currentPlayers.map((p) => p.id),
  playerTeeMap,
  selectedTeeData,
);
```

For each player row, if `showTeeDots`:

```typescript
const playerTee = resolvePlayerTee(player.id, playerTeeMap, selectedTeeData);
// Render a small View with backgroundColor matching playerTee?.color
```

- [ ] **Step 4: Run type check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/scoring/ScorecardEntryScreen/
git commit -m "feat: use per-player tees for handicap calculation and add tee dot indicators"
```

---

## Task 10: Competition Per-Player Tees

**Files:**
- Modify: `src/services/competitionPlayers/competitionPlayersService.ts`
- Modify: `src/screens/competitions/CompetitionSettingsScreen.tsx`
- Modify: `src/services/api/competitions.ts`
- Modify: `src/hooks/scorecard/useRoundMetadata.ts`

- [ ] **Step 1: Add updatePlayerTee to competition players service**

Add to `competitionPlayersService.ts`:

```typescript
/**
 * Update a competition player's default tee selection.
 */
export async function updateCompetitionPlayerTee(
  competitionId: string,
  playerId: string,
  selectedTee: TeeBox | null,
): Promise<void> {
  const { error } = await supabase
    .from('competition_players')
    .update({ selected_tee: selectedTee })
    .eq('competition_id', competitionId)
    .eq('player_id', playerId);

  if (error) {
    throw Object.assign(new Error(`Failed to update player tee: ${error.message}`), {
      code: 'DATABASE' as const,
    });
  }
}

/**
 * Set a per-round tee override for a competition player.
 */
export async function upsertRoundPlayerTee(
  roundId: string,
  playerId: string,
  selectedTee: TeeBox,
): Promise<void> {
  const { error } = await supabase
    .from('competition_round_player_tees')
    .upsert(
      { round_id: roundId, player_id: playerId, selected_tee: selectedTee, updated_at: new Date().toISOString() },
      { onConflict: 'round_id,player_id' },
    );

  if (error) {
    throw Object.assign(new Error(`Failed to upsert round player tee: ${error.message}`), {
      code: 'DATABASE' as const,
    });
  }
}
```

- [ ] **Step 2: Fix competition creation bug — pass selected_tee**

In `src/services/api/competitions.ts`, in the round insert payload (around line 180-192), add:

```typescript
  selected_tee: roundInput.selectedTee || null,
```

- [ ] **Step 3: Add Player Tees section to CompetitionSettingsScreen**

Add a new "Player Tees" section after the existing name/description section. Implementation:

1. Fetch competition rounds with their course tees: `rounds.select('id, round_number, courses!course_id(tees)')`.
2. Show a round/course picker at the top (defaults to first upcoming round). This determines which set of available tees is shown.
3. Below, list all competition players with the `TeePill` inline tee picker pattern (same as PartnersStep). Each player's current `selected_tee` from `competition_players` is pre-selected.
4. On tee change, call `updateCompetitionPlayerTee(competitionId, playerId, tee)`.
5. If the selected round's course has no tees, show a message: "No tee data available for this course."

For the per-round override UI, add a similar section to the round detail screen (organizer view) using `upsertRoundPlayerTee`.

- [ ] **Step 4: Update useRoundMetadata to build playerTeeMap**

In `src/hooks/scorecard/useRoundMetadata.ts`, after fetching round data, query for per-player tees:

For standalone rounds:
```typescript
const { data: roundPlayers } = await supabase
  .from('round_players')
  .select('player_id, selected_tee')
  .eq('round_id', roundId)
  .not('selected_tee', 'is', null);
```

For competition rounds:
```typescript
// First check round-specific overrides
const { data: roundOverrides } = await supabase
  .from('competition_round_player_tees')
  .select('player_id, selected_tee')
  .eq('round_id', roundId);

// Then competition defaults
const { data: compDefaults } = await supabase
  .from('competition_players')
  .select('player_id, selected_tee')
  .eq('competition_id', competitionId)
  .not('selected_tee', 'is', null);
```

Build the `playerTeeMap` with round overrides taking precedence:

```typescript
const playerTeeMap = new Map<string, TeeBox>();

// Layer 1: competition defaults (lowest priority)
if (compDefaults) {
  for (const row of compDefaults) {
    if (row.selected_tee) {
      playerTeeMap.set(row.player_id, row.selected_tee as TeeBox);
    }
  }
}

// Layer 2: round-specific overrides (highest priority, overwrites layer 1)
if (roundOverrides) {
  for (const row of roundOverrides) {
    playerTeeMap.set(row.player_id, row.selected_tee as TeeBox);
  }
}

// For standalone rounds, just use round_players.selected_tee
if (roundPlayers) {
  for (const row of roundPlayers) {
    if (row.selected_tee) {
      playerTeeMap.set(row.player_id, row.selected_tee as TeeBox);
    }
  }
}
```

Expose `playerTeeMap` in the return value.

- [ ] **Step 5: Run type check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/competitionPlayers/ src/services/api/competitions.ts src/screens/competitions/CompetitionSettingsScreen.tsx src/hooks/scorecard/useRoundMetadata.ts
git commit -m "feat: add competition per-player tee assignment and fix creation bug"
```

---

## Task 11: Display & Polish

**Files:**
- Modify: `src/components/rounds/RoundListCard/` — 9-hole badge
- Modify: `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundPermissions.ts` — dynamic completion
- Modify: `src/services/scoring/utils/leaderboardUtils.ts` — skip back-9 tiebreaker for < 18

- [ ] **Step 1: Add 9-hole badge to RoundListCard**

In the RoundListCard component, check if the round has `nine_type !== 'full'` and show a badge:

```typescript
{round.nineType && round.nineType !== 'full' && (
  <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
    <Text style={[styles.badgeText, { color: colors.primary }]}>
      {round.nineType === 'front9' ? 'Front 9' : 'Back 9'}
    </Text>
  </View>
)}
```

- [ ] **Step 2: Fix useViewRoundPermissions completion check**

Replace `scoredHoles.length >= 18` with a dynamic check based on the round's hole count (fetch from round data or derive from holes array).

- [ ] **Step 3: Skip back-9 tiebreaker for < 18 scores**

In `leaderboardUtils.ts`, in the `applyBackNineTiebreaker` function, add early return:

```typescript
if (scores.length < 18) return; // Skip tiebreaker for 9-hole rounds
```

- [ ] **Step 4: Run type check and full test suite**

Run: `pnpm type-check && pnpm test --passWithNoTests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/rounds/ src/screens/rounds/ViewRoundScreen/ src/services/scoring/
git commit -m "feat: add 9-hole badges, dynamic completion check, and tiebreaker guard"
```

---

## Task 12: Handicap — 9-Hole Ratings

**Files:**
- Modify: `src/hooks/usePlayingHandicap.ts`
- Modify: `src/services/handicap/recalculateScorecardDifferential.ts`

- [ ] **Step 1: Update usePlayingHandicap for 9-hole ratings**

Add `nineType` parameter (default `'full'`):

```typescript
import { getEffectiveTeeRatings } from '@/utils/teeResolution';
import type { NineType } from '@/types/database/enums';
```

When computing daily handicap, use effective ratings:

```typescript
const { slope, cr } = getEffectiveTeeRatings(selectedTeeData, nineType);
// Pass slope and cr to calculateGADailyHandicap instead of selectedTeeData.slopeRating / courseRating
```

- [ ] **Step 2: Update recalculateScorecardDifferential for per-player tees**

When fetching tee data for differential calculation, check `round_players.selected_tee` or `competition_round_player_tees` first before falling back to `rounds.selected_tee`. Also apply `getEffectiveTeeRatings` based on `rounds.nine_type`.

- [ ] **Step 3: Run type check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePlayingHandicap.ts src/services/handicap/
git commit -m "feat: use 9-hole tee ratings and per-player tees in handicap calculations"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Run full type check**

Run: `pnpm type-check`
Expected: PASS with 0 errors

- [ ] **Step 2: Run full test suite**

Run: `pnpm test --passWithNoTests`
Expected: All existing tests pass

- [ ] **Step 3: Manual verification checklist**

Verify each scenario from the spec:

1. Create a front 9 standalone round at an 18-hole course — only holes 1-9 in scoring
2. Create a back 9 standalone round — holes 10-18, starts at hole 10
3. Create a full 18-hole round — no regression
4. Create a group round with different tees per player — different daily handicaps shown
5. Verify tee dots appear when players have different tees, hidden when same tee
6. Start a 9-hole round with skins — pot calculates for 9 holes
7. Verify league tagging still rejects 9-hole rounds
8. Test offline: start back-9 round, close app, reopen — resumes on correct hole

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete 9-hole rounds and per-player tee selection"
```
