# Advanced Stats & Tabbed Statistics Screens

## Context

The My Statistics and Compare Stats screens are currently long single-scroll layouts. As the app captures more detailed per-hole data (fairway/green miss directions, bunker shots, hazards), these advanced stats need to surface as aggregate insights — not just per-round views. This redesign restructures both screens into 3-tab layouts, adds new advanced stat sections with directional diagrams and sparkline trends, and gates the new content behind the Premium tier.

## Design Decisions

- **3 tabs** (Overview, Scoring, Game Stats) for both My Statistics and Compare Stats
- **Split by stat type**, not by tier — golfers think in game areas, not subscription levels
- **Directional diagrams** (SVG) for fairway/green miss tendencies
- **Sparkline mini-trends** for key stats (last 10 rounds)
- **Refactor in-place** — move existing sections into tab components, add new ones
- **Premium tier** gating for advanced stats (miss directions, bunkers, hazards)
- **Aggregates + trends** — not just totals, but per-round sparklines

---

## Tab Structure

### My Statistics Screen

```
PageHeader
[Overview] [Scoring] [Game Stats]    ← StatisticsTabBar (existing Tabs component)
ScrollView (RefreshControl)
  {activeTab content}
```

State: `useState<'overview' | 'scoring' | 'gameStats'>('overview')`

### Tab Content

| Tab | Sections | Tier |
|-----|----------|------|
| **Overview** | Rounds/Comps/Wins grid, Round Breakdown, Averages, Recent Activity | Free |
| **Scoring** | Score Distribution (Social+), Par Type Stats (Social+), Performance Trends (Premium), Best Performances (Premium), Courses Played (Premium) |  Mixed |
| **Game Stats** | Driving — FIR% + miss direction diagram + sparkline (Premium), Approach — GIR% + miss direction diagram + sparkline (Premium), Short Game — scrambling, bogey avoidance (Social+), Putting — avg, 1-putt%, 3-putt% (Social+), Bunkers — total, avg/round, holes% (Premium), Hazards — breakdown by type, avg/round (Premium) | Mixed |

All tabs visible to all tiers. Locked sections show `FeatureLock` overlays as upsell.

### Compare Stats Screen

Same 3-tab structure. `PlayerCompareHeader` + filter badge sit above the tab bar. Each tab renders side-by-side comparison rows.

---

## Data Model Additions

### New Types (`src/hooks/playerStatistics/types.ts`)

```typescript
export interface FairwayMissDirectionStats {
  leftCount: number;
  rightCount: number;
  totalMisses: number;
  leftPercentage: number | null;   // null if totalMisses === 0
  rightPercentage: number | null;
}

export interface GreenMissDirectionStats {
  leftCount: number;
  rightCount: number;
  longCount: number;
  shortCount: number;
  totalMisses: number;
  leftPercentage: number | null;
  rightPercentage: number | null;
  longPercentage: number | null;
  shortPercentage: number | null;
}

export interface BunkerStats {
  totalBunkerShots: number;
  holesWithBunkers: number;
  totalHolesTracked: number;
  averageBunkerShotsPerRound: number | null;
  holesWithBunkersPercentage: number | null;
}

export interface HazardStats {
  waterCount: number;
  obCount: number;
  lateralCount: number;
  lostBallCount: number;
  totalHazards: number;
  averageHazardsPerRound: number | null;
  holesWithHazards: number;
  totalHolesTracked: number;
}

export interface RoundStatPoint {
  roundId: string;
  date: string;
  grossScore: number;
  points: number;
  fairwayPercentage: number | null;
  girPercentage: number | null;
  averagePutts: number | null;
  scramblingPercentage: number | null;
}
```

### New Fields on `PlayerStatistics`

```typescript
fairwayMissDirection: FairwayMissDirectionStats;
greenMissDirection: GreenMissDirectionStats;
bunkerStats: BunkerStats;
hazardStats: HazardStats;
roundTrends: RoundStatPoint[];  // last 10 rounds, oldest-to-newest
```

### Computation

All computed client-side within the existing `usePlayerStatistics` query loop. The loop already iterates every hole score — we collect the additional fields (`fairwayMissDirection`, `greenMissDirection`, `bunkerShots`, `hazards`) and run 4 new helper functions after the loop.

Per-round sparkline data: built during the scorecard loop by aggregating per-scorecard FIR%, GIR%, avg putts, scrambling%. Sorted by date, last 10 kept.

---

## New Visual Components

### Shared Components (`src/components/statistics/`)

| Component | Description | Size |
|-----------|-------------|------|
| `FairwayMissDirectionDiagram` | SVG left/right bar split with center fairway icon. Red/orange bars proportional to miss %. | ~200x80 (compact: 120x60) |
| `GreenMissDirectionDiagram` | SVG quadrant with center green circle. Labels at 4 cardinal points. Filled wedges proportional to %. | ~160x160 (compact: 100x100) |
| `SparklineChart` | Minimal SVG polyline, no axes/labels. Renders nothing if < 2 data points. | ~80x24 |
| `DrivingSection` | FIR% stat card + sparkline + `FairwayMissDirectionDiagram`. | Full width |
| `ApproachSection` | GIR% stat card + sparkline + `GreenMissDirectionDiagram`. | Full width |
| `BunkerStatsSection` | Total shots, avg/round, holes-with-bunker %. Follows `ShortGameSection` card pattern. | Full width |
| `HazardStatsSection` | Breakdown by type with Tabler icons + count rows, avg/round. | Full width |

All diagrams use `react-native-svg` (already a dependency). Gray outlines with "No data" text when no tracking data exists.

### Compare Mode

Miss direction diagrams render at compact size, side-by-side with player names. Sparklines omitted in compare mode.

---

## Tier Gating

| Tab | Section | Feature ID | Min Tier |
|-----|---------|-----------|----------|
| Overview | All sections | `basic_stats` | Free |
| Scoring | Score Distribution | `score_distribution` | Social+ |
| Scoring | Par Type Stats | `detailed_stats` | Social+ |
| Scoring | Performance Trends | `advanced_stats` | Premium |
| Scoring | Best Performances | `advanced_stats` | Premium |
| Scoring | Courses Played | `advanced_stats` | Premium |
| Game Stats | Driving (FIR%) | `fir_gir_tracking` | Premium |
| Game Stats | Driving (miss diagram) | `advanced_stats` | Premium |
| Game Stats | Approach (GIR%) | `fir_gir_tracking` | Premium |
| Game Stats | Approach (miss diagram) | `advanced_stats` | Premium |
| Game Stats | Short Game | `detailed_stats` | Social+ |
| Game Stats | Putting | `detailed_stats` | Social+ |
| Game Stats | Bunkers | `advanced_stats` | Premium |
| Game Stats | Hazards | `advanced_stats` | Premium |

Tabs themselves are never hidden — locked content shows `FeatureLock` overlays as discovery/upsell.

---

## No-Data Handling

| Component | Condition | Display |
|-----------|-----------|---------|
| `FairwayMissDirectionDiagram` | `totalMisses === 0` | Gray outline + "No miss direction data yet" |
| `GreenMissDirectionDiagram` | `totalMisses === 0` | Gray outline + "No GIR miss data yet" |
| `BunkerStatsSection` | `totalHolesTracked === 0` | EmptyState compact: "Enable bunker tracking in Settings" |
| `HazardStatsSection` | `totalHolesTracked === 0` | EmptyState compact: "Enable hazard tracking in Settings" |
| `SparklineChart` | `data.length < 2` | Renders nothing |
| `DrivingSection` | FIR not enabled | EmptyState: "Enable fairway tracking in Settings" |
| `ApproachSection` | GIR not enabled | EmptyState: "Enable GIR tracking in Settings" |
| Entire Game Stats tab | No tracking enabled | Full-tab EmptyState |

Compare mode: if one player has data and the other doesn't, show diagram for the player with data and "No data" placeholder for the other.

---

## File Changes

### New Files (16)

**Shared components** (`src/components/statistics/`):
- `SparklineChart.tsx`
- `FairwayMissDirectionDiagram.tsx`
- `GreenMissDirectionDiagram.tsx`
- `BunkerStatsSection.tsx`
- `HazardStatsSection.tsx`
- `DrivingSection.tsx`
- `ApproachSection.tsx`

**My Statistics tabs** (`src/screens/profile/MyStatisticsScreen/components/`):
- `StatisticsTabBar.tsx`
- `OverviewTab.tsx`
- `ScoringTab.tsx`
- `GameStatsTab.tsx`

**Compare Stats tabs** (`src/screens/social/compare/`):
- `CompareTabBar.tsx`
- `CompareOverviewTab.tsx`
- `CompareScoringTab.tsx`
- `CompareGameStatsTab.tsx`
- `index.ts`

### Modified Files (9)

- `src/hooks/playerStatistics/types.ts` — new interfaces, extend PlayerStatistics
- `src/hooks/playerStatistics/helpers.ts` — 4 new calculation functions
- `src/hooks/playerStatistics/queries.ts` — extend data collection loop, call new helpers
- `src/hooks/playerStatistics/index.ts` — export new types
- `src/components/statistics/index.ts` — export new components
- `src/screens/profile/MyStatisticsScreen/index.tsx` — replace scroll with tabs
- `src/screens/profile/MyStatisticsScreen/components/index.ts` — export tab components
- `src/screens/profile/MyStatisticsScreen/hooks/useStatsUpgradePrompt.ts` — new game stats handler
- `src/screens/social/CompareStatsScreen.tsx` — replace with tabbed layout

### Decomposed (2)

- `AdvancedAnalytics.tsx` — content splits between ScoringTab (trends, best performances, courses) and GameStatsTab. Removed after tabs are stable.
- `GameStats.tsx` — basic putts/FIR%/GIR% display is superseded by the more detailed `DrivingSection`, `ApproachSection`, and `PuttingAnalysisSection` in GameStatsTab. Removed after tabs are stable.

---

## Implementation Order

1. **Data layer** — types.ts → helpers.ts → queries.ts (foundation, no UI changes)
2. **Shared visual components** — sparkline, diagrams, section wrappers (independent of screen refactor)
3. **My Statistics tab refactor** — tab bar + 3 tab components + rewire index.tsx
4. **Compare Stats tab refactor** — tab bar + 3 comparison tab components + rewire screen
5. **Polish** — no-data states, tier gating verification, testing

---

## Verification

1. **Tier gating**: Test each tab section with Free, Social, and Premium accounts. Verify FeatureLock overlays appear for locked sections and upgrade prompts work.
2. **No-data states**: Test with a user who has no advanced stats tracked. Verify empty states render correctly with appropriate messages.
3. **Data accuracy**: Compare aggregate stats (miss direction %, bunker counts, hazard counts) against manual count from raw scorecard data for a known round.
4. **Sparklines**: Verify sparklines show correct trends by checking against the last 10 rounds' actual FIR%/GIR%/putts.
5. **Compare screen**: Test comparison between two players where one has advanced stats and the other doesn't.
6. **Tab navigation**: Verify tabs switch cleanly, scroll position resets per tab, and pull-to-refresh works.
7. **Type check**: `pnpm type-check` passes.
8. **Lint**: `pnpm lint` passes.
