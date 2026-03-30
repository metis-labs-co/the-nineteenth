# League Net Differential Leaderboard

## Context

The league leaderboard currently ranks players by WHS handicap differential (best 8 of last 20 rounds, averaged). This measures absolute playing ability relative to course difficulty, meaning lower handicap players inherently dominate the leaderboard. A 5-handicap who shoots their handicap always gets a better differential than a 9-handicap who shoots theirs.

This change adds a **Net** mode that levels the playing field by subtracting each player's handicap index (snapshotted at round time) from the differential. Both modes are available via a toggle, so users can see "who's the best golfer" (Gross) and "who's playing best relative to their ability" (Net).

## Design

### Net Differential Formula

```
Net Differential = WHS Differential - ga_handicap_used
```

- `WHS Differential` = `(113 / slope) x (gross - course_rating)` (already calculated and stored)
- `ga_handicap_used` = player's WHS handicap index snapshotted on the scorecard at submission time
- Lower net = better performance relative to handicap
- Negative values are normal (player beat their handicap)

### Data Integrity

All handicap values are **frozen at round time** on the scorecard:
- `ga_handicap_used` - WHS handicap index at submission (does not change if player updates profile)
- `daily_handicap_used` - course-adjusted strokes received
- `course_rating_used`, `slope_rating_used` - rating snapshots

This ensures historical accuracy. A player's current handicap changes do not retroactively affect past rounds.

### Best-8 Selection is Mode-Independent

The "best 8 of last 20" selection runs **independently per mode**. A player's best 8 gross rounds may differ from their best 8 net rounds because the net calculation changes which rounds rank highest. The SQL function handles this with a `CASE` expression in the window function's `ORDER BY`.

### Null Handicap Handling

When `ga_handicap_used` is null (e.g., player had no handicap set at round time):
- `COALESCE(ga_handicap_used, 0)` treats it as 0
- Net differential equals gross differential for that round (no adjustment)
- HC column shows the average of non-null values; displays "-" if all null

## UI Changes

### Toggle

A **Gross / Net** toggle appears above the leaderboard card, following the existing `ViewToggle` pattern (gray container, white selected button with shadow, equal-width buttons).

Default mode: **Gross** (maintains current behavior).

### Table Columns

```
[Gross]  [Net]

#  | Player           | HC   | Avg   | Best
T  | You              | 5.0  | -0.2  | -1.5
2  | Mike             | 9.0  | -0.1  | -0.8
3  | John             | 15.0 |  0.3  |  0.0
```

- **HC** (new column): Average `ga_handicap_used` across counting rounds. Displays in both modes, value doesn't change per mode. Shows "-" if no handicap data.
- **Avg** and **Best**: Values change based on selected mode (gross or net differentials).
- Rankings, tied detection, and trophy/highlighting all update based on active mode.

### Column Widths

| Column | Width | Alignment |
|--------|-------|-----------|
| # | minWidth: 32 | center |
| Player | flex: 1 | left |
| HC | minWidth: 40 | right |
| Avg | minWidth: 46 | right |
| Best | minWidth: 46 | right |

## Database

### New Function: `get_league_leaderboard_v2`

```sql
CREATE OR REPLACE FUNCTION get_league_leaderboard_v2(
  p_league_id UUID,
  p_sort_mode TEXT DEFAULT 'gross'
)
RETURNS TABLE (
  player_id UUID,
  name TEXT,
  photo_url TEXT,
  rounds_played INTEGER,
  rounds_counting INTEGER,
  avg_differential NUMERIC(4,1),
  best_differential NUMERIC(4,1),
  avg_handicap NUMERIC(4,1),
  rank INTEGER
)
```

Logic:
1. JOIN `league_rounds` to `scorecards` to get `ga_handicap_used`
2. Compute `net_differential = handicap_differential - COALESCE(ga_handicap_used, 0)` per round
3. Window last 20 rounds per player (by `tagged_at DESC`)
4. Select best N using `CASE WHEN p_sort_mode = 'net' THEN net_differential ELSE handicap_differential END` in `ORDER BY`
5. AVG and MIN of the mode-specific value for counting rounds
6. AVG of `ga_handicap_used` (excluding nulls via `NULLIF`) for the HC column
7. RANK by `avg_differential ASC`

Handles `round_limit` leagues with custom window/counting sizes (existing logic preserved).

The old `get_league_leaderboard` function remains untouched for backward compatibility.

## TypeScript Changes

### New Type

```typescript
export type LeagueSortMode = 'gross' | 'net';
```

### Updated Interface

```typescript
export interface LeagueLeaderboardEntry {
  player_id: string;
  name: string;
  photo_url: string | null;
  rounds_played: number;
  rounds_counting: number;
  avg_differential: number;
  best_differential: number;
  avg_handicap: number | null;  // NEW
  rank: number;
}
```

## Query / Hook Changes

### Query Key

```typescript
// features.ts - leagueKeys
leaderboardBase: (leagueId: string) => [...leagueKeys.all, 'leaderboard', leagueId] as const,
leaderboard: (leagueId: string, sortMode?: string) =>
  [...leagueKeys.leaderboardBase(leagueId), sortMode ?? 'gross'] as const,
```

### Service

`getLeagueLeaderboard(leagueId, sortMode)` calls `get_league_leaderboard_v2` with `p_sort_mode`.

### Hook

`useLeagueLeaderboard(leagueId, enabled, sortMode)` includes `sortMode` in the query key. TanStack Query caches gross and net results separately; toggling back is instant.

### Invalidation

Mutations (tag/untag/leave/join) invalidate using `leagueKeys.leaderboardBase(leagueId)` which prefix-matches both gross and net cache entries.

## State Management

`useLeagueDetail` adds:
- `leaderboardSortMode: LeagueSortMode` state (default: `'gross'`)
- `setLeaderboardSortMode` setter
- Passes sort mode to `useLeagueLeaderboard`
- Returns both to the screen

## Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/2026XXXX_league_leaderboard_v2.sql` | New `get_league_leaderboard_v2` function |
| `src/types/database/league.types.ts` | Add `LeagueSortMode` type, add `avg_handicap` to `LeagueLeaderboardEntry` |
| `src/hooks/queryKeys/features.ts` | Add `leaderboardBase` key, update `leaderboard` key to include sort mode |
| `src/services/api/leagues/queries.ts` | Update `getLeagueLeaderboard` to accept sort mode, call v2 |
| `src/hooks/useLeagues.ts` | Update `useLeagueLeaderboard` to accept sort mode; update invalidation to use `leaderboardBase` |
| `src/screens/leagues/LeagueDetailScreen/hooks/useLeagueDetail.ts` | Add `leaderboardSortMode` state, pass to hook, return to screen |
| `src/screens/leagues/LeagueDetailScreen/components/LeaderboardTab.tsx` | Add Gross/Net toggle, add HC column header |
| `src/components/leagues/LeagueLeaderboardRow.tsx` | Add HC column between Player and Avg |
| `src/screens/leagues/LeagueDetailScreen/index.tsx` | Wire `sortMode` and `onSortModeChange` props to LeaderboardTab |

## Verification

1. **SQL**: Run the v2 function with both `'gross'` and `'net'` modes against seed data; verify rankings differ and best-8 selection is mode-independent
2. **Toggle**: Switch between Gross and Net; verify rankings re-sort, values change, trophy/highlighting update
3. **Cache**: Toggle from Gross to Net (network request), back to Gross (instant from cache)
4. **HC Column**: Verify it shows in both modes with correct average handicap values
5. **Null handicap**: Test with a player who has no `ga_handicap_used`; verify HC shows "-" and net diff equals gross diff
6. **Tag/untag**: Tag a round, verify both gross and net caches invalidate
7. **Negative values**: Verify negative net differentials display correctly (e.g., "-0.2")
8. **Tied detection**: Verify ties are detected correctly in net mode
