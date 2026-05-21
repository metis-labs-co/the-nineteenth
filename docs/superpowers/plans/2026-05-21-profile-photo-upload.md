# Profile Photo Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user upload a real profile photo (camera or library) from the Profile → Edit Profile bottom sheet, alongside the existing 12 preset avatars.

**Architecture:** A new public Supabase Storage bucket (`avatars`) holds uploaded images at `avatars/{user_id}/{uuid}.{ext}`. `PlayerAvatar` already renders any `https://` URL, so a public URL displays everywhere with no consumer changes. Tapping the avatar in `EditProfileScreen` opens an action menu (`AvatarSourceMenu`) → Take Photo / Choose from Library / Choose an Avatar / Remove Photo. The pending choice is held in a discriminated-union state and committed on **Save**: an uploaded photo is sent to storage via `useAvatarUpload`, then `players.photo_url` is updated by the existing `updateProfile`.

**Tech Stack:** React Native (Expo), TypeScript, Supabase Storage, `expo-image-picker`, `expo-crypto`, TanStack Query, react-hook-form, Jest + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-05-21-profile-photo-upload-design.md`

---

## Reference facts (verified in codebase)

- Supabase client: `import { supabase } from '@/services/supabase/client'`. Storage is `supabase.storage.from(bucket)` — no type cast needed (unlike DB tables).
- Error helper: `import { createError } from '@/services/errors'`; signature `createError(message, code)`. Valid codes used elsewhere: `'AUTH'`, `'DATABASE'`, `'VALIDATION'`.
- Auth hook: `import { useAuth } from '@/hooks/useAuth'` → `{ user, player, updateProfile, isLoading }`. `user.id` is the player id.
- `updateProfile(updates: ProfileUpdateInput)` maps `photoUrl` → `players.photo_url` via `updateData.photo_url = updates.photoUrl || null` (so `photoUrl: ''` clears it). `ProfileUpdateInput.photoUrl?: string` (`src/types/auth.ts:120`).
- Avatar helpers (`src/constants/avatars.ts`): `isAvatarId(url)`, `formatAvatarUrl(id)`, `AVATAR_PREFIX = 'avatar:'`.
- `PlayerAvatar` (`src/components/common/PlayerAvatar.tsx`) renders `avatar:*` as `GolferIcon`, any other truthy string as `Avatar.Image source={{ uri }}` (works for `https://` and local `file://`), and `null` as the default green icon.
- Existing upload reference: `useUploadRoundPhoto` in `src/hooks/activity/mutations.ts` (ArrayBuffer pattern, `Crypto.randomUUID()`).
- Existing picker reference: `src/components/activity/RoundPhotoAlbum.tsx` (permissions, `extFromAsset`).
- `BottomSheet` props (`src/components/common/BottomSheet/BottomSheet.tsx`): `visible`, `onClose`, `children`, `height` (`number | 'full'`), `title`, `showCloseButton`, `enableSwipeToDismiss`, `testID`.
- `app.json` already declares camera + photo-library permissions (iOS `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription`, Android `CAMERA`) and the `expo-image-picker` plugin.
- Commands: `pnpm test <pathOrPattern>` (jest), `pnpm type-check` (tsc), `pnpm lint` (eslint).

## File structure

- **Create** `supabase/migrations/20260521000400_avatars_storage.sql` — public `avatars` bucket + RLS.
- **Create** `supabase/tests/avatars_storage_verify.sql` — catalog verification script.
- **Create** `src/hooks/auth/useAvatarUpload.ts` — `avatarPathFromPublicUrl()` + `useAvatarUpload()`.
- **Create** `src/hooks/auth/useAvatarUpload.test.ts` — unit tests.
- **Create** `src/utils/imagePicker.ts` — `extFromAsset`, `pickImageFromLibrary`, `takePhotoWithCamera`.
- **Create** `src/utils/imagePicker.test.ts` — unit tests.
- **Create** `src/components/common/AvatarSourceMenu.tsx` — action menu.
- **Create** `src/components/common/AvatarSourceMenu.test.tsx` — unit tests.
- **Modify** `src/components/common/index.ts` — export `AvatarSourceMenu`.
- **Modify** `src/screens/profile/EditProfileScreen.tsx` — wire menu, pending union, upload-on-save.

---

## Task 1: Avatars storage bucket migration

**Files:**
- Create: `supabase/migrations/20260521000400_avatars_storage.sql`
- Create: `supabase/tests/avatars_storage_verify.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260521000400_avatars_storage.sql`:

```sql
-- =====================================================
-- Avatars Storage Bucket
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Public bucket for user profile photos. Public-read so PlayerAvatar can
-- render the URL directly (Avatar.Image) everywhere without signed URLs.
-- Writes are restricted to the owner's own folder.
--
-- Object path convention:  avatars/{user_id}/{uuid}.{ext}
--   (storage.foldername(name))[1] = user_id
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Read: public (bucket is public).
CREATE POLICY "avatars read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Insert: only into the user's own folder.
--   [1] = user_id
CREATE POLICY "avatars insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update: only within the user's own folder.
CREATE POLICY "avatars update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: only within the user's own folder.
CREATE POLICY "avatars delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 2: Write the verification script**

Create `supabase/tests/avatars_storage_verify.sql`:

```sql
-- =====================================================
-- Avatars Storage - verification script
-- =====================================================
-- Run AFTER applying 20260521000400_avatars_storage.sql.
-- Safe to run anywhere; inspects metadata only. Expect every row 'OK'.
-- =====================================================

SELECT 'bucket' AS check,
  CASE WHEN COUNT(*) = 1 THEN 'OK' ELSE 'MISSING' END AS result
FROM storage.buckets
WHERE id = 'avatars' AND public = true;

SELECT 'policies' AS check,
  CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE 'MISSING: expected 4, got ' || COUNT(*)::text END AS result
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname IN ('avatars read', 'avatars insert', 'avatars update', 'avatars delete');
```

- [ ] **Step 3: Apply locally and verify (if local Supabase is running)**

Run: `supabase db reset` (or apply the single migration), then run the verification script:
`psql "$SUPABASE_DB_URL" -f supabase/tests/avatars_storage_verify.sql`
Expected: both rows return `OK`.
If local Supabase is not available, note in the commit body that the migration is pending staging/prod apply and skip this step.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260521000400_avatars_storage.sql supabase/tests/avatars_storage_verify.sql
git commit -m "feat(storage): add public avatars bucket with owner-folder RLS"
```

---

## Task 2: Avatar upload hook

**Files:**
- Create: `src/hooks/auth/useAvatarUpload.ts`
- Test: `src/hooks/auth/useAvatarUpload.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/auth/useAvatarUpload.test.ts`:

```ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAvatarUpload, avatarPathFromPublicUrl } from './useAvatarUpload';

const PUBLIC_BASE = 'https://proj.supabase.co/storage/v1/object/public/avatars/';

const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockRemove = jest.fn();

jest.mock('@/services/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (...a: unknown[]) => mockUpload(...a),
        getPublicUrl: (...a: unknown[]) => mockGetPublicUrl(...a),
        remove: (...a: unknown[]) => mockRemove(...a),
      }),
    },
  },
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('expo-crypto', () => ({ randomUUID: () => 'uuid-123' }));

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('avatarPathFromPublicUrl', () => {
  it('extracts the in-bucket path from a public avatars URL', () => {
    expect(avatarPathFromPublicUrl(`${PUBLIC_BASE}user-1/old.jpg`)).toBe('user-1/old.jpg');
  });

  it('returns null for non-avatars URLs, avatar ids, and null', () => {
    expect(avatarPathFromPublicUrl('avatar:avatar-blue')).toBeNull();
    expect(avatarPathFromPublicUrl('https://example.com/x.png')).toBeNull();
    expect(avatarPathFromPublicUrl(null)).toBeNull();
  });
});

describe('useAvatarUpload', () => {
  beforeEach(() => {
    mockUpload.mockReset().mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReset().mockReturnValue({ data: { publicUrl: `${PUBLIC_BASE}user-1/uuid-123.jpg` } });
    mockRemove.mockReset().mockResolvedValue({ error: null });
    global.fetch = jest.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }) as unknown as typeof fetch;
  });

  it('uploads to the user folder and returns the public URL', async () => {
    const { result } = renderHook(() => useAvatarUpload(), { wrapper: makeWrapper() });

    const url = await result.current.mutateAsync({ uri: 'file:///tmp/a.jpg', ext: 'jpg', mimeType: 'image/jpeg' });

    expect(mockUpload).toHaveBeenCalledWith(
      'user-1/uuid-123.jpg',
      expect.any(ArrayBuffer),
      { contentType: 'image/jpeg', upsert: false }
    );
    expect(url).toBe(`${PUBLIC_BASE}user-1/uuid-123.jpg`);
  });

  it('best-effort deletes a previous uploaded avatar in the user folder', async () => {
    const { result } = renderHook(() => useAvatarUpload(), { wrapper: makeWrapper() });

    await result.current.mutateAsync({
      uri: 'file:///tmp/a.jpg',
      ext: 'jpg',
      previousPhotoUrl: `${PUBLIC_BASE}user-1/old.jpg`,
    });

    expect(mockRemove).toHaveBeenCalledWith(['user-1/old.jpg']);
  });

  it('does not delete preset avatars or other users\' files', async () => {
    const { result } = renderHook(() => useAvatarUpload(), { wrapper: makeWrapper() });

    await result.current.mutateAsync({ uri: 'file:///tmp/a.jpg', ext: 'jpg', previousPhotoUrl: 'avatar:avatar-blue' });
    await result.current.mutateAsync({ uri: 'file:///tmp/a.jpg', ext: 'jpg', previousPhotoUrl: `${PUBLIC_BASE}user-2/x.jpg` });

    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('throws when the upload fails', async () => {
    mockUpload.mockResolvedValue({ error: { message: 'boom' } });
    const { result } = renderHook(() => useAvatarUpload(), { wrapper: makeWrapper() });

    await expect(
      result.current.mutateAsync({ uri: 'file:///tmp/a.jpg', ext: 'jpg' })
    ).rejects.toThrow(/Failed to upload photo/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/hooks/auth/useAvatarUpload.test.ts`
Expected: FAIL — `Cannot find module './useAvatarUpload'`.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/auth/useAvatarUpload.ts`:

```ts
/**
 * useAvatarUpload - upload a profile photo to the public `avatars` bucket.
 *
 * Uploads a locally-picked image to `avatars/{userId}/{uuid}.{ext}` and returns
 * its public URL. Best-effort deletes the user's previous uploaded avatar so we
 * don't orphan storage objects. Persisting `photo_url` stays with updateProfile.
 */

import { useMutation } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { createError } from '@/services/errors';

const AVATAR_BUCKET = 'avatars';
const PUBLIC_SEGMENT = `/object/public/${AVATAR_BUCKET}/`;

export interface UploadAvatarInput {
  /** Local file URI from expo-image-picker. */
  uri: string;
  /** File extension without the dot, e.g. 'jpg'. */
  ext: string;
  /** MIME type, e.g. 'image/jpeg'. */
  mimeType?: string;
  /** Current photo_url, used to clean up a previously uploaded avatar. */
  previousPhotoUrl?: string | null;
}

/**
 * Extract the in-bucket path from a public avatars URL, else null.
 * @example avatarPathFromPublicUrl('https://x/storage/v1/object/public/avatars/u/a.jpg') => 'u/a.jpg'
 */
export function avatarPathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const idx = url.indexOf(PUBLIC_SEGMENT);
  if (idx === -1) return null;
  return url.slice(idx + PUBLIC_SEGMENT.length);
}

export function useAvatarUpload() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ uri, ext, mimeType, previousPhotoUrl }: UploadAvatarInput): Promise<string> => {
      if (!user?.id) throw createError('You must be signed in to upload a photo', 'AUTH');

      const extension = (ext || 'jpg').toLowerCase();
      const path = `${user.id}/${Crypto.randomUUID()}.${extension}`;

      // Expo: read the local file as an ArrayBuffer for upload.
      const arraybuffer = await fetch(uri).then((res) => res.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, arraybuffer, { contentType: mimeType ?? 'image/jpeg', upsert: false });
      if (uploadError) {
        throw createError(`Failed to upload photo: ${uploadError.message}`, 'DATABASE');
      }

      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

      // Best-effort cleanup of the previous uploaded avatar (own folder only).
      const previousPath = avatarPathFromPublicUrl(previousPhotoUrl);
      if (previousPath && previousPath.startsWith(`${user.id}/`)) {
        await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
      }

      return data.publicUrl;
    },
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/hooks/auth/useAvatarUpload.test.ts`
Expected: PASS (all 7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/auth/useAvatarUpload.ts src/hooks/auth/useAvatarUpload.test.ts
git commit -m "feat(auth): add useAvatarUpload hook for profile photos"
```

---

## Task 3: Image picker utility

**Files:**
- Create: `src/utils/imagePicker.ts`
- Test: `src/utils/imagePicker.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/imagePicker.test.ts`:

```ts
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { extFromAsset, pickImageFromLibrary, takePhotoWithCamera } from './imagePicker';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

const mockPicker = ImagePicker as jest.Mocked<typeof ImagePicker>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('extFromAsset', () => {
  it('prefers the file extension from the file name', () => {
    expect(extFromAsset({ fileName: 'IMG_001.PNG' } as ImagePicker.ImagePickerAsset)).toBe('png');
  });

  it('falls back to mime type then jpg', () => {
    expect(extFromAsset({ mimeType: 'image/webp' } as ImagePicker.ImagePickerAsset)).toBe('webp');
    expect(extFromAsset({} as ImagePicker.ImagePickerAsset)).toBe('jpg');
  });
});

describe('pickImageFromLibrary', () => {
  it('returns null and alerts when permission denied', async () => {
    mockPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false } as never);
    expect(await pickImageFromLibrary()).toBeNull();
    expect(Alert.alert).toHaveBeenCalled();
    expect(mockPicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('returns null when the user cancels', async () => {
    mockPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
    mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] } as never);
    expect(await pickImageFromLibrary()).toBeNull();
  });

  it('returns the picked image meta on success', async () => {
    mockPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
    mockPicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg', fileName: 'a.jpg', mimeType: 'image/jpeg' }],
    } as never);
    expect(await pickImageFromLibrary()).toEqual({ uri: 'file:///a.jpg', ext: 'jpg', mimeType: 'image/jpeg' });
  });
});

describe('takePhotoWithCamera', () => {
  it('returns null and alerts when camera permission denied', async () => {
    mockPicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false } as never);
    expect(await takePhotoWithCamera()).toBeNull();
    expect(Alert.alert).toHaveBeenCalled();
    expect(mockPicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('returns the captured image meta on success', async () => {
    mockPicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    mockPicker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cam.jpg', mimeType: 'image/jpeg' }],
    } as never);
    expect(await takePhotoWithCamera()).toEqual({ uri: 'file:///cam.jpg', ext: 'jpg', mimeType: 'image/jpeg' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/utils/imagePicker.test.ts`
Expected: FAIL — `Cannot find module './imagePicker'`.

- [ ] **Step 3: Implement the utility**

Create `src/utils/imagePicker.ts`:

```ts
/**
 * imagePicker - shared helpers for picking/capturing a square profile image.
 *
 * Both helpers request the relevant permission (alerting on denial), launch the
 * picker with a 1:1 crop and light compression, and return the picked image's
 * uri/ext/mimeType, or null if denied or cancelled.
 */

import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface PickedImage {
  uri: string;
  ext: string;
  mimeType?: string;
}

/** Derive a file extension from a picker asset (name, then mime, then jpg). */
export function extFromAsset(asset: ImagePicker.ImagePickerAsset): string {
  const fromName = asset.fileName?.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 4) return fromName;
  if (asset.mimeType?.includes('png')) return 'png';
  if (asset.mimeType?.includes('webp')) return 'webp';
  return 'jpg';
}

const PICK_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.6,
};

function toPickedImage(result: ImagePicker.ImagePickerResult): PickedImage | null {
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, ext: extFromAsset(asset), mimeType: asset.mimeType ?? undefined };
}

/** Pick an existing image from the photo library. */
export async function pickImageFromLibrary(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission needed', 'Allow photo library access to choose a profile photo.');
    return null;
  }
  return toPickedImage(await ImagePicker.launchImageLibraryAsync(PICK_OPTIONS));
}

/** Capture a new image with the camera. */
export async function takePhotoWithCamera(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission needed', 'Allow camera access to take a profile photo.');
    return null;
  }
  return toPickedImage(await ImagePicker.launchCameraAsync(PICK_OPTIONS));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/utils/imagePicker.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/imagePicker.ts src/utils/imagePicker.test.ts
git commit -m "feat(utils): add imagePicker helpers for profile photo capture"
```

---

## Task 4: AvatarSourceMenu component

**Files:**
- Create: `src/components/common/AvatarSourceMenu.tsx`
- Test: `src/components/common/AvatarSourceMenu.test.tsx`
- Modify: `src/components/common/index.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/components/common/AvatarSourceMenu.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AvatarSourceMenu } from './AvatarSourceMenu';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#FFF', textPrimary: '#111', textSecondary: '#666',
    primary: '#1E7F5E', error: '#D33', divider: '#EEE',
  }),
}));

// Render the BottomSheet as a passthrough so its children are queryable.
jest.mock('./BottomSheet', () => {
  const { View } = require('react-native');
  return { BottomSheet: ({ children, visible }: any) => (visible ? <View>{children}</View> : null) };
});

function setup(overrides = {}) {
  const props = {
    visible: true,
    onClose: jest.fn(),
    onTakePhoto: jest.fn(),
    onChooseFromLibrary: jest.fn(),
    onChooseAvatar: jest.fn(),
    onRemovePhoto: jest.fn(),
    canRemove: true,
    ...overrides,
  };
  render(<AvatarSourceMenu {...props} />);
  return props;
}

describe('AvatarSourceMenu', () => {
  it('renders the photo source options', () => {
    setup();
    expect(screen.getByText('Take Photo')).toBeTruthy();
    expect(screen.getByText('Choose from Library')).toBeTruthy();
    expect(screen.getByText('Choose an Avatar')).toBeTruthy();
  });

  it('fires the matching callback when an option is pressed', () => {
    const props = setup();
    fireEvent.press(screen.getByText('Take Photo'));
    expect(props.onTakePhoto).toHaveBeenCalled();
    fireEvent.press(screen.getByText('Choose from Library'));
    expect(props.onChooseFromLibrary).toHaveBeenCalled();
    fireEvent.press(screen.getByText('Choose an Avatar'));
    expect(props.onChooseAvatar).toHaveBeenCalled();
  });

  it('shows Remove Photo only when canRemove is true', () => {
    const props = setup({ canRemove: true });
    fireEvent.press(screen.getByText('Remove Photo'));
    expect(props.onRemovePhoto).toHaveBeenCalled();
  });

  it('hides Remove Photo when canRemove is false', () => {
    setup({ canRemove: false });
    expect(screen.queryByText('Remove Photo')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/components/common/AvatarSourceMenu.test.tsx`
Expected: FAIL — `Cannot find module './AvatarSourceMenu'`.

- [ ] **Step 3: Implement the component**

Create `src/components/common/AvatarSourceMenu.tsx`:

```tsx
/**
 * AvatarSourceMenu - action menu for choosing a profile photo source.
 *
 * Shown when the user taps their avatar in Edit Profile. Offers camera, library,
 * the preset-avatar grid, and (when a custom photo is set) removal. State is
 * owned by the parent; this component only emits callbacks.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { BottomSheet } from './BottomSheet';

export interface AvatarSourceMenuProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
  onChooseAvatar: () => void;
  onRemovePhoto: () => void;
  /** Whether a custom uploaded photo is currently set (controls Remove visibility). */
  canRemove: boolean;
}

interface Row {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
}

function AvatarSourceMenuComponent({
  visible,
  onClose,
  onTakePhoto,
  onChooseFromLibrary,
  onChooseAvatar,
  onRemovePhoto,
  canRemove,
}: AvatarSourceMenuProps) {
  const colors = useThemeColors();

  const rows: Row[] = [
    { key: 'camera', label: 'Take Photo', icon: 'camera', onPress: onTakePhoto },
    { key: 'library', label: 'Choose from Library', icon: 'image-multiple', onPress: onChooseFromLibrary },
    { key: 'avatar', label: 'Choose an Avatar', icon: 'emoticon-happy-outline', onPress: onChooseAvatar },
  ];
  if (canRemove) {
    rows.push({ key: 'remove', label: 'Remove Photo', icon: 'trash-can-outline', onPress: onRemovePhoto, destructive: true });
  }

  const renderRow = useCallback(
    (row: Row) => {
      const color = row.destructive ? colors.error : colors.textPrimary;
      return (
        <TouchableOpacity
          key={row.key}
          style={[styles.row, { borderBottomColor: colors.divider }]}
          activeOpacity={0.7}
          onPress={row.onPress}
          accessibilityRole="button"
          accessibilityLabel={row.label}
        >
          <Icon source={row.icon} size={22} color={color} />
          <Text style={[styles.rowLabel, { color }]}>{row.label}</Text>
        </TouchableOpacity>
      );
    },
    [colors]
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={0.45}
      title="Profile Photo"
      showCloseButton
      testID="avatar-source-menu"
    >
      <View style={styles.container}>{rows.map(renderRow)}</View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  rowLabel: {
    ...typography.body,
  },
});

export const AvatarSourceMenu = React.memo(AvatarSourceMenuComponent);

export default AvatarSourceMenu;
```

- [ ] **Step 4: Export from the common index**

In `src/components/common/index.ts`, add after the `AvatarSelectionModal` export block (around line 94):

```ts
export { AvatarSourceMenu } from './AvatarSourceMenu';
export type { AvatarSourceMenuProps } from './AvatarSourceMenu';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test src/components/common/AvatarSourceMenu.test.tsx`
Expected: PASS (all 4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/common/AvatarSourceMenu.tsx src/components/common/AvatarSourceMenu.test.tsx src/components/common/index.ts
git commit -m "feat(common): add AvatarSourceMenu action menu"
```

---

## Task 5: Wire upload into EditProfileScreen

**Files:**
- Modify: `src/screens/profile/EditProfileScreen.tsx`

This task replaces the preset-only avatar flow with the action menu + pending union, and uploads on Save. There is no existing unit test for this screen; verification is `pnpm type-check` + the full suite + manual QA (Task 6).

- [ ] **Step 1: Add imports**

In `src/screens/profile/EditProfileScreen.tsx`, add `AvatarSourceMenu` to the existing `@/components/common` import (the block at lines 17–26), and add these imports near the other hook/util imports (after the `formatAvatarUrl` import at line 37):

```ts
import { isAvatarId } from '@/constants/avatars';
import { useAvatarUpload } from '@/hooks/auth/useAvatarUpload';
import { pickImageFromLibrary, takePhotoWithCamera } from '@/utils/imagePicker';
```

- [ ] **Step 2: Add the PendingAvatar type and replace avatar state**

Add the type just above the component (after `type NavigationProp` at line 39):

```ts
type PendingAvatar =
  | null
  | { type: 'preset'; avatarId: string }
  | { type: 'photo'; uri: string; ext: string; mimeType?: string }
  | { type: 'remove' };
```

Replace the existing avatar state line (line 105):

```ts
  const [pendingAvatarId, setPendingAvatarId] = useState<string | null>(null);
```

with:

```ts
  const [pendingAvatar, setPendingAvatar] = useState<PendingAvatar>(null);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const uploadAvatar = useAvatarUpload();
```

- [ ] **Step 3: Add derived preview + canRemove, and menu handlers**

Add inside the component, after the gender handlers (after `handleGenderSelect`, ~line 256):

```ts
  // Resolve what the avatar preview should show from pending state or saved photo.
  const previewPhotoUrl =
    pendingAvatar === null
      ? player?.photo_url ?? null
      : pendingAvatar.type === 'preset'
        ? formatAvatarUrl(pendingAvatar.avatarId)
        : pendingAvatar.type === 'photo'
          ? pendingAvatar.uri
          : null; // 'remove'

  // Remove only makes sense when the preview is a real photo (not a preset/default).
  const canRemovePhoto = !!previewPhotoUrl && !isAvatarId(previewPhotoUrl);

  const handleTakePhoto = useCallback(async () => {
    setAvatarMenuVisible(false);
    const picked = await takePhotoWithCamera();
    if (picked) setPendingAvatar({ type: 'photo', ...picked });
  }, []);

  const handleChooseFromLibrary = useCallback(async () => {
    setAvatarMenuVisible(false);
    const picked = await pickImageFromLibrary();
    if (picked) setPendingAvatar({ type: 'photo', ...picked });
  }, []);

  const handleChooseAvatarOption = useCallback(() => {
    setAvatarMenuVisible(false);
    // Let the menu close before the preset grid opens (matches existing 150ms pattern).
    setTimeout(() => setAvatarModalVisible(true), 150);
  }, []);

  const handleRemovePhoto = useCallback(() => {
    setAvatarMenuVisible(false);
    setPendingAvatar({ type: 'remove' });
  }, []);
```

- [ ] **Step 4: Update the preset-select handler and hasUnsavedChanges**

Replace the existing `handleAvatarSelect` (lines 247–250):

```ts
  const handleAvatarSelect = useCallback((avatarId: string) => {
    setPendingAvatarId(avatarId);
    setAvatarModalVisible(false);
  }, []);
```

with:

```ts
  const handleAvatarSelect = useCallback((avatarId: string) => {
    setPendingAvatar({ type: 'preset', avatarId });
    setAvatarModalVisible(false);
  }, []);
```

Replace the `hasUnsavedChanges` line (line 229):

```ts
  const hasUnsavedChanges = isDirty || pendingAvatarId !== null || genderChanged;
```

with:

```ts
  const hasUnsavedChanges = isDirty || pendingAvatar !== null || genderChanged;
```

- [ ] **Step 5: Resolve the photo on Save**

In `onSubmit`, replace the existing photo block (lines 180–183):

```ts
      // Build photoUrl only if avatar was changed
      const photoUrl = pendingAvatarId !== null
        ? formatAvatarUrl(pendingAvatarId)
        : undefined;
```

with:

```ts
      // Resolve the pending avatar choice into a photoUrl (uploading if needed).
      let photoUrl: string | undefined;
      if (pendingAvatar !== null) {
        if (pendingAvatar.type === 'preset') {
          photoUrl = formatAvatarUrl(pendingAvatar.avatarId);
        } else if (pendingAvatar.type === 'remove') {
          photoUrl = ''; // updateProfile maps '' -> null
        } else {
          photoUrl = await uploadAvatar.mutateAsync({
            uri: pendingAvatar.uri,
            ext: pendingAvatar.ext,
            mimeType: pendingAvatar.mimeType,
            previousPhotoUrl: player?.photo_url,
          });
        }
      }
```

Then replace the reset of avatar state after a successful save. Change line 200:

```ts
      setPendingAvatarId(null);
```

to:

```ts
      setPendingAvatar(null);
```

(The existing `...(photoUrl !== undefined && { photoUrl })` spread into `updateProfile` already handles passing it through — `''` is `!== undefined`, so a removal is sent.)

- [ ] **Step 6: Update the avatar section UI**

In `renderContent`, change the avatar `TouchableOpacity` onPress (line 329) from:

```tsx
            onPress={() => setAvatarModalVisible(true)}
```

to:

```tsx
            onPress={() => setAvatarMenuVisible(true)}
```

Change the `PlayerAvatar` `photoUrl` prop (lines 335–339) from:

```tsx
            <PlayerAvatar
              photoUrl={pendingAvatarId ? formatAvatarUrl(pendingAvatarId) : player?.photo_url}
              name={player?.name}
              size={100}
            />
```

to:

```tsx
            <PlayerAvatar
              photoUrl={previewPhotoUrl}
              name={player?.name}
              size={100}
            />
```

Change the hint text (line 345) from `Tap to change avatar` to `Tap to change photo`.

- [ ] **Step 7: Render the menu and fix the AvatarSelectionModal current value**

Add `<AvatarSourceMenu>` just before the existing `<AvatarSelectionModal>` (line 547):

```tsx
      {/* Avatar Source Action Menu */}
      <AvatarSourceMenu
        visible={avatarMenuVisible}
        onClose={() => setAvatarMenuVisible(false)}
        onTakePhoto={handleTakePhoto}
        onChooseFromLibrary={handleChooseFromLibrary}
        onChooseAvatar={handleChooseAvatarOption}
        onRemovePhoto={handleRemovePhoto}
        canRemove={canRemovePhoto}
      />
```

Update the `AvatarSelectionModal` `currentAvatarUrl` prop (line 551) from:

```tsx
        currentAvatarUrl={pendingAvatarId ? formatAvatarUrl(pendingAvatarId) : player?.photo_url}
```

to:

```tsx
        currentAvatarUrl={
          pendingAvatar?.type === 'preset' ? formatAvatarUrl(pendingAvatar.avatarId) : player?.photo_url
        }
```

- [ ] **Step 8: Type-check and run the affected suites**

Run: `pnpm type-check`
Expected: no errors.
Run: `pnpm test src/screens/profile src/components/common/AvatarSourceMenu.test.tsx`
Expected: PASS (no regressions in profile screen tests; AvatarSourceMenu passes).

- [ ] **Step 9: Commit**

```bash
git add src/screens/profile/EditProfileScreen.tsx
git commit -m "feat(profile): upload profile photo from Edit Profile sheet"
```

---

## Task 6: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Lint, type-check, full test suite**

Run: `pnpm lint`
Expected: no new errors in the touched files.
Run: `pnpm type-check`
Expected: no errors.
Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 2: Manual QA on simulator/device**

Apply the migration to your dev/staging Supabase first (Task 1). Then in the app:
1. Profile → tap the profile card → Edit Profile opens.
2. Tap the avatar → the action menu appears with Take Photo, Choose from Library, Choose an Avatar (and Remove Photo only if a custom photo is already set).
3. **Choose from Library** → pick + square-crop an image → the avatar preview updates → Save shows the loader, then "Profile updated successfully" and the new photo appears on the Profile card and elsewhere.
4. **Take Photo** → capture → preview updates → Save persists.
5. **Choose an Avatar** → preset grid still works and persists.
6. With a custom photo set, reopen the menu → **Remove Photo** → Save → avatar reverts to the default golfer icon.
7. Deny camera/photo permission once → confirm the permission Alert appears and nothing crashes.
8. Pick a photo, then tap Cancel → the discard-changes dialog appears (unsaved change detected).

- [ ] **Step 3: Confirm no orphaned objects**

After replacing an uploaded photo with a new uploaded photo, verify in the Supabase dashboard (Storage → avatars → your user folder) that only the latest object remains.

---

## Self-review notes

- **Spec coverage:** bucket (Task 1) ✓; `useAvatarUpload` + cleanup (Task 2) ✓; `AvatarSourceMenu` (Task 4) ✓; camera+library picker (Task 3) ✓; pending-union + upload-on-Save integration (Task 5) ✓; remove → default icon via `photoUrl: ''` (Task 5) ✓; verify SQL (Task 1) ✓; tests (Tasks 2–4) ✓.
- **Type consistency:** `PickedImage { uri, ext, mimeType? }` is produced by `imagePicker.ts` and spread into `{ type: 'photo', ...picked }`, matching `UploadAvatarInput`'s `{ uri, ext, mimeType }`. `avatarPathFromPublicUrl` / `useAvatarUpload` names are used consistently. `previewPhotoUrl` / `canRemovePhoto` defined once and reused.
- **Public-bucket rationale:** chosen so `PlayerAvatar`'s existing remote-URL branch renders avatars with zero consumer changes (no signed-URL plumbing).
