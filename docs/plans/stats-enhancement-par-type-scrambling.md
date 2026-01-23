# Plan: Stats Enhancement - Par Type Breakdown & Scrambling

## Overview

Enhance the My Statistics and Compare Stats screens with more granular golf statistics, specifically:
1. **Scoring by Hole Type** - Par 3/4/5 breakdowns (averages, GIR%, birdie%)
2. **Short Game Stats** - Scrambling percentage, bogey avoidance, double+ rate
3. **Putting Analysis** - One-putt %, three-putt %, putts per GIR

All new stats are calculated from **existing data** - no new data capture required during scoring.

## Approach

1. Extend the `usePlayerStatistics` hook to calculate new derived stats
2. Create new UI section components for the MyStatisticsScreen
3. Add comparison components for the CompareStatsScreen
4. Apply appropriate tier gating (Social+ for new sections)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data source | Existing scorecard data | User requested no new data capture |
| Scrambling dependency | Requires GIR tracking | Can't calculate without knowing if green was hit |
| Tier gating | Social+ for new sections | Matches existing score_distribution tier |
| Empty states | Show "Enable GIR tracking" message | Guide users to enable required tracking |
| Par type source | `holes.par` from course data | Already available in scorecard queries |

---

## Phase 1: Data Layer - Extend usePlayerStatistics

### Step 1.1: Add ParTypeStats Interface
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Add new type definitions to the usePlayerStatistics hook for par type statistics.

File: src/hooks/usePlayerStatistics.ts

Add after the existing interfaces (around line 52):

/**
 * Statistics broken down by hole par type (3, 4, or 5)
 */
export interface ParTypeStats {
  holesPlayed: number;
  averageScore: number;
  scoreToPar: number; // e.g., +0.4 means averaging 0.4 over par
  girPercentage: number | null; // null if no GIR data
  birdiePercentage: number;
  parPercentage: number;
  bogeyPercentage: number;
  doublePlusPercentage: number;
}

/**
 * Short game statistics derived from GIR and score data
 */
export interface ShortGameStats {
  scramblingPercentage: number | null; // null if no GIR data
  scrambleAttempts: number; // total missed GIRs
  scramblesMade: number; // missed GIR + made par or better
  bogeyAvoidanceRate: number; // % of holes with par or better
  doubleBogeyOrWorseRate: number; // % of holes with double+
}

/**
 * Extended putting statistics
 */
export interface PuttingDepthStats {
  onePuttPercentage: number | null; // null if no putt data
  threePuttPercentage: number | null;
  puttsPerGIR: number | null; // avg putts when hitting GIR
}
```

**Deliverables:**
- [ ] `ParTypeStats` interface added
- [ ] `ShortGameStats` interface added
- [ ] `PuttingDepthStats` interface added

**Dependencies:** None
**Notes:** These are exported types that UI components will consume

---

### Step 1.2: Extend PlayerStatistics Interface
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Extend the PlayerStatistics interface to include the new stats.

File: src/hooks/usePlayerStatistics.ts

Add these new fields to the PlayerStatistics interface (after girPercentage, around line 105):

  // Par Type Stats (NEW)
  par3Stats: ParTypeStats;
  par4Stats: ParTypeStats;
  par5Stats: ParTypeStats;

  // Short Game Stats (NEW)
  shortGame: ShortGameStats;

  // Putting Depth Stats (NEW)
  puttingDepth: PuttingDepthStats;
```

**Deliverables:**
- [ ] PlayerStatistics interface extended with new fields

**Dependencies:** Step 1.1
**Notes:** Keep new fields grouped together at the end for clarity

---

### Step 1.3: Add Par Type Calculation Helper
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Add a helper function to calculate statistics for a specific par type.

File: src/hooks/usePlayerStatistics.ts

Add after the existing helper functions (around line 160):

/**
 * Calculate statistics for holes of a specific par value
 */
function calculateParTypeStats(
  allScores: Array<{ strokes: number; par: number; gir: boolean | null; putts: number | null }>,
  targetPar: number
): ParTypeStats {
  const parHoles = allScores.filter(s => s.par === targetPar);
  const holesPlayed = parHoles.length;

  if (holesPlayed === 0) {
    return {
      holesPlayed: 0,
      averageScore: 0,
      scoreToPar: 0,
      girPercentage: null,
      birdiePercentage: 0,
      parPercentage: 0,
      bogeyPercentage: 0,
      doublePlusPercentage: 0,
    };
  }

  const totalStrokes = parHoles.reduce((sum, h) => sum + h.strokes, 0);
  const averageScore = Math.round((totalStrokes / holesPlayed) * 100) / 100;
  const scoreToPar = Math.round((averageScore - targetPar) * 100) / 100;

  // Score distribution for this par type
  let birdies = 0, pars = 0, bogeys = 0, doublePlus = 0;
  parHoles.forEach(h => {
    const diff = h.strokes - h.par;
    if (diff <= -1) birdies++;
    else if (diff === 0) pars++;
    else if (diff === 1) bogeys++;
    else doublePlus++;
  });

  // GIR calculation (only if we have GIR data)
  const holesWithGIRData = parHoles.filter(h => typeof h.gir === 'boolean');
  const girPercentage = holesWithGIRData.length > 0
    ? Math.round((holesWithGIRData.filter(h => h.gir).length / holesWithGIRData.length) * 1000) / 10
    : null;

  return {
    holesPlayed,
    averageScore,
    scoreToPar,
    girPercentage,
    birdiePercentage: Math.round((birdies / holesPlayed) * 1000) / 10,
    parPercentage: Math.round((pars / holesPlayed) * 1000) / 10,
    bogeyPercentage: Math.round((bogeys / holesPlayed) * 1000) / 10,
    doublePlusPercentage: Math.round((doublePlus / holesPlayed) * 1000) / 10,
  };
}
```

**Deliverables:**
- [ ] `calculateParTypeStats` helper function added

**Dependencies:** Step 1.1
**Notes:** Returns null for GIR if user hasn't tracked GIR data

---

### Step 1.4: Add Short Game & Putting Calculation Helpers
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Add helper functions to calculate short game and extended putting statistics.

File: src/hooks/usePlayerStatistics.ts

Add after calculateParTypeStats:

/**
 * Calculate scrambling and short game statistics
 * Scrambling = making par or better after missing the green in regulation
 */
function calculateShortGameStats(
  allScores: Array<{ strokes: number; par: number; gir: boolean | null }>
): ShortGameStats {
  const totalHoles = allScores.length;

  // Bogey avoidance and double+ rate (always calculable)
  const parOrBetter = allScores.filter(h => h.strokes <= h.par).length;
  const doublePlus = allScores.filter(h => h.strokes >= h.par + 2).length;

  const bogeyAvoidanceRate = totalHoles > 0
    ? Math.round((parOrBetter / totalHoles) * 1000) / 10
    : 0;
  const doubleBogeyOrWorseRate = totalHoles > 0
    ? Math.round((doublePlus / totalHoles) * 1000) / 10
    : 0;

  // Scrambling requires GIR data
  const holesWithGIRData = allScores.filter(h => typeof h.gir === 'boolean');

  if (holesWithGIRData.length === 0) {
    return {
      scramblingPercentage: null,
      scrambleAttempts: 0,
      scramblesMade: 0,
      bogeyAvoidanceRate,
      doubleBogeyOrWorseRate,
    };
  }

  // Scramble attempts = missed GIRs
  const missedGIRs = holesWithGIRData.filter(h => !h.gir);
  const scrambleAttempts = missedGIRs.length;

  // Scrambles made = missed GIR but still made par or better
  const scramblesMade = missedGIRs.filter(h => h.strokes <= h.par).length;

  const scramblingPercentage = scrambleAttempts > 0
    ? Math.round((scramblesMade / scrambleAttempts) * 1000) / 10
    : null;

  return {
    scramblingPercentage,
    scrambleAttempts,
    scramblesMade,
    bogeyAvoidanceRate,
    doubleBogeyOrWorseRate,
  };
}

/**
 * Calculate extended putting statistics
 */
function calculatePuttingDepthStats(
  allScores: Array<{ putts: number | null; gir: boolean | null }>
): PuttingDepthStats {
  const holesWithPutts = allScores.filter(h => typeof h.putts === 'number' && h.putts >= 0);

  if (holesWithPutts.length === 0) {
    return {
      onePuttPercentage: null,
      threePuttPercentage: null,
      puttsPerGIR: null,
    };
  }

  const onePutts = holesWithPutts.filter(h => h.putts === 1).length;
  const threePutts = holesWithPutts.filter(h => h.putts! >= 3).length;

  const onePuttPercentage = Math.round((onePutts / holesWithPutts.length) * 1000) / 10;
  const threePuttPercentage = Math.round((threePutts / holesWithPutts.length) * 1000) / 10;

  // Putts per GIR - only count holes where we hit GIR and tracked putts
  const girHolesWithPutts = allScores.filter(
    h => h.gir === true && typeof h.putts === 'number' && h.putts >= 0
  );

  const puttsPerGIR = girHolesWithPutts.length > 0
    ? Math.round((girHolesWithPutts.reduce((sum, h) => sum + h.putts!, 0) / girHolesWithPutts.length) * 100) / 100
    : null;

  return {
    onePuttPercentage,
    threePuttPercentage,
    puttsPerGIR,
  };
}
```

**Deliverables:**
- [ ] `calculateShortGameStats` helper function added
- [ ] `calculatePuttingDepthStats` helper function added

**Dependencies:** Step 1.1
**Notes:** Returns null percentages when required tracking data is missing

---

### Step 1.5: Integrate New Calculations into Main Hook
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Integrate the new calculation helpers into the main usePlayerStatistics hook logic.

File: src/hooks/usePlayerStatistics.ts

1. Inside the scorecards.forEach loop (around line 334), collect hole-level data into an array:

// Add this array before the scorecards.forEach loop (around line 295):
const allHoleScores: Array<{
  strokes: number;
  par: number;
  gir: boolean | null;
  putts: number | null;
}> = [];

2. Inside the Object.entries(scores).forEach loop (around line 334), add each hole to the array:

// After the existing GIR stats calculation (around line 360), add:
allHoleScores.push({
  strokes: holeScore.strokes || 0,
  par,
  gir: typeof holeScore.greenInRegulation === 'boolean' ? holeScore.greenInRegulation : null,
  putts: typeof holeScore.putts === 'number' ? holeScore.putts : null,
});

3. After the main loop ends (around line 402), calculate the new stats:

// Calculate par type stats
const par3Stats = calculateParTypeStats(allHoleScores, 3);
const par4Stats = calculateParTypeStats(allHoleScores, 4);
const par5Stats = calculateParTypeStats(allHoleScores, 5);

// Calculate short game stats
const shortGame = calculateShortGameStats(allHoleScores);

// Calculate putting depth stats
const puttingDepth = calculatePuttingDepthStats(allHoleScores);

4. Add the new fields to the return object (around line 531):

// After girPercentage, add:
par3Stats,
par4Stats,
par5Stats,
shortGame,
puttingDepth,
```

**Deliverables:**
- [ ] Hole-level data collection array added
- [ ] New stats calculated after main loop
- [ ] New fields added to return object

**Dependencies:** Steps 1.2, 1.3, 1.4
**Notes:** This is the main integration step - be careful with line numbers as they may shift

---

## Phase 2: UI Components

### Step 2.1: Create ParTypeStatsSection Component
**Status:** ✅ Complete
**Type:** Command
**Command:** `/component ParTypeStatsSection`

**Prompt:**
```
Create a statistics section component that displays scoring breakdown by par type (3, 4, 5).

File: src/components/statistics/ParTypeStatsSection.tsx

Requirements:
- Accept props: { par3Stats, par4Stats, par5Stats } from PlayerStatistics
- Display three columns (Par 3s, Par 4s, Par 5s) in a row
- For each par type show:
  - Average score (large, prominent)
  - Score to par (e.g., "+0.4 over" in red or "-0.2 under" in green)
  - GIR percentage (show "N/A" if null)
  - Birdie percentage
- Use section title: "Scoring by Hole Type"
- Style following existing patterns in src/components/statistics/StatCard.tsx
- Use useThemeColors() for colors
- Use spacing, borderRadius, typography from @/constants/theme
- Wrap in FeatureLock with feature="score_distribution" and requiredTier="social"

Visual Layout:
┌─────────────────────────────────────────────────┐
│  Scoring by Hole Type                           │
├─────────────────────────────────────────────────┤
│  Par 3s          Par 4s          Par 5s        │
│  ┌─────┐        ┌─────┐        ┌─────┐        │
│  │ 3.4 │        │ 4.8 │        │ 5.6 │        │
│  │ avg │        │ avg │        │ avg │        │
│  └─────┘        └─────┘        └─────┘        │
│  +0.4 over      +0.8 over      -0.4 under     │
│                                                 │
│  GIR: 28%       GIR: 42%       GIR: 56%        │
│  Birdies: 4%    Birdies: 8%    Birdies: 12%   │
└─────────────────────────────────────────────────┘

Reference existing component patterns:
- src/screens/profile/MyStatisticsScreen/components/OverviewStats.tsx
- src/components/statistics/StatCard.tsx
```

**Deliverables:**
- [ ] `src/components/statistics/ParTypeStatsSection.tsx` created
- [ ] Component properly typed with TypeScript
- [ ] FeatureLock wrapper applied

**Dependencies:** Step 1.2
**Notes:** Export from src/components/statistics/index.ts

---

### Step 2.2: Create ShortGameSection Component
**Status:** ✅ Complete
**Type:** Command
**Command:** `/component ShortGameSection`

**Prompt:**
```
Create a statistics section component for short game stats (scrambling, bogey avoidance).

File: src/components/statistics/ShortGameSection.tsx

Requirements:
- Accept props: { shortGame: ShortGameStats } from PlayerStatistics
- Display scrambling prominently with a progress bar visualization
- Show scrambles made/attempts (e.g., "21/50 saves")
- Show bogey avoidance rate and double+ rate as secondary stats
- If scramblingPercentage is null, show message: "Enable GIR tracking in Settings to see scrambling stats"
- Use section title: "Short Game"
- Wrap in FeatureLock with feature="score_distribution" and requiredTier="social"

Visual Layout:
┌─────────────────────────────────────────────────┐
│  Short Game                                     │
├─────────────────────────────────────────────────┤
│  Scrambling                                     │
│  ┌──────────────────────────────────────┐      │
│  │ ████████████░░░░░░░░░░  42%          │      │
│  │ 21/50 saves                           │      │
│  └──────────────────────────────────────┘      │
│                                                 │
│  Bogey Avoidance: 68%   Double+ Rate: 8%       │
└─────────────────────────────────────────────────┘

Reference:
- src/components/statistics/ScoreDistributionBar.tsx for bar styling
- src/screens/profile/MyStatisticsScreen/components/GameStats.tsx
```

**Deliverables:**
- [ ] `src/components/statistics/ShortGameSection.tsx` created
- [ ] Progress bar visualization for scrambling
- [ ] Empty state message when GIR not tracked

**Dependencies:** Step 1.2
**Notes:** Export from src/components/statistics/index.ts

---

### Step 2.3: Create PuttingAnalysisSection Component
**Status:** ✅ Complete
**Type:** Command
**Command:** `/component PuttingAnalysisSection`

**Prompt:**
```
Create a statistics section component for extended putting analysis.

File: src/components/statistics/PuttingAnalysisSection.tsx

Requirements:
- Accept props: { puttingDepth: PuttingDepthStats, existingPuttStats: { averagePuttsPerHole, totalPutts } }
- Display one-putt %, three-putt %, and putts per GIR as stat cards
- Include existing putt averages as secondary info
- If onePuttPercentage is null, show message: "Enable putt tracking in Settings to see putting analysis"
- Use section title: "Putting Analysis"
- Wrap in FeatureLock with feature="score_distribution" and requiredTier="social"

Visual Layout:
┌─────────────────────────────────────────────────┐
│  Putting Analysis                               │
├─────────────────────────────────────────────────┤
│  One-Putt %      Three-Putt %    Putts/GIR     │
│  ┌─────┐        ┌─────┐        ┌─────┐        │
│  │ 32% │        │  6% │        │ 1.8 │        │
│  └─────┘        └─────┘        └─────┘        │
│                                                 │
│  Avg Putts: 1.9/hole  |  Total: 34/round       │
└─────────────────────────────────────────────────┘

Reference:
- src/screens/profile/MyStatisticsScreen/components/GameStats.tsx
- src/components/statistics/StatCard.tsx
```

**Deliverables:**
- [ ] `src/components/statistics/PuttingAnalysisSection.tsx` created
- [ ] Shows empty state when putt tracking disabled

**Dependencies:** Step 1.2
**Notes:** Export from src/components/statistics/index.ts

---

### Step 2.4: Export New Components
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Export the new statistics components from the index file.

File: src/components/statistics/index.ts

Add exports:
export { ParTypeStatsSection, type ParTypeStatsSectionProps } from './ParTypeStatsSection';
export { ShortGameSection, type ShortGameSectionProps } from './ShortGameSection';
export { PuttingAnalysisSection, type PuttingAnalysisSectionProps } from './PuttingAnalysisSection';
```

**Deliverables:**
- [ ] All three new components exported

**Dependencies:** Steps 2.1, 2.2, 2.3
**Notes:** Follow existing export pattern in the file

---

## Phase 3: Screen Integration

### Step 3.1: Update MyStatisticsScreen
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Add the new statistics sections to the MyStatisticsScreen.

File: src/screens/profile/MyStatisticsScreen/index.tsx

1. Import the new components (add to existing statistics imports):
import {
  ParTypeStatsSection,
  ShortGameSection,
  PuttingAnalysisSection,
} from '@/components/statistics';

2. Add the new sections to the ScrollView (after GameStats, before ScoreDistributionSection):

{/* Section: Par Type Stats - Social+ tier */}
<ParTypeStatsSection
  par3Stats={stats.par3Stats}
  par4Stats={stats.par4Stats}
  par5Stats={stats.par5Stats}
/>

{/* Section: Short Game - Social+ tier */}
<ShortGameSection shortGame={stats.shortGame} />

{/* Section: Putting Analysis - Social+ tier */}
<PuttingAnalysisSection
  puttingDepth={stats.puttingDepth}
  averagePuttsPerHole={stats.averagePuttsPerHole}
  totalPuttsPerRound={stats.averagePuttsPerRound}
/>

Note: Place these AFTER GameStats and BEFORE ScoreDistributionSection to maintain logical flow:
1. Overview (existing)
2. Game Stats (existing)
3. Par Type Stats (NEW)
4. Short Game (NEW)
5. Putting Analysis (NEW)
6. Score Distribution (existing)
7. Advanced Analytics (existing)
```

**Deliverables:**
- [ ] New sections added to MyStatisticsScreen
- [ ] Correct ordering of sections

**Dependencies:** Steps 1.5, 2.4
**Notes:** Verify the section order makes sense for user flow

---

### Step 3.2: Create ParTypeComparison Component
**Status:** ✅ Complete
**Type:** Command
**Command:** `/component ParTypeComparison`

**Prompt:**
```
Create a comparison component for par type stats on the CompareStatsScreen.

File: src/components/social/comparison/ParTypeComparison.tsx

Requirements:
- Accept props: { player1Stats, player2Stats, player1Name, player2Name }
- Display side-by-side comparison of par 3/4/5 stats
- Use ComparisonRow component (existing) for each stat
- Color-code differences (green = better, red = worse)
- For scoring stats, lower is better (invert comparison)
- Include section title: "Scoring by Hole Type"

Reference existing:
- src/components/social/comparison/ComparisonRow.tsx
- src/screens/social/CompareStatsScreen.tsx
```

**Deliverables:**
- [ ] `src/components/social/comparison/ParTypeComparison.tsx` created

**Dependencies:** Step 1.2
**Notes:** Export from src/components/social/comparison/index.ts

---

### Step 3.3: Update CompareStatsScreen with New Sections
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Add the new comparison sections to the CompareStatsScreen.

File: src/screens/social/CompareStatsScreen.tsx

1. Import new components:
import { ParTypeComparison } from '@/components/social/comparison';

2. Add sections for:
- Par Type Comparison (par 3/4/5 side-by-side)
- Short Game Comparison (scrambling, bogey avoidance)
- Putting Depth Comparison (one-putt %, three-putt %, putts per GIR)

Use existing ComparisonRow component for the short game and putting stats.
Add appropriate section headers for visual separation.
```

**Deliverables:**
- [ ] ParTypeComparison section added
- [ ] Short game stats comparison added
- [ ] Putting depth comparison added

**Dependencies:** Steps 1.5, 3.2
**Notes:** May need to add section dividers for visual clarity

---

## Critical Files

### To Modify
- `src/hooks/usePlayerStatistics.ts` - Add new types and calculations
- `src/screens/profile/MyStatisticsScreen/index.tsx` - Add new sections
- `src/screens/social/CompareStatsScreen.tsx` - Add comparison sections
- `src/components/statistics/index.ts` - Export new components
- `src/components/social/comparison/index.ts` - Export ParTypeComparison

### To Create
- `src/components/statistics/ParTypeStatsSection.tsx`
- `src/components/statistics/ShortGameSection.tsx`
- `src/components/statistics/PuttingAnalysisSection.tsx`
- `src/components/social/comparison/ParTypeComparison.tsx`

---

## Verification

1. **Build check**: Run `pnpm type-check` to verify no TypeScript errors
2. **Manual test - My Stats**:
   - Open My Statistics screen with a player who has GIR data
   - Verify all three new sections display correctly
   - Test with player who has NO GIR data - verify "Enable GIR tracking" messages appear
3. **Manual test - Compare Stats**:
   - Compare two players with different stat levels
   - Verify color coding (green/red) shows correct "better" player
4. **Tier gating test**:
   - Test as Free tier user - verify new sections show FeatureLock
   - Test as Social+ tier - verify sections are accessible
5. **Empty state test**:
   - Test with player who has 0 rounds - verify graceful handling
   - Test with player who has rounds but no GIR/putt tracking

---

## Future Enhancements (Out of Scope)

These would require additional data capture during scoring:
- **Sand Saves**: Requires bunker visit tracking
- **Putting by distance**: Requires first putt distance input
- **Penalty breakdown**: Requires water/OB/hazard categorization
- **Strokes Gained**: Requires comprehensive shot tracking

---

## Research Sources

- [18Birdies Stats Guide](https://help.18birdies.com/article/728-tracking-and-understanding-golf-statistics)
- [Shot Scope Strokes Gained](https://shotscope.com/blog/stats/what-is-strokes-gained/)
- [HackMotion - How to Track Golf Stats](https://hackmotion.com/track-golf-stats/)
- [Golf Stats by Handicap](https://theleftrough.com/golf-statistics-by-handicap/)
