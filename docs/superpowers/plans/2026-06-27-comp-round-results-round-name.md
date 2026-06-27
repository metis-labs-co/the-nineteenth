# Competition Round Results — Show Round Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each round's name (fallback "Round N") in the competition Leaderboard tab's Round Results headings, keeping the format pill.

**Architecture:** Add an optional `roundName?: string | null` prop to the three header components and have the competition `LeaderboardTab` pass `round.name` into each Round Results header path. Scoped — other screens don't pass the prop.

**Tech Stack:** TypeScript, React Native, Jest + `@/__tests__/utils/renderHelpers`.

## Global Constraints

- Heading = `roundName` when it's a non-empty (non-whitespace) string, else `Round {round_number}`.
- Keep the format pill / team badge / date-course line unchanged.
- Optional prop, passed only by the competition `LeaderboardTab`; Review Scorecard & ViewRound headers unchanged.
- No schema/data change; no change to ordering/points/component selection.

---

### Task 1: `LeaderboardHeader` — `roundName` prop

**Files:**
- Modify: `src/components/leaderboard/LeaderboardHeader.tsx`
- Test: `src/components/leaderboard/LeaderboardHeader.test.tsx` (new)

**Interfaces:**
- Produces: `LeaderboardHeader` gains optional prop `roundName?: string | null`. Title prefers it over `Round {roundNumber}`.

- [ ] **Step 1: Write the failing test**

Create `src/components/leaderboard/LeaderboardHeader.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { LeaderboardHeader } from './LeaderboardHeader';

describe('LeaderboardHeader round title', () => {
  it('shows the round name when provided', () => {
    render(
      <LeaderboardHeader gameType="alt-shot" isTeamRound roundNumber={4} roundName="2v2 Alt Shot" />
    );
    expect(screen.getByText('2v2 Alt Shot')).toBeTruthy();
    expect(screen.queryByText('Round 4')).toBeNull();
  });

  it('falls back to "Round N" when roundName is null', () => {
    render(
      <LeaderboardHeader gameType="stableford" isTeamRound={false} roundNumber={2} roundName={null} />
    );
    expect(screen.getByText('Round 2')).toBeTruthy();
  });

  it('falls back to "Round N" when roundName is whitespace', () => {
    render(
      <LeaderboardHeader gameType="stableford" isTeamRound={false} roundNumber={3} roundName="   " />
    );
    expect(screen.getByText('Round 3')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test -- LeaderboardHeader`
Expected: FAIL — `roundName` is not a prop, and the title currently renders `Round {roundNumber}` as split text nodes (so even the name test fails / "2v2 Alt Shot" not found).

- [ ] **Step 3: Add the prop + title logic**

In `src/components/leaderboard/LeaderboardHeader.tsx`:

(a) Add to `LeaderboardHeaderProps` (after `roundNumber`):

```tsx
  /** Optional user-defined round name; shown instead of "Round N" when set. */
  roundName?: string | null;
```

(b) Add `roundName` to the destructured params (after `roundNumber`).

(c) Compute the title near the top of the component body (e.g. just before `const formatLabel = ...`):

```tsx
  const title =
    roundName && roundName.trim().length > 0 ? roundName : `Round ${roundNumber}`;
```

(d) Replace the title render (`LeaderboardHeader.tsx:84-86`):

```tsx
        <ScaledText category="title" style={[styles.roundTitle, { color: colors.textPrimary }]}>
          Round {roundNumber}
        </ScaledText>
```

with:

```tsx
        <ScaledText category="title" style={[styles.roundTitle, { color: colors.textPrimary }]}>
          {title}
        </ScaledText>
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test -- LeaderboardHeader`
Expected: PASS (3/3).

- [ ] **Step 5: Type-check and commit**

Run: `pnpm type-check 2>&1 | grep -E "LeaderboardHeader" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

```bash
git add src/components/leaderboard/LeaderboardHeader.tsx src/components/leaderboard/LeaderboardHeader.test.tsx
git commit -m "feat(leaderboard): LeaderboardHeader shows round name when provided

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Thread `roundName` through the Round Results headers

**Files:**
- Modify: `src/components/leaderboard/RoundLeaderboard.tsx` (prop + 2 header usages)
- Modify: `src/components/leaderboard/InProgressRoundLeaderboard.tsx` (prop + header text)
- Modify: `src/components/leaderboard/LeaderboardTab.tsx` (pass `round.name` to all paths)

**Interfaces:**
- Consumes: `LeaderboardHeader`'s `roundName?` prop (Task 1).
- Produces: `RoundLeaderboard` and `InProgressRoundLeaderboard` gain optional `roundName?: string | null`.

- [ ] **Step 1: `RoundLeaderboard` — add prop, pass to both headers**

In `src/components/leaderboard/RoundLeaderboard.tsx`:
- Add to `RoundLeaderboardProps` (near `roundId`/`gameType`): `roundName?: string | null;`
- Add `roundName` to the destructured params.
- Pass `roundName={roundName}` to BOTH `<LeaderboardHeader …/>` usages (the empty-state header ~`:153` and the main header ~`:247`).

- [ ] **Step 2: `InProgressRoundLeaderboard` — add prop, prefer name in header**

In `src/components/leaderboard/InProgressRoundLeaderboard.tsx`:
- Add to `InProgressRoundLeaderboardProps` (after `roundNumber`): `roundName?: string | null;`
- Add `roundName` to the destructured params (after `roundNumber`, ~`:128`).
- Replace the header text expression (`:223`):

```tsx
          {`Round ${roundNumber}`}
```

with:

```tsx
          {roundName && roundName.trim().length > 0 ? roundName : `Round ${roundNumber}`}
```

- [ ] **Step 3: `LeaderboardTab` — pass `round.name` into each Round Results header**

In `src/components/leaderboard/LeaderboardTab.tsx`, inside the `orderedRounds.map`, add `roundName={round.name}` to:
- the alt-shot/match-play branch's `<LeaderboardHeader …/>`,
- the `<InProgressRoundLeaderboard …/>` usage (the `canRenderLive` true branch),
- BOTH `<RoundLeaderboard …/>` usages (the `canRenderLive` false branch in the in-progress arm, and the completed arm).

(`round.name` is `string | null` on the `RoundWithCourse` object — already in scope in the map.)

- [ ] **Step 4: Type-check**

Run: `pnpm type-check 2>&1 | grep -E "RoundLeaderboard|InProgressRoundLeaderboard|LeaderboardTab" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

- [ ] **Step 5: Run the leaderboard suites (no regressions)**

Run: `pnpm test -- LeaderboardTab LeaderboardHeader`
Expected: PASS, or only the ~10 pre-existing `LeaderboardTab`/`LeaderboardTable` baseline failures (unchanged count). The round-leaderboard mocks ignore the new `roundName` prop, so existing assertions are unaffected.

- [ ] **Step 6: Commit**

```bash
git add src/components/leaderboard/RoundLeaderboard.tsx src/components/leaderboard/InProgressRoundLeaderboard.tsx src/components/leaderboard/LeaderboardTab.tsx
git commit -m "feat(leaderboard): pass round name into competition Round Results headers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Verify

- [ ] **Step 1: Run affected suites**

Run: `pnpm test -- LeaderboardHeader LeaderboardTab`
Expected: PASS (new header tests + existing, modulo the known baseline failures).

- [ ] **Step 2: Type-check the touched surface**

Run: `pnpm type-check 2>&1 | grep -E "LeaderboardHeader|RoundLeaderboard|InProgressRoundLeaderboard|LeaderboardTab" || echo "NO ERRORS in touched files"`
Expected: `NO ERRORS in touched files`.

- [ ] **Step 3: Manual QA (deferred)**

Competition Leaderboard → Round Results: each round shows its name ("2v2 Alt Shot", "1v1 Singles Match Play", …) with its format pill; an unnamed round shows "Round N". Review Scorecard and ViewRound round headers unchanged.

## Self-Review Notes

- **Spec coverage:** Unit A → Task 1; Units B/C/D → Task 2; verify → Task 3.
- **Type consistency:** `roundName?: string | null` is identical across `LeaderboardHeader`, `RoundLeaderboard`, `InProgressRoundLeaderboard`; `LeaderboardTab` passes `round.name` (`string | null`).
- **Backward compatibility:** optional prop; all other `LeaderboardHeader` callers (Review, ViewRound) omit it → unchanged "Round N". The `LeaderboardTab` mocks don't read it.
- **No placeholders:** full prop edits, header changes, and tests inline.
