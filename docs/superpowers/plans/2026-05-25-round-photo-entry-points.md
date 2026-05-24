# Round-Photo Entry Points + Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move add-photo to a footer bottom sheet (with toast), reach the album from the Review Scorecard header and the View Round banner, and add an explicit ✕ remove badge on the user's own photos.

**Architecture:** Extract the album's inline add-photo logic into a shared `useAddRoundPhotos` hook used by both `RoundPhotoAlbum` and `ScorecardEntryScreen`. The album gains an explicit ✕ delete badge (keeping long-press). `RoundPhotoBanner` gets an optional `onPress` so View Round can open the album. Two header/route wirings reach the existing `RoundPhotos` screen.

**Tech Stack:** React Native, TypeScript, expo-image-picker, React Native Paper, TanStack Query, Jest + @testing-library/react-native (incl. `renderHook`).

**Spec:** `docs/superpowers/specs/2026-05-25-round-photo-entry-points-design.md`

> **Commit discipline (IMPORTANT):** This branch has unrelated staged work in the index. Every commit below is **path-scoped** (`git add <paths>` then `git commit -m "..." -- <paths>`). NOTE: `src/hooks/activity/index.ts`, `src/components/activity/RoundPhotoBanner.tsx`, and `src/components/rounds/ViewRound/RoundDetailsTab/index.tsx` are pre-staged WIP, so their commits fold that file's pre-existing staged content — expected/accepted. All other touched files are already committed (clean). Never run a bare `git commit`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/hooks/activity/useAddRoundPhotos.ts` | New hook: menu state + camera/library capture + upload |
| `src/hooks/activity/useAddRoundPhotos.test.tsx` | New hook test |
| `src/hooks/activity/index.ts` | Export the hook |
| `src/components/activity/RoundPhotoAlbum.tsx` | Consume the hook; add ✕ remove badge on own photos |
| `src/components/activity/RoundPhotoAlbum.test.tsx` | Rewrite: wiring + ✕ remove test |
| `src/components/activity/RoundPhotoBanner.tsx` | Optional `onPress` tap override |
| `src/components/activity/RoundPhotoBanner.test.tsx` | New: `onPress` override vs viewer |
| `src/screens/scoring/ScorecardEntryScreen/index.tsx` | Footer opens sheet + success toast |
| `src/screens/scoring/ReviewScorecardScreen/index.tsx` | PageHeader photo icon → RoundPhotos |
| `src/components/rounds/ViewRound/RoundDetailsTab/index.tsx` | Banner `onPress` → RoundPhotos album |

---

## Task 1: Extract `useAddRoundPhotos` hook

**Files:**
- Create: `src/hooks/activity/useAddRoundPhotos.ts`
- Test: `src/hooks/activity/useAddRoundPhotos.test.tsx`
- Modify: `src/hooks/activity/index.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/activity/useAddRoundPhotos.test.tsx`:

```tsx
import { Alert } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAddRoundPhotos } from './useAddRoundPhotos';

const mockMutateAsync = jest.fn();
jest.mock('./mutations', () => ({
  useUploadRoundPhoto: () => ({ mutateAsync: mockMutateAsync }),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

const asset = { uri: 'file://p.jpg', width: 10, height: 10, mimeType: 'image/jpeg', fileName: 'p.jpg' };

beforeEach(() => {
  jest.clearAllMocks();
  mockMutateAsync.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('useAddRoundPhotos', () => {
  it('opens and closes the menu', () => {
    const { result } = renderHook(() => useAddRoundPhotos('r1'));
    expect(result.current.menuVisible).toBe(false);
    act(() => result.current.openMenu());
    expect(result.current.menuVisible).toBe(true);
    act(() => result.current.closeMenu());
    expect(result.current.menuVisible).toBe(false);
  });

  it('takes a photo, uploads it, and calls onUploaded', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [asset] });
    const onUploaded = jest.fn();

    const { result } = renderHook(() => useAddRoundPhotos('r1', { onUploaded }));
    await act(async () => { await result.current.handleTakePhoto(); });

    expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ roundId: 'r1', uri: 'file://p.jpg' }));
    expect(onUploaded).toHaveBeenCalledWith(1);
  });

  it('does not launch the camera when permission is denied', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    const { result } = renderHook(() => useAddRoundPhotos('r1'));
    await act(async () => { await result.current.handleTakePhoto(); });

    expect(Alert.alert).toHaveBeenCalledWith(
      expect.stringContaining('Camera access'),
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ text: 'Open Settings' })])
    );
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('chooses from the library and uploads', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [asset] });

    const { result } = renderHook(() => useAddRoundPhotos('r1'));
    await act(async () => { await result.current.handleChooseFromLibrary(); });

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ roundId: 'r1', uri: 'file://p.jpg' }));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/hooks/activity/useAddRoundPhotos.test.tsx`
Expected: FAIL — `Cannot find module './useAddRoundPhotos'`.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/activity/useAddRoundPhotos.ts`:

```tsx
/**
 * useAddRoundPhotos - shared "add photos to a round" behavior.
 *
 * Owns the source-menu visibility plus camera/library capture, permission
 * handling, and upload. Used by RoundPhotoAlbum's Add tile and by the
 * score-entry footer. Render <PhotoSourceMenu> with the returned handlers and
 * trigger it with openMenu().
 *
 * Imports useUploadRoundPhoto from './mutations' (not the barrel) to avoid a
 * circular import, since this hook is itself re-exported from the barrel.
 */

import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { extFromAsset } from '@/utils/imagePicker';
import { useUploadRoundPhoto } from './mutations';

export interface UseAddRoundPhotosOptions {
  /** Called with the number of photos after a successful upload batch. */
  onUploaded?: (count: number) => void;
}

export interface UseAddRoundPhotosResult {
  menuVisible: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  handleTakePhoto: () => Promise<void>;
  handleChooseFromLibrary: () => Promise<void>;
  uploading: boolean;
}

export function useAddRoundPhotos(
  roundId: string,
  options?: UseAddRoundPhotosOptions
): UseAddRoundPhotosResult {
  const uploadPhoto = useUploadRoundPhoto();
  const [uploading, setUploading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const onUploaded = options?.onUploaded;

  const openMenu = useCallback(() => setMenuVisible(true), []);
  const closeMenu = useCallback(() => setMenuVisible(false), []);

  const uploadAssets = useCallback(
    async (assets: ImagePicker.ImagePickerAsset[]) => {
      try {
        setUploading(true);
        for (const asset of assets) {
          await uploadPhoto.mutateAsync({
            roundId,
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            ext: extFromAsset(asset),
            mimeType: asset.mimeType ?? undefined,
          });
        }
        onUploaded?.(assets.length);
      } catch (err) {
        Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not add photos.');
      } finally {
        setUploading(false);
      }
    },
    [roundId, uploadPhoto, onUploaded]
  );

  const handleChooseFromLibrary = useCallback(async () => {
    setMenuVisible(false);
    // The system photo picker (iOS PHPicker / Android Photo Picker) needs no
    // media-library permission, so launch it directly.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 0.6,
    });
    if (result.canceled) return;
    await uploadAssets(result.assets);
  }, [uploadAssets]);

  const handleTakePhoto = useCallback(async () => {
    setMenuVisible(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to take photos.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    // Full-frame capture (no square crop) — round photos are not avatars.
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (result.canceled) return;
    await uploadAssets(result.assets);
  }, [uploadAssets]);

  return { menuVisible, openMenu, closeMenu, handleTakePhoto, handleChooseFromLibrary, uploading };
}
```

- [ ] **Step 4: Export from the activity barrel**

In `src/hooks/activity/index.ts`, append:

```tsx
export { useAddRoundPhotos } from './useAddRoundPhotos';
export type { UseAddRoundPhotosOptions, UseAddRoundPhotosResult } from './useAddRoundPhotos';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- src/hooks/activity/useAddRoundPhotos.test.tsx`
Expected: PASS (4 passing).

- [ ] **Step 6: Type-check**

Run: `pnpm type-check`
Expected: exit 0.

- [ ] **Step 7: Commit (path-scoped; `index.ts` folds pre-staged WIP)**

```bash
git add src/hooks/activity/useAddRoundPhotos.ts src/hooks/activity/useAddRoundPhotos.test.tsx src/hooks/activity/index.ts
git commit -m "feat(activity): extract useAddRoundPhotos hook (camera/library add)" -- \
  src/hooks/activity/useAddRoundPhotos.ts \
  src/hooks/activity/useAddRoundPhotos.test.tsx \
  src/hooks/activity/index.ts
```

---

## Task 2: RoundPhotoAlbum — consume the hook + ✕ remove badge

**Files:**
- Modify (replace contents): `src/components/activity/RoundPhotoAlbum.tsx`
- Test (overwrite): `src/components/activity/RoundPhotoAlbum.test.tsx`

- [ ] **Step 1: Overwrite the test (it will fail)**

Replace the entire contents of `src/components/activity/RoundPhotoAlbum.test.tsx` with:

```tsx
import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RoundPhotoAlbum } from './RoundPhotoAlbum';

const mockOpenMenu = jest.fn();
const mockDeleteMutate = jest.fn();

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#FFF', surfaceVariant: '#EEE', textPrimary: '#111',
    textSecondary: '#666', primary: '#1E7F5E', border: '#E0E0E0', white: '#FFF',
  }),
}));

jest.mock('@/hooks/activity', () => ({
  useRoundPhotos: () => ({
    data: [
      { id: 'p1', uploader_id: 'u1', storage_path: 'rounds/r1/u1/p1.jpg', url: 'http://x/p1.jpg' },
      { id: 'p2', uploader_id: 'u2', storage_path: 'rounds/r1/u2/p2.jpg', url: 'http://x/p2.jpg' },
    ],
    isLoading: false,
  }),
  useDeleteRoundPhoto: () => ({ mutate: mockDeleteMutate }),
  useAddRoundPhotos: () => ({
    menuVisible: false,
    openMenu: mockOpenMenu,
    closeMenu: jest.fn(),
    handleTakePhoto: jest.fn(),
    handleChooseFromLibrary: jest.fn(),
    uploading: false,
  }),
}));

jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

jest.mock('@/components/common', () => {
  const { View } = require('react-native');
  return {
    SectionHeader: () => null,
    PhotoSourceMenu: () => <View testID="photo-source-menu" />,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('RoundPhotoAlbum', () => {
  it('opens the source menu when Add is pressed', () => {
    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    fireEvent.press(screen.getByLabelText('Add photos'));
    expect(mockOpenMenu).toHaveBeenCalled();
  });

  it('shows a remove badge only on the user’s own photos', () => {
    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    expect(screen.getAllByLabelText('Remove photo')).toHaveLength(1);
  });

  it('deletes a photo when the remove badge is confirmed', () => {
    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    fireEvent.press(screen.getByLabelText('Remove photo'));
    const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0];
    const del = buttons.find((b: { text: string }) => b.text === 'Delete');
    del.onPress();
    expect(mockDeleteMutate).toHaveBeenCalledWith({
      photoId: 'p1',
      roundId: 'r1',
      storagePath: 'rounds/r1/u1/p1.jpg',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/components/activity/RoundPhotoAlbum.test.tsx`
Expected: FAIL — the album does not yet use `useAddRoundPhotos` (so `openMenu` isn't called) and has no `Remove photo` badge.

- [ ] **Step 3: Replace the component**

Replace the entire contents of `src/components/activity/RoundPhotoAlbum.tsx` with:

```tsx
/**
 * RoundPhotoAlbum - shared per-round photo album.
 *
 * Displays signed photo thumbnails and (for round participants) an "Add" tile
 * that opens the photo source menu. Uploaders can remove their own photos via
 * the ✕ badge or long-press.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { SectionHeader, PhotoSourceMenu } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { useRoundPhotos, useDeleteRoundPhoto, useAddRoundPhotos } from '@/hooks/activity';

const THUMB_SIZE = 100;

export interface RoundPhotoAlbumProps {
  roundId: string;
  /** Whether the current user may add photos (round participant). */
  canAdd: boolean;
}

export function RoundPhotoAlbum({ roundId, canAdd }: RoundPhotoAlbumProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { data: photos, isLoading } = useRoundPhotos(roundId);
  const deletePhoto = useDeleteRoundPhoto();
  const {
    menuVisible,
    openMenu,
    closeMenu,
    handleTakePhoto,
    handleChooseFromLibrary,
    uploading,
  } = useAddRoundPhotos(roundId);

  const confirmDelete = useCallback(
    (photoId: string, storagePath: string) => {
      Alert.alert('Delete photo', 'Remove this photo from the round?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePhoto.mutate({ photoId, roundId, storagePath }),
        },
      ]);
    },
    [deletePhoto, roundId]
  );

  const items = photos ?? [];
  if (!canAdd && items.length === 0 && !isLoading) return null;

  return (
    <View style={styles.container}>
      <SectionHeader title="Photos" icon="image-multiple" />
      <View style={styles.grid}>
        {items.map((photo) => {
          const isOwn = photo.uploader_id === user?.id;
          return (
            <View key={photo.id} style={styles.thumbWrap}>
              <TouchableOpacity
                activeOpacity={isOwn ? 0.7 : 1}
                onLongPress={isOwn ? () => confirmDelete(photo.id, photo.storage_path) : undefined}
                accessibilityRole="image"
                accessibilityLabel="Round photo"
                accessibilityHint={isOwn ? 'Long press to delete' : undefined}
                style={[styles.thumb, { backgroundColor: colors.surfaceVariant }]}
              >
                {photo.url ? (
                  <Image source={{ uri: photo.url }} style={styles.thumbImage} />
                ) : (
                  <Icon source="image-off-outline" size={24} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
              {isOwn ? (
                <TouchableOpacity
                  onPress={() => confirmDelete(photo.id, photo.storage_path)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  hitSlop={8}
                  style={styles.removeBadge}
                >
                  <Icon source="close" size={14} color={colors.white} />
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}

        {canAdd ? (
          <TouchableOpacity
            onPress={openMenu}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Add photos"
            style={[
              styles.addTile,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            {uploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Icon source="camera-plus-outline" size={24} color={colors.primary} />
                <Text style={[styles.addLabel, { color: colors.textSecondary }]}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
      <PhotoSourceMenu
        visible={menuVisible}
        onClose={closeMenu}
        onTakePhoto={handleTakePhoto}
        onChooseFromLibrary={handleChooseFromLibrary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumbWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  addTile: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addLabel: {
    ...typography.caption,
  },
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/components/activity/RoundPhotoAlbum.test.tsx`
Expected: PASS (3 passing).

- [ ] **Step 5: Type-check**

Run: `pnpm type-check`
Expected: exit 0.

- [ ] **Step 6: Commit (path-scoped; both files already committed → clean)**

```bash
git add src/components/activity/RoundPhotoAlbum.tsx src/components/activity/RoundPhotoAlbum.test.tsx
git commit -m "feat(activity): RoundPhotoAlbum uses useAddRoundPhotos + explicit remove badge" -- \
  src/components/activity/RoundPhotoAlbum.tsx \
  src/components/activity/RoundPhotoAlbum.test.tsx
```

---

## Task 3: RoundPhotoBanner — optional `onPress`

**Files:**
- Modify: `src/components/activity/RoundPhotoBanner.tsx`
- Test: `src/components/activity/RoundPhotoBanner.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `src/components/activity/RoundPhotoBanner.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RoundPhotoBanner } from './RoundPhotoBanner';

jest.mock('@/context/ThemeContext', () => ({ useThemeColors: () => ({ white: '#fff' }) }));
jest.mock('@/hooks/activity', () => ({
  useRoundPhotos: () => ({ data: [{ id: 'p1', url: 'http://x/p1.jpg' }] }),
}));
jest.mock('@/components/common', () => ({ SystemModalTheme: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('RoundPhotoBanner', () => {
  it('calls onPress instead of opening the viewer when onPress is provided', () => {
    const onPress = jest.fn();
    render(<RoundPhotoBanner roundId="r1" onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('View round photo'));
    expect(onPress).toHaveBeenCalled();
    expect(screen.queryByLabelText('Close photo viewer')).toBeNull();
  });

  it('opens the viewer when onPress is not provided', () => {
    render(<RoundPhotoBanner roundId="r1" />);
    fireEvent.press(screen.getByLabelText('View round photo'));
    expect(screen.getByLabelText('Close photo viewer')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/components/activity/RoundPhotoBanner.test.tsx`
Expected: FAIL — first test fails because, without an `onPress` prop, tapping opens the viewer (the close button is found) and `onPress` is never called.

- [ ] **Step 3: Add the `onPress` prop to the interface**

In `src/components/activity/RoundPhotoBanner.tsx`, extend `RoundPhotoBannerProps` (after `rounded`):

```tsx
export interface RoundPhotoBannerProps {
  roundId: string;
  /**
   * Round its own corners. Set false when embedding inside a card that already
   * clips (e.g. the course header card), so the photo sits flush at the top.
   */
  rounded?: boolean;
  /**
   * When provided, tapping a photo calls this instead of opening the built-in
   * fullscreen viewer (e.g. to open the round's photo album). Omit to keep the
   * default lightbox.
   */
  onPress?: () => void;
}
```

- [ ] **Step 4: Destructure `onPress` and add a press handler**

Change the function signature and add a handler just after the `viewerIndex` state (around line 48):

```tsx
export function RoundPhotoBanner({ roundId, rounded = true, onPress }: RoundPhotoBannerProps) {
```

Then, after `const [viewerIndex, setViewerIndex] = useState<number | null>(null);`, add:

```tsx
  const handlePhotoPress = useCallback(
    (index: number) => {
      if (onPress) onPress();
      else setViewerIndex(index);
    },
    [onPress]
  );
```

- [ ] **Step 5: Route both taps through the handler**

In the single-photo branch, change `onPress={() => setViewerIndex(0)}` to:

```tsx
          onPress={() => handlePhotoPress(0)}
```

In the carousel `renderItem`, change `onPress={() => setViewerIndex(index)}` to:

```tsx
                onPress={() => handlePhotoPress(index)}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm test -- src/components/activity/RoundPhotoBanner.test.tsx`
Expected: PASS (2 passing).

- [ ] **Step 7: Type-check**

Run: `pnpm type-check`
Expected: exit 0.

- [ ] **Step 8: Commit (path-scoped; `RoundPhotoBanner.tsx` folds pre-staged WIP)**

```bash
git add src/components/activity/RoundPhotoBanner.tsx src/components/activity/RoundPhotoBanner.test.tsx
git commit -m "feat(activity): RoundPhotoBanner optional onPress tap override" -- \
  src/components/activity/RoundPhotoBanner.tsx \
  src/components/activity/RoundPhotoBanner.test.tsx
```

---

## Task 4: Wire the three entry points

**Files:**
- Modify: `src/screens/scoring/ScorecardEntryScreen/index.tsx`
- Modify: `src/screens/scoring/ReviewScorecardScreen/index.tsx`
- Modify: `src/components/rounds/ViewRound/RoundDetailsTab/index.tsx`

These are small wiring changes in large screens that are not unit-tested; verification is `pnpm type-check` + `pnpm lint` + manual smoke.

- [ ] **Step 1: ScorecardEntryScreen — footer opens the sheet + success toast**

a) Add `PhotoSourceMenu` to the existing `@/components/common` import (currently `import { LoadingSpinner, ConfirmationDialog } from '@/components/common';` around line 24):

```tsx
import { LoadingSpinner, ConfirmationDialog, PhotoSourceMenu } from '@/components/common';
```

b) Add two imports near the other hook/context imports (e.g. after the `@/hooks/scorecard` import):

```tsx
import { useToast } from '@/context/ToastContext';
import { useAddRoundPhotos } from '@/hooks/activity';
```

c) Inside the component body (after `const { user } = useAuth();`, near the top), add:

```tsx
  const { showSuccessToast } = useToast();
  const roundPhotos = useAddRoundPhotos(roundId, {
    onUploaded: (n) => showSuccessToast(n === 1 ? 'Photo added' : `${n} photos added`),
  });
```

d) Change the footer's `onAddPhotos` prop (currently `onAddPhotos={() => navigation.navigate('RoundPhotos', { roundId })}`) to:

```tsx
        onAddPhotos={roundPhotos.openMenu}
```

e) Render the menu alongside the other modals — immediately after the `<ScorecardDialogs ... />` element:

```tsx
      <PhotoSourceMenu
        visible={roundPhotos.menuVisible}
        onClose={roundPhotos.closeMenu}
        onTakePhoto={roundPhotos.handleTakePhoto}
        onChooseFromLibrary={roundPhotos.handleChooseFromLibrary}
      />
```

- [ ] **Step 2: ReviewScorecardScreen — header photo icon → RoundPhotos**

In `src/screens/scoring/ReviewScorecardScreen/index.tsx`, change the header (line 317, `<PageHeader title="Scorecard" showBack onBack={handleGoBack} />`) to:

```tsx
      <PageHeader
        title="Scorecard"
        showBack
        onBack={handleGoBack}
        rightActions={
          roundId
            ? [
                {
                  icon: 'image-multiple',
                  onPress: () => navigation.navigate('RoundPhotos', { roundId }),
                  accessibilityLabel: 'Round photos',
                },
              ]
            : undefined
        }
      />
```

(`roundId` and `navigation` are already in scope: `const roundId = route.params?.roundId || currentRoundId;` and `navigation` from props.)

- [ ] **Step 3: RoundDetailsTab — banner opens the album**

In `src/components/rounds/ViewRound/RoundDetailsTab/index.tsx`, change the banner (line 250, `<RoundPhotoBanner roundId={round.id} rounded={false} />`) to:

```tsx
        <RoundPhotoBanner
          roundId={round.id}
          rounded={false}
          onPress={() => navigation.navigate('RoundPhotos', { roundId: round.id, canAdd: canAddPhotos })}
        />
```

(`navigation` from `useNavigation`, `round.id`, and `canAddPhotos` are already in scope.)

- [ ] **Step 4: Type-check**

Run: `pnpm type-check`
Expected: exit 0. This proves all three `navigation.navigate('RoundPhotos', …)` calls and the new props type-check.

- [ ] **Step 5: Lint the touched files**

Run: `npx eslint src/screens/scoring/ScorecardEntryScreen/index.tsx src/screens/scoring/ReviewScorecardScreen/index.tsx src/components/rounds/ViewRound/RoundDetailsTab/index.tsx`
Expected: 0 errors (pre-existing unrelated warnings tolerated).

- [ ] **Step 6: Commit (path-scoped; `RoundDetailsTab/index.tsx` folds pre-staged WIP)**

```bash
git add src/screens/scoring/ScorecardEntryScreen/index.tsx src/screens/scoring/ReviewScorecardScreen/index.tsx src/components/rounds/ViewRound/RoundDetailsTab/index.tsx
git commit -m "feat(rounds): footer add-photo sheet + album entry from review header & view-round banner" -- \
  src/screens/scoring/ScorecardEntryScreen/index.tsx \
  src/screens/scoring/ReviewScorecardScreen/index.tsx \
  src/components/rounds/ViewRound/RoundDetailsTab/index.tsx
```

---

## Final Verification

- [ ] **Run all affected tests**

Run: `pnpm test -- useAddRoundPhotos RoundPhotoAlbum RoundPhotoBanner PhotoSourceMenu`
Expected: PASS (4 + 3 + 2 + 3 = 12 passing across 4 files).

- [ ] **Type-check**

Run: `pnpm type-check`
Expected: exit 0.

- [ ] **Lint feature source**

Run: `npx eslint src/hooks/activity/useAddRoundPhotos.ts src/components/activity/RoundPhotoAlbum.tsx src/components/activity/RoundPhotoBanner.tsx`
Expected: 0 errors.

- [ ] **Manual smoke (device/simulator)**

1. Score entry → tap footer 📷 → bottom sheet (Take Photo / Choose from Library) → add a photo → success toast appears.
2. Review Scorecard → tap the header photo icon → album opens → add and remove (✕ and long-press) work on your own photos; no ✕ on others' photos.
3. View Round → tap the photo banner → album opens (add + remove). Confirm the first-photo cover add still works via the existing cover button.

---

## Notes / Out of Scope (YAGNI)

- No change to `PhotoSourceMenu`, `RoundPhotosScreen`, the `RoundPhotos` route, or `ScorecardFooter`.
- No consolidation of `RoundCoverPhotoButton`'s `extFromAsset`; its add path is unchanged.
- Removal stays own-photos-only (RLS-enforced).
- No lightbox added to the album grid.
- No screen-level unit tests for `ScorecardEntryScreen` / `ReviewScorecardScreen` / `RoundDetailsTab` (type-check + manual smoke).
