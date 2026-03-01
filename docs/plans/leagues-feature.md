# Leagues Feature - Implementation Plan

## Context

Users want to compete with friends internationally - each player plays any course they want, and the app normalizes scores using WHS handicap differentials to generate a fair leaderboard. This replaces the Friends bottom tab (moved to Profile menu) with a new "Leagues" tab.

**Two changes:**
1. Move Friends tab → Profile screen menu
2. New "Leagues" bottom tab (replacing Friends)

**Key decisions made:**
- Scoring: WHS Handicap Differential (lower = better)
- Structure: Ongoing/rolling — hardcoded best 8 of last 20 rounds (mirrors WHS)
- Subscription: Social tier to create, Free can join
- Round length: 18 holes only (validated when tagging)

> **Challenge a Friend** is a separate feature — see [leagues-feature-phase-2.md](leagues-feature-phase-2.md)

---

## Phase 1: Move Friends Tab to Profile Menu ✅

### 1.1 Remove Friends from bottom tabs

**`src/components/layout/BottomNavigation.tsx`**
- Update `NavigationTab['key']` union: remove `'friends'`, add `'leagues'`
- Replace friends entry in `NAVIGATION_TABS` array (lines 76-81) with leagues:
  ```ts
  { key: 'leagues', label: 'Leagues', route: 'LeaguesTab', accessibilityLabel: 'Navigate to leagues' }
  ```
- Replace `IconUsers` import with `IconWorld` (or `IconTournament`) from `@tabler/icons-react-native`
- Update `getTabIcon` switch: replace `case 'friends'` (line 108) with `case 'leagues'`

**`src/navigation/MainTabNavigator.tsx`**
- Replace `FriendsTab` screen with `LeaguesTab` screen (pointing to new `LeagueListScreen`)
- Update `routeToTabKey`: replace `FriendsTab: 'friends'` with `LeaguesTab: 'leagues'`

**`src/navigation/types.ts`**
- Replace `FriendsTab` with `LeaguesTab` in `TabParamList` (line 143)
- Keep `Friends` route in `RootStackParamList` (line 77) — still navigable from Profile

### 1.2 Add Friends to Profile menu

**`src/screens/profile/components/ProfileMenuSection.tsx`**
- Add `onFriends` callback to `ProfileMenuSectionProps`
- Add `MenuItemRow` for "Friends" in Account section, after "Edit Profile" (line 94):
  ```tsx
  <MenuItemRow icon="account-group-outline" title="Friends" onPress={onFriends} testID="menu-friends" />
  ```

**`src/screens/profile/ProfileScreen.tsx`**
- Pass `onFriends={() => navigation.navigate('Friends', { fromProfile: true })}` to `ProfileMenuSection`
- FriendsScreen already handles `fromProfile` param for back button — no changes needed there

---

## Phase 2: Database Schema ✅

Create migration: `supabase/migrations/YYYYMMDD000000_leagues.sql`

### 2.1 Tables

**`leagues`**
```sql
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`league_players`**
```sql
CREATE TABLE league_players (
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('invited', 'accepted', 'declined', 'removed')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (league_id, player_id)
);
```

**`league_rounds`** — links existing scorecards to leagues
```sql
CREATE TABLE league_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  scorecard_id UUID NOT NULL REFERENCES scorecards(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  handicap_differential NUMERIC(4,1) NOT NULL CHECK (handicap_differential BETWEEN -10 AND 80),
  tagged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_scorecard_per_league UNIQUE (league_id, scorecard_id)
);
```

### 2.2 Indexes

```sql
CREATE INDEX idx_league_players_player ON league_players(player_id);
CREATE INDEX idx_league_players_status ON league_players(status);
CREATE INDEX idx_league_rounds_league ON league_rounds(league_id);
CREATE INDEX idx_league_rounds_player ON league_rounds(player_id);
CREATE INDEX idx_league_rounds_scorecard ON league_rounds(scorecard_id);
CREATE INDEX idx_leagues_status ON leagues(status);
CREATE INDEX idx_leagues_invite_code ON leagues(invite_code) WHERE status = 'active';
```

### 2.3 RLS Policies

```sql
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_rounds ENABLE ROW LEVEL SECURITY;

-- LEAGUES
-- Anyone can view leagues they're a member of
CREATE POLICY leagues_select ON leagues FOR SELECT
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM league_players
      WHERE league_id = leagues.id AND player_id = auth.uid() AND status = 'accepted'
    )
  );

-- Authenticated users can create leagues (tier check in app layer)
CREATE POLICY leagues_insert ON leagues FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Only creator can update league settings
CREATE POLICY leagues_update ON leagues FOR UPDATE
  USING (auth.uid() = created_by);

-- LEAGUE_PLAYERS
-- Members can view other members of their leagues
CREATE POLICY league_players_select ON league_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_players lp
      WHERE lp.league_id = league_players.league_id AND lp.player_id = auth.uid() AND lp.status = 'accepted'
    )
    OR EXISTS (
      SELECT 1 FROM leagues WHERE id = league_players.league_id AND created_by = auth.uid()
    )
  );

-- Players can join (insert themselves)
CREATE POLICY league_players_insert ON league_players FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Creator can manage members; players can update their own status (leave)
CREATE POLICY league_players_update ON league_players FOR UPDATE
  USING (
    auth.uid() = player_id
    OR EXISTS (SELECT 1 FROM leagues WHERE id = league_players.league_id AND created_by = auth.uid())
  );

-- LEAGUE_ROUNDS
-- Members can view rounds in their leagues
CREATE POLICY league_rounds_select ON league_rounds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_players
      WHERE league_id = league_rounds.league_id AND player_id = auth.uid() AND status = 'accepted'
    )
  );

-- Players can tag their own rounds
CREATE POLICY league_rounds_insert ON league_rounds FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Players can untag their own rounds
CREATE POLICY league_rounds_delete ON league_rounds FOR DELETE
  USING (auth.uid() = player_id);
```

### 2.4 Triggers

```sql
-- Auto-update updated_at
CREATE TRIGGER update_leagues_updated_at
  BEFORE UPDATE ON leagues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate invite code (new function for leagues, based on competition pattern)
CREATE OR REPLACE FUNCTION generate_league_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := 'LGE-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    WHILE EXISTS (
      SELECT 1 FROM leagues
      WHERE invite_code = NEW.invite_code AND status = 'active'
    ) LOOP
      NEW.invite_code := 'LGE-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leagues_generate_invite_code
  BEFORE INSERT ON leagues
  FOR EACH ROW EXECUTE FUNCTION generate_league_invite_code();
```

### 2.5 League Leaderboard Function

```sql
CREATE OR REPLACE FUNCTION get_league_leaderboard(p_league_id UUID)
RETURNS TABLE (
  player_id UUID,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  rounds_played INTEGER,
  rounds_counting INTEGER,
  avg_differential NUMERIC(4,1),
  best_differential NUMERIC(4,1),
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH player_rounds AS (
    -- Get last 20 rounds per player, ordered by tagged_at DESC
    SELECT
      lr.player_id,
      lr.handicap_differential,
      ROW_NUMBER() OVER (PARTITION BY lr.player_id ORDER BY lr.tagged_at DESC) AS rn
    FROM league_rounds lr
    WHERE lr.league_id = p_league_id
  ),
  windowed AS (
    -- Only keep last 20 (the scoring window)
    SELECT * FROM player_rounds WHERE rn <= 20
  ),
  best_rounds AS (
    -- Take best 8 differentials from the window
    SELECT
      w.player_id,
      w.handicap_differential,
      ROW_NUMBER() OVER (PARTITION BY w.player_id ORDER BY w.handicap_differential ASC) AS best_rn
    FROM windowed w
  ),
  stats AS (
    SELECT
      br.player_id,
      COUNT(*) FILTER (WHERE best_rn <= 8)::INTEGER AS rounds_counting,
      (SELECT COUNT(*)::INTEGER FROM windowed w2 WHERE w2.player_id = br.player_id) AS rounds_played,
      ROUND(AVG(br.handicap_differential) FILTER (WHERE best_rn <= 8), 1) AS avg_differential,
      MIN(br.handicap_differential) AS best_differential
    FROM best_rounds br
    GROUP BY br.player_id
  )
  SELECT
    s.player_id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    s.rounds_played,
    s.rounds_counting,
    s.avg_differential,
    s.best_differential,
    RANK() OVER (ORDER BY s.avg_differential ASC)::INTEGER AS rank
  FROM stats s
  JOIN players p ON p.id = s.player_id
  ORDER BY s.avg_differential ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.6 Subscription Tier Integration

```sql
-- Add columns to tier_limits
ALTER TABLE tier_limits ADD COLUMN max_leagues_owned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tier_limits ADD COLUMN can_create_league BOOLEAN NOT NULL DEFAULT FALSE;

-- Set per-tier values
UPDATE tier_limits SET max_leagues_owned = 0, can_create_league = FALSE WHERE tier = 'free';
UPDATE tier_limits SET max_leagues_owned = 3, can_create_league = TRUE WHERE tier = 'social';
UPDATE tier_limits SET max_leagues_owned = -1, can_create_league = TRUE WHERE tier = 'premium';
UPDATE tier_limits SET max_leagues_owned = -2, can_create_league = TRUE WHERE tier = 'super_admin';
```

### 2.7 Behavioral Rules

- **Player leaves league**: Their tagged rounds are **removed** from `league_rounds`. The `leaveLeague` service must explicitly delete `league_rounds` rows for that player (no CASCADE path exists from `league_players` → `league_rounds`). Clean break.
- **Admin removes player**: Same behavior — `removePlayer` service must explicitly delete the player's `league_rounds` rows before removing from `league_players`.
- **League archived**: Read-only. Leaderboard still visible, no new rounds can be tagged, no new players can join.
- **18-hole validation**: When tagging a round, the service must verify the linked scorecard's JSONB `scores` column contains 18 entries with non-null `strokes`. Reject 9-hole rounds.

---

## Phase 3: TypeScript Types & Query Keys ✅

### 3.1 New types file: `src/types/database/league.types.ts`
- `League`, `LeaguePlayer`, `LeagueRound`, `LeagueLeaderboardEntry`
- Status enums: `LeagueStatus`, `LeaguePlayerStatus`

### 3.2 Query keys: `src/hooks/queryKeys.ts`
- Add `leagueKeys` factory (all, list, detail, leaderboard, players, rounds)

### 3.3 Navigation types: `src/navigation/types.ts`
Add to `RootStackParamList`:
```ts
LeagueDetail: { id: string };
CreateLeague: undefined;
JoinLeague: undefined;
LeagueSettings: { leagueId: string };
TagRoundToLeague: { leagueId: string };
```

### 3.4 Subscription types: `src/types/subscription.types.ts`
- Add `'create_league'` to `FeatureId` union
- Handle `'create_league'` in `useFeatureGate` / `validateFeatureAccess`

---

## Phase 4: League Screens ✅

### 4.1 Screen structure
```
src/screens/leagues/
  LeagueListScreen/
    index.tsx                    -- Tab screen: My Leagues + Joined tabs
    components/LeagueCard.tsx    -- Card showing name, players, your rank
    components/LeagueListEmpty.tsx
  LeagueDetailScreen/
    index.tsx                    -- Leaderboard, my rounds, players, invite
    components/LeagueLeaderboardRow.tsx
    components/LeagueRoundCard.tsx
  CreateLeagueScreen.tsx         -- Name + description only
  JoinLeagueScreen.tsx           -- Invite code input (pattern from JoinCompetitionScreen)
  LeagueSettingsScreen.tsx       -- Admin settings, manage players, archive
  TagRoundToLeagueScreen.tsx     -- Select from eligible scorecards to tag
```

### 4.2 Key screen behaviors

**LeagueListScreen** (follows `CompetitionsListScreen` pattern):
- `PageHeader` with "Leagues" title and "Join" button as `rightContent`
- "Create League" `FeatureLockButton` (gated via `useCheckFeature('create_league')`, show `UpgradePrompt` if blocked)
- FlatList of `LeagueCard` with pull-to-refresh via `RefreshControl`
- `LimitIndicator` showing leagues owned vs limit
- Empty state via `LeagueListEmpty` component

**LeagueDetailScreen**:
- League header (name, description, player count, share invite code)
- **Leaderboard** (primary): ranked by avg differential, shows rounds counting/played
- **My Rounds**: tagged rounds with "Tag Round" button → `TagRoundToLeagueScreen`
- **Players**: member list with admin controls (remove player)
- Admin: "Settings" button → `LeagueSettingsScreen`

**CreateLeagueScreen**:
- Name (required), description (optional)
- Scoring is hardcoded best-8-of-20 — no config UI needed
- Creator auto-added as first player on create

**TagRoundToLeagueScreen**:
- Fetches user's completed scorecards that have a `handicap_differential` and 18 holes scored
- Filters out scorecards already tagged to this league
- FlatList of eligible rounds (course name, date, differential)
- Tap to tag → calls `tagRoundToLeague` → navigates back

**LeagueSettingsScreen** (admin only):
- Edit name/description
- Archive league (with confirmation)
- Player management (remove players)
- Share invite code

---

## Phase 5: API Services & Hooks ✅

### 5.1 Service: `src/services/api/leagues.ts`
- `getLeagues()` — fetch user's leagues (created + joined)
- `getLeague(id)` — single league with player count
- `createLeague(input)` — create + add creator as player
- `joinLeague(inviteCode)` — validate code + join
- `tagRoundToLeague(leagueId, scorecardId)` — validate 18 holes + differential exists, then insert into `league_rounds`
- `untagRound(leagueRoundId)` — remove tagged round
- `getLeagueLeaderboard(leagueId)` — calls `get_league_leaderboard` DB function
- `getEligibleScorecards(leagueId)` — completed 18-hole scorecards with differentials, not already tagged
- `leaveLeague(leagueId)` — player leaves, their rounds removed
- `removePlayer(leagueId, playerId)` — admin removes player + their rounds
- `archiveLeague(leagueId)` — set status to 'archived'

### 5.2 Hooks: `src/hooks/useLeagues.ts`
- Standard React Query pattern: query hooks + mutation hooks
- Invalidation on mutations (league list, detail, leaderboard)
- Follow existing patterns from `useCompetitions.ts`

---

## Phase 6: Scoring Integration ✅

### 6.1 Tag round to league (post-submission prompt)

After scorecard submission in `ReviewScorecardScreen`, in the success `ConfirmationDialog` `onConfirm` handler (before `navigateAfterSubmit`):
- Check if user is a member of any active leagues
- If yes, show a bottom sheet: "Tag this round to a league?" with list of active leagues
- On select, call `tagRoundToLeague` for chosen league(s)
- Then proceed with normal navigation

This is in addition to the `TagRoundToLeagueScreen` for tagging older rounds from the league detail.

### 6.2 Notifications

Add notification type: `league_invitation`

---

## Phase 7: Root Navigator & Polish ✅

- Add all new screens to `RootNavigator.tsx` (flat `Stack.Screen` entries with `headerShown: false`)
- Subscription gating enforcement via `useCheckFeature('create_league')` + `UpgradePrompt`
- Dark mode support (all new components use `useThemeColors()`)
- Accessibility (labels, roles, 44x44px touch targets)

> **Note**: Deep linking is not wired up in production yet (no `linking` prop on `NavigationContainer`). Defer league deep links to when the linking system is implemented app-wide.

---

## Existing Code to Reuse

| Utility | File | Purpose |
|---------|------|---------|
| `calculateScoreDifferential()` | `src/utils/handicapDifferential.ts` | WHS differential formula |
| `calculateGADailyHandicap()` | `src/utils/dailyHandicap.ts` | Course-specific daily HC |
| `generate_invite_code()` | MVP schema migration | Pattern reference (leagues get own `generate_league_invite_code`) |
| `useCheckFeature()` | `src/context/SubscriptionContext` | Subscription gating hook |
| `UpgradePrompt` | `src/components/subscription/` | Upgrade modal component |
| `FeatureLockButton` | `src/components/subscription/` | Tier-gated action button |
| `LimitIndicator` | `src/components/subscription/` | Usage vs limit progress bar |
| `JoinCompetitionScreen` | `src/screens/competitions/` | Join-by-code UI pattern |
| `CompetitionsListScreen` | `src/screens/competitions/` | List screen pattern (tabs, filters, empty states) |
| `CompetitionDetailScreen` | `src/screens/competitions/` | Detail screen pattern |

---

## Verification Plan

1. **Database**: Run `supabase db reset` — verify migration applies cleanly
2. **RLS**: Verify non-members cannot see league data; members can view; only creator can edit
3. **Navigation**: Verify 5 tabs render (Rounds, Comps, Courses, **Leagues**, Profile)
4. **Friends**: Verify Friends accessible from Profile menu with back button working
5. **Create League**: Create league, verify invite code generated with `LGE-` prefix
6. **Join League**: Join via invite code, verify appears in league list
7. **Tag Round**: Tag a completed 18-hole scorecard, verify differential recorded in `league_rounds`
8. **Tag Validation**: Verify 9-hole rounds and scorecards without differentials are rejected
9. **Leaderboard**: With multiple players/rounds, verify ranking by avg best-8-of-20 differential
10. **Leave League**: Player leaves, verify their rounds removed from leaderboard
11. **Archive**: Archive league, verify read-only (no tagging, no joining)
12. **Subscription**: Verify Free user can join but not create leagues; Social shows limit indicator
13. **Dark mode**: Verify all new screens respect theme
