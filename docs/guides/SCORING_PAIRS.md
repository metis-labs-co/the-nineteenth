# Scoring Pairs Feature Guide

## Overview

Scoring pairs is a feature that allows organizers to designate which player is responsible for recording another player's score during a round. This is standard golf practice where players swap scorecards and mark each other's scores, ensuring independent verification of scores.

### What is a Scoring Pair?

A **scoring pair** consists of:
- **Scorer (Marker)**: The player responsible for recording scores
- **Player**: The player whose scores are being recorded

In golf terminology, the "marker" is the person who signs your scorecard to attest that the scores recorded are accurate.

---

## When to Use Scoring Pairs

### Competitive Rounds

Scoring pairs are particularly useful for:

1. **Competition rounds** - Where score integrity matters
2. **Team match play** - Cross-team scoring ensures fairness
3. **Club championships** - Official scoring requirements
4. **Handicap qualifying rounds** - Independent verification needed

### Casual Rounds

For casual/social rounds, scoring pairs are typically **not needed**:
- Players can enter their own scores
- Group scoring (one person enters for everyone) works well
- Less administrative overhead

### Feature Toggle

Organizers can enable/disable scoring pairs per round via the `scoring_pairs_required` flag on the round:

```typescript
// Round with scoring pairs required
{
  id: 'round-123',
  scoring_pairs_required: true,  // Players must be assigned scorers
  // ... other fields
}
```

---

## How Scoring Pairs Work

### Pairing Algorithms

The app supports two main algorithms for generating scoring pairs:

#### 1. Reciprocal Pairs (Even Number of Players)

When you have an **even number of players**, each pair of players scores each other:

```
┌─────────────────────────────────────┐
│        RECIPROCAL PAIRS             │
│        (4 players)                  │
├─────────────────────────────────────┤
│                                     │
│   Player A  ◄──────────►  Player B  │
│      │                       │      │
│      │    scores each other  │      │
│      │                       │      │
│   Player C  ◄──────────►  Player D  │
│                                     │
└─────────────────────────────────────┘

Assignments:
  A scores B  |  B scores A
  C scores D  |  D scores C
```

**Benefits:**
- Simple and intuitive
- Each player has exactly one card to mark
- Balanced workload

#### 2. Circular Chain (Odd Number of Players or Pairings)

When you have an **odd number of players** (or within a pairing group), a circular chain is used:

```
┌─────────────────────────────────────┐
│         CIRCULAR CHAIN              │
│         (3 players)                 │
├─────────────────────────────────────┤
│                                     │
│           Player A                  │
│          ↙        ↖                 │
│    scores           scores          │
│        ↓             ↑              │
│   Player B ────────► Player C       │
│              scores                 │
│                                     │
└─────────────────────────────────────┘

Assignments:
  A scores B
  B scores C
  C scores A
```

For a 4-player pairing (circular within the group):

```
┌─────────────────────────────────────┐
│         CIRCULAR CHAIN              │
│         (4-player pairing)          │
├─────────────────────────────────────┤
│                                     │
│     Player A ────────► Player B     │
│         ↑                  │        │
│         │    scores        │ scores │
│         │                  ↓        │
│     Player D ◄──────── Player C     │
│              scores                 │
│                                     │
└─────────────────────────────────────┘

Assignments:
  A scores B
  B scores C
  C scores D
  D scores A
```

#### 3. Cross-Team Pairs (Team Match Play)

For team competitions, players from opposing teams score each other:

```
┌─────────────────────────────────────┐
│        CROSS-TEAM PAIRS             │
│        (Team Match Play)            │
├─────────────────────────────────────┤
│                                     │
│    TEAM 1          TEAM 2           │
│   ┌───────┐       ┌───────┐         │
│   │   A1  │◄─────►│   B1  │         │
│   │   A2  │◄─────►│   B2  │         │
│   │   A3  │◄─────►│   B3  │         │
│   │   A4  │◄─────►│   B4  │         │
│   └───────┘       └───────┘         │
│                                     │
└─────────────────────────────────────┘

Assignments:
  A1 scores B1  |  B1 scores A1
  A2 scores B2  |  B2 scores A2
  A3 scores B3  |  B3 scores A3
  A4 scores B4  |  B4 scores A4
```

---

## Admin Setup Flow

### Step 1: Enable Scoring Pairs for Round

When creating or editing a round, toggle the scoring pairs requirement:

```typescript
// Enable scoring pairs when creating round
await supabase.from('rounds').insert({
  competition_id: competitionId,
  course_id: courseId,
  scoring_pairs_required: true,  // Enable scoring pairs
  // ... other fields
});
```

### Step 2: Generate or Assign Scoring Pairs

#### Option A: Auto-Generate from Pairings

The simplest approach - generate scoring pairs automatically based on existing player pairings:

```typescript
import { scoringPairsService } from '@/services/scoringPairs';

// Auto-generate using optimal algorithm
const pairs = await scoringPairsService.autoGenerateAndSaveScoringPairs(
  roundId,
  players  // Array of { id: string }
);
```

#### Option B: Manual Assignment

For full control, manually assign scorer/player pairs:

```typescript
const pairs = await scoringPairsService.createScoringPairs(roundId, [
  { scorerId: 'player-1-id', playerId: 'player-2-id' },
  { scorerId: 'player-2-id', playerId: 'player-1-id' },
  { scorerId: 'player-3-id', playerId: 'player-4-id' },
  { scorerId: 'player-4-id', playerId: 'player-3-id' },
]);
```

#### Option C: Team Match Play (Cross-Team)

For team competitions with cross-team scoring:

```typescript
const pairs = await scoringPairsService.generateTeamMatchPlayPairs(
  roundId,
  team1Players,  // Array of { id: string }
  team2Players   // Array of { id: string }
);
```

### Step 3: Validate Before Round Starts

Ensure all players have scorers assigned:

```typescript
// Using database function
const { data: validation } = await supabase.rpc('validate_scoring_pairs', {
  p_round_id: roundId,
});

if (!validation[0].is_valid) {
  // Show error - some players don't have scorers
  console.error(validation[0].message);
  console.error('Missing players:', validation[0].missing_players);
}
```

---

## Player Experience

### Viewing Your Assignment

Players can see:
1. **Who is scoring them** - The player marking their card
2. **Who they are scoring** - The player whose card they're marking

```typescript
// Get who the current user is scoring
const playersToScore = await scoringPairsService.getPlayersToScore(
  roundId,
  currentUserId
);

// Display: "You are marking: John Smith's card"
```

### During the Round

When scoring pairs are enabled:

1. **Scorer's view**: Shows the player they are marking, with that player's scorecard
2. **Player's view**: Shows who is marking their card (read-only)
3. **Group scoring**: Still available - scorer can enter scores for the player they're assigned

### Score Entry Flow

```
┌─────────────────────────────────────────────────┐
│              SCORING WORKFLOW                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. Player completes hole                       │
│           ↓                                     │
│  2. Tells their scorer the score               │
│           ↓                                     │
│  3. Scorer enters score in app                 │
│           ↓                                     │
│  4. Score is saved to player's scorecard       │
│           ↓                                     │
│  5. At end of round, player verifies &         │
│     submits their scorecard                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Database Schema

### scoring_pairs Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `round_id` | UUID | Reference to round |
| `scorer_id` | UUID | Player marking the score |
| `player_id` | UUID | Player being scored |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### Key Constraints

1. **unique_player_scorer_per_round**: Each player can only have ONE scorer per round
2. **different_scorer_player**: A player CANNOT be their own scorer

### Related Tables

The `rounds` table has:
- `scoring_pairs_required` (BOOLEAN) - Whether the round requires scoring pairs

---

## TypeScript Types

```typescript
// Scoring pair entity
interface ScoringPair {
  id: string;
  roundId: string;
  scorerId: string;  // The marker
  playerId: string;  // Player being scored
  createdAt: Date;
  updatedAt: Date;
}

// Scoring pair with player details
interface ScoringPairWithPlayers extends ScoringPair {
  scorer?: Player;
  player?: Player;
}

// Input for creating pairs
interface ScoringPairCreateInput {
  scorerId: string;
  playerId: string;
}
```

---

## API Reference

### Service Functions

```typescript
import { scoringPairsService } from '@/services/scoringPairs';

// Get all scoring pairs for a round
const pairs = await scoringPairsService.getRoundScoringPairs(roundId);

// Get players assigned to a scorer
const players = await scoringPairsService.getPlayersToScore(roundId, scorerId);

// Create scoring pairs
const created = await scoringPairsService.createScoringPairs(roundId, pairs);

// Auto-generate pairs
const generated = await scoringPairsService.autoGenerateAndSaveScoringPairs(
  roundId,
  players
);

// Generate cross-team pairs (match play)
const teamPairs = await scoringPairsService.generateTeamMatchPlayPairs(
  roundId,
  team1Players,
  team2Players
);

// Delete all pairs for a round
await scoringPairsService.deleteScoringPairs(roundId);

// Check if round has scoring pairs
const hasPairs = await scoringPairsService.hasScoringPairs(roundId);
```

### Database Functions

```sql
-- Get player that a scorer is marking
SELECT get_player_scoring_assignment(round_id, scorer_id);

-- Get who is scoring a player
SELECT get_player_scorer(round_id, player_id);

-- Validate all players have scorers
SELECT * FROM validate_scoring_pairs(round_id);

-- Auto-generate from pairings (circular)
SELECT generate_reciprocal_scoring_pairs(round_id);
```

---

## UI Components

### Admin: Scoring Pairs Screen

Located at: `src/screens/admin/ScoringPairsScreen.tsx`

Features:
- View current scoring pair assignments
- Auto-generate pairs button
- Manual reassignment
- Validation warnings

### Player: Round Detail

Shows:
- "Your marker: [Name]" - Who is scoring you
- "You are marking: [Name]" - Who you are scoring

---

## Best Practices

### For Organizers

1. **Set up pairings first** - Scoring pairs work best when pairings are defined
2. **Use auto-generate** - Reduces manual work and ensures balanced assignments
3. **Validate before round** - Ensure all players have scorers assigned
4. **Consider team formats** - Use cross-team pairing for match play

### For Players

1. **Verify assignments** - Check who you're scoring before the round
2. **Communicate scores clearly** - Announce your score to your marker
3. **Review your card** - Check scores entered by your marker before submitting

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Each player can only have one scorer` | Duplicate player_id in round | Remove duplicate assignment |
| `A player cannot be their own scorer` | scorer_id = player_id | Assign different players |
| `Missing players` from validation | Not all players have scorers | Generate or manually assign remaining pairs |

### Validation Before Round Start

```typescript
const validation = await supabase.rpc('validate_scoring_pairs', {
  p_round_id: roundId,
});

if (!validation[0].is_valid) {
  // Handle missing players
  const missingPlayerIds = validation[0].missing_players;

  // Option 1: Auto-assign remaining
  // Option 2: Prompt admin to manually assign
  // Option 3: Disable scoring pairs requirement
}
```

---

## Future Enhancements

Planned improvements for scoring pairs:

1. **Notifications** - Alert players when they're assigned as a scorer
2. **History** - Track scoring pair history across rounds
3. **Statistics** - Show scoring accuracy/consistency by marker
4. **Disputes** - Allow players to flag questionable scores
5. **Digital signatures** - Players sign off on their scorecard in-app

---

## Related Documentation

- [DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md) - Full database schema including scoring_pairs table
- [ALGORITHMS.md](ALGORITHMS.md) - Auto-pairing algorithms
- [OFFLINE_ARCHITECTURE.md](OFFLINE_ARCHITECTURE.md) - How scoring pairs work offline

---

*Last Updated: January 2025*
