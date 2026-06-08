# Ringer Teams Vertical List + Contributions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the Ringer Board's Teams sub-tab, replace the horizontal grid with a vertical 18-row list (Hole · Par · Player · Points · Shots) and add a per-team "most hole contributions" mini-leaderboard.

**Architecture:** Extend the pure util (`computeRingerBoard`) so each composite hole also carries `par` and the contributing player's `strokes`. Add a new `RingerTeamCard` component for the expanded team body (contributions list + vertical table); `RingerBoard` renders it for teams and keeps the existing horizontal `RingerScorecard` for individuals.

**Tech Stack:** TypeScript, React Native, React Native Paper, Jest. No DB/hook changes.

**Spec:** `docs/superpowers/specs/2026-06-09-ringer-team-vertical-list-design.md`

---

## Key facts

- The util already runs TDD with helpers `hole()`, `card()`, `flatRound()`, `holes18()` in `src/utils/ringer/computeRingerBoard.test.ts`. `holes18()` makes every hole par 4 with stroke index = hole number; `flatRound(id,label,{playerId:gross})` gives every player a flat gross on all 18 holes at handicap 0 (so gross 3 on a par-4 SI-n hole = birdie = 3 pts).
- `holeStablefordPoints(scorecard, hole)` returns `null` when the hole is unplayed/multi-ball, else the points. When it is non-null, the score is guaranteed single-ball with `strokes > 0`.
- `RingerHole` currently = `{ hole, points, sourceRoundLabel, sourcePlayerId }`.
- `RingerBoard.tsx` renders the expanded body as `{expanded && <RingerScorecard entry={entry} shortNameFor={shortNameFor} />}`. `shortNameFor(playerId: string | null): string` returns a first-name (or `'—'` for null/unknown) and is already memoized with `useCallback`.
- Components render inside the competition screen's vertical ScrollView — use plain Views/`.map()`, no nested vertical scroll.

## File structure

| File | Change |
|---|---|
| `src/utils/ringer/types.ts` | Add `par` + `strokes` to `RingerHole` |
| `src/utils/ringer/computeRingerBoard.ts` | Capture `par`/`strokes` of the winning play |
| `src/utils/ringer/computeRingerBoard.test.ts` | Tests for the new fields |
| `src/components/competitions/ringer/RingerTeamCard.tsx` | New: contributions list + vertical table |
| `src/components/competitions/ringer/index.ts` | Export `RingerTeamCard` |
| `src/components/competitions/ringer/RingerBoard.tsx` | Use `RingerTeamCard` for the teams view |

---

## Task 1: Extend the util with `par` and `strokes` (TDD)

**Files:**
- Modify: `src/utils/ringer/types.ts`
- Modify: `src/utils/ringer/computeRingerBoard.ts`
- Test: `src/utils/ringer/computeRingerBoard.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `src/utils/ringer/computeRingerBoard.test.ts`:

```typescript
describe('computeRingerBoard - par and strokes', () => {
  it('carries par and the winning round strokes for an individual hole', () => {
    // p1: R1 all gross 4 (par = 2pts), R2 all gross 3 (birdie = 3pts) -> R2 wins.
    const board = computeRingerBoard({
      rounds: [flatRound('r1', 'R1', { p1: 4 }), flatRound('r2', 'R2', { p1: 3 })],
      players: [{ playerId: 'p1', name: 'Pat' }],
      teams: [],
    });
    const h = board.individuals[0].holes[0];
    expect(h.points).toBe(3);
    expect(h.par).toBe(4);
    expect(h.strokes).toBe(3); // gross from the winning round (R2)
  });

  it('sets par and strokes to null for a hole with no score', () => {
    const board = computeRingerBoard({
      rounds: [{ roundId: 'r1', roundLabel: 'R1', holes: holes18(), scorecards: [] }],
      players: [{ playerId: 'p1', name: 'Pat' }],
      teams: [],
    });
    const h = board.individuals[0].holes[0];
    expect(h.points).toBe(0);
    expect(h.par).toBeNull();
    expect(h.strokes).toBeNull();
    expect(h.sourceRoundLabel).toBeNull();
  });

  it('reflects the winning member card for a team hole', () => {
    // Team A = p1,p2. R2 p1 gross 2 on a par 4 = eagle = 4pts (the best anywhere).
    const board = computeRingerBoard({
      rounds: [
        flatRound('r1', 'R1', { p1: 4, p2: 3 }),
        flatRound('r2', 'R2', { p1: 2, p2: 4 }),
      ],
      players: [
        { playerId: 'p1', name: 'Pat' },
        { playerId: 'p2', name: 'Sam' },
      ],
      teams: [{ teamId: 't1', name: 'Team A', color: null, memberPlayerIds: ['p1', 'p2'] }],
    });
    const h = board.teams[0].holes[0];
    expect(h.points).toBe(4);
    expect(h.strokes).toBe(2);
    expect(h.par).toBe(4);
    expect(h.sourcePlayerId).toBe('p1');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/utils/ringer/computeRingerBoard.test.ts`
Expected: FAIL — the `par`/`strokes` properties are `undefined` (assertions on `toBe(4)`/`toBe(3)`/`toBeNull()` fail).

- [ ] **Step 3: Add the fields to `RingerHole`**

In `src/utils/ringer/types.ts`, add to the `RingerHole` interface (after `points`, before `sourceRoundLabel`):

```typescript
  /** Par of the hole in the source round; null when no score was recorded. */
  par: number | null;
  /** The contributing player's gross strokes on the hole; null when no score. */
  strokes: number | null;
```

- [ ] **Step 4: Capture par/strokes in the computation**

In `src/utils/ringer/computeRingerBoard.ts`, replace the `pointsForPlayer` helper (lines 41–47) with a richer `playForPlayer` helper:

```typescript
interface HolePlay {
  points: number;
  strokes: number;
  par: number;
}

function playForPlayer(ctx: RoundCtx, playerId: string, holeNumber: number): HolePlay | null {
  const sc = ctx.cardByPlayer.get(playerId);
  if (!sc) return null;
  const hole = ctx.holeByNumber.get(holeNumber);
  if (!hole) return null;
  const points = holeStablefordPoints(sc, hole);
  if (points === null) return null;
  // points !== null guarantees a single-ball score with strokes > 0.
  const raw = sc.scores[String(hole.number)];
  const strokes = isSingleBallScore(raw) ? raw.strokes : 0;
  return { points, strokes, par: hole.par };
}
```

Then update the individual hole-mapping loop (currently lines 84–100) to:

```typescript
    const holes: RingerHole[] = holeNumbers.map((holeNumber) => {
      let best: HolePlay | null = null;
      let sourceRoundLabel: string | null = null;
      for (const ctx of roundCtxs) {
        const play = playForPlayer(ctx, player.playerId, holeNumber);
        if (play !== null && (best === null || play.points > best.points)) {
          best = play;
          sourceRoundLabel = ctx.round.roundLabel;
        }
      }
      return {
        hole: holeNumber,
        points: best?.points ?? 0,
        par: best?.par ?? null,
        strokes: best?.strokes ?? null,
        sourceRoundLabel,
        sourcePlayerId: sourceRoundLabel ? player.playerId : null,
      };
    });
```

And the team hole-mapping loop (currently lines 114–129) to:

```typescript
    const holes: RingerHole[] = holeNumbers.map((holeNumber) => {
      let best: HolePlay | null = null;
      let sourceRoundLabel: string | null = null;
      let sourcePlayerId: string | null = null;
      for (const ctx of roundCtxs) {
        for (const memberId of team.memberPlayerIds) {
          const play = playForPlayer(ctx, memberId, holeNumber);
          if (play !== null && (best === null || play.points > best.points)) {
            best = play;
            sourceRoundLabel = ctx.round.roundLabel;
            sourcePlayerId = memberId;
          }
        }
      }
      return {
        hole: holeNumber,
        points: best?.points ?? 0,
        par: best?.par ?? null,
        strokes: best?.strokes ?? null,
        sourceRoundLabel,
        sourcePlayerId,
      };
    });
```

(`isSingleBallScore` is already imported at the top of the file; `HolePlay` replaces the old `pointsForPlayer` return.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test src/utils/ringer/computeRingerBoard.test.ts`
Expected: PASS — all prior tests plus the 3 new ones (11 total).

- [ ] **Step 6: Type-check**

Run: `pnpm type-check`
Expected: PASS (clean). The `RingerScorecard` component does not reference the new fields, so it is unaffected.

- [ ] **Step 7: Commit**

```bash
git add src/utils/ringer/types.ts src/utils/ringer/computeRingerBoard.ts src/utils/ringer/computeRingerBoard.test.ts
git commit -m "feat(ringer): capture par and gross strokes per composite hole"
```

---

## Task 2: `RingerTeamCard` component

**Files:**
- Create: `src/components/competitions/ringer/RingerTeamCard.tsx`

- [ ] **Step 1: Write the component**

```typescript
// src/components/competitions/ringer/RingerTeamCard.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { RingerEntry } from '@/utils/ringer';

interface RingerTeamCardProps {
  entry: RingerEntry;
  /** Resolve a player id to a short display name. */
  shortNameFor: (playerId: string | null) => string;
}

/**
 * Expanded team body: a "most hole contributions" mini-leaderboard followed by a
 * vertical 18-row composite scorecard (Hole · Par · Player · Pts · Shots).
 */
export const RingerTeamCard = React.memo(function RingerTeamCard({
  entry,
  shortNameFor,
}: RingerTeamCardProps) {
  const colors = useThemeColors();

  // Tally how many holes each member supplied the winning score for.
  const contributions = useMemo(() => {
    const counts = new Map<string, number>();
    entry.holes.forEach((h) => {
      if (h.sourcePlayerId) {
        counts.set(h.sourcePlayerId, (counts.get(h.sourcePlayerId) ?? 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([playerId, count]) => ({ playerId, name: shortNameFor(playerId), count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [entry.holes, shortNameFor]);

  return (
    <View style={styles.container}>
      {/* Contributions mini-leaderboard */}
      {contributions.length > 0 && (
        <View style={[styles.contrib, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[typography.caption, styles.contribTitle, { color: colors.textSecondary }]}>
            Hole contributions
          </Text>
          <View style={styles.contribRow}>
            {contributions.map((c) => (
              <View key={c.playerId} style={styles.contribItem}>
                <Text style={[typography.small, styles.contribName, { color: colors.textPrimary }]}>
                  {c.name}
                </Text>
                <Text style={[typography.small, { color: colors.primary }]}>{c.count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Column header */}
      <View style={[styles.row, styles.headerRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.colHole, typography.caption, { color: colors.textSecondary }]}>Hole</Text>
        <Text style={[styles.colPar, typography.caption, { color: colors.textSecondary }]}>Par</Text>
        <Text style={[styles.colPlayer, typography.caption, { color: colors.textSecondary }]}>Player</Text>
        <Text style={[styles.colPts, typography.caption, { color: colors.textSecondary }]}>Pts</Text>
        <Text style={[styles.colShots, typography.caption, { color: colors.textSecondary }]}>Shots</Text>
      </View>

      {/* Hole rows */}
      {entry.holes.map((h) => (
        <View
          key={h.hole}
          style={[styles.row, { borderBottomColor: colors.borderLight ?? colors.border }]}
          accessibilityLabel={`Hole ${h.hole}, par ${h.par ?? 'unknown'}, ${shortNameFor(h.sourcePlayerId)}, ${h.points} points, ${h.strokes ?? 'no'} shots`}
        >
          <Text style={[styles.colHole, typography.body, { color: colors.textPrimary }]}>{h.hole}</Text>
          <Text style={[styles.colPar, typography.body, { color: colors.textSecondary }]}>
            {h.par ?? '—'}
          </Text>
          <Text
            style={[styles.colPlayer, typography.body, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {shortNameFor(h.sourcePlayerId)}
          </Text>
          <Text style={[styles.colPts, typography.body, { color: colors.primary }]}>{h.points}</Text>
          <Text style={[styles.colShots, typography.body, { color: colors.textSecondary }]}>
            {h.strokes ?? '—'}
          </Text>
        </View>
      ))}

      {/* Total */}
      <View style={[styles.row, styles.totalRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.colHole, typography.body, { color: colors.textPrimary }]}>Tot</Text>
        <Text style={[styles.colPar, typography.body, { color: colors.textSecondary }]} />
        <Text style={[styles.colPlayer, typography.body, { color: colors.textSecondary }]} />
        <Text style={[styles.colPts, typography.body, styles.bold, { color: colors.primary }]}>
          {entry.total}
        </Text>
        <Text style={[styles.colShots, typography.body, { color: colors.textSecondary }]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.sm,
  },
  contrib: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  contribTitle: {
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  contribRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  contribItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contribName: {
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    borderBottomWidth: 1,
  },
  totalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 1,
    marginTop: spacing.xs,
  },
  bold: {
    fontWeight: '700',
  },
  colHole: { width: 44 },
  colPar: { width: 40, textAlign: 'center' },
  colPlayer: { flex: 1 },
  colPts: { width: 44, textAlign: 'right' },
  colShots: { width: 52, textAlign: 'right' },
});
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS. If `colors.borderLight` is not on the palette, the `?? colors.border` fallback covers it at runtime, but if TypeScript errors on `colors.borderLight`, change that style to just `{ borderBottomColor: colors.border }`. (Verify with `grep -n "borderLight" src/constants/colors.ts`.)

- [ ] **Step 3: Lint the new file**

Run: `npx eslint src/components/competitions/ringer/RingerTeamCard.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/competitions/ringer/RingerTeamCard.tsx
git commit -m "feat(ringer): RingerTeamCard with contributions and vertical hole list"
```

---

## Task 3: Wire `RingerBoard` to use `RingerTeamCard` for teams

**Files:**
- Modify: `src/components/competitions/ringer/index.ts`
- Modify: `src/components/competitions/ringer/RingerBoard.tsx`

- [ ] **Step 1: Export `RingerTeamCard` from the barrel**

In `src/components/competitions/ringer/index.ts`, add:

```typescript
export { RingerTeamCard } from './RingerTeamCard';
```

- [ ] **Step 2: Import it in `RingerBoard`**

In `src/components/competitions/ringer/RingerBoard.tsx`, next to the existing `import { RingerScorecard } from './RingerScorecard';` add:

```typescript
import { RingerTeamCard } from './RingerTeamCard';
```

- [ ] **Step 3: Render the team card for the teams view**

In `RingerBoard.tsx`, find the expanded-body line:

```typescript
              {expanded && <RingerScorecard entry={entry} shortNameFor={shortNameFor} />}
```

Replace it with:

```typescript
              {expanded &&
                (view === 'teams' ? (
                  <RingerTeamCard entry={entry} shortNameFor={shortNameFor} />
                ) : (
                  <RingerScorecard entry={entry} shortNameFor={shortNameFor} />
                ))}
```

- [ ] **Step 4: Type-check and lint**

Run: `pnpm type-check`
Expected: PASS.

Run: `npx eslint src/components/competitions/ringer/RingerBoard.tsx src/components/competitions/ringer/index.ts`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/competitions/ringer/RingerBoard.tsx src/components/competitions/ringer/index.ts
git commit -m "feat(ringer): render vertical team card on the teams sub-tab"
```

---

## Task 4: Full verification

- [ ] **Step 1: Run the ringer unit tests**

Run: `pnpm test src/utils/ringer/computeRingerBoard.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 2: Type-check + lint the touched files**

Run: `pnpm type-check`
Expected: clean.

Run: `npx eslint src/utils/ringer src/components/competitions/ringer`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run the app, open a competition with a non-Scramble round that has finished scorecards, go to the **Ringer** tab → **Teams**:
1. Expand a team. Confirm the **Hole contributions** row appears at the top, members ranked by count (highest first).
2. Confirm the vertical table shows Hole · Par · Player · Pts · Shots for all 18 holes, with `—` on any unplayed hole, and a Total row.
3. Switch to **Individual** — confirm it still shows the original horizontal grid (unchanged).

---

## Self-review notes (addressed)

- **Spec coverage:** vertical list with Hole/Par/Player/Points/Shots (Task 2); contributions mini-leaderboard ranked at top, ties by name (Task 2 `contributions` sort); par as its own column (Task 2 styles); Teams-only — Individual keeps horizontal grid (Task 3 conditional); par/strokes data (Task 1); no-score → `—`/null/0 and excluded from contributions (Task 1 test + Task 2 tally guard); tests for par/strokes (Task 1).
- **Type consistency:** `RingerHole.par`/`strokes` (`number | null`) defined in Task 1 and consumed in Task 2; `HolePlay` helper name consistent; `shortNameFor` signature matches the existing `RingerBoard` callback; `RingerTeamCard` props mirror `RingerScorecard`.
- **No new DB/hook work** — the hook already provides scorecards + holes that carry strokes/par.
