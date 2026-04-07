# Course Statistics Enhancement — Design Spec

## Problem

The CourseStatisticsScreen currently shows basic stats (overview, score distribution, averages, par type breakdown, a static hole-by-hole table, and recent rounds) in a single scrollable view. Users want:

1. **Course trends over time** — see how their scoring at this course is trending
2. **Advanced stats scoped to this course** — fairway miss direction, GIR miss direction, scrambling, putting depth, bunkers, hazards
3. **Per-hole drill-down** — tap a hole to see its score trend, score distribution breakdown, and key stats

## Design

### Screen Structure: Three Tabs

The screen adopts a **three-tab layout** mirroring the My Statistics screen pattern:

```
┌─────────────────────────────────────────┐
│  PageHeader: "Course Name"  [↻]  [←]   │
├─────────┬──────────┬────────────────────┤
│ Overview │  Holes  │  Game Stats        │
├─────────┴──────────┴────────────────────┤
│                                         │
│  (Tab content — scrollable)             │
│                                         │
└─────────────────────────────────────────┘
```

Uses the existing `Tabs` component (same as `StatisticsTabBar` pattern).

---

### Tab 1: Overview

Vertical scroll with these sections in order:

1. **Score Trend** — `PerformanceChart` component (already exists) showing gross score across recent rounds at this course. Single metric (gross score), ordered by date.

2. **Overview Stats** — 2×2 `StatCard` grid: times played, avg score, best score, worst score.

3. **Score Distribution** — 3×2 `StatCard` grid: eagles, birdies, pars, bogeys, double bogeys, triple+.

4. **Averages** — `StatCard` row: avg Stableford points, avg per hole, par or better %.

5. **Par Type Stats** — Reuse `ParTypeStatsSection` component (par 3/4/5 breakdown).

6. **Recent Rounds** — Last 5 rounds at this course using `RecentRoundRow`.

---

### Tab 2: Holes

Two parts: a sticky hole selector and a detail area below.

#### Hole Selector Strip

- Horizontal `ScrollView` (or `FlatList`) pinned at the top of the tab content
- Each hole rendered as a **mini stat card**: hole number, par, user's avg score
- Selected hole has primary color background + border; unselected are surface color
- Cards are ~60px wide, ~72px tall, with 8px gap
- State managed with `useState<number>` defaulting to hole 1

#### Per-Hole Detail (below the selector)

When a hole is selected, display:

1. **Hole Header** — "Hole {n}" + "Par {p}" + avg score prominent

2. **Score Trend Sparkline** — `SparklineChart` component showing the user's score at this hole across rounds, ordered by date. Needs per-hole per-round data points.

3. **Score Distribution Bars** — Horizontal bars showing percentage breakdown:
   - Birdie or better %
   - Par %
   - Bogey %
   - Double bogey+ %
   
   Use `ScoreDistributionBar` component (already exists).

4. **Stat Cards** — 2×2 grid:
   - Avg putts (if data exists)
   - GIR % (if data exists)
   - Fairway % (par 4/5 only, if data exists)
   - Best / Worst scores

---

### Tab 3: Game Stats

All stats scoped to this course. Reuses existing section components with course-filtered data:

1. **Driving Section** — `DrivingSection` component: FIR%, sparkline trend, `FairwayMissDirectionDiagram`
2. **Approach Section** — `ApproachSection` component: GIR%, sparkline trend, `GreenMissDirectionDiagram`
3. **Short Game Section** — `ShortGameSection` component: scrambling %, attempts, bogey avoidance, double+ rate
4. **Putting Section** — `PuttingAnalysisSection` component: one-putt%, three-putt%, putts per GIR
5. **Bunker Stats Section** — `BunkerStatsSection` component
6. **Hazard Stats Section** — `HazardStatsSection` component

---

## Data Changes

### Expand `CourseStatisticsData` type

Add these fields to the existing type:

```typescript
// Advanced stats (course-level)
shortGame: ShortGameStats;
puttingDepth: PuttingDepthStats;
fairwayMissDirection: FairwayMissDirectionStats;
greenMissDirection: GreenMissDirectionStats;
bunkerStats: BunkerStats;
hazardStats: HazardStats;

// Putting / Fairway / GIR aggregates
totalPutts: number | null;
averagePuttsPerRound: number | null;
averagePuttsPerHole: number | null;
holesWithPuttsRecorded: number;
fairwaysHit: number | null;
fairwayOpportunities: number;
fairwayPercentage: number | null;
greensInRegulation: number | null;
girOpportunities: number;
girPercentage: number | null;

// Per-round trend data (for PerformanceChart)
roundTrends: RoundStatPoint[];
```

### Expand `HoleStatistics` type

Add per-hole breakdown fields:

```typescript
// Score distribution percentages
birdieOrBetterPercentage: number;
parPercentage: number;
bogeyPercentage: number;
doublePlusPercentage: number;

// Per-round scores at this hole (for sparkline)
scoreTrend: { date: string; score: number }[];
```

### Expand `useCourseStatistics` hook

The hook already iterates all scorecards and builds `allHoleScores: EnrichedHoleScore[]`. Changes:

1. **Call existing advanced helpers** on `allHoleScores`:
   - `calculateShortGameStats(allHoleScores)`
   - `calculatePuttingDepthStats(allHoleScores)`
   - `calculateFairwayMissDirectionStats(allHoleScores)`
   - `calculateGreenMissDirectionStats(allHoleScores)`
   - `calculateBunkerStats(allHoleScores, timesPlayed)`
   - `calculateHazardStats(allHoleScores, timesPlayed)`

2. **Aggregate putting/fairway/GIR totals** (same pattern as `queries.ts`).

3. **Build `roundTrends`** array — per-round data points with date, gross score, points, FIR%, GIR%, avg putts, scrambling%. Same shape as the global `RoundStatPoint` type.

4. **Expand hole aggregation** to track:
   - Score distribution counts per hole (birdie+, par, bogey, double+)
   - Per-round score at each hole for sparkline trend data

---

## Component Changes

### New Components

1. **`CourseStatisticsTabBar`** — Tab bar with 3 tabs (Overview, Holes, Game Stats). Reuses `Tabs` component.

2. **`HoleSelectorStrip`** — Horizontal scrolling strip of mini stat cards. Props: `holeStats: HoleStatistics[]`, `selectedHole: number`, `onSelectHole: (n: number) => void`.

3. **`HoleDetailView`** — Displays breakdown for a selected hole. Props: `hole: HoleStatistics`. Contains sparkline, score distribution bars, stat cards.

4. **`CourseOverviewTab`** — Overview tab content (extracted from current screen body). Adds score trend chart at top.

5. **`CourseHolesTab`** — Holes tab content with selector strip + detail view.

6. **`CourseGameStatsTab`** — Game stats tab content. Passes course-scoped data to existing section components.

### Modified Components

- **`CourseStatisticsScreen/index.tsx`** — Refactor from single scroll to tabbed layout with `useState<Tab>` and tab bar.

### Reused Components (no changes needed)

- `PerformanceChart` — Score trend on Overview tab
- `SparklineChart` — Per-hole score trend on Holes tab
- `ScoreDistributionBar` — Per-hole score breakdown
- `ParTypeStatsSection` — Par 3/4/5 on Overview tab
- `DrivingSection`, `ApproachSection`, `ShortGameSection`, `PuttingAnalysisSection`, `BunkerStatsSection`, `HazardStatsSection` — Game Stats tab
- `StatCard`, `SectionHeader`, `RecentRoundRow` — Used throughout

---

## Files Summary

### New files
| File | Purpose |
|------|---------|
| `src/screens/profile/CourseStatisticsScreen/components/CourseStatisticsTabBar.tsx` | 3-tab bar |
| `src/screens/profile/CourseStatisticsScreen/components/CourseOverviewTab.tsx` | Overview tab content |
| `src/screens/profile/CourseStatisticsScreen/components/CourseHolesTab.tsx` | Holes tab with selector + detail |
| `src/screens/profile/CourseStatisticsScreen/components/CourseGameStatsTab.tsx` | Game stats tab |
| `src/screens/profile/CourseStatisticsScreen/components/HoleSelectorStrip.tsx` | Horizontal hole card strip |
| `src/screens/profile/CourseStatisticsScreen/components/HoleDetailView.tsx` | Selected hole breakdown |

### Modified files
| File | Change |
|------|--------|
| `src/hooks/playerStatistics/types.ts` | Expand `CourseStatisticsData` and `HoleStatistics` types |
| `src/hooks/playerStatistics/courseQueries.ts` | Add advanced stats, trend data, per-hole distribution & trend |
| `src/screens/profile/CourseStatisticsScreen/index.tsx` | Refactor to tabbed layout |
| `src/screens/profile/CourseStatisticsScreen/components/index.ts` | Export new components |

---

## Verification

1. `pnpm type-check` — no TypeScript errors
2. Overview tab: score trend chart renders with course-specific rounds, all stat sections display
3. Holes tab: hole selector scrolls horizontally, tapping a hole updates detail below, sparkline and distribution bars render correctly
4. Game Stats tab: all 6 sections render with course-scoped data, miss direction diagrams display
5. Empty data: holes with no putt/GIR/fairway data show graceful fallbacks (dashes or hidden sections)
6. 9-hole courses: selector shows 9 holes only, no errors
7. Light and dark mode rendering
