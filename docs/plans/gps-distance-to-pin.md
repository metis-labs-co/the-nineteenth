# Plan: GPS Distance-to-Pin Feature

## Overview

Add real-time GPS distance-to-pin display during score entry. Shows golfers their current distance to the green center while scoring each hole.

## Approach

Leverage the existing GPS infrastructure (coordinates service, hooks, database) and add:
1. A `LocationStep` onboarding component to request permission upfront
2. A `useUserLocation` hook to manage device location permissions and tracking
3. A `DistanceToPin` component to display live distance
4. Minor wiring to pass `courseId` through the component tree

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Permission timing | Request during onboarding (after notifications step) | Better UX - request alongside other permissions, not mid-round |
| Update frequency | 10s interval / 20m distance | Battery-efficient, adequate for golf |
| Accuracy level | `Location.Accuracy.Balanced` | Good enough for 5-10m precision |
| UI placement | After HoleDetailsSection in HoleHeader | Non-intrusive, visible location |
| No permission handling | Hide feature silently | Graceful degradation, scoring unaffected |

---

## Phase 0: Onboarding Permission

### Step 0.1: Create LocationStep Component
**Status:** ✅ Complete (2026-01-23)
**Type:** Custom

**Prompt:**
Create a new onboarding step at `src/screens/onboarding/components/LocationStep.tsx` that requests GPS permission during onboarding.

Requirements:
- Follow the exact pattern of `NotificationsStep.tsx` (same file structure, styling, flow)
- Use `expo-location` for permission handling:
  - `Location.getForegroundPermissionsAsync()` to check status
  - `Location.requestForegroundPermissionsAsync()` to request
- Handle simulator detection (location works on simulator but show info message)
- Always proceed to next step regardless of permission result (user can skip)

Display states:
1. **Default**: Show GPS icon, title "Distance to Pin", description about seeing live distance during rounds
2. **Permission denied**: Show info message with "Open Settings" link (same as NotificationsStep)
3. **Requesting**: Show "Enabling..." state on button

UI elements:
- Icon: `crosshairs-gps` (80px, in circular container with `colors.primaryLight` background)
- Title: "Distance to Pin"
- Description: "See your live distance to the green while scoring. Works on courses with GPS data - perfect for club selection."
- Primary button: "Enable GPS" with `map-marker-radius` icon
- Skip link: "Maybe later"

Reference `src/screens/onboarding/components/NotificationsStep.tsx` for exact implementation pattern.

**Deliverables:**
- [x] `src/screens/onboarding/components/LocationStep.tsx` created
- [x] Follows NotificationsStep pattern exactly
- [x] Handles all permission states gracefully

**Completed:**
- Created LocationStep component following NotificationsStep pattern
- Uses expo-location for permission handling
- Handles undetermined, granted, and denied permission states
- Shows "Open Settings" link when permission denied
- Proceeds to next step regardless of permission result

**Dependencies:** None

---

### Step 0.2: Add LocationStep to Onboarding Flow
**Status:** ✅ Complete (2026-01-23)
**Type:** Custom

**Prompt:**
Update `src/screens/onboarding/OnboardingScreen.tsx` to include the LocationStep.

1. Import LocationStep:
```typescript
import LocationStep from './components/LocationStep';
```

2. Add to STEPS array after 'notifications' (position 4, before 'handicap'):
```typescript
const STEPS: StepItem[] = [
  { key: 'welcome', component: WelcomeStep },
  { key: 'competitions', component: CreateCompetitionsStep },
  { key: 'notifications', component: NotificationsStep },
  { key: 'location', component: LocationStep },  // Add this line
  { key: 'handicap', component: HandicapCaptureStep },
  { key: 'homeClub', component: HomeClubStep },
];
```

3. Update the file header comment to reflect 6 steps:
```typescript
/**
 * OnboardingScreen - Multi-step onboarding flow
 *
 * Shows to authenticated users who haven't set their handicap yet.
 * 6 steps: Welcome -> Create Competitions -> Notifications -> Location -> Handicap Capture -> Home Venue
 * ...
 */
```

**Deliverables:**
- [x] LocationStep imported
- [x] Added to STEPS array in correct position
- [x] Header comment updated

**Completed:**
- Imported LocationStep component
- Added to STEPS array after notifications (position 4)
- Updated header comment to reflect 6 steps and GPS permission feature

**Dependencies:** Step 0.1

---

## Phase 1: Core Hook

### Step 1.1: Create useUserLocation Hook
**Status:** ✅ Complete (2026-01-23)
**Type:** Custom

**Prompt:**
Create a new hook at `src/hooks/useUserLocation.ts` that manages expo-location permissions and position watching.

Requirements:
- Check permission on mount with `Location.getForegroundPermissionsAsync()`
- Expose `requestPermission()` function that calls `Location.requestForegroundPermissionsAsync()`
- Use `Location.watchPositionAsync()` with config: `{ accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 20 }`
- Track `permissionStatus`: 'undetermined' | 'granted' | 'denied'
- Pause watching when app backgrounds using `AppState.addEventListener`
- Resume watching when app returns to foreground
- Clean up subscription on unmount
- Store "gps_permission_asked" flag in AsyncStorage (set to true after any permission request - used by DistanceToPin to avoid re-prompting users who skipped)
- `startWatching` should be a no-op if permission isn't granted (defensive coding - check permission status before starting)

Return interface:
```typescript
interface UseUserLocationReturn {
  location: { latitude: number; longitude: number } | null;
  accuracy: number | null;
  permissionStatus: 'undetermined' | 'granted' | 'denied';
  isLoading: boolean;
  isWatching: boolean;
  requestPermission: () => Promise<boolean>;
  startWatching: () => void;
  stopWatching: () => void;
  error: string | null;
}
```

Reference the existing `usePushNotifications` hook at `src/hooks/usePushNotifications.ts` for permission handling patterns.

**Deliverables:**
- [x] `src/hooks/useUserLocation.ts` created
- [x] Types exported from hook file

**Completed:**
- Created comprehensive hook with all required functionality
- Permission handling with AsyncStorage tracking
- App state handling (pause on background, resume on foreground)
- Battery-efficient watch config (10s interval, 20m distance, Balanced accuracy)
- Clean unmount handling
- Added `hasBeenAsked` flag for DistanceToPin component

**Dependencies:** None
**Notes:** expo-location is already installed (v19.0.8)

---

### Step 1.2: Export useUserLocation from hooks index
**Status:** ✅ Complete (2026-01-23)
**Type:** Custom

**Prompt:**
Update `src/hooks/index.ts` to export the new useUserLocation hook.

Add after the "Hole Coordinates hooks" section (around line 365):
```typescript
// User Location hooks (GPS tracking)
export { useUserLocation } from './useUserLocation';
export type { UseUserLocationReturn } from './useUserLocation';
```

**Deliverables:**
- [x] `src/hooks/index.ts` updated with export

**Completed:**
- Added useUserLocation export with types after Hole Coordinates section
- Exported UseUserLocationReturn, LocationPermissionStatus, and DeviceUserLocation types

**Dependencies:** Step 1.1

---

## Phase 2: Display Component

### Step 2.1: Create DistanceToPin Component
**Status:** ✅ Complete (2026-01-23)
**Type:** Custom

**Prompt:**
Create a new component at `src/components/scorecard/HoleHeader/DistanceToPin.tsx` that displays live distance to the green.

Requirements:
- Props: `courseId: string`, `holeNumber: number`
- Use `useHasCoordinates(courseId)` to check if course has GPS data - if not, render null
- Use `useUserLocation()` to get current position
- Use `useDistanceToGreen(courseId, holeNumber, location)` to calculate distance
- Use `useFormattedDistance()` from settingsStore: `const { formatDistance } = useFormattedDistance()` then call `formatDistance(distance.yards)` for formatted string with unit
- Follow the app's styling patterns using `useThemeColors()` hook

Display states:
1. **No coordinates for course**: Return null (hidden)
2. **Permission undetermined + not asked before**: Show small GPS icon with "Enable GPS" text, tappable to request permission
3. **Permission undetermined + already asked**: Return null (user skipped, don't nag)
4. **Permission denied**: Return null (hidden)
5. **Loading/acquiring location**: Show GPS icon with subtle pulse animation
6. **Active**: Show `📍 145m` or `📍 158yd` badge

Styling:
- Compact horizontal layout: [GPS icon] [distance text]
- Use `colors.textSecondary` for icon, `colors.textPrimary` for distance
- Use `typography.bodySmall` for text
- Add subtle green tint (`colors.success`) when distance < 150 in user's preferred unit (check `distanceUnit` from settingsStore - if 'meters' use 150m threshold, if 'yards' use 150yd threshold)

Reference `src/components/scorecard/HoleHeader/HoleDetailsSection.tsx` for styling patterns.

**Deliverables:**
- [x] `src/components/scorecard/HoleHeader/DistanceToPin.tsx` created
- [x] Component handles all display states gracefully

**Completed:**
- Created component with all 6 display states
- Pulsing GPS icon animation for loading state
- Green tint when close to pin (< 150m/yd)
- Auto-starts watching when permission granted
- Uses all required hooks (useHasCoordinates, useUserLocation, useDistanceToGreen, useFormattedDistance)

**Dependencies:** Step 1.1

---

### Step 2.2: Export DistanceToPin from HoleHeader index
**Status:** ✅ Complete (2026-01-23)
**Type:** Custom

**Prompt:**
Update `src/components/scorecard/HoleHeader/index.ts` to export the new DistanceToPin component.

Add:
```typescript
export { DistanceToPin } from './DistanceToPin';
export type { DistanceToPinProps } from './DistanceToPin';
```

**Deliverables:**
- [x] `src/components/scorecard/HoleHeader/index.ts` updated

**Completed:**
- Added DistanceToPin and DistanceToPinProps exports

**Dependencies:** Step 2.1

---

## Phase 3: Integration

### Step 3.1: Add courseId prop to HoleHeader
**Status:** ✅ Complete (2026-01-23)
**Type:** Custom

**Prompt:**
Update `src/components/scorecard/HoleHeader/HoleHeader.tsx` to:

1. Add optional `courseId` prop to `HoleHeaderProps`:
```typescript
export interface HoleHeaderProps {
  hole: Hole;
  courseId?: string;  // Add this
  selectedTee?: string;
  // ... rest unchanged
}
```

2. Import and render DistanceToPin after the HoleDetailsSection, inside a new View wrapper:
```tsx
import { DistanceToPin } from './DistanceToPin';

// Inside the component, after HoleDetailsSection:
<HoleDetailsSection
  hole={hole}
  formattedDistance={formattedDistance}
  canEdit={canEditHole}
  onEditHole={onEditHole}
/>

{courseId && (
  <View style={styles.gpsContainer}>
    <DistanceToPin courseId={courseId} holeNumber={hole.number} />
  </View>
)}
```

3. Add style for gpsContainer:
```typescript
gpsContainer: {
  marginLeft: spacing.md,
},
```

**Deliverables:**
- [x] `HoleHeaderProps` interface updated with `courseId` prop
- [x] `DistanceToPin` rendered conditionally
- [x] Styles added

**Completed:**
- Added `courseId` optional prop to HoleHeaderProps with JSDoc comment
- Imported DistanceToPin component
- Added conditional rendering of DistanceToPin after HoleDetailsSection
- Added gpsContainer style with marginLeft spacing

**Dependencies:** Step 2.1

---

### Step 3.2: Pass courseId from ScorecardEntryScreen
**Status:** ✅ Complete (2026-01-23)
**Type:** Custom

**Prompt:**
Update `src/screens/scoring/ScorecardEntryScreen/index.tsx` to pass `courseId` to HoleHeader.

The `courseId` is already available from the `useRoundData` hook (line 111):
```typescript
const {
  courseName,
  courseId,  // Already destructured
  // ...
} = useRoundData({ roundId, competitionId, currentUserId: user?.id });
```

In the `renderHoleContent` function (around line 383), add `courseId` prop:
```tsx
<HoleHeader
  hole={holeData}
  courseId={courseId}  // Add this line
  selectedTee={selectedTee ?? undefined}
  onPrevious={nav.handlePreviousHole}
  // ... rest unchanged
/>
```

**Deliverables:**
- [x] `courseId` prop passed to HoleHeader

**Completed:**
- Added `courseId={courseId ?? undefined}` prop to HoleHeader in renderHoleContent function
- Added `courseId` to the useCallback dependency array

**Dependencies:** Step 3.1

---

## Phase 4: Settings Integration (Optional Enhancement)

### Step 4.1: Add GPS distance toggle to settings
**Status:** ✅ Complete (2026-01-23)
**Type:** Custom

**Prompt:**
Add a toggle in the app settings to enable/disable the GPS distance feature.

1. Update `src/store/settingsStore.ts` to add:
```typescript
showGpsDistance: boolean;
setShowGpsDistance: (show: boolean) => void;
```

Default to `true` (enabled).

2. Update the DistanceToPin component to check this setting:
```typescript
const { showGpsDistance } = useSettingsStore();
if (!showGpsDistance) return null;
```

3. Add toggle to settings screen (if one exists) or note for future implementation.

**Deliverables:**
- [x] Settings store updated with `showGpsDistance`
- [x] DistanceToPin respects setting

**Completed:**
- Added `showGpsDistance` boolean to SettingsState interface
- Added `setShowGpsDistance` action to interface and store
- Added default value `showGpsDistance: true` to DEFAULT_SETTINGS
- Updated DistanceToPin to check `showGpsDistance` in render logic (returns null if disabled)
- Note: Settings UI toggle can be added later to the settings screen

**Dependencies:** Step 2.1
**Notes:** This is optional - can be deferred. The feature works without it.

---

## Critical Files

### To Create
- `src/screens/onboarding/components/LocationStep.tsx` - Onboarding GPS permission step
- `src/hooks/useUserLocation.ts` - Location permission + tracking hook
- `src/components/scorecard/HoleHeader/DistanceToPin.tsx` - Distance display component

### To Modify
- `src/screens/onboarding/OnboardingScreen.tsx` - Add LocationStep to flow
- `src/hooks/index.ts` - Add useUserLocation export
- `src/components/scorecard/HoleHeader/index.ts` - Add DistanceToPin export
- `src/components/scorecard/HoleHeader/HoleHeader.tsx` - Add courseId prop, render DistanceToPin
- `src/screens/scoring/ScorecardEntryScreen/index.tsx` - Pass courseId to HoleHeader

### Reference Files (Read-only)
- `src/screens/onboarding/components/NotificationsStep.tsx` - Pattern for LocationStep
- `src/hooks/useHoleCoordinates.ts` - Existing coordinate hooks to use
- `src/hooks/usePushNotifications.ts` - Permission handling pattern reference
- `src/services/courses/coordinatesService.ts` - Distance calculation utilities
- `src/store/settingsStore.ts` - Distance unit preference (useFormattedDistance)

---

## Verification

How to verify the implementation is complete:

### Onboarding Tests
- [ ] **New user flow**: Fresh user sees 6 onboarding steps (location step appears after notifications)
- [ ] **Enable GPS**: Tap "Enable GPS" → permission prompt appears → grant → proceeds to next step
- [ ] **Skip GPS**: Tap "Maybe later" → proceeds to next step without prompt
- [ ] **Deny GPS**: Deny permission → shows "Open Settings" link → can still proceed

### Functional Tests
- [ ] **With GPS course**: Open scorecard for a round with a course that has coordinates → should see GPS icon → tap to enable → see live distance
- [ ] **Without GPS course**: Open scorecard for a round with a course without coordinates → no GPS icon shown, no permission prompt
- [ ] **Permission denied**: Deny location permission → feature hidden, scoring works normally
- [ ] **App background/foreground**: Background app during scoring → location updates pause → foreground → updates resume
- [ ] **Unit toggle**: Change distance unit in settings (m/yd) → distance display updates

### Edge Cases
- [ ] **No GPS signal**: Show loading state, auto-retry when signal acquired
- [ ] **Course with partial coordinates**: Handle holes missing green_center gracefully
- [ ] **Rapid hole navigation**: Distance updates correctly when swiping between holes quickly

### Performance
- [ ] Battery usage acceptable during 18-hole round
- [ ] No UI jank when location updates
- [ ] Clean unmount (no memory leaks from location subscription)

---

## Dependencies

**Already Installed:**
- `expo-location` (v19.0.8)
- `@react-native-async-storage/async-storage`

**Existing Hooks to Use:**
- `useDistanceToGreen(courseId, holeNumber, userLocation)` - from useHoleCoordinates
- `useHasCoordinates(courseId)` - from useHoleCoordinates
- `useFormattedDistance()` - from settingsStore

**Permissions Already Configured (app.json):**
- `NSLocationWhenInUseUsageDescription` (iOS)
- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` (Android)
