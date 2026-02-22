# Wolf Game Feature Guide

## Overview

**Wolf** is a strategic golf side-game that runs alongside individual play formats (Stableford, Stroke Play, Par). It combines partner selection strategy with betting, where a rotating "Wolf" player makes critical decisions each hole about whether to team up with another player or go alone.

### What is Wolf?

In a Wolf game:
- **3-4 players** compete across 18 holes
- A different player is designated **Wolf** on each hole (rotation)
- The Wolf watches tee shots, then decides to:
  - **Pick a Partner**: Team up with the best drive they saw
  - **Go Lone Wolf**: Play alone against the "Pack" (all other players)
  - **Go Blind Wolf**: Declare solo BEFORE anyone tees off (highest risk/reward)
- **Points** are awarded based on the outcome and decision type
- If **pot enabled**, points translate to money

### Why Wolf?

Wolf adds strategic depth beyond standard betting games:
- You must assess drives quickly and make decisions under pressure
- Going Lone Wolf or Blind Wolf offers higher rewards but greater risk
- The rotating Wolf position ensures everyone gets opportunities

---

## Wolf Rules

### Rotation Order

The Wolf rotates each hole based on a pre-set order:

| Hole | 3 Players (A,B,C) | 4 Players (A,B,C,D) |
|------|-------------------|---------------------|
| 1 | A | A |
| 2 | B | B |
| 3 | C | C |
| 4 | A | D |
| 5 | B | A |
| 6 | C | B |
| ... | ... | ... |
| 18 | C | B |

The order can be customized during setup (shuffle or manual reorder).

### Partner Selection

The Wolf watches each player tee off in order. After each tee shot, the Wolf can:
1. **Select that player as partner** (immediately, no going back)
2. **Pass** and wait to see the next tee shot

If the Wolf passes on all players, they become **Lone Wolf** by default.

**Blind Wolf**: The Wolf can declare Blind Wolf **before anyone tees off** - this must be decided before seeing any shots and offers the highest reward.

### Determining the Winner

The team with the **best individual score** on the hole wins:

| Scenario | Winner Determination |
|----------|---------------------|
| Wolf + Partner vs Pack | Best score between Wolf team vs best score of Pack |
| Lone Wolf vs Pack | Wolf's score vs best score of Pack |
| Blind Wolf vs Pack | Wolf's score vs best score of Pack |
| **Tie** | Hole is "pushed" - no points awarded |

**Net vs Gross**: If net scoring is enabled, handicap strokes are applied before comparing scores.

### Point Values

Points awarded depend on the Wolf's decision and outcome:

| Scenario | Wolf Team Wins | Pack Wins |
|----------|---------------|-----------|
| **Partner** | Wolf: 2 pts, Partner: 2 pts | Each Pack member: 3 pts |
| **Lone Wolf** | Wolf: 4 pts | Each Pack member: 1 pt |
| **Blind Wolf** | Wolf: 6 pts | Each Pack member: 2 pts |
| **Tie** | 0 pts all | 0 pts all |

### Example Game (4 Players)

**Players**: John (Wolf order 1), Sarah (2), Mike (3), You (4)
**Per-point value**: $1

| Hole | Wolf | Decision | Result | Points | Notes |
|------|------|----------|--------|--------|-------|
| 1 | John | + Sarah | Wolf wins | J:2, S:2 | Best partner score: 4 vs Pack: 5 |
| 2 | Sarah | Lone Wolf | Pack wins | M:1, Y:1 | Sarah:5 vs Pack best:4 |
| 3 | Mike | Blind Wolf 🔥 | Wolf wins | M:6 | Mike:3 vs Pack best:4 |
| 4 | You | + John | Tie | -- | Both teams:4, hole pushed |
| 5 | John | Lone Wolf | Wolf wins | J:4 | John:3 vs Pack best:4 |
| ... | ... | ... | ... | ... | ... |

**Final Standings**:
| Player | Points | Net Result ($1/pt) |
|--------|--------|-------------------|
| Mike | 18 | +$4.50 |
| John | 14 | +$0.50 |
| Sarah | 10 | -$3.50 |
| You | 12 | -$1.50 |

---

## Configuration Options

### Scoring Type

| Type | Description | Best For |
|------|-------------|----------|
| **Gross** | Raw strokes (no handicap) | Similar skill levels |
| **Net** | Handicap-adjusted strokes | Mixed skill levels |

### Blind Wolf

| Setting | Description |
|---------|-------------|
| **Enabled** (default) | Wolf can declare Blind Wolf before tee shots |
| **Disabled** | Blind Wolf option not available |

### Pot Settings

| Setting | Description |
|---------|-------------|
| **Pot Enabled** | Whether money is involved |
| **Per-Point Value** | Dollar value per point (e.g., $1.00) |
| **Currency** | Currency code (default: AUD) |

---

## Where to Configure Wolf

| Round Type | Location | Notes |
|------------|----------|-------|
| **Competition Rounds** | AddRoundScreen / EditRoundScreen | Configure in admin screens |

### Requirements

- **3-4 players** required (Wolf doesn't work with 2 or 5+ players)
- **Individual game types only**: Stableford, Stroke Play, Par (not team formats)
- **Premium tier required** - Feature gated to Premium and Super Admin
- **Disclaimer required** - First-time pot users must acknowledge gambling notice

---

## Premium Tier Gating

Wolf is a **Premium tier feature** gated by `FeatureId: 'wolf_game'`. Users on Free or Social tiers:
- See the Wolf option in the UI (graceful degradation)
- Cannot enable Wolf (shows upgrade prompt)
- Can view results for Wolf games they're part of

The `WolfSection` component checks access internally using `useCheckFeature('wolf_game')` — no `isPremium` prop is needed from parent components.

### Tier Access

| Tier | Can Create Wolf | Can View Results |
|------|-----------------|------------------|
| Free | ❌ | ✅ |
| Social | ❌ | ✅ |
| Premium | ✅ | ✅ |
| Super Admin | ✅ | ✅ |

---

## Gambling Disclaimer

For legal compliance, users must acknowledge a disclaimer before creating their first Wolf game with pot enabled:

**Disclaimer Points:**
1. This feature is for social entertainment only
2. All players must be of legal gambling age
3. The app does not process real money
4. Settlement is handled between players
5. Check local laws regarding gambling

The acknowledgment is stored locally (AsyncStorage) and persists across sessions.

---

## UI Flow

### Creating a Wolf Game

```
┌──────────────────────────────────────────────────────────────┐
│                    ROUND CREATION                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Select course and date                                   │
│  2. Add playing partners (3-4 players for Wolf)              │
│  3. Configure game type (Stableford/Stroke/Par)              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  🐺 ADD WOLF GAME                                [✓]  │  │
│  │  Strategic partner selection game                      │  │
│  │                                                        │  │
│  │  Scoring: Gross | Blind Wolf: Enabled                  │  │
│  │  Pot: $1.00 per point                                  │  │
│  │  Order: 1. John  2. Sarah  3. Mike  4. You             │  │
│  │  [Tap to configure]                                    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  4. Start scoring                                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### During Scoring

The scorecard header shows a **Wolf indicator** (dog icon) when Wolf is active:

```
┌────────────────────────────────────────────────────────────┐
│  Hole 7  ◀ ▶    🐺   🗑️                                    │
│  Par 4   SI: 12                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🐺 WOLF: Sarah                                      │  │
│  │  Choose your partner or go alone                     │  │
│  │                                                      │  │
│  │  [ Choose Partner ]                                  │  │
│  │                                                      │  │
│  │  Decision: Pending                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  [Score entry interface]                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Partner Selection Modal

```
┌────────────────────────────────────────────────────────────┐
│                   🐺 WOLF'S CHOICE                         │
│                   Hole 7 • Sarah                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  PICK A PARTNER                                            │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  👤 John                                           │    │
│  │  Win: 2 pts ($2) | Lose: Pack gets 3 pts each      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  👤 Mike                                           │    │
│  │  Win: 2 pts ($2) | Lose: Pack gets 3 pts each      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  👤 You                                            │    │
│  │  Win: 2 pts ($2) | Lose: Pack gets 3 pts each      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ─────────────────── OR ───────────────────                │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  🐺 LONE WOLF                                      │    │
│  │  Win: 4 pts ($4) | Lose: Pack gets 1 pt each       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  🔥 BLIND WOLF                                     │    │
│  │  Win: 6 pts ($6) | Lose: Pack gets 2 pts each      │    │
│  │  ⚠️ Only available before scores entered           │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│                    [ Decide Later ]                        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Reviewing Results

After the round, the **Wolf Game Section** appears on the View Round screen:

```
┌────────────────────────────────────────────────────────────┐
│  🐺 WOLF RESULTS                                           │
│  Gross | Blind Wolf | $1/pt | 4 players                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Hole │ Wolf  │ Choice      │ Result │ Points             │
│  ─────┼───────┼─────────────┼────────┼────────────────────│
│    1  │ John  │ + Sarah     │ Wolf   │ J:2 S:2            │
│    2  │ Sarah │ Lone Wolf   │ Pack   │ M:1 Y:1            │
│    3  │ Mike  │ Blind 🔥    │ Wolf   │ M:6                │
│    4  │ You   │ + John      │ Tie    │ --                 │
│    5  │ John  │ Lone Wolf   │ Wolf   │ J:4                │
│   ... │ ...   │ ...         │ ...    │ ...                │
│                                                            │
│  ● Wolf: 10  ● Pack: 6  ● Tie: 2                          │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  🏆 STANDINGS                                              │
│  Ranked by total points • Net result shown                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   #  │ Player │ Points │ Net                              │
│  ────┼────────┼────────┼──────                            │
│  🥇  │ Mike   │   18   │ +$4.50                           │
│  🥈  │ John   │   14   │ +$0.50                           │
│  🥉  │ You    │   12   │ -$1.50                           │
│   4  │ Sarah  │   10   │ -$3.50                           │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  💰 SETTLEMENT                                             │
│  Per-point value: $1.00                                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  TOTALS                                                    │
│  Player │ Points │ Winnings │ Net                         │
│  ───────┼────────┼──────────┼─────                        │
│  Mike   │   18   │  $18.00  │ +$4.50                      │
│  John   │   14   │  $14.00  │ +$0.50                      │
│  You    │   12   │  $12.00  │ -$1.50                      │
│  Sarah  │   10   │  $10.00  │ -$3.50                      │
│  ───────┼────────┼──────────┼─────                        │
│  Total  │   54   │  $54.00  │ --                          │
│                                                            │
│  WHO OWES WHO:                                             │
│  Sarah ────► Mike: $4.00                                   │
│  You   ────► Mike: $0.50                                   │
│  Sarah ────► John: $0.50 (via You)                         │
│                                                            │
│  [Share Results]  [Mark as Settled]                        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `wolf_games` | Game configuration (scoring type, pot, participants, wolf order) |
| `wolf_hole_decisions` | Hole-by-hole decisions and results |
| `wolf_payouts` | Final settlement per player |

### Key Relationships

```
rounds
  └── wolf_games (1:1 per round)
        ├── wolf_hole_decisions (1:18 per game)
        └── wolf_payouts (1:N per participant)
```

### Schema Details

**wolf_games**:
- `id` (UUID, PK)
- `round_id` (FK to rounds)
- `participant_ids` (UUID[] - 3-4 players)
- `wolf_order` (UUID[] - rotation order)
- `scoring_type` ('gross' | 'net')
- `blind_wolf_enabled` (boolean)
- `pot_enabled` (boolean)
- `pot_value_per_point` (decimal)
- `currency` (text)
- `status` ('active' | 'completed' | 'cancelled')

**wolf_hole_decisions**:
- `id` (UUID, PK)
- `wolf_game_id` (FK)
- `hole_number` (1-18)
- `wolf_id` (UUID - who is Wolf this hole)
- `is_blind_wolf` (boolean)
- `partner_id` (UUID, null for lone wolf)
- `hole_scores` (JSONB - { player_id: score })
- `is_tie` (boolean)
- `wolf_team_won` (boolean | null)
- `points_awarded` (JSONB - { player_id: points })

**wolf_payouts**:
- `id` (UUID, PK)
- `wolf_game_id` (FK)
- `player_id` (FK)
- `total_points` (integer)
- `total_winnings` (decimal)
- `net_result` (decimal)

---

## API Reference

### TanStack Query Hooks

```typescript
import {
  // Queries
  useWolfGame,
  useWolfGameByRound,
  useWolfHoleDecisions,
  useWolfCurrentHoleDecision,
  useWolfStandings,
  useWolfPayouts,
  useWolfSummary,
  useCanUseWolf,
  // Mutations
  useCreateWolfGame,
  useSubmitWolfDecision,
  useRecordWolfHoleResult,
  useFinalizeWolfGame,
  useCancelWolfGame,
  useDeleteWolfGame,
} from '@/hooks/wolf';
```

### Query Hooks

| Hook | Description | Returns |
|------|-------------|---------|
| `useWolfGame(gameId)` | Fetch single game with participants | `WolfGameWithParticipants` |
| `useWolfGameByRound(roundId)` | Wolf game for a round | `WolfGameWithParticipants` |
| `useWolfHoleDecisions(gameId)` | All hole decisions | `WolfDecisionWithDetails[]` |
| `useWolfCurrentHoleDecision(gameId, hole)` | Decision for specific hole | `WolfDecisionWithDetails` |
| `useWolfStandings(gameId)` | Current standings | `WolfStandingEntry[]` |
| `useWolfPayouts(gameId)` | Final payouts | `WolfPayoutWithPlayer[]` |
| `useWolfSummary(gameId)` | Complete game summary | `WolfGameSummary` |
| `useCanUseWolf(userId)` | Feature access check | `boolean` |

### Mutation Hooks

| Hook | Description | Input |
|------|-------------|-------|
| `useCreateWolfGame()` | Create new Wolf game | `CreateWolfGameInput` |
| `useSubmitWolfDecision()` | Submit partner decision | `SubmitWolfDecisionInput` |
| `useRecordWolfHoleResult()` | Record hole scores/result | `RecordWolfHoleResultInput` |
| `useFinalizeWolfGame()` | Complete game, calculate payouts | `{ gameId }` |
| `useCancelWolfGame()` | Cancel active game | `{ gameId }` |

---

## Calculation Utilities

All calculation functions are pure and located in `src/utils/wolfCalculations.ts`:

### Wolf Rotation

```typescript
// Determine who is Wolf for a specific hole
determineWolfForHole(['p1', 'p2', 'p3', 'p4'], 5); // → 'p1'

// Get Wolf for all 18 holes
getWolfRotationForRound(['p1', 'p2', 'p3', 'p4']);
// → Map { 1 => 'p1', 2 => 'p2', 3 => 'p3', 4 => 'p4', 5 => 'p1', ... }
```

### Winner Determination

```typescript
// Determine hole winner
const result = determineWolfHoleResult(
  scores,           // { p1: 4, p2: 5, p3: 4, p4: 6 }
  'p1',             // Wolf ID
  'p3',             // Partner ID (null for lone wolf)
  scoringType,      // 'gross' | 'net'
  handicapStrokes   // optional
);
// → { wolfTeamWon: true, isTie: false }
```

### Points Calculation

```typescript
// Calculate points for a hole
const points = calculateWolfPoints(
  wolfId,
  partnerId,        // null for lone/blind wolf
  isBlindWolf,
  wolfTeamWon,
  isTie,
  participantIds
);
// → { p1: 2, p3: 2, p2: 0, p4: 0 }
```

### Standings & Payouts

```typescript
// Calculate standings
const standings = calculateWolfStandings(decisions);
// → Map { p1 => 14, p2 => 18, p3 => 10, p4 => 12 }

// Get sorted standings with ranks
const ranked = getSortedStandings(standings, playerNames);
// → [{ player_id, name, total_points, rank }, ...]

// Calculate payouts (zero-sum)
const payouts = calculateWolfPayouts(standings, potValuePerPoint);
// → { p1: { winnings: 14, netResult: 0.50 }, ... }
```

### Debt Simplification

```typescript
// Simplify who owes whom
const debts = simplifyWolfDebts(payouts);
// → [{ fromPlayerId, toPlayerId, amount }, ...]
```

---

## Integration Points

### Score Submission

Wolf hole results are calculated when all scores are entered:

1. **Score Entry**: Player enters score on ScorecardEntryScreen
2. **Wolf Check**: System checks if all participants have scores for the hole
3. **Calculate Result**: If Wolf decision exists, calculates winner and points
4. **Update UI**: WolfDecisionPrompt shows result

### Scorecard Submission

When a scorecard is submitted:

1. **Submit Scorecard**: Normal submission flow
2. **Finalize Wolf**: Game auto-finalizes when all 18 holes complete
3. **Calculate Payouts**: Final standings and net results calculated
4. **Results Available**: Wolf section shows full settlement

### Non-Blocking

Wolf processing is **non-blocking** - failures don't prevent:
- Score entry
- Scorecard submission
- Round completion

Errors are logged but don't interrupt the main flow.

---

## Locking Behavior

| Round Status | Wolf Config | Wolf Decisions |
|--------------|-------------|----------------|
| Scheduled | Editable | N/A |
| In Progress | Read-only | Active |
| Completed | Read-only | Complete |

Once a round starts, Wolf configuration cannot be changed.

---

## Supported Game Types

Wolf only works with **individual play formats**:

| Game Type | Wolf Supported | Reason |
|-----------|---------------|--------|
| Stableford | ✅ | Individual scoring |
| Stroke Play | ✅ | Individual scoring |
| Par | ✅ | Individual scoring |
| Match Play | ❌ | Team-based format |
| Best Ball | ❌ | Team-based format |
| Scramble | ❌ | Team-based format |
| Shamble | ❌ | Team-based format |

---

## Troubleshooting

### Common Issues

**"Wolf requires 3-4 players"**
- Wolf only works with exactly 3 or 4 players
- Adjust your playing partners before enabling Wolf

**"Blind Wolf unavailable"**
- Blind Wolf can only be declared BEFORE any scores are entered
- Once a score is entered, only Partner or Lone Wolf options remain

**"Wolf section not showing"**
- Verify game type is Stableford, Stroke Play, or Par
- Verify you have 3-4 players
- Verify round has Wolf enabled in setup

**"Points not calculating"**
- All participants must have scores entered for the hole
- Wolf decision must be submitted
- Check network connectivity for sync

---

## Related Documentation

- [DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md) - Wolf table schemas
- [SUBSCRIPTION_TIERS.md](./SUBSCRIPTION_TIERS.md) - Premium tier feature
- [ALGORITHMS.md](./ALGORITHMS.md) - Scoring calculations
- [SKINS_GAME.md](./SKINS_GAME.md) - Related side-game feature
- [CLAUDE.md](../../CLAUDE.md) - Project overview

---

*Last Updated: February 2026*
