# Add Round Photos from Score Entry — Design

**Date:** 2026-05-22
**Branch:** feature/profile-photo-upload (current)
**Status:** Approved, ready for implementation plan

## Goal

Let a player add photos to a round while scoring it. A camera button in the
score-entry footer opens a dedicated screen where they can add as many photos
as they like and see/manage what's already on the round.

## Context

The round-photos backend and UI are already built (in the current working
tree, not yet released):

- **Storage bucket:** `round-photos`
- **Table:** `round_photos` (soft-delete via `deleted_at`)
- **Hooks** (`src/hooks/activity`): `useRoundPhotos` (list, signed URLs),
  `useUploadRoundPhoto`, `useDeleteRoundPhoto`
- **Component:** `RoundPhotoAlbum` (`src/components/activity/RoundPhotoAlbum.tsx`)
  — grid of thumbnails + a multi-select "Add" tile (one tap selects many) +
  long-press to delete your own photos. Handles its own empty state and
  upload-error Alert.

`RoundPhotoAlbum` is currently exported but **not rendered anywhere** —
`RoundActivityScreen` deliberately keeps photos out of the comment flow
("Photos live on the round itself, not here"). This feature gives the album
its first home.

No backend changes are required.

## Scope

In scope: `ScorecardEntryScreen` (route `Scorecard`, the hole-by-hole entry
screen with `ScorecardFooter`).

Out of scope (YAGNI):

- Other scoring screens (`QuickScoreEntryScreen`, `MatchPlayScorecardScreen`,
  `TeamMatchPlayScoringScreen`) — easy to extend later if it lands well.
- Direct-picker or action-sheet button variants.
- A "take photo with camera now" capture option.
- Any backend / migration work.

## Design

### 1. New screen — `RoundPhotosScreen`

- File: `src/screens/activity/RoundPhotosScreen.tsx` (placed in `activity/`
  for domain cohesion and so `ViewRound` can reuse it later).
- A standard pushed stack screen (default card presentation, **not** a modal)
  — keeps theming simple; the system image picker sheets over it.
- Renders:
  - `PageHeader` (title "Round Photos", `showBack`, `onBack` → `goBack`).
  - `<RoundPhotoAlbum roundId={roundId} canAdd />` inside a `ScrollView`.
- No new loading/error/empty handling needed — `RoundPhotoAlbum` owns all of
  that.

### 2. Footer button — `ScorecardFooter`

File: `src/screens/scoring/ScorecardEntryScreen/components/ScorecardFooter.tsx`

- Add an **optional** prop `onAddPhotos?: () => void`.
- When provided, render a camera icon button (`camera-plus-outline`, to match
  the existing "add photo" iconography in `RoundPhotoAlbum` /
  `RoundCoverPhotoButton`; fixed 56px width, styled like the existing
  `clipboard-list-outline` icon button) between the clipboard icon and the
  "Next Hole" button. Top row becomes `[Previous] [📋] [📷] [Next Hole]`.
- When the prop is omitted, the button is not rendered (keeps any other
  consumer of `ScorecardFooter` unaffected).
- Include `accessibilityRole="button"` and `accessibilityLabel="Add round photos"`.

### 3. Wiring — `ScorecardEntryScreen`

File: `src/screens/scoring/ScorecardEntryScreen/index.tsx`

- Pass to the existing `<ScorecardFooter>`:
  `onAddPhotos={() => navigation.navigate('RoundPhotos', { roundId })}`
  (`roundId` is already destructured from `route.params`).

### 4. Navigation

- Add `RoundPhotos: { roundId: string }` to `RootStackParamList`
  (`src/navigation/types.ts`).
- Register `RoundPhotosScreen` in `RootNavigator` (`src/navigation/RootNavigator.tsx`)
  with a default card presentation and `headerShown: false` (the screen renders
  its own `PageHeader`).

## Data Flow

```
ScorecardEntryScreen
  └─ ScorecardFooter (onAddPhotos)
       └─ navigate('RoundPhotos', { roundId })
            └─ RoundPhotosScreen
                 └─ RoundPhotoAlbum(roundId, canAdd)
                      ├─ useRoundPhotos(roundId)        → list + signed URLs
                      ├─ useUploadRoundPhoto()          → round-photos bucket + round_photos row
                      └─ useDeleteRoundPhoto()          → soft delete + object removal
```

### `canAdd`

Passed as `true`. Reaching this screen from the active scoring flow means the
user is a participant in the round. The `round_photos` RLS policy is the real
authorization gate — a non-member upload fails gracefully via the album's
existing error Alert.

## Footer Layout Note

The footer top row currently holds two flex buttons (`Previous`, `Next Hole`)
and one fixed 56px icon button. Adding a second fixed icon narrows the flex
buttons slightly. Verify on a small screen (e.g. iPhone SE width) that the
"Previous" / "Next Hole" labels don't wrap; if they do, reduce icon button
width or tighten row gap.

## Testing

- Unit test `ScorecardFooter`:
  - renders the camera button and calls `onAddPhotos` on press when the prop
    is provided;
  - does not render the camera button when the prop is omitted.

## Files Touched

| File | Change |
|------|--------|
| `src/screens/activity/RoundPhotosScreen.tsx` | New screen |
| `src/screens/activity/index.ts` | Export new screen |
| `src/screens/scoring/ScorecardEntryScreen/components/ScorecardFooter.tsx` | Optional `onAddPhotos` prop + camera button |
| `src/screens/scoring/ScorecardEntryScreen/index.tsx` | Pass `onAddPhotos` |
| `src/navigation/types.ts` | Add `RoundPhotos` route param |
| `src/navigation/RootNavigator.tsx` | Register screen |
| `ScorecardFooter` test file | Camera button tests |
