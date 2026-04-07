# Course Statistics Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the CourseStatisticsScreen with a 3-tab layout (Overview / Holes / Game Stats), adding score trend charts, per-hole drill-down with a scrollable hole selector, and advanced stats (driving, approach, short game, putting, bunkers, hazards) scoped to the course.

**Architecture:** Refactor the existing single-scroll screen into a tabbed layout using the `Tabs` component. Expand the `useCourseStatistics` hook to calculate advanced stats (reusing existing helper functions) and per-hole trend/distribution data. Create new tab components and a hole selector strip. The `DrivingSection`/`ApproachSection` components are coupled to `PlayerStatistics`, so the Game Stats tab renders driving/approach sections inline using primitive components (`SparklineChart`, `FairwayMissDirectionDiagram`, `GreenMissDirectionDiagram`).

**Tech Stack:** React Native, TypeScript, TanStack Query, React Native Paper, react-native-gifted-charts (via PerformanceChart), react-native-svg (via SparklineChart)

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `src/screens/profile/CourseStatisticsScreen/components/CourseStatisticsTabBar.tsx` | 3-tab bar (Overview / Holes / Game Stats) |
| `src/screens/profile/CourseStatisticsScreen/components/CourseOverviewTab.tsx` | Overview tab content |
| `src/screens/profile/CourseStatisticsScreen/components/CourseHolesTab.tsx` | Holes tab with selector + detail |
| `src/screens/profile/CourseStatisticsScreen/components/CourseGameStatsTab.tsx` | Game Stats tab |
| `src/screens/profile/CourseStatisticsScreen/components/HoleSelectorStrip.tsx` | Horizontal scrolling hole cards |
| `src/screens/profile/CourseStatisticsScreen/components/HoleDetailView.tsx` | Selected hole breakdown |

### Modified files
| File | Change |
|------|--------|
| `src/hooks/playerStatistics/types.ts` | Expand `CourseStatisticsData` and `HoleStatistics` |
| `src/hooks/playerStatistics/courseQueries.ts` | Add advanced stats, trends, per-hole distribution |
| `src/screens/profile/CourseStatisticsScreen/index.tsx` | Refactor to tabbed layout |
| `src/screens/profile/CourseStatisticsScreen/components/index.ts` | Export new components |

### Deleted files
| File | Reason |
|------|--------|
| `src/screens/profile/CourseStatisticsScreen/components/HoleByHoleTable.tsx` | Replaced by HoleSelectorStrip + HoleDetailView |

---

## Task 1: Expand types

**Files:**
- Modify: `src/hooks/playerStatistics/types.ts`

- [ ] **Step 1: Add new fields to `HoleStatistics`**

In `src/hooks/playerStatistics/types.ts`, find the `HoleStatistics` interface and add score distribution percentages and trend data after `timesPlayed`:

```typescript
// Add after timesPlayed: number;

// Score distribution percentages
birdieOrBetterPercentage: number;
parPercentage: number;
bogeyPercentage: number;
doublePlusPercentage: number;

// Per-round scores at this hole (for sparkline, ordered by date)
scoreTrend: { date: string; score: number }[];
```

- [ ] **Step 2: Add new fields to `CourseStatisticsData`**

In the same file, find `CourseStatisticsData` and add after `recentRounds: RoundSummary[];`:

```typescript
// Advanced stats (course-level)
shortGame: ShortGameStats;
puttingDepth: PuttingDepthStats;
fairwayMissDirection: FairwayMissDirectionStats;
greenMissDirection: GreenMissDirectionStats;
bunkerStats: BunkerStats;
hazardStats: HazardStats;

// Driving / Approach / Putting aggregates
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

// Per-round trend data (for PerformanceChart + sparklines)
roundTrends: RoundStatPoint[];
```

- [ ] **Step 3: Run type check**

Run: `pnpm type-check`
Expected: Errors in `courseQueries.ts` (missing fields in return/empty). This is expected — we fix it in Task 2.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/playerStatistics/types.ts
git commit -m "feat: expand CourseStatisticsData and HoleStatistics types for enhanced course stats"
```

---

## Task 2: Expand useCourseStatistics hook

**Files:**
- Modify: `src/hooks/playerStatistics/courseQueries.ts`

- [ ] **Step 1: Add imports for advanced helpers and short game/putting helpers**

Add to the existing imports at the top of `courseQueries.ts`:

```typescript
import {
  countScoreDistribution,
  calculateParTypeStats,
  calculateShortGameStats,
  calculatePuttingDepthStats,
  getScoreCategory,
} from './helpers';
import {
  calculateFairwayMissDirectionStats,
  calculateGreenMissDirectionStats,
  calculateBunkerStats,
  calculateHazardStats,
} from './advancedHelpers';
```

Replace the existing single-line import of `countScoreDistribution, calculateParTypeStats` from `./helpers`.

Also add `RoundStatPoint` to the types import:

```typescript
import type {
  ScoreDistribution,
  RoundSummary,
  RoundStatPoint,
  HoleStatistics,
  CourseStatisticsData,
} from './types';
```

- [ ] **Step 2: Add tracking variables**

After the existing `let courseName = '';` (line 100), add:

```typescript
// Putting / FIR / GIR tracking
let totalPutts = 0;
let holesWithPuttsRecorded = 0;
let fairwaysHit = 0;
let fairwayOpportunities = 0;
let greensInRegulation = 0;
let girOpportunities = 0;
```

- [ ] **Step 3: Expand holeAgg map type**

Replace the holeAgg Map type (lines 106-118) to add score distribution and trend tracking:

```typescript
const holeAgg = new Map<number, {
  par: number;
  totalStrokes: number;
  count: number;
  best: number;
  worst: number;
  puttsSum: number;
  puttsCount: number;
  girHit: number;
  girOpps: number;
  fwHit: number;
  fwOpps: number;
  birdieOrBetter: number;
  pars: number;
  bogeys: number;
  doublePlus: number;
  scoreTrend: { date: string; score: number }[];
}>();
```

- [ ] **Step 4: Add per-round stats tracking**

After the `roundSummaries` array declaration (line 103), add:

```typescript
// Per-round stat tracking for sparklines
const perRoundStats: {
  roundId: string;
  date: string;
  grossScore: number;
  points: number;
  firHit: number;
  firOpps: number;
  girHit: number;
  girOpps: number;
  totalPutts: number;
  puttsHoles: number;
  missedGirs: number;
  scrambles: number;
}[] = [];
```

- [ ] **Step 5: Update the holeAgg initialization inside forEach**

In the `if (!holeAgg.has(holeNumber))` block (lines 175-183), add the new fields to the initial object:

```typescript
if (!holeAgg.has(holeNumber)) {
  holeAgg.set(holeNumber, {
    par,
    totalStrokes: 0, count: 0,
    best: Infinity, worst: 0,
    puttsSum: 0, puttsCount: 0,
    girHit: 0, girOpps: 0,
    fwHit: 0, fwOpps: 0,
    birdieOrBetter: 0,
    pars: 0,
    bogeys: 0,
    doublePlus: 0,
    scoreTrend: [],
  });
}
```

- [ ] **Step 6: Add per-hole score categorization and FIR/GIR/putt aggregation**

Inside the `Object.entries(scores).forEach` loop, after the existing `fwHit`/`fwOpps` tracking (line 201), add:

```typescript
// Per-hole score distribution
const diff = holeScore.strokes - par;
if (diff <= -1) agg.birdieOrBetter++;
else if (diff === 0) agg.pars++;
else if (diff === 1) agg.bogeys++;
else agg.doublePlus++;

// Course-level putt/FIR/GIR aggregation
if (typeof holeScore.putts === 'number' && holeScore.putts >= 0) {
  totalPutts += holeScore.putts;
  holesWithPuttsRecorded++;
}
if (par >= 4 && typeof holeScore.fairwayHit === 'boolean') {
  fairwayOpportunities++;
  if (holeScore.fairwayHit) fairwaysHit++;
}
if (typeof holeScore.greenInRegulation === 'boolean') {
  girOpportunities++;
  if (holeScore.greenInRegulation) greensInRegulation++;
}
```

- [ ] **Step 7: Add per-hole trend data collection**

Still inside the `Object.entries(scores).forEach` loop, after step 6 code, add:

```typescript
// Per-hole trend point
agg.scoreTrend.push({
  date: round.date || scorecard.submitted_at || '',
  score: holeScore.strokes,
});
```

- [ ] **Step 8: Add per-round stats collection**

After the `roundSummaries.push(...)` call (lines 206-218) and before the closing `});` of the scorecards.forEach, add:

```typescript
// Collect per-round stats for sparklines
let roundFirHit = 0, roundFirOpps = 0;
let roundGirHit = 0, roundGirOpps = 0;
let roundPutts = 0, roundPuttsHoles = 0;
let roundMissedGirs = 0, roundScrambles = 0;

Object.entries(scores).forEach(([hn, hs]) => {
  if (!hs?.strokes) return;
  const p = parMap.get(parseInt(hn, 10)) || 4;
  if (typeof hs.putts === 'number') { roundPutts += hs.putts; roundPuttsHoles++; }
  if (p >= 4 && typeof hs.fairwayHit === 'boolean') { roundFirOpps++; if (hs.fairwayHit) roundFirHit++; }
  if (typeof hs.greenInRegulation === 'boolean') {
    roundGirOpps++;
    if (hs.greenInRegulation) roundGirHit++;
    else {
      roundMissedGirs++;
      if (hs.strokes <= p) roundScrambles++;
    }
  }
});

perRoundStats.push({
  roundId: round.id,
  date: round.date || scorecard.submitted_at || '',
  grossScore: scorecard.total_gross || 0,
  points: scorecard.total_points || 0,
  firHit: roundFirHit,
  firOpps: roundFirOpps,
  girHit: roundGirHit,
  girOpps: roundGirOpps,
  totalPutts: roundPutts,
  puttsHoles: roundPuttsHoles,
  missedGirs: roundMissedGirs,
  scrambles: roundScrambles,
});
```

- [ ] **Step 9: Add advanced stats calculations before the return**

After the `recentRounds` calculation (line 269), add:

```typescript
// Advanced stats (reuse existing helpers)
const shortGame = calculateShortGameStats(allHoleScores);
const puttingDepth = calculatePuttingDepthStats(allHoleScores);
const fairwayMissDirection = calculateFairwayMissDirectionStats(allHoleScores);
const greenMissDirection = calculateGreenMissDirectionStats(allHoleScores);
const bunkerStatsData = calculateBunkerStats(allHoleScores, timesPlayed);
const hazardStatsData = calculateHazardStats(allHoleScores, timesPlayed);

// Putting / Fairway / GIR aggregates
const averagePuttsPerRound = holesWithPuttsRecorded > 0 && timesPlayed > 0
  ? Math.round((totalPutts / timesPlayed) * 10) / 10 : null;
const averagePuttsPerHole = holesWithPuttsRecorded > 0
  ? Math.round((totalPutts / holesWithPuttsRecorded) * 100) / 100 : null;
const fairwayPercentage = fairwayOpportunities > 0
  ? Math.round((fairwaysHit / fairwayOpportunities) * 1000) / 10 : null;
const girPercentage = girOpportunities > 0
  ? Math.round((greensInRegulation / girOpportunities) * 1000) / 10 : null;

// Build sparkline trend data (all rounds, ordered by date)
const roundTrends: RoundStatPoint[] = perRoundStats
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  .slice(-10)
  .map((r) => ({
    roundId: r.roundId,
    date: r.date,
    grossScore: r.grossScore,
    points: r.points,
    fairwayPercentage: r.firOpps > 0 ? Math.round((r.firHit / r.firOpps) * 1000) / 10 : null,
    girPercentage: r.girOpps > 0 ? Math.round((r.girHit / r.girOpps) * 1000) / 10 : null,
    averagePutts: r.puttsHoles > 0 ? Math.round((r.totalPutts / r.puttsHoles) * 100) / 100 : null,
    scramblingPercentage: r.missedGirs > 0 ? Math.round((r.scrambles / r.missedGirs) * 1000) / 10 : null,
  }));
```

- [ ] **Step 10: Update holeStats mapping to include new fields**

Replace the existing holeStats mapping (lines 240-259) with:

```typescript
const holeStats: HoleStatistics[] = Array.from(holeAgg.entries())
  .sort(([a], [b]) => a - b)
  .map(([holeNumber, agg]) => {
    const avg = Math.round((agg.totalStrokes / agg.count) * 100) / 100;
    const total = agg.birdieOrBetter + agg.pars + agg.bogeys + agg.doublePlus;
    const sortedTrend = [...agg.scoreTrend].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return {
      holeNumber,
      par: agg.par,
      averageScore: avg,
      scoreToPar: Math.round((avg - agg.par) * 100) / 100,
      bestScore: agg.best === Infinity ? 0 : agg.best,
      worstScore: agg.worst,
      averagePutts: agg.puttsCount > 0
        ? Math.round((agg.puttsSum / agg.puttsCount) * 100) / 100 : null,
      girPercentage: agg.girOpps > 0
        ? Math.round((agg.girHit / agg.girOpps) * 1000) / 10 : null,
      fairwayPercentage: agg.fwOpps > 0
        ? Math.round((agg.fwHit / agg.fwOpps) * 1000) / 10 : null,
      timesPlayed: agg.count,
      birdieOrBetterPercentage: total > 0
        ? Math.round((agg.birdieOrBetter / total) * 1000) / 10 : 0,
      parPercentage: total > 0
        ? Math.round((agg.pars / total) * 1000) / 10 : 0,
      bogeyPercentage: total > 0
        ? Math.round((agg.bogeys / total) * 1000) / 10 : 0,
      doublePlusPercentage: total > 0
        ? Math.round((agg.doublePlus / total) * 1000) / 10 : 0,
      scoreTrend: sortedTrend,
    };
  });
```

- [ ] **Step 11: Update the return object**

Replace the return object (lines 271-288) with:

```typescript
return {
  courseId,
  courseName,
  timesPlayed,
  averageGrossScore,
  bestGrossScore: bestGross === Infinity ? 0 : bestGross,
  worstGrossScore: worstGross,
  averageStablefordPoints,
  averageScorePerHole,
  parOrBetterPercentage,
  scoreDistribution: totalDistribution,
  totalScoreDistribution,
  holeStats,
  par3Stats,
  par4Stats,
  par5Stats,
  recentRounds,
  // Advanced stats
  shortGame,
  puttingDepth,
  fairwayMissDirection,
  greenMissDirection,
  bunkerStats: bunkerStatsData,
  hazardStats: hazardStatsData,
  // Aggregates
  totalPutts: holesWithPuttsRecorded > 0 ? totalPutts : null,
  averagePuttsPerRound,
  averagePuttsPerHole,
  holesWithPuttsRecorded,
  fairwaysHit: fairwayOpportunities > 0 ? fairwaysHit : null,
  fairwayOpportunities,
  fairwayPercentage,
  greensInRegulation: girOpportunities > 0 ? greensInRegulation : null,
  girOpportunities,
  girPercentage,
  roundTrends,
};
```

- [ ] **Step 12: Update `createEmptyCourseStatistics`**

Replace the return in `createEmptyCourseStatistics` (lines 302-319) with:

```typescript
return {
  courseId,
  courseName: '',
  timesPlayed: 0,
  averageGrossScore: 0,
  bestGrossScore: 0,
  worstGrossScore: 0,
  averageStablefordPoints: 0,
  averageScorePerHole: 0,
  parOrBetterPercentage: 0,
  scoreDistribution: { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubleBogeys: 0, triplePlus: 0 },
  totalScoreDistribution: 0,
  holeStats: [],
  par3Stats: emptyParTypeStats,
  par4Stats: emptyParTypeStats,
  par5Stats: emptyParTypeStats,
  recentRounds: [],
  shortGame: {
    scramblingPercentage: null, scrambleAttempts: 0, scramblesMade: 0,
    bogeyAvoidanceRate: 0, doubleBogeyOrWorseRate: 0,
  },
  puttingDepth: { onePuttPercentage: null, threePuttPercentage: null, puttsPerGIR: null },
  fairwayMissDirection: {
    leftCount: 0, rightCount: 0, totalMisses: 0, leftPercentage: null, rightPercentage: null,
  },
  greenMissDirection: {
    leftCount: 0, rightCount: 0, longCount: 0, shortCount: 0, totalMisses: 0,
    leftPercentage: null, rightPercentage: null, longPercentage: null, shortPercentage: null,
  },
  bunkerStats: {
    totalBunkerShots: 0, holesWithBunkers: 0, totalHolesTracked: 0,
    averageBunkerShotsPerRound: null, holesWithBunkersPercentage: null,
  },
  hazardStats: {
    waterCount: 0, obCount: 0, lateralCount: 0, lostBallCount: 0,
    totalHazards: 0, averageHazardsPerRound: null, holesWithHazards: 0, totalHolesTracked: 0,
  },
  totalPutts: null,
  averagePuttsPerRound: null,
  averagePuttsPerHole: null,
  holesWithPuttsRecorded: 0,
  fairwaysHit: null,
  fairwayOpportunities: 0,
  fairwayPercentage: null,
  greensInRegulation: null,
  girOpportunities: 0,
  girPercentage: null,
  roundTrends: [],
};
```

- [ ] **Step 13: Run type check**

Run: `pnpm type-check`
Expected: PASS (all new fields now provided)

- [ ] **Step 14: Commit**

```bash
git add src/hooks/playerStatistics/courseQueries.ts
git commit -m "feat: add advanced stats, trends, and per-hole distribution to useCourseStatistics"
```

---

## Task 3: Create tab bar and overview tab components

**Files:**
- Create: `src/screens/profile/CourseStatisticsScreen/components/CourseStatisticsTabBar.tsx`
- Create: `src/screens/profile/CourseStatisticsScreen/components/CourseOverviewTab.tsx`

- [ ] **Step 1: Create CourseStatisticsTabBar**

Create `src/screens/profile/CourseStatisticsScreen/components/CourseStatisticsTabBar.tsx`:

```typescript
/**
 * CourseStatisticsTabBar - Tab bar for course statistics screen
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Tabs, type TabItem } from '@/components/common/Tabs';
import { spacing } from '@/constants/theme';

export type CourseStatisticsTab = 'overview' | 'holes' | 'gameStats';

const TABS: TabItem<CourseStatisticsTab>[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'holes', label: 'Holes' },
  { key: 'gameStats', label: 'Game Stats' },
];

interface CourseStatisticsTabBarProps {
  selectedTab: CourseStatisticsTab;
  onTabChange: (tab: CourseStatisticsTab) => void;
}

export const CourseStatisticsTabBar = React.memo(function CourseStatisticsTabBar({
  selectedTab,
  onTabChange,
}: CourseStatisticsTabBarProps) {
  return (
    <Tabs
      tabs={TABS}
      selectedTab={selectedTab}
      onTabChange={onTabChange}
      size="medium"
      style={styles.tabs}
    />
  );
});

const styles = StyleSheet.create({
  tabs: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
});
```

- [ ] **Step 2: Create CourseOverviewTab**

Create `src/screens/profile/CourseStatisticsScreen/components/CourseOverviewTab.tsx`:

```typescript
/**
 * CourseOverviewTab - Overview tab for course statistics
 *
 * Displays score trend chart, overview stats, score distribution,
 * averages, par type stats, and recent rounds.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, shadows, borderRadius } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import {
  StatCard,
  RecentRoundRow,
  ParTypeStatsSection,
  PerformanceChart,
} from '@/components/statistics';
import { formatDateAustralian } from '@/utils/formatting';
import type { CourseStatisticsData } from '@/hooks/playerStatistics';

interface CourseOverviewTabProps {
  stats: CourseStatisticsData;
}

export const CourseOverviewTab = React.memo(function CourseOverviewTab({
  stats,
}: CourseOverviewTabProps) {
  const colors = useThemeColors();

  // Build chart data from recent rounds (ordered by date ascending)
  const chartRounds = [...stats.recentRounds]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((r) => ({ date: r.date, totalGross: r.totalGross, totalPoints: r.totalPoints }));

  return (
    <>
      {/* Score Trend */}
      {chartRounds.length >= 2 && (
        <>
          <SectionHeader title="Score Trend" icon="chart-line" />
          <PerformanceChart rounds={chartRounds} />
        </>
      )}

      {/* Overview Stats */}
      <View style={chartRounds.length >= 2 ? styles.sectionGap : undefined} />
      <SectionHeader title="Overview" icon="golf" />
      <View style={styles.statsGrid}>
        <StatCard title="Rounds Played" value={stats.timesPlayed} icon="flag-checkered" iconColor={colors.primary} />
        <StatCard title="Avg Score" value={stats.averageGrossScore || '-'} subtitle="per round" icon="counter" iconColor={colors.info} />
        <StatCard title="Best Score" value={stats.bestGrossScore || '-'} icon="trophy" iconColor={colors.success} />
        <StatCard title="Worst Score" value={stats.worstGrossScore || '-'} icon="flag-variant" iconColor={colors.error} />
      </View>

      {/* Score Distribution */}
      <View style={styles.sectionGap} />
      <SectionHeader title="Score Distribution" icon="chart-bar" />
      <View style={styles.statsGrid}>
        <StatCard title="Eagles" value={stats.scoreDistribution.eagles} icon="star-shooting" iconColor={colors.birdie} />
        <StatCard title="Birdies" value={stats.scoreDistribution.birdies} icon="star" iconColor={colors.birdie} />
        <StatCard title="Pars" value={stats.scoreDistribution.pars} icon="check-circle" iconColor={colors.par} />
        <StatCard title="Bogeys" value={stats.scoreDistribution.bogeys} icon="alert-circle" iconColor={colors.bogey} />
        <StatCard title="Double Bogeys" value={stats.scoreDistribution.doubleBogeys} icon="alert" iconColor={colors.doubleBogey} />
        <StatCard title="Triple+" value={stats.scoreDistribution.triplePlus} icon="alert-octagon" iconColor={colors.error} />
      </View>

      {/* Averages */}
      <View style={styles.sectionGap} />
      <SectionHeader title="Averages" icon="chart-line" />
      <View style={styles.statsGrid}>
        <StatCard title="Avg Points" value={stats.averageStablefordPoints || '-'} subtitle="Stableford" icon="star" iconColor={colors.warning} />
        <StatCard title="Per Hole" value={stats.averageScorePerHole.toFixed(2) || '-'} subtitle="strokes" icon="target" iconColor={colors.info} />
        <StatCard title="Par or Better" value={`${stats.parOrBetterPercentage}%`} subtitle="of holes" icon="check-circle" iconColor={colors.success} />
      </View>

      {/* Par Type Stats */}
      {(stats.par3Stats.holesPlayed > 0 || stats.par4Stats.holesPlayed > 0 || stats.par5Stats.holesPlayed > 0) && (
        <>
          <View style={styles.sectionGap} />
          <ParTypeStatsSection par3Stats={stats.par3Stats} par4Stats={stats.par4Stats} par5Stats={stats.par5Stats} />
        </>
      )}

      {/* Recent Rounds */}
      {stats.recentRounds.length > 0 && (
        <>
          <View style={styles.sectionGap} />
          <SectionHeader title="Recent Rounds" icon="history" />
          <View style={[styles.listCard, { backgroundColor: colors.surface }, shadows.sm]}>
            {stats.recentRounds.map((round, index) => (
              <RecentRoundRow
                key={round.roundId}
                date={formatDateAustralian(round.date)}
                courseName={round.courseName}
                competitionName={round.competitionName}
                totalGross={round.totalGross}
                totalPoints={round.totalPoints}
                gameType={round.gameType}
                isLast={index === stats.recentRounds.length - 1}
                isPracticeRound={round.isPracticeRound}
              />
            ))}
          </View>
        </>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  sectionGap: { marginTop: spacing.xl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  listCard: { borderRadius: borderRadius.lg, overflow: 'hidden' },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/profile/CourseStatisticsScreen/components/CourseStatisticsTabBar.tsx src/screens/profile/CourseStatisticsScreen/components/CourseOverviewTab.tsx
git commit -m "feat: create CourseStatisticsTabBar and CourseOverviewTab components"
```

---

## Task 4: Create hole selector and detail components

**Files:**
- Create: `src/screens/profile/CourseStatisticsScreen/components/HoleSelectorStrip.tsx`
- Create: `src/screens/profile/CourseStatisticsScreen/components/HoleDetailView.tsx`

- [ ] **Step 1: Create HoleSelectorStrip**

Create `src/screens/profile/CourseStatisticsScreen/components/HoleSelectorStrip.tsx`:

```typescript
/**
 * HoleSelectorStrip - Horizontal scrolling strip of hole mini-stat cards
 */

import React, { useRef, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { HoleStatistics } from '@/hooks/playerStatistics';

interface HoleSelectorStripProps {
  holeStats: HoleStatistics[];
  selectedHole: number;
  onSelectHole: (holeNumber: number) => void;
}

export const HoleSelectorStrip = React.memo(function HoleSelectorStrip({
  holeStats,
  selectedHole,
  onSelectHole,
}: HoleSelectorStripProps) {
  const colors = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);

  const handlePress = useCallback(
    (holeNumber: number, index: number) => {
      onSelectHole(holeNumber);
      // Scroll to center the selected card
      scrollRef.current?.scrollTo({ x: Math.max(0, index * 68 - 120), animated: true });
    },
    [onSelectHole]
  );

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      {holeStats.map((hole, index) => {
        const isSelected = hole.holeNumber === selectedHole;
        return (
          <TouchableOpacity
            key={hole.holeNumber}
            style={[
              styles.card,
              { backgroundColor: isSelected ? colors.primary : colors.surface },
              isSelected && { borderColor: colors.primaryLight },
              !isSelected && { borderColor: colors.border },
              shadows.sm,
            ]}
            onPress={() => handlePress(hole.holeNumber, index)}
            activeOpacity={0.7}
          >
            <Text style={[styles.holeLabel, { color: isSelected ? colors.white : colors.textSecondary }]}>
              Hole
            </Text>
            <Text style={[styles.holeNumber, { color: isSelected ? colors.white : colors.textPrimary }]}>
              {hole.holeNumber}
            </Text>
            <Text style={[styles.holeMeta, { color: isSelected ? colors.white : colors.textTertiary }]}>
              Par {hole.par} · {hole.averageScore.toFixed(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  card: {
    width: 60,
    height: 72,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  holeLabel: {
    ...typography.caption,
    fontSize: 10,
  },
  holeNumber: {
    ...typography.h3,
    lineHeight: 24,
  },
  holeMeta: {
    ...typography.caption,
    fontSize: 9,
  },
});
```

- [ ] **Step 2: Create HoleDetailView**

Create `src/screens/profile/CourseStatisticsScreen/components/HoleDetailView.tsx`:

```typescript
/**
 * HoleDetailView - Detailed breakdown for a selected hole
 *
 * Shows score trend sparkline, score distribution bars, and key stats.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import { StatCard, SparklineChart, ScoreDistributionBar } from '@/components/statistics';
import type { HoleStatistics } from '@/hooks/playerStatistics';

interface HoleDetailViewProps {
  hole: HoleStatistics;
}

export const HoleDetailView = React.memo(function HoleDetailView({
  hole,
}: HoleDetailViewProps) {
  const colors = useThemeColors();

  const scoreToParColor = hole.scoreToPar < -0.05 ? colors.birdie
    : hole.scoreToPar > 0.05 ? colors.bogey : colors.par;

  const scoreToParLabel = Math.abs(hole.scoreToPar) < 0.05 ? 'E'
    : `${hole.scoreToPar > 0 ? '+' : ''}${hole.scoreToPar.toFixed(1)}`;

  const trendData = hole.scoreTrend.map((t) => t.score);
  const totalDistribution = hole.birdieOrBetterPercentage + hole.parPercentage
    + hole.bogeyPercentage + hole.doublePlusPercentage;

  return (
    <>
      {/* Hole Header */}
      <View style={[styles.headerCard, { backgroundColor: colors.surface }, shadows.sm]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Hole {hole.holeNumber}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              Par {hole.par} · Played {hole.timesPlayed}x
            </Text>
          </View>
          <View style={styles.headerScores}>
            <Text style={[styles.avgScore, { color: colors.textPrimary }]}>
              {hole.averageScore.toFixed(1)}
            </Text>
            <Text style={[styles.scoreToPar, { color: scoreToParColor }]}>
              {scoreToParLabel}
            </Text>
          </View>
        </View>

        {/* Score Trend Sparkline */}
        {trendData.length >= 2 && (
          <View style={styles.sparklineRow}>
            <Text style={[styles.sparklineLabel, { color: colors.textTertiary }]}>
              Score trend
            </Text>
            <SparklineChart data={trendData} width={200} height={36} color={colors.primary} />
          </View>
        )}
      </View>

      {/* Score Distribution */}
      {totalDistribution > 0 && (
        <>
          <View style={styles.sectionGap} />
          <SectionHeader title="Score Distribution" icon="chart-bar" />
          <View style={[styles.distCard, { backgroundColor: colors.surface }, shadows.sm]}>
            <ScoreDistributionBar label="Birdie+" count={Math.round(hole.birdieOrBetterPercentage)} total={100} color={colors.birdie} />
            <ScoreDistributionBar label="Par" count={Math.round(hole.parPercentage)} total={100} color={colors.par} />
            <ScoreDistributionBar label="Bogey" count={Math.round(hole.bogeyPercentage)} total={100} color={colors.bogey} />
            <ScoreDistributionBar label="Double+" count={Math.round(hole.doublePlusPercentage)} total={100} color={colors.doubleBogey} />
          </View>
        </>
      )}

      {/* Stats Grid */}
      <View style={styles.sectionGap} />
      <SectionHeader title="Hole Stats" icon="golf" />
      <View style={styles.statsGrid}>
        {hole.averagePutts !== null && (
          <StatCard title="Avg Putts" value={hole.averagePutts.toFixed(1)} icon="golf" iconColor={colors.info} />
        )}
        {hole.girPercentage !== null && (
          <StatCard title="GIR" value={`${hole.girPercentage}%`} icon="bullseye-arrow" iconColor={colors.success} />
        )}
        {hole.fairwayPercentage !== null && (
          <StatCard title="Fairway" value={`${hole.fairwayPercentage}%`} icon="golf-tee" iconColor={colors.primary} />
        )}
        <StatCard title="Best" value={hole.bestScore} icon="trophy" iconColor={colors.success} />
        <StatCard title="Worst" value={hole.worstScore} icon="flag-variant" iconColor={colors.error} />
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  headerCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
  },
  headerSub: {
    ...typography.body,
    marginTop: 2,
  },
  headerScores: {
    alignItems: 'flex-end',
  },
  avgScore: {
    ...typography.h1,
  },
  scoreToPar: {
    ...typography.bodyBold,
    marginTop: 2,
  },
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  sparklineLabel: {
    ...typography.caption,
  },
  sectionGap: {
    marginTop: spacing.xl,
  },
  distCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/profile/CourseStatisticsScreen/components/HoleSelectorStrip.tsx src/screens/profile/CourseStatisticsScreen/components/HoleDetailView.tsx
git commit -m "feat: create HoleSelectorStrip and HoleDetailView components"
```

---

## Task 5: Create Holes tab and Game Stats tab

**Files:**
- Create: `src/screens/profile/CourseStatisticsScreen/components/CourseHolesTab.tsx`
- Create: `src/screens/profile/CourseStatisticsScreen/components/CourseGameStatsTab.tsx`

- [ ] **Step 1: Create CourseHolesTab**

Create `src/screens/profile/CourseStatisticsScreen/components/CourseHolesTab.tsx`:

```typescript
/**
 * CourseHolesTab - Holes tab with selector strip and per-hole detail
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { HoleSelectorStrip } from './HoleSelectorStrip';
import { HoleDetailView } from './HoleDetailView';
import type { CourseStatisticsData } from '@/hooks/playerStatistics';

interface CourseHolesTabProps {
  stats: CourseStatisticsData;
}

export const CourseHolesTab = React.memo(function CourseHolesTab({
  stats,
}: CourseHolesTabProps) {
  const colors = useThemeColors();
  const [selectedHole, setSelectedHole] = useState(
    stats.holeStats.length > 0 ? stats.holeStats[0].holeNumber : 1
  );

  const selectedHoleData = stats.holeStats.find((h) => h.holeNumber === selectedHole);

  if (stats.holeStats.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No hole data available yet.
        </Text>
      </View>
    );
  }

  return (
    <>
      <HoleSelectorStrip
        holeStats={stats.holeStats}
        selectedHole={selectedHole}
        onSelectHole={setSelectedHole}
      />
      {selectedHoleData && <HoleDetailView hole={selectedHoleData} />}
    </>
  );
});

const styles = StyleSheet.create({
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
  },
});
```

- [ ] **Step 2: Create CourseGameStatsTab**

Create `src/screens/profile/CourseStatisticsScreen/components/CourseGameStatsTab.tsx`:

```typescript
/**
 * CourseGameStatsTab - Advanced game stats scoped to this course
 *
 * Renders driving (FIR + miss diagram), approach (GIR + miss diagram),
 * short game, putting, bunker, and hazard sections.
 * Driving and Approach are rendered inline because the shared DrivingSection/
 * ApproachSection components require PlayerStatistics, not CourseStatisticsData.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import {
  SparklineChart,
  FairwayMissDirectionDiagram,
  GreenMissDirectionDiagram,
  ShortGameSection,
  PuttingAnalysisSection,
  BunkerStatsSection,
  HazardStatsSection,
} from '@/components/statistics';
import type { CourseStatisticsData } from '@/hooks/playerStatistics';

interface CourseGameStatsTabProps {
  stats: CourseStatisticsData;
}

export const CourseGameStatsTab = React.memo(function CourseGameStatsTab({
  stats,
}: CourseGameStatsTabProps) {
  const colors = useThemeColors();

  const hasFairwayData = stats.fairwayPercentage !== null && stats.fairwayOpportunities > 0;
  const hasMissData = stats.fairwayMissDirection.totalMisses > 0;
  const hasGIRData = stats.girPercentage !== null && stats.girOpportunities > 0;
  const hasGreenMissData = stats.greenMissDirection.totalMisses > 0;

  const firTrend = stats.roundTrends.map((r) => r.fairwayPercentage);
  const girTrend = stats.roundTrends.map((r) => r.girPercentage);

  return (
    <>
      {/* Driving Section (inline) */}
      <SectionHeader title="Driving" icon="golf-tee" />
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
        {hasFairwayData ? (
          <>
            <View style={styles.primaryRow}>
              <View style={styles.primaryStat}>
                <Text style={[styles.primaryValue, { color: colors.success }]}>
                  {stats.fairwayPercentage}%
                </Text>
                <Text style={[styles.primaryLabel, { color: colors.textSecondary }]}>
                  Fairways Hit
                </Text>
                <Text style={[styles.subLabel, { color: colors.textTertiary }]}>
                  {stats.fairwaysHit ?? 0}/{stats.fairwayOpportunities} holes
                </Text>
              </View>
              <SparklineChart data={firTrend} width={80} height={32} color={colors.success} />
            </View>
            {hasMissData && (
              <View style={styles.diagramWrapper}>
                <FairwayMissDirectionDiagram stats={stats.fairwayMissDirection} variant="compact" />
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyRow}>
            <Icon source="golf-tee" size={20} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No fairway data recorded at this course
            </Text>
          </View>
        )}
      </View>

      {/* Approach Section (inline) */}
      <View style={styles.sectionGap} />
      <SectionHeader title="Approach" icon="golf" />
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
        {hasGIRData ? (
          <>
            <View style={styles.primaryRow}>
              <View style={styles.primaryStat}>
                <Text style={[styles.primaryValue, { color: colors.success }]}>
                  {stats.girPercentage}%
                </Text>
                <Text style={[styles.primaryLabel, { color: colors.textSecondary }]}>
                  Greens in Regulation
                </Text>
                <Text style={[styles.subLabel, { color: colors.textTertiary }]}>
                  {stats.greensInRegulation ?? 0}/{stats.girOpportunities} holes
                </Text>
              </View>
              <SparklineChart data={girTrend} width={80} height={32} color={colors.success} />
            </View>
            {hasGreenMissData && (
              <View style={styles.diagramWrapper}>
                <GreenMissDirectionDiagram stats={stats.greenMissDirection} variant="compact" />
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyRow}>
            <Icon source="golf" size={20} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No GIR data recorded at this course
            </Text>
          </View>
        )}
      </View>

      {/* Short Game */}
      <View style={styles.sectionGap} />
      <ShortGameSection shortGame={stats.shortGame} />

      {/* Putting */}
      <View style={styles.sectionGap} />
      <PuttingAnalysisSection
        puttingDepth={stats.puttingDepth}
        averagePuttsPerHole={stats.averagePuttsPerHole}
        totalPuttsPerRound={stats.averagePuttsPerRound}
      />

      {/* Bunkers */}
      <View style={styles.sectionGap} />
      <BunkerStatsSection bunkerStats={stats.bunkerStats} />

      {/* Hazards */}
      <View style={styles.sectionGap} />
      <HazardStatsSection hazardStats={stats.hazardStats} />
    </>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  primaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryStat: {
    flex: 1,
  },
  primaryValue: {
    ...typography.h1,
  },
  primaryLabel: {
    ...typography.body,
    marginTop: 2,
  },
  subLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  diagramWrapper: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  emptyText: {
    ...typography.body,
  },
  sectionGap: {
    marginTop: spacing.xl,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/profile/CourseStatisticsScreen/components/CourseHolesTab.tsx src/screens/profile/CourseStatisticsScreen/components/CourseGameStatsTab.tsx
git commit -m "feat: create CourseHolesTab and CourseGameStatsTab components"
```

---

## Task 6: Refactor screen to tabbed layout and update exports

**Files:**
- Modify: `src/screens/profile/CourseStatisticsScreen/index.tsx`
- Modify: `src/screens/profile/CourseStatisticsScreen/components/index.ts`
- Delete: `src/screens/profile/CourseStatisticsScreen/components/HoleByHoleTable.tsx`

- [ ] **Step 1: Update component barrel exports**

Replace the content of `src/screens/profile/CourseStatisticsScreen/components/index.ts` with:

```typescript
export { CourseStatisticsTabBar, type CourseStatisticsTab } from './CourseStatisticsTabBar';
export { CourseOverviewTab } from './CourseOverviewTab';
export { CourseHolesTab } from './CourseHolesTab';
export { CourseGameStatsTab } from './CourseGameStatsTab';
export { HoleSelectorStrip } from './HoleSelectorStrip';
export { HoleDetailView } from './HoleDetailView';
```

- [ ] **Step 2: Rewrite CourseStatisticsScreen with tabbed layout**

Replace the entire content of `src/screens/profile/CourseStatisticsScreen/index.tsx` with:

```typescript
/**
 * CourseStatisticsScreen - Player statistics for a specific course
 *
 * Three-tab layout:
 * - Overview: Score trend, stats, distribution, averages, par types, recent rounds
 * - Holes: Scrollable hole selector with per-hole breakdown
 * - Game Stats: Advanced stats (driving, approach, short game, putting, bunkers, hazards)
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import { useCourseStatistics } from '@/hooks/playerStatistics';
import { spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner, EmptyState, ErrorState } from '@/components/common';
import {
  CourseStatisticsTabBar,
  type CourseStatisticsTab,
  CourseOverviewTab,
  CourseHolesTab,
  CourseGameStatsTab,
} from './components';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseStatistics'>;

export default function CourseStatisticsScreen({ route, navigation }: Props) {
  const { courseId, courseName } = route.params;
  const { user } = useAuth();
  const colors = useThemeColors();
  const [activeTab, setActiveTab] = useState<CourseStatisticsTab>('overview');

  const {
    data: stats,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useCourseStatistics(user?.id, courseId);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title={courseName} showBack onBack={handleGoBack} />
        <View style={styles.centeredContainer}>
          <LoadingSpinner size="lg" message="Loading course statistics..." />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title={courseName} showBack onBack={handleGoBack} />
        <View style={styles.centeredContainer}>
          <ErrorState
            error={error instanceof Error ? error.message : 'An error occurred'}
            onRetry={handleRefresh}
            title="Unable to load statistics"
          />
        </View>
      </View>
    );
  }

  if (!stats || stats.timesPlayed === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title={courseName} showBack onBack={handleGoBack} />
        <View style={styles.centeredContainer}>
          <EmptyState
            title="No rounds at this course"
            message="Complete a round at this course to see your statistics here."
            icon="chart-bar"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={courseName}
        showBack
        onBack={handleGoBack}
        rightActions={[
          { icon: 'refresh', onPress: handleRefresh, accessibilityLabel: 'Refresh statistics' },
        ]}
      />

      <CourseStatisticsTabBar selectedTab={activeTab} onTabChange={setActiveTab} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.textPrimary}
            colors={[colors.textPrimary]}
          />
        }
      >
        {activeTab === 'overview' && <CourseOverviewTab stats={stats} />}
        {activeTab === 'holes' && <CourseHolesTab stats={stats} />}
        {activeTab === 'gameStats' && <CourseGameStatsTab stats={stats} />}

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.massive },
  footer: { height: spacing.xxxl },
});
```

- [ ] **Step 3: Delete HoleByHoleTable**

```bash
rm src/screens/profile/CourseStatisticsScreen/components/HoleByHoleTable.tsx
```

- [ ] **Step 4: Run type check**

Run: `pnpm type-check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A src/screens/profile/CourseStatisticsScreen/
git commit -m "feat: refactor CourseStatisticsScreen to 3-tab layout with hole selector"
```

---

## Task 7: Verify end-to-end

- [ ] **Step 1: Run full type check**

Run: `pnpm type-check`
Expected: PASS with zero errors

- [ ] **Step 2: Run linter**

Run: `pnpm lint`
Expected: No new errors (warnings acceptable)

- [ ] **Step 3: Manual verification checklist**

Open the app and navigate to Course Statistics from any of the 3 entry points:
- [ ] Overview tab shows score trend chart, stats, distribution, averages, par types, recent rounds
- [ ] Holes tab shows horizontal hole selector strip with mini stat cards
- [ ] Tapping a hole updates the detail area below with sparkline, distribution, and stats
- [ ] Game Stats tab shows driving, approach, short game, putting, bunker, hazard sections
- [ ] Empty data (no putt/GIR/fairway data) shows graceful fallbacks
- [ ] 9-hole course shows 9 holes in selector, no errors
- [ ] Light and dark mode both render correctly
- [ ] Pull-to-refresh works on all tabs

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete course statistics enhancement with 3-tab layout"
```
