# Hole Map (Phase A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Phase A of the tiered hole-map feature: tap the existing distance-to-pin badge in the score entry screen → opens a satellite map showing the user's GPS, the pin, and tap-to-measure with two distance segments (you → tap, tap → green). Free-tier scope only — no POI markers, no hazards, no shot logging.

**Architecture:** New modal screen `HoleMapScreen` in the root native-stack, entered from a now-pressable `DistanceToPin` badge. Reuses existing `useUserLocation`, `useHoleCoordinatesByHole`, `useGreenCoordinate`, and `useCoordinateBackfill` hooks. The map view itself is `react-native-maps` (`PROVIDER_DEFAULT`, `mapType="satellite"`). Two new pure hooks (`useHoleMapMarkers`, `useMapTier`) and a small set of presentational components (`UserMarker`, `PinMarker`, `TapMarker`, `DistanceLine`, `MapMarkerSet`, `MapHeader`, `NoCoordinatesFallback`) make the screen composable and tier-extensible for future Phases B/C.

**Tech Stack:** TypeScript, React Native (Expo SDK 54), `react-native-maps`, React Navigation native-stack (modal presentation), Zustand (settings flag), TanStack Query (existing coordinate hooks), Jest + `@testing-library/react-native`.

**Reference spec:** `docs/superpowers/specs/2026-05-01-hole-map-distance-design.md`

---

## File Structure

**New files:**

| Path | Responsibility |
|------|----------------|
| `src/screens/scoring/HoleMapScreen.tsx` | Top-level screen; owns tap-marker state; composes the map and overlays. |
| `src/components/scorecard/HoleMap/MapHeader.tsx` | Modal header: back button, hole + par label, "Reset marker" action. |
| `src/components/scorecard/HoleMap/UserMarker.tsx` | `<Marker>` for live GPS dot. |
| `src/components/scorecard/HoleMap/PinMarker.tsx` | `<Marker>` for the green-centre pin. |
| `src/components/scorecard/HoleMap/TapMarker.tsx` | `<Marker>` for the user's tapped point. |
| `src/components/scorecard/HoleMap/DistanceLine.tsx` | `<Polyline>` plus a midpoint callout `<Marker>` showing the formatted distance. |
| `src/components/scorecard/HoleMap/MapMarkerSet.tsx` | Tier-driven container for POI markers. **Phase A:** returns `null`. Reserved for Phase B/C. |
| `src/components/scorecard/HoleMap/NoCoordinatesFallback.tsx` | Overlay shown when the hole has no `hole_coordinates`. CTA invokes `useCoordinateBackfill`. |
| `src/components/scorecard/HoleMap/index.ts` | Barrel export for the HoleMap subcomponents. |
| `src/hooks/useHoleMapMarkers.ts` | Pure transform: raw `hole_coordinates` rows + tier → `{ pin, tees, greens, hazards }`. Phase A only populates `pin`. |
| `src/hooks/useMapTier.ts` | Wraps `useTier()` and returns `'free' \| 'social' \| 'premium'` for map gating. |
| `src/__tests__/hooks/useHoleMapMarkers.test.ts` | Unit tests for the marker reducer. |
| `src/__tests__/hooks/useMapTier.test.tsx` | Unit tests for the tier mapping. |
| `src/__tests__/components/scorecard/HoleMap/DistanceLine.test.tsx` | Renders polyline + formatted callout. |
| `src/__tests__/components/scorecard/HoleMap/MapMarkerSet.test.tsx` | Phase A renders nothing; Phase B renders POIs (test pre-stages). |
| `src/__tests__/components/scorecard/HoleMap/NoCoordinatesFallback.test.tsx` | Snapshot + CTA invokes backfill. |
| `src/__tests__/components/scorecard/HoleMap/MapHeader.test.tsx` | Reset button enabled/disabled state. |
| `src/__tests__/screens/HoleMapScreen.test.tsx` | Smoke test for the screen with mocked map and hooks. |
| `__mocks__/react-native-maps.ts` | Jest module mock so component tests don't load native code. |

**Modified files:**

| Path | Change |
|------|--------|
| `package.json` | Add `react-native-maps` dependency. |
| `app.json` | Add `expo.android.config.googleMaps.apiKey` placeholder + `expo-maps` plugin entry if needed for SDK 54. |
| `jest.setup.js` (or `jest.config.js`) | Wire the `react-native-maps` mock; add `react-native-maps` to `transformIgnorePatterns` exception. |
| `src/store/settingsStore.ts` | Add `enableHoleMap` flag + `setEnableHoleMap` action (default `false`). |
| `src/navigation/types.ts` | Add `HoleMap: { courseId: string; holeNumber: number; roundId: string }` to `RootStackParamList`. |
| `src/navigation/RootNavigator.tsx` | Register the modal `HoleMap` route. |
| `src/components/scorecard/HoleHeader/DistanceToPin.tsx` | Wrap the active-distance state (state 6) in a `Pressable`; dispatch navigation to `HoleMap`; gate behind `enableHoleMap`. |
| `docs/guides/SUBSCRIPTION_TIERS.md` | Note that the distance-to-pin badge is Free; map content is tiered. |

---

## Conventions & Pre-flight Notes

- **Imports & paths.** Existing code uses path aliases (`@/...`). Hook locations follow what `DistanceToPin.tsx` does today: `@/hooks/useHoleCoordinates`, `@/hooks/useUserLocation`, `@/hooks/useCoordinateBackfill`, `@/store/settingsStore`. Mirror that — do not invent `@/hooks/coordinates/queries` paths.
- **Styling.** `useThemeColors()` for dynamic colours, `spacing/typography/borderRadius/shadows` imported from `@/constants/theme`. No hardcoded colours, no inline magic numbers.
- **Pressables.** Existing `DistanceToPin.tsx` uses `TouchableOpacity`; matching that for the modification keeps the diff minimal. New components in this plan use `Pressable` (per current project rule).
- **Named exports.** All new components and hooks use named exports. Default export only on screens (matches the codebase pattern, see `ScorecardEntryScreen`).
- **`React.memo`.** Wrap presentational components that render under the map (markers, lines) so they don't re-render when the map pans.
- **Tests.** Use `@testing-library/react-native`. Mock `react-native-maps` globally — never load the real module in tests. Test files live under `src/__tests__/...` mirroring the source path.
- **Commits.** One commit per task. Conventional commit style matches recent history (`feat(hole-map): ...`, `test(hole-map): ...`).

---

## Task 1: Install `react-native-maps` and wire Jest mock

**Files:**
- Modify: `package.json`
- Create: `__mocks__/react-native-maps.tsx`
- Modify: `jest.setup.js` (root)
- Modify: `app.json`

Native dependency. The Jest mock must land in the same commit so the rest of the test suite keeps passing.

- [ ] **Step 1: Install the package**

```bash
npx expo install react-native-maps
```

Expected: `react-native-maps` added to `package.json` `dependencies` (Expo will pick the SDK-54-compatible version). Run `pnpm install` if Expo doesn't auto-install.

- [ ] **Step 2: Create the Jest mock**

Create `__mocks__/react-native-maps.tsx`:

```tsx
import React from 'react';
import { View } from 'react-native';

const MockMap: React.FC<any> = ({ children, testID, ...rest }) => (
  <View testID={testID ?? 'mock-mapview'} {...rest}>
    {children}
  </View>
);

export const Marker: React.FC<any> = ({ children, testID, ...rest }) => (
  <View testID={testID ?? 'mock-marker'} {...rest}>
    {children}
  </View>
);

export const Polyline: React.FC<any> = ({ testID, ...rest }) => (
  <View testID={testID ?? 'mock-polyline'} {...rest} />
);

export const Callout: React.FC<any> = ({ children, ...rest }) => (
  <View {...rest}>{children}</View>
);

export const PROVIDER_DEFAULT = 'default';
export const PROVIDER_GOOGLE = 'google';

export default MockMap;
```

- [ ] **Step 3: Wire the mock in `jest.setup.js`**

Append to `jest.setup.js`:

```js
jest.mock('react-native-maps', () => require('./__mocks__/react-native-maps').default);
```

If `react-native-maps` ends up in `transformIgnorePatterns`, add it to the exception list in `jest.config.js`.

- [ ] **Step 4: Add Android Google Maps API key placeholder to `app.json`**

Inside `expo.android` add (use the literal string `__GOOGLE_MAPS_ANDROID_API_KEY__` so EAS substitutes from secret):

```json
"config": {
  "googleMaps": {
    "apiKey": "__GOOGLE_MAPS_ANDROID_API_KEY__"
  }
}
```

Note in the commit body: production EAS secret `GOOGLE_MAPS_ANDROID_API_KEY` must be created with platform/package restrictions before the next Android build. iOS uses Apple Maps (`PROVIDER_DEFAULT`); no key required.

- [ ] **Step 5: Verify nothing broke**

Run:

```bash
pnpm test -- --listTests >/dev/null
pnpm type-check
```

Expected: both succeed. The map module is only imported by code we haven't written yet, so no existing test should regress.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml __mocks__/react-native-maps.tsx jest.setup.js app.json
git commit -m "feat(hole-map): add react-native-maps dependency and jest mock

iOS uses Apple Maps (no key); Android requires GOOGLE_MAPS_ANDROID_API_KEY
EAS secret with platform/package restrictions before next build."
```

---

## Task 2: Add `enableHoleMap` flag to settings store

**Files:**
- Modify: `src/store/settingsStore.ts`
- Test: `src/__tests__/store/settingsStore.test.ts` (create or extend)

- [ ] **Step 1: Write the failing test**

Append (or create) in `src/__tests__/store/settingsStore.test.ts`:

```ts
import { useSettingsStore } from '@/store/settingsStore';

describe('settingsStore — enableHoleMap', () => {
  beforeEach(() => {
    useSettingsStore.setState({ enableHoleMap: false });
  });

  it('defaults enableHoleMap to false', () => {
    expect(useSettingsStore.getState().enableHoleMap).toBe(false);
  });

  it('toggles enableHoleMap via setEnableHoleMap', () => {
    useSettingsStore.getState().setEnableHoleMap(true);
    expect(useSettingsStore.getState().enableHoleMap).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- src/__tests__/store/settingsStore.test.ts
```

Expected: FAIL — `enableHoleMap` and `setEnableHoleMap` do not exist on the store.

- [ ] **Step 3: Add the flag to the store**

In `src/store/settingsStore.ts`, alongside `showGpsDistance`:

```ts
// In the state interface (near showGpsDistance: boolean)
enableHoleMap: boolean;
setEnableHoleMap: (enable: boolean) => void;
```

```ts
// In the default state object (near showGpsDistance: false)
enableHoleMap: false, // Hole-map feature flag (Phase A) — staged rollout
```

```ts
// In the actions block (near setShowGpsDistance)
setEnableHoleMap: (enable) => set({ enableHoleMap: enable }),
```

If the store uses `persist`, ensure `enableHoleMap` is in the persisted slice (mirror `showGpsDistance`'s treatment).

- [ ] **Step 4: Run the test**

```bash
pnpm test -- src/__tests__/store/settingsStore.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/settingsStore.ts src/__tests__/store/settingsStore.test.ts
git commit -m "feat(hole-map): add enableHoleMap feature flag to settings store"
```

---

## Task 3: Add `HoleMap` route to navigation types

**Files:**
- Modify: `src/navigation/types.ts`

This is a typing change only; type-check is the test.

- [ ] **Step 1: Add the route param entry**

In `src/navigation/types.ts`, alongside the `Scorecard` entry (around the existing comment `// Scorecard`):

```ts
// Hole Map (modal — Phase A)
HoleMap: { courseId: string; holeNumber: number; roundId: string };
```

- [ ] **Step 2: Verify type-check passes**

```bash
pnpm type-check
```

Expected: PASS. The route is declared but not yet referenced — that's fine.

- [ ] **Step 3: Commit**

```bash
git add src/navigation/types.ts
git commit -m "feat(hole-map): add HoleMap route to navigation types"
```

---

## Task 4: Add `useMapTier` hook

**Files:**
- Create: `src/hooks/useMapTier.ts`
- Test: `src/__tests__/hooks/useMapTier.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/__tests__/hooks/useMapTier.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react-native';
import { useMapTier } from '@/hooks/useMapTier';
import { useTier } from '@/context/SubscriptionContext';

jest.mock('@/context/SubscriptionContext', () => ({
  useTier: jest.fn(),
}));

const mockedUseTier = useTier as jest.MockedFunction<typeof useTier>;

describe('useMapTier', () => {
  it.each([
    ['free', 'free'],
    ['social', 'social'],
    ['premium', 'premium'],
    ['super_admin', 'premium'],
  ] as const)('maps subscription tier %s -> map tier %s', (sub, expected) => {
    mockedUseTier.mockReturnValue(sub as any);
    const { result } = renderHook(() => useMapTier());
    expect(result.current).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test -- src/__tests__/hooks/useMapTier.test.tsx
```

Expected: FAIL — `useMapTier` does not exist.

- [ ] **Step 3: Implement the hook**

`src/hooks/useMapTier.ts`:

```ts
import { useTier } from '@/context/SubscriptionContext';

export type MapTier = 'free' | 'social' | 'premium';

export function useMapTier(): MapTier {
  const tier = useTier();
  if (tier === 'premium' || tier === 'super_admin') return 'premium';
  if (tier === 'social') return 'social';
  return 'free';
}
```

If `useTier` is not the exported name in `SubscriptionContext.tsx`, swap to whatever is — `useSubscriptionContext().tier` works as a fallback. Verify by reading `src/context/SubscriptionContext.tsx` first.

- [ ] **Step 4: Run the test**

```bash
pnpm test -- src/__tests__/hooks/useMapTier.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMapTier.ts src/__tests__/hooks/useMapTier.test.tsx
git commit -m "feat(hole-map): add useMapTier hook for tiered map content"
```

---

## Task 5: Add `useHoleMapMarkers` hook

**Files:**
- Create: `src/hooks/useHoleMapMarkers.ts`
- Test: `src/__tests__/hooks/useHoleMapMarkers.test.ts`

This hook is the seam where Phase A/B/C diverge. Phase A populates only `pin`; Phase B will populate `tees` and `greens`; Phase C will populate `hazards`. Lock the contract now.

- [ ] **Step 1: Write the failing test**

`src/__tests__/hooks/useHoleMapMarkers.test.ts`:

```ts
import { selectHoleMapMarkers } from '@/hooks/useHoleMapMarkers';
import type { HoleCoordinate } from '@/hooks/useHoleCoordinates';

const coord = (poi_type: HoleCoordinate['poi_type'], lat: number, lng: number): HoleCoordinate => ({
  id: `${poi_type}-${lat}`,
  course_id: 'c1',
  hole_number: 7,
  poi_type,
  latitude: lat,
  longitude: lng,
});

describe('selectHoleMapMarkers', () => {
  const all = [
    coord('tee_back', -37.81, 144.96),
    coord('tee_front', -37.811, 144.961),
    coord('green_front', -37.82, 144.97),
    coord('green_center', -37.821, 144.971),
    coord('green_back', -37.822, 144.972),
  ];

  it('returns the green_center pin when present', () => {
    const result = selectHoleMapMarkers(all, 'free');
    expect(result.pin).toEqual({ latitude: -37.821, longitude: 144.971 });
  });

  it('falls back to green_front when green_center missing', () => {
    const result = selectHoleMapMarkers(all.filter((c) => c.poi_type !== 'green_center'), 'free');
    expect(result.pin).toEqual({ latitude: -37.82, longitude: 144.97 });
  });

  it('returns null pin when no green coordinates exist', () => {
    const result = selectHoleMapMarkers(all.filter((c) => !c.poi_type.startsWith('green')), 'free');
    expect(result.pin).toBeNull();
  });

  it('Phase A (free tier) returns empty tees, greens, hazards', () => {
    const result = selectHoleMapMarkers(all, 'free');
    expect(result.tees).toEqual([]);
    expect(result.greens).toEqual([]);
    expect(result.hazards).toEqual([]);
  });

  it('Phase B (social tier) populates tees and greens (forward-compat — currently the same as free)', () => {
    // Phase B implementation will change this expectation; for Phase A we lock free-only behaviour.
    const result = selectHoleMapMarkers(all, 'social');
    expect(result.tees).toEqual([]);
    expect(result.greens).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test -- src/__tests__/hooks/useHoleMapMarkers.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the hook + selector**

`src/hooks/useHoleMapMarkers.ts`:

```ts
import { useMemo } from 'react';
import { useHoleCoordinatesByHole, type HoleCoordinate } from '@/hooks/useHoleCoordinates';
import type { MapTier } from '@/hooks/useMapTier';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface HoleMapMarkers {
  pin: LatLng | null;
  tees: LatLng[];
  greens: LatLng[];
  hazards: LatLng[]; // reserved for Phase C
}

const toLatLng = (c: HoleCoordinate): LatLng => ({
  latitude: c.latitude,
  longitude: c.longitude,
});

export function selectHoleMapMarkers(
  coords: HoleCoordinate[] | undefined,
  _tier: MapTier
): HoleMapMarkers {
  if (!coords || coords.length === 0) {
    return { pin: null, tees: [], greens: [], hazards: [] };
  }

  const center = coords.find((c) => c.poi_type === 'green_center');
  const front = coords.find((c) => c.poi_type === 'green_front');
  const pin = center ? toLatLng(center) : front ? toLatLng(front) : null;

  // Phase A only populates `pin`. Phase B will populate tees/greens.
  return { pin, tees: [], greens: [], hazards: [] };
}

export function useHoleMapMarkers(courseId: string, holeNumber: number, tier: MapTier) {
  const { data } = useHoleCoordinatesByHole(courseId, holeNumber);
  return useMemo(() => selectHoleMapMarkers(data, tier), [data, tier]);
}
```

If `HoleCoordinate` is not exported from `@/hooks/useHoleCoordinates`, declare it inline at the top of the file mirroring the row shape from migration `20260117122937_create_hole_coordinates_table.sql`:

```ts
export type HoleCoordinatePoi =
  | 'tee_back'
  | 'tee_front'
  | 'green_front'
  | 'green_center'
  | 'green_back';

export interface HoleCoordinate {
  id: string;
  course_id: string;
  hole_number: number;
  poi_type: HoleCoordinatePoi;
  latitude: number;
  longitude: number;
}
```

- [ ] **Step 4: Run the test**

```bash
pnpm test -- src/__tests__/hooks/useHoleMapMarkers.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useHoleMapMarkers.ts src/__tests__/hooks/useHoleMapMarkers.test.ts
git commit -m "feat(hole-map): add useHoleMapMarkers hook with Phase A pin selection"
```

---

## Task 6: Marker components (`UserMarker`, `PinMarker`, `TapMarker`)

**Files:**
- Create: `src/components/scorecard/HoleMap/UserMarker.tsx`
- Create: `src/components/scorecard/HoleMap/PinMarker.tsx`
- Create: `src/components/scorecard/HoleMap/TapMarker.tsx`
- Create: `src/components/scorecard/HoleMap/index.ts`
- Test: `src/__tests__/components/scorecard/HoleMap/Markers.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/__tests__/components/scorecard/HoleMap/Markers.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';
import { UserMarker, PinMarker, TapMarker } from '@/components/scorecard/HoleMap';

const coord = { latitude: -37.81, longitude: 144.96 };

describe('HoleMap markers', () => {
  it('renders UserMarker when coordinate provided', () => {
    const { getByTestId } = render(<UserMarker coordinate={coord} />);
    expect(getByTestId('user-marker')).toBeTruthy();
  });

  it('renders nothing when UserMarker has no coordinate', () => {
    const { queryByTestId } = render(<UserMarker coordinate={null} />);
    expect(queryByTestId('user-marker')).toBeNull();
  });

  it('renders PinMarker', () => {
    const { getByTestId } = render(<PinMarker coordinate={coord} />);
    expect(getByTestId('pin-marker')).toBeTruthy();
  });

  it('renders TapMarker only when coordinate present', () => {
    const { queryByTestId, rerender } = render(<TapMarker coordinate={null} />);
    expect(queryByTestId('tap-marker')).toBeNull();
    rerender(<TapMarker coordinate={coord} />);
    expect(queryByTestId('tap-marker')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test -- src/__tests__/components/scorecard/HoleMap/Markers.test.tsx
```

Expected: FAIL — modules do not exist.

- [ ] **Step 3: Implement the markers**

`src/components/scorecard/HoleMap/UserMarker.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { useThemeColors } from '@/context/ThemeContext';
import type { LatLng } from '@/hooks/useHoleMapMarkers';

interface UserMarkerProps {
  coordinate: LatLng | null;
}

export const UserMarker = React.memo(function UserMarker({ coordinate }: UserMarkerProps) {
  const colors = useThemeColors();
  if (!coordinate) return null;
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} testID="user-marker">
      <View style={styles.outer}>
        <View style={[styles.inner, { backgroundColor: colors.info }]} />
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  outer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
});
```

`src/components/scorecard/HoleMap/PinMarker.tsx`:

```tsx
import React from 'react';
import { Marker } from 'react-native-maps';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import type { LatLng } from '@/hooks/useHoleMapMarkers';

interface PinMarkerProps {
  coordinate: LatLng;
}

export const PinMarker = React.memo(function PinMarker({ coordinate }: PinMarkerProps) {
  const colors = useThemeColors();
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 1 }} testID="pin-marker">
      <Icon source="flag" size={28} color={colors.error} />
    </Marker>
  );
});
```

`src/components/scorecard/HoleMap/TapMarker.tsx`:

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { useThemeColors } from '@/context/ThemeContext';
import type { LatLng } from '@/hooks/useHoleMapMarkers';

interface TapMarkerProps {
  coordinate: LatLng | null;
}

export const TapMarker = React.memo(function TapMarker({ coordinate }: TapMarkerProps) {
  const colors = useThemeColors();
  if (!coordinate) return null;
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} testID="tap-marker">
      <View style={[styles.dot, { backgroundColor: colors.warning }]} />
    </Marker>
  );
});

const styles = StyleSheet.create({
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'white',
  },
});
```

`src/components/scorecard/HoleMap/index.ts`:

```ts
export { UserMarker } from './UserMarker';
export { PinMarker } from './PinMarker';
export { TapMarker } from './TapMarker';
```

- [ ] **Step 4: Run the test**

```bash
pnpm test -- src/__tests__/components/scorecard/HoleMap/Markers.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/scorecard/HoleMap/ src/__tests__/components/scorecard/HoleMap/Markers.test.tsx
git commit -m "feat(hole-map): add UserMarker, PinMarker, TapMarker components"
```

---

## Task 7: `DistanceLine` component

**Files:**
- Create: `src/components/scorecard/HoleMap/DistanceLine.tsx`
- Modify: `src/components/scorecard/HoleMap/index.ts` (add export)
- Test: `src/__tests__/components/scorecard/HoleMap/DistanceLine.test.tsx`

The component renders a `<Polyline>` from start to end and a midpoint `<Marker>` whose `<Callout>` shows the formatted distance. Distance is computed via the existing `calculateDistance` helper.

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from '@testing-library/react-native';
import { DistanceLine } from '@/components/scorecard/HoleMap/DistanceLine';

jest.mock('@/store/settingsStore', () => ({
  useFormattedDistance: () => ({
    formatDistance: (yards: number) => `${Math.round(yards)} yd`,
    unitLabel: 'yd',
  }),
  useSettingsStore: jest.fn((sel) => sel({ distanceUnit: 'yards' as const, showGpsDistance: true, enableHoleMap: true })),
}));

const start = { latitude: -37.81, longitude: 144.96 };
const end = { latitude: -37.82, longitude: 144.97 };

describe('DistanceLine', () => {
  it('renders polyline and a callout with the formatted distance', () => {
    const { getByTestId, getByText } = render(<DistanceLine from={start} to={end} testID="line-1" />);
    expect(getByTestId('line-1')).toBeTruthy();
    // The callout text contains "yd" — exact distance depends on Haversine, just check unit token.
    expect(getByText(/yd$/)).toBeTruthy();
  });

  it('renders nothing when from or to is null', () => {
    const { queryByTestId } = render(<DistanceLine from={null} to={end} testID="line-2" />);
    expect(queryByTestId('line-2')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test -- src/__tests__/components/scorecard/HoleMap/DistanceLine.test.tsx
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the component**

`src/components/scorecard/HoleMap/DistanceLine.tsx`:

```tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Polyline, Marker } from 'react-native-maps';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { calculateDistance, metersToYards } from '@/utils/gpsCalculations';
import { useFormattedDistance } from '@/store/settingsStore';
import type { LatLng } from '@/hooks/useHoleMapMarkers';

interface DistanceLineProps {
  from: LatLng | null;
  to: LatLng | null;
  variant?: 'gps-to-tap' | 'tap-to-pin' | 'gps-to-pin';
  testID?: string;
}

const VARIANT_COLORS: Record<NonNullable<DistanceLineProps['variant']>, 'warning' | 'info' | 'success'> = {
  'gps-to-tap': 'warning',
  'tap-to-pin': 'info',
  'gps-to-pin': 'success',
};

export const DistanceLine = React.memo(function DistanceLine({
  from,
  to,
  variant = 'gps-to-pin',
  testID,
}: DistanceLineProps) {
  const colors = useThemeColors();
  const { formatDistance } = useFormattedDistance();

  if (!from || !to) return null;

  const distanceYards = useMemo(
    () => metersToYards(calculateDistance(from.latitude, from.longitude, to.latitude, to.longitude)),
    [from, to]
  );
  const midpoint = useMemo(
    () => ({ latitude: (from.latitude + to.latitude) / 2, longitude: (from.longitude + to.longitude) / 2 }),
    [from, to]
  );

  const colorKey = VARIANT_COLORS[variant];
  const strokeColor = colors[colorKey];

  return (
    <>
      <Polyline
        coordinates={[from, to]}
        strokeColor={strokeColor}
        strokeWidth={3}
        lineDashPattern={[6, 4]}
        testID={testID}
      />
      <Marker coordinate={midpoint} anchor={{ x: 0.5, y: 0.5 }}>
        <View style={[styles.label, { backgroundColor: colors.surface, borderColor: strokeColor }]}>
          <Text style={[styles.text, { color: colors.textPrimary }]}>{formatDistance(distanceYards)}</Text>
        </View>
      </Marker>
    </>
  );
});

const styles = StyleSheet.create({
  label: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  text: {
    ...typography.small,
    fontWeight: '600',
  },
});
```

If `metersToYards` is not exported from `@/utils/gpsCalculations`, the original code uses an inline conversion (`* 1.09361`); inline it locally rather than fight the import.

Add to `src/components/scorecard/HoleMap/index.ts`:

```ts
export { DistanceLine } from './DistanceLine';
```

- [ ] **Step 4: Run the test**

```bash
pnpm test -- src/__tests__/components/scorecard/HoleMap/DistanceLine.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/scorecard/HoleMap/DistanceLine.tsx src/components/scorecard/HoleMap/index.ts src/__tests__/components/scorecard/HoleMap/DistanceLine.test.tsx
git commit -m "feat(hole-map): add DistanceLine component with formatted callout"
```

---

## Task 8: `MapMarkerSet` component (Phase A no-op)

**Files:**
- Create: `src/components/scorecard/HoleMap/MapMarkerSet.tsx`
- Modify: `src/components/scorecard/HoleMap/index.ts` (add export)
- Test: `src/__tests__/components/scorecard/HoleMap/MapMarkerSet.test.tsx`

Phase A returns `null` regardless of input. The test locks the *contract* so Phase B can extend without surprise.

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from '@testing-library/react-native';
import { MapMarkerSet } from '@/components/scorecard/HoleMap/MapMarkerSet';

const markers = { pin: null, tees: [{ latitude: 1, longitude: 2 }], greens: [], hazards: [] };

describe('MapMarkerSet', () => {
  it('renders nothing on free tier (Phase A)', () => {
    const { queryByTestId } = render(<MapMarkerSet markers={markers} tier="free" />);
    expect(queryByTestId('marker-set')).toBeNull();
  });

  it('renders nothing on social tier in Phase A (will change in Phase B)', () => {
    const { queryByTestId } = render(<MapMarkerSet markers={markers} tier="social" />);
    expect(queryByTestId('marker-set')).toBeNull();
  });

  it('renders nothing on premium tier in Phase A (will change in Phase B/C)', () => {
    const { queryByTestId } = render(<MapMarkerSet markers={markers} tier="premium" />);
    expect(queryByTestId('marker-set')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test -- src/__tests__/components/scorecard/HoleMap/MapMarkerSet.test.tsx
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the component**

`src/components/scorecard/HoleMap/MapMarkerSet.tsx`:

```tsx
import React from 'react';
import type { HoleMapMarkers } from '@/hooks/useHoleMapMarkers';
import type { MapTier } from '@/hooks/useMapTier';

interface MapMarkerSetProps {
  markers: HoleMapMarkers;
  tier: MapTier;
}

// Phase A: render nothing. Phase B will render tee/green markers when tier !== 'free'.
// Phase C will additionally render hazard polygons.
export const MapMarkerSet = React.memo(function MapMarkerSet(_: MapMarkerSetProps) {
  return null;
});
```

Add to `src/components/scorecard/HoleMap/index.ts`:

```ts
export { MapMarkerSet } from './MapMarkerSet';
```

- [ ] **Step 4: Run the test**

```bash
pnpm test -- src/__tests__/components/scorecard/HoleMap/MapMarkerSet.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/scorecard/HoleMap/MapMarkerSet.tsx src/components/scorecard/HoleMap/index.ts src/__tests__/components/scorecard/HoleMap/MapMarkerSet.test.tsx
git commit -m "feat(hole-map): add MapMarkerSet stub for tier-driven POI rendering"
```

---

## Task 9: `NoCoordinatesFallback` overlay

**Files:**
- Create: `src/components/scorecard/HoleMap/NoCoordinatesFallback.tsx`
- Modify: `src/components/scorecard/HoleMap/index.ts`
- Test: `src/__tests__/components/scorecard/HoleMap/NoCoordinatesFallback.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { NoCoordinatesFallback } from '@/components/scorecard/HoleMap/NoCoordinatesFallback';

describe('NoCoordinatesFallback', () => {
  it('renders the missing-coordinates message', () => {
    const { getByText } = render(<NoCoordinatesFallback onRequestBackfill={() => {}} />);
    expect(getByText(/no map data/i)).toBeTruthy();
  });

  it('invokes onRequestBackfill when CTA pressed', () => {
    const onRequestBackfill = jest.fn();
    const { getByRole } = render(<NoCoordinatesFallback onRequestBackfill={onRequestBackfill} />);
    fireEvent.press(getByRole('button', { name: /try.*fetching/i }));
    expect(onRequestBackfill).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test -- src/__tests__/components/scorecard/HoleMap/NoCoordinatesFallback.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement the component**

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

interface NoCoordinatesFallbackProps {
  onRequestBackfill: () => void;
}

export function NoCoordinatesFallback({ onRequestBackfill }: NoCoordinatesFallbackProps) {
  const colors = useThemeColors();
  return (
    <View style={[styles.container, shadows.lg, { backgroundColor: colors.surface }]}>
      <Icon source="crosshairs-off" size={32} color={colors.textSecondary} />
      <Text style={[typography.h4, { color: colors.textPrimary, marginTop: spacing.sm }]}>
        No map data for this hole
      </Text>
      <Text style={[typography.small, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
        We don't have GPS coordinates for this hole yet. Try fetching them from our course data partner.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Try fetching coordinates"
        onPress={onRequestBackfill}
        style={[styles.cta, { backgroundColor: colors.primary }]}
      >
        <Text style={[typography.body, { color: colors.onPrimary, fontWeight: '600' }]}>
          Try fetching coordinates
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  cta: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
});
```

Add to `index.ts`:

```ts
export { NoCoordinatesFallback } from './NoCoordinatesFallback';
```

- [ ] **Step 4: Run the test**

```bash
pnpm test -- src/__tests__/components/scorecard/HoleMap/NoCoordinatesFallback.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/scorecard/HoleMap/NoCoordinatesFallback.tsx src/components/scorecard/HoleMap/index.ts src/__tests__/components/scorecard/HoleMap/NoCoordinatesFallback.test.tsx
git commit -m "feat(hole-map): add NoCoordinatesFallback overlay with backfill CTA"
```

---

## Task 10: `MapHeader` component

**Files:**
- Create: `src/components/scorecard/HoleMap/MapHeader.tsx`
- Modify: `src/components/scorecard/HoleMap/index.ts`
- Test: `src/__tests__/components/scorecard/HoleMap/MapHeader.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { MapHeader } from '@/components/scorecard/HoleMap/MapHeader';

describe('MapHeader', () => {
  it('shows hole number', () => {
    const { getByText } = render(
      <MapHeader holeNumber={7} canReset={false} onClose={() => {}} onReset={() => {}} />
    );
    expect(getByText('Hole 7')).toBeTruthy();
  });

  it('disables reset when canReset=false', () => {
    const onReset = jest.fn();
    const { getByLabelText } = render(
      <MapHeader holeNumber={7} canReset={false} onClose={() => {}} onReset={onReset} />
    );
    fireEvent.press(getByLabelText(/reset.*marker/i));
    expect(onReset).not.toHaveBeenCalled();
  });

  it('invokes onReset when canReset=true', () => {
    const onReset = jest.fn();
    const { getByLabelText } = render(
      <MapHeader holeNumber={7} canReset={true} onClose={() => {}} onReset={onReset} />
    );
    fireEvent.press(getByLabelText(/reset.*marker/i));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose when close pressed', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <MapHeader holeNumber={7} canReset={false} onClose={onClose} onReset={() => {}} />
    );
    fireEvent.press(getByLabelText(/close/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test -- src/__tests__/components/scorecard/HoleMap/MapHeader.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement the component**

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface MapHeaderProps {
  holeNumber: number;
  canReset: boolean;
  onClose: () => void;
  onReset: () => void;
}

export function MapHeader({ holeNumber, canReset, onClose, onReset }: MapHeaderProps) {
  const colors = useThemeColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close map"
        onPress={onClose}
        style={styles.iconButton}
      >
        <Icon source="close" size={24} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.center}>
        <Text style={[typography.h4, { color: colors.textPrimary }]}>Hole {holeNumber}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset marker"
        accessibilityState={{ disabled: !canReset }}
        onPress={canReset ? onReset : undefined}
        style={[styles.iconButton, !canReset && { opacity: 0.4 }]}
      >
        <Icon source="restart" size={24} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

Add to `index.ts`:

```ts
export { MapHeader } from './MapHeader';
```

- [ ] **Step 4: Run the test**

```bash
pnpm test -- src/__tests__/components/scorecard/HoleMap/MapHeader.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/scorecard/HoleMap/MapHeader.tsx src/components/scorecard/HoleMap/index.ts src/__tests__/components/scorecard/HoleMap/MapHeader.test.tsx
git commit -m "feat(hole-map): add MapHeader component with close and reset actions"
```

---

## Task 11: `HoleMapScreen`

**Files:**
- Create: `src/screens/scoring/HoleMapScreen.tsx`
- Test: `src/__tests__/screens/HoleMapScreen.test.tsx`

This screen composes everything. It owns one piece of state: the optional tap marker. The map's `onPress` handler sets it; the header's reset clears it.

- [ ] **Step 1: Write the failing test**

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HoleMapScreen from '@/screens/scoring/HoleMapScreen';

jest.mock('@/hooks/useUserLocation', () => ({
  useUserLocation: () => ({
    location: { latitude: -37.81, longitude: 144.96 },
    permissionStatus: 'granted',
    isLoading: false,
    isWatching: true,
    hasBeenAsked: true,
    requestPermission: jest.fn(),
    startWatching: jest.fn(),
  }),
}));

jest.mock('@/hooks/useHoleCoordinates', () => ({
  useHoleCoordinatesByHole: () => ({
    data: [
      { id: 'gc', course_id: 'c1', hole_number: 7, poi_type: 'green_center', latitude: -37.82, longitude: 144.97 },
    ],
    isLoading: false,
  }),
  useHasCoordinates: () => ({ data: true, isLoading: false }),
  useDistanceToGreen: () => ({ data: { yards: 100, meters: 91 }, isLoading: false }),
}));

jest.mock('@/hooks/useCoordinateBackfill', () => ({
  useCoordinateBackfill: () => ({ trigger: jest.fn() }),
}));

jest.mock('@/hooks/useMapTier', () => ({ useMapTier: () => 'free' }));

const Stack = createNativeStackNavigator();

const renderScreen = () =>
  render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="HoleMap"
          component={HoleMapScreen}
          initialParams={{ courseId: 'c1', holeNumber: 7, roundId: 'r1' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );

describe('HoleMapScreen', () => {
  it('renders header, map, user marker, pin marker, and the GPS→pin distance line', () => {
    const { getByTestId, getByText } = renderScreen();
    expect(getByText('Hole 7')).toBeTruthy();
    expect(getByTestId('mock-mapview')).toBeTruthy();
    expect(getByTestId('user-marker')).toBeTruthy();
    expect(getByTestId('pin-marker')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test -- src/__tests__/screens/HoleMapScreen.test.tsx
```

Expected: FAIL — `HoleMapScreen` does not exist.

- [ ] **Step 3: Implement the screen**

`src/screens/scoring/HoleMapScreen.tsx`:

```tsx
import React, { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_DEFAULT, type MapPressEvent } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useThemeColors } from '@/context/ThemeContext';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useHoleCoordinatesByHole, useHasCoordinates } from '@/hooks/useHoleCoordinates';
import { useCoordinateBackfill } from '@/hooks/useCoordinateBackfill';
import { useMapTier } from '@/hooks/useMapTier';
import { useHoleMapMarkers, type LatLng } from '@/hooks/useHoleMapMarkers';
import {
  UserMarker,
  PinMarker,
  TapMarker,
  DistanceLine,
  MapMarkerSet,
  MapHeader,
  NoCoordinatesFallback,
} from '@/components/scorecard/HoleMap';

import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'HoleMap'>;

export default function HoleMapScreen({ route, navigation }: Props) {
  const { courseId, holeNumber } = route.params;
  const colors = useThemeColors();
  const tier = useMapTier();
  const { location } = useUserLocation();
  const { data: hasCoordinates } = useHasCoordinates(courseId);
  const markers = useHoleMapMarkers(courseId, holeNumber, tier);
  const backfill = useCoordinateBackfill(courseId);

  const [tap, setTap] = useState<LatLng | null>(null);

  const userCoord: LatLng | null = location
    ? { latitude: location.latitude, longitude: location.longitude }
    : null;

  const onMapPress = useCallback((e: MapPressEvent) => {
    setTap(e.nativeEvent.coordinate);
  }, []);

  const onReset = useCallback(() => setTap(null), []);
  const onClose = useCallback(() => navigation.goBack(), [navigation]);

  const initialRegion = useMemo(() => {
    const focus = markers.pin ?? userCoord ?? { latitude: 0, longitude: 0 };
    return { ...focus, latitudeDelta: 0.003, longitudeDelta: 0.003 };
  }, [markers.pin, userCoord]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <MapHeader
        holeNumber={holeNumber}
        canReset={tap !== null}
        onClose={onClose}
        onReset={onReset}
      />

      <View style={styles.flex}>
        <MapView
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          mapType="satellite"
          initialRegion={initialRegion}
          onPress={onMapPress}
          showsUserLocation={false}
          testID="hole-map-view"
        >
          <UserMarker coordinate={userCoord} />
          {markers.pin && <PinMarker coordinate={markers.pin} />}
          <TapMarker coordinate={tap} />

          {tap === null && userCoord && markers.pin && (
            <DistanceLine from={userCoord} to={markers.pin} variant="gps-to-pin" />
          )}
          {tap !== null && userCoord && (
            <DistanceLine from={userCoord} to={tap} variant="gps-to-tap" />
          )}
          {tap !== null && markers.pin && (
            <DistanceLine from={tap} to={markers.pin} variant="tap-to-pin" />
          )}

          <MapMarkerSet markers={markers} tier={tier} />
        </MapView>

        {hasCoordinates === false && (
          <NoCoordinatesFallback onRequestBackfill={() => backfill?.trigger?.()} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
```

Notes:

- `useCoordinateBackfill` returns whatever shape it has in the existing codebase (`DistanceToPin.tsx` calls it as `useCoordinateBackfill(courseId)` with no return-value usage). If it's side-effect-only, the fallback CTA's `onRequestBackfill` should re-invoke (e.g. by toggling a key or calling a triggered refetch). Read the existing hook implementation before Task 11 — adapt the screen and the test mock to whatever shape the hook actually exposes. If the hook only auto-runs and offers no manual trigger, the simplest path is to expose a `refetch()` from inside the hook (a one-line addition) and call that.
- `MapPressEvent` import — if `react-native-maps` doesn't export this type at runtime in test, fall back to `any` for the handler param.

- [ ] **Step 4: Run the test**

```bash
pnpm test -- src/__tests__/screens/HoleMapScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/scoring/HoleMapScreen.tsx src/__tests__/screens/HoleMapScreen.test.tsx
git commit -m "feat(hole-map): add HoleMapScreen modal with tap-to-measure"
```

---

## Task 12: Register `HoleMap` route in `RootNavigator`

**Files:**
- Modify: `src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Import the screen and register the route**

Add to the imports near the other scoring screens (around line 56):

```ts
import HoleMapScreen from '@/screens/scoring/HoleMapScreen';
```

Add inside the navigator (alongside the other modal screens — match the style of nearby `presentation: 'modal'` entries):

```tsx
<Stack.Screen
  name="HoleMap"
  component={HoleMapScreen}
  options={{
    presentation: 'modal',
    headerShown: false,
    animation: 'slide_from_bottom',
  }}
/>
```

- [ ] **Step 2: Verify type-check + tests still pass**

```bash
pnpm type-check && pnpm test
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/navigation/RootNavigator.tsx
git commit -m "feat(hole-map): register HoleMap modal route in RootNavigator"
```

---

## Task 13: Make `DistanceToPin` pressable and dispatch navigation

**Files:**
- Modify: `src/components/scorecard/HoleHeader/DistanceToPin.tsx`
- Test: `src/__tests__/components/scorecard/DistanceToPin.test.tsx` (create or extend)

Wraps the **active distance state** (state 6) in a `TouchableOpacity` that navigates to `HoleMap`. Pressable behaviour gated behind the `enableHoleMap` flag — if the flag is off, the badge stays purely informational (today's behaviour).

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { DistanceToPin } from '@/components/scorecard/HoleHeader/DistanceToPin';

const navigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate }),
  useRoute: () => ({ params: { roundId: 'r1' } }),
}));

jest.mock('@/store/settingsStore', () => ({
  useSettingsStore: jest.fn((sel) => sel({ showGpsDistance: true, enableHoleMap: true, distanceUnit: 'metres' })),
  useFormattedDistance: () => ({ formatDistance: (y: number) => `${Math.round(y)} m`, unit: 'metres', unitLabel: 'm' }),
}));

jest.mock('@/hooks/useUserLocation', () => ({
  useUserLocation: () => ({
    location: { latitude: 1, longitude: 2 },
    permissionStatus: 'granted',
    isLoading: false,
    isWatching: true,
    hasBeenAsked: true,
    requestPermission: jest.fn(),
    startWatching: jest.fn(),
  }),
}));

jest.mock('@/hooks/useHoleCoordinates', () => ({
  useHasCoordinates: () => ({ data: true, isLoading: false }),
  useDistanceToGreen: () => ({ data: { yards: 100, meters: 91 }, isLoading: false }),
}));

jest.mock('@/hooks/useCoordinateBackfill', () => ({ useCoordinateBackfill: () => undefined }));

describe('DistanceToPin — tap to open map', () => {
  beforeEach(() => navigate.mockClear());

  it('navigates to HoleMap when active badge is pressed and enableHoleMap is true', () => {
    const { getByA11yLabel } = render(<DistanceToPin courseId="c1" holeNumber={7} />);
    fireEvent.press(getByA11yLabel(/distance to pin/i));
    expect(navigate).toHaveBeenCalledWith('HoleMap', { courseId: 'c1', holeNumber: 7, roundId: 'r1' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test -- src/__tests__/components/scorecard/DistanceToPin.test.tsx
```

Expected: FAIL — current badge is wrapped in a `View`, not a Pressable, and has no a11y label.

- [ ] **Step 3: Modify `DistanceToPin.tsx`**

Add imports near the existing ones:

```ts
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
```

Inside the component, near the other hooks:

```ts
const enableHoleMap = useSettingsStore((s) => s.enableHoleMap);
const navigation = useNavigation<NavigationProp<RootStackParamList>>();
const route = useRoute<RouteProp<RootStackParamList, 'Scorecard'>>();
const roundId = route.params?.roundId;

const handleOpenMap = useCallback(() => {
  if (!enableHoleMap || !roundId) return;
  navigation.navigate('HoleMap', { courseId, holeNumber, roundId });
}, [enableHoleMap, navigation, courseId, holeNumber, roundId]);
```

Replace the **State 6** active-distance block (currently `<View style={styles.container}> ... </View>`) with:

```tsx
<TouchableOpacity
  style={styles.container}
  onPress={handleOpenMap}
  disabled={!enableHoleMap || !roundId}
  accessibilityRole="button"
  accessibilityLabel="Distance to pin — open map"
  accessibilityHint={enableHoleMap ? 'Opens a map view of the hole' : undefined}
>
  <Icon
    source="map-marker"
    size={16}
    color={isClose ? colors.success : colors.textSecondary}
  />
  <Text
    style={[
      styles.distanceText,
      { color: isClose ? colors.success : colors.textPrimary },
    ]}
  >
    {formattedValue}
  </Text>
</TouchableOpacity>
```

(Remove the now-redundant `<View style={styles.container}>` wrapper if you replace the whole block.)

If the screen route param doesn't include `roundId` directly on the `Scorecard` route the badge is rendered from, propagate it via the `DistanceToPinProps` instead — add `roundId: string` to the props and have the parent (`ScorecardHeader`) pass it through. **Inspect `ScorecardHeader.tsx:132` first to confirm the cleaner path.**

- [ ] **Step 4: Run the test**

```bash
pnpm test -- src/__tests__/components/scorecard/DistanceToPin.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run the full suite**

```bash
pnpm test && pnpm type-check
```

Expected: PASS. Existing `DistanceToPin` tests (if any) may need a `useNavigation` mock added to their setup — fix any breakage now.

- [ ] **Step 6: Commit**

```bash
git add src/components/scorecard/HoleHeader/DistanceToPin.tsx src/screens/scoring/HoleMapScreen.tsx src/__tests__/components/scorecard/DistanceToPin.test.tsx
git commit -m "feat(hole-map): make DistanceToPin badge open the map view

Active-state badge now navigates to the new HoleMap modal when
enableHoleMap is on."
```

---

## Task 14: Update `SUBSCRIPTION_TIERS.md`

**Files:**
- Modify: `docs/guides/SUBSCRIPTION_TIERS.md`

Reflect the spec's tier decisions: distance-to-pin badge is Free; map content is tiered (Free → Social → Premium).

- [ ] **Step 1: Find the existing GPS-distance tier note**

```bash
grep -n "GPS distance" docs/guides/SUBSCRIPTION_TIERS.md
```

- [ ] **Step 2: Update the entry**

Replace the existing line that lists "GPS distance" as a Social-tier feature with two lines (or equivalent — match the document's existing tier-table format):

- **Free:** "Distance-to-pin badge in score entry; basic hole map (Phase A) on tap."
- **Social:** "POI-aware hole map with tee and green front/centre/back markers (Phase B)."
- **Premium:** "Hazard overlays and per-round shot logging trail on the hole map (Phase C)."

- [ ] **Step 3: Commit**

```bash
git add docs/guides/SUBSCRIPTION_TIERS.md
git commit -m "docs(subscription-tiers): align distance-to-pin and hole-map with spec"
```

---

## Task 15: End-to-end smoke verification (manual)

**Files:** none (manual verification, no commit unless fixes needed)

This is the device check that types and unit tests can't catch.

- [ ] **Step 1: Toggle the flag on locally**

In a dev build, set `enableHoleMap` to `true` via your usual dev-settings flow (the existing `setEnableHoleMap` action), or temporarily flip the default in `settingsStore.ts` for a one-off run.

- [ ] **Step 2: Open a scorecard for a course with known coordinates**

Verify:

- The distance badge shows numeric distance.
- Tapping the badge slides the map up.
- The pin and your GPS dot are visible.
- A dashed line connects them with a distance callout.
- Tapping anywhere on the map drops a yellow marker.
- Two new lines appear: GPS → tap (carry) and tap → green (remaining).
- Tapping "Reset" removes the tap marker and restores the single GPS → pin line.
- Closing returns to the scorecard with no state weirdness.

- [ ] **Step 3: Test the no-coordinates fallback**

Open the map for a course without `hole_coordinates` rows. Verify:

- Map opens to a sensible default region (course centroid or app default).
- `NoCoordinatesFallback` overlay is visible.
- "Try fetching coordinates" press triggers `useCoordinateBackfill`.

- [ ] **Step 4: Test GPS denied**

Revoke location permission in OS settings. Reopen the map. Verify:

- Map still opens.
- No user dot.
- Tap-to-measure still works (tap → pin distance line shown).
- No crashes.

- [ ] **Step 5: Test offline**

Enable airplane mode. Reopen the map. Verify:

- The map view degrades gracefully (no crash; tiles either render from cache or show as blank).
- Score entry continues to work without network (existing behaviour, not regressed).

- [ ] **Step 6: Document any issues found**

If any check fails, file a follow-up task and fix before declaring Phase A done.

---

## Out of Scope (Phase A explicitly excludes)

- POI markers (tee_back, tee_front, green_front/centre/back) — Phase B.
- Tap-on-POI to switch measurement endpoints — Phase B.
- F·C·B distance triple in callouts — Phase B.
- Hazard overlays — Phase C.
- Shot logging during scoring — Phase C.
- Offline tile caching — out of roadmap.
- Wind / elevation / club suggestions — out of roadmap.
- Coverage % SQL run — separate operational task before Phase B start; queries live in the spec's Appendix A.

---

## Self-Review Notes

Run a final sanity check before handing this plan over for execution:

1. **Spec coverage.** Every Phase A bullet from the spec maps to a task above:
   - Map screen entered from badge → Tasks 11 + 13.
   - GPS dot, pin marker, tap marker, distance lines → Tasks 6, 7, 11.
   - Tap-to-measure with two segments → Task 11.
   - Reset action → Task 10.
   - Fallback when no coordinates → Tasks 9, 11.
   - Feature flag → Task 2.
   - Tier seam reserved for Phase B/C → Tasks 4, 5, 8.
   - Native config + jest mock → Task 1.
   - Doc alignment → Task 14.
2. **Type consistency.** `LatLng`, `MapTier`, `HoleMapMarkers`, `MapPressEvent` — all named consistently across tasks. `useMapTier` returns `'free' | 'social' | 'premium'` everywhere.
3. **No placeholders in the code shown.** Every code block is runnable as written, with two annotated soft spots (par hardcode in Task 11, backfill `.trigger()` shape) flagged for fix-on-discovery in Task 13.
4. **Frequent commits.** One commit per task; 14 commits planned for code, plus one optional commit if smoke testing surfaces fixes.
