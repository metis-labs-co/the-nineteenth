# Skins Game Feature Guide

## Overview

**Skins** is a popular golf betting side-game that runs alongside any existing game type (Stableford, Stroke Play, Match Play, etc.). Players compete hole-by-hole for a pot of money, where the player with the lowest score on each hole wins that hole's value. If two or more players tie for the lowest score, no one wins and the pot "carries over" to the next hole.

### What is a Skins Game?

A skins game consists of:
- **Participants**: 2-4 players competing for the pot
- **Pot Configuration**: Either a per-hole value ($5/hole) OR a total pot ($90 split across 18 holes)
- **Scoring Type**: Gross (raw strokes) OR Net (handicap-adjusted)
- **Carryover**: When holes are tied, the pot accumulates for the next hole
- **Settlement**: At the end, winnings minus buy-in determines who owes whom

### Example Game

**4 players, $5 per hole skins game:**

| Hole | John | Sarah | Mike | You | Winner | Pot Value | Notes |
|------|------|-------|------|-----|--------|-----------|-------|
| 1 | 4 | 4 | 5 | 5 | -- | $0 | Tied (J/S), $5 carries |
| 2 | 3 | 4 | 4 | 4 | John | $10 | Wins $5 base + $5 carryover |
| 3 | 5 | 4 | 4 | 4 | -- | $0 | Tied (3 players), $5 carries |
| 4 | 4 | 3 | 4 | 5 | Sarah | $10 | Wins $5 base + $5 carryover |
| ... | ... | ... | ... | ... | ... | ... | ... |
| 18 | 5 | 5 | 5 | 5 | -- | $5 | All tied - split evenly |

**Final Settlement:**
- **Total pot**: $90 ($5 × 18 holes)
- **Buy-in per player**: $22.50 ($90 ÷ 4)
- John won $45 → Net: **+$22.50**
- Sarah won $25 → Net: **+$2.50**
- Mike won $10 → Net: **-$12.50**
- You won $10 → Net: **-$12.50**

---

## Configuration Options

### Pot Type

Choose how the pot is calculated:

| Pot Type | Description | Example |
|----------|-------------|---------|
| **Per Hole** | Fixed amount for each hole | $5/hole = $90 total |
| **Total Pot** | Total split across 18 holes | $90 total = $5/hole |

### Scoring Type

Choose how hole winners are determined:

| Scoring Type | Description | Best For |
|--------------|-------------|----------|
| **Gross** | Raw strokes (no handicap) | Similar skill levels |
| **Net** | Handicap-adjusted strokes | Mixed skill levels |

**Net scoring example:**
- Player A (handicap 18) shoots 5 on a hole with stroke index 6 → Net: 5 - 1 = 4
- Player B (handicap 10) shoots 4 on the same hole → Net: 4 - 0 = 4
- Result: **Tie - carryover**

### Pool Source (Phase 2)

For competition rounds, you can optionally draw from the prize pool:

| Source | Description | When to Use |
|--------|-------------|-------------|
| **Direct** | Players pay buy-in directly | Most common |
| **Prize Pool** | Draw from competition prize pool | Organized events |

---

## Carryover Rules

### Basic Carryover

When two or more players tie for the lowest score on a hole:
1. No one wins that hole
2. The hole's pot value carries over to the next hole
3. The next hole is now worth more

**Example:**
```
Hole 5: $5 pot value
  - Player A: 4, Player B: 4, Player C: 5, Player D: 6
  - Tied! $5 carries over

Hole 6: $5 base + $5 carryover = $10 pot value
  - Player A: 3, Player B: 4, Player C: 4, Player D: 5
  - Player A wins $10!
```

### Hole 18 Carryover

If hole 18 ends in a tie with accumulated carryover:
- The remaining pot is **split evenly** among all participants
- This is the simplest fair resolution

**Example:**
```
Hole 18: $5 base + $15 carryover = $20 pot value
  - All 4 players score 4 → Tied!
  - $20 ÷ 4 players = $5 each
```

---

## Where to Configure Skins

| Round Type | Location | Notes |
|------------|----------|-------|
| **Standalone Rounds** | CreateRoundBottomSheet → ScoringSetupStep | Configure during round creation |
| **Competition Rounds** | AddRoundScreen / EditRoundScreen | Configure in admin screens |

### Requirements

- **Minimum 2 players** (maximum 4) to enable skins
- **Premium tier required** - Feature gated to Premium and Super Admin
- **Disclaimer required** - First-time users must acknowledge gambling notice

---

## Premium Tier Gating

Skins is a **Premium tier feature** gated by `FeatureId: 'skins_game'`. Users on Free or Social tiers:
- See the skins option in the UI (graceful degradation)
- Cannot enable skins (shows upgrade prompt)
- Can view results for skins games they're part of

The `SkinsSection` component checks access internally using `useCheckFeature('skins_game')` — no `isPremium` prop is needed from parent components.

### Tier Access

| Tier | Can Create Skins | Can View Results |
|------|------------------|------------------|
| Free | ❌ | ✅ |
| Social | ❌ | ✅ |
| Premium | ✅ | ✅ |
| Super Admin | ✅ | ✅ |

---

## Gambling Disclaimer

For legal compliance, users must acknowledge a disclaimer before creating their first skins game:

**Disclaimer Points:**
1. This feature is for social entertainment only
2. All players must be of legal gambling age
3. The app does not process real money
4. Settlement is handled between players
5. Check local laws regarding gambling

The acknowledgment is stored locally (AsyncStorage) and persists across sessions.

---

## UI Flow

### Creating a Skins Game

```
┌──────────────────────────────────────────────────────────────┐
│                    ROUND CREATION                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Select course and date                                   │
│  2. Add playing partners (2-4 players)                       │
│  3. Configure game type (Stableford, etc.)                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  💰 ADD SKINS GAME                               [✓]  │  │
│  │  Hole-by-hole betting between players                 │  │
│  │                                                        │  │
│  │  Pot: $5 per hole                                     │  │
│  │  Scoring: Gross                                       │  │
│  │  [Tap to configure]                                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  4. Start scoring                                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### During Scoring

The scorecard header shows a **skins indicator** (dice icon) when skins is active:

```
┌────────────────────────────────────────────────────────────┐
│  Hole 7  ◀ ▶    🎲₂  🗑️                                   │
│  Par 4   SI: 12                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  [Score entry interface]                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘

🎲₂ = Skins active, 2 holes worth of carryover
```

Tapping the indicator shows a popover with:
- Current pot value
- Accumulated carryover
- Last hole winner

### Reviewing Results

After the round, a **Skins tab** appears on the Review Scorecard screen:

```
┌────────────────────────────────────────────────────────────┐
│  [Scorecard]  [Skins]                                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🎲 SKINS RESULTS                                          │
│  $5/hole | Gross | 18 holes                                │
│                                                            │
│  ┌─────┬─────┬──────────┬────────┬───────────────────┐    │
│  │Hole │ Par │ Winner   │ Value  │ Notes             │    │
│  ├─────┼─────┼──────────┼────────┼───────────────────┤    │
│  │ 1   │  4  │ --       │ $0     │ Tied, carried     │    │
│  │ 2   │  5  │ John     │ $10    │ 4 strokes         │    │
│  │ 3   │  3  │ --       │ $0     │ Tied, carried     │    │
│  │ ... │     │          │        │                   │    │
│  └─────┴─────┴──────────┴────────┴───────────────────┘    │
│                                                            │
│  Front 9: $45 paid out                                     │
│  Back 9: $40 paid out                                      │
│  Unsettled: $5                                             │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  💰 SETTLEMENT SUMMARY                                     │
│                                                            │
│  Player      Holes Won  Total Won   Net Result             │
│  John        5          $45         +$22.50                │
│  Sarah       3          $25         +$2.50                 │
│  Mike        1          $10         -$12.50                │
│  You         1          $10         -$12.50                │
│                                                            │
│  WHO OWES WHO:                                             │
│  Mike ────► John: $10.00                                   │
│  You  ────► John: $10.00                                   │
│  You  ────► Sarah: $2.50                                   │
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
| `skins_games` | Game configuration (pot, scoring type, participants) |
| `skins_results` | Hole-by-hole outcomes (winner or carryover) |
| `skins_payouts` | Final settlement per player |

### Key Relationships

```
rounds
  └── skins_games (1:1 per round)
        ├── skins_results (1:18 per game)
        └── skins_payouts (1:N per participant)
```

### Schema Details

See [DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md) for complete table definitions, constraints, and RLS policies.

---

## API Reference

### TanStack Query Hooks

```typescript
import {
  useSkinsGame,
  useSkinsGamesByRound,
  useSkinsResults,
  useSkinsPayouts,
  useSkinsSummary,
  useCreateSkinsGame,
  useProcessSkinsHole,
  useFinalizeSkinsGame,
  useCancelSkinsGame,
  useCanUseSkins,
  useActiveSkinsGameForRound,
  useProcessSkinsIfNeeded,
  useFinalizeSkinsForRound,
} from '@/hooks/useSkins';
```

### Query Hooks

| Hook | Description | Returns |
|------|-------------|---------|
| `useSkinsGame(gameId)` | Fetch single game with participants | `SkinsGameWithParticipants` |
| `useSkinsGamesByRound(roundId)` | All skins games for a round | `SkinsGame[]` |
| `useSkinsResults(gameId)` | Hole-by-hole results | `SkinsResultWithWinner[]` |
| `useSkinsPayouts(gameId)` | Final payouts | `SkinsPayoutWithPlayer[]` |
| `useSkinsSummary(gameId)` | Complete game summary | `SkinsGameSummary` |
| `useCanUseSkins(userId)` | Feature access check | `boolean` |
| `useActiveSkinsGameForRound(roundId)` | Get active game for round | `SkinsGame \| null` |

### Mutation Hooks

| Hook | Description | Input |
|------|-------------|-------|
| `useCreateSkinsGame()` | Create new skins game | `CreateSkinsGameInput` |
| `useProcessSkinsHole()` | Process hole result | `ProcessSkinsHoleInput` |
| `useFinalizeSkinsGame()` | Complete game, calculate payouts | `gameId` |
| `useCancelSkinsGame()` | Cancel active game | `gameId` |

### Processing Hooks

| Hook | Description | When to Use |
|------|-------------|-------------|
| `useProcessSkinsIfNeeded(roundId)` | Process skins when all scores in | After score entry |
| `useFinalizeSkinsForRound(roundId)` | Finalize on scorecard submit | On scorecard submission |

---

## Calculation Utilities

All calculation functions are pure and located in `src/utils/skinsCalculations.ts`:

### Pot Calculations

```typescript
// Calculate value per hole
calculateHoleValue('per_hole', 5);   // → 5
calculateHoleValue('total_pot', 90); // → 5

// Calculate total pot
calculateTotalPot('per_hole', 5);    // → 90
calculateTotalPot('total_pot', 90);  // → 90

// Calculate buy-in per player
calculateBuyIn('per_hole', 5, 4);    // → 22.50
```

### Winner Determination

```typescript
// Determine hole winner from scores
const result = determineHoleWinner(holeScores, 'gross');
// → { winnerId: 'player-1', isCarryover: false, minScore: 4, tiedPlayerIds: [] }

// Or if tied
// → { winnerId: null, isCarryover: true, minScore: 4, tiedPlayerIds: ['p1', 'p2'] }
```

### Debt Simplification

```typescript
// Calculate who owes whom with minimum transactions
const netPositions = calculateNetPositions(payouts);
const transactions = simplifyDebts(netPositions);
const readable = formatDebtTransactions(transactions, playerMap);
// → ["Mike owes John $10.00", "You owe Sarah $2.50"]
```

---

## Integration Points

### Score Submission

Skins results are processed automatically when scores are entered:

1. **Score Entry**: Player enters score on ScorecardEntryScreen
2. **Skins Check**: `useProcessSkinsIfNeeded` checks if all participants have scores
3. **Process Hole**: If all scores in, calculates winner/carryover
4. **Update UI**: SkinsIndicator updates with carryover count

### Scorecard Submission

When a scorecard is submitted:

1. **Submit Scorecard**: Normal submission flow
2. **Finalize Skins**: `useFinalizeSkinsForRound` calculates final payouts
3. **Update Status**: Game marked as 'completed'
4. **Results Available**: Skins tab shows full settlement

### Non-Blocking

Skins processing is **non-blocking** - failures don't prevent:
- Score entry
- Scorecard submission
- Round completion

Errors are logged but don't interrupt the main flow.

---

## Locking Behavior

| Round Status | Skins Config | Skins Processing |
|--------------|--------------|------------------|
| Scheduled | Editable | N/A |
| In Progress | Read-only | Active |
| Completed | Read-only | Complete |

Once a round starts, skins configuration cannot be changed.

---

## Competition Prize Pools

For organized competitions, skins games can draw from a **competition prize pool** instead of requiring direct buy-ins from players. This provides centralized funding for skins and other prizes.

### What is a Prize Pool?

A prize pool is a competition-level fund that can finance:
- **Skins games** for each round
- **Winner prizes** (overall competition winner)
- **Other prizes** (best round, longest drive, etc.)

### Funding Types

| Type | Description | Example |
|------|-------------|---------|
| **Per Player** | Amount per player × player count | $50/player × 8 players = $400 |
| **Fixed Total** | Fixed total amount | $500 regardless of player count |

### Allocation

The total pool is divided into budgets using percentages:

| Allocation | Description | Example ($400 pool) |
|------------|-------------|---------------------|
| **Skins Budget** | Funds for skins games | 60% = $240 |
| **Winner Budget** | Funds for overall winner | 30% = $120 |
| **Other Budget** | Funds for other prizes | 10% = $40 |

Allocations must total ≤ 100%. Unallocated funds remain in reserve.

### Auto-Split

When **auto-split skins** is enabled:
1. Skins budget is divided equally across all rounds
2. Skins games are automatically created for each round
3. Each game draws its pot from the pool

**Example:** $240 skins budget ÷ 4 rounds = $60 per round

### Pool Source Selection

When creating a skins game for a competition round:

| Source | Description | When to Use |
|--------|-------------|-------------|
| **Direct Pot** | Players pay buy-in directly | Most standalone rounds |
| **From Prize Pool** | Draw from competition pool | Competition rounds with pool |

### Carryover Behavior

**Prize Pool Skins** vs **Direct Pot Skins**:

| Scenario | Direct Pot | Prize Pool |
|----------|------------|------------|
| Hole 18 tie (carryover) | Split among all players | Returned to pool |
| Unused budget | N/A | Returns to pool for reallocation |

### Locking Rules

| What | When Locked | Implication |
|------|-------------|-------------|
| Prize Pool Config | First round starts | Cannot change funding or allocations |
| Pool Allocations | First round starts | Budgets fixed |
| Round Skins Config | That round starts | Cannot change pot value or scoring type |

### Prize Pool Flow

```
Competition Created
        ↓
Prize Pool Configured (optional)
  ├─ Funding Type: Per-player ($X × players) OR Fixed Total ($Y)
  └─ Allocations: Skins Budget %, Winner Prizes %, Other %
        ↓
Rounds Scheduled
        ↓
Skins Enabled on Round (draws from pool OR separate pot)
        ↓
Round Starts → Pool LOCKED
        ↓
Round Completes
  ├─ Skins settled per-round
  └─ Carryover returns to pool (not split among players)
        ↓
Competition Ends → Remaining pool distributed to prize winners
```

### Example Scenario

**Competition: 8 players, 4 rounds, Prize Pool $400**

**Configuration:**
- Funding: $50 per player × 8 players = $400 total
- Allocation: Skins 60% ($240), Winner 30% ($120), Other 10% ($40)
- Auto-split enabled: $60 per round

**Round Flow:**
| Round | Pot | Payouts | Carryover | Returned to Pool |
|-------|-----|---------|-----------|------------------|
| 1 | $60 | $50 | $10 | $10 |
| 2 | $60 | $55 | $5 | $5 |
| 3 | $60 | $60 | $0 | $0 |
| 4 | $60 + $15 unused | $75 | $0 | $0 |

**End of Competition:**
- Skins: Settled per-round (individual player settlements)
- Winner: $120 to overall competition winner
- Other: $40 to best round winner

---

## Statistics & Leaderboards

The app tracks comprehensive skins statistics for each player, enabling leaderboards and personal performance tracking.

### Player Statistics

Statistics are automatically updated when skins games complete:

| Statistic | Description |
|-----------|-------------|
| **Games Played** | Total completed skins games |
| **Games Won** | Games with positive net result |
| **Win Rate** | % of games with positive net |
| **Holes Won** | Total holes won outright |
| **Holes Tied** | Total holes tied (carryover) |
| **Hole Win Rate** | % of holes won outright |
| **Total Buy-ins** | Sum of all buy-ins paid |
| **Total Winnings** | Sum of all winnings |
| **Net Result** | Total profit/loss (winnings - buy-ins) |
| **Current Streak** | Consecutive positive-net games |
| **Longest Streak** | Best streak ever |

### Leaderboard

Players are ranked by **net result** (total profit/loss):

```
┌──────────────────────────────────────────────────────────────┐
│  SKINS LEADERBOARD                                           │
├──────────────────────────────────────────────────────────────┤
│  Rank │ Player     │ Games │ Win Rate │ Holes │ Net Result  │
├───────┼────────────┼───────┼──────────┼───────┼─────────────┤
│  🥇 1 │ John Smith │   15  │   73%    │   42  │  +$325.00   │
│  🥈 2 │ Sarah Lee  │   12  │   67%    │   28  │  +$180.50   │
│  🥉 3 │ Mike Chen  │   18  │   55%    │   35  │  +$95.00    │
│     4 │ You        │   10  │   50%    │   18  │  -$12.50    │
│     5 │ Alex Wong  │    8  │   38%    │   12  │  -$45.00    │
└──────────────────────────────────────────────────────────────┘
```

### Leaderboard Filters

| Filter | Description |
|--------|-------------|
| **Friends Only** | Show only friends |
| **Minimum Games** | Require X games for ranking |

### Statistics UI Components

**SkinsStatsCard** - Personal statistics display:
- Featured net result (color-coded +/-)
- Win rate and games record
- Hole statistics
- Streak information

**SkinsLeaderboard** - Ranked player list:
- Medal icons for top 3
- Current user highlighted
- Pull-to-refresh
- Pagination support

**SkinsGameHistoryList** - Past games:
- Course and date
- Pot value and scoring type
- Net result per game
- Holes record (W/T/L)

### API Hooks

```typescript
import {
  useSkinsStatistics,
  useMySkinsStatistics,
  useSkinsLeaderboard,
  useSkinsGameHistory,
  useSkinsRank,
} from '@/hooks/useSkins';

// Get statistics for a player
const { data: stats } = useSkinsStatistics(playerId);

// Get your own statistics
const { data: myStats } = useMySkinsStatistics();

// Get leaderboard
const { data: leaderboard } = useSkinsLeaderboard({
  limit: 10,
  minGames: 3,
  friendsOnly: false,
});

// Get game history
const { data: history } = useSkinsGameHistory(playerId, {
  limit: 20,
  offset: 0,
});

// Get player's rank
const { data: rank } = useSkinsRank(playerId, 1);
```

---

## Related Documentation

- [DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md) - Skins table schemas
- [SUBSCRIPTION_TIERS.md](./SUBSCRIPTION_TIERS.md) - Premium tier feature
- [ALGORITHMS.md](./ALGORITHMS.md) - Scoring calculations
- [CLAUDE.md](../../CLAUDE.md) - Project overview

---

*Last Updated: January 2026*
