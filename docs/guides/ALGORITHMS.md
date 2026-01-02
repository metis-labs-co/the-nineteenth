# Scoring and Pairing Algorithms

**The Nineteenth** - Mobile Golf Competition App

> Detailed algorithms for player pairing, handicap calculations, and scoring engines

---

## Overview

This document covers the core algorithms for:
1. **Auto-Pairing Logic** - Optimal player groupings for rounds
2. **Handicap Calculation** - Net score calculations based on handicaps
3. **Scoring Engine** - Game-type specific scoring (Stableford, Stroke Play, etc.)

---

## Auto-Pairing Logic

**Goal**: Generate fair, balanced player pairings for each round while rotating partners.

### Interface

```typescript
interface PairingConstraints {
  groupSize: 2 | 3 | 4;              // Number of players per group
  balanceSkillLevels: boolean;       // Mix high/low handicaps
  rotatePartners: boolean;           // Avoid repeat pairings
  avoidBackToBack: boolean;          // Don't pair same people consecutively
}

function generatePairings(
  players: Player[],
  round: number,
  previousPairings: Pairing[],
  constraints: PairingConstraints
): Pairing[]
```

### Algorithm Steps

**1. Sort Players by Handicap**

```typescript
const sortedPlayers = [...players].sort((a, b) => {
  const handicapA = a.handicap || 0;
  const handicapB = b.handicap || 0;
  return handicapA - handicapB; // Low to high
});
```

**2. Snake Draft Pattern**

Creates balanced groups by distributing skill levels evenly.

```typescript
// Example with 12 players, groups of 4:
// Group 1: Player 1 (best), 8, 9, 12 (worst)
// Group 2: Player 2, 7, 10, 11
// Group 3: Player 3, 6, 4, 5

function snakeDraft(
  sortedPlayers: Player[],
  groupSize: number
): Player[][] {
  const groups: Player[][] = [];
  const numGroups = Math.ceil(sortedPlayers.length / groupSize);

  // Initialize empty groups
  for (let i = 0; i < numGroups; i++) {
    groups.push([]);
  }

  // Snake pattern assignment
  let currentGroup = 0;
  let direction = 1; // 1 = forward, -1 = backward

  for (const player of sortedPlayers) {
    groups[currentGroup].push(player);

    // Move to next group
    if (groups[currentGroup].length < groupSize) {
      currentGroup += direction;

      // Reverse direction at ends
      if (currentGroup >= numGroups) {
        currentGroup = numGroups - 1;
        direction = -1;
      } else if (currentGroup < 0) {
        currentGroup = 0;
        direction = 1;
      }
    }
  }

  return groups;
}
```

**3. Check Against Previous Pairings**

Avoid pairing the same players together in consecutive rounds.

```typescript
function hasPlayedTogether(
  player1: string,
  player2: string,
  previousPairings: Pairing[]
): boolean {
  return previousPairings.some((pairing) => {
    return (
      pairing.playerIds.includes(player1) &&
      pairing.playerIds.includes(player2)
    );
  });
}

function countPreviousPairings(
  group: Player[],
  previousPairings: Pairing[]
): number {
  let count = 0;
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      if (hasPlayedTogether(group[i].id, group[j].id, previousPairings)) {
        count++;
      }
    }
  }
  return count;
}
```

**4. Optimize for Minimum Repeat Pairings**

If there are many repeat pairings, try to shuffle within handicap bands.

```typescript
function optimizePairings(
  groups: Player[][],
  previousPairings: Pairing[]
): Player[][] {
  let bestGroups = groups;
  let bestRepeatCount = groups.reduce(
    (sum, group) => sum + countPreviousPairings(group, previousPairings),
    0
  );

  // Try a few random shuffles within each handicap quartile
  for (let attempt = 0; attempt < 10; attempt++) {
    const shuffled = shuffleWithinBands(groups);
    const repeatCount = shuffled.reduce(
      (sum, group) => sum + countPreviousPairings(group, previousPairings),
      0
    );

    if (repeatCount < bestRepeatCount) {
      bestGroups = shuffled;
      bestRepeatCount = repeatCount;
    }
  }

  return bestGroups;
}
```

**5. Randomize Within Handicap Bands**

Add variety while maintaining balance.

```typescript
function shuffleWithinBands(groups: Player[][]): Player[][] {
  // Split into quartiles by handicap
  const allPlayers = groups.flat();
  const sortedPlayers = [...allPlayers].sort(
    (a, b) => (a.handicap || 0) - (b.handicap || 0)
  );

  const quartileSize = Math.ceil(sortedPlayers.length / 4);
  const quartiles = [
    sortedPlayers.slice(0, quartileSize),
    sortedPlayers.slice(quartileSize, quartileSize * 2),
    sortedPlayers.slice(quartileSize * 2, quartileSize * 3),
    sortedPlayers.slice(quartileSize * 3),
  ];

  // Shuffle within each quartile
  quartiles.forEach((q) => shuffle(q));

  // Reassemble groups
  return snakeDraft(quartiles.flat(), groups[0].length);
}
```

### Complete Implementation

```typescript
export function generatePairings(
  players: Player[],
  round: number,
  previousPairings: Pairing[],
  constraints: PairingConstraints
): Pairing[] {
  // 1. Sort by handicap
  const sortedPlayers = [...players].sort(
    (a, b) => (a.handicap || 0) - (b.handicap || 0)
  );

  // 2. Snake draft
  let groups = snakeDraft(sortedPlayers, constraints.groupSize);

  // 3. Optimize if rotating partners
  if (constraints.rotatePartners) {
    groups = optimizePairings(groups, previousPairings);
  }

  // 4. Convert to Pairing objects
  return groups.map((group, index) => ({
    id: `pairing-${round}-${index}`,
    roundId: `round-${round}`,
    playerIds: group.map((p) => p.id),
    teeTime: undefined, // Can be assigned later
  }));
}
```

---

## Handicap Calculation

**Goal**: Calculate net scores and strokes received per hole based on player handicap.

### Strokes Received on a Hole

```typescript
/**
 * Calculate how many strokes a player receives on a specific hole
 * based on their handicap and the hole's stroke index.
 *
 * @param playerHandicap - Player's handicap (e.g., 12.5)
 * @param strokeIndex - Hole's stroke index (1-18, where 1 is hardest)
 * @returns Number of strokes received on this hole (0, 1, or 2)
 */
function getStrokesOnHole(
  playerHandicap: number,
  strokeIndex: number
): number {
  // Round handicap to nearest integer
  const roundedHandicap = Math.round(playerHandicap);

  // Base strokes (every player gets these on their hardest holes)
  const baseStrokes = Math.floor(roundedHandicap / 18);

  // Additional stroke if this hole is within the handicap remainder
  const remainder = roundedHandicap % 18;
  const additionalStroke = strokeIndex <= remainder ? 1 : 0;

  return baseStrokes + additionalStroke;
}
```

**Examples:**

| Handicap | Hole SI | Base Strokes | Additional | Total |
|----------|---------|--------------|------------|-------|
| 12       | 1       | 0            | 1          | 1     |
| 12       | 12      | 0            | 1          | 1     |
| 12       | 13      | 0            | 0          | 0     |
| 18       | Any     | 1            | 0          | 1     |
| 22       | 1       | 1            | 1          | 2     |
| 22       | 4       | 1            | 1          | 2     |
| 22       | 5      | 1            | 0          | 1     |

### Net Score Calculation

```typescript
/**
 * Calculate net score for a hole (gross score minus strokes received)
 *
 * @param grossScore - Actual strokes taken
 * @param playerHandicap - Player's handicap
 * @param strokeIndex - Hole's stroke index (1-18)
 * @returns Net score for the hole
 */
function calculateNetScore(
  grossScore: number,
  playerHandicap: number,
  strokeIndex: number
): number {
  const strokesReceived = getStrokesOnHole(playerHandicap, strokeIndex);
  return grossScore - strokesReceived;
}
```

---

## Scoring Engine

### Stableford Points

**Goal**: Convert net scores to Stableford points.

```typescript
/**
 * Calculate Stableford points for a hole
 *
 * Points system:
 * - Albatross or better (net ≤ par-2): 4 points
 * - Birdie (net = par-1): 3 points
 * - Par (net = par): 2 points
 * - Bogey (net = par+1): 1 point
 * - Double bogey or worse (net ≥ par+2): 0 points
 *
 * @param grossScore - Actual strokes taken
 * @param par - Hole par (3, 4, or 5)
 * @param playerHandicap - Player's handicap
 * @param strokeIndex - Hole's stroke index
 * @returns Stableford points (0-4)
 */
function calculateStablefordPoints(
  grossScore: number,
  par: number,
  playerHandicap: number,
  strokeIndex: number
): number {
  const netScore = calculateNetScore(grossScore, playerHandicap, strokeIndex);
  const scoreToPar = netScore - par;

  if (scoreToPar <= -2) return 4; // Albatross or better
  if (scoreToPar === -1) return 3; // Birdie
  if (scoreToPar === 0) return 2;  // Par
  if (scoreToPar === 1) return 1;  // Bogey
  return 0;                        // Double bogey or worse
}
```

### Extended Stableford Points

Some competitions use an extended Stableford system that awards more points for exceptionally good scores:

```typescript
/**
 * Extended Stableford scoring (with Albatross bonus)
 * - Net 3+ under par: 5 points (Albatross or better)
 * - Net 2 under par: 4 points (Eagle)
 * - Net 1 under par: 3 points (Birdie)
 * - Net par: 2 points
 * - Net 1 over par: 1 point (Bogey)
 * - Net 2+ over par: 0 points
 */
function calculateExtendedStablefordPoints(
  grossScore: number,
  par: number,
  playerHandicap: number,
  strokeIndex: number
): number {
  const netScore = calculateNetScore(grossScore, playerHandicap, strokeIndex);
  const scoreToPar = netScore - par;

  if (scoreToPar <= -3) return 5; // Albatross or better
  if (scoreToPar === -2) return 4; // Eagle
  if (scoreToPar === -1) return 3; // Birdie
  if (scoreToPar === 0) return 2;  // Par
  if (scoreToPar === 1) return 1;  // Bogey
  return 0;                        // Double bogey or worse
}
```

**Example:**

```typescript
// Par 4, Stroke Index 7, Player Handicap 12
// Player scores 5 (bogey)

const points = calculateStablefordPoints(5, 4, 12, 7);
// Strokes received: 1 (handicap 12, SI 7)
// Net score: 5 - 1 = 4
// Score to par: 4 - 4 = 0 (par)
// Points: 2
```

### Stroke Play Net Score

```typescript
/**
 * Calculate total net score for a round (Stroke Play)
 *
 * @param scorecard - Player's scorecard with hole-by-hole scores
 * @param holes - Course holes with pars and stroke indexes
 * @param handicap - Player's handicap
 * @returns Total net score for the round
 */
function calculateStrokePlayNetScore(
  scorecard: Scorecard,
  holes: Hole[],
  handicap: number
): number {
  let totalNet = 0;

  holes.forEach((hole) => {
    const holeScore = scorecard.scores[hole.number];
    if (holeScore) {
      const netScore = calculateNetScore(
        holeScore.strokes,
        handicap,
        hole.strokeIndex
      );
      totalNet += netScore;
    }
  });

  return totalNet;
}
```

### Complete Round Scoring

```typescript
/**
 * Calculate all scores for a completed scorecard
 *
 * @param scorecard - Player's scorecard
 * @param holes - Course holes
 * @param handicap - Player's handicap
 * @param gameType - Type of game
 * @returns Updated scorecard with totals
 */
function calculateRoundScore(
  scorecard: Scorecard,
  holes: Hole[],
  handicap: number,
  gameType: 'stroke' | 'stableford'
): Scorecard {
  let totalGross = 0;
  let totalNet = 0;
  let totalPoints = 0;

  holes.forEach((hole) => {
    const holeScore = scorecard.scores[hole.number];
    if (holeScore) {
      // Gross
      totalGross += holeScore.strokes;

      // Net
      const netScore = calculateNetScore(
        holeScore.strokes,
        handicap,
        hole.strokeIndex
      );
      totalNet += netScore;

      // Stableford points (if applicable)
      if (gameType === 'stableford') {
        const points = calculateStablefordPoints(
          holeScore.strokes,
          hole.par,
          handicap,
          hole.strokeIndex
        );
        totalPoints += points;
      }
    }
  });

  return {
    ...scorecard,
    totalGross,
    totalNet,
    totalPoints: gameType === 'stableford' ? totalPoints : undefined,
  };
}
```

---

## Match Play Scoring

**Goal**: Track hole-by-hole wins/losses and determine match outcome.

### Match Play Hole Result

```typescript
/**
 * Calculate the result of a single match play hole.
 * Compares net scores - lower score wins the hole.
 *
 * @param playerNet - Player's net score on the hole
 * @param opponentNet - Opponent's net score on the hole
 * @returns 'won' | 'lost' | 'halved'
 */
function calculateMatchPlayHoleResult(
  playerNet: number,
  opponentNet: number
): 'won' | 'lost' | 'halved' {
  if (playerNet < opponentNet) return 'won';
  if (playerNet > opponentNet) return 'lost';
  return 'halved';
}
```

**Special Cases:**
- **Pickup Score (10)**: When a player picks up their ball, score is recorded as 10. This is an automatic loss for that hole.
- **Conceded Holes**: If a player concedes, opponent wins the hole.

### Match Play Status

The match status is determined by comparing holes won vs holes remaining:

| Condition | Status |
|-----------|--------|
| Player up by more holes than remaining | Player Wins (e.g., "3&2") |
| Opponent up by more holes than remaining | Opponent Wins |
| Player up by exactly holes remaining | Dormie (Player) |
| Opponent up by exactly holes remaining | Dormie (Opponent) |
| All holes played, player ahead | Player Wins (e.g., "2 UP") |
| All holes played, tied | All Square ("A/S") |
| Otherwise | In Progress |

```typescript
/**
 * Calculate overall match status from hole results.
 *
 * @param holesWon - Number of holes won by player
 * @param holesLost - Number of holes lost by player
 * @param holesRemaining - Number of holes left to play
 * @returns Match status and result string
 */
function calculateMatchStatus(
  holesWon: number,
  holesLost: number,
  holesRemaining: number
): { status: MatchStatus; result?: string } {
  const currentScore = holesWon - holesLost;
  const absoluteScore = Math.abs(currentScore);

  // Match over - more holes up than remaining
  if (absoluteScore > holesRemaining) {
    const result = `${absoluteScore}&${holesRemaining}`;
    return {
      status: currentScore > 0 ? 'player_wins' : 'opponent_wins',
      result,
    };
  }

  // All holes played
  if (holesRemaining === 0) {
    if (currentScore > 0) return { status: 'player_wins', result: `${absoluteScore} UP` };
    if (currentScore < 0) return { status: 'opponent_wins', result: `${absoluteScore} UP` };
    return { status: 'all_square', result: 'A/S' };
  }

  // Dormie - lead equals remaining holes
  if (absoluteScore === holesRemaining && absoluteScore > 0) {
    return { status: currentScore > 0 ? 'dormie_player' : 'dormie_opponent' };
  }

  return { status: 'in_progress' };
}
```

### Match Play Result Formats

| Situation | Format | Example |
|-----------|--------|---------|
| Win before 18th | "X&Y" | "3&2" (3 up with 2 to play) |
| Win on 18th | "X UP" | "2 UP" |
| Tie after 18 | "A/S" | "A/S" (All Square) |

---

## Team Scoring Formats

### Best Ball (Four Ball)

**Goal**: Each team member plays their own ball. Team takes the best (lowest) net score on each hole.

```typescript
/**
 * Calculate best ball team score for a hole.
 *
 * @param teamScores - Array of { playerId, grossScore, handicap }
 * @param hole - Hole with par and stroke index
 * @returns Best net score and contributing player
 */
function calculateBestBallHole(
  teamScores: TeamMemberScore[],
  hole: Hole
): { bestNetScore: number; contributingPlayerId: string } {
  const netScores = teamScores.map((member) => ({
    playerId: member.playerId,
    netScore: calculateNetScore(member.grossScore, member.handicap, hole),
  }));

  // Find lowest net score
  const sorted = netScores.sort((a, b) => a.netScore - b.netScore);
  const best = sorted[0];

  return {
    bestNetScore: best.netScore,
    contributingPlayerId: best.playerId,
  };
}
```

**Example:**
| Player | Gross | Handicap | SI | Strokes | Net |
|--------|-------|----------|-----|---------|-----|
| P1     | 6     | 20       | 2   | 2       | 4   |
| P2     | 5     | 8        | 2   | 0       | 5   |

Team score = **4** (P1's net score)

### Scramble / Ambrose

**Goal**: Team plays one ball, selecting the best shot each time. Team handicap is applied to the single score.

```typescript
/**
 * Calculate scramble team score for a hole.
 *
 * @param teamGrossScore - Team's gross score on the hole
 * @param teamHandicap - Calculated team handicap
 * @param hole - Hole with stroke index
 * @returns Team's net score
 */
function calculateScrambleHole(
  teamGrossScore: number,
  teamHandicap: number,
  hole: Hole
): number {
  return calculateNetScore(teamGrossScore, teamHandicap, hole);
}
```

### Team Handicap Calculation

| Team Size | Formula |
|-----------|---------|
| 1 player | Full handicap |
| 2 players | 35% of low + 15% of high |
| 3 players | (Sum of handicaps) / 3 / 3 |
| 4 players | (Sum of handicaps) / 4 / 4 |
| 5+ players | Use fallback 5% per player |

**Scramble Team Handicap (USGA Standard):**

```typescript
/**
 * Calculate scramble team handicap using USGA percentages.
 *
 * @param handicaps - Array of team member handicaps (sorted low to high)
 * @returns Team handicap rounded to one decimal
 */
function calculateScrambleTeamHandicap(handicaps: number[]): number {
  if (handicaps.length === 0) return 0;

  const sorted = [...handicaps].sort((a, b) => a - b);
  const percentages = [0.35, 0.15, 0.10, 0.05]; // USGA standard

  let teamHandicap = 0;
  sorted.forEach((h, index) => {
    const pct = percentages[index] ?? 0.05; // 5% for 5th player onwards
    teamHandicap += h * pct;
  });

  return Math.round(teamHandicap * 10) / 10;
}
```

**Example (4-player Scramble):**
| Player | Handicap | Percentage | Contribution |
|--------|----------|------------|--------------|
| P1     | 5        | 35%        | 1.75         |
| P2     | 10       | 15%        | 1.50         |
| P3     | 15       | 10%        | 1.50         |
| P4     | 20       | 5%         | 1.00         |
| **Total** | | | **5.75 → 6** |

### Aggregate Team Scoring

**Goal**: Sum of all team members' scores (either gross or net).

```typescript
/**
 * Calculate aggregate team score for a hole.
 *
 * @param teamScores - Array of individual scores
 * @returns Total team score
 */
function calculateAggregateHole(teamScores: number[]): number {
  return teamScores.reduce((sum, score) => sum + score, 0);
}
```

---

## Leaderboard Calculation

### Sorting Logic

| Game Type | Primary Sort | Higher/Lower Wins |
|-----------|--------------|-------------------|
| Stableford | Points | Higher is better |
| Stroke Play | Net Score | Lower is better |
| Match Play | Holes Won | Higher is better |

```typescript
/**
 * Sort entries by score.
 *
 * @param entries - Array of leaderboard entries with rawScore
 * @param options - { higherIsBetter: boolean }
 * @returns Sorted array (does not mutate original)
 */
function sortByScore<T extends { rawScore: number }>(
  entries: T[],
  options: { higherIsBetter: boolean }
): T[] {
  return [...entries].sort((a, b) => {
    if (options.higherIsBetter) {
      return b.rawScore - a.rawScore; // Descending
    }
    return a.rawScore - b.rawScore; // Ascending
  });
}
```

### Position Assignment

Positions account for ties by giving tied players the same position and skipping subsequent positions:

```typescript
/**
 * Assign positions to sorted leaderboard entries.
 * Handles ties by giving same position and skipping subsequent positions.
 *
 * @param entries - Sorted array of entries with rawScore
 * @returns Entries with position and tied flag added
 */
function assignPositions<T extends { rawScore: number }>(
  entries: T[]
): (T & { position: number; tied: boolean })[] {
  if (entries.length === 0) return [];

  return entries.map((entry, index) => {
    if (index === 0) {
      // Check if tied with next entry
      const tied = entries.length > 1 && entries[1].rawScore === entry.rawScore;
      return { ...entry, position: 1, tied };
    }

    const prev = entries[index - 1];
    const isTiedWithPrev = entry.rawScore === prev.rawScore;
    const position = isTiedWithPrev ? entries[index - 1].position : index + 1;

    // Check if tied (with prev or next)
    const isTiedWithNext = index < entries.length - 1 &&
                           entries[index + 1].rawScore === entry.rawScore;
    const tied = isTiedWithPrev || isTiedWithNext;

    return { ...entry, position, tied };
  });
}
```

**Example:**

| Rank | Player | Points | Position | Tied |
|------|--------|--------|----------|------|
| 1    | Alice  | 40     | 1        | Yes  |
| 2    | Bob    | 40     | 1        | Yes  |
| 3    | Carol  | 38     | 3        | No   |
| 4    | Dave   | 35     | 4        | No   |

### Tiebreaker Rules

When players have the same score, tiebreakers are applied in order:

#### 1. Back Nine Countback

Compare scores on holes 10-18, then 13-18, then 16-18:

```typescript
/**
 * Apply back 9/6/3 countback tiebreaker.
 *
 * @param entries - Tied entries to break
 * @param holeScores - Map of participantId -> 18 hole scores array
 * @param higherIsBetter - true for Stableford, false for Stroke
 * @returns Entries sorted by tiebreaker
 */
function applyBackNineTiebreaker<T extends { participantId: string; rawScore: number }>(
  entries: T[],
  holeScores: Map<string, number[]>,
  higherIsBetter: boolean
): T[] {
  if (entries.length <= 1) return entries;

  // Calculate back 9, back 6, back 3 scores
  const withBackScores = entries.map((entry) => {
    const scores = holeScores.get(entry.participantId) || [];
    return {
      ...entry,
      back9: scores.slice(9, 18).reduce((a, b) => a + b, 0),
      back6: scores.slice(12, 18).reduce((a, b) => a + b, 0),
      back3: scores.slice(15, 18).reduce((a, b) => a + b, 0),
    };
  });

  // Sort by back 9, then back 6, then back 3
  return withBackScores.sort((a, b) => {
    const multiplier = higherIsBetter ? -1 : 1;

    if (a.back9 !== b.back9) return (a.back9 - b.back9) * multiplier;
    if (a.back6 !== b.back6) return (a.back6 - b.back6) * multiplier;
    if (a.back3 !== b.back3) return (a.back3 - b.back3) * multiplier;

    return 0; // Still tied
  });
}
```

**Countback Precedence:**
1. **Back 9** (holes 10-18): Compare totals
2. **Back 6** (holes 13-18): If back 9 tied
3. **Back 3** (holes 16-18): If back 6 tied

#### 2. Handicap Tiebreaker

If still tied after countback, lower handicap wins:

```typescript
/**
 * Apply handicap tiebreaker (lower handicap wins).
 *
 * @param entries - Tied entries to break
 * @param handicaps - Map of participantId -> handicap
 * @returns Entries sorted by handicap (ascending)
 */
function applyHandicapTiebreaker<T extends { participantId: string }>(
  entries: T[],
  handicaps: Map<string, number>
): T[] {
  if (entries.length <= 1) return entries;

  return [...entries].sort((a, b) => {
    const handicapA = handicaps.get(a.participantId) ?? 36;
    const handicapB = handicaps.get(b.participantId) ?? 36;
    return handicapA - handicapB; // Lower wins
  });
}
```

### Playing Handicap Allowance

Different game types apply different handicap allowances:

| Game Type | Allowance | Example (18 hcp) |
|-----------|-----------|------------------|
| Stableford | 95% | 17 playing handicap |
| Stroke Play | 95% | 17 playing handicap |
| Match Play | 100% | 18 playing handicap |
| Best Ball | 85% | 15 playing handicap |

```typescript
/**
 * Get handicap allowance percentage for game type.
 *
 * @param gameType - The game type
 * @returns Allowance as decimal (0.85 - 1.0)
 */
function getHandicapAllowance(gameType: GameType): number {
  switch (gameType) {
    case 'stableford':
    case 'stroke':
      return 0.95;
    case 'match-play':
      return 1.0;
    case 'best-ball':
      return 0.85;
    default:
      return 1.0;
  }
}

/**
 * Calculate playing handicap from handicap index.
 *
 * @param handicapIndex - Player's handicap index
 * @param gameType - Game type for allowance
 * @returns Playing handicap (rounded)
 */
function getPlayingHandicap(handicapIndex: number, gameType: GameType): number {
  const allowance = getHandicapAllowance(gameType);
  return Math.round(handicapIndex * allowance);
}
```

---

## Usage Examples

### Generate Pairings for Round 2

```typescript
import { generatePairings } from '@utils/pairing';

const players = await getCompetitionPlayers(competitionId);
const round1Pairings = await getRoundPairings(round1Id);

const round2Pairings = generatePairings(
  players,
  2,
  round1Pairings,
  {
    groupSize: 4,
    balanceSkillLevels: true,
    rotatePartners: true,
    avoidBackToBack: true,
  }
);

// Save pairings to database
await savePairings(round2Id, round2Pairings);
```

### Calculate Scorecard After Round

```typescript
import { calculateRoundScore } from '@utils/scoring';

const scorecard = await getScorecardWithScores(scorecardId);
const course = await getCourseWithHoles(courseId);
const player = await getPlayer(playerId);

const completedScorecard = calculateRoundScore(
  scorecard,
  course.holes,
  player.handicap,
  'stableford'
);

// Update database
await updateScorecard(completedScorecard);
```

### Generate Leaderboard

```typescript
import { sortLeaderboard } from '@utils/scoring';

const scorecards = await getCompletedScorecards(competitionId);
const leaderboard = sortLeaderboard(scorecards, 'stableford');

// Display
leaderboard.forEach((entry) => {
  console.log(`${entry.position}. ${entry.playerName} - ${entry.totalPoints} pts`);
});
```

---

## Related Documentation

- **[DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md)** - Data model for scorecards and pairings
- **[src/utils/scoring.ts](../../src/utils/scoring.ts)** - Implementation file
- **[CLAUDE.md](../../CLAUDE.md)** - Project overview

---

*Last Updated: January 2025*
