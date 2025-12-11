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

## Leaderboard Calculation

### Sorting Logic

```typescript
/**
 * Sort players for leaderboard display
 *
 * Stableford: Highest points wins
 * Stroke Play: Lowest net score wins
 */
function sortLeaderboard(
  scorecards: Scorecard[],
  gameType: 'stroke' | 'stableford'
): LeaderboardEntry[] {
  const entries = scorecards.map((sc, index) => ({
    playerId: sc.playerId,
    playerName: sc.player.name,
    handicap: sc.player.handicap,
    totalGross: sc.totalGross,
    totalNet: sc.totalNet,
    totalPoints: sc.totalPoints,
    position: 0, // Calculated below
  }));

  // Sort
  if (gameType === 'stableford') {
    entries.sort((a, b) => {
      // Higher points = better
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      // Tiebreaker: Lower net score
      return a.totalNet - b.totalNet;
    });
  } else {
    entries.sort((a, b) => {
      // Lower net = better
      if (a.totalNet !== b.totalNet) {
        return a.totalNet - b.totalNet;
      }
      // Tiebreaker: Lower gross score
      return a.totalGross - b.totalGross;
    });
  }

  // Assign positions (handle ties)
  let currentPosition = 1;
  entries.forEach((entry, index) => {
    if (index > 0) {
      const prev = entries[index - 1];
      // Check if tied
      if (gameType === 'stableford') {
        if (entry.totalPoints === prev.totalPoints &&
            entry.totalNet === prev.totalNet) {
          entry.position = prev.position; // Same position
        } else {
          entry.position = index + 1;
          currentPosition = index + 1;
        }
      } else {
        if (entry.totalNet === prev.totalNet &&
            entry.totalGross === prev.totalGross) {
          entry.position = prev.position;
        } else {
          entry.position = index + 1;
          currentPosition = index + 1;
        }
      }
    } else {
      entry.position = 1;
    }
  });

  return entries;
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
