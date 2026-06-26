# Split Alt-Shot Leaderboard Reuse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the existing live sub-match leaderboard for split alt-shot rounds in two new places — a ViewRound "Leaderboard" tab and the competition per-round leaderboard — for both in-progress and completed rounds.

**Architecture:** Decouple `SubMatchLeaderboardTab` from the live scoring store (inject a `getStrokes` prop) and move it to `src/components/leaderboard/`. Add a self-contained `RoundSubMatchLeaderboard` wrapper that sources everything from a `roundId` (via `useRoundDetails` + `useRoundScorecards`) and renders the tab. Mount the wrapper in ViewRound and the competition `LeaderboardTab`, gated by a shared `isSplitAltShotRound` helper.

**Tech Stack:** TypeScript, React Native, TanStack Query, Jest + `@/__tests__/utils/renderHelpers`.

## Global Constraints

- **No schema change.** `sub_matches`, scorecards, `useRoundDetails`, `useRoundScorecards`, `useRoundTeams`, `useSubMatches` all already exist.
- **Split alt-shot detection** is exactly: `round_format === 'split' && (game_type === 'alt-shot' || team_format === 'alt-shot')`.
- **Both states:** the live sub-match leaderboard is used for split alt-shot in-progress AND completed rounds, on both ViewRound and the competition.
- **No behaviour change to the Review Scorecard screen** beyond the import path + passing a store-backed `getStrokes`.
- **No change to overall competition standings** (round_results aggregation) — only the per-round leaderboard display.
- Score extraction idiom (used in both score sources): `isSingleBallScore(raw) ? raw.strokes : raw.balls?.[0]?.strokes`.

---

## File Structure

- Move + edit: `src/components/leaderboard/SubMatchLeaderboardTab.tsx` (from `src/screens/scoring/ReviewScorecardScreen/components/`) — presentational, `getStrokes` injected.
- New: `src/components/leaderboard/RoundSubMatchLeaderboard.tsx` — self-contained server-backed wrapper.
- New: `src/utils/roundFormat.ts` — `isSplitAltShotRound` helper.
- Edit: `src/screens/scoring/ReviewScorecardScreen/index.tsx` + `components/index.ts` — import path + pass `getStrokes`.
- Edit: `src/components/leaderboard/index.ts` — export the moved component + wrapper.
- Edit: `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.ts` + `index.tsx` — Leaderboard tab for split alt-shot.
- Edit: `src/components/leaderboard/LeaderboardTab.tsx` — render the wrapper for split alt-shot rounds.

---

### Task 1: Decouple and move `SubMatchLeaderboardTab`

Make the leaderboard purely presentational (inject `getStrokes`), move it to the shared leaderboard folder, and update the Review screen to keep working unchanged.

**Files:**
- Move: `src/screens/scoring/ReviewScorecardScreen/components/SubMatchLeaderboardTab.tsx` → `src/components/leaderboard/SubMatchLeaderboardTab.tsx`
- Modify: `src/screens/scoring/ReviewScorecardScreen/components/index.ts:13` (remove export)
- Modify: `src/components/leaderboard/index.ts` (add export)
- Modify: `src/screens/scoring/ReviewScorecardScreen/index.tsx` (import path + pass `getStrokes`)
- Test: `src/components/leaderboard/SubMatchLeaderboardTab.test.tsx` (new)

**Interfaces:**
- Produces: `SubMatchLeaderboardTab` with new required prop `getStrokes: (playerId: string, holeNumber: number) => number | undefined`. All other props unchanged (`roundId, competitionId?, gameType, teamFormat?, holes, currentUserId?, selectedTeeData?, handicapSource?, isRefreshing, onRefresh, bottomInset`). Exported from `@/components/leaderboard`.

- [ ] **Step 1: Write the failing test**

Create `src/components/leaderboard/SubMatchLeaderboardTab.test.tsx`. This proves the component mounts with an injected `getStrokes` and **no scorecard store**:

```tsx
import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { SubMatchLeaderboardTab } from './SubMatchLeaderboardTab';

jest.mock('@/hooks/rounds', () => ({
  useSubMatches: () => ({ data: [], isLoading: false }),
}));
jest.mock('@/hooks/scorecard/useRoundTeams', () => ({
  useRoundTeams: () => ({ teams: [], isLoading: false }),
}));

describe('SubMatchLeaderboardTab (decoupled)', () => {
  it('renders the empty state with an injected getStrokes and no scorecard store', () => {
    const getStrokes = jest.fn(() => undefined);
    render(
      <SubMatchLeaderboardTab
        roundId="r1"
        gameType="alt-shot"
        teamFormat="alt-shot"
        holes={[]}
        getStrokes={getStrokes}
        isRefreshing={false}
        onRefresh={() => {}}
        bottomInset={0}
      />
    );
    expect(screen.getByText('No Sub-Matches')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- SubMatchLeaderboardTab`
Expected: FAIL — module not found at the new path (the file hasn't moved yet) / `getStrokes` prop type doesn't exist.

- [ ] **Step 3: Move the file and decouple it**

Move `src/screens/scoring/ReviewScorecardScreen/components/SubMatchLeaderboardTab.tsx` to `src/components/leaderboard/SubMatchLeaderboardTab.tsx` (use `git mv`). Then edit the moved file:

(a) Remove these two imports (no longer used):
```tsx
import { useScorecardStore } from '@/store/scorecardStore';
import { isSingleBallScore } from '@/types/database/base';
```

(b) Change the util import from relative to absolute (the util stays in its current folder):
```tsx
import {
  resolveSubMatchModel,
  computeMatchPlaySubMatch,
  computeNetSubMatch,
  tallyOverall,
  type SubMatchPlayer,
  type SubMatchSides,
  type SubMatchLeader,
} from '@/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard';
```

(c) Add `getStrokes` to the props interface (after `roundId`):
```tsx
interface SubMatchLeaderboardTabProps {
  roundId: string;
  getStrokes: (playerId: string, holeNumber: number) => number | undefined;
  competitionId?: string | null;
  gameType: GameType;
  teamFormat?: TeamFormat | null;
  holes: Hole[];
  currentUserId?: string;
  selectedTeeData?: TeeBox | null;
  handicapSource?: HandicapSource;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}
```

(d) Add `getStrokes` to the destructured params and DELETE the store selector + the internal `getStrokes` useMemo. Replace:
```tsx
export function SubMatchLeaderboardTab({
  roundId,
  competitionId,
  gameType,
  teamFormat,
  holes,
  currentUserId,
  selectedTeeData,
  handicapSource,
  isRefreshing,
  onRefresh,
  bottomInset,
}: SubMatchLeaderboardTabProps) {
  const colors = useThemeColors();
  const getPlayerScoreFromStore = useScorecardStore((s) => s.getPlayerScore);
  const { data: subMatches, isLoading: smLoading } = useSubMatches(roundId);
  const { teams, isLoading: teamsLoading } = useRoundTeams(competitionId ?? undefined, true, roundId);

  const getStrokes = useMemo(
    () => (playerId: string, holeNumber: number): number | undefined => {
      const raw = getPlayerScoreFromStore(playerId, holeNumber);
      if (!raw) return undefined;
      return isSingleBallScore(raw) ? raw.strokes : raw.balls?.[0]?.strokes;
    },
    [getPlayerScoreFromStore]
  );
```
with:
```tsx
export function SubMatchLeaderboardTab({
  roundId,
  getStrokes,
  competitionId,
  gameType,
  teamFormat,
  holes,
  currentUserId,
  selectedTeeData,
  handicapSource,
  isRefreshing,
  onRefresh,
  bottomInset,
}: SubMatchLeaderboardTabProps) {
  const colors = useThemeColors();
  const { data: subMatches, isLoading: smLoading } = useSubMatches(roundId);
  const { teams, isLoading: teamsLoading } = useRoundTeams(competitionId ?? undefined, true, roundId);
```
(The rest of the component already uses the local name `getStrokes`, so lines 124/140 keep working with the prop.)

(e) If `useMemo` is now unused, leave the existing `import React, { useMemo } from 'react';` — `useMemo` is still used by `playerById`/`rows`/`leaders` memos, so keep the import as-is.

- [ ] **Step 4: Update the barrels and the Review screen**

In `src/screens/scoring/ReviewScorecardScreen/components/index.ts`, delete line 13:
```tsx
export { SubMatchLeaderboardTab } from './SubMatchLeaderboardTab';
```

In `src/components/leaderboard/index.ts`, add:
```tsx
export { SubMatchLeaderboardTab } from './SubMatchLeaderboardTab';
```

In `src/screens/scoring/ReviewScorecardScreen/index.tsx`:
- Remove `SubMatchLeaderboardTab,` from the `'./components'` import block (around line 49).
- Add an import: `import { SubMatchLeaderboardTab } from '@/components/leaderboard';`
- Add (if not already imported): `import { isSingleBallScore } from '@/types/database/base';`
- Build a store-backed `getStrokes` near the other `useCallback`s (the screen already has `getPlayerScore` from `useScoreReview`):
```tsx
  const getStrokes = useCallback(
    (playerId: string, hole: number): number | undefined => {
      const raw = getPlayerScore(playerId, hole);
      if (!raw) return undefined;
      return isSingleBallScore(raw) ? raw.strokes : raw.balls?.[0]?.strokes;
    },
    [getPlayerScore]
  );
```
- Pass it to the existing `<SubMatchLeaderboardTab ... />` (around line 432): add `getStrokes={getStrokes}` to the prop list.

- [ ] **Step 5: Run the test + the Review screen tests**

Run: `pnpm test -- SubMatchLeaderboardTab ReviewScorecard`
Expected: PASS (the new decoupling test; any existing Review screen tests still green).

- [ ] **Step 6: Type-check**

Run: `pnpm type-check 2>&1 | grep -E "SubMatchLeaderboardTab|ReviewScorecardScreen/index" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

- [ ] **Step 7: Commit**

```bash
git add -A src/components/leaderboard/SubMatchLeaderboardTab.tsx src/components/leaderboard/SubMatchLeaderboardTab.test.tsx src/components/leaderboard/index.ts src/screens/scoring/ReviewScorecardScreen/
git commit -m "refactor(leaderboard): decouple SubMatchLeaderboardTab from store, move to shared

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `isSplitAltShotRound` helper

**Files:**
- Create: `src/utils/roundFormat.ts`
- Test: `src/__tests__/utils/roundFormat.test.ts`

**Interfaces:**
- Produces: `isSplitAltShotRound(round: { round_format?: string | null; game_type?: string | null; team_format?: string | null }): boolean`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/utils/roundFormat.test.ts`:

```ts
import { isSplitAltShotRound } from '@/utils/roundFormat';

describe('isSplitAltShotRound', () => {
  it('true for split + alt-shot game_type', () => {
    expect(isSplitAltShotRound({ round_format: 'split', game_type: 'alt-shot', team_format: null })).toBe(true);
  });
  it('true for split + alt-shot team_format', () => {
    expect(isSplitAltShotRound({ round_format: 'split', game_type: 'stableford', team_format: 'alt-shot' })).toBe(true);
  });
  it('false for combined alt-shot', () => {
    expect(isSplitAltShotRound({ round_format: 'combined', game_type: 'alt-shot', team_format: 'alt-shot' })).toBe(false);
  });
  it('false for split non-alt-shot', () => {
    expect(isSplitAltShotRound({ round_format: 'split', game_type: 'match-play', team_format: 'best-ball' })).toBe(false);
  });
  it('false for missing fields', () => {
    expect(isSplitAltShotRound({})).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test -- roundFormat`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `src/utils/roundFormat.ts`:

```ts
/**
 * True when a round is a split alt-shot (foursomes) round — head-to-head
 * sub-matches scored by the alt-shot model. Used to gate the sub-match
 * leaderboard on the ViewRound screen and the competition leaderboard.
 */
export function isSplitAltShotRound(round: {
  round_format?: string | null;
  game_type?: string | null;
  team_format?: string | null;
}): boolean {
  return (
    round.round_format === 'split' &&
    (round.game_type === 'alt-shot' || round.team_format === 'alt-shot')
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test -- roundFormat`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add src/utils/roundFormat.ts src/__tests__/utils/roundFormat.test.ts
git commit -m "feat(rounds): add isSplitAltShotRound helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `RoundSubMatchLeaderboard` self-contained wrapper

**Files:**
- Create: `src/components/leaderboard/RoundSubMatchLeaderboard.tsx`
- Modify: `src/components/leaderboard/index.ts` (export it)
- Test: `src/components/leaderboard/RoundSubMatchLeaderboard.test.tsx` (new)

**Interfaces:**
- Consumes: `SubMatchLeaderboardTab` (Task 1); `useRoundDetails(roundId)` → `{ data: RoundWithCourse }` (from `@/hooks/rounds`); `useRoundScorecards(roundId)` → `{ data: ScorecardWithPlayer[] }` (from `@/hooks/rounds`); `isSingleBallScore` (`@/types/database/base`).
- Produces: `RoundSubMatchLeaderboard` with props `{ roundId: string; competitionId?: string | null; currentUserId?: string; isRefreshing?: boolean; onRefresh?: () => void; bottomInset?: number }`. Exported from `@/components/leaderboard`.

- [ ] **Step 1: Write the failing test**

Create `src/components/leaderboard/RoundSubMatchLeaderboard.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { RoundSubMatchLeaderboard } from './RoundSubMatchLeaderboard';

jest.mock('@/hooks/rounds', () => ({
  useRoundDetails: () => ({
    data: {
      id: 'r1',
      game_type: 'alt-shot',
      team_format: 'alt-shot',
      handicap_source: 'profile',
      selected_tee: null,
      course: { holes: [] },
    },
  }),
  useRoundScorecards: () => ({ data: [] }),
  useSubMatches: () => ({ data: [], isLoading: false }),
}));
jest.mock('@/hooks/scorecard/useRoundTeams', () => ({
  useRoundTeams: () => ({ teams: [], isLoading: false }),
}));

describe('RoundSubMatchLeaderboard', () => {
  it('renders the sub-match leaderboard for a round id (empty sub-matches → empty state)', () => {
    render(<RoundSubMatchLeaderboard roundId="r1" competitionId="c1" bottomInset={0} />);
    expect(screen.getByText('No Sub-Matches')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test -- RoundSubMatchLeaderboard`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the wrapper**

Create `src/components/leaderboard/RoundSubMatchLeaderboard.tsx`:

```tsx
import React, { useCallback } from 'react';
import { useRoundDetails, useRoundScorecards } from '@/hooks/rounds';
import { isSingleBallScore } from '@/types/database/base';
import { SubMatchLeaderboardTab } from './SubMatchLeaderboardTab';
import type { GameType, TeamFormat } from '@/types';

interface RoundSubMatchLeaderboardProps {
  roundId: string;
  competitionId?: string | null;
  currentUserId?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  bottomInset?: number;
}

/**
 * Self-contained live sub-match leaderboard for a round. Sources holes / tee /
 * handicap source / game type from `useRoundDetails`, and per-hole strokes from
 * the round's server scorecards (`useRoundScorecards`). Drop it in anywhere with
 * a round id — used by the ViewRound Leaderboard tab and the competition
 * per-round leaderboard for split alt-shot rounds.
 */
export function RoundSubMatchLeaderboard({
  roundId,
  competitionId,
  currentUserId,
  isRefreshing = false,
  onRefresh,
  bottomInset = 0,
}: RoundSubMatchLeaderboardProps) {
  const { data: round } = useRoundDetails(roundId);
  const { data: scorecards } = useRoundScorecards(roundId);

  const getStrokes = useCallback(
    (playerId: string, hole: number): number | undefined => {
      const sc = scorecards?.find((s) => s.player_id === playerId);
      const raw = sc?.scores?.[String(hole)];
      if (!raw) return undefined;
      return isSingleBallScore(raw) ? raw.strokes : raw.balls?.[0]?.strokes;
    },
    [scorecards]
  );

  return (
    <SubMatchLeaderboardTab
      roundId={roundId}
      getStrokes={getStrokes}
      competitionId={competitionId}
      gameType={(round?.game_type ?? 'alt-shot') as GameType}
      teamFormat={(round?.team_format ?? null) as TeamFormat | null}
      holes={round?.course?.holes ?? []}
      currentUserId={currentUserId}
      selectedTeeData={round?.selected_tee ?? null}
      handicapSource={round?.handicap_source ?? undefined}
      isRefreshing={isRefreshing}
      onRefresh={onRefresh ?? (() => {})}
      bottomInset={bottomInset}
    />
  );
}
```

Add to `src/components/leaderboard/index.ts`:
```tsx
export { RoundSubMatchLeaderboard } from './RoundSubMatchLeaderboard';
```

If `tsc` complains that `round?.selected_tee` / `round?.handicap_source` don't match `TeeBox | null` / `HandicapSource`, narrow with the same types `RoundWithCourse` uses (import `TeeBox` from `@/types` and `HandicapSource` from `@/types/database/enums`) and cast at the prop, e.g. `selectedTeeData={round?.selected_tee ?? null}` — these come from the same `RoundWithCourse` shape, so a cast should not be needed; only add one if the type-check fails.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test -- RoundSubMatchLeaderboard`
Expected: PASS.

- [ ] **Step 5: Type-check and commit**

Run: `pnpm type-check 2>&1 | grep -E "RoundSubMatchLeaderboard" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

```bash
git add src/components/leaderboard/RoundSubMatchLeaderboard.tsx src/components/leaderboard/RoundSubMatchLeaderboard.test.tsx src/components/leaderboard/index.ts
git commit -m "feat(leaderboard): add self-contained RoundSubMatchLeaderboard wrapper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: ViewRound "Leaderboard" tab for split alt-shot

The `'leaderboard'` TabKey already exists; it's pushed today only for stroke/stableford/par. Add it for split alt-shot and render the wrapper.

**Files:**
- Modify: `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.ts` (push the tab)
- Modify: `src/screens/rounds/ViewRoundScreen/index.tsx` (render the wrapper + add safe-area inset)

**Interfaces:**
- Consumes: `RoundSubMatchLeaderboard` (Task 3). `useViewRoundTabs` already receives `isAltShotSplitRound: boolean`; the view-model exposes `vm.isAltShotSplitRound`, `vm.round`, `vm.competitionInfo`, `vm.user`, `vm.isRefreshing`, `vm.handleRefresh`.

- [ ] **Step 1: Push the Leaderboard tab for split alt-shot**

In `src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.ts`, the existing block pushes the leaderboard tab for individual stroke formats:
```tsx
    if ((isStrokePlayRound || isStablefordRound || isParRound) && playerCount > 1) {
      result.push({ key: 'leaderboard', label: 'Leaderboard' });
    }
```
Add immediately after it (a round is never both, so the key won't be pushed twice):
```tsx
    // Split alt-shot rounds get the live sub-match leaderboard under the same
    // 'leaderboard' tab key (rendered by RoundSubMatchLeaderboard in index.tsx).
    if (isAltShotSplitRound) {
      result.push({ key: 'leaderboard', label: 'Leaderboard' });
    }
```
Add `isAltShotSplitRound` to the `useMemo` dependency array at the end of that `useMemo` if it is not already listed.

- [ ] **Step 2: Render the wrapper in index.tsx**

In `src/screens/rounds/ViewRoundScreen/index.tsx`:
- Add imports:
```tsx
import { RoundSubMatchLeaderboard } from '@/components/leaderboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```
- Inside the component, add: `const insets = useSafeAreaInsets();`
- The existing leaderboard block is gated on stroke/stableford/par (line ~464). Add a sibling block for split alt-shot:
```tsx
        {vm.activeTab === 'leaderboard' && vm.isAltShotSplitRound && vm.round && (
          <RoundSubMatchLeaderboard
            roundId={vm.round.id}
            competitionId={vm.competitionInfo?.id ?? null}
            currentUserId={vm.user?.id}
            isRefreshing={vm.isRefreshing}
            onRefresh={vm.handleRefresh}
            bottomInset={insets.bottom}
          />
        )}
```
(Place it adjacent to the existing `vm.activeTab === 'leaderboard' && (vm.isStrokePlayRound || ...)` block. The two conditions are mutually exclusive.)

- [ ] **Step 3: Type-check**

Run: `pnpm type-check 2>&1 | grep -E "ViewRoundScreen/index|useViewRoundTabs" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

- [ ] **Step 4: Run any ViewRound tab tests**

Run: `pnpm test -- useViewRoundTabs ViewRound`
Expected: PASS, or only pre-existing baseline failures unrelated to this change.

- [ ] **Step 5: Commit**

```bash
git add src/screens/rounds/ViewRoundScreen/hooks/useViewRoundTabs.ts src/screens/rounds/ViewRoundScreen/index.tsx
git commit -m "feat(rounds): add Leaderboard tab for split alt-shot on ViewRound

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Competition per-round leaderboard for split alt-shot

Render the live sub-match leaderboard for split alt-shot rounds in both the in-progress and completed maps, instead of the empty `RoundLeaderboard`.

**Files:**
- Modify: `src/components/leaderboard/LeaderboardTab.tsx` (both round maps, ~467-499 and ~502-517)
- Test: `src/components/leaderboard/LeaderboardTab.test.tsx` (extend)

**Interfaces:**
- Consumes: `RoundSubMatchLeaderboard` (Task 3), `isSplitAltShotRound` (Task 2). `competitionId` — confirm it is in scope in `LeaderboardTab` (it renders a competition's board); if not a direct variable, derive it from the props/round the component already has, or thread it from the parent. Pass `null` only if genuinely unavailable (the wrapper still works via `useRoundTeams`'s roundId fallback).

- [ ] **Step 1: Write the failing test**

Extend `src/components/leaderboard/LeaderboardTab.test.tsx`. First add a mock for the wrapper near the other mocks (so we can assert it renders without pulling its real hooks):
```tsx
jest.mock('./RoundSubMatchLeaderboard', () => {
  const { View, Text } = require('react-native');
  return {
    RoundSubMatchLeaderboard: ({ roundId }: { roundId: string }) => (
      <View testID={`submatch-leaderboard-${roundId}`}><Text>SubMatch LB</Text></View>
    ),
  };
});
```
Then add a test that supplies an in-progress split alt-shot round and asserts the wrapper renders for it (mirror the file's existing round-fixture + render setup — reuse its `RoundWithCourse` fixture builder and `mockUseCompetitionLeaderboard` setup):
```tsx
it('renders the sub-match leaderboard for an in-progress split alt-shot round', () => {
  // Build a rounds array containing one in-progress round with:
  //   round_format: 'split', game_type: 'alt-shot', team_format: 'alt-shot',
  //   is_team_round: true, status: 'in-progress'
  // using the same fixture/builder + props this test file already uses for
  // other round cases, then render <LeaderboardTab ... rounds={[thatRound]} />.
  // Assert:
  expect(screen.getByTestId(`submatch-leaderboard-${ROUND_ID}`)).toBeTruthy();
});
```
(Use the test file's existing helpers for building rounds and rendering `LeaderboardTab`; only the round's format fields and the new assertion are specific to this test. Match the existing fixtures' field names exactly.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test -- LeaderboardTab`
Expected: FAIL — the split alt-shot round currently renders `RoundLeaderboard`, not the mocked wrapper, so `getByTestId('submatch-leaderboard-...')` is not found.

- [ ] **Step 3: Branch both round maps to the wrapper**

In `src/components/leaderboard/LeaderboardTab.tsx`:
- Add imports:
```tsx
import { isSplitAltShotRound } from '@/utils/roundFormat';
import { RoundSubMatchLeaderboard } from './RoundSubMatchLeaderboard';
```
- In the **in-progress** map (the `inProgressRounds.map((round) => { ... })` returning the `canRenderLive ? <InProgressRoundLeaderboard/> : <RoundLeaderboard/>` block), add a split-alt-shot branch first:
```tsx
          {inProgressRounds.map((round) => {
            const gameType = round.game_type as GameType;
            if (isSplitAltShotRound(round)) {
              return (
                <View key={round.id} style={styles.roundLeaderboardContainer}>
                  <RoundSubMatchLeaderboard
                    roundId={round.id}
                    competitionId={competitionId}
                    currentUserId={currentUserId}
                  />
                </View>
              );
            }
            const canRenderLive =
              !round.is_team_round && IN_PROGRESS_SUPPORTED_GAME_TYPES.has(gameType);
            return (
              <View key={round.id} style={styles.roundLeaderboardContainer}>
                {/* ...existing canRenderLive ? InProgressRoundLeaderboard : RoundLeaderboard... */}
              </View>
            );
          })}
```
- In the **completed** map (`completedRounds.map((round) => ( ... <RoundLeaderboard/> ... ))`), add the same guard:
```tsx
          {completedRounds.map((round) => (
            <View key={round.id} style={styles.roundLeaderboardContainer}>
              {isSplitAltShotRound(round) ? (
                <RoundSubMatchLeaderboard
                  roundId={round.id}
                  competitionId={competitionId}
                  currentUserId={currentUserId}
                />
              ) : (
                <RoundLeaderboard
                  roundId={round.id}
                  gameType={round.game_type as GameType}
                  isTeamRound={round.is_team_round || false}
                  currentUserId={currentUserId}
                  autoRefresh={false}
                  filterView={effectiveView}
                  playerTeamLookup={
                    effectiveView === 'individual' && hasTeams ? playerTeamLookup : undefined
                  }
                  testID={`round-leaderboard-${round.round_number}`}
                />
              )}
            </View>
          ))}
```
- For `competitionId`: confirm whether `LeaderboardTab` already has it in scope (search the component's props/destructure). If yes, pass it. If not in scope, pass `competitionId={undefined}` — `RoundSubMatchLeaderboard` → `SubMatchLeaderboardTab` → `useRoundTeams(undefined, true, roundId)` resolves teams from the round's `team_config`, so it still works. Do NOT invent a new prop unless the file already threads one.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test -- LeaderboardTab`
Expected: PASS — the new test plus all pre-existing `LeaderboardTab` tests stay green.

- [ ] **Step 5: Type-check and commit**

Run: `pnpm type-check 2>&1 | grep -E "LeaderboardTab" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

```bash
git add src/components/leaderboard/LeaderboardTab.tsx src/components/leaderboard/LeaderboardTab.test.tsx
git commit -m "feat(leaderboard): show live sub-match leaderboard for split alt-shot rounds

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Verify end-to-end

- [ ] **Step 1: Run all affected suites**

Run: `pnpm test -- SubMatchLeaderboardTab RoundSubMatchLeaderboard roundFormat LeaderboardTab useViewRoundTabs`
Expected: PASS (or only pre-existing baseline failures unrelated to these files — cross-check project memory "Jest baseline noise").

- [ ] **Step 2: Type-check the touched surface**

Run: `pnpm type-check 2>&1 | grep -E "SubMatchLeaderboardTab|RoundSubMatchLeaderboard|roundFormat|LeaderboardTab|ViewRoundScreen|useViewRoundTabs|ReviewScorecardScreen/index" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

- [ ] **Step 3: Confirm the Review screen's leaderboard path is unchanged in behaviour**

Run: `grep -n "getStrokes" src/screens/scoring/ReviewScorecardScreen/index.tsx`
Expected: the Review screen builds a store-backed `getStrokes` from `getPlayerScore` and passes it to `SubMatchLeaderboardTab` — its live behaviour is preserved.

- [ ] **Step 4: Manual QA (deferred, tracked separately)**

On a split alt-shot round:
1. ViewRound → new **Leaderboard** tab shows live sub-match cards + Ryder tally while in-progress, and the same after the round completes.
2. Competition leaderboard → the round's per-round section shows the sub-match leaderboard (not empty) while in-progress, and after completion.
3. Review Scorecard screen → its existing Leaderboard tab is unchanged.
4. A non-alt-shot split round and a combined alt-shot round are unaffected (no new tab, competition unchanged).

## Self-Review Notes

- **Spec coverage:** Unit A (decouple+move) → Task 1. `isSplitAltShotRound` → Task 2. Unit B wrapper → Task 3. ViewRound tab (C1) → Task 4. Competition per-round (C2) → Task 5. Verify → Task 6. Non-goal (standings) untouched. Both-states honoured (Task 4 renders regardless of status; Task 5 branches both maps).
- **Type consistency:** `getStrokes: (playerId: string, holeNumber: number) => number | undefined` is identical in the component prop (Task 1), the Review screen callback (Task 1), and the wrapper (Task 3). `isSplitAltShotRound` signature identical in Tasks 2/4/5. `RoundSubMatchLeaderboard` props identical in Tasks 3/4/5.
- **Reuse:** the score-extraction idiom `isSingleBallScore(raw) ? raw.strokes : raw.balls?.[0]?.strokes` is used in two distinct score sources (store-backed in Review, server-backed in the wrapper) — intentional, not duplicated logic to extract since the *sources* differ.
- **Backward compatibility:** the only existing consumer of `SubMatchLeaderboardTab` (Review screen) is updated in the same task as the prop change; the `'leaderboard'` TabKey reuse is safe because stroke/stableford/par and alt-shot-split are mutually exclusive formats.
