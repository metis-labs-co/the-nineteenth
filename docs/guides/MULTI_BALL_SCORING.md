# Multi-Ball Scoring Guide

## Overview

Multi-ball scoring allows solo players to score 2-4 balls per hole during practice rounds. This feature is designed for golfers who want to track multiple balls while playing alone, commonly used for:

- Practice rounds with multiple ball types
- Working on different shot strategies
- Tracking consistency across multiple attempts
- Building confidence with scoring variety

**Subscription Requirement**: Social tier or higher (Free tier users cannot access multi-ball scoring)

---

## Architecture

### Data Flow

```
┌─────────────────────────┐
│   Round Creation Flow   │
│  (CreateRoundBottomSheet)│
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   BallCountStep         │
│   (Social+ only)        │
│   Selects 1-4 balls     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Database (rounds)     │
│   ball_count column     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   ScorecardEntryScreen  │
│   Detects multi-ball    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   MultiBallScoreInput   │
│   Renders per-ball UI   │
└─────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20251228000000_multi_ball_scoring.sql` | Database schema |
| `src/types/multiball.types.ts` | TypeScript types and helpers |
| `src/types/database/base.ts` | MultiBallHoleScore type |
| `src/store/scorecardStore.ts` | Multi-ball state management |
| `src/components/scorecard/MultiBallScoreInput.tsx` | Score input UI |
| `src/screens/rounds/CreateRoundBottomSheet/steps/BallCountStep.tsx` | Ball count selection |
| `src/hooks/scorecard/useRoundData.ts` | Fetches ball_count from round |
| `src/screens/scoring/ScorecardEntryScreen/index.tsx` | Orchestrates multi-ball mode |
| `src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx` | Renders appropriate UI |

---

## Database Schema

### Rounds Table

```sql
ALTER TABLE rounds
ADD COLUMN ball_count SMALLINT DEFAULT 1
CHECK (ball_count >= 1 AND ball_count <= 4);
```

### Scorecards Table

```sql
ALTER TABLE scorecards
ADD COLUMN ball_totals JSONB;

-- Structure:
-- {
--   "1": { "gross": 72, "net": 68, "points": 36 },
--   "2": { "gross": 74, "net": 70, "points": 34 },
--   ...
-- }
```

### HoleScore Storage

For multi-ball rounds, hole scores are stored in a different format:

```typescript
// Standard HoleScore
interface HoleScore {
  strokes: number;
  putts?: number;
  fairwayHit?: boolean;
  greenInRegulation?: boolean;
  penalties?: number;
}

// MultiBallHoleScore (stored in scores JSONB)
interface MultiBallHoleScore {
  balls: HoleScore[];  // Array of scores, one per ball
}
```

---

## TypeScript Types

### Core Types

```typescript
// src/types/multiball.types.ts

/** Valid ball counts for multi-ball scoring */
export type BallCount = 1 | 2 | 3 | 4;

/** Check if a value is a valid BallCount */
export function isValidBallCount(value: unknown): value is BallCount {
  return typeof value === 'number' && [1, 2, 3, 4].includes(value);
}

/** Get display label for a ball (e.g., "Ball 1", "Ball 2") */
export function getBallLabel(ballIndex: number): string {
  return `Ball ${ballIndex + 1}`;
}

/** Check if ball count qualifies as multi-ball */
export function isMultiBallCount(count: BallCount): boolean {
  return count > 1;
}
```

### Type Guards

```typescript
// src/types/database/base.ts

/** Multi-ball score structure for a single hole */
export interface MultiBallHoleScore {
  balls: HoleScore[];
}

/** Per-ball running totals */
export interface BallTotals {
  gross: number;
  net: number;
  points: number;
}

/** Type guard to check if score is multi-ball format */
export function isMultiBallScore(
  score: HoleScore | MultiBallHoleScore | undefined
): score is MultiBallHoleScore {
  return score !== undefined && 'balls' in score && Array.isArray(score.balls);
}
```

---

## Store Functions

The `useScorecardStore` provides these multi-ball functions:

### State

```typescript
interface ScorecardState {
  // Multi-ball state
  ballCount: BallCount;      // Current ball count (1-4)
  isMultiBall: boolean;      // true if ballCount > 1
}
```

### Actions

```typescript
// Configure multi-ball mode
setMultiBallConfig: (ballCount: BallCount) => void

// Set score for a specific ball on a hole
setMultiBallScore: (
  playerId: string,
  hole: number,
  ballIndex: number,
  strokes: number
) => Promise<void>

// Get all ball scores for a hole
getMultiBallScores: (playerId: string, hole: number) => HoleScore[]

// Get running totals per ball
getMultiBallTotals: (playerId: string) => Record<string, BallTotals>
```

### Usage Example

```typescript
import { useScorecardStore } from '@/store/scorecardStore';

function ScoringComponent() {
  const {
    isMultiBall,
    ballCount,
    setMultiBallConfig,
    setMultiBallScore,
    getMultiBallScores,
    getMultiBallTotals,
  } = useScorecardStore();

  // Configure for 3-ball scoring
  useEffect(() => {
    setMultiBallConfig(3);
  }, []);

  // Get scores for hole 5
  const ballScores = getMultiBallScores(playerId, 5);
  // Returns: [{ strokes: 4 }, { strokes: 5 }, { strokes: 4 }]

  // Set Ball 2 score on hole 5
  await setMultiBallScore(playerId, 5, 1, 5); // ballIndex is 0-based

  // Get totals
  const totals = getMultiBallTotals(playerId);
  // Returns: {
  //   "1": { gross: 36, net: 34, points: 18 },
  //   "2": { gross: 38, net: 36, points: 16 },
  //   "3": { gross: 35, net: 33, points: 19 }
  // }
}
```

---

## Components

### MultiBallScoreInput

The main scoring UI component for multi-ball rounds.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `player` | `Player` | Yes | The player being scored |
| `currentHole` | `Hole` | Yes | Current hole data (par, SI) |
| `ballCount` | `BallCount` | Yes | Number of balls (2-4) |
| `ballScores` | `(HoleScore \| undefined)[]` | Yes | Array of scores per ball |
| `onBallScoreChange` | `(ballIndex: number, strokes: number) => void` | Yes | Called when a ball's score changes |
| `disabled` | `boolean` | No | Disable all inputs |

#### Features

- Player header with name and handicap
- Shows strokes received on hole
- Shows total Stableford points across all balls
- Compact score row per ball with:
  - Ball label (Ball 1, Ball 2, etc.)
  - Points for that ball
  - Pick Up button (P)
  - Minus/Plus stepper
  - Par quick-select button

#### Usage

```tsx
import { MultiBallScoreInput } from '@/components/scorecard';

<MultiBallScoreInput
  player={player}
  currentHole={currentHoleData}
  ballCount={3}
  ballScores={[
    { strokes: 4 },
    { strokes: 5 },
    undefined  // Ball 3 not scored yet
  ]}
  onBallScoreChange={(ballIndex, strokes) => {
    // ballIndex: 0, 1, or 2
    // strokes: the new score
    handleScoreChange(player.id, ballIndex, strokes);
  }}
/>
```

### BallCountStep

Selection UI shown during round creation for Social+ subscribers.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `ballCount` | `BallCount` | Yes | Currently selected count |
| `onBallCountChange` | `(count: BallCount) => void` | Yes | Called when selection changes |
| `onNext` | `() => void` | Yes | Proceed to next step |
| `onBack` | `() => void` | Yes | Go back to previous step |

---

## Integration Flow

### 1. Round Creation

The `CreateRoundBottomSheet` shows the BallCountStep for solo rounds when:
- User has Social tier or higher subscription
- Round has exactly 1 player (solo round)

```typescript
// useCreateRoundWizard.ts
const shouldShowBallCountStep =
  canAccessMultiBall &&
  selectedPlayers.length === 1;
```

### 2. Data Fetching

`useRoundData` hook fetches `ball_count` from the round:

```typescript
// Query includes ball_count
const { data: roundData } = await supabase
  .from('rounds')
  .select(`
    id,
    game_type,
    ball_count,
    ...
  `)
  .eq('id', roundId)
  .single();

// Returns
return {
  ballCount: roundData.ball_count ?? 1,
  isSoloRound: playerCount === 1 && !isTeamRound,
  ...
};
```

### 3. ScorecardEntryScreen Detection

The screen detects multi-ball mode and configures the store:

```typescript
// ScorecardEntryScreen/index.tsx

const {
  ballCount,
  isSoloRound,
} = useRoundData({ roundId, competitionId, currentUserId: user?.id });

const {
  isMultiBall,
  setMultiBallConfig,
  setMultiBallScore,
  getMultiBallScores,
} = useScorecardStore();

// Configure when data loads
useEffect(() => {
  if (!dataLoading && ballCount > 1 && isSoloRound) {
    setMultiBallConfig(ballCount);
  }
}, [dataLoading, ballCount, isSoloRound, setMultiBallConfig]);
```

### 4. Score Content Rendering

`ScorecardScoreContent` renders the appropriate UI:

```typescript
// ScorecardScoreContent.tsx

// Multi-ball: Solo practice rounds with multiple balls
if (isMultiBall && ballCount > 1 && playersToRender.length === 1) {
  const player = playersToRender[0];
  const ballScores = getMultiBallScores(player.id, currentHole);

  return (
    <MultiBallScoreInput
      player={player}
      currentHole={currentHoleData}
      ballCount={ballCount}
      ballScores={ballScores}
      onBallScoreChange={(ballIndex, strokes) =>
        onMultiBallScoreChange(player.id, ballIndex, strokes)
      }
    />
  );
}

// Otherwise: Standard PlayerScoreCard
return (
  <PlayerScoreCard ... />
);
```

---

## Scoring Logic

### Stableford Points Calculation

Each ball's Stableford points are calculated independently:

```typescript
const points = calculateStablefordPoints(strokes, handicap, hole);
```

Points per ball are shown next to each ball row, and the total across all balls is shown in the header.

### Pick Up Handling

A "Pick Up" (score of 10) is treated as 0 points:

```typescript
const PICKUP_SCORE = 10;

if (strokes === PICKUP_SCORE) {
  return 0; // No points for pickup
}
```

### Running Totals

`getMultiBallTotals()` calculates per-ball totals:

```typescript
const totals = getMultiBallTotals(playerId);
// {
//   "1": { gross: 72, net: 68, points: 36 },
//   "2": { gross: 74, net: 70, points: 34 }
// }
```

---

## Limitations

1. **Solo rounds only**: Multi-ball is disabled for group rounds (2+ players)
2. **Subscription gated**: Requires Social tier or higher
3. **No stats tracking**: FIR, GIR, and Putts are not tracked per ball
4. **Stableford only**: Currently optimized for Stableford scoring
5. **No offline sync for multi-ball**: Multi-ball scores sync as part of the scorecard but don't have separate sync logic

---

## Testing

### Manual Testing Checklist

1. **Round Creation**
   - [ ] Create solo round as Social+ user
   - [ ] Verify BallCountStep appears
   - [ ] Select 2, 3, or 4 balls
   - [ ] Verify ball_count saved to database

2. **Scorecard Entry**
   - [ ] Open scorecard for multi-ball round
   - [ ] Verify MultiBallScoreInput renders (not PlayerScoreCard)
   - [ ] Enter scores for each ball
   - [ ] Verify Pick Up works for each ball
   - [ ] Verify Par quick-select works
   - [ ] Check points calculate correctly per ball
   - [ ] Verify total points in header

3. **Navigation**
   - [ ] Navigate between holes
   - [ ] Verify scores persist on hole change
   - [ ] Test swipe navigation

4. **Edge Cases**
   - [ ] Free tier user should NOT see BallCountStep
   - [ ] Group rounds should show PlayerScoreCard (not MultiBallScoreInput)
   - [ ] Verify ball_count defaults to 1 for legacy rounds

### Unit Test Coverage

Key areas to test:
- `isMultiBallScore()` type guard
- `setMultiBallScore()` store function
- `getMultiBallScores()` store function
- `getMultiBallTotals()` calculation
- `MultiBallScoreInput` component rendering

---

## Future Enhancements

Potential improvements for future versions:

1. **Per-ball stats**: Track FIR, GIR, Putts for each ball
2. **Ball comparison view**: Side-by-side comparison of ball performance
3. **Ball naming**: Allow custom names (e.g., "ProV1", "TP5")
4. **Best ball selection**: Automatically highlight best-performing ball
5. **Multi-ball leaderboard**: Compare per-ball totals in results view
