# Round-Photo Camera Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users take a photo with the camera (not only pick from the library) when adding photos to a round, via a "Take Photo / Choose from Library" action sheet on the shared `RoundPhotoAlbum` Add tile.

**Architecture:** A new generic `PhotoSourceMenu` bottom sheet (mirroring `AvatarSourceMenu`) presents the two sources. `RoundPhotoAlbum`'s Add tile opens it; library keeps multi-select, camera does a full-frame single capture; both feed a shared `uploadAssets` helper that reuses the existing `useUploadRoundPhoto`. Camera permission strings in `app.json` are broadened to cover round photos.

**Tech Stack:** React Native, TypeScript, expo-image-picker, React Native Paper, Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-05-22-round-photo-camera-capture-design.md`

> **Commit discipline (IMPORTANT):** This branch (`feature/profile-photo-upload`) has unrelated staged work in the index. Every commit below is **path-scoped** (`git add <paths>` then `git commit -m "..." -- <paths>`). NOTE: `src/components/activity/RoundPhotoAlbum.tsx` (Task 2) is itself pre-staged WIP, so its commit will fold that file's pre-existing staged changes in — this is expected and accepted. All other touched files are clean. Never run a bare `git commit`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/components/common/PhotoSourceMenu.tsx` | New: generic Take Photo / Choose from Library bottom sheet |
| `src/components/common/PhotoSourceMenu.test.tsx` | New: unit tests for the menu |
| `src/components/common/index.ts` | Export `PhotoSourceMenu` |
| `src/components/activity/RoundPhotoAlbum.tsx` | Add tile opens the menu; camera capture + shared `uploadAssets` |
| `src/components/activity/RoundPhotoAlbum.test.tsx` | New: menu-opens + camera/library/permission paths |
| `app.json` | Broaden the 3 camera permission strings |

---

## Task 1: PhotoSourceMenu component

**Files:**
- Create: `src/components/common/PhotoSourceMenu.tsx`
- Test: `src/components/common/PhotoSourceMenu.test.tsx`
- Modify: `src/components/common/index.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/common/PhotoSourceMenu.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PhotoSourceMenu } from './PhotoSourceMenu';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#FFF', textPrimary: '#111', textSecondary: '#666',
    primary: '#1E7F5E', error: '#D33', border: '#E0E0E0',
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
    ...overrides,
  };
  render(<PhotoSourceMenu {...props} />);
  return props;
}

describe('PhotoSourceMenu', () => {
  it('renders both photo source options', () => {
    setup();
    expect(screen.getByText('Take Photo')).toBeTruthy();
    expect(screen.getByText('Choose from Library')).toBeTruthy();
  });

  it('fires the matching callback when an option is pressed', () => {
    const props = setup();
    fireEvent.press(screen.getByText('Take Photo'));
    expect(props.onTakePhoto).toHaveBeenCalled();
    fireEvent.press(screen.getByText('Choose from Library'));
    expect(props.onChooseFromLibrary).toHaveBeenCalled();
  });

  it('renders nothing when not visible', () => {
    setup({ visible: false });
    expect(screen.queryByText('Take Photo')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/components/common/PhotoSourceMenu.test.tsx`
Expected: FAIL — `Cannot find module './PhotoSourceMenu'`.

- [ ] **Step 3: Implement the component**

Create `src/components/common/PhotoSourceMenu.tsx`:

```tsx
/**
 * PhotoSourceMenu - action menu for choosing a photo source.
 *
 * Offers "Take Photo" (camera) and "Choose from Library". State is owned by the
 * parent; this component only emits callbacks. Generic — not tied to profiles
 * (cf. AvatarSourceMenu, which is profile-specific).
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { BottomSheet } from './BottomSheet';

export interface PhotoSourceMenuProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
}

interface Row {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
}

function PhotoSourceMenuComponent({
  visible,
  onClose,
  onTakePhoto,
  onChooseFromLibrary,
}: PhotoSourceMenuProps) {
  const colors = useThemeColors();

  const rows: Row[] = [
    { key: 'camera', label: 'Take Photo', icon: 'camera', onPress: onTakePhoto },
    { key: 'library', label: 'Choose from Library', icon: 'image-multiple', onPress: onChooseFromLibrary },
  ];

  const renderRow = useCallback(
    (row: Row) => (
      <TouchableOpacity
        key={row.key}
        style={[styles.row, { borderBottomColor: colors.border }]}
        activeOpacity={0.7}
        onPress={row.onPress}
        accessibilityRole="button"
        accessibilityLabel={row.label}
      >
        <Icon source={row.icon} size={22} color={colors.textPrimary} />
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{row.label}</Text>
      </TouchableOpacity>
    ),
    [colors]
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={0.3}
      title="Add Photo"
      showCloseButton
      testID="photo-source-menu"
    >
      <View style={styles.container}>{rows.map(renderRow)}</View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
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

export const PhotoSourceMenu = React.memo(PhotoSourceMenuComponent);

export default PhotoSourceMenu;
```

- [ ] **Step 4: Export from the common barrel**

In `src/components/common/index.ts`, add these two lines immediately after the existing `AvatarSourceMenu` exports (currently around lines 95–96):

```tsx
export { PhotoSourceMenu } from './PhotoSourceMenu';
export type { PhotoSourceMenuProps } from './PhotoSourceMenu';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- src/components/common/PhotoSourceMenu.test.tsx`
Expected: PASS (3 passing).

- [ ] **Step 6: Commit (path-scoped, clean)**

```bash
git add src/components/common/PhotoSourceMenu.tsx src/components/common/PhotoSourceMenu.test.tsx src/components/common/index.ts
git commit -m "feat(common): add PhotoSourceMenu (take photo / choose from library)" -- \
  src/components/common/PhotoSourceMenu.tsx \
  src/components/common/PhotoSourceMenu.test.tsx \
  src/components/common/index.ts
```

---

## Task 2: Camera capture in RoundPhotoAlbum

**Files:**
- Modify: `src/components/activity/RoundPhotoAlbum.tsx`
- Test: `src/components/activity/RoundPhotoAlbum.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `src/components/activity/RoundPhotoAlbum.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { RoundPhotoAlbum } from './RoundPhotoAlbum';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#FFF', surfaceVariant: '#EEE', textPrimary: '#111',
    textSecondary: '#666', primary: '#1E7F5E', border: '#E0E0E0',
  }),
}));

const mockMutateAsync = jest.fn();
jest.mock('@/hooks/activity', () => ({
  useRoundPhotos: () => ({ data: [], isLoading: false }),
  useUploadRoundPhoto: () => ({ mutateAsync: mockMutateAsync }),
  useDeleteRoundPhoto: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

// SectionHeader is irrelevant here; PhotoSourceMenu is covered by its own test,
// so stub it to expose its two actions as press targets.
jest.mock('@/components/common', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    SectionHeader: () => null,
    PhotoSourceMenu: ({ visible, onTakePhoto, onChooseFromLibrary }: any) =>
      visible ? (
        <View>
          <TouchableOpacity testID="take-photo" onPress={onTakePhoto}>
            <Text>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="choose-library" onPress={onChooseFromLibrary}>
            <Text>Choose from Library</Text>
          </TouchableOpacity>
        </View>
      ) : null,
  };
});

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

const asset = {
  uri: 'file://p.jpg', width: 100, height: 100,
  mimeType: 'image/jpeg', fileName: 'p.jpg',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMutateAsync.mockResolvedValue(undefined);
});

describe('RoundPhotoAlbum camera + library', () => {
  it('opens the source menu when Add is pressed', () => {
    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    expect(screen.queryByTestId('take-photo')).toBeNull();
    fireEvent.press(screen.getByLabelText('Add photos'));
    expect(screen.getByTestId('take-photo')).toBeTruthy();
    expect(screen.getByTestId('choose-library')).toBeTruthy();
  });

  it('takes a photo with the camera and uploads it', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [asset] });

    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    fireEvent.press(screen.getByLabelText('Add photos'));
    fireEvent.press(screen.getByTestId('take-photo'));

    await waitFor(() => expect(ImagePicker.launchCameraAsync).toHaveBeenCalled());
    expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ roundId: 'r1', uri: 'file://p.jpg' })
      )
    );
  });

  it('does not launch the camera when permission is denied', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    fireEvent.press(screen.getByLabelText('Add photos'));
    fireEvent.press(screen.getByTestId('take-photo'));

    await waitFor(() => expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled());
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('chooses from the library and uploads', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [asset] });

    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    fireEvent.press(screen.getByLabelText('Add photos'));
    fireEvent.press(screen.getByTestId('choose-library'));

    await waitFor(() => expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ roundId: 'r1', uri: 'file://p.jpg' })
      )
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/components/activity/RoundPhotoAlbum.test.tsx`
Expected: FAIL — the current component launches the library directly with no menu, so `getByLabelText('Add photos')` does not reveal `take-photo`/`choose-library`, and the camera path is absent.

- [ ] **Step 3: Update the import to include PhotoSourceMenu**

In `src/components/activity/RoundPhotoAlbum.tsx`, change the common-barrel import:

```tsx
import { SectionHeader, PhotoSourceMenu } from '@/components/common';
```

- [ ] **Step 4: Add menu state**

In `RoundPhotoAlbum`, just after `const [uploading, setUploading] = useState(false);`, add:

```tsx
  const [menuVisible, setMenuVisible] = useState(false);
```

- [ ] **Step 5: Replace `handleAdd` with `uploadAssets` + two source handlers**

Replace the entire existing `handleAdd` callback (the `useCallback` that calls `ImagePicker.launchImageLibraryAsync`, loops `uploadPhoto.mutateAsync`, and has the try/catch/finally) with these three callbacks:

```tsx
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
      } catch (err) {
        Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not add photos.');
      } finally {
        setUploading(false);
      }
    },
    [roundId, uploadPhoto]
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
      Alert.alert('Permission needed', 'Allow camera access to take photos.');
      return;
    }
    // Full-frame capture (no square crop) — round photos are not avatars.
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (result.canceled) return;
    await uploadAssets(result.assets);
  }, [uploadAssets]);
```

- [ ] **Step 6: Point the Add tile at the menu**

In the JSX, change the Add tile's `onPress` from `handleAdd` to open the menu:

```tsx
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Add photos"
            style={[
              styles.addTile,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
```

(Leave the tile's inner content — the `ActivityIndicator` while `uploading`, otherwise the `camera-plus-outline` icon + "Add" label — unchanged.)

- [ ] **Step 7: Render the menu**

Add the menu just before the final closing `</View>` of the component's root container (after the grid `</View>`):

```tsx
      <PhotoSourceMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onTakePhoto={handleTakePhoto}
        onChooseFromLibrary={handleChooseFromLibrary}
      />
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm test -- src/components/activity/RoundPhotoAlbum.test.tsx`
Expected: PASS (4 passing).

- [ ] **Step 9: Type-check**

Run: `pnpm type-check`
Expected: exit 0, no errors. (If pre-existing errors appear in files you did NOT touch, report them separately; there must be ZERO errors in `RoundPhotoAlbum.tsx`.)

- [ ] **Step 10: Commit (path-scoped)**

NOTE: `RoundPhotoAlbum.tsx` is pre-staged WIP, so this commit will also include that file's pre-existing staged changes — expected and accepted. `RoundPhotoAlbum.test.tsx` is new/clean.

```bash
git add src/components/activity/RoundPhotoAlbum.tsx src/components/activity/RoundPhotoAlbum.test.tsx
git commit -m "feat(activity): add camera capture to RoundPhotoAlbum via PhotoSourceMenu" -- \
  src/components/activity/RoundPhotoAlbum.tsx \
  src/components/activity/RoundPhotoAlbum.test.tsx
```

---

## Task 3: Broaden camera permission strings

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Update the three camera permission strings**

In `app.json`, replace every occurrence of the exact string:

```
Allow The Nineteenth to take photos for your profile picture.
```

with:

```
Allow The Nineteenth to take photos for your profile and rounds.
```

There are exactly three occurrences (all identical): the iOS `NSCameraUsageDescription`, the `expo-image-picker` plugin `cameraPermission`, and the `expo-camera` plugin `cameraPermission`. Replace all three. Do NOT touch the `expo-image-picker` `photosPermission` string (different text, out of scope).

- [ ] **Step 2: Verify the replacements**

Run: `grep -n "for your profile and rounds" app.json`
Expected: 3 matching lines.

Run: `grep -n "for your profile picture" app.json`
Expected: 1 line remaining — the `photosPermission` line ("…access your photos for your profile picture."), which is intentionally left unchanged.

- [ ] **Step 3: Confirm app.json is still valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('app.json','utf8')); console.log('valid json')"`
Expected: `valid json`

- [ ] **Step 4: Commit (path-scoped, clean)**

```bash
git add app.json
git commit -m "chore(config): broaden camera permission strings to cover round photos" -- \
  app.json
```

---

## Final Verification

- [ ] **Run all new tests**

Run: `pnpm test -- PhotoSourceMenu RoundPhotoAlbum`
Expected: PASS (7 passing across the two files).

- [ ] **Type-check**

Run: `pnpm type-check`
Expected: exit 0.

- [ ] **Lint the touched source files**

Run: `npx eslint src/components/common/PhotoSourceMenu.tsx src/components/activity/RoundPhotoAlbum.tsx`
Expected: 0 errors (warnings tolerated only if pre-existing/unrelated).

- [ ] **Manual smoke (device/simulator)**

1. Open a round → score entry → tap 📷 → Round Photos → tap "Add".
2. Confirm the sheet shows "Take Photo" and "Choose from Library".
3. "Take Photo" → camera permission prompt (first time) → capture → photo appears in the grid.
4. Deny camera permission once → confirm the "Permission needed" alert and no crash.
5. "Choose from Library" → multi-select still works as before.

---

## Notes / Out of Scope (YAGNI)

- `RoundCoverPhotoButton` stays library-only.
- No refactor of `AvatarSourceMenu` or `src/utils/imagePicker.ts`.
- Library stays multi-select; camera is single-shot (Expo captures one photo per `launchCameraAsync`).
- No backend/migration work — capture reuses the existing `useUploadRoundPhoto` path.
