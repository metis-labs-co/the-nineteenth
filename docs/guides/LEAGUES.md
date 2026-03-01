# Leagues Feature Guide

## Overview

**Leagues** allow players to compete across any golf course using WHS (World Handicap System) handicap differentials. Instead of everyone playing the same course, players can play wherever they want and tag their completed scorecards to the league. The leaderboard ranks players by their average of their best 8 handicap differentials from their last 20 tagged rounds -- mirroring how the WHS calculates handicap indexes.

### What is a League?

A league consists of:
- **Players**: Any number of members who join via an invite code
- **Tagged Rounds**: Completed 18-hole scorecards with handicap differentials
- **Leaderboard**: Players ranked by average of best 8 differentials from their last 20 rounds
- **League Type**: Ongoing (no end), Season (time-based), or Round Limit (set number of rounds)

### Why Leagues?

Leagues solve a key problem for social golf groups: players rarely play the same course at the same time. With leagues, everyone can play their normal rounds at any course and still compete against each other on a fair, handicap-adjusted basis.

### How Rankings Work

The leaderboard uses the WHS handicap differential formula:

```
Handicap Differential = (113 / Slope Rating) x (Gross Score - Course Rating)
```

For each player, the system:
1. Takes their **last 20** tagged rounds
2. Selects the **best 8** differentials (lowest values)
3. Averages those 8 differentials
4. Ranks players by average (lower = better)

### Example

**4 players, various courses:**

| Player | Course | Gross | Rating | Slope | Differential |
|--------|--------|-------|--------|-------|-------------|
| John | Royal Melbourne | 82 | 72.5 | 132 | 8.2 |
| Sarah | Kingston Heath | 88 | 73.0 | 128 | 13.2 |
| Mike | Metropolitan | 79 | 71.0 | 126 | 7.2 |
| You | Spring Valley | 85 | 70.5 | 118 | 13.9 |

After 20 rounds each, the leaderboard shows each player's average of their best 8:

| Rank | Player | Rounds | Counting | Avg Diff | Best Diff |
|------|--------|--------|----------|----------|-----------|
| 1 | Mike | 20 | 8 | 8.4 | 5.1 |
| 2 | John | 18 | 8 | 10.2 | 6.8 |
| 3 | You | 15 | 8 | 14.1 | 9.3 |
| 4 | Sarah | 12 | 8 | 15.8 | 11.2 |

---

## Configuration Options

### League Type

Choose how the league operates:

| Type | Description | Best For |
|------|-------------|----------|
| **Ongoing** | No end date, runs indefinitely | Year-round social groups |
| **Season** | Time-bound league (e.g., summer 2026) | Seasonal competitions |
| **Round Limit** | Fixed number of rounds per player | Structured mini-leagues |

### League Status

| Status | Description |
|--------|-------------|
| **Active** | Accepting new rounds and members |
| **Archived** | Read-only, no new rounds or members |

---

## Subscription Tier Gating

Leagues are gated by subscription tier. Free users cannot create or join leagues.

### Tier Access

| Tier | Can Create | Max Owned | Can Join |
|------|-----------|-----------|----------|
| Free | No | 0 | No |
| Social | Yes | 3 | Yes (unlimited) |
| Premium | Yes | Unlimited | Yes (unlimited) |
| Super Admin | Yes | No limit | Yes (unlimited) |

### Tier Check Functions

The database provides a function to validate league creation:

```sql
-- Check if a user can create more leagues
SELECT user_can_create_league('user-uuid-here');
-- Returns: TRUE or FALSE
```

The function checks:
1. User's subscription tier
2. Current count of active leagues owned
3. Whether they have reached their tier limit

Enforcement happens at the app layer using the tier limits, with the database function as a secondary guard.

---

## UI Flow

### League List Screen

The Leagues tab replaces the Friends tab in bottom navigation (Friends moved to Profile menu).

```
+--------------------------------------------------------------+
|                    MY LEAGUES                                  |
+--------------------------------------------------------------+
|                                                                |
|  +----------------------------------------------------------+ |
|  |  Weekend Warriors                                         | |
|  |  #2 of 8 players  |  12 rounds played                    | |
|  |  Avg Diff: 14.2                                           | |
|  +----------------------------------------------------------+ |
|                                                                |
|  +----------------------------------------------------------+ |
|  |  Work Golf League                                         | |
|  |  #5 of 12 players  |  8 rounds played                    | |
|  |  Avg Diff: 18.7                                           | |
|  +----------------------------------------------------------+ |
|                                                                |
|  [ + Create League ]        [ Join League ]                   |
|                                                                |
+--------------------------------------------------------------+
```

On first visit, a "Welcome to Leagues" modal explains the feature.

### League Detail Screen

```
+--------------------------------------------------------------+
|  Weekend Warriors                          [Settings]          |
|  LGE-48271  |  8 players  |  Ongoing                         |
+--------------------------------------------------------------+
|  [Leaderboard]  [My Rounds]                                   |
+--------------------------------------------------------------+
|                                                                |
|   #  | Player       | Rounds | Counting | Avg Diff            |
|  ----+--------------+--------+----------+-----------           |
|   1  | Mike Chen    |   20   |    8     |   8.4               |
|   2  | John Smith   |   18   |    8     |  10.2               |
|   3  | You          |   15   |    8     |  14.1               |
|   4  | Sarah Lee    |   12   |    8     |  15.8               |
|   5  | Alex Wong    |    6   |    6     |  17.3               |
|                                                                |
|  [ Tag a Round ]                                              |
|                                                                |
+--------------------------------------------------------------+
```

On first visit, a "How Rankings Work" modal explains WHS differentials and the best-8-of-20 system.

### Tagging a Round

```
+--------------------------------------------------------------+
|              TAG ROUND TO LEAGUE                               |
+--------------------------------------------------------------+
|                                                                |
|  Select a completed scorecard to tag:                         |
|                                                                |
|  +----------------------------------------------------------+ |
|  |  Royal Melbourne  |  Feb 15, 2026                         | |
|  |  Gross: 82  |  Diff: 8.2  |  Completed                   | |
|  |                                    [ Tag ]                 | |
|  +----------------------------------------------------------+ |
|                                                                |
|  +----------------------------------------------------------+ |
|  |  Kingston Heath  |  Feb 10, 2026                          | |
|  |  Gross: 88  |  Diff: 13.2  |  Completed                  | |
|  |                                    [ Tag ]                 | |
|  +----------------------------------------------------------+ |
|                                                                |
|  +----------------------------------------------------------+ |
|  |  Spring Valley  |  Feb 5, 2026                            | |
|  |  Gross: 85  |  Diff: 13.9  |  Completed                  | |
|  |                                    [ Tag ]                 | |
|  +----------------------------------------------------------+ |
|                                                                |
+--------------------------------------------------------------+
```

### Player Rounds Modal

Tapping a player on the leaderboard opens a modal showing their tagged rounds:

```
+--------------------------------------------------------------+
|              Mike Chen's Rounds                                |
+--------------------------------------------------------------+
|                                                                |
|  +----------------------------------------------------------+ |
|  |  Metropolitan  |  Feb 20, 2026                            | |
|  |  Gross: 79  |  Diff: 7.2                                 | |
|  |  Rating: 71.0  |  Slope: 126                             | |
|  +----------------------------------------------------------+ |
|                                                                |
|  +----------------------------------------------------------+ |
|  |  Royal Melbourne  |  Feb 14, 2026                         | |
|  |  Gross: 81  |  Diff: 7.7                                 | |
|  |  Rating: 72.5  |  Slope: 132                             | |
|  +----------------------------------------------------------+ |
|                                                                |
|  Showing 20 rounds  |  Best 8 counting                       |
|                                                                |
+--------------------------------------------------------------+
```

---

## Round Tagging Rules

### Eligibility

A scorecard must meet all criteria to be tagged to a league:

| Requirement | Description |
|-------------|-------------|
| **18 holes** | Only full 18-hole rounds are eligible |
| **Completed status** | Scorecard must be `completed` or `confirmed` |
| **Has differential** | The scorecard must have a calculated `handicap_differential` |
| **Not already tagged** | Each scorecard can only be tagged once per league (unique constraint) |
| **League is active** | The league must have `status = 'active'` |
| **Player is member** | The player must be an accepted member of the league |

### Differential Calculation

The handicap differential stored on the scorecard is calculated as:

```
Differential = (113 / Slope Rating) x (Gross Score - Course Rating)
```

This value is stored on the `league_rounds` row at tag time, captured from the scorecard's existing `handicap_differential` field.

**Valid range**: -10.0 to 80.0 (enforced by database CHECK constraint)

### Untagging

Players can untag their own rounds at any time. When a round is untagged:
- The `league_rounds` row is deleted
- The leaderboard recalculates automatically
- Other members may receive rank-change notifications

---

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `leagues` | League configuration (name, type, invite code, status) |
| `league_players` | Player membership with status tracking |
| `league_rounds` | Scorecards tagged to leagues with handicap differentials |

### Key Relationships

```
leagues
  +-- league_players (1:N members)
  +-- league_rounds (1:N tagged rounds)
        +-- scorecards (N:1 linked scorecard)
```

### Schema Details

**leagues**:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | League name |
| `description` | TEXT | Optional description |
| `created_by` | UUID | FK to `players(id)`, league creator |
| `invite_code` | TEXT | Unique, auto-generated `LGE-XXXXX` format |
| `league_type` | TEXT | `'ongoing'`, `'season'`, or `'round_limit'` |
| `status` | TEXT | `'active'` or `'archived'` |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Auto-updated on change |

**league_players**:

| Column | Type | Description |
|--------|------|-------------|
| `league_id` | UUID | FK to `leagues(id)`, part of composite PK |
| `player_id` | UUID | FK to `players(id)`, part of composite PK |
| `status` | TEXT | `'invited'`, `'accepted'`, `'declined'`, or `'removed'` |
| `removed_by` | UUID | FK to `players(id)`, distinguishes voluntary leave vs admin removal |
| `joined_at` | TIMESTAMPTZ | When the player accepted |
| `created_at` | TIMESTAMPTZ | Row creation timestamp |

**league_rounds**:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `league_id` | UUID | FK to `leagues(id)` |
| `scorecard_id` | UUID | FK to `scorecards(id)` |
| `player_id` | UUID | FK to `players(id)` |
| `handicap_differential` | NUMERIC(4,1) | WHS differential, CHECK between -10 and 80 |
| `tagged_at` | TIMESTAMPTZ | When the round was tagged |
| `created_at` | TIMESTAMPTZ | Row creation timestamp |

### Key Constraints

| Constraint | Table | Description |
|------------|-------|-------------|
| `PK (league_id, player_id)` | `league_players` | Composite primary key |
| `unique_scorecard_per_league` | `league_rounds` | Each scorecard tagged once per league |
| `handicap_differential CHECK` | `league_rounds` | Value must be between -10 and 80 |
| `status CHECK` | `leagues` | Must be `'active'` or `'archived'` |
| `league_type CHECK` | `leagues` | Must be `'ongoing'`, `'season'`, or `'round_limit'` |
| `status CHECK` | `league_players` | Must be `'invited'`, `'accepted'`, `'declined'`, or `'removed'` |

### Indexes

```sql
CREATE INDEX idx_league_players_player ON league_players(player_id);
CREATE INDEX idx_league_players_status ON league_players(status);
CREATE INDEX idx_league_rounds_league ON league_rounds(league_id);
CREATE INDEX idx_league_rounds_player ON league_rounds(player_id);
CREATE INDEX idx_league_rounds_scorecard ON league_rounds(scorecard_id);
CREATE INDEX idx_leagues_status ON leagues(status);
CREATE INDEX idx_leagues_invite_code ON leagues(invite_code) WHERE status = 'active';
```

---

## Row-Level Security

All three tables have RLS enabled. Access is controlled through the `is_league_member()` helper function.

### RLS Helper

```sql
-- Check league membership without triggering RLS on league_players
CREATE OR REPLACE FUNCTION is_league_member(p_league_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM league_players
    WHERE league_id = p_league_id AND player_id = p_user_id AND status = 'accepted'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### Policies

**leagues**:

| Policy | Operation | Rule |
|--------|-----------|------|
| `leagues_select` | SELECT | Creator OR accepted member |
| `leagues_insert` | INSERT | Authenticated user is the `created_by` |
| `leagues_update` | UPDATE | Only creator |

**league_players**:

| Policy | Operation | Rule |
|--------|-----------|------|
| `league_players_select` | SELECT | League member OR league creator |
| `league_players_insert` | INSERT | User is inserting themselves (`auth.uid() = player_id`) |
| `league_players_update` | UPDATE | User is the player OR user is the league creator |

**league_rounds**:

| Policy | Operation | Rule |
|--------|-----------|------|
| `league_rounds_select` | SELECT | League member |
| `league_rounds_insert` | INSERT | User is inserting their own round (`auth.uid() = player_id`) |
| `league_rounds_delete` | DELETE | User owns the round (`auth.uid() = player_id`) |

---

## Database Functions

### Leaderboard

The core leaderboard function calculates rankings using the best-8-of-20 algorithm:

```sql
-- Returns ranked players by avg of best 8 differentials from last 20 rounds
SELECT * FROM get_league_leaderboard('league-uuid-here');
```

**Returns:**

| Column | Type | Description |
|--------|------|-------------|
| `player_id` | UUID | Player identifier |
| `name` | TEXT | Player display name |
| `photo_url` | TEXT | Player avatar URL |
| `rounds_played` | INTEGER | Total rounds in last-20 window |
| `rounds_counting` | INTEGER | Number of best differentials used (max 8) |
| `avg_differential` | NUMERIC(4,1) | Average of counting rounds (lower = better) |
| `best_differential` | NUMERIC(4,1) | Single best differential |
| `rank` | INTEGER | Leaderboard position (1 = best) |

**Algorithm breakdown:**

```sql
-- 1. Get last 20 rounds per player (ordered by tagged_at DESC)
-- 2. From those 20, select best 8 differentials (ordered ASC)
-- 3. Average the best 8
-- 4. Rank by average ascending (lower = better)
```

### Invite Code Generation

```sql
-- Auto-generates unique LGE-XXXXX invite code on INSERT
CREATE TRIGGER leagues_generate_invite_code
  BEFORE INSERT ON leagues
  FOR EACH ROW EXECUTE FUNCTION generate_league_invite_code();
```

The function generates a random 5-digit code prefixed with `LGE-` and loops until a unique code is found among active leagues.

### Tier Check

```sql
-- Check if user can create more leagues based on tier
SELECT user_can_create_league('user-uuid-here');
```

Logic:
- `-2` (super admin): Always returns TRUE
- `-1` (premium/unlimited): Always returns TRUE
- `0` (free): Always returns FALSE
- `N > 0` (social): Returns TRUE if current active league count < N

---

## TypeScript Types

All types are defined in `src/types/database/league.types.ts`:

```typescript
// Enums
type LeagueStatus = 'active' | 'archived';
type LeagueType = 'ongoing' | 'season' | 'round_limit';
type LeaguePlayerStatus = 'invited' | 'accepted' | 'declined' | 'removed';

// Core entities
interface League {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  invite_code: string;        // LGE-XXXXX format
  league_type: LeagueType;
  status: LeagueStatus;
  created_at: string;
  updated_at: string;
}

interface LeaguePlayer {
  league_id: string;
  player_id: string;
  status: LeaguePlayerStatus;
  joined_at: string;
  created_at: string;
}

interface LeagueRound {
  id: string;
  league_id: string;
  scorecard_id: string;
  player_id: string;
  handicap_differential: number;  // -10 to 80, 1 decimal
  tagged_at: string;
  created_at: string;
}

// Composite types
interface LeagueRoundDetail {
  id: string;
  scorecard_id: string;
  round_id: string;
  handicap_differential: number;
  tagged_at: string;
  total_gross: number;
  course_rating_used: number | null;
  slope_rating_used: number | null;
  daily_handicap_used: number | null;
  course_name: string;
  date_played: string | null;
}

interface LeagueLeaderboardEntry {
  player_id: string;
  name: string;
  photo_url: string | null;
  rounds_played: number;
  rounds_counting: number;      // Best N of last 20
  avg_differential: number;     // Lower = better
  best_differential: number;
  rank: number;
}

interface LeagueWithPlayerCount extends League {
  player_count: number;
}

interface LeagueWithUserRank extends LeagueWithPlayerCount {
  user_rank: number | null;
  user_rounds_played: number;
}
```

---

## API Reference

### Service Functions

All API calls are in `src/services/api/leagues.ts`:

```typescript
import {
  getLeagues,
  getLeague,
  getLeaguePlayers,
  getLeagueLeaderboard,
  getMyLeagueRounds,
  getPlayerLeagueRounds,
  getEligibleScorecards,
  getLeagueTagsForScorecard,
  createLeague,
  joinLeague,
  tagRoundToLeague,
  untagRound,
  leaveLeague,
  removePlayer,
  archiveLeague,
  updateLeague,
} from '@/services/api/leagues';
```

| Function | Description | Returns |
|----------|-------------|---------|
| `getLeagues()` | All leagues the user is a member of or created | `League[]` |
| `getLeague(id)` | Single league by ID | `League \| null` |
| `getLeaguePlayers(leagueId)` | Members with player details | `(LeaguePlayer & { player })[]` |
| `getLeagueLeaderboard(leagueId)` | Ranked leaderboard via DB function | `LeagueLeaderboardEntry[]` |
| `getMyLeagueRounds(leagueId)` | Current user's tagged rounds | `LeagueRound[]` |
| `getPlayerLeagueRounds(leagueId, playerId)` | A player's rounds with scorecard details | `LeagueRoundDetail[]` |
| `getEligibleScorecards(leagueId)` | Completed 18-hole scorecards not yet tagged | `EligibleScorecard[]` |
| `getLeagueTagsForScorecard(scorecardId)` | Which leagues a scorecard is tagged to | `{ leagueRoundId, leagueId, taggedAt }[]` |
| `createLeague(input)` | Create league (creator auto-joined) | `League` |
| `joinLeague(inviteCode)` | Join via invite code | `League` |
| `tagRoundToLeague(leagueId, scorecardId)` | Tag a scorecard to a league | `LeagueRound` |
| `untagRound(leagueRoundId)` | Remove a tagged round | `void` |
| `leaveLeague(leagueId)` | Leave a league (removes tagged rounds) | `void` |
| `removePlayer(leagueId, playerId)` | Admin: remove a player | `void` |
| `archiveLeague(leagueId)` | Admin: archive league | `void` |
| `updateLeague(leagueId, input)` | Admin: update name/description | `League` |

### TanStack Query Hooks

All hooks are in `src/hooks/useLeagues.ts`:

```typescript
import {
  // Queries
  useLeagues,
  useLeague,
  useLeaguePlayers,
  useLeagueLeaderboard,
  useMyLeagueRounds,
  usePlayerLeagueRounds,
  useEligibleScorecards,
  useScorecardLeagueTags,
  // Mutations
  useCreateLeague,
  useJoinLeague,
  useTagRoundToLeague,
  useUntagRound,
  useLeaveLeague,
  useRemoveLeaguePlayer,
  useArchiveLeague,
  useUpdateLeague,
} from '@/hooks/useLeagues';
```

### Query Hooks

| Hook | Description | Returns |
|------|-------------|---------|
| `useLeagues()` | All user's leagues | `League[]` |
| `useLeague(id, enabled?)` | Single league | `League \| null` |
| `useLeaguePlayers(leagueId, enabled?)` | League members with details | `(LeaguePlayer & { player })[]` |
| `useLeagueLeaderboard(leagueId, enabled?)` | Ranked leaderboard | `LeagueLeaderboardEntry[]` |
| `useMyLeagueRounds(leagueId, enabled?)` | User's tagged rounds | `LeagueRound[]` |
| `usePlayerLeagueRounds(leagueId, playerId)` | Player's rounds with scorecard details | `LeagueRoundDetail[]` |
| `useEligibleScorecards(leagueId, enabled?)` | Scorecards available for tagging | `EligibleScorecard[]` |
| `useScorecardLeagueTags(scorecardId)` | Leagues a scorecard is tagged to | `{ leagueRoundId, leagueId, taggedAt }[]` |

### Mutation Hooks

| Hook | Description | Input |
|------|-------------|-------|
| `useCreateLeague()` | Create new league | `{ name, description? }` |
| `useJoinLeague()` | Join via invite code | `string` (invite code) |
| `useTagRoundToLeague()` | Tag scorecard to league | `{ leagueId, scorecardId }` |
| `useUntagRound(leagueId)` | Remove tagged round | `string` (leagueRoundId) |
| `useLeaveLeague()` | Leave a league | `string` (leagueId) |
| `useRemoveLeaguePlayer(leagueId)` | Admin: remove player | `string` (playerId) |
| `useArchiveLeague()` | Admin: archive league | `string` (leagueId) |
| `useUpdateLeague(leagueId)` | Admin: update settings | `{ name?, description? }` |

### Query Keys

Query keys are defined in `src/hooks/queryKeys.ts`:

```typescript
export const leagueKeys = {
  all: ['leagues'] as const,
  lists: () => [...leagueKeys.all, 'list'] as const,
  detail: (id: string) => [...leagueKeys.all, 'detail', id] as const,
  leaderboard: (leagueId: string) => [...leagueKeys.all, 'leaderboard', leagueId] as const,
  players: (leagueId: string) => [...leagueKeys.all, 'players', leagueId] as const,
  rounds: (leagueId: string) => [...leagueKeys.all, 'rounds', leagueId] as const,
  eligibleScorecards: (leagueId: string) => [...leagueKeys.all, 'eligible', leagueId] as const,
  playerRounds: (leagueId: string, playerId: string) =>
    [...leagueKeys.all, 'playerRounds', leagueId, playerId] as const,
  scorecardTags: (scorecardId: string) =>
    [...leagueKeys.all, 'scorecardTags', scorecardId] as const,
} as const;
```

### Cache Invalidation

Mutations automatically invalidate related queries:

| Mutation | Invalidates |
|----------|-------------|
| `createLeague` | All league lists |
| `joinLeague` | All league lists |
| `tagRoundToLeague` | Leaderboard, rounds, eligible scorecards, scorecard tags |
| `untagRound` | Leaderboard, rounds, eligible scorecards |
| `leaveLeague` | All league lists |
| `removePlayer` | Players list, leaderboard |
| `archiveLeague` | All league lists |
| `updateLeague` | League detail, league lists |

---

## Notifications

### Notification Types

League events generate in-app notifications and push notifications through database triggers.

| Type | Trigger | Recipient | Message Example |
|------|---------|-----------|-----------------|
| `league_player_joined` | Player accepts invite | League creator | "John joined Weekend Warriors" |
| `league_player_left` | Player voluntarily leaves | League creator | "Sarah left Weekend Warriors" |
| `league_player_removed` | Admin removes player | Removed player | "You were removed from Weekend Warriors" |
| `league_round_tagged` | Player tags a round | All other members | "Mike tagged a round to Weekend Warriors (7.2)" |
| `league_leaderboard_changed` | Rank changes after tag | Affected players | "You moved up to #2 in Weekend Warriors" |

### Push Preference

All league notifications are gated by a single push preference toggle:

```sql
-- user_preferences column
push_league_updates BOOLEAN NOT NULL DEFAULT TRUE
```

This toggle controls all five league notification types. Users can disable it in Settings to stop receiving league push notifications while still seeing in-app notifications.

### Leaderboard Change Detection

The `notify_league_round_tagged` trigger includes automatic leaderboard change detection:

1. When a round is tagged, the trigger computes the leaderboard before and after
2. For each player whose rank changed, a `league_leaderboard_changed` notification is sent
3. The notification includes direction (`'up'` or `'down'`), old rank, and new rank

### Voluntary Leave vs Admin Removal

The `removed_by` column on `league_players` distinguishes between the two:

| Scenario | `removed_by` Value | Notification Type |
|----------|-------------------|-------------------|
| Player leaves voluntarily | `removed_by = player_id` | `league_player_left` (to creator) |
| Admin removes player | `removed_by = admin_id` | `league_player_removed` (to player) |

---

## Navigation

### Tab Structure

The Leagues feature introduces a new bottom navigation tab:

| Tab | Route | Screen |
|-----|-------|--------|
| Leagues | `LeaguesTab` | `LeagueListScreen` |

Friends (previously a tab) has been moved to the Profile menu.

### Screen Routes

| Route | Screen | Description |
|-------|--------|-------------|
| `LeaguesTab` | `LeagueListScreen` | List of user's leagues with create/join actions |
| `LeagueDetail` | `LeagueDetailScreen` | Leaderboard, rounds, and league info |
| `CreateLeague` | `CreateLeagueScreen` | Create a new league (name, description) |
| `JoinLeague` | `JoinLeagueScreen` | Join via invite code (LGE-XXXXX) |
| `TagRoundToLeague` | `TagRoundToLeagueScreen` | Select scorecard to tag |
| `LeagueSettings` | `LeagueSettingsScreen` | Admin settings (edit, archive, manage members) |

---

## UI Components

### Screen Components

Located in `src/screens/leagues/`:

| Component | Description |
|-----------|-------------|
| `LeagueListScreen` | Main league list with cards showing rank and round count |
| `LeagueDetailScreen` | Leaderboard tab and rounds tab with tag action |
| `CreateLeagueScreen` | Form for league name, optional description |
| `JoinLeagueScreen` | Invite code input with validation |
| `TagRoundToLeagueScreen` | Lists eligible scorecards for tagging |
| `LeagueSettingsScreen` | Admin: edit details, manage members, archive |

### Shared Components

Located in `src/components/leagues/`:

| Component | Description |
|-----------|-------------|
| `LeagueCard` | Card component for league list (name, rank, round count) |
| `LeagueLeaderboardRow` | Single row in leaderboard table (rank, name, stats) |
| `LeagueRoundCard` | Card showing a tagged round (course, date, differential) |
| `DifferentialBadge` | Colored badge displaying a handicap differential value |
| `TagToLeagueBottomSheet` | Bottom sheet for tagging from the scorecard review screen |
| `LeaguePlayerRoundsModal` | Modal showing a player's tagged rounds when tapped on leaderboard |

### Screen Welcome Modals

The app uses `ScreenWelcomeModal` components to introduce leagues:

| Screen | Modal Title | Content |
|--------|-------------|---------|
| League List | "Welcome to Leagues" | Explains cross-course competition concept |
| League Detail | "How Rankings Work" | Explains WHS differentials and best-8-of-20 |

These modals show only once per user (tracked via `screenInfoStore`).

---

## Integration Points

### Scorecard Review

After completing a round, players can tag it to a league from the scorecard review screen via the `TagToLeagueBottomSheet`:

1. **Complete round**: Player finishes 18 holes and submits scorecard
2. **Review screen**: "Tag to League" button appears if player is in any leagues
3. **Bottom sheet**: Shows leagues the player belongs to
4. **Tag**: One tap to tag the scorecard, with the differential shown
5. **Confirmation**: Leaderboard updates reflected immediately

### Invite Code Flow

1. Creator shares `LGE-XXXXX` code with friends
2. Friend enters code on `JoinLeagueScreen`
3. Code is normalized (uppercased, trimmed) and matched against active leagues
4. Player is upserted into `league_players` with `status = 'accepted'`
5. Creator receives a `league_player_joined` notification

### Leaving a League

When a player leaves a league:
1. All their `league_rounds` for that league are deleted
2. Their `league_players` status is set to `'removed'`
3. `removed_by` is set to their own ID (voluntary leave)
4. Creator is notified via `league_player_left`

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid invite code" | Code does not match any active league | Verify code format (LGE-XXXXX) |
| "You are already a member" | Player already has `accepted` status | Navigate to existing league |
| "Only completed scorecards can be tagged" | Scorecard status is not `completed` or `confirmed` | Complete the round first |
| "This scorecard does not have a handicap differential" | Missing slope/course rating data | Ensure course has tee ratings |
| "Only 18-hole rounds can be tagged" | Scorecard has fewer than 18 scored holes | Only full rounds qualify |
| "This scorecard is already tagged to this league" | Unique constraint violation (code `23505`) | Scorecard already tagged |
| "This league is archived" | League status is `archived` | Cannot add rounds to archived leagues |
| "Failed to create league" | Tier limit reached | Upgrade subscription tier |

### Validation Flow

```typescript
// Tag validation happens in the service layer:
// 1. Verify user is logged in
// 2. Fetch scorecard and validate ownership
// 3. Check scorecard status (completed/confirmed)
// 4. Check handicap_differential is not null
// 5. Validate 18 holes scored
// 6. Check league is active
// 7. Insert (unique constraint catches duplicates)
```

---

## Key Files

| File | Description |
|------|-------------|
| `src/types/database/league.types.ts` | TypeScript type definitions |
| `src/services/api/leagues.ts` | Supabase API service functions |
| `src/hooks/useLeagues.ts` | TanStack Query hooks |
| `src/hooks/queryKeys.ts` | Query key definitions (leagueKeys) |
| `src/screens/leagues/` | Screen components |
| `src/components/leagues/` | Shared UI components |
| `src/constants/screenWelcomeContent.ts` | Welcome modal content |
| `src/store/screenInfoStore.ts` | First-visit modal tracking |
| `supabase/migrations/20260228000000_leagues.sql` | Core schema migration |
| `supabase/migrations/20260301000000_league_notification_triggers.sql` | Notification triggers |
| `supabase/seeds/seed-leagues.sql` | Development seed data |

---

## Related Documentation

- [DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md) - Full database schema including league tables
- [SUBSCRIPTION_TIERS.md](./SUBSCRIPTION_TIERS.md) - Tier system and league limits
- [PUSH_NOTIFICATIONS.md](./PUSH_NOTIFICATIONS.md) - Push notification architecture
- [ALGORITHMS.md](./ALGORITHMS.md) - Scoring and handicap calculations
- [CLAUDE.md](../../CLAUDE.md) - Project overview

---

*Last Updated: February 2026*
