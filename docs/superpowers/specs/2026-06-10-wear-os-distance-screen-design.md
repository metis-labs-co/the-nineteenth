# Wear OS Companion — Spec 3a: Nav scaffold + Distance screen

**Date:** 2026-06-10
**Status:** Approved (design)
**Scope:** First slice of the Wear screens (Spec 3). Builds on Spec 1
(module/plugin) and Spec 2 (data bridge). Part of the multi-spec effort toward
Apple Watch parity.

## Context

Spec 2 delivered `WearDataRepository` (a `StateFlow<WatchSnapshot?>` from the
phone's Data Layer push, plus `sendNavigate` / `sendScoreWrite`). Spec 3a ports
the iOS `DistanceView` onto Wear Compose and stands up the navigation scaffold the
later screens (Score, Leaderboard, menu) will slot into.

## Spec 3 sub-decomposition

- **3a (this doc):** nav scaffold + Distance (hole swipe, GPS distance-to-green,
  wind/compass badge).
- **3b:** Score entry (player picker, gross stepper, stat sections, score writes).
- **3c:** Leaderboard + Now-Playing/menu.
- **3d:** keep-alive (Wear Health Services / foreground service) + tile/complication.

## Goal (3a)

On a live round the watch opens to a Distance screen that pages between holes
(two-way synced with the phone), shows distance-to-green from the watch's own GPS,
and a wind arrow that points the way the wind blows to — matching the iOS
behaviour. A minimal nav scaffold hosts Distance + a stub route for later screens.

## Components

### Navigation scaffold — `wear/.../ui/WearApp.kt`

- `SwipeDismissableNavHost` (androidx.wear.compose.navigation) with routes
  `distance` (home) and a stub `menu` (placeholder list, filled in 3c).
- No snapshot → "waiting for phone…" placeholder (unchanged).
- Swipe-to-dismiss returns to `distance`.

### Distance screen — `wear/.../ui/DistanceScreen.kt`

Port of iOS `DistanceView`:
- Wear `HorizontalPager` (androidx.wear.compose.foundation.pager) over
  `snapshot.holes`; page content per hole: "Hole N · Par P", big distance to
  centre, "to centre", front/back row, wind corner badge (`WindIndicator`).
- Two-way hole sync, mirroring iOS:
  - inbound: `LaunchedEffect(snapshot.currentHole)` → `pagerState.animateScrollToPage`
  - outbound: observe `pagerState.currentPage` → if the paged hole differs from
    `snapshot.currentHole`, `repository.sendNavigate(hole)` (echo-guarded by the
    `!=` check, same as iOS).
- Distances computed from `WearLocationProvider` + the hole's green coords; "—"
  when no accurate fix / no coords / no unit.
- Wind badge: `fromDeg` from `snapshot.wind`, heading from `HeadingProvider`;
  north-up "N" fallback when heading is null; hidden when `wind == null`.

### Kotlin ports (small, unit-tested)

- `DistanceEngine.kt` — `metres(a,b)` haversine (R=6_371_000),
  `display(metres, unit)` (×1.09361 for yards, rounded Int), `isAccurate(acc)`
  (`acc in 0.0..20.0`). Parity test against `fixtures/distance-vectors.json`.
- `WindArrow.kt` — `normalize360`, `windArrowDegrees(fromDeg, heading)` =
  `normalize360(fromDeg + 180 - heading)`, `windSpeedText(kph, unit)`. Test
  ported from `src/watch/__tests__/windArrow.test.ts`.

### Sensors / location providers

- `WearLocationProvider` — wraps `FusedLocationProviderClient`
  (play-services-location); `StateFlow<Location?>`; `start()/stop()` tied to the
  Distance screen's lifecycle (battery). Requires `ACCESS_FINE_LOCATION`.
- `HeadingProvider` — `SensorManager` `TYPE_ROTATION_VECTOR` →
  `getRotationMatrixFromVector` → `getOrientation` azimuth in degrees;
  `StateFlow<Float?>`; lifecycle-scoped; no permission. Null when the sensor is
  absent (→ north-up wind fallback).

### Permissions

- Manifest: `ACCESS_FINE_LOCATION` (+ `ACCESS_COARSE_LOCATION`).
- Runtime: request fine location when the Distance screen first needs it (Compose
  permission flow / Activity result). Distances show "—" until granted.

### Gradle (wear module)

Add `com.google.android.gms:play-services-location`,
`androidx.wear.compose:compose-navigation:1.4.0`. (Pager is in the already-present
`compose-foundation` 1.4; `lifecycle-runtime-compose` already added.)

## Data flow

`WearDataRepository.snapshot` (holes, currentHole, unit, wind) + location +
heading → `DistanceScreen`. Outbound hole changes → `sendNavigate`. JSON/state
already proven in Spec 2; 3a only consumes it.

## Testing

**Verifiable here (emulator/JVM):**
- `:wear:assembleDebug` builds; `:wear:testDebugUnitTest` runs
  `DistanceEngine`/`WindArrow` tests (distance parity vs shared fixtures; wind
  angle math).
- Layout render on the Wear emulator via the DEBUG preview inject (sample
  snapshot with holes + green coords).

**Device-only (deferred, flagged):**
- Live GPS distance (emulator GPS must be faked) and live compass rotation (Wear
  emulator typically lacks `TYPE_ROTATION_VECTOR` → north-up fallback shown).
- Live two-way hole sync with a paired phone (needs the paired setup from Spec 2).

## Risks

- Wear Compose pager API surface in 1.4 (confirm import path at build time).
- FusedLocation / rotation-vector availability on the emulator (degraded → rely
  on unit tests + fallbacks).
- Runtime location permission flow on Wear.

## Out of scope (3a)

Score entry, leaderboard, menu contents, keep-alive, tile. Spec 3b–3d.
