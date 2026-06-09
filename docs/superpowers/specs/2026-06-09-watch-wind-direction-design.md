# Watch Distance Screen — Wind Direction Indicator

**Date:** 2026-06-09
**Status:** Approved (design)
**Scope:** watchOS app (`ios/TheNineteenthWatch Watch App`) + RN watch bridge (`src/watch`)

## Problem

On the watch Distance screen, players can't see the wind. Wind is a key
shot-planning input, and a wrist glance is the natural moment to check it.

## Goal

Show wind on the Distance screen as a small **corner badge**: a rotating arrow +
wind speed. The arrow points **the direction the wind blows to** (downwind =
helping) and rotates **head-up** — as the player turns, it keeps pointing at the
true wind bearing relative to the way they're facing.

## Decisions (from brainstorming)

- **Layout:** corner badge first; the "faded under the distance" variant is a
  second layout we A/B on-device afterward.
- **Arrow meaning:** points the direction wind blows *to*.
- **Access:** shown to everyone with a live round (not tier-gated).
- **Speed units:** follow the distance unit — km/h when metres, mph when yards.

## Non-goals

- No on-watch weather fetch (the watch has no network). Wind comes from the phone
  snapshot.
- No changes to phone-side weather UI.
- The faded-under-distance layout is deferred to an on-device comparison; only the
  corner badge ships in this plan.

---

## Data flow

Wind rides in the `WatchSnapshot` the phone already pushes over WCSession.

### Phone — `src/watch`

1. **Type** (`types.ts`): add an optional field to `WatchSnapshot`:
   ```ts
   wind?: { speedKph: number; fromDeg: number };
   ```
   Optional so older cached snapshots and the Swift decoder stay
   backward-compatible. `fromDeg` is the meteorological "wind comes from"
   bearing (true north), exactly as Open-Meteo returns it — conversion to
   "blows to" happens at render so the wire stays in the source convention.

2. **Builder** (`snapshot.ts`): add `wind?` to `BuildSnapshotInput` and pass it
   through `buildWatchSnapshot` unchanged (omit the key when absent).

3. **Bridge** (`useWatchBridge.ts`): source wind from the existing
   `useWeather({ kind: 'current', lat, lng })` hook. lat/lng come from the
   round's course location, derived from the hole coordinates already loaded in
   the bridge (`coords`) — use the current hole's `green_center` if present, else
   the first available coord. Map the hook's `WeatherSnapshot` →
   `{ speedKph: windKph, fromDeg: windDirDeg }`, pass into `buildWatchSnapshot`,
   and add it to effect 1's dependency list so a wind change re-pushes the
   snapshot. When weather is null/unavailable, omit `wind`.

### Watch — `WatchSnapshot.swift`

Add a `WatchWind` struct and an optional `wind` property:
```swift
struct WatchWind: Codable, Equatable { let speedKph: Double; let fromDeg: Double }
...
let wind: WatchWind?   // optional → older snapshots decode fine
```

---

## Live rotation (compass)

### `LocationProvider.swift`

Extend the existing provider (already visibility-scoped via the Distance
screen's `start()/stop()`):

- Publish `@Published var heading: CLHeading?`.
- In `start()`: also `manager.startUpdatingHeading()`. In `stop()`:
  `manager.stopUpdatingHeading()`.
- Implement `locationManager(_:didUpdateHeading:)` → publish on the main queue.
- No new permission: heading rides on the existing location authorization.

Use `trueHeading` when valid (`>= 0`), else `magneticHeading`. Open-Meteo's
bearing is true-north referenced, so true heading keeps the math consistent.

### Arrow angle helper

A pure function (mirrored in Swift, unit-tested):
```
arrowDegrees(fromDeg, heading) = normalize360(fromDeg + 180 - heading)
```
- `+180` converts "wind from" → "wind blows to".
- `- heading` makes it head-up: screen "up" (0°) = the way the user faces, so the
  arrow rotates as they turn. 0° points up, 90° points right (clockwise).

Damp compass jitter with a SwiftUI `.animation(.easeOut, value:)` on the rotation
(and/or ignore sub-degree deltas).

---

## Visual — corner badge (`DistanceView.swift`)

In each `HoleDistancePage`, overlay a small badge in the **top-right**:

- An SF Symbol arrow (e.g. `arrow.up`) rotated by `arrowDegrees`, plus the wind
  speed to its right.
- Tinted secondary/low-emphasis so it never competes with the big distance
  number. Compact font (caption2).
- Speed: `Int(round(speedKph))` km/h when `unit == metres`; `Int(round(speedKph *
  0.621371))` mph when `unit == yards`. Show the unit label small or omit per
  fit — decide on-device.

Layout via a `ZStack`/`.overlay(alignment: .topTrailing)` so it doesn't disturb
the existing centered distance VStack.

### Degradation

- `snapshot.wind == nil` → badge hidden entirely.
- `wind` present but no `heading` yet (older watch with no compass, or heading not
  acquired) → show speed with the arrow oriented **north-up** (`arrowDegrees`
  computed with `heading = 0`) and a small `N` marker so it isn't mistaken for
  head-up. Refine on-device.

---

## Files touched

- `src/watch/types.ts` — `wind?` on `WatchSnapshot`.
- `src/watch/snapshot.ts` — pass `wind?` through builder.
- `src/watch/useWatchBridge.ts` — source wind from `useWeather`, add to deps.
- `src/watch/windArrow.ts` (new) — pure `arrowDegrees` + `normalize360` helper.
- `src/watch/__tests__/windArrow.test.ts` (new) — helper tests.
- `src/watch/__tests__/...snapshot test` — extend for `wind` passthrough.
- `ios/.../WatchSnapshot.swift` — `WatchWind` + optional `wind`.
- `ios/.../LocationProvider.swift` — heading updates.
- `ios/.../DistanceView.swift` — corner badge + Swift arrow-angle math.

## Testing

- Unit: `arrowDegrees` (the +180, the head-up subtraction, wrap at 0/360,
  negative normalization); snapshot builder wind passthrough; existing 33 watch
  tests stay green.
- On device: arrow points correctly vs a known wind, rotates smoothly as the user
  turns, speed/units correct, badge hides when wind absent. Then A/B the
  faded-under-distance layout.

## Risks / notes

- Compass accuracy varies; expect some jitter (mitigated by animation). Series 5+
  have a compass; older watches fall back to north-up.
- Wind freshness is bounded by the phone's weather cache (`CACHE_TIMES.STATIC`),
  which is fine for golf — wind is shot-planning context, not real-time telemetry.
