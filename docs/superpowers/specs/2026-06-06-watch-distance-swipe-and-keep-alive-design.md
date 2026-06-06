# Watch Distance Screen — Swipe Holes & Keep App Alive

**Date:** 2026-06-06
**Status:** Approved
**Scope:** watchOS app only (`ios/TheNineteenthWatch Watch App`)

## Problem

On-course testing of the watchOS app surfaced two friction points on the Distance
screen:

1. There's no way to change holes from the Distance screen — you have to leave it.
2. watchOS returns to the clock face after a short inactivity timeout, so the app
   closes often and quickly during a round.

## Goals

- Swipe left/right on the Distance screen to move between holes.
- Keep the app foregrounded for the duration of a live round.

## Non-goals

- Any change to phone-side scoring, pairing, or distance logic.
- Changing the Score screen (it already swipes holes; we mirror it).

---

## Feature 1 — Swipe between holes on the Distance screen

Mirror the existing, proven pattern in `ScoreView.swift` so Distance and Score
behave identically and stay in sync.

### Behavior

- Horizontal swipe pages through holes.
- Swiping changes the active hole **everywhere** (phone + watch Score screen),
  not just a local preview. The shared `currentHole` concept already drives both
  screens; swiping calls `connectivity.navigate(toHole:)`.
- Phone-initiated hole changes are followed on the watch (two-way sync).

### Implementation (`DistanceView.swift`)

Refactor `DistanceView` into a `TabView` container plus a per-hole page:

- `DistanceView` holds `@State holeIndex` and `@State didInitHole`, renders
  `TabView(selection: $holeIndex)` with `.tabViewStyle(.page)` over
  `snapshot.holes`, tagged by enumeration index (matches `ScoreView`).
- Extract current rendering into `private struct HoleDistancePage` taking a
  `hole: WatchHole`, plus `connectivity` and `location`. The `distance(to:)`
  helper moves into the page.
- `onAppear`: `location.start()`; initialize `holeIndex` to the live hole once.
- `onDisappear`: `location.stop()` (on the container, so paging doesn't churn GPS).
- `onChange(of: snapshot.currentHole)`: follow phone navigation → set `holeIndex`.
- `onChange(of: holeIndex)`: if the paged hole differs from `currentHole`, call
  `connectivity.navigate(toHole:)`. The `!=` guard prevents echo loops (same
  guard `ScoreView` uses).
- Empty state (`No round`) keeps the `Distance` navigation title.

### Risk

Low. Pure SwiftUI reusing an in-app pattern. No new permissions or native config.

---

## Feature 2 — Keep the app open during a round (HealthKit workout session)

A running `HKWorkoutSession` keeps a watch app foregrounded and wakes back to the
app (not the clock) on wrist raise — the standard mechanism golf GPS apps use.

### Component: `WorkoutController` (new file)

`@MainActor final class WorkoutController: NSObject, ObservableObject`

- Holds `HKHealthStore`, optional `HKWorkoutSession`, optional `HKLiveWorkoutBuilder`,
  `@Published private(set) var isActive`.
- `start()`: request HealthKit authorization once; on success create
  `HKWorkoutConfiguration` with `activityType = .golf`, `locationType = .outdoor`;
  create session + builder; `session.startActivity(with:)` and
  `builder.beginCollection(withStart:)`.
- `stop()`: `session.end()` and `builder.endCollection` / `finishWorkout`.
- Conforms to `HKWorkoutSessionDelegate` (+ builder delegate) minimally; failures
  are logged and swallowed.
- If authorization is denied or HealthKit is unavailable, do nothing — the app
  keeps working normally, it just won't stay foregrounded. Never blocks the UI.

### Wiring (`TheNineteenthWatchApp.swift` / `RootView`)

- Own a `@StateObject WorkoutController`.
- Start when a round goes live and stop when it ends, keyed off snapshot presence:
  `.onChange(of: connectivity.snapshot != nil) { _, live in live ? start() : stop() }`,
  plus an initial start if a snapshot is already present on launch.

### Native configuration

The watch target uses `GENERATE_INFOPLIST_FILE = YES` (no physical Info.plist;
keys come from `INFOPLIST_KEY_*` build settings) and already references
`TheNineteenthWatch Watch App/TheNineteenthWatch Watch App.entitlements`.

- **Entitlements:** add `com.apple.developer.healthkit` (bool `true`) to the watch
  entitlements file (keeps existing App Group).
- **Usage strings:** add `INFOPLIST_KEY_NSHealthShareUsageDescription` and
  `INFOPLIST_KEY_NSHealthUpdateUsageDescription` to both Debug and Release watch
  build configs in `project.pbxproj` (these keys are in the generated-plist
  allowlist).
- **Background mode:** `WKBackgroundModes = [workout-processing]` is array-typed
  and not reliably settable via `INFOPLIST_KEY_*`. Add a small supplemental
  `Info.plist` for the watch target containing just that key and set
  `INFOPLIST_FILE` to it while keeping `GENERATE_INFOPLIST_FILE = YES` (Xcode
  merges generated keys on top). Verify the built plist actually contains the key;
  fallback is a full manual Info.plist with `GENERATE_INFOPLIST_FILE = NO`.
- HealthKit.framework auto-links via Swift `import HealthKit`.

### Risks / things to verify at build time

1. **Provisioning:** the App ID `com.the.nineteenth.golf.watchkitapp` needs the
   HealthKit capability. Automatic signing usually handles this; an EAS production
   build may need the capability enabled in the Apple Developer portal / EAS
   credentials.
2. **Supplemental plist merge:** confirm `WKBackgroundModes` lands in the final
   built Info.plist; fall back to a full manual plist if not.
3. **Health logging:** each round records a "golf workout" in the Health app.
   Accepted tradeoff (confirmed with owner).

---

## Files touched

- `ios/TheNineteenthWatch Watch App/DistanceView.swift` (refactor)
- `ios/TheNineteenthWatch Watch App/WorkoutController.swift` (new)
- `ios/TheNineteenthWatch Watch App/TheNineteenthWatchApp.swift` (wire workout)
- `ios/TheNineteenthWatch Watch App/TheNineteenthWatch Watch App.entitlements` (HealthKit)
- `ios/TheNineteenthWatch Watch App/Info.plist` (new supplemental — WKBackgroundModes)
- `ios/TheNineteenth.xcodeproj/project.pbxproj` (INFOPLIST_KEY usage strings + INFOPLIST_FILE)

## Testing

- Build the watch scheme; confirm it compiles and the generated Info.plist
  contains `WKBackgroundModes` and HealthKit usage strings.
- On device/simulator: start a round → Distance screen swipes holes, phone hole
  follows and vice versa; GPS distance still updates.
- On device: confirm the app stays foregrounded through wrist-down/up cycles
  during a live round, and that a workout appears in Health.
