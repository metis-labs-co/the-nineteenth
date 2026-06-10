# Wear OS Companion — Spec 3d-ii: Tile + complication

**Date:** 2026-06-10
**Status:** Approved (design)
**Scope:** The Wear glanceable surfaces — a Tile and a watch-face complication.
Final piece of Spec 3d / the Wear companion. Completes feature parity with the
Apple Watch app.

## Context

iOS has a complication that reads shared round state (`WatchSharedState`, an
App-Group UserDefaults) and shows the active round + "Hole X of N", tapping to
open the app. Wear's analogs are a **Tile** (the prominent swipe-from-watch-face
card) and a **complication** (watch-face data source). Both read a persisted
`WearSharedState` written by the app.

## Decisions (from brainstorming)

- Build both surfaces (Tile + complication).
- Content = round status (competition + "Hole X of N" + hole-progress), tap to
  open. No distance (tiles/complications run outside the app's GPS session).

## Components

### `WearSharedState` — `wear/.../glance/WearSharedState.kt`

- SharedPreferences-backed store: `active`, `hole`, `holeCount`, `name`.
  `write(state)` / `read()`. Analog of iOS `WatchSharedState`.

### `WearDataRepository` hook

- On each decoded snapshot: write `WearSharedState(active=true, hole, holeCount,
  name)` and request refreshes (mirrors iOS `publishComplicationState`):
  - `TileService.getUpdater(context).requestUpdate(RoundTileService::class.java)`
  - `ComplicationDataSourceUpdateRequester.create(context, component)
    .requestUpdateAll()`

### `RoundTileService` — `wear/.../glance/RoundTileService.kt`

- `TileService` (androidx.wear.tiles + protolayout). `onTileRequest` builds a
  single-entry timeline: competition name + "Hole X of N", with a `Clickable`
  `LaunchAction` → `MainActivity`. No active round → "No round · Start on your
  phone". `onTileResourcesRequest` returns empty (text-only).

### `RoundComplicationService` — `wear/.../glance/RoundComplicationService.kt`

- `ComplicationDataSourceService` (watchface-complications-data-source-ktx).
  Supports `SHORT_TEXT` ("H7"), `LONG_TEXT` ("{name} · Hole X of N"),
  `RANGED_VALUE` (hole/holeCount progress). `getComplicationData` reads
  `WearSharedState`; sets a tap `PendingIntent` → `MainActivity`;
  `getPreviewData` for the picker.

### Manifest / Gradle

- Register `RoundTileService` (permission `BIND_TILE_PROVIDER`, intent-filter
  `androidx.wear.tiles.action.BIND_TILE_PROVIDER`, preview meta-data) and
  `RoundComplicationService` (permission `BIND_COMPLICATION_PROVIDER`,
  intent-filter, `SUPPORTED_TYPES` + `UPDATE_PERIOD_SECONDS` meta-data).
- Add `androidx.wear.tiles:tiles`, `androidx.wear.protolayout:protolayout`,
  `androidx.wear.protolayout:protolayout-material`,
  `androidx.wear.watchface:watchface-complications-data-source-ktx` (versions
  aligned at build time).

## Data flow

`snapshot` → `WearDataRepository` writes `WearSharedState` + requests refresh →
`RoundTileService` / `RoundComplicationService` read `WearSharedState` → render.
Independent of the app being open (they run in their own process).

## Testing

**Verifiable here:**
- `:wear:assembleDebug` builds; both services registered (`adb shell dumpsys
  package` / `cmd package query-services`); existing 16 Kotlin tests stay green.

**Manual / device (deferred):**
- Adding the Tile to the carousel and the complication to a watch face to see
  them render — not CLI-drivable on the emulator (same posture as GPS/compass).

## Risks

- ProtoLayout's verbose API + version alignment with the wear stack.
- Tile/complication manifest correctness (bind permissions / intent filters).
- Live rendering not emulator-CLI-verifiable.

## Out of scope

Nothing further — this completes the Wear companion's screen/glance parity. Any
remaining items are the standing device-only verifications and EAS/release work
(embedded delivery, signing, CI prebuild-with-plugin).
