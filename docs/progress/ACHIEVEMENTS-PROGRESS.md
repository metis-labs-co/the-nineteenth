# Achievements System Implementation Plan

**Goal:** Add achievements/rewards system with unlockable cosmetics, leaderboard, and progress tracking across rounds, competitions, scoring, social, and courses
**Status:** Complete - 100% (25/25 tasks)

---

## Overview

Implement a gamification system that rewards users for completing milestones across rounds, competitions, scoring, social connections, and course variety. Achievements unlock progressively and provide:
- **Points** that unlock cosmetic rewards (badges, frames, titles)
- **Leaderboards** (global, friends, competition)
- **Public visibility** to friends and competition members
- **In-app toast** notifications on unlock
- **Retroactive calculation** for existing users on launch

---

## Design Decisions (Confirmed)

| Decision | Choice |
|----------|--------|
| **Points System** | Leaderboard + Unlock cosmetics (profile badges, frames, titles) |
| **Visibility** | Public - achievements visible to friends/competition members |
| **Notifications** | In-app toast only (no push notifications) |
| **Retroactive** | Yes - full retroactive calculation on feature launch |

---

## Achievement Categories & Definitions

### 1. ROUND MILESTONES

| Achievement | Trigger | Tiers |
|-------------|---------|-------|
| **Practice Makes Perfect** | Complete practice rounds | 1, 5, 10, 25, 50, 100 rounds |
| **Competitor** | Complete competition rounds | 1, 5, 10, 25, 50, 100 rounds |
| **Round Veteran** | Total rounds (any type) | 1, 10, 25, 50, 100, 250, 500 |
| **18 Holes of Glory** | Complete 18-hole rounds | 1, 10, 25, 50 rounds |

### 2. GAME TYPE VARIETY

| Achievement | Trigger | Tiers |
|-------------|---------|-------|
| **Stableford Specialist** | Complete Stableford rounds | 1, 10, 25, 50 rounds |
| **Stroke Player** | Complete Stroke Play rounds | 1, 10, 25, 50 rounds |
| **Match Play Master** | Complete Match Play rounds | 1, 5, 10, 25 rounds |
| **Team Player** | Complete team format rounds (Ambrose/Best Ball/Scramble) | 1, 5, 10, 25 rounds |
| **Format Explorer** | Play different game types | 2, 3, 4, 5 unique types |
| **Multi-Ball Maverick** | Complete multi-ball rounds (2+) | 1, 5, 10 rounds |

### 3. SCORING ACHIEVEMENTS

| Achievement | Trigger | Tiers |
|-------------|---------|-------|
| **Birdie Hunter** | Record birdies | 1, 10, 25, 50, 100, 250 birdies |
| **Eagle Eye** | Record eagles | 1, 5, 10, 25, 50 eagles |
| **Albatross Rare** | Record albatross | 1, 3, 5 (very rare) |
| **Ace!** | Record hole-in-one | 1, 2, 3 (legendary) |
| **Par Machine** | Record pars | 10, 50, 100, 250, 500 pars |
| **Stableford Star** | Single-round Stableford points | 30, 36, 40, 45+ points |
| **Low Scorer** | Best gross score thresholds | Under 100, 90, 85, 80, 75, 70 |
| **Net Master** | Best net score thresholds | Under par, -3, -5, -10 |

### 4. COMPETITION ACHIEVEMENTS

| Achievement | Trigger | Tiers |
|-------------|---------|-------|
| **First Timer** | Join first competition | 1 competition |
| **Competition Junkie** | Join competitions | 1, 3, 5, 10, 20, 50 competitions |
| **Champion** | Win competitions (1st place) | 1, 3, 5, 10, 25 wins |
| **Podium Finish** | Finish top 3 | 1, 5, 10, 25 podiums |
| **Consistent Performer** | Finish top 50% | 5, 10, 25 times |
| **Organizer** | Create competitions | 1, 3, 5, 10 created |
| **Social Butterfly** | Competitions with 8+ players | 1, 5, 10 competitions |
| **Rivalry** | Compete against same player | 3, 5, 10, 20 times |

### 5. SOCIAL ACHIEVEMENTS

| Achievement | Trigger | Tiers |
|-------------|---------|-------|
| **First Friend** | Add first friend | 1 friend |
| **Social Circle** | Total friends | 5, 10, 20, 30, 50 friends |
| **Playing Partners** | Unique players played with | 5, 10, 25, 50, 100 players |
| **Regular Foursome** | Play with same group 5+ times | 1, 3, 5 groups |
| **Inviter** | Invite players to competitions | 5, 10, 25, 50 invites sent |
| **Popular** | Receive friend requests | 5, 10, 25 requests |

### 6. COURSE ACHIEVEMENTS

| Achievement | Trigger | Tiers |
|-------------|---------|-------|
| **Course Explorer** | Play unique courses | 3, 5, 10, 20, 50 courses |
| **Home Advantage** | Play at home venue | 5, 10, 25, 50, 100 rounds |
| **Course Conqueror** | Play same course 10+ times | 1, 3, 5 courses mastered |
| **State Traveler** | Play courses in different states | 2, 3, 5, 8 states |
| **Favorite Finder** | Add favorite courses | 1, 3, 5, 10 favorites |

### 7. MATCH PLAY SPECIFIC

| Achievement | Trigger | Tiers |
|-------------|---------|-------|
| **Match Winner** | Win match play matches | 1, 5, 10, 25, 50 wins |
| **Dominant Victory** | Win match 5&4 or better | 1, 5, 10 wins |
| **Comeback King** | Win after being 2+ down | 1, 3, 5 comebacks |
| **Halved Match** | Halve a match | 1, 5 halved |
| **Holes Won** | Total match play holes won | 10, 50, 100, 250 holes |

### 8. STREAK & CONSISTENCY

| Achievement | Trigger | Tiers |
|-------------|---------|-------|
| **Weekly Warrior** | Play rounds in consecutive weeks | 4, 8, 12, 26, 52 weeks |
| **Monthly Regular** | Play at least 1 round per month | 3, 6, 12 months |
| **Hot Streak** | Win consecutive competitions | 2, 3, 5 in a row |
| **Birdie Streak** | Birdies in consecutive holes | 2, 3, 4, 5 holes |
| **Par Streak** | Pars or better in consecutive holes | 5, 9, 12, 18 holes |

### 9. MILESTONE ACHIEVEMENTS (Special)

| Achievement | Trigger | Tiers |
|-------------|---------|-------|
| **Early Adopter** | Join during beta period | Badge only |
| **Anniversary** | Account age milestones | 1, 2, 3, 5 years |
| **Completionist** | Earn X% of all achievements | 25%, 50%, 75%, 100% |
| **Legend** | Earn all tier-5 achievements | Special badge |

---

## Database Schema

### New Tables

```sql
-- Achievement definitions (seeded, rarely changes)
CREATE TABLE achievement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,           -- 'ROUND_VETERAN_1', 'BIRDIE_HUNTER_3'
  category TEXT NOT NULL,              -- 'rounds', 'scoring', 'social', etc.
  name TEXT NOT NULL,                  -- Display name
  description TEXT NOT NULL,           -- How to earn it
  icon TEXT NOT NULL,                  -- Material icon name
  tier INTEGER NOT NULL DEFAULT 1,     -- 1-5 for progression
  threshold INTEGER NOT NULL,          -- Number required to unlock
  base_achievement TEXT,               -- Parent achievement code (for tiers)
  points INTEGER NOT NULL DEFAULT 10,  -- Points awarded
  rarity TEXT DEFAULT 'common',        -- 'common', 'uncommon', 'rare', 'epic', 'legendary'
  is_hidden BOOLEAN DEFAULT false,     -- Secret achievements
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Player earned achievements
CREATE TABLE player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievement_definitions(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  progress INTEGER DEFAULT 0,          -- Current progress (for tracking)
  notified BOOLEAN DEFAULT false,      -- Whether user was notified
  UNIQUE(player_id, achievement_id)
);

-- Achievement progress tracking (for real-time progress)
CREATE TABLE achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  achievement_code TEXT NOT NULL,      -- Base achievement code
  current_value INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, achievement_code)
);

-- Indexes
CREATE INDEX idx_player_achievements_player ON player_achievements(player_id);
CREATE INDEX idx_player_achievements_earned ON player_achievements(earned_at DESC);
CREATE INDEX idx_achievement_progress_player ON achievement_progress(player_id);
```

### TypeScript Types

```typescript
// src/types/database/achievement.types.ts

export type AchievementCategory =
  | 'rounds'
  | 'game_types'
  | 'scoring'
  | 'competitions'
  | 'social'
  | 'courses'
  | 'match_play'
  | 'streaks'
  | 'milestones';

export type AchievementRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

export interface AchievementDefinition {
  id: string;
  code: string;
  category: AchievementCategory;
  name: string;
  description: string;
  icon: string;
  tier: number;
  threshold: number;
  base_achievement: string | null;
  points: number;
  rarity: AchievementRarity;
  is_hidden: boolean;
}

export interface PlayerAchievement {
  id: string;
  player_id: string;
  achievement_id: string;
  earned_at: string;
  progress: number;
  notified: boolean;
  // Joined data
  achievement?: AchievementDefinition;
}

export interface AchievementProgress {
  id: string;
  player_id: string;
  achievement_code: string;
  current_value: number;
  last_updated: string;
}

// UI Types
export interface AchievementWithProgress extends AchievementDefinition {
  earned: boolean;
  earned_at?: string;
  current_progress: number;
  next_tier?: AchievementDefinition;
}

export interface AchievementSummary {
  total_earned: number;
  total_available: number;
  total_points: number;
  recent_achievements: PlayerAchievement[];
  by_category: Record<AchievementCategory, { earned: number; total: number }>;
}
```

---

## Implementation Architecture

### Achievement Checking Service

```
Achievement Check Flow:
┌─────────────────┐
│  Event Trigger  │  (round complete, scorecard submit, friend added, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Achievement    │  Check relevant achievements for this event
│  Checker Hook   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Progress       │  Update achievement_progress table
│  Update         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Threshold      │  Check if threshold met → unlock
│  Check          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Unlock &       │  Insert to player_achievements, show toast
│  Notify         │
└─────────────────┘
```

### Key Files to Create

```
src/
├── types/database/
│   ├── achievement.types.ts        # Achievement TypeScript types
│   └── cosmetic.types.ts           # Cosmetic TypeScript types
├── hooks/
│   ├── achievements/
│   │   ├── useAchievements.ts          # Fetch player achievements
│   │   ├── useAchievementProgress.ts   # Fetch progress data
│   │   ├── useAchievementLeaderboard.ts # Leaderboard data
│   │   ├── useCheckAchievements.ts     # Achievement checker hook
│   │   └── index.ts
│   └── cosmetics/
│       ├── useCosmetics.ts             # Fetch unlocked cosmetics
│       ├── useEquipCosmetic.ts         # Equip/unequip mutations
│       └── index.ts
├── services/
│   └── achievements/
│       ├── achievementChecker.ts       # Core checking logic
│       ├── achievementEvents.ts        # Event type definitions
│       ├── achievementDefinitions.ts   # Achievement constants
│       ├── cosmeticDefinitions.ts      # Cosmetic constants
│       └── retroactiveCalculator.ts    # One-time calculation
├── components/
│   ├── achievements/
│   │   ├── AchievementBadge.tsx        # Small badge display
│   │   ├── AchievementCard.tsx         # Card with progress bar
│   │   ├── AchievementList.tsx         # List of achievements
│   │   ├── AchievementToast.tsx        # Unlock celebration toast
│   │   ├── AchievementProgress.tsx     # Progress bar component
│   │   ├── AchievementSummary.tsx      # Summary stats (earned, points, %)
│   │   └── index.ts
│   └── cosmetics/
│       ├── CosmeticSelector.tsx        # Select/equip cosmetics
│       ├── ProfileFrame.tsx            # Frame around avatar
│       ├── ProfileBadge.tsx            # Display equipped badge
│       ├── ProfileTitle.tsx            # Display equipped title
│       └── index.ts
├── screens/
│   └── profile/
│       ├── AchievementsScreen/
│       │   ├── index.tsx               # Main achievements screen
│       │   ├── components/
│       │   │   ├── CategoryTabs.tsx    # Filter by category
│       │   │   ├── AchievementGrid.tsx # Grid/list display
│       │   │   └── CosmeticsSection.tsx # Unlocked rewards
│       │   └── hooks/
│       │       └── useAchievementFilters.ts
│       └── AchievementLeaderboardScreen/
│           ├── index.tsx               # Leaderboard screen
│           └── components/
│               ├── LeaderboardTabs.tsx # Global/Friends/Competition
│               └── LeaderboardRow.tsx  # Player row with points
supabase/
└── migrations/
    └── 2025XXXX_achievements.sql       # All achievement tables + seeds
```

---

## UI Design

### Achievement Badge Component

```
┌─────────────────────────────────┐
│  🏆  Birdie Hunter III          │  ← Icon + Name + Tier
│  ────────────────────────────   │
│  Record 25 birdies              │  ← Description
│  ▓▓▓▓▓▓▓▓░░░░░  18/25          │  ← Progress bar (if not earned)
│  +30 points • Rare              │  ← Points + Rarity
└─────────────────────────────────┘
```

### Achievements Screen Layout

```
┌──────────────────────────────────┐
│  ← My Achievements               │
├──────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐│
│  │   42   │ │  850   │ │  68%   ││  ← Summary cards
│  │Unlocked│ │ Points │ │Complete││
│  └────────┘ └────────┘ └────────┘│
├──────────────────────────────────┤
│ [All][Rounds][Scoring][Social]...│  ← Category tabs
├──────────────────────────────────┤
│  Recent Unlocks                  │
│  ┌───┐ ┌───┐ ┌───┐              │
│  │🏆│ │⭐│ │🎯│  ← Recent badges
│  └───┘ └───┘ └───┘              │
├──────────────────────────────────┤
│  ┌─────────────────────────────┐ │
│  │ 🏌️ Round Veteran III       │ │
│  │ Complete 25 rounds         │ │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓░░ 23/25      │ │
│  └─────────────────────────────┘ │
│  ┌─────────────────────────────┐ │
│  │ 🐦 Birdie Hunter II  ✓     │ │
│  │ Earned: Dec 15, 2024       │ │
│  └─────────────────────────────┘ │
└──────────────────────────────────┘
```

### Unlock Toast

```
┌──────────────────────────────────┐
│  🎉 Achievement Unlocked!        │
│  ──────────────────────────────  │
│  🏆 Birdie Hunter III            │
│  Record 25 birdies • +30 pts     │
│                       [View All] │
└──────────────────────────────────┘
```

### Profile Screen Integration

Add "Achievements" row to Profile screen:
```
┌──────────────────────────────────┐
│  🏆 Achievements                 │
│  42 unlocked • 850 points    >   │
└──────────────────────────────────┘
```

---

## Sprint 1: Database Foundation

### Task 1: Database Migration - Achievement Tables
**Status:** Completed
**Completed:** 2024-12-30
**Migration File:** `supabase/migrations/20251230000000_achievements.sql`

**Deliverables:**
- [x] `supabase/migrations/20251230000000_achievements.sql`
- [x] `achievement_definitions` table with constraints (category enum, rarity enum, tier 1-6 check)
- [x] `player_achievements` table with unique constraint (player_id, achievement_id)
- [x] `achievement_progress` table for tracking with unique (player_id, achievement_code)
- [x] Comprehensive indexes on all foreign keys, player_id columns, and earned_at

**Additional deliverables included in this migration:**
- [x] RLS policies for all tables (Tasks 3 deliverables)
- [x] `achievement_leaderboard` view
- [x] `get_achievement_leaderboard()` function with scope filtering
- [x] `get_player_achievement_summary()` function
- [x] `get_achievements_with_progress()` function
- [x] `upsert_achievement_progress()` function
- [x] `increment_achievement_progress()` function
- [x] `award_achievement()` function

**Dependencies:** None

---

### Task 2: Database Migration - Cosmetics Tables
**Status:** Completed
**Completed:** 2024-12-30
**Migration File:** `supabase/migrations/20251230000000_achievements.sql` (appended to achievements migration)

**Deliverables:**
- [x] `cosmetic_type` enum ('badge', 'frame', 'title')
- [x] `cosmetic_definitions` table with constraints
- [x] `player_cosmetics` table with UNIQUE(player_id, cosmetic_id)
- [x] Equipped cosmetic columns on `players` table (equipped_badge_id, equipped_frame_id, equipped_title_id)
- [x] Foreign key constraints with ON DELETE SET NULL for equipped, ON DELETE CASCADE for player_cosmetics
- [x] Indexes on all foreign keys and query columns
- [x] RLS policies for cosmetic_definitions (public read) and player_cosmetics (owner + friends + competition members)
- [x] Database functions:
  - `get_player_equipped_cosmetics()` - Get equipped cosmetics for a player
  - `get_player_unlocked_cosmetics()` - Get all unlocked cosmetics with equipped status
  - `get_cosmetics_with_status()` - Get all cosmetics with unlock/equipped status
  - `equip_cosmetic()` - Equip a cosmetic (validates unlock first)
  - `unequip_cosmetic()` - Unequip a cosmetic by type
  - `unlock_cosmetic()` - Unlock a cosmetic for a player
  - `check_cosmetic_unlocks()` - Check and unlock cosmetics based on points
- [x] Updated `achievement_leaderboard` view to include equipped cosmetics
- [x] Updated `get_achievement_leaderboard()` function to return equipped cosmetics

**TypeScript Types Created:**
- [x] `src/types/database/cosmetic.types.ts` - All cosmetic types and constants
- [x] Updated `src/types/database/player.types.ts` - Added equipped_*_id fields to Player
- [x] Updated `src/types/database/index.ts` - Exported cosmetic types

**Dependencies:** Task 1

---

### Task 3: Database Migration - RLS Policies
**Status:** Completed (included in Task 1 migration)
**Completed:** 2024-12-30

**Deliverables:**
- [x] RLS enabled on all achievement tables
- [x] Public read for `achievement_definitions`
- [x] Friend visibility for `player_achievements` (via friendships table)
- [x] Competition member visibility for `player_achievements` (via competition_players)
- [x] Own data policies for insert/update
- [x] Service role full access policies
- [x] `achievement_progress` private to owner only

**Note:** All RLS policies were included in the main Task 1 migration file.

**Dependencies:** Tasks 1, 2

---

### Task 4: Database Migration - Leaderboard View
**Status:** Completed (included in Task 1 migration)
**Completed:** 2024-12-30

**Deliverables:**
- [x] `achievement_leaderboard` view (aggregates points and achievement counts per player)
- [x] `get_achievement_leaderboard(p_scope, p_user_id, p_competition_id, p_limit)` function
- [x] Scope filtering: 'global', 'friends', 'competition'
- [x] `get_player_achievement_summary()` function for player profile display
- [x] `get_achievements_with_progress()` function for achievements screen

**Note:** Leaderboard view and functions were included in the main Task 1 migration file.

**Dependencies:** Tasks 1, 2, 3

---

### Task 5: Seed Achievement Definitions
**Status:** Completed
**Completed:** 2024-12-30
**Migration File:** `supabase/migrations/20251230000001_seed_achievements.sql`

**Deliverables:**
- [x] 100+ achievement definitions seeded across all categories
- [x] Proper tier/threshold values following spec exactly
- [x] Points and rarity assigned (common=10, uncommon=20, rare=50, epic=100, legendary=250)
- [x] Icons assigned (Material Community Icons)

**Achievement Count by Category:**
- Rounds: 19 achievements (Practice Makes Perfect x6, Competitor x6, Round Veteran x6, First Timer x1)
- Game Types: 18 achievements (Stableford Specialist x4, Stroke Player x4, Match Play Master x4, Team Player x4, Format Explorer x4)
- Scoring: 33 achievements (Birdie Hunter x6, Eagle Eye x5, Albatross Rare x3, Ace x3, Par Machine x5, Stableford Star x4, Low Scorer x6)
- Competitions: 21 achievements (Competition Junkie x6, Champion x5, Podium Finish x4, Organizer x4, First Timer x1)
- Social: 11 achievements (First Friend x1, Social Circle x5, Playing Partners x5)
- Courses: 10 achievements (Course Explorer x5, Home Advantage x5)

**Dependencies:** Task 1

---

### Task 6: Seed Cosmetic Definitions
**Status:** Completed
**Completed:** 2025-12-30
**Migration File:** `supabase/migrations/20251230000002_seed_cosmetics.sql`

**Deliverables:**
- [x] Badge definitions (5): Rookie (100), Rising Star (750), Achiever (1500), Legend (3000), Champion (5000)
- [x] Frame definitions (5): Bronze (250), Silver (1000), Gold (2000), Platinum (4000), Diamond (6000)
- [x] Title definitions (5): Weekend Warrior (500), Course Conqueror (1500), Golf Legend (3000), Hall of Famer (5000), The Greatest (10000)
- [x] Progressive point thresholds with sort_order matching points_required
- [x] Appropriate icons for all cosmetics (Material Community Icons)

**TypeScript Constants Added:**
- [x] `BADGE_STYLES` - Color and icon mappings for badge rendering
- [x] `TITLE_STYLES` - Display text and color mappings for title rendering
- [x] `COSMETIC_POINTS` - Points required for each cosmetic code

**Cosmetic Summary:**
| Type | Code | Points | Icon |
|------|------|--------|------|
| Badge | BADGE_ROOKIE | 100 | medal-outline |
| Badge | BADGE_RISING_STAR | 750 | star-rising |
| Badge | BADGE_ACHIEVER | 1500 | shield-star |
| Badge | BADGE_LEGEND | 3000 | trophy-award |
| Badge | BADGE_CHAMPION | 5000 | crown |
| Frame | FRAME_BRONZE | 250 | hexagon-outline |
| Frame | FRAME_SILVER | 1000 | hexagon-slice-4 |
| Frame | FRAME_GOLD | 2000 | hexagon-slice-6 |
| Frame | FRAME_PLATINUM | 4000 | octagon |
| Frame | FRAME_DIAMOND | 6000 | octagram |
| Title | TITLE_WEEKEND_WARRIOR | 500 | golf |
| Title | TITLE_COURSE_CONQUEROR | 1500 | flag-checkered |
| Title | TITLE_GOLF_LEGEND | 3000 | trophy |
| Title | TITLE_HALL_OF_FAMER | 5000 | star-circle |
| Title | TITLE_THE_GREATEST | 10000 | crown-circle |

**Dependencies:** Task 2

---

## Sprint 2: TypeScript Types

### Task 7: Achievement Type Definitions
**Status:** Completed
**Completed:** 2025-12-30

**Deliverables:**
- [x] `src/types/database/achievement.types.ts`
- [x] All type definitions (AchievementCategory, AchievementRarity, AchievementDefinition, PlayerAchievement, PlayerAchievementWithDefinition, AchievementProgress, AchievementWithProgress, AchievementSummary, RecentAchievement, CategoryProgress, AchievementLeaderboardEntry, AchievementLeaderboardScope)
- [x] Event types for achievement checking (AchievementEventType, AchievementEventData, AchievementCheckEvent, AchievementCheckResult, AchievementProgressUpdate)
- [x] Input types (AwardAchievementInput, UpdateProgressInput)
- [x] Constants (RARITY_POINTS, RARITY_COLORS, CATEGORY_DISPLAY_NAMES, CATEGORY_ICONS)
- [x] Export from src/types/database/index.ts

**Dependencies:** Task 1 (schema reference)

---

### Task 8: Cosmetic Type Definitions
**Status:** Completed
**Completed:** 2025-12-30

**Deliverables:**
- [x] `src/types/database/cosmetic.types.ts` - Full cosmetic type definitions
- [x] All cosmetic types implemented:
  - `CosmeticType` - Union type ('badge' | 'frame' | 'title')
  - `CosmeticDefinition` - Master cosmetic record
  - `PlayerCosmetic` - Player unlock record
  - `PlayerCosmeticWithDefinition` - With joined definition
  - `CosmeticWithStatus` - With unlock/equipped status
  - `EquippedCosmetics` - Badge/frame/title nullable objects
  - `EquippedCosmeticsFlat` - Flattened for API response
  - `PlayerWithCosmetics` - Player with equipped cosmetics
  - `CosmeticsByType` - Grouped by type for display
  - `CosmeticProgress` - Summary of unlock progress
  - `EquipCosmeticInput` / `UnequipCosmeticInput` - Input types
  - `NewlyUnlockedCosmetic` - Result from unlock check
  - `FrameStyle` / `BadgeStyle` / `TitleStyle` - Rendering styles
- [x] Player type updated in `player.types.ts` with equipped_badge_id, equipped_frame_id, equipped_title_id
- [x] Export from `src/types/database/index.ts`
- [x] Constants exported: `COSMETIC_TYPE_DISPLAY_NAMES`, `COSMETIC_TYPE_ICONS`, `FRAME_STYLES`, `BADGE_STYLES`, `TITLE_STYLES`, `COSMETIC_POINTS`

**Dependencies:** Task 2 (schema reference)

---

## Sprint 3: Achievement Calculation Utilities

### Task 9: Achievement Calculation Utilities
**Status:** Completed
**Completed:** 2025-12-30

**Deliverables:**
- [x] `src/utils/achievementCalculations.ts`
- [x] All calculation functions (9 core + 3 helper functions)
- [x] JSDoc documentation
- [x] Export from utils index

**Functions Implemented:**
| Function | Purpose |
|----------|---------|
| `calculateAchievementProgress()` | Calculate progress for multiple achievements |
| `checkThresholdMet()` | Simple threshold comparison |
| `getNextTierAchievement()` | Find next tier achievement |
| `calculateTotalPoints()` | Sum points from earned achievements |
| `groupAchievementsByCategory()` | Group achievements by category |
| `getAchievementProgress()` | Get progress value from map |
| `filterEarnableAchievements()` | Filter out already earned |
| `calculateCompletionPercentage()` | Calculate completion % |
| `checkCosmeticUnlocks()` | Find newly unlockable cosmetics |
| `createProgressMap()` | Helper: Create map from progress records |
| `sortByProgress()` | Helper: Sort by progress descending |
| `getNextAchievementInCategory()` | Helper: Find next closest achievement |

**Types Exported:**
- `AchievementProgressResult` - Result type for progress calculation
- `ProgressMap` - Type for progress value lookup

**Dependencies:** Tasks 7, 8 (types)

---

## Sprint 4: React Query Hooks

### Task 10: Query Keys for Achievements
**Status:** Completed
**Completed:** 2025-12-30

**Deliverables:**
- [x] `achievementKeys` in queryKeys.ts
- [x] `cosmeticKeys` in queryKeys.ts
- [x] All key patterns defined
- [x] Added to `allQueryKeys` array

**Query Keys Added:**

**achievementKeys:**
| Key | Pattern |
|-----|---------|
| `all` | `['achievements']` |
| `definitions()` | `['achievements', 'definitions']` |
| `playerAchievements(playerId)` | `['achievements', 'player', playerId]` |
| `progress(playerId)` | `['achievements', 'progress', playerId]` |
| `summary(playerId)` | `['achievements', 'summary', playerId]` |
| `leaderboard(scope, userId?, competitionId?)` | `['achievements', 'leaderboard', scope, userId, competitionId]` |

**cosmeticKeys:**
| Key | Pattern |
|-----|---------|
| `all` | `['cosmetics']` |
| `definitions()` | `['cosmetics', 'definitions']` |
| `playerCosmetics(playerId)` | `['cosmetics', 'player', playerId]` |
| `equipped(playerId)` | `['cosmetics', 'equipped', playerId]` |

**Dependencies:** None

---

### Task 11: Achievement Query Hooks
**Status:** Completed
**Completed:** 2025-12-31

**Deliverables:**
- [x] `src/hooks/achievements/useAchievements.ts`
- [x] 5 query hooks (useAchievementDefinitions, usePlayerAchievements, useAchievementProgress, useAchievementSummary, useAchievementLeaderboard)
- [x] 2 mutation hooks (useAwardAchievement, useUpdateProgress)
- [x] 3 convenience hooks (useHasAchievement, useAchievementPoints, useAchievementsByCategory)
- [x] Barrel export at `src/hooks/achievements/index.ts`
- [x] Added exports to `src/hooks/index.ts`
- [x] Added achievementKeys and cosmeticKeys to query keys exports

**Hook Details:**

| Hook | Type | Purpose | StaleTime |
|------|------|---------|-----------|
| `useAchievementDefinitions()` | Query | Fetch all achievement definitions | 1 hour |
| `usePlayerAchievements(playerId)` | Query | Fetch player's earned achievements with definitions | 1 min |
| `useAchievementProgress(playerId)` | Query | Fetch player's progress toward achievements | 30 sec |
| `useAchievementSummary(playerId)` | Query | Combined summary with stats, counts, recent | Computed |
| `useAchievementLeaderboard(scope, competitionId?)` | Query | Leaderboard by scope (global/friends/competition) | 1 min |
| `useAwardAchievement()` | Mutation | Award achievement to player | N/A |
| `useUpdateProgress()` | Mutation | Update/increment achievement progress | N/A |
| `useHasAchievement(playerId, code)` | Query | Check if player has specific achievement | Computed |
| `useAchievementPoints(playerId)` | Query | Get player's total achievement points | Computed |
| `useAchievementsByCategory(playerId, category)` | Query | Get achievements filtered by category | Computed |

**Dependencies:** Tasks 7, 10

---

### Task 12: Cosmetic Query Hooks
**Status:** Completed
**Completed:** 2025-12-31

**Deliverables:**
- [x] `src/hooks/cosmetics/useCosmetics.ts`
- [x] 5 query hooks (useCosmeticDefinitions, usePlayerCosmetics, useEquippedCosmetics, useUnlockableCosmetics, useCosmeticsWithStatus)
- [x] 3 mutation hooks (useUnlockCosmetic, useEquipCosmetic, useUnequipCosmetic)
- [x] 3 convenience hooks (useHasCosmetic, useNextUnlockableCosmetic, useCosmeticCounts)
- [x] Barrel export at `src/hooks/cosmetics/index.ts`
- [x] Added exports to `src/hooks/index.ts`

**Hook Details:**

| Hook | Type | Purpose | StaleTime |
|------|------|---------|-----------|
| `useCosmeticDefinitions()` | Query | Fetch all cosmetic definitions | 1 hour |
| `usePlayerCosmetics(playerId)` | Query | Fetch player's unlocked cosmetics with definitions | 5 min |
| `useEquippedCosmetics(playerId)` | Query | Fetch player's equipped badge/frame/title | 1 min |
| `useUnlockableCosmetics(playerId)` | Query | Fetch all cosmetics with unlock status + can_unlock flag | Computed |
| `useCosmeticsWithStatus(playerId)` | Query | All cosmetics grouped by type with unlock/equipped status | Computed |
| `useUnlockCosmetic()` | Mutation | Unlock a cosmetic for a player | N/A |
| `useEquipCosmetic()` | Mutation | Equip a cosmetic (updates player equipped column) | N/A |
| `useUnequipCosmetic()` | Mutation | Unequip a cosmetic (sets column to null) | N/A |
| `useHasCosmetic(playerId, cosmeticId)` | Query | Check if player has unlocked specific cosmetic | Computed |
| `useNextUnlockableCosmetic(playerId)` | Query | Get next cosmetic player can unlock + points needed | Computed |
| `useCosmeticCounts(playerId)` | Query | Get counts of unlocked cosmetics by type | Computed |

**Dependencies:** Tasks 8, 10

---

## Sprint 5: Achievement Checking Service

### Task 13: Achievement Checker Service
**Status:** Completed
**Completed:** 2025-12-31

**Deliverables:**
- [x] `src/services/achievements/achievementChecker.ts`
- [x] `src/services/achievements/index.ts` (barrel export)
- [x] `checkAchievements()` function - main achievement checking logic
- [x] `checkAchievementsBatch()` function - batch processing for multiple events
- [x] Event type handlers for all 16 event types
- [x] Pure function design for testability

**Functions Implemented:**
| Function | Purpose |
|----------|---------|
| `checkAchievements(input)` | Main function - checks achievements for a single event |
| `checkAchievementsBatch(events, input)` | Batch check for multiple events (retroactive calculation) |
| `getRelevantAchievements(eventType, definitions)` | Filters achievements relevant to event type |
| `getProgressIncrement(eventType, eventData, baseCode)` | Calculates increment based on event data |
| `calculateNewProgress(current, increment)` | Simple addition helper |

**Mappings Defined:**
- `EVENT_CATEGORY_MAP` - Maps 16 event types to relevant achievement categories
- `EVENT_ACHIEVEMENT_MAP` - Maps event types to specific base achievement codes

**Event Types Supported:**
- `round_completed` - Round completion events
- `scorecard_submitted` - Scorecard submission with scores
- `competition_joined` - Joining a competition
- `competition_won` - Winning a competition (1st place)
- `competition_podium` - Top 3 finish
- `friend_added` - Adding a friend
- `course_played` - Playing a unique course
- `home_venue_played` - Playing at home venue
- `birdie_recorded`, `eagle_recorded`, `albatross_recorded`, `ace_recorded`, `par_recorded` - Scoring events
- `competition_created` - Creating a competition (organizer)
- `match_play_won` - Winning a match play match
- `stableford_round` - Completing a Stableford round

**Types Exported:**
- `AchievementCheckResult` - Result type with progressUpdates, newlyEarned, cosmeticUnlocks
- `CheckAchievementsInput` - Input type with all required data for checking

**Dependencies:** Tasks 7, 9

---

### Task 14: Achievement Check Hook
**Status:** Completed
**Completed:** 2025-12-31

**Deliverables:**
- [x] `src/hooks/achievements/useCheckAchievements.ts`
- [x] `checkAndAward` function
- [x] Integration with mutations
- [x] Returns new unlocks for toast

**Hooks Created:**
| Hook | Purpose |
|------|---------|
| `useCheckAchievements(playerId)` | Main hook that provides `checkAndAward(eventType, eventData)` function |
| `useCheckMultipleAchievements(playerId)` | Batch processing hook with `checkMultiple(events[])` function |
| `useCheckAchievementForEvent(playerId, eventType)` | Pre-bound hook for specific event types |

**Return Value (`CheckAndAwardResult`):**
```typescript
{
  newAchievements: AchievementDefinition[];  // Newly earned achievements
  newCosmetics: CosmeticDefinition[];        // Newly unlocked cosmetics
  progressUpdates: { achievement_code, new_value, previous_value }[];
  hasNewRewards: boolean;                     // True if any new unlocks
}
```

**Integration Flow:**
1. Fetches current progress via `useAchievementProgress`
2. Fetches definitions via `useAchievementDefinitions`
3. Fetches cosmetics via `useCosmeticDefinitions`
4. Calls `checkAchievements()` from service
5. Batches progress updates via `useUpdateProgress` mutation
6. Awards new achievements via `useAwardAchievement` mutation
7. Unlocks cosmetics via `useUnlockCosmetic` mutation
8. Invalidates relevant caches on success
9. Returns `{newAchievements, newCosmetics}` for toast display

**Types Exported:**
- `CheckAndAwardInput`
- `CheckAndAwardResult`
- `UseCheckAchievementsReturn`

**Dependencies:** Tasks 11, 12, 13

---

## Sprint 6: UI Components - Display

### Task 15: AchievementBadge Component
**Status:** Completed
**Completed:** 2025-12-31

**Deliverables:**
- [x] `src/components/achievements/AchievementBadge.tsx`
- [x] Size variants (sm=32px, md=44px, lg=64px)
- [x] Earned/locked states with lock overlay icon
- [x] Rarity coloring (common=gray, uncommon=green, rare=blue, epic=purple, legendary=gold)
- [x] Glow effect for rare+ earned achievements
- [x] Tooltip modal with name, description, points, rarity pill
- [x] Proper accessibility labels
- [x] Barrel export at `src/components/achievements/index.ts`

**Component Features:**
- Follows TierBadge.tsx pattern for styling
- Uses `useThemeColors()` hook for theme support
- Uses React Native Paper `Icon` component
- Pressable with scale/opacity feedback
- Platform-specific glow effects (iOS shadow, Android elevation)

**Dependencies:** Task 7 (types)

---

### Task 16: AchievementCard Component
**Status:** Completed
**Completed:** 2025-12-31

**Deliverables:**
- [x] `src/components/achievements/AchievementCard.tsx`
- [x] Progress bar display (with rarity-based coloring)
- [x] Earned/locked states (earned shows green border + date, locked shows lock icon overlay)
- [x] Points and rarity pill display
- [x] Horizontal layout: 64px icon on left, content on right
- [x] Touch feedback with Pressable
- [x] Full accessibility support
- [x] Exported in barrel file `src/components/achievements/index.ts`

**Component Features:**
- Follows CompetitionHeaderCard.tsx pattern for styling
- Uses `useThemeColors()` hook for theme support
- Uses React Native Paper `Icon` and `Text` components
- Pressable with opacity/scale feedback
- Progress bar shows percentage fill with rarity color
- Earned cards have success border and subtle green background
- Locked icons have lock overlay badge
- Bottom row displays points and rarity pill

**Dependencies:** Tasks 7, 15

---

### Task 17: AchievementProgress Component
**Status:** Completed
**Completed:** 2025-12-31

**Deliverables:**
- [x] `src/components/achievements/AchievementProgress.tsx`
- [x] Animated fill using React Native Animated API with timing animation
- [x] Label display (optional via showLabel prop)
- [x] Color customization (defaults to theme primary, overridable via color prop)
- [x] Height customization (default 8px)
- [x] Animation toggle (animated prop, default true)
- [x] Proper accessibility (progressbar role with accessibilityValue)
- [x] Barrel export in `src/components/achievements/index.ts`

**Component Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `current` | number | required | Current progress value |
| `total` | number | required | Target value to reach |
| `color` | string | theme.primary | Fill color override |
| `height` | number | 8 | Bar height in pixels |
| `showLabel` | boolean | true | Show 'X/Y' label on right |
| `animated` | boolean | true | Animate fill on mount/changes |
| `testID` | string | - | Test ID for testing |

**Dependencies:** None

---

### Task 18: AchievementToast Component
**Status:** Completed
**Completed:** 2025-12-31

**Deliverables:**
- [x] `src/components/achievements/AchievementToast.tsx`
- [x] Slide animation (spring bounce entrance, timing exit)
- [x] Auto-dismiss (5 seconds)
- [x] Cosmetic unlock display (optional cosmetic prop)
- [x] Action buttons (Dismiss and View All)
- [x] Barrel export in `src/components/achievements/index.ts`

**Component Features:**
- Uses React Native Animated API with spring for bounce effect
- Position absolute at top with safe area padding
- Background uses theme surface with shadow
- Z-index set to toast level for overlay
- Party popper icon header with "Achievement Unlocked!" title
- Achievement icon, name, and points display
- Optional cosmetic unlock row with gift icon
- Full accessibility support (alert role, live region)

**Dependencies:** Task 7

---

## Sprint 7: UI Components - Cosmetics

### Task 19: ProfileFrame Component
**Status:** Completed
**Completed:** 2025-12-31

**Deliverables:**
- [x] `src/components/cosmetics/ProfileFrame.tsx`
- [x] Frame type styling (Bronze, Silver, Gold, Platinum, Diamond)
- [x] Gradient support via expo-linear-gradient
- [x] Size customization
- [x] Glow effects for premium frames (Gold+)
- [x] Default border for no frame equipped
- [x] Proper accessibility labels
- [x] Barrel export at `src/components/cosmetics/index.ts`

**Component Features:**
- Uses `useThemeColors()` hook for theme support
- Platform-specific glow effects (iOS shadow, Android elevation)
- Memoized glow style computation for performance
- LinearGradient for gradient borders on premium frames
- Centered children with proper overflow handling
- React.memo for performance optimization

**Frame Styles:**
| Frame | Border Width | Colors | Effects |
|-------|-------------|--------|---------|
| Bronze | 3px | Amber (#CD7F32 → #B87333) | Gradient |
| Silver | 3px | Gray (#E8E8E8 → #A8A8A8) | Gradient |
| Gold | 4px | Gold (#FFD700 → #FFA500) | Gradient + Glow |
| Platinum | 4px | Cool gray (#E5E4E2 → #C0C0C0) | Gradient + Shimmer flag |
| Diamond | 5px | Multi-color (#B9F2FF → #87CEEB) | Gradient + Animated flag |

**Dependencies:** Task 8

---

### Task 20: CosmeticSelector Component
**Status:** Completed
**Completed:** 2025-12-31

**Deliverables:**
- [x] `src/components/cosmetics/CosmeticSelector.tsx`
- [x] Locked/unlocked/equipped states with distinct visual styling
- [x] Points progress display (shows "X pts" for locked items, "Unlocked" for available)
- [x] Equip/unequip actions (tap unlocked to equip, tap equipped to unequip)
- [x] Horizontal FlatList scroll layout
- [x] Section header with type icon and unlock count
- [x] Barrel export in `src/components/cosmetics/index.ts`

**Component Features:**
- Uses `useThemeColors()` hook for theme support
- `CosmeticSelectorProps` interface with full JSDoc documentation
- Memoized item data computation for performance
- Individual `CosmeticItem` component wrapped in React.memo
- State-based styling: locked (gray/disabled), unlocked (surface/selectable), equipped (primary highlight + checkmark)
- Cosmetic-specific accent colors from BADGE_STYLES, FRAME_STYLES, TITLE_STYLES
- Custom icons per cosmetic type
- Full accessibility support (labels, hints, states)

**Component Props:**
| Prop | Type | Description |
|------|------|-------------|
| `type` | CosmeticType | Type of cosmetic being displayed |
| `cosmetics` | CosmeticDefinition[] | All cosmetic definitions of this type |
| `unlocked` | PlayerCosmetic[] | Player's unlocked cosmetics |
| `equipped` | CosmeticDefinition \| null | Currently equipped cosmetic |
| `totalPoints` | number | Player's total achievement points |
| `onEquip` | (cosmetic) => void | Callback when a cosmetic is equipped |
| `onUnequip` | () => void | Callback when equipped cosmetic is unequipped |
| `testID` | string (optional) | Test ID for testing |

**Dependencies:** Tasks 8, 12

---

## Sprint 8: Achievements Screen

### Task 21: AchievementsScreen
**Status:** Completed
**Completed:** 2025-12-31

**Deliverables:**
- [x] `src/screens/profile/AchievementsScreen.tsx`
- [x] Summary stats section (3 StatCards: Earned, Points, Complete %)
- [x] Category tabs (horizontal scroll: All, Rounds, Scoring, Social, Competitions, Courses)
- [x] Achievement list (FlatList with AchievementCard, sorted by earned then tier)
- [x] Navigation from Profile (MenuItem with trophy icon and points badge)
- [x] Route added to `src/navigation/types.ts` as 'Achievements'
- [x] Screen added to `src/navigation/RootNavigator.tsx`
- [x] Pull to refresh support
- [x] Loading state while fetching
- [x] Empty state for categories with no achievements

**Component Features:**
- Uses `useAchievementSummary` hook for data fetching
- Filters achievements by category with category tabs
- Sorts achievements: earned first (by earned_at desc), then by tier
- Uses existing `AchievementCard` component for list items
- Uses existing `EmptyState` component for empty categories
- Uses `PageHeader` component for consistent header styling
- Full accessibility support (tab roles, labels)

**Navigation Integration:**
- ProfileScreen now shows "Achievements" row in Account section
- Shows badge with total achievement points (e.g., "850")
- Navigates to AchievementsScreen on tap

**Dependencies:** Tasks 11, 15, 16, 17

---

### Task 22: AchievementLeaderboardScreen
**Status:** Completed
**Completed:** 2025-12-31

**Deliverables:**
- [x] `src/screens/profile/AchievementLeaderboardScreen.tsx`
- [x] Scope tabs (Global, Friends, Competition - conditional)
- [x] Leaderboard list with FlatList
- [x] LeaderboardRow component with rank, avatar + ProfileFrame, name, points, achievement count
- [x] Medal icons for top 3 (gold, silver, bronze with colored backgrounds)
- [x] Current user row highlighted with primary color background
- [x] CurrentUserFloatingRank component at bottom when user not visible in list
- [x] Navigation route added to `src/navigation/types.ts` as 'AchievementLeaderboard'
- [x] Screen added to `src/navigation/RootNavigator.tsx`
- [x] Navigation from AchievementsScreen header with podium icon
- [x] Loading and error states
- [x] Empty states for each scope
- [x] Pull-to-refresh support
- [x] Tap to view player profile (navigates to PlayerDetail)

**Component Features:**
- Uses `useAchievementLeaderboard` hook with scope and optional competitionId
- ScopeTabItem component for tab buttons
- LeaderboardRow component displays:
  - Rank number or medal icon for top 3
  - Avatar wrapped in ProfileFrame (supports equipped cosmetic frames)
  - Player name with "(You)" suffix for current user
  - Achievement count
  - Total points with styled display
- Floating rank bar at bottom shows current user rank when scrolled out of view
- Competition scope tab only shows if navigated with competitionId route param

**Dependencies:** Tasks 11, 19

---

## Sprint 9: Integration

### Task 23: Integrate Achievement Checking
**Status:** Completed
**Completed:** 2025-12-31

**Deliverables:**
- [x] Scorecard submit integration (`src/hooks/scorecard/useSubmitScorecard.ts`)
  - Added `useCheckAchievements` and `useAchievementToast` hooks
  - Added `calculateScoreStats()` helper function to calculate birdies/eagles/pars from scorecard scores
  - Extended `SubmitScorecardInput` with `holes`, `gameType`, `courseId`, `isCompetition` fields
  - After successful submit, calls `checkAndAward('scorecard_submitted', eventData)`
  - Shows achievement toasts via `showMultipleToasts()` on unlock
- [x] Friend add integration (`src/hooks/useFriends.ts`)
  - Updated `useAcceptFriendRequest` hook
  - After friend request acceptance, counts accepted friendships
  - Calls `checkAndAward('friend_added', {friend_count})`
  - Shows achievement toasts on unlock
- [x] Competition join integration (`src/screens/competitions/JoinCompetitionScreen.tsx`)
  - Added achievement hooks to JoinCompetitionScreen
  - After successful join, counts player's accepted competition memberships
  - Calls `checkAndAward('competition_joined', {competition_count, competition_id})`
  - Shows achievement toasts on unlock
- [x] Toast context provider (`src/context/AchievementToastContext.tsx`)
  - Created `AchievementToastProvider` component
  - Manages toast queue for sequential display
  - Provides `showAchievementToast()` and `showMultipleToasts()` functions
  - Handles auto-dismiss and "View All" navigation to Achievements screen
  - Exported `useAchievementToast` hook for consuming components
- [x] Global toast display (`App.tsx`)
  - Added `AchievementToastProvider` wrapping the app
  - Created `AchievementToastDisplay` component that renders `AchievementToast` from context
  - Toast appears above all other content with proper z-index

**Dependencies:** Tasks 14, 18

---

### Task 24: Profile Screen Updates
**Status:** Completed
**Completed:** 2025-12-31

**Deliverables:**
- [x] Avatar with equipped frame (ProfileFrame wraps PlayerAvatar in ProfileScreen)
- [x] Equipped badge display (ProfileBadge component next to name)
- [x] Equipped title display (ProfileTitle component below name)
- [x] Achievements navigation row (with badge showing points)
- [x] Customize Profile bottom sheet (CosmeticSelector for badges, frames, titles)
- [x] PlayerDetailScreen updates (equipped cosmetics, achievements summary, View Achievements button)

**New Components Created:**
- `src/components/cosmetics/ProfileBadge.tsx` - Display equipped badge next to name
- `src/components/cosmetics/ProfileTitle.tsx` - Display equipped title below name

**Files Modified:**
- `src/screens/profile/ProfileScreen.tsx` - Added cosmetics hooks, ProfileFrame/Badge/Title, Customize Profile sheet
- `src/screens/social/PlayerDetailScreen.tsx` - Added cosmetics display, achievements summary, navigation
- `src/screens/profile/AchievementsScreen.tsx` - Added support for viewing other players' achievements
- `src/navigation/types.ts` - Updated Achievements route to accept optional playerId
- `src/components/cosmetics/index.ts` - Exported new components

**Dependencies:** Tasks 12, 19, 20, 21

---

## Sprint 10: Retroactive Calculation

### Task 25: Retroactive Achievement Calculation
**Status:** Completed
**Completed:** 2025-12-31
**Migration File:** `supabase/migrations/20251231000000_retroactive_achievements.sql`

**Deliverables:**
- [x] `calculate_retroactive_achievements()` function - Batched processing for performance
- [x] `recalculate_player_achievements()` convenience wrapper for single player
- [x] Progress calculation for all categories:
  - Rounds: ROUND_VETERAN, PRACTICE_MAKES_PERFECT, COMPETITOR
  - Game Types: STABLEFORD_SPECIALIST, STROKE_PLAYER, MATCH_PLAY_MASTER, TEAM_PLAYER, FORMAT_EXPLORER
  - Scoring: BIRDIE_HUNTER, EAGLE_EYE, ALBATROSS_RARE, ACE, PAR_MACHINE (parses JSONB scores)
  - Social: FIRST_FRIEND, SOCIAL_CIRCLE (from friendships table)
  - Competitions: FIRST_TIMER, COMPETITION_JUNKIE, ORGANIZER
  - Courses: COURSE_EXPLORER, HOME_ADVANTAGE
- [x] Achievement awarding - Checks thresholds and inserts player_achievements
- [x] Cosmetic unlocking - Calculates total points and unlocks eligible cosmetics
- [x] One-time migration execution - DO block with formatted result output
- [x] RAISE NOTICE for progress logging throughout processing
- [x] Batching with configurable batch_size (default 50) for large user bases
- [x] Optional p_player_id parameter for single-player recalculation

**Functions Created:**
| Function | Purpose |
|----------|---------|
| `calculate_retroactive_achievements(p_player_id, p_batch_size)` | Main retroactive calculation for all/single player |
| `recalculate_player_achievements(p_player_id)` | Convenience wrapper for single player |

**Dependencies:** Tasks 5, 6, all tables created

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 25
- **Completed:** 25 (100%)
- **In Progress:** 0 (0%)
- **Not Started:** 0 (0%)

### Sprint Progress

| Sprint | Tasks | Status |
|--------|-------|--------|
| Sprint 1: Database Foundation | 1-6 | Complete (6/6) |
| Sprint 2: TypeScript Types | 7-8 | Complete (2/2) |
| Sprint 3: Calculation Utilities | 9 | Complete (1/1) |
| Sprint 4: React Query Hooks | 10-12 | Complete (3/3) |
| Sprint 5: Achievement Checking | 13-14 | Complete (2/2) |
| Sprint 6: UI Components - Display | 15-18 | Complete (4/4) |
| Sprint 7: UI Components - Cosmetics | 19-20 | Complete (2/2) |
| Sprint 8: Achievements Screen | 21-22 | Complete (2/2) |
| Sprint 9: Integration | 23-24 | Complete (2/2) |
| Sprint 10: Retroactive Calculation | 25 | Complete (1/1) |

---

## Critical Files

### New Files to Create
| File | Purpose |
|------|---------|
| `supabase/migrations/2025XXXX_achievements.sql` | Database migration |
| `src/types/database/achievement.types.ts` | Achievement TypeScript types |
| `src/types/database/cosmetic.types.ts` | Cosmetic TypeScript types |
| `src/utils/achievementCalculations.ts` | Pure calculation functions |
| `src/services/achievements/achievementChecker.ts` | Achievement checking service |
| `src/hooks/achievements/useAchievements.ts` | TanStack Query hooks |
| `src/hooks/achievements/useCheckAchievements.ts` | Achievement check integration |
| `src/hooks/cosmetics/useCosmetics.ts` | Cosmetic hooks |
| `src/components/achievements/AchievementBadge.tsx` | Badge display |
| `src/components/achievements/AchievementCard.tsx` | Card with progress |
| `src/components/achievements/AchievementProgress.tsx` | Progress bar |
| `src/components/achievements/AchievementToast.tsx` | Unlock toast |
| `src/components/cosmetics/ProfileFrame.tsx` | Frame around avatar |
| `src/components/cosmetics/CosmeticSelector.tsx` | Equip cosmetics UI |
| `src/screens/profile/AchievementsScreen/index.tsx` | Main achievements screen |
| `src/screens/profile/AchievementLeaderboardScreen/index.tsx` | Leaderboard |
| `src/context/AchievementToastContext.tsx` | Toast state provider |

### Files to Modify
| File | Change |
|------|--------|
| `src/types/database/index.ts` | Export achievement + cosmetic types |
| `src/types/database/player.types.ts` | Add equipped cosmetic fields |
| `src/hooks/queryKeys.ts` | Add achievement + cosmetic keys |
| `src/hooks/index.ts` | Export new hooks |
| `src/utils/index.ts` | Export calculation utils |
| `src/screens/profile/ProfileScreen.tsx` | Add achievements row + cosmetics |
| `src/navigation/RootNavigator.tsx` | Add new screen routes |
| `src/hooks/scorecard/useSubmitScorecard.ts` | Trigger achievement check |
| `src/hooks/useFriends.ts` | Trigger social achievement check |
| `src/screens/social/PlayerDetailScreen.tsx` | Show public achievements |
| `App.tsx` | Add AchievementToastContext provider |

---

## Command Reference

| Command | Use For |
|---------|---------|
| `/db` | Database migrations, RLS, functions, seeds |
| `/refactor` | TypeScript types, utilities, integrations |
| `/hook` | TanStack Query hooks |
| `/component` | UI components |
| `/screen` | Full screen implementations |

---

**Last Updated:** 2025-12-31
**Status:** All tasks complete! Achievement system fully implemented.
**Total Tasks:** 25
