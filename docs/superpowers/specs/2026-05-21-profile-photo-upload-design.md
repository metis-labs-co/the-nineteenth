# Profile Photo Upload — Design

**Date:** 2026-05-21
**Status:** Approved (ready for implementation plan)

## Goal

Let a user upload a real profile photo (from camera or photo library) from the
**Profile → Edit Profile** bottom sheet, in addition to the existing 12 preset
"golfer icon" avatars.

## Context / current state

- The Edit Profile sheet (`src/screens/profile/EditProfileScreen.tsx`) already has
  an avatar section. Tapping it opens `AvatarSelectionModal`, which lets the user
  pick one of 12 preset avatars. The selection is held as pending state
  (`pendingAvatarId`) and persisted on **Save** as `photo_url = "avatar:<id>"`.
- `PlayerAvatar` (`src/components/common/PlayerAvatar.tsx`) already renders three
  source types: bundled avatar (`avatar:...`), **remote URL (`https://...` →
  `Avatar.Image`)**, and `null` (default green golfer icon). A real uploaded photo
  stored as a public URL therefore renders everywhere with no consumer changes.
- A proven upload pattern exists in `useUploadRoundPhoto`
  (`src/hooks/activity/mutations.ts`): read the local file as an ArrayBuffer via
  `fetch(uri).arrayBuffer()` and upload to Supabase Storage.
- `expo-image-picker` (~17.0.10) is installed, and **camera + photo-library
  permissions are already configured** in `app.json` (the permission strings even
  reference "your profile picture").
- The only existing storage bucket is `round-photos` (private). No `avatars`
  bucket exists yet.
- Profile mutations live in `src/hooks/auth/useProfileMutations.ts`; `updateProfile`
  maps `photoUrl → players.photo_url`.

## Decisions

- **Entry point:** tapping the avatar opens an action menu — **Take Photo · Choose
  from Library · Choose an Avatar · Remove Photo · Cancel**. ("Choose an Avatar"
  still opens the existing preset grid.)
- **Sources:** camera **and** library (both permissions already configured).
- **Commit timing:** the photo change stays **pending until Save**, consistent
  with how preset selection, the dirty-state tracking, and the discard-changes
  dialog already work.
- **Bucket privacy:** **public** bucket. `PlayerAvatar` already renders public
  URLs directly, so this requires zero changes to the dozens of avatar consumers.
  A private bucket would require signed-URL plumbing at every call site for
  marginal benefit — profile photos are already visible to other players (the
  sheet's own info copy states this).

## Design

### 1. Storage bucket (new migration)

New migration `supabase/migrations/<ts>_avatars_storage.sql` creating a **public**
`avatars` bucket:

- Path convention: `avatars/{user_id}/{uuid}.{ext}`
  - `(storage.foldername(name))[1]` = `user_id`
- `file_size_limit` = 5 MB (`5242880`)
- `allowed_mime_types` = `image/jpeg, image/png, image/webp, image/heic, image/heif`
- RLS on `storage.objects`:
  - **Read:** public (`bucket_id = 'avatars'`).
  - **Insert / Update / Delete:** only within the user's own folder —
    `(storage.foldername(name))[1] = auth.uid()::text`.

Note: the "grant to authenticated/service_role on new tables" rule applies to new
`CREATE TABLE` migrations only; `storage.objects` already has grants, so no extra
grants are needed here.

### 2. Upload hook — `src/hooks/auth/useAvatarUpload.ts`

A mutation mirroring `useUploadRoundPhoto`:

- Input: `{ uri: string; ext: string; mimeType?: string }`.
- Reads the local file as an ArrayBuffer (`fetch(uri).then(r => r.arrayBuffer())`).
- Uploads to `avatars/{userId}/{uuid}.{ext}` (`upsert: false`).
- Returns the **public URL** via `supabase.storage.from('avatars').getPublicUrl(path)`.
- Best-effort deletes the user's previous uploaded object — only when the prior
  `photo_url` points at the `avatars` bucket — to avoid orphaned objects.
- Persistence of `photo_url` itself stays with the existing `updateProfile`; this
  hook only handles the storage upload and returns the URL.

### 3. Action menu — `AvatarSourceMenu` component

A small `BottomSheet`-based menu (reusing `src/components/common/BottomSheet`):

- Options: **Take Photo**, **Choose from Library**, **Choose an Avatar**,
  **Remove Photo**, **Cancel**.
- "Remove Photo" is shown only when a custom uploaded photo is currently set
  (i.e. `photo_url` is a remote URL, not an `avatar:` id or null).
- Camera/library pick via `expo-image-picker` with
  `{ allowsEditing: true, aspect: [1, 1], quality: 0.6 }` (square crop +
  compression — no extra dependencies). Permission-denied path shows an `Alert`,
  matching `RoundPhotoAlbum`.
- Emits callbacks (`onTakePhoto`, `onChooseFromLibrary`, `onChooseAvatar`,
  `onRemovePhoto`) so the screen owns state. (Picker invocation may live in a
  shared helper, e.g. `src/utils/imagePicker.ts`, also reused to share
  `extFromAsset` with `RoundPhotoAlbum`.)

### 4. EditProfileScreen integration

- Tapping the avatar opens `AvatarSourceMenu` instead of jumping straight to the
  preset grid.
- Replace `pendingAvatarId: string | null` with a discriminated union held in
  pending state:

  ```ts
  type PendingAvatar =
    | null                                              // no change
    | { type: 'preset'; avatarId: string }
    | { type: 'photo'; uri: string; ext: string; mimeType?: string }
    | { type: 'remove' };
  ```

- The avatar preview renders from `pendingAvatar ?? player.photo_url`.
- `hasUnsavedChanges` includes `pendingAvatar !== null`.
- On **Save**, `onSubmit` resolves `pendingAvatar` into a `photoUrl`:
  - `preset` → `formatAvatarUrl(avatarId)`
  - `photo` → `useAvatarUpload` → public URL
  - `remove` → `null`
  - `null` → leave `photoUrl` untouched
  - then calls the existing `updateProfile({ ...fields, photoUrl })`.
- Upload failure surfaces via the existing error snackbar and keeps all edits
  intact (sheet stays open).
- "Choose an Avatar" still opens the unchanged `AvatarSelectionModal`.

### Data flow

1. Tap avatar → `AvatarSourceMenu` opens.
2. **Take Photo** → request camera permission → `launchCameraAsync` → set
   `pendingAvatar = { type: 'photo', ... }`.
   **Choose from Library** → `launchImageLibraryAsync` → same.
   **Choose an Avatar** → open `AvatarSelectionModal` → `pendingAvatar = { type: 'preset' }`.
   **Remove Photo** → `pendingAvatar = { type: 'remove' }`.
3. Avatar preview updates from pending state.
4. **Save** → resolve to `photoUrl` (uploading if needed) → `updateProfile` →
   best-effort cleanup of previous uploaded object.

### Error handling

- Permission denied → `Alert` (matches `RoundPhotoAlbum`).
- Upload failure → existing error snackbar; edits preserved.
- Picker canceled → no-op.

## Testing

- Unit tests for `AvatarSourceMenu` (option rendering, callbacks, "Remove Photo"
  hidden when no custom photo set), with `expo-image-picker` mocked — following
  the existing `AvatarSelectionModal.test.tsx` pattern.
- Unit tests for `useAvatarUpload` (upload → returns public URL; best-effort
  cleanup of previous object), with Supabase storage mocked.
- Optional: `supabase/tests/avatars_storage_verify.sql` alongside
  `activity_feed_verify.sql`.

## Files

- **New:** `supabase/migrations/<ts>_avatars_storage.sql`
- **New:** `src/hooks/auth/useAvatarUpload.ts`
- **New:** `src/components/common/AvatarSourceMenu.tsx` (+ `index.ts` export)
- **New (optional):** `src/utils/imagePicker.ts` (shared picker + `extFromAsset`)
- **Edit:** `src/screens/profile/EditProfileScreen.tsx`
- **New (tests):** `AvatarSourceMenu.test.tsx`, `useAvatarUpload.test.ts`

## Out of scope

- Cropping/editing UI beyond the picker's built-in square crop.
- Image post-processing via `expo-image-manipulator` (not installed; picker
  `quality` + `aspect` is sufficient).
- Migrating existing preset avatars or backfilling.
