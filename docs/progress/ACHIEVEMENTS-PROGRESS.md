# Achievements System Implementation Plan

**Goal:** Add achievements/rewards system with unlockable cosmetics, leaderboard, and progress tracking across rounds, competitions, scoring, social, and courses
**Status:** Not Started - 0% (0/25 tasks)

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
**Status:** Not Started
**Command:**
```bash
/db "Create migration for achievements system. New tables: (1) achievement_definitions - id UUID PK, code TEXT UNIQUE NOT NULL (e.g., 'ROUND_VETERAN_3'), category TEXT NOT NULL CHECK IN ('rounds', 'game_types', 'scoring', 'competitions', 'social', 'courses', 'match_play', 'streaks', 'milestones'), name TEXT NOT NULL, description TEXT NOT NULL, icon TEXT NOT NULL (Material icon name), tier INTEGER NOT NULL DEFAULT 1 CHECK BETWEEN 1 AND 6, threshold INTEGER NOT NULL (number required to unlock), base_achievement TEXT NULL (parent code for tiers e.g., 'ROUND_VETERAN'), points INTEGER NOT NULL DEFAULT 10, rarity TEXT DEFAULT 'common' CHECK IN ('common', 'uncommon', 'rare', 'epic', 'legendary'), is_hidden BOOLEAN DEFAULT FALSE (secret achievements), created_at TIMESTAMPTZ DEFAULT NOW(). (2) player_achievements - id UUID PK, player_id UUID FK to players ON DELETE CASCADE, achievement_id UUID FK to achievement_definitions, earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), progress INTEGER DEFAULT 0, notified BOOLEAN DEFAULT FALSE, UNIQUE(player_id, achievement_id). (3) achievement_progress - id UUID PK, player_id UUID FK to players ON DELETE CASCADE, achievement_code TEXT NOT NULL (base achievement code), current_value INTEGER NOT NULL DEFAULT 0, last_updated TIMESTAMPTZ DEFAULT NOW(), UNIQUE(player_id, achievement_code). Add indexes on all foreign keys, player_id columns, and earned_at for sorting."
```
**Deliverables:**
- [ ] `supabase/migrations/2025XXXX_achievements.sql`
- [ ] `achievement_definitions` table with constraints
- [ ] `player_achievements` table with unique constraint
- [ ] `achievement_progress` table for tracking
- [ ] Indexes for efficient queries

**Dependencies:** None

---

### Task 2: Database Migration - Cosmetics Tables
**Status:** Not Started
**Command:**
```bash
/db "Add cosmetics tables to achievements migration. New tables: (1) cosmetic_definitions - id UUID PK, code TEXT UNIQUE NOT NULL (e.g., 'BADGE_ROOKIE', 'FRAME_GOLD'), type TEXT NOT NULL CHECK IN ('badge', 'frame', 'title'), name TEXT NOT NULL, description TEXT NULL, icon TEXT NULL, points_required INTEGER NOT NULL, sort_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW(). (2) player_cosmetics - id UUID PK, player_id UUID FK to players ON DELETE CASCADE, cosmetic_id UUID FK to cosmetic_definitions, unlocked_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(player_id, cosmetic_id). Add columns to players table: equipped_badge_id UUID FK to cosmetic_definitions NULL, equipped_frame_id UUID FK to cosmetic_definitions NULL, equipped_title_id UUID FK to cosmetic_definitions NULL. Add indexes on foreign keys."
```
**Deliverables:**
- [ ] `cosmetic_definitions` table
- [ ] `player_cosmetics` table
- [ ] Equipped cosmetic columns on `players` table
- [ ] Foreign key constraints

**Dependencies:** Task 1

---

### Task 3: Database Migration - RLS Policies
**Status:** Not Started
**Command:**
```bash
/db "Add RLS policies for achievements tables. achievement_definitions: enable RLS, policy 'anyone_can_read' SELECT using TRUE (public read). player_achievements: enable RLS, policy 'players_view_own' SELECT using player_id = auth.uid(), policy 'friends_view_public' SELECT using player_id IN (SELECT CASE WHEN requester_id = auth.uid() THEN addressee_id ELSE requester_id END FROM friendships WHERE (requester_id = auth.uid() OR addressee_id = auth.uid()) AND status = 'accepted'), policy 'competition_members_view' SELECT using player_id IN (SELECT player_id FROM competition_players WHERE competition_id IN (SELECT competition_id FROM competition_players WHERE player_id = auth.uid())), policy 'insert_own' INSERT with check player_id = auth.uid(), policy 'update_own' UPDATE using player_id = auth.uid(). achievement_progress: enable RLS, policy 'players_own_progress' ALL using player_id = auth.uid(). cosmetic_definitions: enable RLS, policy 'anyone_can_read' SELECT using TRUE. player_cosmetics: same policies as player_achievements."
```
**Deliverables:**
- [ ] RLS enabled on all tables
- [ ] Public read for definitions
- [ ] Friend/competition visibility for player achievements
- [ ] Own data policies

**Dependencies:** Tasks 1, 2

---

### Task 4: Database Migration - Leaderboard View
**Status:** Not Started
**Command:**
```bash
/db "Create achievement leaderboard view. CREATE VIEW achievement_leaderboard AS SELECT p.id as player_id, p.name, p.photo_url, p.equipped_badge_id, p.equipped_frame_id, p.equipped_title_id, COALESCE(SUM(ad.points), 0) as total_points, COUNT(pa.id) as achievements_earned, MAX(pa.earned_at) as last_achievement_at FROM players p LEFT JOIN player_achievements pa ON p.id = pa.player_id LEFT JOIN achievement_definitions ad ON pa.achievement_id = ad.id GROUP BY p.id, p.name, p.photo_url, p.equipped_badge_id, p.equipped_frame_id, p.equipped_title_id ORDER BY total_points DESC. Create function get_achievement_leaderboard(p_scope TEXT, p_user_id UUID, p_competition_id UUID DEFAULT NULL) RETURNS TABLE that filters by scope ('global', 'friends', 'competition')."
```
**Deliverables:**
- [ ] `achievement_leaderboard` view
- [ ] `get_achievement_leaderboard()` function
- [ ] Scope filtering (global/friends/competition)

**Dependencies:** Tasks 1, 2, 3

---

### Task 5: Seed Achievement Definitions
**Status:** Not Started
**Command:**
```bash
/db "Seed achievement_definitions with 40+ achievements. ROUND MILESTONES: Practice Makes Perfect (1,5,10,25,50,100 practice rounds), Competitor (1,5,10,25,50,100 competition rounds), Round Veteran (1,10,25,50,100,250,500 total rounds). GAME TYPES: Stableford Specialist (1,10,25,50), Stroke Player (1,10,25,50), Match Play Master (1,5,10,25), Team Player (1,5,10,25 team formats), Format Explorer (2,3,4,5 unique game types). SCORING: Birdie Hunter (1,10,25,50,100,250), Eagle Eye (1,5,10,25,50), Albatross Rare (1,3,5), Ace (1,2,3 hole-in-ones), Par Machine (10,50,100,250,500), Stableford Star (30,36,40,45 single-round points), Low Scorer (under 100,90,85,80,75,70 gross). COMPETITIONS: First Timer (1), Competition Junkie (1,3,5,10,20,50), Champion (1,3,5,10,25 wins), Podium Finish (1,5,10,25 top 3), Organizer (1,3,5,10 created). SOCIAL: First Friend (1), Social Circle (5,10,20,30,50), Playing Partners (5,10,25,50,100 unique players). COURSES: Course Explorer (3,5,10,20,50 unique), Home Advantage (5,10,25,50,100 home venue). Points: common=10, uncommon=20, rare=50, epic=100, legendary=250. Rarity based on difficulty."
```
**Deliverables:**
- [ ] 40+ achievement definitions seeded
- [ ] Proper tier/threshold values
- [ ] Points and rarity assigned
- [ ] Icons assigned (Material icons)

**Dependencies:** Task 1

---

### Task 6: Seed Cosmetic Definitions
**Status:** Not Started
**Command:**
```bash
/db "Seed cosmetic_definitions with unlockable rewards. BADGES (points_required): Rookie (100), Rising Star (750), Achiever (1500), Legend (3000), Champion (5000). FRAMES: Bronze (250), Silver (1000), Gold (2000), Platinum (4000), Diamond (6000). TITLES: Weekend Warrior (500), Course Conqueror (1500), Golf Legend (3000), Hall of Famer (5000), The Greatest (10000). Sort_order should match points_required for display. All should have appropriate icons (medal, star, trophy, crown icons)."
```
**Deliverables:**
- [ ] Badge definitions (5)
- [ ] Frame definitions (5)
- [ ] Title definitions (5)
- [ ] Progressive point thresholds

**Dependencies:** Task 2

---

## Sprint 2: TypeScript Types

### Task 7: Achievement Type Definitions
**Status:** Not Started
**Command:**
```bash
/refactor "Create src/types/database/achievement.types.ts with TypeScript types. Types: AchievementCategory = 'rounds' | 'game_types' | 'scoring' | 'competitions' | 'social' | 'courses' | 'match_play' | 'streaks' | 'milestones'. AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'. Interfaces: AchievementDefinition (id, code, category, name, description, icon, tier, threshold, base_achievement nullable, points, rarity, is_hidden). PlayerAchievement (id, player_id, achievement_id, earned_at, progress, notified, achievement?: AchievementDefinition joined). AchievementProgress (id, player_id, achievement_code, current_value, last_updated). AchievementWithProgress extends AchievementDefinition with earned boolean, earned_at nullable, current_progress number, next_tier nullable. AchievementSummary (total_earned, total_available, total_points, recent_achievements array, by_category Record). CheckAchievementEvent type with event_type and data. Export from src/types/database/index.ts."
```
**Deliverables:**
- [ ] `src/types/database/achievement.types.ts`
- [ ] All type definitions
- [ ] Event types for achievement checking
- [ ] Export from index

**Dependencies:** Task 1 (schema reference)

---

### Task 8: Cosmetic Type Definitions
**Status:** Not Started
**Command:**
```bash
/refactor "Create src/types/database/cosmetic.types.ts with TypeScript types. Types: CosmeticType = 'badge' | 'frame' | 'title'. Interfaces: CosmeticDefinition (id, code, type, name, description nullable, icon nullable, points_required, sort_order). PlayerCosmetic (id, player_id, cosmetic_id, unlocked_at, cosmetic?: CosmeticDefinition joined). EquippedCosmetics (badge nullable, frame nullable, title nullable - all CosmeticDefinition or null). PlayerWithCosmetics extends Player with equipped_badge, equipped_frame, equipped_title. Export from src/types/database/index.ts. Update Player type in player.types.ts to add equipped_badge_id, equipped_frame_id, equipped_title_id UUID nullable fields."
```
**Deliverables:**
- [ ] `src/types/database/cosmetic.types.ts`
- [ ] All cosmetic types
- [ ] Player type updated
- [ ] Export from index

**Dependencies:** Task 2 (schema reference)

---

## Sprint 3: Achievement Calculation Utilities

### Task 9: Achievement Calculation Utilities
**Status:** Not Started
**Command:**
```bash
/refactor "Create src/utils/achievementCalculations.ts with pure functions. Functions: (1) calculateAchievementProgress(currentValue, achievements: AchievementDefinition[]) - returns array of {achievement, earned boolean, progress number 0-100}. (2) getNextTierAchievement(baseCode, currentTier, allDefinitions) - returns next tier achievement or null. (3) checkThresholdMet(currentValue, threshold) - simple boolean check. (4) calculateTotalPoints(earnedAchievements: PlayerAchievement[]) - sums points. (5) groupAchievementsByCategory(achievements) - returns Record<AchievementCategory, array>. (6) getAchievementProgress(baseCode, progressMap) - gets current value from progress. (7) filterEarnableAchievements(allDefinitions, earnedIds) - returns definitions not yet earned. (8) calculateCompletionPercentage(earned, total) - returns percentage. (9) checkCosmeticUnlocks(totalPoints, cosmetics: CosmeticDefinition[], unlockedIds) - returns newly unlockable cosmetics. Export from src/utils/index.ts with JSDoc documentation."
```
**Deliverables:**
- [ ] `src/utils/achievementCalculations.ts`
- [ ] All calculation functions
- [ ] JSDoc documentation
- [ ] Export from utils index

**Dependencies:** Tasks 7, 8 (types)

---

## Sprint 4: React Query Hooks

### Task 10: Query Keys for Achievements
**Status:** Not Started
**Command:**
```bash
/refactor "Update src/hooks/queryKeys.ts to add achievement and cosmetic query keys. Add achievementKeys object: all: ['achievements'] as const, definitions: () => [...all, 'definitions'], playerAchievements: (playerId) => [...all, 'player', playerId], progress: (playerId) => [...all, 'progress', playerId], summary: (playerId) => [...all, 'summary', playerId], leaderboard: (scope, userId, competitionId) => [...all, 'leaderboard', scope, userId, competitionId]. Add cosmeticKeys object: all: ['cosmetics'] as const, definitions: () => [...all, 'definitions'], playerCosmetics: (playerId) => [...all, 'player', playerId], equipped: (playerId) => [...all, 'equipped', playerId]. Export both."
```
**Deliverables:**
- [ ] `achievementKeys` in queryKeys.ts
- [ ] `cosmeticKeys` in queryKeys.ts
- [ ] All key patterns defined

**Dependencies:** None

---

### Task 11: Achievement Query Hooks
**Status:** Not Started
**Command:**
```bash
/hook "Create src/hooks/achievements/useAchievements.ts with TanStack Query hooks. Queries: (1) useAchievementDefinitions() - fetches all achievement_definitions ordered by category, tier, staleTime 1 hour. (2) usePlayerAchievements(playerId) - fetches player_achievements with achievement definition join, staleTime 1 min. (3) useAchievementProgress(playerId) - fetches achievement_progress for player, staleTime 30 sec. (4) useAchievementSummary(playerId) - combines definitions + earned + progress to return AchievementSummary with total_earned, total_points, by_category counts, recent achievements (last 5). (5) useAchievementLeaderboard(scope, competitionId optional) - calls get_achievement_leaderboard RPC, staleTime 1 min. Mutations: (6) useAwardAchievement() - inserts player_achievement, invalidates playerAchievements and summary. (7) useUpdateProgress() - upserts achievement_progress, invalidates progress. Create barrel export at src/hooks/achievements/index.ts and add to src/hooks/index.ts."
```
**Deliverables:**
- [ ] `src/hooks/achievements/useAchievements.ts`
- [ ] 5 query hooks
- [ ] 2 mutation hooks
- [ ] Barrel export

**Dependencies:** Tasks 7, 10

---

### Task 12: Cosmetic Query Hooks
**Status:** Not Started
**Command:**
```bash
/hook "Create src/hooks/cosmetics/useCosmetics.ts with TanStack Query hooks. Queries: (1) useCosmeticDefinitions() - fetches all cosmetic_definitions ordered by type, points_required, staleTime 1 hour. (2) usePlayerCosmetics(playerId) - fetches player_cosmetics with definition join, staleTime 5 min. (3) useEquippedCosmetics(playerId) - fetches player row with equipped cosmetic joins, returns EquippedCosmetics, staleTime 1 min. (4) useUnlockableCosmetics(playerId) - combines definitions + unlocked + total points to show what can be unlocked, staleTime 1 min. Mutations: (5) useUnlockCosmetic() - inserts player_cosmetic, invalidates playerCosmetics. (6) useEquipCosmetic() - updates player equipped column, invalidates equipped. (7) useUnequipCosmetic() - sets player equipped column to null, invalidates equipped. Create barrel export at src/hooks/cosmetics/index.ts and add to src/hooks/index.ts."
```
**Deliverables:**
- [ ] `src/hooks/cosmetics/useCosmetics.ts`
- [ ] 4 query hooks
- [ ] 3 mutation hooks
- [ ] Barrel export

**Dependencies:** Tasks 8, 10

---

## Sprint 5: Achievement Checking Service

### Task 13: Achievement Checker Service
**Status:** Not Started
**Command:**
```bash
/refactor "Create src/services/achievements/achievementChecker.ts with core checking logic. Export function checkAchievements(playerId, eventType, eventData, currentProgress, definitions) that: (1) Filters definitions relevant to eventType (map event types to categories). (2) Gets current progress values for relevant base achievements. (3) Calculates new progress values based on eventData. (4) Checks if any thresholds are met. (5) Returns {progressUpdates: array, newlyEarned: AchievementDefinition[], cosmeticUnlocks: CosmeticDefinition[]}. Event types: 'round_completed', 'scorecard_submitted', 'competition_joined', 'competition_won', 'friend_added', 'course_played'. Helper functions: getProgressIncrement(eventType, eventData), getRelevantAchievements(eventType, definitions), calculateNewProgress(current, increment). Keep as pure functions for testability."
```
**Deliverables:**
- [ ] `src/services/achievements/achievementChecker.ts`
- [ ] `checkAchievements()` function
- [ ] Event type handlers
- [ ] Pure function design

**Dependencies:** Tasks 7, 9

---

### Task 14: Achievement Check Hook
**Status:** Not Started
**Command:**
```bash
/hook "Create src/hooks/achievements/useCheckAchievements.ts hook that integrates achievement checking with mutations. Hook takes playerId and returns { checkAndAward: (eventType, eventData) => Promise }. Internally: (1) Fetches current progress via useAchievementProgress. (2) Fetches definitions via useAchievementDefinitions. (3) Calls checkAchievements() from service. (4) Batches progress updates via useUpdateProgress mutation. (5) Awards new achievements via useAwardAchievement mutation. (6) Unlocks cosmetics via useUnlockCosmetic mutation. (7) Returns {newAchievements, newCosmetics} for toast display. Use useMutation with proper error handling. Cache invalidation handled by individual mutations."
```
**Deliverables:**
- [ ] `src/hooks/achievements/useCheckAchievements.ts`
- [ ] `checkAndAward` function
- [ ] Integration with mutations
- [ ] Returns new unlocks for toast

**Dependencies:** Tasks 11, 12, 13

---

## Sprint 6: UI Components - Display

### Task 15: AchievementBadge Component
**Status:** Not Started
**Command:**
```bash
/component "AchievementBadge - Small badge display for achievements. Props: achievement (AchievementDefinition), size ('sm' | 'md' | 'lg' default 'md'), earned (boolean), showTooltip (boolean default false), onPress optional. Layout: Circular/rounded container with icon inside. Size: sm=32px, md=44px, lg=64px. Earned state: full color based on rarity (common=gray, uncommon=green, rare=blue, epic=purple, legendary=gold). Locked state: grayscale with lock overlay icon. Rarity adds subtle glow effect on earned. Press shows tooltip with name/description if showTooltip. Uses Icon from react-native-paper. Follow TierBadge.tsx pattern for styling. Accessibility: accessibilityLabel with achievement name and earned status."
```
**Deliverables:**
- [ ] `src/components/achievements/AchievementBadge.tsx`
- [ ] Size variants
- [ ] Earned/locked states
- [ ] Rarity coloring
- [ ] Tooltip support

**Dependencies:** Task 7 (types)

---

### Task 16: AchievementCard Component
**Status:** Not Started
**Command:**
```bash
/component "AchievementCard - Card display with progress bar. Props: achievement (AchievementWithProgress), onPress optional. Layout: Card with horizontal layout - icon on left (64px), content on right. Content: Name (typography.bodyBold), description (typography.small, textSecondary), progress bar if not earned showing current/threshold, 'Earned: date' if earned, '+X points' and rarity pill at bottom. Progress bar: colored based on rarity, shows percentage filled. Earned card has subtle success border/background. Locked achievements show full progress bar empty. Use Surface from theme for card background. Touch feedback on press. Follow CompetitionHeaderCard.tsx pattern."
```
**Deliverables:**
- [ ] `src/components/achievements/AchievementCard.tsx`
- [ ] Progress bar display
- [ ] Earned/locked states
- [ ] Points and rarity display

**Dependencies:** Tasks 7, 15

---

### Task 17: AchievementProgress Component
**Status:** Not Started
**Command:**
```bash
/component "AchievementProgress - Reusable progress bar for achievements. Props: current (number), total (number), color (string optional), height (number default 8), showLabel (boolean default true), animated (boolean default true). Layout: Horizontal bar with rounded corners. Fill percentage = current/total * 100 capped at 100. Label shows 'X/Y' on right if showLabel. Animated fill uses Animated.View with timing animation on mount and when current changes. Color defaults to theme primary but can be overridden for rarity colors. Track color is theme border/muted. Use React Native Animated API, not Reanimated for simplicity."
```
**Deliverables:**
- [ ] `src/components/achievements/AchievementProgress.tsx`
- [ ] Animated fill
- [ ] Label display
- [ ] Color customization

**Dependencies:** None

---

### Task 18: AchievementToast Component
**Status:** Not Started
**Command:**
```bash
/component "AchievementToast - Celebration toast for achievement unlocks. Props: achievement (AchievementDefinition), cosmetic (CosmeticDefinition optional), visible (boolean), onDismiss (() => void), onViewAll (() => void). Layout: Slide-down toast from top with confetti icon, 'Achievement Unlocked!' title, achievement icon + name, '+X points', optional cosmetic unlock line 'New reward unlocked: Frame Name'. Two buttons: 'Dismiss' and 'View All'. Auto-dismiss after 5 seconds. Entrance animation: slide down + fade in. Exit animation: slide up + fade out. Use Animated API with spring for bounce effect. Position absolute at top with safe area padding. Background uses theme surface with shadow. Z-index high to overlay content."
```
**Deliverables:**
- [ ] `src/components/achievements/AchievementToast.tsx`
- [ ] Slide animation
- [ ] Auto-dismiss
- [ ] Cosmetic unlock display
- [ ] Action buttons

**Dependencies:** Task 7

---

## Sprint 7: UI Components - Cosmetics

### Task 19: ProfileFrame Component
**Status:** Not Started
**Command:**
```bash
/component "ProfileFrame - Display frame around avatar/image. Props: frame (CosmeticDefinition nullable), size (number), children (ReactNode - the avatar/image inside). Layout: Container with frame border around children. If no frame, render children with default border. Frame types: Bronze (amber border, subtle gradient), Silver (gray border, metallic effect), Gold (gold border, glow effect), Platinum (cool gray, shimmer), Diamond (multi-color gradient, animated sparkle optional). Use borderWidth and borderColor primarily. Premium frames use LinearGradient from expo-linear-gradient for gradient borders. Size prop determines overall container size. Ensure children are properly centered and sized."
```
**Deliverables:**
- [ ] `src/components/cosmetics/ProfileFrame.tsx`
- [ ] Frame type styling
- [ ] Gradient support
- [ ] Size customization

**Dependencies:** Task 8

---

### Task 20: CosmeticSelector Component
**Status:** Not Started
**Command:**
```bash
/component "CosmeticSelector - Grid to select and equip cosmetics. Props: type (CosmeticType), cosmetics (CosmeticDefinition[]), unlocked (PlayerCosmetic[]), equipped (CosmeticDefinition nullable), totalPoints (number), onEquip ((cosmetic) => void), onUnequip (() => void). Layout: Section header '{Type}s', horizontal scroll or grid of cosmetic items. Each item: icon/preview, name, points required. States: locked (grayed, shows points needed), unlocked (full color, selectable), equipped (checkmark overlay, primary border). Locked items show 'X more points' needed. Press unlocked to equip, press equipped to unequip. Use FlatList horizontal for scroll. Follow existing selector patterns in codebase."
```
**Deliverables:**
- [ ] `src/components/cosmetics/CosmeticSelector.tsx`
- [ ] Locked/unlocked/equipped states
- [ ] Points progress display
- [ ] Equip/unequip actions

**Dependencies:** Tasks 8, 12

---

## Sprint 8: Achievements Screen

### Task 21: AchievementsScreen
**Status:** Not Started
**Command:**
```bash
/screen "AchievementsScreen - Main achievements screen accessed from Profile. Use React Navigation, add to RootNavigator as 'Achievements'. Layout: (1) Header with back button, 'My Achievements' title. (2) Summary section: 3 StatCards in row - 'X Earned' (count), 'X Points' (total), 'X%' (completion). (3) Category tabs: horizontal scroll tabs for All, Rounds, Scoring, Social, Competitions, Courses. (4) Achievement list: FlatList of AchievementCard components filtered by category, sorted by earned (earned first), then by tier. (5) Empty state if no achievements in category. Use useAchievementSummary hook for data. Add navigation from ProfileScreen with new row 'Achievements' showing point count and chevron. Pull to refresh. Loading state while fetching."
```
**Deliverables:**
- [ ] `src/screens/profile/AchievementsScreen/index.tsx`
- [ ] Summary stats section
- [ ] Category tabs
- [ ] Achievement list
- [ ] Navigation from Profile

**Dependencies:** Tasks 11, 15, 16, 17

---

### Task 22: AchievementLeaderboardScreen
**Status:** Not Started
**Command:**
```bash
/screen "AchievementLeaderboardScreen - Leaderboard for achievement points. Add to RootNavigator as 'AchievementLeaderboard'. Layout: (1) Header with back button, 'Achievement Leaders' title. (2) Scope tabs: Global, Friends, Competition (Competition only shows if navigated from competition context). (3) Leaderboard list: FlatList with rows showing rank, avatar with equipped frame, name, points, achievement count. Top 3 have medal icons (gold/silver/bronze). Current user row highlighted. (4) Current user's rank shown at bottom if not visible in list. Use useAchievementLeaderboard hook with scope parameter. Pass competitionId via route params if applicable. Loading and empty states. Add navigation from AchievementsScreen header with trophy icon."
```
**Deliverables:**
- [ ] `src/screens/profile/AchievementLeaderboardScreen/index.tsx`
- [ ] Scope tabs
- [ ] Leaderboard list with ranks
- [ ] Current user highlight
- [ ] Medal icons for top 3

**Dependencies:** Tasks 11, 19

---

## Sprint 9: Integration

### Task 23: Integrate Achievement Checking
**Status:** Not Started
**Command:**
```bash
/refactor "Integrate achievement checking into existing flows. (1) In src/hooks/scorecard/useSubmitScorecard.ts: after successful submit, call checkAndAward('scorecard_submitted', {scores, roundId, gameType, courseId}). Calculate birdies/eagles/pars from scores and include in data. (2) In src/hooks/useFriends.ts useAcceptFriendRequest: after success, call checkAndAward('friend_added', {friendCount: newCount}). (3) In competition join flow: call checkAndAward('competition_joined', {competitionCount}). (4) Create useAchievementToastContext provider in src/context/AchievementToastContext.tsx to manage toast visibility globally. Wrap app in provider. Hooks call context.showToast(achievement, cosmetic) when unlocks happen. (5) Add AchievementToast component in App.tsx or MainNavigator using context."
```
**Deliverables:**
- [ ] Scorecard submit integration
- [ ] Friend add integration
- [ ] Competition join integration
- [ ] Toast context provider
- [ ] Global toast display

**Dependencies:** Tasks 14, 18

---

### Task 24: Profile Screen Updates
**Status:** Not Started
**Command:**
```bash
/refactor "Update ProfileScreen to show achievements and equipped cosmetics. (1) Add useEquippedCosmetics(userId) hook call. (2) Wrap avatar with ProfileFrame component using equipped frame. (3) Show equipped badge next to name if equipped. (4) Show equipped title below name if equipped. (5) Add 'Achievements' navigation row after 'My Statistics' showing '{X} earned • {Y} points' and chevron. (6) Add 'Customize Profile' row that opens bottom sheet with CosmeticSelector for each type (badges, frames, titles). (7) In PlayerDetailScreen (viewing other players): show their equipped cosmetics and public achievements summary. Add 'View Achievements' button that navigates to their achievements (read-only view)."
```
**Deliverables:**
- [ ] Avatar with equipped frame
- [ ] Equipped badge display
- [ ] Equipped title display
- [ ] Achievements navigation row
- [ ] Customize Profile bottom sheet
- [ ] PlayerDetailScreen updates

**Dependencies:** Tasks 12, 19, 20, 21

---

## Sprint 10: Retroactive Calculation

### Task 25: Retroactive Achievement Calculation
**Status:** Not Started
**Command:**
```bash
/db "Create retroactive achievement calculation migration. Function calculate_retroactive_achievements() that loops through all players and: (1) Counts completed scorecards for round achievements. (2) Parses scorecard scores JSONB to count birdies/eagles/pars/hole-in-ones. (3) Counts accepted friendships for social achievements. (4) Counts competition_players entries for competition achievements. (5) Counts distinct course_ids from rounds for course achievements. (6) Inserts achievement_progress records. (7) Checks thresholds and inserts player_achievements for earned ones. (8) Calculates total points and inserts player_cosmetics for unlocked cosmetics. Run as one-time migration with DO block calling the function. Add RAISE NOTICE for progress logging. Consider batching for performance with large user bases."
```
**Deliverables:**
- [ ] `calculate_retroactive_achievements()` function
- [ ] Progress calculation for all categories
- [ ] Achievement awarding
- [ ] Cosmetic unlocking
- [ ] One-time migration execution

**Dependencies:** Tasks 5, 6, all tables created

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 25
- **Completed:** 0 (0%)
- **In Progress:** 0 (0%)
- **Not Started:** 25 (100%)

### Sprint Progress

| Sprint | Tasks | Status |
|--------|-------|--------|
| Sprint 1: Database Foundation | 1-6 | Not Started |
| Sprint 2: TypeScript Types | 7-8 | Not Started |
| Sprint 3: Calculation Utilities | 9 | Not Started |
| Sprint 4: React Query Hooks | 10-12 | Not Started |
| Sprint 5: Achievement Checking | 13-14 | Not Started |
| Sprint 6: UI Components - Display | 15-18 | Not Started |
| Sprint 7: UI Components - Cosmetics | 19-20 | Not Started |
| Sprint 8: Achievements Screen | 21-22 | Not Started |
| Sprint 9: Integration | 23-24 | Not Started |
| Sprint 10: Retroactive Calculation | 25 | Not Started |

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

**Last Updated:** 2025-12-29
**Next Sprint:** Sprint 1 - Database Foundation
**Estimated Total Tasks:** 25
