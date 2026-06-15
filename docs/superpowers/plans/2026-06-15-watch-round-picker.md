# Watch Round Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Apple Watch show a picker of today's playable rounds (and reliably clear a finished round), where selecting one drives the phone to open that round.

**Architecture:** Extend the single `applicationContext` snapshot the phone already pushes with an `availableRounds` list, and push it **always** — even when no round is active (the empty-`roundId` push is the clear signal). The watch renders a picker from that list when no round is active (or via a "Switch round" action when one is). Tapping a round sends a `selectRound` message back; the phone resolves the entry from its current list and calls `navigate(...)` — in-progress rounds resume their scoring screen, scheduled rounds open `ViewRound` for setup.

**Tech Stack:** TypeScript (React Native, TanStack Query, Zustand), `react-native-watch-connectivity` (WCSession), SwiftUI (watchOS), Jest.

**Spec:** `docs/superpowers/specs/2026-06-15-watch-round-picker-design.md`

---

## File Structure

**TypeScript (phone side):**
- `src/watch/types.ts` — modify: add `WatchAvailableRound`, `availableRounds` on `WatchSnapshot`, `WatchSelectRound`.
- `src/watch/transport.ts` — modify: `isWatchSelectRound` guard, `onSelectRound` on the transport interface + all three implementations, and exclude select-round from the score-write predicate.
- `src/watch/availableRounds.ts` — create: pure `buildAvailableRounds(...)` merge/dedup/order/format.
- `src/watch/selectRoundRoute.ts` — create: pure `routeForSelectedRound(entry)` → navigation intent.
- `src/watch/snapshot.ts` — modify: pass `availableRounds` through `buildWatchSnapshot`.
- `src/watch/useWatchBridge.ts` — modify: feed the round queries, always-push, add the select-round effect + pending-selection retry.
- Tests under `src/watch/__tests__/`: extend `transport.test.ts`, `snapshot.test.ts`; create `availableRounds.test.ts`, `selectRoundRoute.test.ts`.

**Swift (watch side):**
- `ios/TheNineteenthWatch Watch App/WatchSnapshot.swift` — modify: `WatchAvailableRound` struct, optional `availableRounds`, `hasActiveRound` computed.
- `ios/TheNineteenthWatch Watch App/ConnectivityClient.swift` — modify: `selectRound(roundId:)` sender, complication `active` based on `hasActiveRound`.
- `ios/TheNineteenthWatch Watch App/RoundPickerView.swift` — create: the picker UI.
- `ios/TheNineteenthWatch Watch App/TheNineteenthWatchApp.swift` — modify: RootView routing + workout gating on `hasActiveRound`.
- `ios/TheNineteenthWatch Watch App/NowPlayingView.swift` — modify: add "Switch round" entry to the live-round menu.

**Build order:** TS pure units first (Tasks 1–4), then TS wiring (Task 5), then Swift model/transport (Task 6), then Swift UI (Task 7). Each TS task is TDD; Swift tasks are verified by build + on-device per the existing watch convention (`useWatchBridge.ts` has no unit test by design).

---

## Task 1: Transport types + select-round message

**Files:**
- Modify: `src/watch/types.ts`
- Modify: `src/watch/transport.ts`
- Test: `src/watch/__tests__/transport.test.ts`

- [ ] **Step 1: Add the new types to `src/watch/types.ts`**

At the top, extend the import to include `GameType` (used by `WatchAvailableRound`):

```ts
import type {
  HoleScore, FairwayMissDirection, GreenMissDirection, HazardEntry,
} from '@/types/database/base';
import type { GameType, RoundStatus } from '@/types/database/enums';
```

Add this interface immediately above `export interface WatchSnapshot {`:

```ts
/** One round the user can open from the watch picker. `status` decides where the
 *  phone routes: in-progress resumes scoring, upcoming opens ViewRound for setup. */
export interface WatchAvailableRound {
  roundId: string;
  competitionId: string | null;     // null for standalone rounds
  title: string;                    // competition name, else course name, else "Round"
  teeTime: string | null;           // "HH:MM" for display, or null
  status: Extract<RoundStatus, 'in-progress' | 'upcoming'>;
  gameType: GameType;               // routes match-play to its dedicated screen
  isTeamRound: boolean;             // routes team match-play to its dedicated screen
}
```

Add `availableRounds` to `WatchSnapshot` (right after the `leaderboard` field):

```ts
  leaderboard: WatchLeaderboardRow[];
  /** Rounds the user can open from the watch. Present even when no round is
   *  active (empty `roundId`) — that push both clears a finished round and
   *  delivers the picker list. */
  availableRounds: WatchAvailableRound[];
```

Add the inbound message type at the end of the file, after `WatchNavigate`:

```ts
/** Watch → phone: open the chosen round. Carries only the id; the phone resolves
 *  the full entry from the snapshot it last sent and routes accordingly. */
export interface WatchSelectRound {
  type: 'selectRound';
  roundId: string;
}
```

- [ ] **Step 2: Add the guard, interface method, and wiring to `src/watch/transport.ts`**

Update the import:

```ts
import type { WatchSnapshot, WatchScoreWrite, WatchAck, WatchNavigate, WatchSelectRound } from './types';
```

Add the guard next to `isWatchNavigate`:

```ts
export function isWatchSelectRound(msg: unknown): msg is WatchSelectRound {
  return (
    typeof msg === 'object' && msg !== null &&
    (msg as { type?: unknown }).type === 'selectRound' &&
    typeof (msg as { roundId?: unknown }).roundId === 'string'
  );
}
```

Add to the `WatchTransport` interface (after `onNavigate`):

```ts
  onSelectRound(handler: (sel: WatchSelectRound) => void): () => void;
```

Add to `createNullTransport`'s returned object (after `onNavigate: () => () => {},`):

```ts
    onSelectRound: () => () => {},
```

In `createWatchConnectivityTransport`, the score-write predicate must now also exclude select-round messages, and we add `onSelectRound`. Replace the `onMessage`/`onNavigate` lines in its returned object with:

```ts
    onMessage: (handler) =>
      subscribe((m) => !isWatchNavigate(m) && !isWatchSelectRound(m), (m) => handler(m as WatchScoreWrite)),
    onNavigate: (handler) => subscribe(isWatchNavigate, (m) => handler(m as WatchNavigate)),
    onSelectRound: (handler) => subscribe(isWatchSelectRound, (m) => handler(m as WatchSelectRound)),
```

In `createWearTransport`, make the same change to its returned object:

```ts
    onMessage: (handler) =>
      subscribe((m) => !isWatchNavigate(m) && !isWatchSelectRound(m), (m) => handler(m as WatchScoreWrite)),
    onNavigate: (handler) => subscribe(isWatchNavigate, (m) => handler(m as WatchNavigate)),
    onSelectRound: (handler) => subscribe(isWatchSelectRound, (m) => handler(m as WatchSelectRound)),
```

- [ ] **Step 3: Write failing tests in `src/watch/__tests__/transport.test.ts`**

Update the import line to include the new guard:

```ts
import {
  createNullTransport,
  createWearTransport,
  createWatchTransport,
  isWatchNavigate,
  isWatchSelectRound,
} from '../transport';
```

Add this describe block after the `isWatchNavigate` describe block:

```ts
describe('isWatchSelectRound', () => {
  it('returns true for a selectRound message', () => {
    expect(isWatchSelectRound({ type: 'selectRound', roundId: 'r1' })).toBe(true);
  });
  it('returns false for a score write and a navigate message', () => {
    expect(isWatchSelectRound({ clientWriteId: 'w1', hole: 5, playerId: 'p', strokes: 4 })).toBe(false);
    expect(isWatchSelectRound({ type: 'navigate', hole: 5 })).toBe(false);
  });
  it('returns false for junk / wrong shape', () => {
    expect(isWatchSelectRound(null)).toBe(false);
    expect(isWatchSelectRound({ type: 'selectRound' })).toBe(false); // missing roundId
    expect(isWatchSelectRound({ type: 'selectRound', roundId: 5 })).toBe(false);
  });
  it('null transport onSelectRound returns an unsubscribe function', () => {
    const t = createNullTransport();
    const off = t.onSelectRound(() => {});
    expect(typeof off).toBe('function');
    off();
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm test -- src/watch/__tests__/transport.test.ts`
Expected: FAIL — `isWatchSelectRound` is not exported / `onSelectRound` missing on the null transport.

- [ ] **Step 5: Run the tests to verify they pass (after Steps 1–2)**

Run: `pnpm test -- src/watch/__tests__/transport.test.ts`
Expected: PASS.

- [ ] **Step 6: Type-check**

Run: `pnpm type-check`
Expected: no new errors from `src/watch/types.ts` or `src/watch/transport.ts`. (`availableRounds` is now required on `WatchSnapshot`; `snapshot.ts` is updated in Task 3, so a transient error there is expected until then — if running type-check in isolation, defer to after Task 3.)

- [ ] **Step 7: Commit**

```bash
git add src/watch/types.ts src/watch/transport.ts src/watch/__tests__/transport.test.ts
git commit -m "feat(watch): add availableRounds + selectRound transport types

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `buildAvailableRounds` pure helper

**Files:**
- Create: `src/watch/availableRounds.ts`
- Test: `src/watch/__tests__/availableRounds.test.ts`

- [ ] **Step 1: Write the failing test `src/watch/__tests__/availableRounds.test.ts`**

```ts
import { buildAvailableRounds, type AvailableRoundSource } from '../availableRounds';

const src = (over: Partial<AvailableRoundSource>): AvailableRoundSource => ({
  id: 'r1',
  status: 'upcoming',
  competition_id: null,
  competitionName: null,
  courseName: 'Royal Melbourne',
  tee_time: null,
  game_type: 'stableford',
  is_team_round: false,
  ...over,
});

describe('buildAvailableRounds', () => {
  it('maps source rounds to WatchAvailableRound shape, formatting tee time to HH:MM', () => {
    const [r] = buildAvailableRounds(
      [],
      [src({ id: 'r1', tee_time: '13:20:00', competition_id: 'c1', competitionName: 'Sat Comp' })],
    );
    expect(r).toEqual({
      roundId: 'r1',
      competitionId: 'c1',
      title: 'Sat Comp',
      teeTime: '13:20',
      status: 'upcoming',
      gameType: 'stableford',
      isTeamRound: false,
    });
  });

  it('falls back to course name then "Round" for the title', () => {
    const [a, b] = buildAvailableRounds(
      [],
      [
        src({ id: 'a', competitionName: null, courseName: 'Kingston Heath' }),
        src({ id: 'b', competitionName: null, courseName: null }),
      ],
    );
    expect(a.title).toBe('Kingston Heath');
    expect(b.title).toBe('Round');
  });

  it('orders in-progress first, then upcoming by tee time, with null tee times last', () => {
    const result = buildAvailableRounds(
      [src({ id: 'live', status: 'in-progress', tee_time: null })],
      [
        src({ id: 'late', status: 'upcoming', tee_time: '14:00:00' }),
        src({ id: 'noTime', status: 'upcoming', tee_time: null }),
        src({ id: 'early', status: 'upcoming', tee_time: '08:30:00' }),
      ],
    );
    expect(result.map((r) => r.roundId)).toEqual(['live', 'early', 'late', 'noTime']);
  });

  it('de-dupes by roundId, keeping the in-progress entry over an upcoming duplicate', () => {
    const result = buildAvailableRounds(
      [src({ id: 'dup', status: 'in-progress' })],
      [src({ id: 'dup', status: 'upcoming' })],
    );
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('in-progress');
  });

  it('handles a missing tee_time as null', () => {
    const [r] = buildAvailableRounds([], [src({ tee_time: undefined })]);
    expect(r.teeTime).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/watch/__tests__/availableRounds.test.ts`
Expected: FAIL — `Cannot find module '../availableRounds'`.

- [ ] **Step 3: Implement `src/watch/availableRounds.ts`**

```ts
import type { GameType, RoundStatus } from '@/types/database/enums';
import type { WatchAvailableRound } from './types';

/** Minimal slice of a round the picker needs. The bridge maps RoundWithCourse
 *  (from useInProgressRounds / useUpcomingRounds) onto this shape, so this pure
 *  helper stays decoupled from the full DB row type and easy to test. */
export interface AvailableRoundSource {
  id: string;
  status: Extract<RoundStatus, 'in-progress' | 'upcoming'>;
  competition_id: string | null;
  competitionName: string | null;
  courseName: string | null;
  tee_time?: string | null; // "HH:MM:SS"
  game_type: GameType;
  is_team_round: boolean;
}

/** "HH:MM:SS" -> "HH:MM"; null/empty -> null. */
function formatTeeTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const [h, m] = raw.split(':');
  if (h == null || m == null) return null;
  return `${h}:${m}`;
}

function toWatchRound(s: AvailableRoundSource): WatchAvailableRound {
  return {
    roundId: s.id,
    competitionId: s.competition_id ?? null,
    title: s.competitionName ?? s.courseName ?? 'Round',
    teeTime: formatTeeTime(s.tee_time),
    status: s.status,
    gameType: s.game_type,
    isTeamRound: s.is_team_round,
  };
}

/**
 * Merge in-progress + upcoming rounds into the watch picker list:
 *   - de-dupe by round id (an in-progress entry wins over an upcoming duplicate),
 *   - in-progress rounds first, then upcoming ordered by tee time (null last).
 */
export function buildAvailableRounds(
  inProgress: AvailableRoundSource[],
  upcoming: AvailableRoundSource[],
): WatchAvailableRound[] {
  const byId = new Map<string, WatchAvailableRound>();
  // In-progress first so it wins the de-dupe.
  for (const s of inProgress) byId.set(s.id, toWatchRound(s));
  for (const s of upcoming) if (!byId.has(s.id)) byId.set(s.id, toWatchRound(s));

  const rounds = [...byId.values()];
  const rank = (r: WatchAvailableRound) => (r.status === 'in-progress' ? 0 : 1);
  return rounds.sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    // Within the same group, order by tee time ascending; null tee times last.
    if (a.teeTime === b.teeTime) return 0;
    if (a.teeTime == null) return 1;
    if (b.teeTime == null) return -1;
    return a.teeTime < b.teeTime ? -1 : 1;
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/watch/__tests__/availableRounds.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/watch/availableRounds.ts src/watch/__tests__/availableRounds.test.ts
git commit -m "feat(watch): buildAvailableRounds picker-list helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Pass `availableRounds` through `buildWatchSnapshot`

**Files:**
- Modify: `src/watch/snapshot.ts`
- Test: `src/watch/__tests__/snapshot.test.ts`

- [ ] **Step 1: Write the failing test (add to `src/watch/__tests__/snapshot.test.ts`)**

Add this describe block at the end of the file:

```ts
import { buildWatchSnapshot } from '../snapshot';
import type { WatchAvailableRound } from '../types';

describe('buildWatchSnapshot availableRounds', () => {
  const base = {
    rev: 1,
    roundId: '',
    competitionName: 'Round',
    unit: 'metres' as const,
    isPremium: false,
    statFlags: {
      putts: false, fairways: false, gir: false, penalties: false, bunker: false,
      fairwayDirection: false, greenDirection: false,
    },
    currentHole: 1,
    currentUserId: 'u1',
    holes: [],
    coords: [],
    pairPlayers: [],
    leaderboard: [],
  };

  const round: WatchAvailableRound = {
    roundId: 'r1', competitionId: null, title: 'Royal Melbourne',
    teeTime: '08:30', status: 'upcoming', gameType: 'stableford', isTeamRound: false,
  };

  it('passes availableRounds straight through onto the snapshot', () => {
    const snap = buildWatchSnapshot({ ...base, availableRounds: [round] });
    expect(snap.availableRounds).toEqual([round]);
  });

  it('defaults availableRounds to an empty array when omitted', () => {
    const snap = buildWatchSnapshot({ ...base });
    expect(snap.availableRounds).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/watch/__tests__/snapshot.test.ts`
Expected: FAIL — `availableRounds` is not a property of `BuildSnapshotInput` (type error) / missing on the returned snapshot.

- [ ] **Step 3: Implement the passthrough in `src/watch/snapshot.ts`**

Add the import for the new type at the top:

```ts
import type {
  WatchAvailableRound,
  WatchHole,
  WatchLeaderboardRow,
  WatchSnapshot,
  WatchStatFlags,
  WatchUnit,
  WatchWind,
} from './types';
```

Add the field to `BuildSnapshotInput` (after `leaderboard: SnapshotLeaderboardEntry[];`):

```ts
  /** Optional so existing call sites/tests compile; defaults to []. */
  availableRounds?: WatchAvailableRound[];
```

In the returned object of `buildWatchSnapshot`, add the field right after `leaderboard:`:

```ts
    leaderboard: trimLeaderboard(input.leaderboard, input.currentUserId),
    availableRounds: input.availableRounds ?? [],
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/watch/__tests__/snapshot.test.ts`
Expected: PASS (including the pre-existing snapshot tests).

- [ ] **Step 5: Commit**

```bash
git add src/watch/snapshot.ts src/watch/__tests__/snapshot.test.ts
git commit -m "feat(watch): thread availableRounds through buildWatchSnapshot

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `routeForSelectedRound` pure router

**Files:**
- Create: `src/watch/selectRoundRoute.ts`
- Test: `src/watch/__tests__/selectRoundRoute.test.ts`

This mirrors `HomeScreen.handleScoreRound`: in-progress match-play (team vs solo) → dedicated screens, else `Scorecard`; upcoming → `ViewRound`.

- [ ] **Step 1: Write the failing test `src/watch/__tests__/selectRoundRoute.test.ts`**

```ts
import { routeForSelectedRound } from '../selectRoundRoute';
import type { WatchAvailableRound } from '../types';

const round = (over: Partial<WatchAvailableRound>): WatchAvailableRound => ({
  roundId: 'r1',
  competitionId: null,
  title: 'Round',
  teeTime: null,
  status: 'in-progress',
  gameType: 'stableford',
  isTeamRound: false,
  ...over,
});

describe('routeForSelectedRound', () => {
  it('routes an in-progress stableford round to Scorecard with competitionId ""', () => {
    expect(routeForSelectedRound(round({ status: 'in-progress', competitionId: null })))
      .toEqual({ screen: 'Scorecard', params: { roundId: 'r1', competitionId: '' } });
  });

  it('passes a real competitionId to Scorecard for competition rounds', () => {
    expect(routeForSelectedRound(round({ status: 'in-progress', competitionId: 'c9' })))
      .toEqual({ screen: 'Scorecard', params: { roundId: 'r1', competitionId: 'c9' } });
  });

  it('routes in-progress solo match-play to MatchPlayScoring', () => {
    expect(routeForSelectedRound(round({ status: 'in-progress', gameType: 'match-play', isTeamRound: false })))
      .toEqual({ screen: 'MatchPlayScoring', params: { roundId: 'r1' } });
  });

  it('routes in-progress team match-play to TeamMatchPlayScoring', () => {
    expect(routeForSelectedRound(round({ status: 'in-progress', gameType: 'match-play', isTeamRound: true })))
      .toEqual({ screen: 'TeamMatchPlayScoring', params: { roundId: 'r1' } });
  });

  it('routes an upcoming round to ViewRound so setup happens on the phone', () => {
    expect(routeForSelectedRound(round({ status: 'upcoming', competitionId: 'c1' })))
      .toEqual({ screen: 'ViewRound', params: { roundId: 'r1', competitionId: 'c1' } });
  });

  it('omits competitionId for an upcoming standalone round (optional param)', () => {
    expect(routeForSelectedRound(round({ status: 'upcoming', competitionId: null })))
      .toEqual({ screen: 'ViewRound', params: { roundId: 'r1', competitionId: undefined } });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/watch/__tests__/selectRoundRoute.test.ts`
Expected: FAIL — `Cannot find module '../selectRoundRoute'`.

- [ ] **Step 3: Implement `src/watch/selectRoundRoute.ts`**

```ts
import type { WatchAvailableRound } from './types';

/** A navigation intent the bridge hands to navigate(). Kept as plain data so the
 *  routing decision is pure and unit-testable without React Navigation. */
export type SelectRouteIntent =
  | { screen: 'Scorecard'; params: { roundId: string; competitionId: string } }
  | { screen: 'MatchPlayScoring'; params: { roundId: string } }
  | { screen: 'TeamMatchPlayScoring'; params: { roundId: string } }
  | { screen: 'ViewRound'; params: { roundId: string; competitionId: string | undefined } };

/**
 * Decide where the phone navigates for a watch-selected round. Mirrors the
 * phone's own handleScoreRound routing so the watch opens exactly the screen a
 * tap on the phone would:
 *   - upcoming round            -> ViewRound (lets tee/group setup happen first)
 *   - in-progress solo match    -> MatchPlayScoring
 *   - in-progress team match    -> TeamMatchPlayScoring
 *   - in-progress anything else -> Scorecard
 */
export function routeForSelectedRound(round: WatchAvailableRound): SelectRouteIntent {
  if (round.status === 'upcoming') {
    return {
      screen: 'ViewRound',
      params: { roundId: round.roundId, competitionId: round.competitionId ?? undefined },
    };
  }
  if (round.gameType === 'match-play') {
    return round.isTeamRound
      ? { screen: 'TeamMatchPlayScoring', params: { roundId: round.roundId } }
      : { screen: 'MatchPlayScoring', params: { roundId: round.roundId } };
  }
  return {
    screen: 'Scorecard',
    params: { roundId: round.roundId, competitionId: round.competitionId ?? '' },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/watch/__tests__/selectRoundRoute.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/watch/selectRoundRoute.ts src/watch/__tests__/selectRoundRoute.test.ts
git commit -m "feat(watch): pure router for watch-selected rounds

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Wire the bridge — always-push + select-round navigation

**Files:**
- Modify: `src/watch/useWatchBridge.ts`

No unit test (per the existing convention documented in the hook's header — this wiring is verified on-device in Task 7). Keep all testable logic in the Task 2/3/4 pure helpers.

- [ ] **Step 1: Add imports to `src/watch/useWatchBridge.ts`**

First, add `useCallback` to the existing React import by replacing
`import { useEffect, useMemo, useRef } from 'react';` with:

```ts
import { useCallback, useEffect, useMemo, useRef } from 'react';
```

Then add to the existing import block (after the existing hook imports — do **not**
re-import from `'react'` here):

```ts
import { useInProgressRounds } from '@/hooks/home/useInProgressRounds';
import { useUpcomingRounds } from '@/hooks/home/useUpcomingRounds';
import { navigate, isNavigationReady } from '@/navigation/navigationRef';
import { buildAvailableRounds, type AvailableRoundSource } from './availableRounds';
import { routeForSelectedRound } from './selectRoundRoute';
import type { RoundWithCourse } from '@/components/competitions/detail/types';
```

- [ ] **Step 2: Build the available-rounds list inside the hook**

After the existing query lines (just below `const { data: coords = [] } = useHoleCoordinates(courseId);`), add:

```ts
  // Today's playable rounds for the watch picker. These hooks are already used by
  // the Home screen, so React Query de-dupes the fetches; here they let the watch
  // list rounds even when no round is open on the phone.
  const { data: inProgressRounds = [] } = useInProgressRounds();
  const { data: upcomingRounds = [] } = useUpcomingRounds();

  const availableRounds = useMemo(() => {
    const toSource = (r: RoundWithCourse, status: AvailableRoundSource['status']): AvailableRoundSource => ({
      id: r.id,
      status,
      competition_id: r.competition_id ?? null,
      competitionName: r.competition?.name ?? null,
      courseName: r.course?.name ?? null,
      tee_time: r.tee_time ?? null,
      game_type: r.game_type,
      is_team_round: Boolean(r.is_team_round),
    });
    return buildAvailableRounds(
      inProgressRounds.map((r) => toSource(r, 'in-progress')),
      upcomingRounds.map((r) => toSource(r, 'upcoming')),
    );
  }, [inProgressRounds, upcomingRounds]);

  // Mirror for the (stable) inbound select-round subscription.
  const availableRoundsRef = useRef(availableRounds);
  availableRoundsRef.current = availableRounds;
```

- [ ] **Step 3: Make Effect 1 always push (clears stale rounds + delivers the list)**

Replace the guard and the `roundId` value in Effect 1. Change the first line of Effect 1 from:

```ts
    if (!transport.isSupported() || !roundId || !user) return;
```

to:

```ts
    // No `roundId` guard: we push even with no active round so the watch clears a
    // finished round and shows the picker. An empty roundId is the clear signal.
    if (!transport.isSupported() || !user) return;
```

Change the snapshot's `roundId` field from `roundId,` to:

```ts
        roundId: roundId ?? '',
```

Add `availableRounds` to the `buildWatchSnapshot({ ... })` argument (place it right after the `leaderboard:` mapping, before `wind,`):

```ts
        availableRounds,
```

Add `availableRounds` to Effect 1's dependency array (after `leaderboard,`):

```ts
    leaderboard,
    availableRounds,
    wind,
```

- [ ] **Step 4: Add the select-round router + pending-retry, then Effect 4**

Add this above the effects (right after the `availableRoundsRef` lines from Step 2):

```ts
  // Resolve a watch-selected round id against the list we last sent, and route the
  // phone there. Returns false when the id is unknown (stale) or navigation isn't
  // ready yet, so the caller can retry.
  const pendingSelectRef = useRef<string | null>(null);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const routeToRound = useCallback((roundId: string): boolean => {
    const entry = availableRoundsRef.current.find((r) => r.roundId === roundId);
    if (!entry) return false; // unknown / no longer playable — drop
    if (!isNavigationReady()) return false; // app not foregrounded yet — retry
    const intent = routeForSelectedRound(entry);
    // Cast: SelectRouteIntent screens/params are a subset of RootStackParamList.
    navigate(intent.screen as never, intent.params as never);
    return true;
  }, []);

  const startPendingRetry = useCallback(() => {
    if (retryRef.current) return;
    let tries = 0;
    retryRef.current = setInterval(() => {
      tries += 1;
      const pending = pendingSelectRef.current;
      if (!pending || routeToRound(pending) || tries > 20) {
        pendingSelectRef.current = null;
        if (retryRef.current) {
          clearInterval(retryRef.current);
          retryRef.current = null;
        }
      }
    }, 300);
  }, [routeToRound]);
```

Add Effect 4 at the end of the hook (after Effect 3):

```ts
  // ── Effect 4: open a watch-selected round on the phone ────────────────────
  // No active-round guard: selection is about choosing A round, not acting within
  // one. If the app wasn't foregrounded when the tap arrived, hold the selection
  // and retry until navigation is ready (bounded).
  useEffect(() => {
    if (!transport.isSupported() || !user) return;
    const off = transport.onSelectRound((sel) => {
      if (!routeToRound(sel.roundId)) {
        pendingSelectRef.current = sel.roundId;
        startPendingRetry();
      }
    });
    return () => {
      off();
      if (retryRef.current) {
        clearInterval(retryRef.current);
        retryRef.current = null;
      }
    };
  }, [transport, user, routeToRound, startPendingRetry]);
```

- [ ] **Step 5: Type-check and run the full watch test suite**

Run: `pnpm type-check`
Expected: no errors in `src/watch/`.

Run: `pnpm test -- src/watch`
Expected: PASS (transport, snapshot, availableRounds, selectRoundRoute, plus untouched distanceParity/windData/scoreWrite).

- [ ] **Step 6: Confirm `RoundWithCourse` exposes the fields used in Step 2**

Run: `grep -nE "competition_id|tee_time|game_type|is_team_round|competition\b|course\b" src/components/competitions/detail/types.ts`
Expected: the row type (or its base `Round`) includes `competition_id`, `tee_time`, `game_type`, `is_team_round`, and the joined `competition` / `course`. If `is_team_round` is absent on the type, it is still safe (`Boolean(r.is_team_round)` coerces `undefined` to `false`); if `game_type` is absent, add the field to the round type rather than casting.

- [ ] **Step 7: Commit**

```bash
git add src/watch/useWatchBridge.ts
git commit -m "feat(watch): always push snapshot + navigate on watch round selection

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Swift — snapshot model + select-round sender

**Files:**
- Modify: `ios/TheNineteenthWatch Watch App/WatchSnapshot.swift`
- Modify: `ios/TheNineteenthWatch Watch App/ConnectivityClient.swift`

Verified by build (no Swift unit tests in this target).

- [ ] **Step 1: Add `WatchAvailableRound` + `availableRounds` + `hasActiveRound` to `WatchSnapshot.swift`**

Add this struct above `struct WatchSnapshot`:

```swift
/// One round the user can open from the watch picker. Mirrors
/// `WatchAvailableRound` in `src/watch/types.ts`.
struct WatchAvailableRound: Codable, Equatable, Identifiable {
    let roundId: String
    let competitionId: String?
    let title: String
    let teeTime: String?
    let status: String      // "in-progress" | "upcoming"
    let gameType: String
    let isTeamRound: Bool

    var id: String { roundId }
    var isLive: Bool { status == "in-progress" }
}
```

In `struct WatchSnapshot`, add the field after `let wind: WatchWind?`:

```swift
    /// Rounds the user can open from the watch. Optional for backward-compatible
    /// decode of older snapshots (missing key -> treated as empty).
    let availableRounds: [WatchAvailableRound]?
```

Add a computed property inside `WatchSnapshot` (next to `currentHoleObject`):

```swift
    /// True when the snapshot describes a round currently being scored. The phone
    /// sends an empty `roundId` (with availableRounds populated) to clear a
    /// finished round while still feeding the picker.
    var hasActiveRound: Bool { !roundId.isEmpty }

    /// Picker list, excluding the active round, with nil decoded as empty.
    var pickerRounds: [WatchAvailableRound] {
        (availableRounds ?? []).filter { $0.roundId != roundId }
    }
```

- [ ] **Step 2: Add `selectRound(roundId:)` to `ConnectivityClient.swift`**

Add this method after `navigate(toHole:)`:

```swift
    /// Tell the phone to open the chosen round. Real-time when reachable, with a
    /// guaranteed `transferUserInfo` fallback (the phone may be backgrounded).
    func selectRound(roundId: String) {
        let msg: [String: Any] = ["type": "selectRound", "roundId": roundId]
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(msg, replyHandler: nil) { _ in
                WCSession.default.transferUserInfo(msg)
            }
        } else {
            WCSession.default.transferUserInfo(msg)
        }
    }
```

- [ ] **Step 3: Make the complication reflect active vs cleared state**

In `publishComplicationState(_:)`, change the `active: true` argument so a cleared snapshot clears the complication:

```swift
    private func publishComplicationState(_ snapshot: WatchSnapshot) {
        WatchSharedState.write(.init(
            active: snapshot.hasActiveRound,
            hole: snapshot.currentHole,
            holeCount: snapshot.holes.count,
            name: snapshot.competitionName
        ))
        WidgetCenter.shared.reloadAllTimelines()
    }
```

- [ ] **Step 4: Build the watch target**

Run (from repo root):

```bash
xcodebuild -workspace ios/TheNineteenth.xcworkspace \
  -scheme "TheNineteenthWatch Watch App" \
  -destination 'generic/platform=watchOS' \
  -quiet build
```

Expected: BUILD SUCCEEDED. (If the scheme name differs, list schemes with `xcodebuild -workspace ios/TheNineteenth.xcworkspace -list` and use the watch app scheme.)

- [ ] **Step 5: Commit**

```bash
git add "ios/TheNineteenthWatch Watch App/WatchSnapshot.swift" "ios/TheNineteenthWatch Watch App/ConnectivityClient.swift"
git commit -m "feat(watch): watchOS model for availableRounds + selectRound sender

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Swift — round picker UI + RootView routing

**Files:**
- Create: `ios/TheNineteenthWatch Watch App/RoundPickerView.swift`
- Modify: `ios/TheNineteenthWatch Watch App/TheNineteenthWatchApp.swift`
- Modify: `ios/TheNineteenthWatch Watch App/NowPlayingView.swift`

Verified by build + on-device run.

- [ ] **Step 1: Create `ios/TheNineteenthWatch Watch App/RoundPickerView.swift`**

```swift
import SwiftUI
import WatchKit

/// Lets the player choose which round to score from the watch. Shown when no
/// round is active, and reachable via "Switch round" while one is. Tapping a row
/// asks the phone to open that round; the watch then waits for the phone to push
/// the active-round snapshot (or, for upcoming rounds, for setup to finish).
struct RoundPickerView: View {
    @ObservedObject var connectivity: ConnectivityClient
    /// Optional: dismiss after a tap when presented over a live round.
    var onSelected: (() -> Void)?

    private var rounds: [WatchAvailableRound] {
        connectivity.snapshot?.pickerRounds ?? []
    }

    var body: some View {
        Group {
            if rounds.isEmpty {
                EmptyPickerState()
            } else {
                List {
                    Section("Rounds") {
                        ForEach(rounds) { round in
                            Button {
                                connectivity.selectRound(roundId: round.roundId)
                                WKInterfaceDevice.current().play(.click)
                                onSelected?()
                            } label: {
                                RoundRow(round: round)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Rounds")
    }
}

/// One picker row: title plus a live/tee-time subtitle.
private struct RoundRow: View {
    let round: WatchAvailableRound

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(round.title)
                .font(.body)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
            HStack(spacing: 5) {
                Image(systemName: round.isLive ? "dot.radiowaves.left.and.right" : "clock")
                    .font(.caption2)
                    .foregroundStyle(round.isLive ? Color.scoreBirdie : .secondary)
                Text(round.isLive ? "Live" : (round.teeTime ?? "Scheduled"))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }
}

/// Shown when there are no rounds to pick (replaces the old "start on phone" copy
/// when the phone has cleared the round but the user has nothing scheduled today).
private struct EmptyPickerState: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "flag.slash")
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(.secondary)
            Text("No rounds today")
                .font(.headline)
                .multilineTextAlignment(.center)
            Text("Start or schedule one on your phone")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}
```

- [ ] **Step 2: Route RootView on `hasActiveRound` and gate the workout on it (`TheNineteenthWatchApp.swift`)**

Replace the `var body: some View {` block of `RootView` with:

```swift
    private var hasActiveRound: Bool {
        connectivity.snapshot?.hasActiveRound ?? false
    }

    var body: some View {
        NavigationStack {
            if hasActiveRound {
                DistanceView(connectivity: connectivity, location: location)
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            NavigationLink {
                                NowPlayingView(connectivity: connectivity, location: location)
                            } label: {
                                Image(systemName: "list.bullet")
                            }
                        }
                    }
            } else {
                // No active round: show the picker (it renders its own empty state
                // when there's nothing to pick).
                RoundPickerView(connectivity: connectivity)
            }
        }
        // Keep the app alive only while a round is actually live.
        .onAppear { if hasActiveRound { workout.start() } }
        .onChange(of: hasActiveRound) { _, live in
            if live { workout.start() } else { workout.stop() }
        }
        .onChange(of: workout.startDate) { _, started in
            if let started { durationMonitor.start(at: started) } else { durationMonitor.stop() }
        }
        .alert(
            "Round running long",
            isPresented: $durationMonitor.shouldPromptCompletion
        ) {
            Button("Got it", role: .cancel) {}
        } message: {
            Text("You've been playing over 5 hours. Time to wrap up and submit your scorecard on your phone.")
        }
        .onChange(of: durationMonitor.shouldPromptCompletion) { _, prompting in
            if prompting { WKInterfaceDevice.current().play(.notification) }
        }
    }
```

Note: this replaces the two `connectivity.snapshot != nil` checks (RootView body + workout `.onAppear`/`.onChange`) with `hasActiveRound`, so the picker no longer starts a workout session.

- [ ] **Step 3: Add a "Switch round" entry to the live-round menu (`NowPlayingView.swift`)**

In `NowPlayingView`'s `List`, add a navigation row after the `Leaderboard` `MenuRow`, shown only when there's more than the current round to switch to:

```swift
                MenuRow(title: "Leaderboard", systemImage: "trophy.fill", tint: .brandWarning) {
                    LeaderboardView(connectivity: connectivity)
                }
                if !(snapshot.pickerRounds.isEmpty) {
                    MenuRow(title: "Switch round", systemImage: "arrow.left.arrow.right", tint: .secondary) {
                        RoundPickerView(connectivity: connectivity)
                    }
                }
```

(The existing `else { EmptyRoundState() }` branch of `NowPlayingView` is now only reached in the toolbar-pushed case while a round is active, so it stays as-is.)

- [ ] **Step 4: Build the watch target**

Run:

```bash
xcodebuild -workspace ios/TheNineteenth.xcworkspace \
  -scheme "TheNineteenthWatch Watch App" \
  -destination 'generic/platform=watchOS' \
  -quiet build
```

Expected: BUILD SUCCEEDED.

- [ ] **Step 5: On-device / paired-simulator verification**

Run the phone app on a device/simulator paired with a watch, then verify each spec scenario:

1. **Stale clear:** Start a round, confirm it shows on the watch, then submit/abort it on the phone. Expected: the watch leaves scoring and shows the round picker (or "No rounds today"), not the finished round.
2. **Multiple live rounds:** Have two in-progress rounds. On the watch with one active, open **Switch round** → pick the other. Expected: phone opens the other round's scoring screen and the watch updates to it.
3. **Scheduled round not opened on phone:** With a round scheduled for today but never opened, the watch picker lists it with its tee time. Tap it. Expected: the phone opens **ViewRound** for that round (setup), and once scoring starts the watch shows it.
4. **Cold selection:** Background the phone app, tap a round on the watch. Expected: the phone foregrounds and lands on the round (pending-retry covers navigation not-ready).
5. **Match-play routing:** An in-progress match-play round selected on the watch opens **MatchPlayScoring** (solo) / **TeamMatchPlayScoring** (team), not the standard Scorecard.

- [ ] **Step 6: Commit**

```bash
git add "ios/TheNineteenthWatch Watch App/RoundPickerView.swift" "ios/TheNineteenthWatch Watch App/TheNineteenthWatchApp.swift" "ios/TheNineteenthWatch Watch App/NowPlayingView.swift"
git commit -m "feat(watch): round picker UI + switch-round on watchOS

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final verification

- [ ] **Full watch test suite + type-check**

Run: `pnpm test -- src/watch && pnpm type-check`
Expected: watch tests PASS; no new type errors (compare against the known baseline noise — see project memory "Jest baseline noise").

- [ ] **Lint the changed TS files**

Run: `pnpm lint`
Expected: no new lint errors in `src/watch/`.

- [ ] **Spec scenarios confirmed** (Task 7, Step 5) — all five pass on device.
