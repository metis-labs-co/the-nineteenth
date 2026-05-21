# Add Round Photos from Score Entry — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a camera button to the score-entry footer that opens a dedicated screen where a player can add/manage that round's photos.

**Architecture:** Reuse the already-built round-photos stack. A new optional `onAddPhotos` prop on `ScorecardFooter` renders a camera button that navigates to a new `RoundPhotosScreen`, which simply hosts the existing `RoundPhotoAlbum` component. No backend changes.

**Tech Stack:** React Native, TypeScript, React Navigation (native-stack), React Native Paper, Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-05-22-score-entry-round-photos-design.md`

> **Commit discipline (IMPORTANT):** This branch (`feature/profile-photo-upload`) already has unrelated staged work in the index. Every commit below is **path-scoped** (`git add <paths>` then `git commit -m "..." -- <paths>`) so it includes *only* this feature's files and never sweeps the pre-staged work into a commit. Do not run a bare `git commit`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/screens/scoring/ScorecardEntryScreen/components/ScorecardFooter.tsx` | Add optional `onAddPhotos` prop + camera icon button |
| `src/screens/scoring/ScorecardEntryScreen/components/ScorecardFooter.test.tsx` | New — unit tests for the camera button |
| `src/navigation/types.ts` | Add `RoundPhotos: { roundId: string }` route param |
| `src/screens/activity/RoundPhotosScreen.tsx` | New screen hosting `RoundPhotoAlbum` |
| `src/screens/activity/RoundPhotosScreen.test.tsx` | New — smoke tests for the screen |
| `src/screens/activity/index.ts` | Export `RoundPhotosScreen` |
| `src/navigation/RootNavigator.tsx` | Register `RoundPhotos` screen |
| `src/screens/scoring/ScorecardEntryScreen/index.tsx` | Pass `onAddPhotos` to the footer |

---

## Task 1: Add camera button to ScorecardFooter

**Files:**
- Modify: `src/screens/scoring/ScorecardEntryScreen/components/ScorecardFooter.tsx`
- Test: `src/screens/scoring/ScorecardEntryScreen/components/ScorecardFooter.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `src/screens/scoring/ScorecardEntryScreen/components/ScorecardFooter.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ScorecardFooter, ScorecardFooterProps } from './ScorecardFooter';

const mockColors = {
  surface: '#ffffff',
  border: '#e5e7eb',
  textPrimary: '#111827',
  primary: '#3b82f6',
  success: '#22c55e',
  white: '#ffffff',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

jest.mock('react-native-paper', () => {
  const { Text, View } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
    Icon: ({ source, ...props }: any) => <View testID={`icon-${source}`} {...props} />,
  };
});

describe('ScorecardFooter', () => {
  const defaultProps: ScorecardFooterProps = {
    currentHole: 1,
    onPreviousHole: jest.fn(),
    onNextHole: jest.fn(),
    onViewScorecard: jest.fn(),
    canGoPrevious: true,
    canGoNext: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the camera button when onAddPhotos is provided', () => {
    render(<ScorecardFooter {...defaultProps} onAddPhotos={jest.fn()} />);
    expect(screen.getByLabelText('Add round photos')).toBeTruthy();
    expect(screen.getByTestId('icon-camera-plus-outline')).toBeTruthy();
  });

  it('calls onAddPhotos when the camera button is pressed', () => {
    const onAddPhotos = jest.fn();
    render(<ScorecardFooter {...defaultProps} onAddPhotos={onAddPhotos} />);
    fireEvent.press(screen.getByLabelText('Add round photos'));
    expect(onAddPhotos).toHaveBeenCalledTimes(1);
  });

  it('does not render the camera button when onAddPhotos is omitted', () => {
    render(<ScorecardFooter {...defaultProps} />);
    expect(screen.queryByLabelText('Add round photos')).toBeNull();
    expect(screen.queryByTestId('icon-camera-plus-outline')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/screens/scoring/ScorecardEntryScreen/components/ScorecardFooter.test.tsx`
Expected: FAIL — the first two tests fail because no element has the label `Add round photos` / no `icon-camera-plus-outline` is rendered. (The third test will already pass.)

- [ ] **Step 3: Add the `onAddPhotos` prop to the props interface**

In `ScorecardFooter.tsx`, add the optional prop to `ScorecardFooterProps` (after `isAllComplete`):

```tsx
  /** Whether all holes have been scored */
  isAllComplete?: boolean;
  /** When provided, renders a camera button that opens the round's photos. */
  onAddPhotos?: () => void;
```

- [ ] **Step 4: Destructure the new prop**

In the `ScorecardFooter` function signature, add `onAddPhotos` to the destructured params (after `isAllComplete = false,`):

```tsx
  isAllComplete = false,
  onAddPhotos,
}: ScorecardFooterProps) {
```

- [ ] **Step 5: Render the camera button**

In `ScorecardFooter.tsx`, insert the camera button between the "View full scorecard" `TouchableOpacity` (the one with `accessibilityLabel="View full scorecard"`, which closes just before the `onNextHole` button) and the `onNextHole` `TouchableOpacity`:

```tsx
        {onAddPhotos ? (
          <TouchableOpacity
            onPress={onAddPhotos}
            style={[
              styles.iconNavButton,
              styles.navButtonContent,
              { borderWidth: 1, borderColor: colors.border },
            ]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add round photos"
          >
            <Icon source="camera-plus-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : null}
```

(No style changes needed — it reuses the existing `iconNavButton` / `navButtonContent` styles, matching the clipboard icon button.)

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm test -- src/screens/scoring/ScorecardEntryScreen/components/ScorecardFooter.test.tsx`
Expected: PASS (3 passing).

- [ ] **Step 7: Commit**

```bash
git add src/screens/scoring/ScorecardEntryScreen/components/ScorecardFooter.tsx src/screens/scoring/ScorecardEntryScreen/components/ScorecardFooter.test.tsx
git commit -m "feat(scorecard): add optional camera button to ScorecardFooter" -- \
  src/screens/scoring/ScorecardEntryScreen/components/ScorecardFooter.tsx \
  src/screens/scoring/ScorecardEntryScreen/components/ScorecardFooter.test.tsx
```

---

## Task 2: Add RoundPhotos route + RoundPhotosScreen

**Files:**
- Modify: `src/navigation/types.ts`
- Create: `src/screens/activity/RoundPhotosScreen.tsx`
- Test: `src/screens/activity/RoundPhotosScreen.test.tsx` (create)
- Modify: `src/screens/activity/index.ts`
- Modify: `src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Add the route param**

In `src/navigation/types.ts`, add the route next to the existing `RoundActivity` line (around line 173):

```tsx
  RoundActivity: { roundId: string }; // Likes/comments/photos for a single round
  RoundPhotos: { roundId: string }; // Shared photo album for a single round
```

- [ ] **Step 2: Write the failing screen test**

Create `src/screens/activity/RoundPhotosScreen.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import RoundPhotosScreen from './RoundPhotosScreen';
import { createMockNavigation, createMockRoute } from '@/__tests__/utils/renderHelpers';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({ background: '#ffffff' }),
}));

jest.mock('@/components/common', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    PageHeader: ({ title, onBack }: any) => (
      <TouchableOpacity testID="page-header-back" onPress={onBack}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('@/components/activity', () => {
  const { View, Text } = require('react-native');
  return {
    RoundPhotoAlbum: ({ roundId, canAdd }: any) => (
      <View testID="round-photo-album">
        <Text>{`album:${roundId}:${String(canAdd)}`}</Text>
      </View>
    ),
  };
});

describe('RoundPhotosScreen', () => {
  it('renders the photo album for the route round with canAdd enabled', () => {
    const navigation = createMockNavigation();
    const route = createMockRoute({ roundId: 'round-123' });
    render(
      <RoundPhotosScreen navigation={navigation as any} route={route as any} />
    );
    expect(screen.getByTestId('round-photo-album')).toBeTruthy();
    expect(screen.getByText('album:round-123:true')).toBeTruthy();
  });

  it('goes back when the header back button is pressed', () => {
    const navigation = createMockNavigation();
    const route = createMockRoute({ roundId: 'round-123' });
    render(
      <RoundPhotosScreen navigation={navigation as any} route={route as any} />
    );
    fireEvent.press(screen.getByTestId('page-header-back'));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test -- src/screens/activity/RoundPhotosScreen.test.tsx`
Expected: FAIL — `Cannot find module './RoundPhotosScreen'` (the screen doesn't exist yet).

- [ ] **Step 4: Implement the screen**

Create `src/screens/activity/RoundPhotosScreen.tsx`:

```tsx
/**
 * RoundPhotosScreen - a single round's shared photo album.
 *
 * Hosts the RoundPhotoAlbum (grid + multi-select add + delete-own). Reached
 * from the score-entry footer so players can add photos mid-round. Reusable
 * from other round surfaces (e.g. ViewRound) later.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, layout } from '@/constants/theme';
import { PageHeader } from '@/components/common';
import { RoundPhotoAlbum } from '@/components/activity';
import type { RootStackScreenProps } from '@/navigation/types';

type Props = RootStackScreenProps<'RoundPhotos'>;

export default function RoundPhotosScreen({ navigation, route }: Props) {
  const { roundId } = route.params;
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        variant="centered"
        title="Round Photos"
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <RoundPhotoAlbum roundId={roundId} canAdd />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl,
  },
});
```

- [ ] **Step 5: Export the screen**

In `src/screens/activity/index.ts`, add:

```tsx
export { default as ActivityScreen } from './ActivityScreen';
export { default as RoundActivityScreen } from './RoundActivityScreen';
export { default as RoundPhotosScreen } from './RoundPhotosScreen';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm test -- src/screens/activity/RoundPhotosScreen.test.tsx`
Expected: PASS (2 passing).

- [ ] **Step 7: Register the screen in RootNavigator**

In `src/navigation/RootNavigator.tsx`:

a) Add `RoundPhotosScreen` to the activity import (line 93):

```tsx
import { ActivityScreen, RoundActivityScreen, RoundPhotosScreen } from '@/screens/activity';
```

b) Register the screen immediately after the `RoundActivity` `<Stack.Screen>` block (after its closing `/>` around line 773):

```tsx
            <Stack.Screen
              name="RoundPhotos"
              component={RoundPhotosScreen}
              options={{
                title: 'Round Photos',
                headerShown: false,
              }}
            />
```

- [ ] **Step 8: Type-check**

Run: `pnpm type-check`
Expected: PASS — no errors (confirms the route param type and screen props line up).

- [ ] **Step 9: Commit**

```bash
git add src/navigation/types.ts src/navigation/RootNavigator.tsx src/screens/activity/RoundPhotosScreen.tsx src/screens/activity/RoundPhotosScreen.test.tsx src/screens/activity/index.ts
git commit -m "feat(activity): add RoundPhotosScreen hosting the round photo album" -- \
  src/navigation/types.ts \
  src/navigation/RootNavigator.tsx \
  src/screens/activity/RoundPhotosScreen.tsx \
  src/screens/activity/RoundPhotosScreen.test.tsx \
  src/screens/activity/index.ts
```

---

## Task 3: Wire the footer button in ScorecardEntryScreen

**Files:**
- Modify: `src/screens/scoring/ScorecardEntryScreen/index.tsx`

- [ ] **Step 1: Pass `onAddPhotos` to the footer**

In `src/screens/scoring/ScorecardEntryScreen/index.tsx`, update the `<ScorecardFooter>` usage (around line 747) to add the `onAddPhotos` prop. `roundId` and `navigation` are already in scope (destructured from `route.params` and `props`):

```tsx
      <ScorecardFooter
        currentHole={currentHole}
        onPreviousHole={nav.handlePreviousHole}
        onNextHole={nav.handleNextHole}
        onViewScorecard={scoreHandlers.handleViewScorecard}
        canGoPrevious={nav.canGoPrevious}
        canGoNext={nav.canGoNext}
        isAllComplete={getCompletedHolesCount() === holes.length && holes.length > 0}
        onAddPhotos={() => navigation.navigate('RoundPhotos', { roundId })}
      />
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS — `navigation.navigate('RoundPhotos', { roundId })` type-checks against the new route param, proving the wiring is correct end-to-end.

- [ ] **Step 3: Re-run the footer test (regression)**

Run: `pnpm test -- src/screens/scoring/ScorecardEntryScreen/components/ScorecardFooter.test.tsx`
Expected: PASS (3 passing).

- [ ] **Step 4: Commit**

```bash
git add src/screens/scoring/ScorecardEntryScreen/index.tsx
git commit -m "feat(scorecard): open Round Photos from the score-entry footer" -- \
  src/screens/scoring/ScorecardEntryScreen/index.tsx
```

---

## Final Verification

- [ ] **Lint the touched files**

Run: `pnpm lint`
Expected: PASS (no new errors in the touched files).

- [ ] **Run the full new test set**

Run: `pnpm test -- ScorecardFooter RoundPhotosScreen`
Expected: PASS (5 passing across the two files).

- [ ] **Manual smoke (device/simulator)**

1. Open a round and tap into score entry (the hole-by-hole scorecard).
2. Confirm the footer shows `[Previous] [📋] [📷] [Next Hole]` and the labels don't wrap on a narrow device (e.g. iPhone SE).
3. Tap 📷 → lands on "Round Photos".
4. Tap "Add" → multi-select several photos → they appear in the grid.
5. Long-press an own photo → confirm delete → it disappears.
6. Back → returns to the same hole in score entry.

---

## Notes / Out of Scope (YAGNI)

- No changes to other scoring screens (`QuickScoreEntryScreen`, `MatchPlayScorecardScreen`, `TeamMatchPlayScoringScreen`).
- No direct-picker or action-sheet button variants; no "take photo now" capture option.
- No backend/migration work — the `round-photos` bucket, `round_photos` table, and activity hooks already exist.
