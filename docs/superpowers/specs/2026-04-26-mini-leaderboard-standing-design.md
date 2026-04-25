# Mini-Leaderboard Standing — Design

**Date:** 2026-04-26
**Owner:** Sam
**Status:** Draft

## Problem

The Details tab on `CompetitionDetailScreen` shows a "Your Current Standing" card via `CurrentStandingSection` (`src/components/competitions/detail/sections/CurrentStandingSection.tsx`). It's gated at `DetailsTab.tsx:106` by `currentStanding && !isOrganizer`, which hides the card for any organizer — even when they are also playing in the competition. As a result, organiser-players see no standing at all.

The card itself is also limited: it shows only the player's position and points, with no surrounding context and no link through to the full leaderboard.

## Goals

1. Show the user's standing whenever they are a player in the competition, regardless of organiser status.
2. Replace the bare position/points readout with a mini-leaderboard giving immediate context (the player above and the player below).
3. When the user is on a team, show an equivalent mini-leaderboard for team standings.
4. Make each sub-section a deep-link into the full Leaderboard tab — switching to the appropriate view (individual or team) and scrolling/highlighting the user's row.

## Non-Goals

- Re-architecting the Leaderboard tab itself.
- Showing the mini-leaderboard for organisers who are not playing — the card stays hidden in that case.
- Adding new server-side queries — the design reuses `useCompetitionLeaderboard` (which already supports `filter: 'individuals' | 'teams'`).
- Knockout competitions — they replace `LeaderboardTab` with `BracketTab`; the mini-leaderboard is suppressed for `competition_type === 'knockout'`.

## Visibility Rules

The mini-leaderboard section renders only when **all** of these are true:
- The current user is in the competition's `players` array.
- `competition.competition_type !== 'knockout'`.
- `miniIndividual` is non-null (i.e. the user has a leaderboard entry — implies at least one round has produced standings for them).

The team sub-section renders only when:
- The user is assigned to a team in the `teams` array, AND
- `miniTeam` is non-null (team standings exist for that team).

## UI Design

A single combined card (layout option B from brainstorming) titled **"Your Standing"**, containing:

- **Individual sub-section**: a compact 3-row leaderboard — the player immediately above, the user (highlighted using the existing `you`-row treatment), the player immediately below. Right-chevron in the sub-section header indicates tap affordance.
- **Divider** (only when team sub-section is shown).
- **Team sub-section**: same 3-row shape, anchored on the user's team. Header reads e.g. `Team — Hawks`. Same chevron affordance.

Each sub-section is its own `Pressable` (not the whole card), so taps route differently:
- Tap individual section → switch to Leaderboard tab on individual view, scroll/highlight the user.
- Tap team section → switch to Leaderboard tab on team view, scroll/highlight the user's team.

Edge cases:
- User is 1st → top row hidden, `you` row first, `below` underneath.
- User is last → `above` shown, `you` row at bottom, no `below`.
- Only user in leaderboard → `you` row alone.
- Same edge handling for team rows.

Visual style follows existing design tokens: `borderRadius.lg` card, `shadows.sm`, `colors.surface` background, `you`-row uses `colors.primaryLighter` background as today's `CurrentStandingSection` does.

## Architecture

### Components

- **New:** `src/components/competitions/detail/sections/MiniLeaderboardSection.tsx`
  - Props: `{ individual: MiniLeaderboardData | null, team: MiniLeaderboardData | null, teamName?: string, onOpenLeaderboard: (view: 'individual' | 'team') => void }`
  - Pure presentational component. No data fetching. No knowledge of navigation.
  - Internal `MiniRow` component for the three-row blocks.
- **Removed:** `src/components/competitions/detail/sections/CurrentStandingSection.tsx` and its export from `index.ts`. The barrel re-export is also dropped.
- **Updated:** `src/components/competitions/detail/DetailsTab.tsx`
  - Drops the old gating (`currentStanding && !isOrganizer`).
  - Renders `MiniLeaderboardSection` when the user-is-a-player precondition holds (passed in as `isPlayer` prop, derived in the screen).
- **Updated:** `src/components/competitions/detail/sections/types.ts`
  - Remove `CurrentStandingSectionProps`. Add `MiniLeaderboardSectionProps` and `MiniLeaderboardData`.

### Data layer

A new pure utility file: `src/utils/miniLeaderboard.ts`

```ts
export interface MiniLeaderboardEntry {
  id: string;        // player or team id
  position: number;
  name: string;
  points: number;
  isCurrent: boolean;
}

export interface MiniLeaderboardData {
  above: MiniLeaderboardEntry | null;
  you:   MiniLeaderboardEntry;
  below: MiniLeaderboardEntry | null;
}

export function getMiniIndividualRows(
  leaderboard: CompetitionLeaderboardEntry[] | undefined,
  userId: string | undefined,
): MiniLeaderboardData | null;

export function getMiniTeamRows(
  teamLeaderboard: CompetitionLeaderboardEntry[] | undefined,
  userTeamId: string | undefined,
): MiniLeaderboardData | null;

export function resolveUserTeamId(
  teams: Team[] | undefined,
  userId: string | undefined,
): string | undefined;
```

Both `getMini*` helpers return `null` when the user/team isn't in the leaderboard. They handle leaderboard sort order (already by position) and edge cases (1st, last, single entry).

### Hook changes

`src/screens/competitions/CompetitionDetailScreen/hooks/useCompetitionDetailData.ts`:

- Add a sibling `useCompetitionLeaderboard(id, { filter: 'teams' })` call for team standings.
- Add `userTeamId` (via `resolveUserTeamId`).
- Add `isPlayer` (derived: `players.some(p => p.id === user?.id)`).
- Replace `currentStanding` with two new derived values:
  - `miniIndividual = getMiniIndividualRows(leaderboard, user?.id)`
  - `miniTeam = getMiniTeamRows(teamLeaderboard, userTeamId)`
- Return shape additions: `{ isPlayer, userTeamId, userTeamName, miniIndividual, miniTeam }`.
- `currentStanding` is removed from the return shape.

### Deep-link plumbing

`CompetitionDetailScreen/index.tsx` lifts two pieces of state up:

1. `leaderboardView: 'individual' | 'team'` — passed to `LeaderboardTab` as a controlled `selectedView` + `onViewChange`.
2. `leaderboardScrollTarget: { kind: 'player' | 'team', id: string } | null` — passed to `LeaderboardTab`. After scrolling, `LeaderboardTab` calls `onScrollHandled()` to clear it.

`LeaderboardTab` becomes "controlled-by-default, uncontrolled-fallback":
- If `selectedView` and `onViewChange` are passed, use them.
- If not passed (existing stories/tests), fall back to internal `useState` so standalone usage is unbroken.
- New props: `scrollTarget?`, `onScrollHandled?`. When `scrollTarget` is set, the underlying list (`StablefordLeaderboard`/`StrokePlayLeaderboard`/`MatchPlayLeaderboard`/`TeamLeaderboardTable`) scrolls to and pulses the matching row, then calls `onScrollHandled`. If the target row isn't in the current list (data race), no-op.

Tap handlers in `CompetitionDetailScreen`:
```ts
const openLeaderboardForPlayer = () => {
  setActiveTab('leaderboard');
  setLeaderboardView('individual');
  setLeaderboardScrollTarget({ kind: 'player', id: user!.id });
};
const openLeaderboardForTeam = () => {
  setActiveTab('leaderboard');
  setLeaderboardView('team');
  setLeaderboardScrollTarget({ kind: 'team', id: userTeamId! });
};
```

### Highlight animation

A short `Animated.timing` pulse on the target row's background colour (from `colors.primaryLighter` → `colors.primary` → back to `colors.primaryLighter`), 800ms total, ease-out, plus `FlatList.scrollToIndex` (or `scrollToItem`). The leaderboard row component (`LeaderboardRow` and `TeamLeaderboardTable`'s row) accepts an optional `highlight: boolean` prop wired up to drive the pulse.

If `scrollToIndex` fails (e.g., list re-rendered under us), `onScrollToIndexFailed` retries once after a frame, then gives up.

## Data Flow

```
CompetitionDetailScreen (screen)
  ├── useCompetitionDetailData()
  │     ├── useCompetitionLeaderboard(id)                     // existing — individuals
  │     ├── useCompetitionLeaderboard(id, {filter:'teams'})   // new — teams
  │     ├── derives isPlayer, userTeamId, userTeamName
  │     └── derives miniIndividual, miniTeam
  ├── activeTab + leaderboardView + leaderboardScrollTarget   // lifted state
  └── renders:
      ├── DetailsTab
      │     └── MiniLeaderboardSection (conditional)
      │           └── onOpenLeaderboard('individual'|'team')
      │                 → set activeTab/leaderboardView/scrollTarget
      └── LeaderboardTab
            ├── selectedView (controlled)
            ├── scrollTarget + onScrollHandled
            └── highlights/scrolls target row
```

## Error Handling

- All leaderboard data is already query-cached and refetched on mount/focus by existing hooks. No new error surfaces.
- If `useCompetitionLeaderboard(id, {filter:'teams'})` errors, the team sub-section silently doesn't render — no error UI in the mini card. The full Leaderboard tab still surfaces its own error state.
- If the user's team can't be resolved (`userTeamId === undefined`), the team sub-section doesn't render. No log, no toast.

## Testing

### Unit tests — `src/utils/__tests__/miniLeaderboard.test.ts`
- `getMiniIndividualRows`: user in middle, user at 1st (no `above`), user at last (no `below`), user not present (returns `null`), single-player leaderboard (returns `{above:null, you, below:null}`).
- `getMiniTeamRows`: same five cases.
- `resolveUserTeamId`: user found, user not on any team, multiple-team safety (defensive — should never happen but returns first match).

### Component tests — `src/components/competitions/detail/sections/MiniLeaderboardSection.test.tsx`
- Renders both sub-sections when both `individual` and `team` data are present.
- Hides team sub-section when `team` is `null`.
- Hides whole section when `individual` is `null` (parent's responsibility, but assert the component handles it gracefully).
- Tapping individual section calls `onOpenLeaderboard('individual')`.
- Tapping team section calls `onOpenLeaderboard('team')`.
- The `you` row carries the highlight `testID` and uses the primary-lighter background.

### Screen tests — extend `CompetitionDetailScreen` test file
- Organizer-who-is-also-a-player sees the mini-leaderboard (regression test for the original bug).
- Organizer-who-isn't-a-player sees no mini-leaderboard.
- Player-who-isn't-organizer sees the mini-leaderboard (preserved behaviour).
- Tapping the team section sets `activeTab` to `'leaderboard'` and `selectedView` to `'team'`.
- Tapping the individual section sets `activeTab` to `'leaderboard'` and `selectedView` to `'individual'`.
- Knockout competitions don't render the mini-leaderboard (no `LeaderboardTab` to deep-link to).

### Storybook
- Add `MiniLeaderboardSection.stories.tsx` with stories: `PlayerOnly`, `PlayerAndTeam`, `UserIsLeader`, `UserIsLast`, `SinglePlayer`.
- Update `DetailsTab.stories.tsx` to drop `currentStanding` and use the new mini-leaderboard props. Replace the existing standing-related stories with equivalents using the new component.

### Manual verification (golden path)
- Run the dev server and a real competition.
- As an organiser-player with two completed rounds, open the competition's Details tab. Confirm the mini-leaderboard renders with the right neighbouring rows.
- Tap the individual sub-section. Confirm the Leaderboard tab opens on individual view with the user's row scrolled into view and visibly pulsed.
- Repeat for the team sub-section. Confirm the team view is selected and the user's team row is highlighted.
- As a player who is 1st, confirm `above` is hidden. As last, confirm `below` is hidden.
- For a competition with no teams, confirm only the individual sub-section renders.
- For an organiser who isn't a player, confirm the section is hidden.
- For a knockout competition, confirm the section is hidden.

## File Touch List

**New:**
- `src/components/competitions/detail/sections/MiniLeaderboardSection.tsx`
- `src/components/competitions/detail/sections/MiniLeaderboardSection.test.tsx`
- `src/components/competitions/detail/sections/MiniLeaderboardSection.stories.tsx`
- `src/utils/miniLeaderboard.ts`
- `src/utils/__tests__/miniLeaderboard.test.ts`

**Modified:**
- `src/components/competitions/detail/sections/index.ts` (drop `CurrentStandingSection`, add `MiniLeaderboardSection`)
- `src/components/competitions/detail/sections/types.ts` (drop `CurrentStandingSectionProps`, add `MiniLeaderboardSectionProps` and `MiniLeaderboardData`)
- `src/components/competitions/detail/DetailsTab.tsx` (replace section + props)
- `src/components/competitions/detail/DetailsTab.stories.tsx` (update to new props)
- `src/components/competitions/detail/DetailsTab.test.tsx` (update assertions)
- `src/screens/competitions/CompetitionDetailScreen/index.tsx` (lift `leaderboardView` + `scrollTarget`, wire tap handlers)
- `src/screens/competitions/CompetitionDetailScreen/hooks/useCompetitionDetailData.ts` (add team leaderboard query, derive `isPlayer`/`userTeamId`/`userTeamName`/`miniIndividual`/`miniTeam`; remove `currentStanding`)
- `src/components/leaderboard/LeaderboardTab.tsx` (controlled-by-default `selectedView`, accept `scrollTarget`/`onScrollHandled`)
- `src/components/leaderboard/LeaderboardRow.tsx` and `TeamLeaderboardTable.tsx` (accept `highlight` prop, render the pulse animation)

**Removed:**
- `src/components/competitions/detail/sections/CurrentStandingSection.tsx`

## Open Questions

None — all clarifying questions resolved during brainstorming.
