# Launch Logo Video Splash Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Play the branded logo video on every cold app open — over the entire app, with sound, tap-to-skip — before the login screen or the loading of an already-logged-in user.

**Architecture:** A `LaunchVideoGate` component wraps the app root in `App.tsx`. On cold start it renders a full-screen overlay (solid `#2f3428` + the logo video) above the app while `RootNavigator` loads underneath. The overlay dismisses (fade-out) when the video finishes or the user taps. A module-level flag makes it cold-start-only (no replay on warm resume). No new dependencies — reuses the already-installed `expo-video`.

**Tech Stack:** React Native, Expo, `expo-video` (~3.0.16), TypeScript, Jest (`jest-expo` preset) + `@testing-library/react-native`.

**Reference spec:** `docs/superpowers/specs/2026-06-15-launch-logo-video-splash-design.md`

---

## File Structure

- **Create** `assets/videos/the-nineteenth-logo.mp4` — the logo video asset (copied from `~/Downloads`).
- **Create** `src/components/common/LaunchVideoGate.tsx` — the gate component (overlay + video + cold-start guard).
- **Create** `src/components/common/LaunchVideoGate.test.tsx` — unit tests.
- **Modify** `src/components/common/index.ts` — export `LaunchVideoGate`.
- **Modify** `App.tsx` — wrap `<RootNavigator />` with `<LaunchVideoGate>`.

---

## Task 1: Add the logo video asset

**Files:**
- Create: `assets/videos/the-nineteenth-logo.mp4`

- [ ] **Step 1: Copy the asset into the repo**

```bash
cp /Users/samkay/Downloads/the-nineteenth-logo.mp4 assets/videos/the-nineteenth-logo.mp4
```

- [ ] **Step 2: Verify it landed (~2 MB)**

Run: `ls -la assets/videos/the-nineteenth-logo.mp4`
Expected: file exists, size ≈ 2,050,619 bytes.

- [ ] **Step 3: Commit**

```bash
git add assets/videos/the-nineteenth-logo.mp4
git commit -m "feat(splash): add launch logo video asset"
```

---

## Task 2: Create the LaunchVideoGate component (TDD)

**Files:**
- Create: `src/components/common/LaunchVideoGate.test.tsx`
- Create: `src/components/common/LaunchVideoGate.tsx`
- Modify: `src/components/common/index.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/common/LaunchVideoGate.test.tsx`:

```tsx
import React from 'react';
import { Animated, Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';

// --- Mock expo-video so we can drive player events from the test ---
const listeners: Record<string, Array<(payload?: any) => void>> = {};
const mockPlayer = {
  loop: false,
  muted: false,
  play: jest.fn(),
  addListener: jest.fn((event: string, cb: (payload?: any) => void) => {
    listeners[event] = listeners[event] ?? [];
    listeners[event].push(cb);
    return { remove: jest.fn() };
  }),
};

jest.mock('expo-video', () => ({
  useVideoPlayer: (_source: unknown, setup?: (p: typeof mockPlayer) => void) => {
    if (setup) setup(mockPlayer);
    return mockPlayer;
  },
  VideoView: () => null,
}));

import {
  LaunchVideoGate,
  __resetLaunchVideoGateForTests,
} from './LaunchVideoGate';

function emit(event: string, payload?: any) {
  act(() => {
    (listeners[event] ?? []).forEach((cb) => cb(payload));
  });
}

beforeEach(() => {
  __resetLaunchVideoGateForTests();
  Object.keys(listeners).forEach((k) => delete listeners[k]);
  jest.clearAllMocks();
  // Make the fade-out animation resolve synchronously in tests.
  jest
    .spyOn(Animated, 'timing')
    .mockReturnValue({
      start: (cb?: (result: { finished: boolean }) => void) =>
        cb && cb({ finished: true }),
    } as unknown as Animated.CompositeAnimation);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const Child = () => <Text>app-content</Text>;

it('renders children underneath the overlay', () => {
  const { getByText } = render(
    <LaunchVideoGate>
      <Child />
    </LaunchVideoGate>
  );
  expect(getByText('app-content')).toBeTruthy();
});

it('shows the skip control on first (cold-start) mount', () => {
  const { getByLabelText } = render(
    <LaunchVideoGate>
      <Child />
    </LaunchVideoGate>
  );
  expect(getByLabelText('Skip intro')).toBeTruthy();
});

it('plays once per process: a second mount shows no overlay', () => {
  const first = render(
    <LaunchVideoGate>
      <Child />
    </LaunchVideoGate>
  );
  first.unmount();

  const second = render(
    <LaunchVideoGate>
      <Child />
    </LaunchVideoGate>
  );
  expect(second.queryByLabelText('Skip intro')).toBeNull();
});

it('dismisses the overlay when tapped (skip)', () => {
  const { getByLabelText, queryByLabelText } = render(
    <LaunchVideoGate>
      <Child />
    </LaunchVideoGate>
  );
  fireEvent.press(getByLabelText('Skip intro'));
  expect(queryByLabelText('Skip intro')).toBeNull();
});

it('dismisses the overlay when the video finishes', () => {
  const { queryByLabelText } = render(
    <LaunchVideoGate>
      <Child />
    </LaunchVideoGate>
  );
  emit('playToEnd');
  expect(queryByLabelText('Skip intro')).toBeNull();
});

it('dismisses the overlay if the player errors', () => {
  const { queryByLabelText } = render(
    <LaunchVideoGate>
      <Child />
    </LaunchVideoGate>
  );
  emit('statusChange', { status: 'error', error: { message: 'boom' } });
  expect(queryByLabelText('Skip intro')).toBeNull();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/components/common/LaunchVideoGate.test.tsx`
Expected: FAIL — `Cannot find module './LaunchVideoGate'` (component not created yet).

- [ ] **Step 3: Implement the component**

Create `src/components/common/LaunchVideoGate.tsx`:

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const launchVideoSource = require('../../../assets/videos/the-nineteenth-logo.mp4');

// Matches `app.json` splash `backgroundColor` so the first JS paint is seamless
// with the native splash and the portrait video letterboxes onto the same color.
const SPLASH_BACKGROUND = '#2f3428';
const FADE_OUT_MS = 250;

// Module-level guard: the launch video plays once per process (cold start only).
// It survives warm resume (the module stays loaded) and resets on process kill.
let hasLaunchVideoPlayed = false;

/** Test-only: reset the cold-start guard between test cases. */
export function __resetLaunchVideoGateForTests() {
  hasLaunchVideoPlayed = false;
}

interface LaunchVideoGateProps {
  children: React.ReactNode;
}

export function LaunchVideoGate({ children }: LaunchVideoGateProps) {
  // Decide once, on first render, whether this mount is a cold start. Claiming
  // the guard inside the initializer ensures it runs exactly once per mount.
  const [overlayVisible, setOverlayVisible] = useState(() => {
    if (hasLaunchVideoPlayed) return false;
    hasLaunchVideoPlayed = true;
    return true;
  });

  const opacity = useRef(new Animated.Value(1)).current;

  const player = useVideoPlayer(
    overlayVisible ? launchVideoSource : null,
    (instance) => {
      instance.loop = false;
      instance.muted = false; // play with sound
      instance.play();
    }
  );

  const dismiss = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      useNativeDriver: true,
    }).start(() => setOverlayVisible(false));
  }, [opacity]);

  useEffect(() => {
    if (!overlayVisible) return;
    const endSub = player.addListener('playToEnd', () => dismiss());
    const statusSub = player.addListener('statusChange', (payload) => {
      if (payload?.status === 'error' || payload?.error) dismiss();
    });
    return () => {
      endSub.remove();
      statusSub.remove();
    };
  }, [overlayVisible, player, dismiss]);

  return (
    <View style={styles.root}>
      {children}
      {overlayVisible && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.overlay, { opacity }]}
        >
          <VideoView
            style={StyleSheet.absoluteFill}
            player={player}
            nativeControls={false}
            contentFit="contain"
            allowsFullscreen={false}
            allowsPictureInPicture={false}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel="Skip intro"
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    backgroundColor: SPLASH_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 4: Export it from the common barrel**

In `src/components/common/index.ts`, add after the `SystemModalTheme` export (around the existing Avatar/Identity exports section):

```ts
export { LaunchVideoGate } from './LaunchVideoGate';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- src/components/common/LaunchVideoGate.test.tsx`
Expected: PASS — all 6 tests green.

- [ ] **Step 6: Type-check**

Run: `pnpm type-check`
Expected: no new errors referencing `LaunchVideoGate`.

- [ ] **Step 7: Commit**

```bash
git add src/components/common/LaunchVideoGate.tsx src/components/common/LaunchVideoGate.test.tsx src/components/common/index.ts
git commit -m "feat(splash): add LaunchVideoGate cold-start video overlay"
```

---

## Task 3: Wire the gate into the app root

**Files:**
- Modify: `App.tsx` (import + wrap `<RootNavigator />` inside `AppContent`)

- [ ] **Step 1: Import the component**

In `App.tsx`, add to the existing imports (near the other `@/components/common` / component imports, e.g. after the `UnifiedToastDisplay` import on line 38):

```tsx
import { LaunchVideoGate } from '@/components/common';
```

- [ ] **Step 2: Wrap RootNavigator**

In `App.tsx`, inside `AppContent`'s returned tree, replace this line (currently line 217):

```tsx
            <RootNavigator theme={navigationTheme} />
```

with:

```tsx
            <LaunchVideoGate>
              <RootNavigator theme={navigationTheme} />
            </LaunchVideoGate>
```

(Leave the surrounding backdrop `<Image>`, `<StatusBar>`, and `<UnifiedToastDisplay />` siblings untouched — the gate only wraps `RootNavigator`, and its `flex: 1` root fills the `appRoot` view so the overlay covers the full screen including the backdrop.)

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: no new errors.

- [ ] **Step 4: Lint the changed files**

Run: `pnpm lint`
Expected: no new lint errors in `App.tsx` or `LaunchVideoGate.tsx`.

- [ ] **Step 5: Manual smoke test (device/simulator)**

Run: `npx expo start --ios` (or Android). Cold-launch the app.
Expected:
- Native `splash.png` → logo video plays full-screen with sound for ~6s → fades into the app (Home if logged in, Welcome carousel if not).
- Tapping during the video skips straight into the app.
- Swiping the app away and reopening from the background (warm resume) goes straight in with **no** video; fully killing and reopening plays it again.

- [ ] **Step 6: Commit**

```bash
git add App.tsx
git commit -m "feat(splash): play launch logo video over app root on cold start"
```

---

## Known Limitation (documented, out of scope to fix here)

On iOS, the hardware silent switch may still mute the video's audio. `expo-video` does not expose a silent-switch override without adding `expo-audio` / an audio-session config. Forcing audio over the silent switch is intentionally out of scope for this plan; revisit if required.

---

## Self-Review Notes

- **Spec coverage:** every requirement maps to a task — asset (Task 1); always-full-6s via `playToEnd` (Task 2, Step 3 + test); cold-start-only via module guard (Task 2 test "plays once"); sound via `muted = false`; tap-to-skip via `Pressable` (Task 2 test "dismisses when tapped"); root wiring (Task 3); error path never blocks launch (Task 2 test "if the player errors").
- **Type consistency:** the test-only export name `__resetLaunchVideoGateForTests` matches between the test import and the component export; `LaunchVideoGate` name is consistent across component, barrel export, and `App.tsx` import.
- **No placeholders:** all code shown in full.
