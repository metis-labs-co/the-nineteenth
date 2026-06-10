# Wear OS Companion — Spec 3d-i: Keep-alive (foreground service)

**Date:** 2026-06-10
**Status:** Approved (design)
**Scope:** Keep the Wear app/GPS alive during a round — the analog of the iOS
`WorkoutController`. First half of Spec 3d (3d-ii = tile + complication). Toward
Apple Watch parity.

## Context

iOS keeps the watch app foregrounded during a round via an `HKWorkoutSession`
(`WorkoutController`, started when a snapshot goes live and stopped when it
clears). Wear's equivalent is a foreground service with an Ongoing Activity.

## Decisions (from brainstorming)

- Keep-alive done first, separately from tile/complication (3d-ii).
- Mechanism: foreground service + Ongoing Activity (not Health Services
  ExerciseClient) — lighter, standard, keeps GPS alive, gives a return-to-app
  chip.

## Components

### `RoundKeepAliveService` — `wear/.../keepalive/RoundKeepAliveService.kt`

- A foreground `Service`. On `onStartCommand`:
  - Reads `name` / `hole` / `holeCount` from intent extras.
  - Builds a `NotificationCompat` (on a dedicated low-importance channel) titled
    with the competition and "Hole X of N", content intent → `MainActivity`.
  - Wraps it with `androidx.wear.ongoing.OngoingActivity` (status "Hole X") so it
    surfaces as a watch-face chip / in the ongoing surface.
  - `startForeground(...)`.
- `START_STICKY`; `stopSelf()` semantics via `stopService` from the app.
- `foregroundServiceType="location"` (GPS stays warm for distance).

### Trigger — `MainActivity`

Mirror the iOS `WorkoutController` lifecycle (keyed off snapshot presence):
- Snapshot non-null → `startForegroundService(intent + round extras)`. Re-issued
  when the hole/name changes so the chip updates.
- Snapshot null → `stopService`.
- Request `POST_NOTIFICATIONS` at runtime (API 33+); the service still runs if
  denied, just without a visible chip.

### Manifest / permissions

- `<uses-permission>`: `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`,
  `POST_NOTIFICATIONS`.
- `<service android:name=".keepalive.RoundKeepAliveService"
  android:foregroundServiceType="location" android:exported="false"/>`.
- Notification channel created on first use (API 26+).

### Gradle

Add `androidx.wear:wear-ongoing`. NotificationCompat / core-ktx are already on the
classpath transitively.

## Data flow

`WearDataRepository.snapshot` → `MainActivity` → service intent extras →
Ongoing Activity notification. No bridge changes.

## Testing

**Verifiable here:**
- `:wear:assembleDebug` builds; existing 16 Kotlin tests stay green.
- Emulator: with a round live (preview inject + granted POST_NOTIFICATIONS),
  confirm the service runs and the ongoing notification is posted
  (`adb shell dumpsys notification` / activity services), and its tap target
  opens the app.

**Deferred (device-only):**
- That it genuinely keeps the app/GPS alive across screen-off / doze — emulators
  don't doze realistically (same posture as GPS/compass throughout).

## Risks

- Wear foreground-service type/permission nuances (location FGS started from a
  foreground activity is allowed).
- `POST_NOTIFICATIONS` runtime flow on Wear.
- Ongoing Activity API surface.

## Out of scope

Tile + complication (3d-ii); Health Services exercise semantics.
