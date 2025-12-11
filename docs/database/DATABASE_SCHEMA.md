# Database Schema Documentation

## Overview

This document provides complete documentation for The Nineteenth golf competition app database schema. The schema is designed for:

- **Multi-round competitions** with team support
- **Multiple game types** (Stableford, Stroke Play, Match Play, Team formats)
- **Offline-first architecture** (scores saved locally, synced to Supabase)
- **Multi-tenant security** (Row-Level Security policies)
- **Social features** (friendships, notifications, standalone rounds)
- **Australian golf courses** (extensible to global in future)

---

## TypeScript Type Definitions

> These TypeScript interfaces match the SQL schema defined below

### Core Entities

```typescript
// Competition
interface Competition {
  id: string;
  name: string;
  description?: string;
  competitionType: 'league' | 'event'; // league = ongoing, event = fixed-term with end_date
  startDate: Date;
  endDate?: Date;  // Required for 'event' type, auto-deactivates at midnight
  handicapSystem: 'honor' | 'golf-australia' | 'gross-only';
  visibility: 'private';  // Future: 'public' | 'unlisted'
  inviteCode: string;     // e.g., 'COMP-94821' (unique among active competitions only)
  organizerId: string;
  status: 'upcoming' | 'in-progress' | 'completed' | 'cancelled';
  // Team settings
  teamMode: TeamMode;     // 'none' | 'fixed' | 'per-round'
  teamSize?: number;      // 2-4 players per team (required if teamMode != 'none')
  pointSystem: PointSystem; // JSON config for competition points
  createdAt: Date;
  updatedAt: Date;
}

// Team mode for competitions
type TeamMode = 'none' | 'fixed' | 'per-round';

// Team format for team-based rounds
type TeamFormat = 'best-ball' | 'scramble' | 'aggregate' | 'match-play-team';

// Point system configuration
interface PointSystem {
  type: 'position';
  rules: { [position: string]: number }; // e.g., { "1": 10, "2": 8, "default": 0 }
  matchPlay: {
    win: number;
    draw: number;
    loss: number;
  };
}

// Round
interface Round {
  id: string;
  competitionId?: string;  // NULL for standalone rounds
  userId?: string;         // Owner of standalone rounds (NULL for competition rounds)
  roundNumber: number;
  courseId: string;
  date?: Date;
  teeTime?: string;
  gameType: 'stroke' | 'stableford' | 'match-play' | 'ambrose' | 'best-ball' | 'scramble';
  status: 'upcoming' | 'in-progress' | 'completed';
  // Team settings
  isTeamRound: boolean;    // TRUE if round uses team scoring
  teamFormat?: TeamFormat; // Required if isTeamRound is true
  // Tee selection
  selectedTee?: TeeBox;    // Selected tee box configuration for this round
  // Scoring pairs
  scoringPairsRequired: boolean; // If TRUE, scoring pairs must be set up before round starts
  createdAt: Date;
  updatedAt: Date;
}

// Venue (physical golf club location)
interface Venue {
  id: string;
  source: 'api' | 'manual';
  apiId?: string;

  // Basic Info
  name: string;                    // "The Eastern Golf Club"
  state: 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';
  city: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;

  // Metadata
  totalHoles?: number;             // 18, 27, 36, etc.
  lastSynced?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Course (playable 18-hole configuration at a venue)
interface Course {
  id: string;
  venueId: string;                 // FK to venue

  // Course Info
  name: string;                    // "East/West Course" or just "Championship"
  description?: string;            // Optional description of this configuration

  // Course Details (18 holes for this configuration)
  holes: Hole[];                   // 18 holes with par, SI, yardages
  tees?: TeeBox[];                 // Tee boxes with ratings for THIS course
  slopeRating?: number;            // Slope rating for this configuration
  courseRating?: number;           // Course rating for this configuration

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

interface Hole {
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;
  par: 3 | 4 | 5;
  strokeIndex: number; // 1-18 for handicap calculation
  yardages: {
    [tee: string]: number; // e.g., { blue: 425, white: 400, red: 350 }
  };
}

interface TeeBox {
  name: string;      // 'Championship', 'Men', 'Women', etc.
  color: string;
  totalYardage: number;
  courseRating?: number;
  slopeRating?: number;
}

// Player
interface Player {
  id: string;
  name: string;
  email: string;
  phone?: string;
  handicap?: number;
  handicapUpdatedAt?: Date; // Timestamp when handicap was last updated
  golfId?: string;          // 10-digit Golf Australia ID
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Competition Player (join table)
interface CompetitionPlayer {
  competitionId: string;
  playerId: string;
  status: 'invited' | 'accepted' | 'declined';
  invitedAt: Date;
  respondedAt?: Date;
}

// Pairing (who plays with whom in each round)
interface Pairing {
  id: string;
  roundId: string;
  playerIds: string[];  // Array of 2-4 player IDs
  teeTime?: string;
}

// Scorecard (one per player per round)
interface Scorecard {
  id: string;
  roundId: string;
  playerId: string;
  scores: { [holeNumber: number]: HoleScore };
  totalGross: number;
  totalNet: number;
  status: 'not-started' | 'in-progress' | 'completed' | 'confirmed';
  submittedAt?: Date;
  submittedBy?: string;  // Player ID who submitted
}

interface HoleScore {
  strokes: number;
  putts?: number;
  fairwayHit?: boolean;
  greenInRegulation?: boolean;
  penalties?: number;
}

// Leaderboard (computed/cached)
interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  handicap: number;
  position: number;
  totalGross: number;
  totalNet: number;
  roundsPlayed: number;
  lastRoundScore?: number;
}

// Scoring Pair - designated marker/scorer for a player
interface ScoringPair {
  id: string;
  roundId: string;
  scorerId: string;  // The marker (player recording the score)
  playerId: string;  // The player being scored
  createdAt: Date;
  updatedAt: Date;
}

// Scoring Pair with player details populated
interface ScoringPairWithPlayers extends ScoringPair {
  scorer?: Player;
  player?: Player;
}

// Friendship between players
interface Friendship {
  id: string;
  requesterId: string;  // Who sent the request
  addresseeId: string;  // Who received the request
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

// Favorite course for a player
interface FavoriteCourse {
  id: string;
  playerId: string;
  courseId: string;
  createdAt: Date;
}

// Notification for in-app alerts
type NotificationType =
  | 'competition_player_added'
  | 'competition_player_joined'
  | 'new_round_created'
  | 'competition_status_changed'
  | 'scorecard_submitted'
  | 'friend_request_received'
  | 'friend_request_accepted'
  | 'social_round_invitation';

interface Notification {
  id: string;
  userId: string;           // Recipient
  type: NotificationType;
  data: Record<string, any>; // Flexible payload
  competitionId?: string;
  roundId?: string;
  playerId?: string;        // Sender/related player
  friendshipId?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

// Round player (for standalone/social rounds)
interface RoundPlayer {
  id: string;
  roundId: string;
  playerId: string;
  addedBy?: string;  // Who invited them (NULL if self)
  createdAt: Date;
}

// Team for team-based competitions
interface Team {
  id: string;
  competitionId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Team member (join table)
interface TeamMember {
  teamId: string;
  playerId: string;
  joinedAt: Date;
}

// Round result (finalized results for all game types)
interface RoundResult {
  id: string;
  roundId: string;
  playerId?: string;    // Either player OR team, not both
  teamId?: string;
  rawScore?: number;    // Primary score (Stableford points, gross strokes, etc.)
  rawResultData: Record<string, any>; // Format-specific data
  position?: number;    // 1, 2, 3... (NULL for match play without standings)
  competitionPoints: number; // Points earned toward competition standings
  isTeamResult: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription tier levels
type SubscriptionTier = 'free' | 'social' | 'premium' | 'super_admin';
type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial';
type SubscriptionSource = 'manual' | 'revenuecat' | 'stripe';

// User Subscription
interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  externalId?: string;     // RevenueCat/Stripe ID
  productId?: string;      // App Store product ID
  startedAt: Date;
  expiresAt?: Date;        // NULL for free tier (never expires)
  cancelledAt?: Date;
  trialStartedAt?: Date;
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Tier Limits Configuration
interface TierLimits {
  id: string;
  tier: SubscriptionTier;
  // Resource limits (-1 = unlimited, -2 = no system limit)
  maxCompetitionsOwned: number;
  maxRoundsPerCompetition: number;
  maxPlayersPerCompetition: number;
  maxFriends: number;
  // Feature access - Game Types & Formats
  allowedGameTypes: string[];
  canUseTeamFormats: boolean;
  canUseScoringPairs: boolean;
  canExportData: boolean;
  canUseApiCourseSearch: boolean;
  // Feature access - Statistics
  canViewBasicStats: boolean;
  canViewScoreDistribution: boolean;
  canViewAdvancedStats: boolean;
  canCompareStats: boolean;
  // Feature access - Admin
  canAccessAdminTools: boolean;
  // Billing & Lifecycle
  requiresPayment: boolean;
  canExpire: boolean;
  // Display
  displayName: string;
  description?: string;
  badgeColor?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Architecture

### Stack
- **PostgreSQL 15+** via Supabase
- **PostGIS extension** for course location data
- **Row-Level Security (RLS)** for data isolation
- **JSONB columns** for flexible data (holes, scores)
- **Triggers** for automatic timestamps and invite codes

### Multi-Tenancy
Data isolation is achieved through:
1. **Competition-based tenancy** - Players only see data in their competitions
2. **RLS policies** - Enforce access control at database level
3. **Organizer ownership** - Organizers have full control over their competitions

## Entity Relationship Diagram

```
┌─────────────┐
│ auth.users  │ (Supabase Auth)
└──────┬──────┘
       │
       │ 1:1
       │
┌──────▼──────────────┐
│ players             │
├─────────────────────┤
│ id (PK, FK)         │
│ name                │
│ email               │
│ handicap            │
│ golf_id             │
│ handicap_updated_at │
└──────┬──────────────┘
       │
       ├───────────────────────────────────────────────────────────┐
       │ M:N                                                       │ M:N
       │                                                           │
┌──────▼─────────────────────┐      ┌─────────────────┐    ┌───────▼─────────┐
│ competition_players         │      │ competitions    │    │ friendships     │
├─────────────────────────────┤      ├─────────────────┤    ├─────────────────┤
│ competition_id (PK, FK) ────┼──────┤ id (PK)         │    │ id (PK)         │
│ player_id (PK, FK)          │      │ name            │    │ requester_id    │
│ status                      │      │ invite_code     │    │ addressee_id    │
└─────────────────────────────┘      │ organizer_id    │    │ status          │
                                     │ team_mode       │    └─────────────────┘
                                     │ team_size       │
                                     │ point_system    │
                                     └────────┬────────┘
                                              │
                              ┌───────────────┼───────────────┐
                              │ 1:N           │ 1:N           │ 1:N
                              │               │               │
                     ┌────────▼────────┐      │      ┌────────▼────────┐
                     │ teams           │      │      │ rounds          │
                     ├─────────────────┤      │      ├─────────────────┤
                     │ id (PK)         │      │      │ id (PK)         │
                     │ competition_id  │      │      │ competition_id  │ (nullable)
                     │ name            │      │      │ user_id         │ (for standalone)
                     └────────┬────────┘      │      │ course_id ──────┼─────────────┐
                              │               │      │ game_type       │             │
                              │ M:N           │      │ is_team_round   │             │
                              │               │      │ team_format     │             │
                     ┌────────▼────────┐      │      │ selected_tee    │             │
                     │ team_members    │      │      └────────┬────────┘             │
                     ├─────────────────┤      │               │                      │
                     │ team_id (PK,FK) │      │      ┌────────┼────────┬─────────┐   │
                     │ player_id (PK,FK│      │      │ 1:N    │ 1:N    │ 1:N     │   │
                     └─────────────────┘      │      │        │        │         │   │
                                              │      │        │        │         │   │
                              ┌────────▼──────┴──────▼┐   ┌───▼────┐   │    ┌────▼───────────┐
                              │ round_results         │   │pairings│   │    │ round_players  │
                              ├───────────────────────┤   ├────────┤   │    ├────────────────┤
                              │ id (PK)               │   │ id (PK)│   │    │ id (PK)        │
                              │ round_id (FK)         │   │round_id│   │    │ round_id (FK)  │
                              │ player_id (FK)        │   │player_ │   │    │ player_id (FK) │
                              │ team_id (FK)          │   │ids []  │   │    │ added_by       │
                              │ raw_score             │   │tee_time│   │    └────────────────┘
                              │ competition_points    │   └────────┘   │
                              │ position              │                │
                              └───────────────────────┘     ┌──────────▼─────────┐
                                                           │ scorecards         │
                                                           ├────────────────────┤
                                                           │ id (PK)            │
                                                           │ round_id (FK)      │
┌──────────────────┐       ┌───────────────────────────────│ player_id (FK)     │
│ venues           │       │                               │ scores (JSONB)     │
├──────────────────┤       │                               │ total_points       │
│ id (PK)          │       │                               │ status             │
│ name             │       │                               └──────────┬─────────┘
│ state            │       │                                          │
│ city             │       │                                          │
│ address          │       │                               ┌──────────▼─────────┐
│ location (GPS)   │       │                               │ scoring_pairs      │
└────────┬─────────┘       │                               ├────────────────────┤
         │                 │                               │ id (PK)            │
         │ 1:N             │                               │ round_id (FK)      │
         │                 │                               │ scorer_id (FK)     │
┌────────▼─────────┐       │                               │ player_id (FK)     │
│ courses          │◄──────┘                               └────────────────────┘
├──────────────────┤
│ id (PK)          │◄──────────────────────────────────────────────────────┐
│ venue_id (FK)    │                                                       │
│ name             │                                             ┌─────────┴────────┐
│ holes (JSONB)    │                                             │ favorite_courses │
│ tees (JSONB)     │                                             ├──────────────────┤
│ slope_rating     │                                             │ id (PK)          │
│ course_rating    │                                             │ player_id (FK)   │
└──────────────────┘                                             │ course_id (FK)   │
                                                                 └──────────────────┘

┌─────────────────────────┐      ┌─────────────────────────┐      ┌──────────────────────┐
│ user_subscriptions      │      │ tier_limits             │      │ notifications        │
├─────────────────────────┤      ├─────────────────────────┤      ├──────────────────────┤
│ id (PK)                 │      │ id (PK)                 │      │ id (PK)              │
│ user_id (FK, UNIQUE) ───┼──────│ tier (UNIQUE)           │      │ user_id (FK)         │
│ tier ───────────────────┼──────│ max_competitions_owned  │      │ type                 │
│ status                  │      │ max_rounds_per_comp     │      │ data (JSONB)         │
│ source                  │      │ max_players_per_comp    │      │ competition_id (FK)  │
│ external_id             │      │ max_friends             │      │ round_id (FK)        │
│ product_id              │      │ allowed_game_types []   │      │ player_id (FK)       │
│ started_at              │      │ can_use_* (booleans)    │      │ friendship_id (FK)   │
│ expires_at              │      │ display_name            │      │ is_read              │
│ cancelled_at            │      │ badge_color             │      │ read_at              │
└─────────────────────────┘      └─────────────────────────┘      └──────────────────────┘
```

## Table Details

### `players`

Player profiles extending Supabase auth.users.

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, FK → auth.users(id) | Player unique identifier |
| `name` | TEXT | NOT NULL | Player display name |
| `email` | TEXT | NOT NULL, UNIQUE | Contact email |
| `phone` | TEXT | NULL | Contact phone (optional) |
| `handicap` | NUMERIC(4,1) | DEFAULT 0 | Golf handicap (e.g., 12.5) |
| `handicap_updated_at` | TIMESTAMPTZ | NULL | Timestamp when handicap was last updated |
| `golf_id` | TEXT | NULL, CHECK (10 digits) | 10-digit Golf Australia ID |
| `photo_url` | TEXT | NULL | Profile photo URL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_players_email` on `email`
- `idx_players_golf_id` on `golf_id` (partial, WHERE golf_id IS NOT NULL)

**Constraints:**
- `golf_id_format` - CHECK (golf_id IS NULL OR golf_id ~ '^[0-9]{10}$')

**RLS Policies:**
- Users can view/update their own profile
- Users can view other players in their competitions

**Example:**
```typescript
const { data: player } = await supabase
  .from('players')
  .select('*')
  .eq('id', userId)
  .single();
```

---

### `competitions`

Competition metadata and settings.

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Competition unique identifier |
| `name` | TEXT | NOT NULL | Competition name |
| `description` | TEXT | NULL | Optional description |
| `competition_type` | TEXT | CHECK(enum), DEFAULT 'league' | 'league' (ongoing) or 'event' (fixed-term) |
| `start_date` | DATE | NOT NULL | Competition start date |
| `end_date` | DATE | NULL (required for 'event') | End date - auto-deactivates event competitions at midnight |
| `handicap_system` | TEXT | CHECK(enum), NOT NULL | 'honor', 'golf-australia', 'gross-only' |
| `visibility` | TEXT | CHECK(enum), DEFAULT 'private' | 'private', 'public', 'unlisted' |
| `invite_code` | TEXT | UNIQUE (active only), NOT NULL | e.g., "COMP-12345" - unique among active competitions |
| `organizer_id` | UUID | FK → auth.users(id), NOT NULL | Competition creator |
| `status` | TEXT | CHECK(enum), DEFAULT 'upcoming' | 'upcoming', 'in-progress', 'completed', 'cancelled' |
| `team_mode` | team_mode | NOT NULL, DEFAULT 'none' | 'none', 'fixed', 'per-round' |
| `team_size` | INTEGER | CHECK(2-4), NULL | Players per team (required if team_mode != 'none') |
| `point_system` | JSONB | NOT NULL, DEFAULT {...} | Config for converting results to competition points |
| `deleted_at` | TIMESTAMPTZ | NULL | Soft delete timestamp. NULL means not deleted |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Team Mode Values:**
- **none**: Individual competition, no teams
- **fixed**: Teams persist across all rounds
- **per-round**: Teams can change each round

**Point System Default:**
```json
{
  "type": "position",
  "rules": { "1": 10, "2": 8, "3": 6, "4": 5, "5": 4, "6": 3, "7": 2, "8": 1, "default": 0 },
  "matchPlay": { "win": 3, "draw": 1, "loss": 0 }
}
```

**Competition Types:**
- **league**: Ongoing competition with no end date. Stays active until manually archived.
- **event**: Fixed-term competition with required `end_date`. Automatically marked as 'completed' when end_date passes (at midnight).

**Indexes:**
- `idx_competitions_organizer` on `organizer_id`
- `idx_competitions_invite_code_active` - Partial unique index on `invite_code` WHERE status NOT IN ('completed', 'cancelled')
- `idx_competitions_invite_code_lookup` on `invite_code` (for lookups)
- `idx_competitions_status` on `status`
- `idx_competitions_start_date` on `start_date`
- `idx_competitions_type` on `competition_type`
- `idx_competitions_end_date` on `end_date` WHERE end_date IS NOT NULL
- `idx_competitions_deleted_at` - Partial index WHERE deleted_at IS NULL (for soft delete queries)

**Triggers:**
- `generate_competition_invite_code` - Auto-generates unique invite code on INSERT (checks only active competitions)

**Constraints:**
- `event_requires_end_date` - Event-type competitions must have an end_date
- `valid_date_range` - end_date must be >= start_date (if provided)

**RLS Policies:**
- Organizers can manage their own competitions
- Players can view competitions they're in
- Anyone can view competition by invite code (for joining)

**Example:**
```typescript
// Create competition
const { data: competition } = await supabase
  .from('competitions')
  .insert({
    name: 'Summer Classic 2025',
    start_date: '2025-02-15',
    handicap_system: 'honor',
    organizer_id: userId,
  })
  .select()
  .single();

// Join via invite code
const { data } = await supabase
  .from('competitions')
  .select('*')
  .eq('invite_code', 'COMP-12345')
  .single();
```

---

### `venues`

Physical golf club locations. A venue can have one or more playable courses.

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Venue unique identifier |
| `source` | TEXT | CHECK('api', 'manual'), NOT NULL | Data source |
| `api_id` | TEXT | NULL | External API identifier |
| `name` | TEXT | NOT NULL | Venue/club name (e.g., "The Eastern Golf Club") |
| `state` | TEXT | CHECK(AU states), NULL | Australian state code |
| `city` | TEXT | NULL | City name |
| `address` | TEXT | NULL | Street address |
| `phone` | TEXT | NULL | Contact phone |
| `email` | TEXT | NULL | Contact email |
| `website` | TEXT | NULL | Venue website URL |
| `location` | GEOGRAPHY(POINT) | NULL | GPS coordinates (PostGIS) |
| `total_holes` | INTEGER | NULL | Total holes at venue (18, 27, 36, etc.) |
| `last_synced` | TIMESTAMPTZ | NULL | Last API sync timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_venues_name` on `name`
- `idx_venues_state` on `state`
- `idx_venues_source` on `source`
- `idx_venues_location` (GIST spatial index) on `location`

**RLS Policies:**
- Anyone can view venues (read-only)
- Authenticated users can create venues (manual entry)

**Example:**
```typescript
// Create venue (manual entry)
const { data: venue } = await supabase
  .from('venues')
  .insert({
    name: 'The Eastern Golf Club',
    state: 'VIC',
    city: 'Doncaster',
    source: 'manual',
    total_holes: 27,
  })
  .select()
  .single();

// Search venues by name
const { data: venues } = await supabase
  .from('venues')
  .select('*')
  .ilike('name', '%eastern%')
  .eq('state', 'VIC');

// Get venues with course count
const { data: venuesWithCourses } = await supabase
  .from('venues')
  .select('*, courses(count)')
  .eq('state', 'VIC');
```

---

### `courses`

Playable 18-hole course configurations at a venue. A venue with 27 holes (3 nines) would have 3 course records, one for each combination.

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Course unique identifier |
| `venue_id` | UUID | FK → venues(id), NOT NULL | Parent venue |
| `name` | TEXT | NOT NULL | Course name (e.g., "East/West Course") |
| `description` | TEXT | NULL | Optional description of this configuration |
| `holes` | JSONB | NOT NULL | Array of 18 hole objects |
| `tees` | JSONB | NULL | Array of tee box objects for this course |
| `slope_rating` | NUMERIC(4,1) | NULL | Course slope rating for this configuration |
| `course_rating` | NUMERIC(4,1) | NULL | Course rating for this configuration |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_courses_venue` on `venue_id`
- `idx_courses_name` on `name`

**Constraints:**
- `unique_course_name_per_venue` - UNIQUE(venue_id, name)

**RLS Policies:**
- Anyone can view courses (read-only)
- Authenticated users can create courses (manual entry)

**JSONB Structure:**

`holes` field:
```json
[
  {
    "number": 1,
    "par": 4,
    "strokeIndex": 7,
    "yardages": {
      "blue": 425,
      "white": 400,
      "red": 350
    }
  },
  ...
]
```

`tees` field:
```json
[
  {
    "name": "Championship",
    "color": "blue",
    "totalYardage": 6850,
    "courseRating": 72.5,
    "slopeRating": 135
  },
  ...
]
```

**Example:**
```typescript
// Create course at a venue
const { data: course } = await supabase
  .from('courses')
  .insert({
    venue_id: venueId,
    name: 'East/West Course',
    holes: [
      { number: 1, par: 4, strokeIndex: 7 },
      { number: 2, par: 4, strokeIndex: 3 },
      // ... holes 3-18
    ],
    slope_rating: 128,
    course_rating: 71.2,
  })
  .select()
  .single();

// Get all courses at a venue
const { data: courses } = await supabase
  .from('courses')
  .select('*')
  .eq('venue_id', venueId);

// Get course with venue details
const { data: courseWithVenue } = await supabase
  .from('courses')
  .select('*, venue:venues(*)')
  .eq('id', courseId)
  .single();

// Search courses by venue name (for course selection UI)
const { data: coursesAtVenue } = await supabase
  .from('courses')
  .select('*, venue:venues!inner(*)')
  .ilike('venue.name', '%eastern%');
```

---

### `rounds`

Individual rounds within competitions or standalone (social) rounds.

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Round unique identifier |
| `competition_id` | UUID | FK → competitions(id), NULL | Parent competition (NULL for standalone) |
| `user_id` | UUID | FK → auth.users(id), NULL | Owner for standalone rounds |
| `round_number` | INTEGER | DEFAULT 1, CHECK(> 0) | Round sequence |
| `course_id` | UUID | FK → courses(id), NOT NULL | Course played |
| `date` | DATE | NULL | Round date |
| `tee_time` | TIME | NULL | Tee time |
| `game_type` | TEXT | CHECK(enum), DEFAULT 'stableford' | 'stroke', 'stableford', 'match-play', 'ambrose', 'best-ball', 'scramble' |
| `status` | TEXT | CHECK(enum), DEFAULT 'upcoming' | 'upcoming', 'in-progress', 'completed' |
| `is_team_round` | BOOLEAN | NOT NULL, DEFAULT FALSE | TRUE if round uses team scoring |
| `team_format` | team_format | NULL | 'best-ball', 'scramble', 'aggregate', 'match-play-team' |
| `selected_tee` | JSONB | NULL | Selected tee box configuration |
| `scoring_pairs_required` | BOOLEAN | DEFAULT FALSE | If TRUE, scoring pairs must be set up |
| `deleted_at` | TIMESTAMPTZ | NULL | Soft delete timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Standalone vs Competition Rounds:**
- **Competition round**: `competition_id` is set, `user_id` is NULL
- **Standalone round**: `competition_id` is NULL, `user_id` is set (the round owner)

**Selected Tee Structure:**
```json
{
  "name": "Championship",
  "color": "blue",
  "totalYardage": 6850,
  "courseRating": 72.5,
  "slopeRating": 135
}
```

**Indexes:**
- `idx_rounds_competition` on `competition_id`
- `idx_rounds_course` on `course_id`
- `idx_rounds_status` on `status`
- `idx_rounds_date` on `date`
- `idx_rounds_user_id` on `user_id` (partial, WHERE user_id IS NOT NULL)
- `idx_rounds_deleted_at` - Partial index WHERE deleted_at IS NULL

**Constraints:**
- `unique_round_per_competition` - UNIQUE(competition_id, round_number)
- `rounds_ownership_check` - CHECK (competition_id IS NOT NULL OR user_id IS NOT NULL)
- `team_format_required_for_team_rounds` - CHECK (is_team_round = FALSE AND team_format IS NULL) OR (is_team_round = TRUE AND team_format IS NOT NULL)

**RLS Policies:**
- Organizers can manage rounds in their competitions
- Players can view rounds in their competitions

**Example:**
```typescript
// Create round
const { data: round } = await supabase
  .from('rounds')
  .insert({
    competition_id: competitionId,
    round_number: 1,
    course_id: courseId,
    date: '2025-02-15',
    game_type: 'stableford',
  })
  .select()
  .single();

// Get rounds for competition
const { data: rounds } = await supabase
  .from('rounds')
  .select('*, course:courses(*)')
  .eq('competition_id', competitionId)
  .order('round_number');
```

---

### `competition_players`

Many-to-many join table linking players to competitions.

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `competition_id` | UUID | PK, FK → competitions(id) | Competition reference |
| `player_id` | UUID | PK, FK → players(id) | Player reference |
| `status` | TEXT | CHECK(enum), DEFAULT 'accepted' | 'invited', 'accepted', 'declined' |
| `invited_at` | TIMESTAMPTZ | DEFAULT NOW() | Invitation timestamp |
| `responded_at` | TIMESTAMPTZ | NULL | Response timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |

**Indexes:**
- `idx_competition_players_player` on `player_id`
- `idx_competition_players_status` on `status`

**RLS Policies:**
- Organizers can manage players in their competitions
- Players can view other players in their competitions
- Players can join competitions (insert themselves)
- Players can update their own status (accept/decline)

**Example:**
```typescript
// Add player to competition
const { data } = await supabase
  .from('competition_players')
  .insert({
    competition_id: competitionId,
    player_id: userId,
    status: 'accepted',
  });

// Get players in competition
const { data: players } = await supabase
  .from('competition_players')
  .select('*, player:players(*)')
  .eq('competition_id', competitionId)
  .eq('status', 'accepted');
```

---

### `pairings`

Player groupings for each round.

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Pairing unique identifier |
| `round_id` | UUID | FK → rounds(id), NOT NULL | Parent round |
| `player_ids` | UUID[] | NOT NULL, CHECK(size 2-4) | Array of player UUIDs |
| `tee_time` | TIME | NULL | Tee time for group |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_pairings_round` on `round_id`
- `idx_pairings_players` (GIN) on `player_ids` (for array queries)

**Constraints:**
- `valid_pairing_size` - CHECK(array_length(player_ids, 1) BETWEEN 2 AND 4)

**RLS Policies:**
- Organizers can manage pairings in their competitions
- Players can view pairings in their rounds

**Example:**
```typescript
// Create pairing (manual for MVP)
const { data: pairing } = await supabase
  .from('pairings')
  .insert({
    round_id: roundId,
    player_ids: [player1Id, player2Id, player3Id, player4Id],
    tee_time: '08:00:00',
  })
  .select()
  .single();

// Get pairings for round
const { data: pairings } = await supabase
  .from('pairings')
  .select('*')
  .eq('round_id', roundId)
  .order('tee_time');

// Find pairing for player
const { data: myPairing } = await supabase
  .from('pairings')
  .select('*')
  .eq('round_id', roundId)
  .contains('player_ids', [userId])
  .single();
```

---

### `scoring_pairs`

Designated scoring pairs where one player (the marker) records another player's score. This is standard golf practice where players swap scorecards.

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Scoring pair unique identifier |
| `round_id` | UUID | FK → rounds(id) ON DELETE CASCADE, NOT NULL | Parent round |
| `scorer_id` | UUID | FK → players(id) ON DELETE CASCADE, NOT NULL | The marker (player recording the score) |
| `player_id` | UUID | FK → players(id) ON DELETE CASCADE, NOT NULL | The player being scored |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_scoring_pairs_round` on `round_id`
- `idx_scoring_pairs_scorer` on `scorer_id`
- `idx_scoring_pairs_player` on `player_id`
- `idx_scoring_pairs_round_scorer` (composite) on `(round_id, scorer_id)`
- `idx_scoring_pairs_round_player` (composite) on `(round_id, player_id)`

**Constraints:**
- `unique_player_scorer_per_round` - UNIQUE(round_id, player_id) - Each player can only have one scorer per round
- `different_scorer_player` - CHECK(scorer_id != player_id) - A player cannot be their own scorer

**RLS Policies:**
- Organizers can manage scoring pairs in their competitions
- Users can manage scoring pairs for their standalone rounds
- Players can view scoring pairs in competitions they're part of
- Players can view scoring pairs where they are scorer or player

**Related Round Column:**
The `rounds` table has an additional column for scoring pairs:
- `scoring_pairs_required` (BOOLEAN, DEFAULT FALSE) - If TRUE, scoring pairs must be set up before the round can start

**Example:**
```typescript
// Create scoring pairs for a round
const { data: pairs } = await supabase
  .from('scoring_pairs')
  .insert([
    { round_id: roundId, scorer_id: player1Id, player_id: player2Id },
    { round_id: roundId, scorer_id: player2Id, player_id: player1Id },
  ])
  .select();

// Get all scoring pairs for a round with player details
const { data: pairs } = await supabase
  .from('scoring_pairs')
  .select(`
    *,
    scorer:players!scoring_pairs_scorer_id_fkey (*),
    player:players!scoring_pairs_player_id_fkey (*)
  `)
  .eq('round_id', roundId);

// Get players a scorer is responsible for
const { data: playersToScore } = await supabase
  .from('scoring_pairs')
  .select(`
    player:players!scoring_pairs_player_id_fkey (*)
  `)
  .eq('round_id', roundId)
  .eq('scorer_id', currentUserId);

// Check who is scoring a specific player
const { data: myScorer } = await supabase
  .from('scoring_pairs')
  .select(`
    scorer:players!scoring_pairs_scorer_id_fkey (*)
  `)
  .eq('round_id', roundId)
  .eq('player_id', playerId)
  .single();
```

See [SCORING_PAIRS.md](../guides/SCORING_PAIRS.md) for comprehensive feature documentation.

---

### `scorecards`

Player scorecards with hole-by-hole scores.

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Scorecard unique identifier |
| `round_id` | UUID | FK → rounds(id), NOT NULL | Parent round |
| `player_id` | UUID | FK → players(id), NOT NULL | Player reference |
| `scores` | JSONB | NOT NULL, DEFAULT {} | Hole-by-hole scores |
| `total_gross` | INTEGER | DEFAULT 0 | Total gross score |
| `total_net` | INTEGER | DEFAULT 0 | Total net score |
| `total_points` | INTEGER | DEFAULT 0 | Total Stableford points |
| `status` | TEXT | CHECK(enum), DEFAULT 'not-started' | Scorecard status |
| `submitted_at` | TIMESTAMPTZ | NULL | Submission timestamp |
| `submitted_by` | UUID | FK → players(id), NULL | Submitter (could be partner) |
| `device_id` | TEXT | NULL | Device ID for offline sync |
| `synced_at` | TIMESTAMPTZ | NULL | Last sync timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_scorecards_round` on `round_id`
- `idx_scorecards_player` on `player_id`
- `idx_scorecards_status` on `status`
- `idx_scorecards_round_status` (composite) on `(round_id, status)` - for leaderboard queries
- `idx_scorecards_submitted_at` on `submitted_at`

**Constraints:**
- `unique_scorecard_per_player_round` - UNIQUE(round_id, player_id)

**RLS Policies:**
- Players can view scorecards in their competitions
- Players can create scorecards for their rounds
- Players can update scorecards in their pairing (for group scoring)
- Organizers can manage all scorecards in their competitions

**JSONB Structure:**

`scores` field:
```json
{
  "1": { "strokes": 4, "putts": 2 },
  "2": { "strokes": 5 },
  "3": { "strokes": 3, "fairwayHit": true, "greenInRegulation": true },
  ...
  "18": { "strokes": 4 }
}
```

**Example:**
```typescript
// Create scorecard
const { data: scorecard } = await supabase
  .from('scorecards')
  .insert({
    round_id: roundId,
    player_id: playerId,
    scores: {},
    status: 'in-progress',
  })
  .select()
  .single();

// Update hole score
const { data } = await supabase
  .from('scorecards')
  .update({
    scores: {
      ...scorecard.scores,
      '1': { strokes: 4, putts: 2 },
    },
  })
  .eq('id', scorecard.id);

// Submit scorecard
const { data } = await supabase
  .from('scorecards')
  .update({
    status: 'completed',
    submitted_at: new Date().toISOString(),
    submitted_by: userId,
  })
  .eq('id', scorecard.id);

// Get scorecards for leaderboard
const { data: scorecards } = await supabase
  .from('scorecards')
  .select('*, player:players(name, handicap)')
  .eq('round_id', roundId)
  .eq('status', 'completed')
  .order('total_points', { ascending: false });
```

---

### `friendships`

Friend relationships between players.

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Friendship unique identifier |
| `requester_id` | UUID | FK → players(id) ON DELETE CASCADE, NOT NULL | Player who sent the request |
| `addressee_id` | UUID | FK → players(id) ON DELETE CASCADE, NOT NULL | Player who received the request |
| `status` | TEXT | CHECK(enum), DEFAULT 'pending' | 'pending', 'accepted', 'blocked' |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Request creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_friendships_requester` on `requester_id`
- `idx_friendships_addressee` on `addressee_id`
- `idx_friendships_status` on `status`
- `idx_friendships_accepted` on `(requester_id, addressee_id)` WHERE status = 'accepted'

**Constraints:**
- `no_self_friendship` - CHECK (requester_id != addressee_id)
- `unique_friendship` - UNIQUE(requester_id, addressee_id)

**RLS Policies:**
- Users can view friendships where they are requester or addressee
- Users can create friend requests (as requester)
- Users can update friendships they are part of (accept/decline)
- Users can delete friendships they are part of

**Example:**
```typescript
// Send friend request
const { data } = await supabase
  .from('friendships')
  .insert({
    requester_id: currentUserId,
    addressee_id: friendId,
  });

// Accept friend request
const { data } = await supabase
  .from('friendships')
  .update({ status: 'accepted' })
  .eq('id', requestId);

// Get friends using helper function
const { data: friends } = await supabase.rpc('get_friends', {
  user_id: currentUserId,
});
```

---

### `favorite_courses`

User's saved favorite golf courses for quick access.

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Favorite unique identifier |
| `player_id` | UUID | FK → players(id) ON DELETE CASCADE, NOT NULL | Player who favorited |
| `course_id` | UUID | FK → courses(id) ON DELETE CASCADE, NOT NULL | The favorited course |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When course was favorited |

**Indexes:**
- `idx_favorite_courses_player` on `player_id`
- `idx_favorite_courses_course` on `course_id`

**Constraints:**
- `unique_player_course_favorite` - UNIQUE(player_id, course_id)

**RLS Policies:**
- Users can view their own favorites
- Users can add favorites
- Users can remove their own favorites

**Example:**
```typescript
// Add favorite
const { data } = await supabase
  .from('favorite_courses')
  .insert({
    player_id: currentUserId,
    course_id: courseId,
  });

// Get user's favorites with course details
const { data: favorites } = await supabase
  .from('favorite_courses')
  .select('*, course:courses(*, venue:venues(*))')
  .eq('player_id', currentUserId);

// Remove favorite
const { data } = await supabase
  .from('favorite_courses')
  .delete()
  .eq('player_id', currentUserId)
  .eq('course_id', courseId);
```

---

### `notifications`

In-app notifications for users (friend requests, competition updates, etc.).

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Notification unique identifier |
| `user_id` | UUID | FK → players(id) ON DELETE CASCADE, NOT NULL | Recipient |
| `type` | TEXT | CHECK(enum), NOT NULL | Notification type (see below) |
| `data` | JSONB | NOT NULL, DEFAULT '{}' | Flexible payload for notification-specific data |
| `competition_id` | UUID | FK → competitions(id) ON DELETE CASCADE, NULL | Related competition |
| `round_id` | UUID | FK → rounds(id) ON DELETE CASCADE, NULL | Related round |
| `player_id` | UUID | FK → players(id) ON DELETE CASCADE, NULL | Related player (sender/actor) |
| `friendship_id` | UUID | FK → friendships(id) ON DELETE CASCADE, NULL | Related friendship |
| `is_read` | BOOLEAN | NOT NULL, DEFAULT FALSE | Read status |
| `read_at` | TIMESTAMPTZ | NULL | When notification was read |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Notification creation timestamp |

**Notification Types:**
- `competition_player_added` - Admin added player to competition
- `competition_player_joined` - Player joined via invite code
- `new_round_created` - New round added to competition
- `competition_status_changed` - Competition status changed
- `scorecard_submitted` - Scorecard submitted for a round
- `friend_request_received` - Someone sent a friend request
- `friend_request_accepted` - Friend request was accepted
- `social_round_invitation` - Invited to a social round

**Indexes:**
- `idx_notifications_user` on `user_id`
- `idx_notifications_user_unread` on `user_id` WHERE is_read = FALSE
- `idx_notifications_created` on `(user_id, created_at DESC)`

**RLS Policies:**
- Users can only view their own notifications
- Users can update their own notifications (mark as read)
- Users can delete their own notifications
- Notifications are created by triggers/system (no direct INSERT policy)

**Triggers:**
- `trigger_notify_friend_request` - Creates notification on friend request
- `trigger_notify_friend_request_accepted` - Creates notification when accepted
- `trigger_notify_competition_player_added` - Notifies player when added
- `trigger_notify_new_round_created` - Notifies all players of new round
- `trigger_notify_round_player_invited` - Notifies when invited to social round

**Example:**
```typescript
// Get user's notifications
const { data: notifications } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', currentUserId)
  .order('created_at', { ascending: false });

// Mark notification as read
const { data } = await supabase
  .from('notifications')
  .update({ is_read: true, read_at: new Date().toISOString() })
  .eq('id', notificationId);

// Get unread count using helper function
const { data: count } = await supabase.rpc('get_unread_notification_count', {
  p_user_id: currentUserId,
});

// Mark all as read using helper function
const { data: updated } = await supabase.rpc('mark_all_notifications_read', {
  p_user_id: currentUserId,
});
```

---

### `round_players`

Tracks players participating in standalone/social rounds.

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Record unique identifier |
| `round_id` | UUID | FK → rounds(id) ON DELETE CASCADE, NOT NULL | The round |
| `player_id` | UUID | FK → players(id) ON DELETE CASCADE, NOT NULL | The player |
| `added_by` | UUID | FK → players(id) ON DELETE SET NULL, NULL | Who invited them (NULL if self) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When player was added |

**Indexes:**
- `idx_round_players_round` on `round_id`
- `idx_round_players_player` on `player_id`
- `idx_round_players_added_by` on `added_by`

**Constraints:**
- `UNIQUE(round_id, player_id)` - Each player only once per round

**RLS Policies:**
- Users can view round_players for rounds they own or are part of
- Users can add players to rounds they own
- Users can remove players from rounds they own

**Example:**
```typescript
// Add friend to social round
const { data } = await supabase
  .from('round_players')
  .insert({
    round_id: roundId,
    player_id: friendId,
    added_by: currentUserId,
  });

// Get players in a round
const { data: players } = await supabase
  .from('round_players')
  .select('*, player:players(*)')
  .eq('round_id', roundId);
```

---

### `teams`

Teams for team-based competitions.

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Team unique identifier |
| `competition_id` | UUID | FK → competitions(id) ON DELETE CASCADE, NOT NULL | Parent competition |
| `name` | TEXT | NOT NULL | Team name |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Team creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_teams_competition` on `competition_id`

**Constraints:**
- `unique_team_name_per_competition` - UNIQUE(competition_id, name)

**RLS Policies:**
- Organizers can manage teams in their competitions
- Players can view teams in their competitions

**Example:**
```typescript
// Create team
const { data: team } = await supabase
  .from('teams')
  .insert({
    competition_id: competitionId,
    name: 'Team Alpha',
  })
  .select()
  .single();

// Get teams for competition
const { data: teams } = await supabase
  .from('teams')
  .select('*, members:team_members(*, player:players(*))')
  .eq('competition_id', competitionId);
```

---

### `team_members`

Join table linking players to teams.

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `team_id` | UUID | PK, FK → teams(id) ON DELETE CASCADE | The team |
| `player_id` | UUID | PK, FK → players(id) ON DELETE CASCADE | The player |
| `joined_at` | TIMESTAMPTZ | DEFAULT NOW() | When player joined team |

**Indexes:**
- `idx_team_members_player` on `player_id`

**RLS Policies:**
- Organizers can manage team members
- Players can view team members in their competitions

**Example:**
```typescript
// Add player to team
const { data } = await supabase
  .from('team_members')
  .insert({
    team_id: teamId,
    player_id: playerId,
  });

// Get team with members using helper function
const { data: team } = await supabase.rpc('get_team_with_members', {
  team_uuid: teamId,
});
```

---

### `round_results`

Finalized results for rounds. Supports both individual and team results for all game types.

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Result unique identifier |
| `round_id` | UUID | FK → rounds(id) ON DELETE CASCADE, NOT NULL | The round |
| `player_id` | UUID | FK → players(id) ON DELETE CASCADE, NULL | Player (for individual results) |
| `team_id` | UUID | FK → teams(id) ON DELETE CASCADE, NULL | Team (for team results) |
| `raw_score` | NUMERIC(10,2) | NULL | Primary score (Stableford points, gross strokes, etc.) |
| `raw_result_data` | JSONB | NOT NULL, DEFAULT '{}' | Format-specific data (match play results, etc.) |
| `position` | INTEGER | NULL | Finishing position (1, 2, 3...) |
| `competition_points` | NUMERIC(10,2) | DEFAULT 0 | Points toward competition standings |
| `is_team_result` | BOOLEAN | NOT NULL, DEFAULT FALSE | TRUE if team result |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Result creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_round_results_round` on `round_id`
- `idx_round_results_player` on `player_id` WHERE player_id IS NOT NULL
- `idx_round_results_team` on `team_id` WHERE team_id IS NOT NULL
- `idx_round_results_position` on `(round_id, position)`
- `idx_round_results_competition_player` on `(round_id, player_id, competition_points)`
- `idx_round_results_competition_team` on `(round_id, team_id, competition_points)`

**Constraints:**
- `xor_player_or_team` - Either player_id OR team_id must be set, not both
- `unique_player_result_per_round` - UNIQUE(round_id, player_id)
- `unique_team_result_per_round` - UNIQUE(round_id, team_id)

**RLS Policies:**
- Organizers can manage round results in their competitions
- Players can view round results in their competitions

**Example:**
```typescript
// Get individual standings using helper function
const { data: standings } = await supabase.rpc('get_competition_individual_standings', {
  comp_id: competitionId,
});

// Get team standings using helper function
const { data: teamStandings } = await supabase.rpc('get_competition_team_standings', {
  comp_id: competitionId,
});

// Get round results
const { data: results } = await supabase
  .from('round_results')
  .select('*, player:players(*), team:teams(*)')
  .eq('round_id', roundId)
  .order('position');
```

---

### `user_subscriptions`

User subscription management for tiered access control.

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Subscription unique identifier |
| `user_id` | UUID | FK → auth.users(id) ON DELETE CASCADE, UNIQUE | One subscription per user |
| `tier` | subscription_tier | NOT NULL, DEFAULT 'free' | 'free', 'social', 'premium', 'super_admin' |
| `status` | subscription_status | NOT NULL, DEFAULT 'active' | 'active', 'cancelled', 'expired', 'trial' |
| `source` | subscription_source | NOT NULL, DEFAULT 'manual' | 'manual', 'revenuecat', 'stripe' |
| `external_id` | TEXT | NULL | RevenueCat subscriber ID or Stripe customer ID |
| `product_id` | TEXT | NULL | App Store/Play Store product identifier |
| `started_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When subscription started |
| `expires_at` | TIMESTAMPTZ | NULL | When subscription expires (NULL = never expires) |
| `cancelled_at` | TIMESTAMPTZ | NULL | When subscription was cancelled |
| `trial_started_at` | TIMESTAMPTZ | NULL | Trial period start |
| `trial_ends_at` | TIMESTAMPTZ | NULL | Trial period end |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_user_subscriptions_tier` on `tier`
- `idx_user_subscriptions_status` on `status`
- `idx_user_subscriptions_expires` on `expires_at` WHERE expires_at IS NOT NULL
- `idx_user_subscriptions_external_id` on `external_id` WHERE external_id IS NOT NULL

**Constraints:**
- `user_subscriptions_user_id_unique` - UNIQUE(user_id) - One subscription record per user

**Triggers:**
- `create_default_subscription_on_player` - Auto-creates free subscription when player profile is created
- `update_user_subscriptions_updated_at` - Auto-updates `updated_at` on any change

**RLS Policies:**
- Users can view their own subscription (`user_id = auth.uid()`)
- Users can create their own subscription (for initial creation)
- Users cannot directly update subscriptions (must go through API/webhooks)
- Service role has full access (for webhook handlers)

**Example:**
```typescript
// Get user's subscription
const { data: subscription } = await supabase
  .from('user_subscriptions')
  .select('*')
  .eq('user_id', userId)
  .single();

// Check effective tier (handles expiry)
const { data: tier } = await supabase
  .rpc('get_user_subscription_tier', { p_user_id: userId });

// Upgrade user (service role only)
const { data } = await supabase.rpc('upsert_user_subscription', {
  p_user_id: userId,
  p_tier: 'premium',
  p_status: 'active',
  p_source: 'revenuecat',
  p_external_id: 'rc_subscriber_123',
  p_expires_at: '2025-12-31T23:59:59Z',
});
```

---

### `tier_limits`

Configuration table defining limits and feature access for each subscription tier.

**Special Values:**
- `-1` = unlimited (no limit enforced)
- `-2` = no system limit (super_admin bypass)

**Columns:**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Configuration unique identifier |
| `tier` | subscription_tier | NOT NULL, UNIQUE | The tier these limits apply to |
| `max_competitions_owned` | INTEGER | NOT NULL | Max competitions user can organize |
| `max_rounds_per_competition` | INTEGER | NOT NULL | Max rounds per competition |
| `max_players_per_competition` | INTEGER | NOT NULL | Max players per competition |
| `max_friends` | INTEGER | NOT NULL | Max friends a user can have |
| `allowed_game_types` | TEXT[] | NOT NULL | Array of game types tier can use |
| `can_use_team_formats` | BOOLEAN | NOT NULL, DEFAULT FALSE | Access to team formats |
| `can_use_scoring_pairs` | BOOLEAN | NOT NULL, DEFAULT FALSE | Access to scoring pairs feature |
| `can_export_data` | BOOLEAN | NOT NULL, DEFAULT FALSE | Can export competition data |
| `can_use_api_course_search` | BOOLEAN | NOT NULL, DEFAULT TRUE | Can search courses via API |
| `can_view_basic_stats` | BOOLEAN | NOT NULL, DEFAULT TRUE | Can view basic statistics |
| `can_view_score_distribution` | BOOLEAN | NOT NULL, DEFAULT FALSE | Can view score distribution charts |
| `can_view_advanced_stats` | BOOLEAN | NOT NULL, DEFAULT FALSE | Can view advanced stats (GIR, fairways) |
| `can_compare_stats` | BOOLEAN | NOT NULL, DEFAULT FALSE | Can compare stats with others |
| `can_access_admin_tools` | BOOLEAN | NOT NULL, DEFAULT FALSE | Access to admin tools |
| `requires_payment` | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether tier requires payment |
| `can_expire` | BOOLEAN | NOT NULL, DEFAULT TRUE | Whether subscriptions can expire |
| `display_name` | TEXT | NOT NULL | Human-readable tier name |
| `description` | TEXT | NULL | Tier description for UI |
| `badge_color` | TEXT | NULL | Hex color code for tier badge |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Seeded Tier Values:**

| Feature | Free | Social | Premium | Super Admin |
|---------|------|--------|---------|-------------|
| max_competitions_owned | 3 | 8 | -1 (unlimited) | -2 (no limit) |
| max_rounds_per_competition | 2 | 5 | 10 | -2 (no limit) |
| max_players_per_competition | 8 | 16 | 40 | -2 (no limit) |
| max_friends | 10 | 25 | -1 (unlimited) | -1 (unlimited) |
| allowed_game_types | stableford | stableford, stroke, match-play | all | all |
| can_use_team_formats | ❌ | ✅ | ✅ | ✅ |
| can_use_scoring_pairs | ❌ | ❌ | ✅ | ✅ |
| can_export_data | ❌ | ❌ | ❌ | ❌ |
| can_view_score_distribution | ❌ | ✅ | ✅ | ✅ |
| can_view_advanced_stats | ❌ | ❌ | ✅ | ✅ |
| can_compare_stats | ❌ | ✅ | ✅ | ✅ |
| can_access_admin_tools | ❌ | ❌ | ❌ | ✅ |
| requires_payment | ❌ | ✅ | ✅ | ❌ |
| can_expire | ✅ | ✅ | ✅ | ❌ |
| badge_color | #6b7280 (gray) | #3b82f6 (blue) | #f59e0b (amber) | #dc2626 (red) |

**RLS Policies:**
- Anyone can view tier limits (public configuration)
- Only service role can modify (admin operations)

**Example:**
```typescript
// Get all tier limits
const { data: allLimits } = await supabase
  .from('tier_limits')
  .select('*');

// Get limits for a specific tier
const { data: premiumLimits } = await supabase
  .rpc('get_tier_limits', { p_tier: 'premium' });

// Get current user's tier limits
const { data: myLimits } = await supabase
  .rpc('get_user_tier_limits', { p_user_id: userId });

// Check if user can create more competitions
const { data: canCreate } = await supabase
  .rpc('user_can_create_competition', { p_user_id: userId });

// Check if user can use a game type
const { data: canUseMatchPlay } = await supabase
  .rpc('user_can_use_game_type', {
    p_user_id: userId,
    p_game_type: 'match-play',
  });

// Check if user has a feature
const { data: hasFeature } = await supabase
  .rpc('user_has_feature', {
    p_user_id: userId,
    p_feature: 'scoring_pairs',
  });
```

---

## Database Functions

### `soft_delete_competition()`

Soft delete a competition and all related data (rounds, scorecards, pairings, teams, competition_players, scoring_pairs).

**Signature:**
```sql
soft_delete_competition(p_competition_id UUID)
RETURNS BOOLEAN
```

**Parameters:**
- `p_competition_id` - Competition UUID to soft delete

**Returns:**
- TRUE if successful

**Logic:**
1. Get all round IDs for the competition
2. Set `deleted_at` on all scorecards for those rounds
3. Set `deleted_at` on all pairings for those rounds
4. Set `deleted_at` on all scoring_pairs for those rounds
5. Set `deleted_at` on all rounds
6. Set `deleted_at` on all competition_players
7. Set `deleted_at` on all teams (if table exists)
8. Set `deleted_at` on the competition itself

**Example:**
```typescript
// Soft delete a competition
const { data, error } = await supabase.rpc('soft_delete_competition', {
  p_competition_id: competitionId,
});

if (error) {
  console.error('Failed to delete competition:', error);
}
```

**Important Notes:**
- This is a soft delete - data is not permanently removed
- All queries should filter by `deleted_at IS NULL` to exclude soft-deleted records
- The function is `SECURITY DEFINER` to ensure all related data is deleted regardless of RLS policies

---

### `calculate_stableford_points()`

Calculate Stableford points for a single hole.

**Signature:**
```sql
calculate_stableford_points(
  gross_score INTEGER,
  par INTEGER,
  player_handicap NUMERIC,
  stroke_index INTEGER
) RETURNS INTEGER
```

**Parameters:**
- `gross_score` - Actual strokes taken
- `par` - Hole par (3, 4, or 5)
- `player_handicap` - Player's handicap (e.g., 12.5)
- `stroke_index` - Hole stroke index (1-18)

**Returns:**
- Stableford points (0-4)

**Logic:**
1. Calculate strokes received on hole based on handicap and stroke index
2. Calculate net score (gross - strokes)
3. Award points:
   - Albatross or better (net ≤ par-2): 4 points
   - Birdie (net = par-1): 3 points
   - Par (net = par): 2 points
   - Bogey (net = par+1): 1 point
   - Double bogey or worse (net ≥ par+2): 0 points

**Example:**
```typescript
// Calculate points for hole 1
const { data: points } = await supabase.rpc('calculate_stableford_points', {
  gross_score: 5,
  par: 4,
  player_handicap: 12,
  stroke_index: 7,
});
// Returns: 2 (par)
```

---

### `get_competition_leaderboard()`

Get sorted leaderboard for a competition.

**Signature:**
```sql
get_competition_leaderboard(comp_id UUID)
RETURNS TABLE (
  rank INTEGER,
  player_id UUID,
  player_name TEXT,
  handicap NUMERIC,
  total_gross INTEGER,
  total_net INTEGER,
  total_points INTEGER,
  rounds_played INTEGER
)
```

**Parameters:**
- `comp_id` - Competition UUID

**Returns:**
- Table of leaderboard entries sorted by total_points DESC, total_net ASC

**Example:**
```typescript
// Get leaderboard
const { data: leaderboard } = await supabase
  .rpc('get_competition_leaderboard', {
    comp_id: competitionId,
  });

// Result:
// [
//   { rank: 1, player_name: 'John Doe', total_points: 38, ... },
//   { rank: 2, player_name: 'Jane Smith', total_points: 36, ... },
//   ...
// ]
```

---

### `deactivate_expired_competitions()`

Marks event-type competitions as 'completed' when their end_date has passed.

**Signature:**
```sql
deactivate_expired_competitions()
RETURNS INTEGER
```

**Returns:**
- Number of competitions that were deactivated

**Usage:**
Call this function via pg_cron (recommended) or an app-level scheduled job (daily at midnight):

```sql
-- Via pg_cron (run daily at midnight AEST)
SELECT cron.schedule('deactivate-expired-competitions', '0 14 * * *', 'SELECT deactivate_expired_competitions()');
```

```typescript
// Or via app-level job
const { data: count } = await supabase.rpc('deactivate_expired_competitions');
console.log(`Deactivated ${count} expired competitions`);
```

---

### `get_competition_by_invite_code()`

Lookup a competition by invite code. Only returns active competitions.

**Signature:**
```sql
get_competition_by_invite_code(code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  competition_type TEXT,
  handicap_system TEXT,
  status TEXT,
  organizer_id UUID
)
```

**Parameters:**
- `code` - The invite code (e.g., 'COMP-12345')

**Returns:**
- Competition details if found and active, empty if not found or inactive

**Example:**
```typescript
// Lookup competition for joining
const { data: competition } = await supabase
  .rpc('get_competition_by_invite_code', {
    code: 'COMP-12345',
  });

if (!competition || competition.length === 0) {
  throw new Error('Invalid or expired invite code');
}

// Competition is valid and active
const comp = competition[0];
```

---

### `get_player_scoring_assignment()`

Get the player that a scorer is responsible for marking in a round.

**Signature:**
```sql
get_player_scoring_assignment(
  p_round_id UUID,
  p_scorer_id UUID
) RETURNS UUID
```

**Parameters:**
- `p_round_id` - Round UUID
- `p_scorer_id` - Scorer (marker) player UUID

**Returns:**
- Player UUID that this scorer is marking, or NULL if not found

**Example:**
```typescript
// Get who the current user is scoring
const { data: playerToScore } = await supabase.rpc('get_player_scoring_assignment', {
  p_round_id: roundId,
  p_scorer_id: currentUserId,
});

if (playerToScore) {
  console.log(`You are marking player: ${playerToScore}`);
}
```

---

### `get_player_scorer()`

Get the scorer who is responsible for marking a player's score in a round.

**Signature:**
```sql
get_player_scorer(
  p_round_id UUID,
  p_player_id UUID
) RETURNS UUID
```

**Parameters:**
- `p_round_id` - Round UUID
- `p_player_id` - Player UUID

**Returns:**
- Scorer UUID who is marking this player, or NULL if not found

**Example:**
```typescript
// Get who is scoring the current user
const { data: myScorerId } = await supabase.rpc('get_player_scorer', {
  p_round_id: roundId,
  p_player_id: currentUserId,
});

if (myScorerId) {
  console.log(`Your marker is: ${myScorerId}`);
}
```

---

### `validate_scoring_pairs()`

Validates that all players in a competition round have exactly one scorer assigned.

**Signature:**
```sql
validate_scoring_pairs(p_round_id UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  missing_players UUID[],
  message TEXT
)
```

**Parameters:**
- `p_round_id` - Round UUID

**Returns:**
- `is_valid` - TRUE if all players have scorers assigned
- `missing_players` - Array of player UUIDs without scorers
- `message` - Human-readable validation message

**Example:**
```typescript
// Validate scoring pairs before starting round
const { data: validation } = await supabase.rpc('validate_scoring_pairs', {
  p_round_id: roundId,
});

if (!validation[0].is_valid) {
  console.error(`Missing scorers for ${validation[0].missing_players.length} players`);
  console.error(validation[0].message);
}
```

---

### `generate_reciprocal_scoring_pairs()`

Auto-generates circular scoring pairs from existing pairings. Each player in a pairing scores the next player (circular pattern).

**Signature:**
```sql
generate_reciprocal_scoring_pairs(p_round_id UUID)
RETURNS INTEGER
```

**Parameters:**
- `p_round_id` - Round UUID with pairings already defined

**Returns:**
- Number of scoring pairs created

**Logic:**
For a 4-player pairing [A, B, C, D]:
- A scores B
- B scores C
- C scores D
- D scores A

**Example:**
```typescript
// Auto-generate scoring pairs from pairings
const { data: pairsCreated } = await supabase.rpc('generate_reciprocal_scoring_pairs', {
  p_round_id: roundId,
});

console.log(`Created ${pairsCreated} scoring pairs`);
```

---

### `get_user_subscription_tier()`

Get the effective subscription tier for a user, considering expiry and status.

**Signature:**
```sql
get_user_subscription_tier(p_user_id UUID)
RETURNS subscription_tier
```

**Parameters:**
- `p_user_id` - User UUID

**Returns:**
- Effective subscription tier ('free', 'social', 'premium', 'super_admin')

**Logic:**
1. If no subscription record exists, return 'free'
2. If tier is 'super_admin', return it (never expires)
3. If subscription is expired (past `expires_at`), return 'free'
4. If status is not 'active' or 'trial', return 'free'
5. Otherwise return the stored tier

**Example:**
```typescript
// Get effective tier
const { data: tier } = await supabase.rpc('get_user_subscription_tier', {
  p_user_id: userId,
});
// Returns: 'premium' or 'free' (if expired)
```

---

### `user_has_tier_or_higher()`

Check if a user has a specific tier or higher.

**Signature:**
```sql
user_has_tier_or_higher(
  p_user_id UUID,
  p_required_tier subscription_tier
) RETURNS BOOLEAN
```

**Parameters:**
- `p_user_id` - User UUID
- `p_required_tier` - Minimum required tier

**Returns:**
- TRUE if user has required tier or higher

**Tier Hierarchy:** free < social < premium < super_admin

**Example:**
```typescript
// Check if user can access premium features
const { data: hasPremium } = await supabase.rpc('user_has_tier_or_higher', {
  p_user_id: userId,
  p_required_tier: 'premium',
});
```

---

### `get_tier_limits()`

Get the tier_limits record for a specific tier.

**Signature:**
```sql
get_tier_limits(p_tier subscription_tier)
RETURNS tier_limits
```

**Example:**
```typescript
const { data: limits } = await supabase.rpc('get_tier_limits', {
  p_tier: 'social',
});
```

---

### `get_user_tier_limits()`

Get the tier_limits record for a user based on their current subscription.

**Signature:**
```sql
get_user_tier_limits(p_user_id UUID)
RETURNS tier_limits
```

**Example:**
```typescript
const { data: limits } = await supabase.rpc('get_user_tier_limits', {
  p_user_id: userId,
});
// Returns limits for user's effective tier
```

---

### `user_can_create_competition()`

Check if a user can create more competitions based on their tier limits.

**Signature:**
```sql
user_can_create_competition(p_user_id UUID)
RETURNS BOOLEAN
```

**Logic:**
1. Get user's tier limits
2. If max = -2 (super admin), return TRUE
3. If max = -1 (unlimited), return TRUE
4. Count active competitions owned by user
5. Return TRUE if count < max

**Example:**
```typescript
const { data: canCreate } = await supabase.rpc('user_can_create_competition', {
  p_user_id: userId,
});
if (!canCreate) {
  // Show upgrade prompt
}
```

---

### `competition_can_add_round()`

Check if a competition can add more rounds based on organizer's tier limits.

**Signature:**
```sql
competition_can_add_round(p_competition_id UUID)
RETURNS BOOLEAN
```

**Example:**
```typescript
const { data: canAdd } = await supabase.rpc('competition_can_add_round', {
  p_competition_id: competitionId,
});
```

---

### `competition_can_add_player()`

Check if a competition can add more players based on organizer's tier limits.

**Signature:**
```sql
competition_can_add_player(p_competition_id UUID)
RETURNS BOOLEAN
```

**Example:**
```typescript
const { data: canAdd } = await supabase.rpc('competition_can_add_player', {
  p_competition_id: competitionId,
});
```

---

### `user_can_add_friend()`

Check if a user can add more friends based on their tier limits.

**Signature:**
```sql
user_can_add_friend(p_user_id UUID)
RETURNS BOOLEAN
```

**Example:**
```typescript
const { data: canAdd } = await supabase.rpc('user_can_add_friend', {
  p_user_id: userId,
});
```

---

### `user_can_use_game_type()`

Check if a user can use a specific game type based on their tier.

**Signature:**
```sql
user_can_use_game_type(
  p_user_id UUID,
  p_game_type TEXT
) RETURNS BOOLEAN
```

**Game Types:** 'stableford', 'stroke', 'match-play', 'ambrose', 'best-ball', 'scramble'

**Example:**
```typescript
const { data: canUse } = await supabase.rpc('user_can_use_game_type', {
  p_user_id: userId,
  p_game_type: 'match-play',
});
```

---

### `user_has_feature()`

Check if a user has access to a specific feature based on their tier.

**Signature:**
```sql
user_has_feature(
  p_user_id UUID,
  p_feature TEXT
) RETURNS BOOLEAN
```

**Features:** 'team_formats', 'scoring_pairs', 'export_data', 'api_course_search', 'basic_stats', 'score_distribution', 'advanced_stats', 'compare_stats', 'admin_tools'

**Example:**
```typescript
const { data: hasFeature } = await supabase.rpc('user_has_feature', {
  p_user_id: userId,
  p_feature: 'scoring_pairs',
});
```

---

### `upsert_user_subscription()`

Create or update a user's subscription. Used by webhook handlers.

**Signature:**
```sql
upsert_user_subscription(
  p_user_id UUID,
  p_tier subscription_tier,
  p_status subscription_status,
  p_source subscription_source,
  p_external_id TEXT DEFAULT NULL,
  p_product_id TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_trial_ends_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID
```

**Returns:**
- Subscription UUID (created or updated)

**Example:**
```typescript
// Called by RevenueCat webhook handler
const { data: subId } = await supabase.rpc('upsert_user_subscription', {
  p_user_id: userId,
  p_tier: 'premium',
  p_status: 'active',
  p_source: 'revenuecat',
  p_external_id: 'rc_subscriber_123',
  p_product_id: 'com.thenineteenth.premium.monthly',
  p_expires_at: '2025-12-31T23:59:59Z',
});
```

---

### `get_friends()`

Returns all accepted friends for a user with their player details.

**Signature:**
```sql
get_friends(user_id UUID)
RETURNS TABLE (
  friendship_id UUID,
  friend_id UUID,
  friend_name TEXT,
  friend_email TEXT,
  friend_handicap NUMERIC,
  friend_photo_url TEXT,
  is_requester BOOLEAN,
  created_at TIMESTAMPTZ
)
```

**Parameters:**
- `user_id` - User UUID

**Returns:**
- Table of friend details with friendship metadata

**Example:**
```typescript
const { data: friends } = await supabase.rpc('get_friends', {
  user_id: currentUserId,
});
```

---

### `get_pending_friend_requests()`

Returns pending friend requests received by a user.

**Signature:**
```sql
get_pending_friend_requests(user_id UUID)
RETURNS TABLE (
  request_id UUID,
  requester_id UUID,
  requester_name TEXT,
  requester_email TEXT,
  requester_handicap NUMERIC,
  requester_photo_url TEXT,
  created_at TIMESTAMPTZ
)
```

**Parameters:**
- `user_id` - User UUID

**Returns:**
- Table of pending friend requests with requester details

**Example:**
```typescript
const { data: requests } = await supabase.rpc('get_pending_friend_requests', {
  user_id: currentUserId,
});
```

---

### `get_unread_notification_count()`

Returns count of unread notifications for a user.

**Signature:**
```sql
get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
```

**Example:**
```typescript
const { data: count } = await supabase.rpc('get_unread_notification_count', {
  p_user_id: currentUserId,
});
```

---

### `mark_all_notifications_read()`

Marks all notifications for a user as read.

**Signature:**
```sql
mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER
```

**Returns:**
- Number of notifications updated

**Example:**
```typescript
const { data: updated } = await supabase.rpc('mark_all_notifications_read', {
  p_user_id: currentUserId,
});
```

---

### `create_notification()`

Internal helper function to create notifications. Used by triggers.

**Signature:**
```sql
create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_data JSONB DEFAULT '{}',
  p_competition_id UUID DEFAULT NULL,
  p_round_id UUID DEFAULT NULL,
  p_player_id UUID DEFAULT NULL,
  p_friendship_id UUID DEFAULT NULL
)
RETURNS UUID
```

**Returns:**
- Notification UUID

**Note:** This is typically called by triggers, not directly by application code.

---

### `get_team_with_members()`

Get team details with all member information.

**Signature:**
```sql
get_team_with_members(team_uuid UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  competition_id UUID,
  player_id UUID,
  player_name TEXT,
  player_handicap NUMERIC,
  joined_at TIMESTAMPTZ
)
```

**Parameters:**
- `team_uuid` - Team UUID

**Returns:**
- Table of team info with all member details, ordered by handicap

**Example:**
```typescript
const { data: team } = await supabase.rpc('get_team_with_members', {
  team_uuid: teamId,
});
```

---

### `get_competition_team_standings()`

Get team standings for a competition based on competition points.

**Signature:**
```sql
get_competition_team_standings(comp_id UUID)
RETURNS TABLE (
  rank INTEGER,
  team_id UUID,
  team_name TEXT,
  total_points NUMERIC,
  rounds_played INTEGER,
  avg_handicap NUMERIC
)
```

**Parameters:**
- `comp_id` - Competition UUID

**Returns:**
- Table of team standings ordered by total points descending

**Example:**
```typescript
const { data: standings } = await supabase.rpc('get_competition_team_standings', {
  comp_id: competitionId,
});
```

---

### `get_competition_individual_standings()`

Get individual player standings for a competition based on competition points.

**Signature:**
```sql
get_competition_individual_standings(comp_id UUID)
RETURNS TABLE (
  rank INTEGER,
  player_id UUID,
  player_name TEXT,
  handicap NUMERIC,
  total_points NUMERIC,
  rounds_played INTEGER
)
```

**Parameters:**
- `comp_id` - Competition UUID

**Returns:**
- Table of player standings ordered by total points descending

**Example:**
```typescript
const { data: standings } = await supabase.rpc('get_competition_individual_standings', {
  comp_id: competitionId,
});
```

---

## Common Query Patterns

### 1. Create Venue and Course Flow

```typescript
// Step 1: Create venue (the physical club)
const { data: venue } = await supabase
  .from('venues')
  .insert({
    name: 'The Eastern Golf Club',
    state: 'VIC',
    city: 'Doncaster',
    source: 'manual',
    total_holes: 27,  // 3 nines
  })
  .select()
  .single();

// Step 2: Create course(s) at the venue
// For a 27-hole venue, create 3 course configurations
const eastWestHoles = [...];  // 18 holes (East nine + West nine)
const westNorthHoles = [...]; // 18 holes (West nine + North nine)
const eastNorthHoles = [...]; // 18 holes (East nine + North nine)

const { data: courses } = await supabase
  .from('courses')
  .insert([
    {
      venue_id: venue.id,
      name: 'East/West Course',
      holes: eastWestHoles,
      slope_rating: 128,
      course_rating: 71.2,
    },
    {
      venue_id: venue.id,
      name: 'West/North Course',
      holes: westNorthHoles,
      slope_rating: 130,
      course_rating: 72.1,
    },
    {
      venue_id: venue.id,
      name: 'East/North Course',
      holes: eastNorthHoles,
      slope_rating: 126,
      course_rating: 70.8,
    },
  ])
  .select();

// For a simple 18-hole venue, just create one course
const { data: simpleVenue } = await supabase
  .from('venues')
  .insert({
    name: 'Kingston Heath Golf Club',
    state: 'VIC',
    city: 'Cheltenham',
    source: 'manual',
    total_holes: 18,
  })
  .select()
  .single();

const { data: simpleCourse } = await supabase
  .from('courses')
  .insert({
    venue_id: simpleVenue.id,
    name: 'Championship Course',  // Or just the venue name
    holes: [...],  // 18 holes
    slope_rating: 135,
    course_rating: 74.5,
  })
  .select()
  .single();
```

### 2. Course Selection UI Query (Hybrid List)

```typescript
// Get all venues with their courses for the selection UI
const { data: venuesWithCourses } = await supabase
  .from('venues')
  .select(`
    id,
    name,
    city,
    state,
    total_holes,
    courses (
      id,
      name,
      slope_rating,
      course_rating
    )
  `)
  .order('name');

// Transform for hybrid UI display:
// - Single-course venues: show course directly
// - Multi-course venues: show as expandable group
const displayItems = venuesWithCourses.map(venue => ({
  venueId: venue.id,
  venueName: venue.name,
  location: `${venue.city} · ${venue.state}`,
  isMultiCourse: venue.courses.length > 1,
  courses: venue.courses,
}));
```

### 3. Create Competition Flow

```typescript
// Step 1: Create competition (league - ongoing)
const { data: leagueComp } = await supabase
  .from('competitions')
  .insert({
    name: 'Sunday Social League',
    description: 'Ongoing weekly social golf',
    competition_type: 'league',  // No end_date required
    start_date: '2025-02-15',
    handicap_system: 'honor',
    organizer_id: userId,
  })
  .select()
  .single();

// Or create an event (fixed-term)
const { data: eventComp } = await supabase
  .from('competitions')
  .insert({
    name: 'Summer Classic 2025',
    description: 'Annual summer golf competition',
    competition_type: 'event',  // Requires end_date
    start_date: '2025-02-15',
    end_date: '2025-02-16',     // Auto-deactivates after this date
    handicap_system: 'honor',
    organizer_id: userId,
  })
  .select()
  .single();

// Step 2: Select existing course (from venue/course picker)
// courseId selected from UI

// Step 3: Create round
const { data: round } = await supabase
  .from('rounds')
  .insert({
    competition_id: competition.id,
    round_number: 1,
    course_id: courseId,  // Selected from venue/course picker
    date: '2025-02-15',
    game_type: 'stableford',
  })
  .select()
  .single();

// Step 4: Add players
const playerInserts = players.map(p => ({
  competition_id: competition.id,
  player_id: p.id,
  status: 'accepted',
}));

await supabase.from('competition_players').insert(playerInserts);

// Step 5: Create pairings (manual)
const { data: pairing } = await supabase
  .from('pairings')
  .insert({
    round_id: round.id,
    player_ids: [player1.id, player2.id, player3.id, player4.id],
  })
  .select()
  .single();
```

### 2. Join Competition Flow

```typescript
// Step 1: Find competition by invite code (using helper function)
// This automatically filters out completed/cancelled competitions
const { data: competitions } = await supabase
  .rpc('get_competition_by_invite_code', { code: inviteCode });

if (!competitions || competitions.length === 0) {
  throw new Error('Invalid or expired invite code');
}

const competition = competitions[0];

// Step 2: Check if already joined
const { data: existing } = await supabase
  .from('competition_players')
  .select('*')
  .eq('competition_id', competition.id)
  .eq('player_id', userId)
  .single();

if (existing) {
  throw new Error('Already joined this competition');
}

// Step 3: Join competition
await supabase
  .from('competition_players')
  .insert({
    competition_id: competition.id,
    player_id: userId,
    status: 'accepted',
  });
```

### 3. Score Entry Flow (Offline-First)

```typescript
// On hole score change (save to local SQLite first)
await saveScoreLocally(roundId, playerId, holeNumber, strokes);

// When submitting scorecard (or when back online)
const { data: scorecard } = await supabase
  .from('scorecards')
  .upsert({
    round_id: roundId,
    player_id: playerId,
    scores: scoresObject, // { "1": { strokes: 4 }, "2": { strokes: 5 }, ... }
    total_gross: calculateTotalGross(scoresObject),
    total_points: calculateTotalPoints(scoresObject, holes, handicap),
    status: 'completed',
    submitted_at: new Date().toISOString(),
    submitted_by: userId,
  })
  .select()
  .single();
```

### 4. Leaderboard Query

```typescript
// Option 1: Using helper function
const { data: leaderboard } = await supabase
  .rpc('get_competition_leaderboard', {
    comp_id: competitionId,
  });

// Option 2: Manual query
const { data: scorecards } = await supabase
  .from('scorecards')
  .select(`
    *,
    player:players(name, handicap),
    round:rounds(competition_id)
  `)
  .eq('round.competition_id', competitionId)
  .eq('status', 'completed')
  .order('total_points', { ascending: false })
  .order('total_net', { ascending: true });
```

---

## Migration Instructions

### Local Development (Supabase CLI)

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase (requires Docker)
supabase start

# Apply migration
supabase db reset

# Or apply specific migration
supabase db push
```

### Supabase Cloud (Production)

**Option 1: Supabase Dashboard**
1. Go to SQL Editor in Supabase Dashboard
2. Paste contents of `supabase/migrations/20250109000000_mvp_phase_1_schema.sql`
3. Click "Run"

**Option 2: Supabase CLI**
```bash
# Link to Supabase project
supabase link --project-ref your-project-ref

# Push migration
supabase db push
```

---

## Security Considerations

### Row-Level Security (RLS)

All tables have RLS enabled. Key policies:

1. **Players can only view/edit their own data**
2. **Organizers have full control over their competitions**
3. **Players can only access data in competitions they're in**
4. **Scorecards can be edited by anyone in the same pairing** (for group scoring)

### API Security

- Always use Supabase anon key (RLS enforced)
- Service role key only for admin operations (backend only)
- Never expose service role key in frontend

### Offline Sync Security

- Device ID for conflict resolution
- Last-write-wins strategy for MVP
- Validate scorecard ownership before sync

---

## Performance Optimization

### Indexes

All critical queries are indexed:
- Leaderboard: `idx_scorecards_round_status` composite index
- Competition lookup: `idx_competitions_invite_code`
- Player competitions: `idx_competition_players_player`
- Course search: `idx_courses_name`, `idx_courses_location` (spatial)

### JSONB Performance

- `scores` field uses JSONB for flexibility
- GIN indexes on JSONB columns for fast queries
- Denormalized totals (total_gross, total_points) for fast leaderboard

### Query Tips

```typescript
// ✅ Good: Use composite index
const { data } = await supabase
  .from('scorecards')
  .select('*')
  .eq('round_id', roundId)
  .eq('status', 'completed');

// ❌ Bad: Full table scan
const { data } = await supabase
  .from('scorecards')
  .select('*')
  .filter('scores', 'cs', '{"1":{"strokes":4}}');

// ✅ Good: Use helper function
const { data } = await supabase.rpc('get_competition_leaderboard', {
  comp_id: competitionId,
});
```

---

## Testing

### Sample Data

See commented section at bottom of migration for sample course data.

### Test Queries

```sql
-- Test RLS policies
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid-here';

-- Should only see own competitions
SELECT * FROM competitions;

-- Should only see players in own competitions
SELECT * FROM players;
```

---

## Future Enhancements (Phase 2+)

- [ ] Multi-round competitions (use `end_date`, multiple rounds)
- [ ] Multiple game types (stroke play, match play, etc.)
- [ ] Detailed statistics (putts, fairways, GIR in `scores` JSONB)
- [ ] Course API integration (populate from external API)
- [ ] Auto-pairing algorithm (function to generate optimal pairings)
- [ ] Real-time updates (Supabase Realtime subscriptions)
- [ ] Team competitions (new `teams` table)
- [ ] Photo uploads (Supabase Storage integration)

---

## Support

For questions or issues:
- Review CLAUDE.md project documentation
- Check MVP-PHASE-1.md for feature scope
- See PROJECT_SETUP.md for environment setup

---

*Last Updated: December 2025*
