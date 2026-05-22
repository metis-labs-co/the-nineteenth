# Take a Photo (Camera Capture) for Round Photos — Design

**Date:** 2026-05-22
**Branch:** feature/profile-photo-upload (current)
**Status:** Approved, ready for implementation plan

## Goal

Let users take a photo with the camera (not only pick from the library) when
adding photos to a round. Tapping "Add" in the shared round photo album offers
a choice: **Take Photo** or **Choose from Library**.

## Context

The round-photos feature already exists (in the working tree):

- `RoundPhotoAlbum` (`src/components/activity/RoundPhotoAlbum.tsx`) — grid +
  an "Add" tile that currently launches the multi-select **library** picker
  directly (`ImagePicker.launchImageLibraryAsync`, `quality: 0.6`), then uploads
  each asset via `useUploadRoundPhoto`. It also has a local `extFromAsset`
  helper and an `uploading` state. This component is **uncommitted/staged**
  work-in-progress on the current branch, and it is **shared** — adding camera
  here makes camera available wherever the album renders (the score-entry
  RoundPhotos screen now; ViewRound later).

Camera building blocks already present:

- **Permissions configured in `app.json`:** iOS `NSCameraUsageDescription`,
  Android `CAMERA` permission, and the `expo-image-picker` + `expo-camera`
  plugins with `cameraPermission`. The strings currently all say
  *"…for your profile picture"* — accurate only for the profile flow.
- **UX pattern:** `AvatarSourceMenu` (`src/components/common/AvatarSourceMenu.tsx`)
  is a `BottomSheet`-based action menu with "Take Photo" / "Choose from Library"
  rows used in the profile flow. We mirror its pattern (but do not reuse or
  refactor it — it is profile-specific: title "Profile Photo", avatar/remove
  rows).
- **Helper:** `takePhotoWithCamera()` in `src/utils/imagePicker.ts` exists but
  forces a 1:1 square crop (profile-tuned), so it is **not** reused for round
  photos, which want full-frame capture.

No backend changes required — capture reuses the existing
`useUploadRoundPhoto` path (`round-photos` bucket + `round_photos` table).

## Scope

In scope:
- New `PhotoSourceMenu` common component.
- `RoundPhotoAlbum` "Add" flow gains a Take Photo / Choose from Library choice.
- Broaden `app.json` camera permission strings.

Out of scope (YAGNI):
- `RoundCoverPhotoButton` stays library-only.
- No refactor of `AvatarSourceMenu` or `imagePicker.ts`.
- Library stays multi-select; camera is single-shot (Expo captures one photo
  per `launchCameraAsync`).
- No backend/migration work.

## Design

### 1. New component — `PhotoSourceMenu`

File: `src/components/common/PhotoSourceMenu.tsx`

A focused, generic action sheet built on the existing `BottomSheet`:

- Props: `{ visible: boolean; onClose: () => void; onTakePhoto: () => void; onChooseFromLibrary: () => void; }`
- Two rows: "Take Photo" (icon `camera`) and "Choose from Library" (icon
  `image-multiple`), styled like `AvatarSourceMenu`'s rows (44px+ touch targets,
  `useThemeColors`, accessibility role/label per row).
- `BottomSheet` title e.g. "Add Photo".
- Exported from `src/components/common/index.ts`.
- Does NOT include avatar/remove rows and does NOT replace `AvatarSourceMenu`.

### 2. `RoundPhotoAlbum` changes

File: `src/components/activity/RoundPhotoAlbum.tsx`

- Add `menuVisible` state (default false).
- The "Add" tile's `onPress` opens the menu (`setMenuVisible(true)`) instead of
  launching the library directly.
- Extract the current per-asset upload loop into a local helper
  `uploadAssets(assets: ImagePicker.ImagePickerAsset[])` that sets `uploading`,
  loops calling `uploadPhoto.mutateAsync({...})` (same fields as today:
  `roundId, uri, width, height, ext: extFromAsset(asset), mimeType`), and
  surfaces failures via the existing `Alert.alert('Upload failed', …)`.
- `handleChooseFromLibrary`: close menu → `launchImageLibraryAsync` (multi-select,
  `quality: 0.6`, as today) → if not canceled, `uploadAssets(result.assets)`.
- `handleTakePhoto`: close menu → `requestCameraPermissionsAsync()`; if not
  granted, `Alert.alert('Permission needed', 'Allow camera access to take
  photos.')` and return; else `launchCameraAsync({ quality: 0.6 })` (full-frame,
  no `aspect`); if not canceled, `uploadAssets(result.assets)` (single asset).
- Render `<PhotoSourceMenu visible={menuVisible} onClose={…} onTakePhoto={handleTakePhoto} onChooseFromLibrary={handleChooseFromLibrary} />`.
- Camera launch is inlined here (consistent with how the component already
  inlines the library launch); it does not route through `imagePicker.ts`.

### 3. `app.json` permission strings

Broaden the three camera permission descriptions so they accurately cover round
photos as well as profile pictures, e.g.:

> "Allow The Nineteenth to take photos for your profile and rounds."

Applies to: iOS `NSCameraUsageDescription`, `expo-image-picker` plugin
`cameraPermission`, and `expo-camera` plugin `cameraPermission`.

## Data Flow

```
RoundPhotoAlbum "Add" tile
  └─ open PhotoSourceMenu
       ├─ Take Photo → requestCameraPermissionsAsync
       │                 └─ launchCameraAsync({ quality: 0.6 })  → uploadAssets([asset])
       └─ Choose from Library → launchImageLibraryAsync(multi)   → uploadAssets(assets)
                                                                     └─ useUploadRoundPhoto (round-photos bucket + round_photos row)
```

## Error / Permission Handling

- Camera permission denied → Alert, no-op.
- Library picker needs no permission (system PHPicker / Android Photo Picker).
- Upload failure → existing `Alert.alert('Upload failed', …)` inside
  `uploadAssets`.
- User cancels camera/library → no-op.

## Testing

- `PhotoSourceMenu` (`src/components/common/PhotoSourceMenu.test.tsx`): both rows
  render; `onTakePhoto` and `onChooseFromLibrary` fire on press (mirrors
  `AvatarSourceMenu.test.tsx` — mock `@/context/ThemeContext`, `react-native-paper`,
  and `./BottomSheet`).
- `RoundPhotoAlbum` (`src/components/activity/RoundPhotoAlbum.test.tsx`):
  mocking the activity hooks (`useRoundPhotos` → `[]`, `useUploadRoundPhoto` →
  `{ mutateAsync }`, `useDeleteRoundPhoto`), `useAuth` (a user), and
  `expo-image-picker`:
  - tapping "Add" opens the source menu;
  - "Take Photo" calls `requestCameraPermissionsAsync` + `launchCameraAsync`
    and, on a non-canceled result, calls `uploadPhoto.mutateAsync`;
  - "Choose from Library" calls `launchImageLibraryAsync` and uploads.

## Process Note (commits)

`RoundPhotoAlbum.tsx` is uncommitted staged WIP, so a path-scoped commit of it
will fold the pre-existing staged changes to that one file into the commit (same
behavior seen earlier with the nav files). `app.json`, the new
`PhotoSourceMenu.tsx`/`.test.tsx`, and `src/components/common/index.ts` are
clean (not in the pre-staged batch).

## Files Touched

| File | Change |
|------|--------|
| `src/components/common/PhotoSourceMenu.tsx` | New component |
| `src/components/common/PhotoSourceMenu.test.tsx` | New test |
| `src/components/common/index.ts` | Export `PhotoSourceMenu` |
| `src/components/activity/RoundPhotoAlbum.tsx` | Add source menu + camera capture path |
| `src/components/activity/RoundPhotoAlbum.test.tsx` | New test for menu + camera/library paths |
| `app.json` | Broaden camera permission strings |
