# Activity "Played With" Bottom Sheet — Design

**Date:** 2026-06-21
**Status:** Approved (design), pending spec review
**Branch:** `worktree-activity-played-with-sheet`

## Problem

On the activity screen, when viewing a round post, the round card shows a stack of
player avatars at the bottom but they are not interactive. Users want to tap that
avatar stack to see everyone they played with in the round, then click through to
each player's profile.

## Goal

Tapping the footer avatar stack on a round card opens a bottom sheet listing every
player in the round (avatar, name, and that round's score). Tapping a row navigates
to that player's profile. Non-friend gating is handled entirely by the existing
profile screen.

## Scope & Non-Goals

- **In scope:** A new bottom sheet component, making the round card footer avatar
  stack tappable, navigation to player profiles from the sheet.
- **Out of scope / not needed:**
  - No backend changes, no new RPC, no migration — `card.participants` already
    carries everything required.
  - No new friend-gating logic — `PlayerDetailScreen` already hides stats/details
    for non-friends and surfaces an "Add Friend" button. Clicking through reuses it.
  - No inline "Add Friend" button inside the sheet (gating lives on the profile).
  - The headline player name shortcut (tap → their profile) is unchanged.

## Key Decisions (from brainstorming)

1. **Row content:** avatar + name + that round's score + chevron, shown uniformly
   for friends and non-friends. The score is from a shared round, so it is not
   treated as private. Friend gating only applies on the profile screen.
2. **Score format:** match whatever the card already shows (gross / net / points)
   so the sheet is visually consistent with the headline score.
3. **Trigger:** tapping the footer avatar stack opens the sheet. The headline player
   name keeps navigating straight to that player's profile.
4. **Sheet contents:** lists everyone in the round, including the headline player.

## Architecture

### New component: `src/components/activity/RoundPlayersBottomSheet.tsx`

Props:

```ts
interface RoundPlayersBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  participants: FeedParticipant[];   // from card.participants
  scoreField: 'gross' | 'net' | 'points'; // which score the card displays
  onSelectPlayer: (playerId: string) => void;
}
```

- Built on the existing `BottomSheet` from `@/components/common`.
- Content wrapped in `<SystemModalTheme>` (CLAUDE.md requirement for modal/sheet
  surfaces).
- Title: e.g. "Players" (or "Played with").
- Renders one row per participant: `PlayerAvatar` + name + score (formatted per
  `scoreField`, with a graceful dash when the value is null) + chevron.
- Row press: calls `onClose()` then `onSelectPlayer(player_id)`.
- Theming via `useThemeColors()`, static tokens imported directly.

### Change: `src/components/activity/ActivityRoundCard.tsx`

- Add local state `const [playersSheetVisible, setPlayersSheetVisible] = useState(false)`.
- Wrap the existing footer avatar stack (≈ lines 268–301) in a `TouchableOpacity`
  (`onPress={() => setPlayersSheetVisible(true)}`) that is independent of the card's
  `onOpen` press target, so tapping avatars opens the sheet while tapping the card
  body still opens the post.
- Determine `scoreField` from the same logic the card uses to choose which score to
  display for the headline (single source of truth — reuse existing derivation, do
  not duplicate it).
- Render `<RoundPlayersBottomSheet>` with `onSelectPlayer={(id) =>
  navigation.navigate('PlayerDetail', { id })}`.
- Guard: if there is only one participant (solo round), keep the stack
  non-interactive and do not open the sheet.

### Data flow

`ActivityRoundCard` already receives `card: ActivityFeedCard` with
`participants: FeedParticipant[]` (`player_id`, `name`, `photo_url`,
`total_gross`, `total_net`, `total_points`). No fetching added.

This component is shared by both the activity feed (`ActivityScreen`) and the round
post detail (`RoundActivityScreen` renders `<ActivityRoundCard card={card} />`), so
the feature works in both places with a single change.

## Error / Edge Handling

- **Solo round (1 participant):** avatars non-interactive, sheet not opened.
- **Missing `photo_url`:** `PlayerAvatar` already renders initials fallback.
- **Null score for a participant:** render a dash ("–") rather than "null"/0.
- **Navigating to self:** allowed; `PlayerDetailScreen` already handles the "self"
  case (shows full profile).

## Testing

- **`RoundPlayersBottomSheet` unit tests:**
  - Renders a row per participant.
  - Shows the correct score field for each `scoreField` value, and a dash for null.
  - Row press calls `onClose` and `onSelectPlayer` with the correct `player_id`.
  - Not visible when `visible={false}`.
- **`ActivityRoundCard`:**
  - Footer avatar stack is pressable and opens the sheet when >1 participant.
  - Stack is not interactive for a solo round.

## Files

- New: `src/components/activity/RoundPlayersBottomSheet.tsx`
- New: `src/components/activity/__tests__/RoundPlayersBottomSheet.test.tsx`
- Edit: `src/components/activity/ActivityRoundCard.tsx`
- Edit (if a barrel exists): `src/components/activity/index.ts`
