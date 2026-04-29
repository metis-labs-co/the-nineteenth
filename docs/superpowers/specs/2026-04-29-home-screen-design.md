# Home Screen Design

**Date:** 2026-04-29
**Status:** Approved (pending user spec review)
**Owner:** Sam

## Overview

Add a dedicated Home screen as the app's landing experience. Replace the current `RoundsTab` (which currently lands on `RoundListScreen`) with a new `HomeTab` that surfaces the user's most actionable, glanceable, and motivating content in one scrollable feed. The full rounds list moves to a stack-pushed screen reachable from Home and from Profile.

## Goals

- Give returning users a one-tap path back into anything in progress (round, competition, league, pending action).
- Surface high-engagement moments (invites, verifications, league tagging) that are currently scattered across tabs and notifications.
- Provide a glanceable "how am I playing" summary with deeper-screen entry points.
- Keep the screen lean, conditional, and free of empty boxes for new users.

## Non-Goals

- Weather tile (deferred to v2).
- Course-of-the-day, streak tile, subscription upsell, "join with code" input (out of scope for v1).
- Redesign of any downstream screens (`MyStatistics`, `Achievements`, `ViewRound`, etc.) — Home links into them as-is.
- Backend changes. All required data is already in existing tables/queries.

## Navigation Impact

### Tab restructure

```
Before: [Rounds]  [Competitions] [Courses] [Leagues] [Profile]
After:  [Home]    [Competitions] [Courses] [Leagues] [Profile]
```

- `MainTabNavigator.tsx`: rename `RoundsTab` → `HomeTab`, point at `HomeScreen`. `initialRouteName="HomeTab"`.
- `BottomNavigation` component: update the tab definition (icon: `home`, label: "Home", key: `home`).
- `routeToTabKey` map updated: `HomeTab: 'home'`.

### Full rounds list

- `RoundListScreen` is no longer a tab. It becomes a stack-pushed screen reachable via:
  - "View all rounds" link on Home (in/near the active/upcoming rounds area).
  - Profile menu entry "All rounds" (for completeness).
- New `RootStackParamList` entry: `AllRounds: undefined`.

### New routes

- `RootStackParamList` additions:
  - `AllRounds: undefined` — pushes existing `RoundListScreen`.

### Removed routes

- None. `RoundListScreen` is reused as-is.

## Screen Structure

The screen is a `ScrollView` with vertically stacked, conditionally rendered sections. Order is set by urgency × frequency of value.

```
┌─────────────────────────────────────────┐
│ HEADER                                  │
│ "Good morning, Sam"                     │
│ Handicap: 12.4 ↓ 0.2  |  🔔 (badge)     │
├─────────────────────────────────────────┤
│ CREATE ROUND  (large primary CTA)       │
├─────────────────────────────────────────┤
│ ACTIVE ROUND      (if in-progress)      │
├─────────────────────────────────────────┤
│ PENDING ACTIONS   (if any)              │
├─────────────────────────────────────────┤
│ UPCOMING ROUNDS   (if any)              │
├─────────────────────────────────────────┤
│ COMPETITIONS & LEAGUES (if any active)  │
├─────────────────────────────────────────┤
│ STATS HIGHLIGHTS  (if ≥3 rounds played) │
├─────────────────────────────────────────┤
│ ACHIEVEMENT PROGRESS (if in progress)   │
├─────────────────────────────────────────┤
│ LAST ROUND       (if ≥1 completed)      │
├─────────────────────────────────────────┤
│ FRIEND ACTIVITY  (if friends with       │
│                   recent activity)      │
└─────────────────────────────────────────┘
```

### Section specifications

#### 1. Header (always shown)

- Time-based greeting using user's first name: "Good morning/afternoon/evening, {firstName}".
- Compact handicap badge: current handicap value with delta arrow (up/down/flat) vs 30 days ago. Tap → `HandicapHistory`.
- Notifications bell icon with unread badge. Tap → `Notifications`.
- If user has no handicap set: show "—" with "Set handicap" CTA → `EditProfile`.

#### 2. Create Round CTA (always shown)

- Large primary button. Opens existing `CreateRoundBottomSheet`.
- Label: "Create round". Icon: `plus-circle`.
- Min height 56px, full width minus screen padding.

#### 3. Active Round (conditional: ≥1 round with `status='in-progress'` for user)

- Title: "Continue where you left off"
- Card per active round (typically 0–1, occasionally 2):
  - Course name, current hole progress (e.g. "Hole 7 of 18"), date started.
  - Last hole summary if available ("Last hole: par 4, scored 5") — fetched from latest hole score.
  - Two buttons: "Continue scoring" → `Scorecard` route with `roundId, competitionId`; "View round" → `ViewRound` route.
- If multiple, render as a vertical stack (not horizontal scroll — these are urgent).

#### 4. Pending Actions (conditional: ≥1 pending item)

- Title: "Pending"
- List of mixed action items, each a tappable row with icon, label, and small CTA chip.
- Sources (aggregated by new `usePendingActions` hook):
  - **Unaccepted competition invites** — derive from competition_players where `accepted_at` is null and the user is invited.
  - **Scorecards needing verification** — derive from `score_submission_status` rows assigned to the user with status `pending_verification` (or equivalent — exact field name confirmed in plan phase).
  - **Score mismatches** — open `score_mismatch` records involving the user.
  - **Untagged-to-league prompts** — completed rounds in the last 14 days at courses associated with a league the user is in, where the round is not yet tagged. Limit to top 3.
  - **League invites** — pending league invitations.
- Max 5 items shown; "See all" link if more.

#### 5. Upcoming Rounds (conditional: ≥1 round with `status='upcoming'` AND `round_date >= today`)

- Title: "Coming up"
- Compact rows: date (DD/MM), course name, competition name (if applicable), tap → `ViewRound`.
- Max 3; "View all rounds" link → `AllRounds` if more exist.

#### 6. Competitions & Leagues (conditional: ≥1 active)

- Title: "Your competitions & leagues"
- Horizontal scroll of cards (one per active competition or league).
- Each card shows:
  - Type badge (Competition / League)
  - Name
  - User's current standing (rank, points, or differential — depends on type)
  - Mini progress indicator (rounds completed vs total)
  - Tap → `CompetitionDetail` or `LeagueDetail`.

#### 7. Stats Highlights (conditional: user has ≥3 rounds played)

- Title: "Your form"
- Three blocks:
  - **Identity row** — three pill stats side-by-side: handicap, rounds played YTD, scoring average. Tap row → `MyStatistics`.
  - **Recent-form card** — "Last 5 rounds: 84 avg, ↓2 vs handicap" with sparkline if feasible. Tap → `MyStatistics`.
  - **Notable moment card** — one of: course best, best round in last 30 days, biggest delta vs handicap. Surfaces dynamically based on data. Tap → relevant detail (`CourseStatistics` for course best, `MyStatistics` otherwise).
- If <3 rounds played: replaced by single "Play your first round to unlock stats" coach-mark.

#### 8. Achievement Progress (conditional: ≥1 achievement with progress > 0% and < 100%)

- Title: "Closing in"
- Up to 2 achievements, sorted by `progress_percent` descending, showing label and a progress bar.
- Tap → `Achievements`.
- Uses existing achievements system as built; no new achievement logic.

#### 9. Last Round (conditional: ≥1 completed round)

- Title: "Last round"
- Single card: course, date, gross score, net score, points (Stableford if applicable).
- Tap → `ViewRound` for that round.
- If the user already has an Active Round (#3) and no other completed rounds, this section is hidden to avoid redundancy.

#### 10. Friend Activity (conditional: user has ≥1 friend AND ≥1 friend has activity in last 14 days)

- Title: "From your friends"
- Up to 3 rows: friend avatar/name, action ("shot 78 at Royal Melbourne", "unlocked Birdie Hunter", "joined Easter Cup"), relative time.
- Tap row → `FriendProfile`.
- "See all" → `Friends`.

### New-user fallback

If user has zero rounds, zero competitions/leagues, zero friends:
- Header + Create Round CTA shown as normal.
- Single "Get started" card with three quick-action links:
  - "Create your first round" → opens create round bottom sheet
  - "Join a competition" → `JoinCompetition`
  - "Find friends" → `Friends`
- All other sections hidden.

## Data Layer

### Existing hooks (reused as-is)

- `useRounds(userId)` — filtered client-side for `in-progress` and `upcoming` views, or add a status filter param.
- `useCompetitions(userId)` — filtered for active.
- `useLeagues(userId)` — filtered for active.
- `usePlayer(userId)` — handicap.
- `useHandicapHistory(userId)` — handicap delta vs 30 days ago.
- `usePlayerStatistics(userId)` — YTD rounds, scoring average, last 5 average.
- `useAchievements(userId)` — filter for in-progress.
- `useFriends(userId)` — friend list.
- `useNotifications(userId)` — for unread badge count.
- `useScoreMismatch` — feeds into pending actions.

### New hooks

#### `useHomeData(userId)` — `src/hooks/queries/home/useHomeData.ts`

Composes the queries above. Returns a typed object with section-aligned data:

```ts
{
  greeting: { firstName, timeOfDay },
  handicap: { value, delta30d, hasHandicap },
  notifications: { unreadCount },
  activeRounds: Round[],
  pendingActions: PendingAction[],
  upcomingRounds: Round[],
  competitionsAndLeagues: (CompetitionCard | LeagueCard)[],
  stats: { handicap, roundsYtd, avgScore, last5Avg, last5Delta, notable: NotableMoment | null } | null,
  achievementsInProgress: Achievement[],
  lastRound: Round | null,
  friendActivity: FriendActivityItem[],
  isNewUser: boolean,
}
```

Internally calls each hook, derives section visibility flags, returns a single object so `HomeScreen` doesn't manage 10 query states. Each underlying hook is still independently cached/invalidated.

#### `usePendingActions(userId)` — `src/hooks/queries/home/usePendingActions.ts`

Aggregates the five pending sources (competition invites, scorecard verifications, score mismatches, untagged-to-league prompts, league invites) into a unified `PendingAction[]` shape:

```ts
type PendingAction = {
  id: string;
  type: 'competition_invite' | 'scorecard_verify' | 'score_mismatch' | 'tag_to_league' | 'league_invite';
  label: string;          // "Verify scorecard from Sat round"
  subLabel?: string;      // "Royal Melbourne · 27 Apr"
  ctaLabel: string;       // "Verify"
  route: keyof RootStackParamList;
  params: Record<string, unknown>;
  createdAt: string;
};
```

Sorted by `createdAt` descending, capped at 5.

### Render strategy

- `HomeScreen` is a `ScrollView` with `RefreshControl`.
- Each section is a self-contained component that takes its slice of `useHomeData()` output as props.
- Sections render `null` when their data slice is empty/null. No empty wrappers.
- Per-section skeletons during loading — never a single global spinner. The screen skeleton is the header + CTA + 2 placeholder section blocks.
- Pull-to-refresh invalidates all relevant query keys.

## File Structure

```
src/
├── screens/
│   └── home/
│       ├── HomeScreen.tsx
│       ├── components/
│       │   ├── HomeHeader.tsx
│       │   ├── CreateRoundButton.tsx
│       │   ├── ActiveRoundSection.tsx
│       │   ├── PendingActionsSection.tsx
│       │   ├── UpcomingRoundsSection.tsx
│       │   ├── CompetitionsLeaguesSection.tsx
│       │   ├── StatsHighlightsSection.tsx
│       │   ├── AchievementProgressSection.tsx
│       │   ├── LastRoundSection.tsx
│       │   ├── FriendActivitySection.tsx
│       │   ├── NewUserFallback.tsx
│       │   └── HomeSkeleton.tsx
│       ├── hooks/
│       │   └── (any home-specific UI hooks)
│       └── index.ts
├── hooks/
│   └── queries/
│       └── home/
│           ├── useHomeData.ts
│           ├── usePendingActions.ts
│           └── index.ts
└── navigation/
    ├── MainTabNavigator.tsx     (modified)
    └── types.ts                 (modified)
```

## Type Additions

### `src/types/home.ts`

```ts
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export type PendingAction = {
  id: string;
  type: 'competition_invite' | 'scorecard_verify' | 'score_mismatch' | 'tag_to_league' | 'league_invite';
  label: string;
  subLabel?: string;
  ctaLabel: string;
  route: keyof import('@/navigation/types').RootStackParamList;
  params: Record<string, unknown>;
  createdAt: string;
};

export type NotableMoment =
  | { kind: 'course_best'; courseId: string; courseName: string; score: number }
  | { kind: 'best_recent'; score: number; courseName: string; date: string }
  | { kind: 'biggest_delta'; delta: number; courseName: string; date: string };

export type FriendActivityItem = {
  id: string;
  friendId: string;
  friendName: string;
  friendAvatarUrl?: string;
  action: string;            // human-readable description
  navigateTo: { route: keyof import('@/navigation/types').RootStackParamList; params: Record<string, unknown> };
  occurredAt: string;
};
```

### `src/navigation/types.ts` additions

```ts
// In RootStackParamList:
AllRounds: undefined;

// TabParamList:
HomeTab: undefined;          // renamed from RoundsTab
```

## Styling

- Follow project styling rules: `useThemeColors()` for colors, static tokens (`spacing`, `typography`, `borderRadius`, `shadows`) imported directly.
- Each section component owns its own `StyleSheet`.
- Screen padding: `layout.screenPadding`. Section spacing: `spacing.lg` between sections.
- Section headers: `typography.h4`, `colors.textPrimary`, with optional "See all" link in `colors.primary`.
- Cards use `colors.surface` background, `borderRadius.lg`, `shadows.sm`.

## Accessibility

- All tappable cards have `accessibilityRole="button"` and `accessibilityLabel` describing both content and action.
- Section headers use `accessibilityRole="header"`.
- Pending actions list items announce the CTA label as part of the accessible name.
- Color is never the sole signal for handicap delta arrows — include text ("up", "down", "unchanged") in `accessibilityLabel`.

## Performance

- All queries are TanStack Query–backed and cached per existing project conventions.
- `useHomeData` is structured so each underlying query independently caches; navigating away and back hits cache.
- Pull-to-refresh invalidates queries; no manual refetch loop.
- `ScrollView` (not `FlatList`) because sections are heterogeneous and bounded — total section count is small.
- Section components memoized where they take stable props.

## Testing Strategy

- Unit tests for `usePendingActions` aggregation logic (empty, partial, full sources, sort order, cap).
- Unit tests for `useHomeData` derivation flags (new-user detection, conditional visibility booleans).
- Component tests for each section's empty / populated states.
- Snapshot test for `HomeScreen` in: new-user state, full-data state, partial-data state.

## Out of Scope (deferred to v2)

- Weather tile at home club (Open-Meteo integration).
- Course-of-the-day suggestion based on geolocation.
- Streak tile ("4 weeks in a row").
- Subscription upsell card (handled by existing tier-limit prompts).
- "Join with code" inline input.
- Personalised insights or AI-generated coaching prompts.

## Open Questions

None at design time. All decisions captured above.
