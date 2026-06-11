# Compete Screen — Merge Comps & Leagues (Design)

**Date:** 2026-06-11
**Status:** Approved

## Goal

Merge the Competitions and Leagues list screens into a single **Compete** screen with a Comps/Leagues toggle, simplify both views, and rework the Join League flow to support both public search and private invite codes. The freed bottom-tab slot is taken by the existing Activity feed, placed in the center of the bottom nav.

## Navigation Changes

### Bottom tabs

New tab order (all equal-weight; Activity is centered by position only, not a raised/FAB-style button):

| Position | Route | Screen | Label |
|----------|-------|--------|-------|
| 1 | `HomeTab` | `HomeScreen` | Home |
| 2 | `CompeteTab` (new) | `CompeteScreen` (new) | Compete |
| 3 | `ActivityTab` (new) | `ActivityScreen` (existing) | Activity |
| 4 | `CoursesTab` | `CourseListScreen` | Courses |
| 5 | `ProfileTab` | `ProfileScreen` | Profile |

- `CompetitionsTab` and `LeaguesTab` are removed from `TabParamList` (`src/navigation/types.ts`) and `MainTabNavigator.tsx`.
- `NAVIGATION_TABS` in `src/components/layout/BottomNavigation.tsx` is updated accordingly (Compete keeps the trophy icon; Activity gets an activity/feed icon).

### Route updates

- The stack route `Activity` in `RootStackParamList` is removed. Its two call sites — Home `FriendActivitySection` "See all" and Profile `ActivitySection` — navigate to `MainTabs > ActivityTab` instead.
- `ActivityScreen` gains a "tab mode" so it renders without a back button when shown as a tab.
- `RoundActivity` and `RoundPhotos` stay in the root stack unchanged.
- Home screen `CompetitionsTile` navigates to `CompeteTab` instead of `CompetitionsTab`.
- `JoinCompetition` remains in the root stack, reachable via invite links/deep links only — the in-screen Join entry point for comps is dropped.

## CompeteScreen

New screen at `src/screens/compete/CompeteScreen.tsx`, hosting:

1. **PageHeader** ("Compete").
2. **Comps/Leagues toggle** — `SegmentedButton` from `@/components/common`, two segments, defaulting to Comps on each visit (no persistence).
3. Mode content (below).

Welcome modals: keep the existing `useScreenWelcome` behaviour per mode — comps welcome on first visit, leagues welcome the first time the Leagues mode is opened.

### Comps mode

- **Create** and **AI Create** feature buttons (existing components/behaviour, including feature locks). No Join button.
- Compact competition **limit indicator** row under the create buttons.
- Sectioned list following the Rounds pattern (`SectionHeader`, empty sections hidden):
  - **Active** — started and not finished.
  - **Upcoming** — start date in the future, not started.
  - **Completed** — finished competitions.
- Data: merged *my* + *joined* competitions (deduped), derived from the existing `useCompetitionsList` data; the hook is extended/simplified to return the three groups instead of tab + status-filter state.
- Removed: the My Comps/Joined tab bar (`CompetitionTabBar`) and Active/Completed filter pills (`CompetitionFilterBar`).

### Leagues mode

- **Create League** and **Join League** buttons side by side, both feature-locked as today. Join navigates to `JoinLeague`.
- The user's leagues list (current "My Leagues" tab content): `LeagueCard` items, swipe/delete with confirmation, league limit indicator.
- The Browse tab is removed from this screen; public league search moves to the Join screen.

## JoinLeagueScreen (reworked)

`src/screens/leagues/JoinLeagueScreen.tsx` gains a **Public/Private** segmented toggle, defaulting to **Public**:

- **Public:** `SearchBar` with debounced query feeding `usePublicLeagues`; results rendered as `LeagueCard`s. Tapping a league shows a join confirmation (`ConfirmationDialog`), joins via `useJoinLeague`, and navigates to `LeagueDetail` on success.
- **Private:** the existing LGE- invite-code form, unchanged.

## Cleanup

- Remove `CompetitionsListScreen.tsx`, `CompetitionTabBar`, `CompetitionFilterBar` (and any now-unused list-content pieces), replacing with Compete components.
- Remove the Browse tab and search UI from `LeagueListScreen` — the screen itself is replaced by the Leagues mode content of `CompeteScreen`; delete the old screen once content components are extracted.
- Update navigation types, deep-link test mappings, and existing tests referencing removed routes/screens.

## Testing

- Unit tests for the active/upcoming/completed grouping logic (date/status edge cases: starts today, ends today, no end date).
- Component tests: CompeteScreen toggle switches mode content; Comps mode hides empty sections; Leagues mode shows Create + Join.
- JoinLeagueScreen: Public mode searches and joins with confirmation; Private mode submits invite code.
- Navigation: tab order, Activity tab renders without back button, Home tile and "See all" call sites navigate correctly.

## Out of Scope

- A raised/FAB-style emphasized center tab (Activity is a normal tab in the center position).
- Persisting the Comps/Leagues toggle selection across sessions.
- Any changes to competition/league creation flows or `JoinCompetitionScreen` itself.
