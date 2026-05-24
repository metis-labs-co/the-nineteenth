# Round-Photo Entry Points + Removal — Design

**Date:** 2026-05-25
**Branch:** feature/profile-photo-upload (current)
**Status:** Approved, ready for implementation plan

## Goal

Change where round photos are added vs. viewed, and make removal explicit:

- The score-entry **footer camera icon** opens the **Take Photo / Choose from Library
  bottom sheet directly** (quick add, no navigation), with a success toast.
- The **Round Photos album screen** is reached from a **photo icon in the
  `PageHeader` of the Review Scorecard screen** (view + manage).
- Users can **remove their own photos** via an explicit **✕ delete badge** on each of
  their photos in the album (long-press-to-delete is kept as well).
- The album (with add + remove) is reachable from the **View Round screen** by
  **tapping the photo banner**.

## Context

Already built (in the working tree):

- `PhotoSourceMenu` (`src/components/common/PhotoSourceMenu.tsx`) — bottom-sheet with
  Take Photo / Choose from Library rows; emits `onTakePhoto` / `onChooseFromLibrary`.
- `RoundPhotoAlbum` (`src/components/activity/RoundPhotoAlbum.tsx`) — grid + Add tile.
  The Add tile currently opens `PhotoSourceMenu`; the camera/library/permission/upload
  logic is **inline** in this component (`uploadAssets`, `handleTakePhoto`,
  `handleChooseFromLibrary`, `menuVisible`, a local `extFromAsset`). It already supports
  **delete-your-own-photo via long-press** → `confirmDelete(id, storagePath)` →
  `useDeleteRoundPhoto`, gated by `isOwn = photo.uploader_id === user?.id`.
- `RoundPhotoBanner` (`src/components/activity/RoundPhotoBanner.tsx`) — cover-style photo
  display used on View Round. Props `{ roundId, rounded }`. Returns `null` when there are
  no photos. Tapping a photo currently opens an in-component **fullscreen image viewer
  (lightbox)**.
- `RoundDetailsTab` (`src/components/rounds/ViewRound/RoundDetailsTab/index.tsx`, rendered
  by `ViewRoundScreen`) renders `<RoundPhotoBanner roundId={round.id} rounded={false} />`
  plus `<RoundCoverPhotoButton roundId canAdd={canAddPhotos} />`. It already has
  `useNavigation`, `round.id`, and a `canAddPhotos` prop (`= vm.isUserPlaying`).
- `RoundPhotosScreen` (`src/screens/activity/RoundPhotosScreen.tsx`) + route
  `RoundPhotos: { roundId: string; canAdd?: boolean }` — hosts `RoundPhotoAlbum`.
- `ScorecardEntryScreen` footer (`ScorecardFooter`, optional `onAddPhotos` camera
  button) currently passes `onAddPhotos={() => navigation.navigate('RoundPhotos', { roundId })}`.
- `ReviewScorecardScreen` (`src/screens/scoring/ReviewScorecardScreen/index.tsx`)
  renders `<PageHeader title="Scorecard" showBack onBack={handleGoBack} />` at line 317;
  `roundId` is available (`route.params?.roundId || currentRoundId`); `navigation` from props.
- `PageHeader` supports `rightActions?: RightAction[]` where
  `RightAction = { icon, onPress, accessibilityLabel, showBadge?, color? }`.
- `useToast()` (`src/context/ToastContext.tsx`) exposes
  `showSuccessToast(title, message?)` and `showErrorToast(title, message?)`.
- `renderHook` from `@testing-library/react-native` is available (used across the repo).

## Design

### 1. New hook — `useAddRoundPhotos(roundId, options?)`

File: `src/hooks/activity/useAddRoundPhotos.ts`

Extracts the inline add-photo logic from `RoundPhotoAlbum` so it can be triggered from
multiple places (album Add tile, score-entry footer).

- Signature: `useAddRoundPhotos(roundId: string, options?: { onUploaded?: (count: number) => void })`
- Returns: `{ menuVisible: boolean; openMenu: () => void; closeMenu: () => void; handleTakePhoto: () => Promise<void>; handleChooseFromLibrary: () => Promise<void>; uploading: boolean; }`
- Encapsulates:
  - `useUploadRoundPhoto()` + an internal `uploadAssets(assets)` loop (sets `uploading`,
    loops `mutateAsync`, `Alert.alert('Upload failed', …)` on error, clears `uploading` in finally).
  - `handleChooseFromLibrary`: closes menu → `launchImageLibraryAsync({ mediaTypes: 'images', allowsMultipleSelection: true, quality: 0.6 })` → upload on non-cancel.
  - `handleTakePhoto`: closes menu → `requestCameraPermissionsAsync()`; on denial
    `Alert.alert('Camera access needed', …, [Cancel, { text: 'Open Settings', onPress: Linking.openSettings }])` and return; else `launchCameraAsync({ quality: 0.6 })` (no crop) → upload on non-cancel.
  - On a successful batch, calls `options.onUploaded?.(assets.length)`.
- Imports `extFromAsset` from `@/utils/imagePicker` (uses the shared util; does not add a new copy).
- Exported from `src/hooks/activity/index.ts`.

### 2. `RoundPhotoAlbum` — consume the hook

File: `src/components/activity/RoundPhotoAlbum.tsx`

- Replace inline `menuVisible` / `uploadAssets` / `handleTakePhoto` /
  `handleChooseFromLibrary` / local `extFromAsset` with:
  `const { menuVisible, openMenu, closeMenu, handleTakePhoto, handleChooseFromLibrary, uploading } = useAddRoundPhotos(roundId);`
- Add tile `onPress={openMenu}`; tile spinner driven by `uploading`.
- Render `<PhotoSourceMenu visible={menuVisible} onClose={closeMenu} onTakePhoto={handleTakePhoto} onChooseFromLibrary={handleChooseFromLibrary} />`.
- Add-logic change is a DRY refactor. The album keeps its Add tile (so the album screen
  still supports adding).
- **Explicit remove (new):** on each thumbnail where `isOwn` (the current user is the
  uploader), overlay a small ✕ delete badge (top-right corner) with
  `accessibilityLabel="Remove photo"`. Pressing it calls the existing
  `confirmDelete(photo.id, photo.storage_path)` (which shows the Delete/Cancel confirm and
  calls `useDeleteRoundPhoto`). The existing long-press-to-delete on own photos is **kept**.
  The badge is only rendered for own photos (same `isOwn` gate as long-press); deletion is
  further enforced by RLS.

### 3. `ScorecardEntryScreen` — footer opens the sheet

File: `src/screens/scoring/ScorecardEntryScreen/index.tsx`

- `const { showSuccessToast } = useToast();`
- `const photos = useAddRoundPhotos(roundId, { onUploaded: (n) => showSuccessToast(n === 1 ? 'Photo added' : `${n} photos added`) });`
- Footer: `onAddPhotos={photos.openMenu}` (replaces the `navigate('RoundPhotos', …)` wiring).
- Render at screen level: `<PhotoSourceMenu visible={photos.menuVisible} onClose={photos.closeMenu} onTakePhoto={photos.handleTakePhoto} onChooseFromLibrary={photos.handleChooseFromLibrary} />`.
- The `ScorecardFooter` component itself is unchanged (still takes the optional `onAddPhotos`).

### 4. `ReviewScorecardScreen` — album from the header

File: `src/screens/scoring/ReviewScorecardScreen/index.tsx`

- Add a right action to the existing `PageHeader`:
  ```tsx
  <PageHeader
    title="Scorecard"
    showBack
    onBack={handleGoBack}
    rightActions={
      roundId
        ? [{ icon: 'image-multiple', onPress: () => navigation.navigate('RoundPhotos', { roundId }), accessibilityLabel: 'Round photos' }]
        : undefined
    }
  />
  ```
- Shown only when `roundId` is truthy.

### 5. `RoundPhotos` screen / route — unchanged

Still hosts `RoundPhotoAlbum` (which still has its Add tile and now the ✕ remove badge).
Now reached from the Review Scorecard header rather than the score-entry footer.

### 6. `RoundPhotoBanner` — optional tap override

File: `src/components/activity/RoundPhotoBanner.tsx`

- Add an **optional** `onPress?: () => void` prop. When provided, tapping a banner photo
  calls `onPress` instead of opening the in-component fullscreen viewer. When omitted,
  behavior is unchanged (lightbox) — backward compatible.

### 7. `RoundDetailsTab` (View Round) — banner opens the album

File: `src/components/rounds/ViewRound/RoundDetailsTab/index.tsx`

- Pass `onPress` to the banner so tapping it opens the album:
  ```tsx
  <RoundPhotoBanner
    roundId={round.id}
    rounded={false}
    onPress={() => navigation.navigate('RoundPhotos', { roundId: round.id, canAdd: canAddPhotos })}
  />
  ```
- `navigation` (`useNavigation`), `round.id`, and `canAddPhotos` are already in scope here,
  so `ViewRoundScreen` needs no change.
- **Behavior change on View Round:** tapping the banner now opens the album (where add +
  remove live) instead of the fullscreen viewer. The first-photo add path on View Round
  remains the existing `RoundCoverPhotoButton`; the banner only renders once photos exist.

## Data Flow

```
Score entry footer 📷 → photos.openMenu → PhotoSourceMenu
    ├─ Take Photo → useAddRoundPhotos.handleTakePhoto → camera → upload → onUploaded → success toast
    └─ Choose from Library → handleChooseFromLibrary → library(multi) → upload → onUploaded → success toast

Review Scorecard header 🖼 (image-multiple) → navigate('RoundPhotos', { roundId })
    → RoundPhotosScreen → RoundPhotoAlbum (grid + Add tile + ✕ remove on own photos)

View Round photo banner (tap) → navigate('RoundPhotos', { roundId, canAdd })
    → RoundPhotosScreen → RoundPhotoAlbum (grid + Add tile + ✕ remove on own photos)

Remove a photo (album): ✕ badge or long-press on own photo → confirmDelete → useDeleteRoundPhoto
```

## Error / Permission Handling

- Camera permission denied → Alert with Cancel / Open Settings (`Linking.openSettings()`).
- Upload failure → `Alert.alert('Upload failed', …)` (inside the hook; applies to both
  entry points).
- Library needs no permission (system picker).
- Success from the footer → `showSuccessToast`. (Album shows the new photo in its grid via
  query invalidation; no toast needed there.)
- Removal → existing `confirmDelete` confirm dialog (Delete/Cancel) → `useDeleteRoundPhoto`
  (soft delete + best-effort storage removal). Only own photos expose the ✕/long-press;
  RLS enforces ownership server-side.

## Testing

- `src/hooks/activity/useAddRoundPhotos.test.tsx` (renderHook + act; mock
  `expo-image-picker`, `@/hooks/activity` upload mutation, `@/hooks/useAuth`):
  - `openMenu` sets `menuVisible` true; `closeMenu` sets it false;
  - `handleTakePhoto` with permission granted → `launchCameraAsync` + upload + `onUploaded(1)`;
  - permission denied → Alert, no `launchCameraAsync`, no upload;
  - `handleChooseFromLibrary` → `launchImageLibraryAsync` + upload.
- `src/components/activity/RoundPhotoAlbum.test.tsx` — rewrite: mock `useAddRoundPhotos`,
  `useRoundPhotos` (return one photo owned by the user + one not), `useDeleteRoundPhoto`,
  `useAuth`. Assert: Add press calls `openMenu` and `PhotoSourceMenu` renders; the ✕ remove
  badge appears only on the user's own photo and, when pressed (with `Alert.alert` spied to
  invoke the Delete button), calls `useDeleteRoundPhoto`. (Deep camera/library behavior now
  lives in the hook test.)
- `src/components/activity/RoundPhotoBanner.test.tsx` — when `onPress` is provided, tapping
  a photo calls `onPress` and does NOT open the viewer; when omitted, the viewer still opens.
  (Mock `useRoundPhotos` to return photos.)
- `ScorecardEntryScreen`, `ReviewScorecardScreen`, and `RoundDetailsTab` are large, not
  unit-tested; verify wiring via `pnpm type-check` + manual smoke.

## Process Notes (commits)

- `RoundPhotoAlbum.tsx`, `ScorecardEntryScreen/index.tsx`, `ReviewScorecardScreen/index.tsx`
  are all already committed → clean path-scoped commits.
- `src/hooks/activity/index.ts` is still pre-staged WIP, so adding the hook export there
  will fold its pre-existing staged content into that commit — expected/accepted (same as
  prior tasks).
- `RoundPhotoBanner.tsx` and `RoundDetailsTab/index.tsx` are also pre-staged WIP, so editing
  them folds their staged content into those commits — expected/accepted.
- `RoundCoverPhotoButton`'s separate `extFromAsset` copy is out of scope.

## Files Touched

| File | Change |
|------|--------|
| `src/hooks/activity/useAddRoundPhotos.ts` | New hook (extracted add-photo logic) |
| `src/hooks/activity/useAddRoundPhotos.test.tsx` | New hook test |
| `src/hooks/activity/index.ts` | Export the hook |
| `src/components/activity/RoundPhotoAlbum.tsx` | Consume the hook (DRY refactor) + ✕ remove badge on own photos |
| `src/components/activity/RoundPhotoAlbum.test.tsx` | Rewrite: wiring + ✕ remove test |
| `src/screens/scoring/ScorecardEntryScreen/index.tsx` | Footer opens sheet + success toast |
| `src/screens/scoring/ReviewScorecardScreen/index.tsx` | PageHeader photo icon → RoundPhotos |
| `src/components/activity/RoundPhotoBanner.tsx` | Optional `onPress` tap override |
| `src/components/activity/RoundPhotoBanner.test.tsx` | New test for `onPress` override |
| `src/components/rounds/ViewRound/RoundDetailsTab/index.tsx` | Banner `onPress` → RoundPhotos album |

## Out of Scope (YAGNI)

- No change to `PhotoSourceMenu`, `RoundPhotosScreen`, the `RoundPhotos` route, or `ScorecardFooter`.
- No consolidation of `RoundCoverPhotoButton`'s `extFromAsset`; its add path is unchanged.
- Removal stays **own-photos-only** (the existing rule); no participant/organizer override.
- No lightbox/viewer added to the album grid (tapping album thumbnails is unchanged).
- No new screen-level tests for the heavy screens (`ScorecardEntryScreen`,
  `ReviewScorecardScreen`, `RoundDetailsTab`) — type-check + manual smoke.
