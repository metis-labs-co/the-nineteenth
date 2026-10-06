# Organiser Force-Submit (with DNF) + Re-open — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a competition organiser submit a round even when some players are incomplete (those players become DNF — no position/points), and re-open a completed round to correct it.

**Architecture:** Two new thin service functions (`forceFinalizeRound`, `reopenRound`) that directly flip `rounds.status` (RLS already permits the organiser) and reuse the existing `refinalizeRoundResults` (which already reads only `completed` scorecards, so DNF players fall out automatically). Two TanStack mutation hooks wrap them. The round leaderboard derives a "Did Not Finish" section by diffing the scorecard roster against result rows. UI entry points live on the in-progress round card and in Round Settings, with a shared `ForceSubmitRoundDialog` that lists who will be DNF'd.

**Tech Stack:** React Native, TypeScript, Supabase JS client, TanStack Query, Jest + @testing-library/react-native, react-native-paper.

## Global Constraints

- Round status values are **hyphenated**: `'upcoming' | 'in-progress' | 'completed'` (`src/types/database/enums.ts`). Terminal scorecard statuses are `'completed'` and `'confirmed'`.
- No database migration. DNF is implicit (a roster player with no result row). Permissions rely on existing RLS policy `"Users can update rounds"` (organiser may UPDATE `rounds.status`).
- Theming: use `useThemeColors()` for colors; import `spacing`, `typography`, `borderRadius`, `shadows` from `@/constants/theme`. Do NOT use Paper's `Button`; use `TouchableOpacity`.
- Supabase typed-client workaround pattern used throughout: `(supabase as any).from(...)` or `(supabase.from(...) as any)` with an eslint-disable comment, matching `finalizeRoundStatus.ts` / `mutations.ts`.
- Split rounds (rounds with `sub_matches`) are **out of scope** for force-submit; the action is hidden/disabled for them (they have their own per-sub-match forfeit flow). Re-finalization for split rounds is unchanged.
- Run the full check before each commit: `pnpm type-check` must pass for files you touched; run the specific jest file for each task.

---

## File Structure

- `src/services/rounds/forceFinalizeRound.ts` (new) — bypass-gate finalize + guard.
- `src/services/rounds/reopenRound.ts` (new) — flip status back to in-progress.
- `src/hooks/rounds/mutations.ts` (modify) — add `useForceFinalizeRound`, `useReopenRound`.
- `src/hooks/rounds/index.ts` (modify) — barrel-export the two hooks.
- `src/hooks/rounds/leaderboard.ts` (modify) — add `dnfEntries` to the response.
- `src/components/leaderboard/RoundLeaderboard.tsx` (modify) — render DNF section.
- `src/components/rounds/ForceSubmitRoundDialog.tsx` (new) — lists incomplete players, confirm/cancel.
- `src/screens/rounds/RoundSettingsScreen.tsx` (modify) — Submit-now (in-progress) + Re-open (completed) actions.
- `src/components/competitions/detail/CompetitionRoundCard.tsx` (modify) — organiser Submit-now button on in-progress cards.
- `src/components/competitions/detail/RoundsTab.tsx` (modify) — wire dialog + mutation, pass new card props.
- Tests under `src/__tests__/services/rounds/` and `src/__tests__/hooks/rounds/` and `src/__tests__/components/`.

---

### Task 1: `forceFinalizeRound` service

**Files:**
- Create: `src/services/rounds/forceFinalizeRound.ts`
- Test: `src/__tests__/services/rounds/forceFinalizeRound.test.ts`

**Interfaces:**
- Consumes: `supabase` from `@/services/supabase/client`; `refinalizeRoundResults` from `@/services/rounds/refinalizeRoundResults`.
- Produces:
  - `forceFinalizeRound(roundId: string): Promise<void>`
  - `class NoCompletedScorecardsError extends Error` (name = `'NoCompletedScorecardsError'`)

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/services/rounds/forceFinalizeRound.test.ts
import { forceFinalizeRound, NoCompletedScorecardsError } from '@/services/rounds/forceFinalizeRound';
import { supabase } from '@/services/supabase/client';
import * as refinalize from '@/services/rounds/refinalizeRoundResults';

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

/** Build the chainable mock for `from('scorecards').select(...).eq(...)`. */
function mockScorecards(rows: { status: string }[]) {
  const eq = jest.fn().mockResolvedValue({ data: rows, error: null });
  return { select: jest.fn().mockReturnValue({ eq }) };
}

/** Build the chainable mock for `from('rounds').update(...).eq(...).select(...)`. */
function mockRoundsUpdate(result: { data: unknown[] | null; error: unknown }) {
  const select = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ select });
  const update = jest.fn().mockReturnValue({ eq });
  return { update, _update: update, _eq: eq };
}

describe('forceFinalizeRound', () => {
  afterEach(() => jest.restoreAllMocks());

  it('throws NoCompletedScorecardsError when no terminal scorecards exist', async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'scorecards') return mockScorecards([{ status: 'in-progress' }]);
      throw new Error(`unexpected table ${table}`);
    });
    const refSpy = jest.spyOn(refinalize, 'refinalizeRoundResults').mockResolvedValue(undefined);

    await expect(forceFinalizeRound('round-1')).rejects.toBeInstanceOf(NoCompletedScorecardsError);
    expect(refSpy).not.toHaveBeenCalled();
  });

  it('flips status to completed and re-finalizes when at least one card is terminal', async () => {
    const rounds = mockRoundsUpdate({ data: [{ id: 'round-1', status: 'completed' }], error: null });
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'scorecards') return mockScorecards([{ status: 'completed' }, { status: 'in-progress' }]);
      if (table === 'rounds') return rounds;
      throw new Error(`unexpected table ${table}`);
    });
    const refSpy = jest.spyOn(refinalize, 'refinalizeRoundResults').mockResolvedValue(undefined);

    await forceFinalizeRound('round-1');

    expect(rounds._update).toHaveBeenCalledWith({ status: 'completed' });
    expect(rounds._eq).toHaveBeenCalledWith('id', 'round-1');
    expect(refSpy).toHaveBeenCalledWith('round-1');
  });

  it('throws when the update affects 0 rows (RLS)', async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'scorecards') return mockScorecards([{ status: 'confirmed' }]);
      if (table === 'rounds') return mockRoundsUpdate({ data: [], error: null });
      throw new Error(`unexpected table ${table}`);
    });
    jest.spyOn(refinalize, 'refinalizeRoundResults').mockResolvedValue(undefined);

    await expect(forceFinalizeRound('round-1')).rejects.toThrow(/0 rows/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/__tests__/services/rounds/forceFinalizeRound.test.ts`
Expected: FAIL — cannot find module `@/services/rounds/forceFinalizeRound`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/services/rounds/forceFinalizeRound.ts
/**
 * forceFinalizeRound
 *
 * Organiser override: marks a competition round `completed` even when some
 * players' scorecards are not terminal. The normal gate (finalizeRoundStatus)
 * refuses until every card is terminal; this bypasses it.
 *
 * Incomplete players are NOT special-cased: refinalizeRoundResults only reads
 * `completed` scorecards, so players who never finished simply get no result
 * row (they surface as "Did Not Finish" on the leaderboard, with no position
 * or points). Their partial scorecards are left untouched, so a later re-open
 * + re-finalize can bring them back into the standings.
 *
 * Guard: requires at least one terminal (completed/confirmed) scorecard — there
 * is nothing meaningful to finalize otherwise.
 */
import { supabase } from '@/services/supabase/client';
import { refinalizeRoundResults } from '@/services/rounds/refinalizeRoundResults';
import { submitLogger } from '@/utils/debugLogger';

const TERMINAL = new Set(['completed', 'confirmed']);

/** Thrown when a force-submit is attempted with zero terminal scorecards. */
export class NoCompletedScorecardsError extends Error {
  constructor() {
    super('At least one player needs a completed scorecard before you can submit this round.');
    this.name = 'NoCompletedScorecardsError';
  }
}

export async function forceFinalizeRound(roundId: string): Promise<void> {
  // Guard: at least one terminal scorecard.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
  const { data: cardRows } = await (supabase as any)
    .from('scorecards')
    .select('status')
    .eq('round_id', roundId);
  const cards: { status: string }[] = cardRows ?? [];
  const terminalCount = cards.filter((c) => TERMINAL.has(c.status)).length;
  if (terminalCount === 0) {
    throw new NoCompletedScorecardsError();
  }

  // Bypass the all-terminal gate and mark the round completed directly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
  const { data: updatedRows, error } = await (supabase as any)
    .from('rounds')
    .update({ status: 'completed' })
    .eq('id', roundId)
    .select('id, status');

  if (error) {
    submitLogger.error('forceFinalizeRound: failed to update status', error, {
      roundId: roundId.substring(0, 8) + '...',
    });
    throw error;
  }
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error(
      `Force-submit affected 0 rows for round ${roundId.substring(0, 8)}. Possible RLS policy issue.`
    );
  }

  // Compute results from completed scorecards only → incomplete players excluded.
  await refinalizeRoundResults(roundId);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/__tests__/services/rounds/forceFinalizeRound.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/rounds/forceFinalizeRound.ts src/__tests__/services/rounds/forceFinalizeRound.test.ts
git commit -m "feat(rounds): forceFinalizeRound service (organiser bypass-gate finalize)"
```

---

### Task 2: `reopenRound` service

**Files:**
- Create: `src/services/rounds/reopenRound.ts`
- Test: `src/__tests__/services/rounds/reopenRound.test.ts`

**Interfaces:**
- Consumes: `supabase` from `@/services/supabase/client`.
- Produces: `reopenRound(roundId: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/services/rounds/reopenRound.test.ts
import { reopenRound } from '@/services/rounds/reopenRound';
import { supabase } from '@/services/supabase/client';

jest.mock('@/services/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

function mockRoundsUpdate(result: { data: unknown[] | null; error: unknown }) {
  const select = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ select });
  const update = jest.fn().mockReturnValue({ eq });
  return { update, _update: update, _eq: eq };
}

describe('reopenRound', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sets status to in-progress', async () => {
    const rounds = mockRoundsUpdate({ data: [{ id: 'r1', status: 'in-progress' }], error: null });
    (supabase.from as jest.Mock).mockReturnValue(rounds);

    await reopenRound('r1');

    expect(supabase.from).toHaveBeenCalledWith('rounds');
    expect(rounds._update).toHaveBeenCalledWith({ status: 'in-progress' });
    expect(rounds._eq).toHaveBeenCalledWith('id', 'r1');
  });

  it('throws when 0 rows are affected (RLS)', async () => {
    (supabase.from as jest.Mock).mockReturnValue(mockRoundsUpdate({ data: [], error: null }));
    await expect(reopenRound('r1')).rejects.toThrow(/0 rows/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/__tests__/services/rounds/reopenRound.test.ts`
Expected: FAIL — cannot find module `@/services/rounds/reopenRound`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/services/rounds/reopenRound.ts
/**
 * reopenRound
 *
 * Organiser action: flips a `completed` competition round back to
 * `in-progress` so an incomplete (DNF) player can finish and the round can be
 * re-finalized. The status-sync trigger cascades the parent competition's
 * status back to in-progress automatically.
 *
 * Existing `round_results` rows are left in place; they are harmlessly replaced
 * (delete-then-insert) on the next finalize / "Recalculate Results".
 */
import { supabase } from '@/services/supabase/client';
import { submitLogger } from '@/utils/debugLogger';

export async function reopenRound(roundId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated-types workaround
  const { data: updatedRows, error } = await (supabase as any)
    .from('rounds')
    .update({ status: 'in-progress' })
    .eq('id', roundId)
    .select('id, status');

  if (error) {
    submitLogger.error('reopenRound: failed to update status', error, {
      roundId: roundId.substring(0, 8) + '...',
    });
    throw error;
  }
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error(
      `Re-open affected 0 rows for round ${roundId.substring(0, 8)}. Possible RLS policy issue.`
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/__tests__/services/rounds/reopenRound.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/rounds/reopenRound.ts src/__tests__/services/rounds/reopenRound.test.ts
git commit -m "feat(rounds): reopenRound service (organiser re-open completed round)"
```

---

### Task 3: Mutation hooks `useForceFinalizeRound` + `useReopenRound`

**Files:**
- Modify: `src/hooks/rounds/mutations.ts` (add imports near line 23; add hooks at end of file)
- Modify: `src/hooks/rounds/index.ts` (barrel export, alongside the existing `from './mutations'` block, ~lines 72-79)
- Test: `src/__tests__/hooks/rounds/useForceFinalizeRound.test.tsx`

**Interfaces:**
- Consumes: `forceFinalizeRound` (Task 1), `reopenRound` (Task 2); query key factories `roundKeys`, `leaderboardKeys`, `competitionKeys`, `competitionDetailsKeys` (already imported in mutations.ts).
- Produces:
  - `interface ForceFinalizeRoundInput { roundId: string; competitionId?: string }`
  - `useForceFinalizeRound()` → mutation over `ForceFinalizeRoundInput`
  - `useReopenRound()` → mutation over `ForceFinalizeRoundInput` (same shape)

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/hooks/rounds/useForceFinalizeRound.test.tsx
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useForceFinalizeRound, useReopenRound } from '@/hooks/rounds/mutations';
import * as forceSvc from '@/services/rounds/forceFinalizeRound';
import * as reopenSvc from '@/services/rounds/reopenRound';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useForceFinalizeRound / useReopenRound', () => {
  afterEach(() => jest.restoreAllMocks());

  it('calls forceFinalizeRound with the roundId', async () => {
    const spy = jest.spyOn(forceSvc, 'forceFinalizeRound').mockResolvedValue(undefined);
    const { result } = renderHook(() => useForceFinalizeRound(), { wrapper });

    await result.current.mutateAsync({ roundId: 'round-1', competitionId: 'comp-1' });

    await waitFor(() => expect(spy).toHaveBeenCalledWith('round-1'));
  });

  it('calls reopenRound with the roundId', async () => {
    const spy = jest.spyOn(reopenSvc, 'reopenRound').mockResolvedValue(undefined);
    const { result } = renderHook(() => useReopenRound(), { wrapper });

    await result.current.mutateAsync({ roundId: 'round-2', competitionId: 'comp-1' });

    await waitFor(() => expect(spy).toHaveBeenCalledWith('round-2'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/__tests__/hooks/rounds/useForceFinalizeRound.test.tsx`
Expected: FAIL — `useForceFinalizeRound` / `useReopenRound` are not exported.

- [ ] **Step 3: Write minimal implementation**

Add imports to `src/hooks/rounds/mutations.ts` (next to the existing `refinalizeRoundResults` import at line 23):

```ts
import { forceFinalizeRound } from '@/services/rounds/forceFinalizeRound';
import { reopenRound } from '@/services/rounds/reopenRound';
```

Append to the end of `src/hooks/rounds/mutations.ts`:

```ts
// =====================================================
// FORCE-FINALIZE / RE-OPEN ROUND (ORGANISER)
// =====================================================

export interface ForceFinalizeRoundInput {
  roundId: string;
  /** Competition ID for cache invalidation. */
  competitionId?: string;
}

/** Shared cache invalidation for force-finalize / re-open. */
function invalidateRoundStatusCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  input: ForceFinalizeRoundInput
) {
  queryClient.invalidateQueries({ queryKey: roundKeys.detail(input.roundId) });
  queryClient.invalidateQueries({ queryKey: roundKeys.lists() });
  queryClient.invalidateQueries({ queryKey: leaderboardKeys.round(input.roundId) });
  if (input.competitionId) {
    queryClient.invalidateQueries({ queryKey: roundKeys.list(input.competitionId) });
    queryClient.invalidateQueries({ queryKey: leaderboardKeys.competition(input.competitionId) });
    queryClient.invalidateQueries({ queryKey: competitionKeys.detail(input.competitionId) });
    queryClient.invalidateQueries({ queryKey: competitionDetailsKeys.detail(input.competitionId) });
  }
}

/**
 * Organiser force-submit: mark the round completed regardless of incomplete
 * players, then re-finalize results (incomplete players become DNF).
 */
export function useForceFinalizeRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ForceFinalizeRoundInput) => {
      await forceFinalizeRound(input.roundId);
    },
    onSuccess: (_, input) => invalidateRoundStatusCaches(queryClient, input),
    onError: (error) => console.error('[useForceFinalizeRound] Failed:', error),
  });
}

/**
 * Organiser re-open: flip a completed round back to in-progress so a DNF
 * player can finish. Re-finalize happens via normal submission or the
 * existing Recalculate Results action.
 */
export function useReopenRound() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ForceFinalizeRoundInput) => {
      await reopenRound(input.roundId);
    },
    onSuccess: (_, input) => invalidateRoundStatusCaches(queryClient, input),
    onError: (error) => console.error('[useReopenRound] Failed:', error),
  });
}
```

Add to the barrel `src/hooks/rounds/index.ts` (extend the existing export block that lists `useRecalculateRoundResults` etc.):

```ts
export {
  useDeleteRound,
  useUpdatePlayerTee,
  useRecalculateRoundResults,
  useUpdateRoundRules,
  useForceSyncRoundScorecards,
  useForceFinalizeRound,
  useReopenRound,
} from './mutations';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/__tests__/hooks/rounds/useForceFinalizeRound.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/rounds/mutations.ts src/hooks/rounds/index.ts src/__tests__/hooks/rounds/useForceFinalizeRound.test.tsx
git commit -m "feat(rounds): useForceFinalizeRound + useReopenRound mutation hooks"
```

---

### Task 4: Leaderboard `dnfEntries` derivation

**Files:**
- Modify: `src/hooks/rounds/leaderboard.ts` (response type ~lines 72-86; scorecards fetch ~lines 187-201; return object ~lines 244-250)
- Test: `src/__tests__/hooks/rounds/roundLeaderboardDnf.test.ts`

**Interfaces:**
- Produces:
  - `interface DnfEntry { playerId: string; playerName: string }`
  - `RoundLeaderboardResponse.dnfEntries: DnfEntry[]`
  - exported pure helper `computeDnfEntries(scorecards, results): DnfEntry[]` (exported for unit testing)

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/hooks/rounds/roundLeaderboardDnf.test.ts
import { computeDnfEntries } from '@/hooks/rounds/leaderboard';

describe('computeDnfEntries', () => {
  it('returns roster players with a non-terminal card and no result row', () => {
    const scorecards = [
      { player_id: 'p1', status: 'completed', players: { name: 'Alice' } },
      { player_id: 'p2', status: 'in-progress', players: { name: 'Bob' } },
      { player_id: 'p3', status: 'not-started', players: { name: 'Cara' } },
    ];
    const results = [
      { player_id: 'p1', is_team_result: false, teams: null },
    ];

    const dnf = computeDnfEntries(scorecards as never, results as never);

    expect(dnf).toEqual([
      { playerId: 'p2', playerName: 'Bob' },
      { playerId: 'p3', playerName: 'Cara' },
    ]);
  });

  it('excludes players covered by a team result row', () => {
    const scorecards = [
      { player_id: 'p2', status: 'in-progress', players: { name: 'Bob' } },
    ];
    const results = [
      { player_id: null, is_team_result: true, teams: { team_members: [{ player_id: 'p2' }] } },
    ];

    expect(computeDnfEntries(scorecards as never, results as never)).toEqual([]);
  });

  it('returns empty when every player has a terminal card', () => {
    const scorecards = [
      { player_id: 'p1', status: 'completed', players: { name: 'Alice' } },
      { player_id: 'p2', status: 'confirmed', players: { name: 'Bob' } },
    ];
    expect(computeDnfEntries(scorecards as never, [] as never)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/__tests__/hooks/rounds/roundLeaderboardDnf.test.ts`
Expected: FAIL — `computeDnfEntries` is not exported.

- [ ] **Step 3: Write minimal implementation**

In `src/hooks/rounds/leaderboard.ts`:

a) Add the type + helper near the top-level types (after `RoundMetadata`):

```ts
/** A roster player who did not finish (no position / no points). */
export interface DnfEntry {
  playerId: string;
  playerName: string;
}

const TERMINAL_CARD = new Set(['completed', 'confirmed']);

/** Minimal scorecard shape needed to derive DNF (player + status + name). */
interface DnfScorecard {
  player_id: string | null;
  status: string | null;
  players: { name: string } | null;
}

/** Minimal result-row shape needed to know which players already have a result. */
interface DnfResultRow {
  player_id: string | null;
  is_team_result: boolean | null;
  teams: { team_members?: { player_id: string }[] } | null;
}

/**
 * DNF = a roster player (has a scorecard) whose card is NOT terminal and who
 * has no individual result row and is not covered by a team result row.
 * Exported for unit testing.
 */
export function computeDnfEntries(
  scorecards: DnfScorecard[],
  results: DnfResultRow[]
): DnfEntry[] {
  const covered = new Set<string>();
  for (const r of results) {
    if (r.player_id) covered.add(r.player_id);
    const members = r.teams?.team_members;
    if (Array.isArray(members)) {
      for (const m of members) if (m.player_id) covered.add(m.player_id);
    }
  }

  const dnf: DnfEntry[] = [];
  const seen = new Set<string>();
  for (const sc of scorecards) {
    if (!sc.player_id) continue;
    if (TERMINAL_CARD.has(sc.status ?? '')) continue;
    if (covered.has(sc.player_id)) continue;
    if (seen.has(sc.player_id)) continue;
    seen.add(sc.player_id);
    dnf.push({ playerId: sc.player_id, playerName: sc.players?.name ?? 'Unknown player' });
  }
  return dnf;
}
```

b) Add `dnfEntries` to the response interface (`RoundLeaderboardResponse`):

```ts
  /** Roster players who did not finish — shown separately, no position/points. */
  dnfEntries: DnfEntry[];
```

c) Extend the existing scorecards fetch (currently selects `player_id, bypassed`) to also pull `status` and the player name:

```ts
  // Fetch scorecards separately for bypass status AND DNF derivation.
  const { data: scorecards } = await supabase
    .from('scorecards')
    .select('player_id, bypassed, status, players!player_id ( name )')
    .eq('round_id', roundId);
```

d) After `bypassMap` is built and `typedResults` exists, derive DNF and add to the return object:

```ts
  const dnfEntries = computeDnfEntries(
    (scorecards ?? []) as unknown as DnfScorecard[],
    (results ?? []) as unknown as DnfResultRow[]
  );
```

```ts
  return {
    entries: sortedEntries,
    teamEntries,
    individualEntries,
    dnfEntries,
    metadata,
  };
```

> Note: the `bypassMap` builder iterates `scorecards` casting each row to `{ player_id; bypassed }`. Widen that local cast to include `status` and `players` (or read `sc.player_id`/`sc.bypassed` as before — extra fields are harmless). Ensure `pnpm type-check` passes.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/__tests__/hooks/rounds/roundLeaderboardDnf.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/rounds/leaderboard.ts src/__tests__/hooks/rounds/roundLeaderboardDnf.test.ts
git commit -m "feat(leaderboard): derive dnfEntries (roster minus result rows)"
```

---

### Task 5: Render the "Did Not Finish" section

**Files:**
- Modify: `src/components/leaderboard/RoundLeaderboard.tsx` (render block ~lines 248-309)
- Test: `src/__tests__/components/RoundLeaderboardDnf.test.tsx`

**Interfaces:**
- Consumes: `data.dnfEntries` and `data.metadata.status` from `useRoundLeaderboard`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/components/RoundLeaderboardDnf.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { RoundLeaderboard } from '@/components/leaderboard/RoundLeaderboard';
import * as lb from '@/hooks/useRoundLeaderboard';

jest.mock('@/hooks/useRoundLeaderboard');

const baseMeta = {
  gameType: 'stableford', isTeamRound: false, teamFormat: null, roundFormat: 'individual',
  subMatchSize: null, rulesOverride: null, roundId: 'r1', roundNumber: 1, status: 'completed',
};

function mockData(over: Partial<ReturnType<typeof makeData>> = {}) {
  return makeData(over);
}
function makeData(over: object) {
  return {
    entries: [{ playerId: 'p1', isTeamResult: false, bypassed: false, scoreData: { type: 'stableford', totalPoints: 30 } }],
    teamEntries: [],
    individualEntries: [{ playerId: 'p1', isTeamResult: false, bypassed: false, scoreData: { type: 'stableford', totalPoints: 30 } }],
    dnfEntries: [{ playerId: 'p2', playerName: 'Bob' }],
    metadata: baseMeta,
    ...over,
  };
}

describe('RoundLeaderboard DNF section', () => {
  afterEach(() => jest.restoreAllMocks());

  it('renders DNF names when round is completed and dnfEntries exist', () => {
    (lb.useRoundLeaderboard as jest.Mock).mockReturnValue({
      data: mockData(), isLoading: false, isError: false, error: null, refetch: jest.fn(),
    });
    const { getByText } = render(
      <RoundLeaderboard roundId="r1" gameType="stableford" isTeamRound={false} testID="lb" />
    );
    expect(getByText('Did Not Finish')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
  });

  it('does NOT render the DNF section while the round is in-progress', () => {
    (lb.useRoundLeaderboard as jest.Mock).mockReturnValue({
      data: mockData({ metadata: { ...baseMeta, status: 'in-progress' } }),
      isLoading: false, isError: false, error: null, refetch: jest.fn(),
    });
    const { queryByText } = render(
      <RoundLeaderboard roundId="r1" gameType="stableford" isTeamRound={false} testID="lb" />
    );
    expect(queryByText('Did Not Finish')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/__tests__/components/RoundLeaderboardDnf.test.tsx`
Expected: FAIL — "Did Not Finish" text not found.

- [ ] **Step 3: Write minimal implementation**

In `RoundLeaderboard.tsx`, compute a render flag (place with the other `useMemo`s, before early returns):

```tsx
  // DNF section: only on completed rounds, only when there are unfinished
  // players, and not in the team-only filtered view (DNF is individual).
  const dnfEntries = data?.dnfEntries ?? [];
  const showDnf =
    !!data &&
    data.metadata.status === 'completed' &&
    filterView !== 'team' &&
    dnfEntries.length > 0;
```

Add the section just before the closing `</View>` of the main `return` (after the bypassed legend block):

```tsx
      {/* Did Not Finish — roster players with no result row. No position/points. */}
      {showDnf && (
        <View style={[styles.card, { backgroundColor: colors.surface }, dnfStyles.section]}>
          <ScaledText category="caption" style={[dnfStyles.label, { color: colors.textSecondary }]}>
            Did Not Finish
          </ScaledText>
          {dnfEntries.map((d) => (
            <View key={d.playerId} style={dnfStyles.row}>
              <IconAlertTriangle size={16} color={colors.textTertiary} />
              <ScaledText category="body" style={[dnfStyles.name, { color: colors.textPrimary }]}>
                {d.playerName}
              </ScaledText>
            </View>
          ))}
          <ScaledText category="caption" style={[dnfStyles.hint, { color: colors.textTertiary }]}>
            No position or points — round submitted before they finished.
          </ScaledText>
        </View>
      )}
```

Add local styles near `legendStyles`:

```tsx
const dnfStyles = StyleSheet.create({
  section: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  name: {
    ...typography.body,
  },
  hint: {
    ...typography.caption,
    paddingTop: spacing.sm,
  },
});
```

(`IconAlertTriangle`, `ScaledText`, `spacing`, `typography`, `StyleSheet` are already imported in this file.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/__tests__/components/RoundLeaderboardDnf.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/leaderboard/RoundLeaderboard.tsx src/__tests__/components/RoundLeaderboardDnf.test.tsx
git commit -m "feat(leaderboard): render Did Not Finish section on completed rounds"
```

---

### Task 6: `ForceSubmitRoundDialog` component

**Files:**
- Create: `src/components/rounds/ForceSubmitRoundDialog.tsx`
- Test: `src/__tests__/components/ForceSubmitRoundDialog.test.tsx`

**Interfaces:**
- Consumes: `useRoundPlayers`, `useRoundScorecards` from `@/hooks/useRoundDetails`; `useThemeColors`.
- Produces:
  - `interface ForceSubmitRoundDialogProps { visible: boolean; roundId: string; loading?: boolean; onConfirm: () => void; onCancel: () => void }`
  - default export `ForceSubmitRoundDialog`
  - exported pure helper `getIncompletePlayers(roundPlayers, scorecards): { playerId: string; playerName: string; holesPlayed: number }[]`

The dialog fetches the roster itself (so both entry points stay light). It lists incomplete players who will be marked DNF, then confirms.

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/components/ForceSubmitRoundDialog.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ForceSubmitRoundDialog, { getIncompletePlayers } from '@/components/rounds/ForceSubmitRoundDialog';
import * as rd from '@/hooks/useRoundDetails';

jest.mock('@/hooks/useRoundDetails');

describe('getIncompletePlayers', () => {
  it('returns roster players whose card is missing or non-terminal, with holes played', () => {
    const roundPlayers = [
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Cara' },
    ];
    const scorecards = [
      { player_id: 'p1', status: 'completed', scores: { '1': {}, '2': {} } },
      { player_id: 'p2', status: 'in-progress', scores: { '1': {}, '2': {}, '3': {} } },
      // p3 has no scorecard
    ];
    expect(getIncompletePlayers(roundPlayers as never, scorecards as never)).toEqual([
      { playerId: 'p2', playerName: 'Bob', holesPlayed: 3 },
      { playerId: 'p3', playerName: 'Cara', holesPlayed: 0 },
    ]);
  });
});

describe('ForceSubmitRoundDialog', () => {
  afterEach(() => jest.restoreAllMocks());

  function mockHooks() {
    (rd.useRoundPlayers as jest.Mock).mockReturnValue({
      data: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
    });
    (rd.useRoundScorecards as jest.Mock).mockReturnValue({
      data: [{ player_id: 'p1', status: 'completed', scores: { '1': {} } }],
    });
  }

  it('lists incomplete players and fires onConfirm', () => {
    mockHooks();
    const onConfirm = jest.fn();
    const { getByText } = render(
      <ForceSubmitRoundDialog visible roundId="r1" onConfirm={onConfirm} onCancel={jest.fn()} />
    );
    expect(getByText('Bob')).toBeTruthy();
    fireEvent.press(getByText('Submit Round'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('fires onCancel', () => {
    mockHooks();
    const onCancel = jest.fn();
    const { getByText } = render(
      <ForceSubmitRoundDialog visible roundId="r1" onConfirm={jest.fn()} onCancel={onCancel} />
    );
    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm jest src/__tests__/components/ForceSubmitRoundDialog.test.tsx`
Expected: FAIL — cannot find module `@/components/rounds/ForceSubmitRoundDialog`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/rounds/ForceSubmitRoundDialog.tsx
/**
 * ForceSubmitRoundDialog
 *
 * Organiser confirmation for force-submitting a round while some players are
 * incomplete. Lists the players who will be marked DNF (no position/points),
 * then confirms. Fetches the roster itself so callers only manage visibility
 * and the mutation.
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, Modal, ScrollView, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { GolfBallLoader } from '@/components/common/GolfBallLoader';
import { useThemeColors } from '@/context/ThemeContext';
import { useRoundPlayers, useRoundScorecards } from '@/hooks/useRoundDetails';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

const TERMINAL = new Set(['completed', 'confirmed']);

interface RosterPlayer { id: string; name: string }
interface ScorecardRow { player_id: string; status: string; scores?: Record<string, unknown> | null }
export interface IncompletePlayer { playerId: string; playerName: string; holesPlayed: number }

/** Roster players with a missing or non-terminal scorecard. Exported for testing. */
export function getIncompletePlayers(
  roundPlayers: RosterPlayer[],
  scorecards: ScorecardRow[]
): IncompletePlayer[] {
  const byPlayer = new Map(scorecards.map((sc) => [sc.player_id, sc]));
  const out: IncompletePlayer[] = [];
  for (const p of roundPlayers) {
    const sc = byPlayer.get(p.id);
    const terminal = sc ? TERMINAL.has(sc.status) : false;
    if (terminal) continue;
    out.push({
      playerId: p.id,
      playerName: p.name,
      holesPlayed: sc?.scores ? Object.keys(sc.scores).length : 0,
    });
  }
  return out;
}

export interface ForceSubmitRoundDialogProps {
  visible: boolean;
  roundId: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ForceSubmitRoundDialog({
  visible,
  roundId,
  loading = false,
  onConfirm,
  onCancel,
}: ForceSubmitRoundDialogProps) {
  const colors = useThemeColors();
  const { data: roundPlayers } = useRoundPlayers(roundId);
  const { data: scorecards } = useRoundScorecards(roundId);

  const incomplete = useMemo(
    () => getIncompletePlayers(
      (roundPlayers ?? []) as unknown as RosterPlayer[],
      (scorecards ?? []) as unknown as ScorecardRow[]
    ),
    [roundPlayers, scorecards]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.surfaceElevated }, shadows.lg]}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Submit round now?</Text>

              {incomplete.length === 0 ? (
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                  All players have finished. This will finalize the round.
                </Text>
              ) : (
                <>
                  <Text style={[styles.message, { color: colors.textSecondary }]}>
                    These players haven&apos;t finished. They&apos;ll be marked Did Not Finish — no
                    position or points for this round:
                  </Text>
                  <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                    {incomplete.map((p) => (
                      <View key={p.playerId} style={styles.row}>
                        <Icon source="account-alert-outline" size={18} color={colors.warning} />
                        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                          {p.playerName}
                        </Text>
                        <Text style={[styles.holes, { color: colors.textSecondary }]}>
                          {p.holesPlayed} {p.holesPlayed === 1 ? 'hole' : 'holes'}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </>
              )}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.surfaceVariant, borderWidth: 1, borderColor: colors.borderStrong }]}
                  onPress={onCancel}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
                  onPress={onConfirm}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Submit Round"
                >
                  {loading ? (
                    <GolfBallLoader size="sm" />
                  ) : (
                    <Text style={[styles.buttonText, { color: colors.textOnColored }]}>Submit Round</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  container: { width: '100%', maxWidth: 360, borderRadius: borderRadius.xl, padding: spacing.xl },
  title: { ...typography.h3, textAlign: 'center', marginBottom: spacing.sm },
  message: { ...typography.body, textAlign: 'center', marginBottom: spacing.md, lineHeight: 22 },
  list: { maxHeight: 200, alignSelf: 'stretch', marginBottom: spacing.md },
  listContent: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  name: { ...typography.body, flex: 1 },
  holes: { ...typography.caption },
  actions: { flexDirection: 'row', gap: spacing.md, width: '100%' },
  button: { flex: 1, height: 48, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { ...typography.bodyBold },
});
```

> If `useRoundPlayers` / `useRoundScorecards` are not re-exported from `@/hooks/useRoundDetails`, import them from wherever `RoundSettingsScreen.tsx` imports them (that screen imports both from `@/hooks/useRoundDetails`). Keep the import path identical to that screen so the jest mock (`jest.mock('@/hooks/useRoundDetails')`) matches.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm jest src/__tests__/components/ForceSubmitRoundDialog.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/rounds/ForceSubmitRoundDialog.tsx src/__tests__/components/ForceSubmitRoundDialog.test.tsx
git commit -m "feat(rounds): ForceSubmitRoundDialog listing players to be marked DNF"
```

---

### Task 7: Wire Submit-now + Re-open into Round Settings

**Files:**
- Modify: `src/screens/rounds/RoundSettingsScreen.tsx`
- Test: none new (covered by service/hook/component tests). Manual verification via `pnpm type-check`.

**Interfaces:**
- Consumes: `useForceFinalizeRound`, `useReopenRound` (Task 3); `ForceSubmitRoundDialog` (Task 6); existing `ConfirmationDialog`, `isOrganizer`, `round.status`.

This adds: (a) a "Submit Round" organiser section shown while `round.status === 'in-progress'`; (b) a "Re-open Round" button inside the existing completed-round Scoring section.

- [ ] **Step 1: Add imports + mutation hooks + dialog state**

Add to the round mutation hook import line (currently `import { useRecalculateRoundResults, useForceSyncRoundScorecards } from '@/hooks/rounds';`):

```tsx
import {
  useRecalculateRoundResults,
  useForceSyncRoundScorecards,
  useForceFinalizeRound,
  useReopenRound,
} from '@/hooks/rounds';
import ForceSubmitRoundDialog from '@/components/rounds/ForceSubmitRoundDialog';
import { NoCompletedScorecardsError } from '@/services/rounds/forceFinalizeRound';
```

Add near the other mutation hooks (after `useForceSyncRoundScorecards`):

```tsx
  const { mutate: forceFinalize, isPending: isForceSubmitting } = useForceFinalizeRound();
  const { mutate: reopen, isPending: isReopening } = useReopenRound();
```

Add to local state (with the other `useState`s):

```tsx
  const [showForceSubmitDialog, setShowForceSubmitDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
```

Add a split-round guard near the other permission memos (split rounds use the forfeit flow, not force-submit):

```tsx
  const isSplitRound = (round?.sub_match_size ?? 0) > 0;
  const canForceSubmit = isOrganizer && !isStandalone && round?.status === 'in-progress' && !isSplitRound;
  const canReopen = isOrganizer && !isStandalone && round?.status === 'completed';
```

- [ ] **Step 2: Add handlers**

Add near `handleRecalculateResults`:

```tsx
  const handleForceSubmitConfirm = useCallback(() => {
    forceFinalize(
      { roundId, competitionId },
      {
        onSuccess: () => {
          setShowForceSubmitDialog(false);
          setShowAlert({
            title: 'Round Submitted',
            message: 'The round has been finalized. Unfinished players were marked Did Not Finish.',
          });
        },
        onError: (error) => {
          setShowForceSubmitDialog(false);
          setShowAlert({
            title: 'Could Not Submit',
            message:
              error instanceof NoCompletedScorecardsError
                ? error.message
                : error instanceof Error
                ? error.message
                : 'Unknown error.',
          });
        },
      }
    );
  }, [forceFinalize, roundId, competitionId]);

  const handleReopenConfirm = useCallback(() => {
    reopen(
      { roundId, competitionId },
      {
        onSuccess: () => {
          setShowReopenDialog(false);
          setShowAlert({
            title: 'Round Re-opened',
            message: 'Players can finish their scorecards. Re-submit or use Recalculate Results when done.',
          });
        },
        onError: (error) => {
          setShowReopenDialog(false);
          setShowAlert({
            title: 'Could Not Re-open',
            message: error instanceof Error ? error.message : 'Unknown error.',
          });
        },
      }
    );
  }, [reopen, roundId, competitionId]);
```

- [ ] **Step 3: Add the in-progress "Submit Round" section**

Insert before the completed-round Scoring section (the block gated by `isOrganizer && round.status === 'completed'`):

```tsx
        {/* Submit Round — organiser force-submit while the round is in
            progress, even if some players haven't finished (they become DNF). */}
        {canForceSubmit && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.editTeesSection}>
              <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Submit Round</Text>
              <TouchableOpacity
                style={[
                  styles.editTeesButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  isForceSubmitting && { opacity: 0.6 },
                ]}
                onPress={() => setShowForceSubmitDialog(true)}
                disabled={isForceSubmitting}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Submit round now"
              >
                <Icon source="flag-checkered" size={20} color={colors.primary} />
                <Text style={[styles.editTeesButtonText, { color: colors.textPrimary }]}>
                  {isForceSubmitting ? 'Submitting…' : 'Submit Round Now'}
                </Text>
                <Icon source="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.editTeesHint, { color: colors.textSecondary }]}>
                Finalize this round now. Players who haven&apos;t finished will be marked Did Not Finish (no position or points). You can re-open the round later if needed.
              </Text>
            </View>
          </>
        )}
```

- [ ] **Step 4: Add the "Re-open Round" button**

Inside the existing completed-round Scoring `<View style={styles.editTeesSection}>`, after the Force Sync button block, add:

```tsx
              {/* Re-open Round — flip back to in-progress so a DNF player can
                  finish. Competition status reverts automatically. */}
              <TouchableOpacity
                style={[
                  styles.editTeesButton,
                  { borderColor: colors.border, backgroundColor: colors.surface, marginTop: spacing.md },
                  isReopening && { opacity: 0.6 },
                ]}
                onPress={() => setShowReopenDialog(true)}
                disabled={isReopening}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Re-open round"
              >
                <Icon source="lock-open-variant-outline" size={20} color={colors.primary} />
                <Text style={[styles.editTeesButtonText, { color: colors.textPrimary }]}>
                  {isReopening ? 'Re-opening…' : 'Re-open Round'}
                </Text>
                <Icon source="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.editTeesHint, { color: colors.textSecondary }]}>
                Sets the round back to in progress so players can finish. Re-submit or use Recalculate Results afterwards.
              </Text>
```

> The completed-round Scoring section currently renders for any completed round when `isOrganizer`. `canReopen` is equivalent there (organiser + completed) except it also excludes standalone rounds; guard the button with `{canReopen && ( ... )}` so standalone completed rounds don't show Re-open.

- [ ] **Step 5: Mount the dialogs**

Add near the other dialogs at the bottom of the screen (after the Alert `ConfirmationDialog`):

```tsx
      {/* Force-submit confirmation (lists DNF players) */}
      <ForceSubmitRoundDialog
        visible={showForceSubmitDialog}
        roundId={roundId}
        loading={isForceSubmitting}
        onConfirm={handleForceSubmitConfirm}
        onCancel={() => setShowForceSubmitDialog(false)}
      />

      {/* Re-open confirmation */}
      <ConfirmationDialog
        visible={showReopenDialog}
        title="Re-open Round"
        message="This sets the round back to in progress so players can finish their scorecards. The competition status will update automatically."
        confirmLabel="Re-open"
        onConfirm={handleReopenConfirm}
        onCancel={() => setShowReopenDialog(false)}
        loading={isReopening}
        icon="lock-open-variant-outline"
      />
```

- [ ] **Step 6: Verify types and run the related suites**

Run: `pnpm type-check`
Expected: no new errors in `RoundSettingsScreen.tsx`.

Run: `pnpm jest src/__tests__/components/ForceSubmitRoundDialog.test.tsx src/__tests__/hooks/rounds/useForceFinalizeRound.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/screens/rounds/RoundSettingsScreen.tsx
git commit -m "feat(rounds): Submit-now + Re-open actions in Round Settings"
```

---

### Task 8: Organiser "Submit now" button on the in-progress round card

**Files:**
- Modify: `src/components/competitions/detail/CompetitionRoundCard.tsx` (props ~lines 31-57; in-progress actions ~lines 297-356)
- Modify: `src/components/competitions/detail/RoundsTab.tsx` (card render ~lines 254-268; add handler/state/dialog/mutation)
- Test: none new (component behaviour is presentational; logic covered by Tasks 1/3/6). Verify with `pnpm type-check`.

**Interfaces:**
- `CompetitionRoundCard` gains two optional props:
  - `canForceSubmit?: boolean`
  - `onForceSubmit?: (roundId: string) => void`
- `RoundsTab` owns the dialog + `useForceFinalizeRound` and passes them down.

- [ ] **Step 1: Add props to CompetitionRoundCard**

In `CompetitionRoundCardProps`:

```tsx
  /** Organiser can force-submit this (in-progress, non-split) round. */
  canForceSubmit?: boolean;
  /** Open the force-submit confirmation for this round. */
  onForceSubmit?: (roundId: string) => void;
```

Destructure them in the component signature (alongside `onQuickScore` etc.):

```tsx
  canForceSubmit,
  onForceSubmit,
```

- [ ] **Step 2: Render the button on in-progress cards**

In the non-completed `return` block, after the `<View style={styles.actions}> … </View>` row (still inside the outer card `View`, before its closing tag), add:

```tsx
        {/* Organiser force-submit — finalize now, unfinished players → DNF. */}
        {canForceSubmit && onForceSubmit && (
          <TouchableOpacity
            style={[styles.forceSubmitButton, { borderColor: colors.border }]}
            onPress={() => onForceSubmit(round.id)}
            accessibilityRole="button"
            accessibilityLabel={`Submit round ${roundNumber} now`}
            activeOpacity={0.7}
          >
            <Icon source="flag-checkered" size={18} color={colors.primary} />
            <Text style={[styles.forceSubmitLabel, { color: colors.primary }]}>Submit Round Now</Text>
          </TouchableOpacity>
        )}
```

Add styles to the card's `StyleSheet.create`:

```tsx
  forceSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    height: 44,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
  },
  forceSubmitLabel: {
    ...typography.smallBold,
  },
```

- [ ] **Step 3: Wire RoundsTab**

Add imports:

```tsx
import { useForceFinalizeRound } from '@/hooks/rounds';
import ForceSubmitRoundDialog from '@/components/rounds/ForceSubmitRoundDialog';
import { NoCompletedScorecardsError } from '@/services/rounds/forceFinalizeRound';
```

Add state + mutation inside the component:

```tsx
  const [forceSubmitRoundId, setForceSubmitRoundId] = useState<string | null>(null);
  const { mutate: forceFinalize, isPending: isForceSubmitting } = useForceFinalizeRound();

  const handleForceSubmitConfirm = useCallback(() => {
    if (!forceSubmitRoundId) return;
    forceFinalize(
      { roundId: forceSubmitRoundId, competitionId },
      {
        onSuccess: () => setForceSubmitRoundId(null),
        onError: (error) => {
          setForceSubmitRoundId(null);
          console.error('[RoundsTab] Force-submit failed:', error);
        },
      }
    );
  }, [forceFinalize, forceSubmitRoundId, competitionId]);
```

> Use `competitionId` from RoundsTab's props/context (the explore confirmed RoundsTab has `competitionId`, `isOrganizer`, and per-round `allScoredStatus`). If `competitionId` is not already in scope, derive it the same way the existing `onScoreRound`/`onViewRound` handlers obtain it. Import `useState`/`useCallback` if not already imported.

Pass the new props where `CompetitionRoundCard` is rendered (only enable for in-progress, non-split rounds):

```tsx
            canForceSubmit={
              isOrganizer && round.status === 'in-progress' && (round.sub_match_size ?? 0) === 0
            }
            onForceSubmit={(id) => setForceSubmitRoundId(id)}
```

Render the dialog once, after the rounds list (e.g. next to any existing RoundsTab dialogs):

```tsx
      <ForceSubmitRoundDialog
        visible={!!forceSubmitRoundId}
        roundId={forceSubmitRoundId ?? ''}
        loading={isForceSubmitting}
        onConfirm={handleForceSubmitConfirm}
        onCancel={() => setForceSubmitRoundId(null)}
      />
```

- [ ] **Step 4: Verify types**

Run: `pnpm type-check`
Expected: no new errors in `CompetitionRoundCard.tsx` / `RoundsTab.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/components/competitions/detail/CompetitionRoundCard.tsx src/components/competitions/detail/RoundsTab.tsx
git commit -m "feat(rounds): organiser Submit-now button on in-progress round card"
```

---

## Final verification

- [ ] Run the full new-test set:
  `pnpm jest src/__tests__/services/rounds/forceFinalizeRound.test.ts src/__tests__/services/rounds/reopenRound.test.ts src/__tests__/hooks/rounds/useForceFinalizeRound.test.tsx src/__tests__/hooks/rounds/roundLeaderboardDnf.test.ts src/__tests__/components/RoundLeaderboardDnf.test.tsx src/__tests__/components/ForceSubmitRoundDialog.test.tsx`
  Expected: all PASS.
- [ ] `pnpm type-check` — clean for all touched files.
- [ ] `pnpm lint src/services/rounds/forceFinalizeRound.ts src/services/rounds/reopenRound.ts` (and other touched files) — clean.
- [ ] Manual smoke (on device / simulator), since these aren't covered by unit tests:
  1. As organiser, on an in-progress competition round with one unfinished player, tap **Submit Round Now** (card and Settings). Confirm dialog lists the unfinished player; confirm finalizes; leaderboard shows finishers + a **Did Not Finish** section.
  2. The parent competition status updates appropriately (completes if it was the last round).
  3. As organiser, **Re-open Round** from Settings → round returns to in-progress, competition status reverts; the previously-DNF player can finish and re-finalize restores their standing.
  4. Force-submit with zero completed cards shows the "needs a completed scorecard" message and does not finalize.
  5. Split (sub-match) rounds do **not** show Submit-now.

## Notes / scope reminders

- **Re-open lives in Settings only** (not on the completed card): the completed competition round card is a single tap-to-view target by design, so adding inline actions there would fight that pattern. Force-submit is the primary action and is on both the in-progress card and Settings, satisfying "both entry points".
- No migration. If a queryable/explicit DNF state is needed later, that's a follow-up (spec Approach B).
