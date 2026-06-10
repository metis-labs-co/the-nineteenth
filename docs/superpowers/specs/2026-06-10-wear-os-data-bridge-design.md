# Wear OS Companion — Spec 2: Phone↔Wear Data Bridge

**Date:** 2026-06-10
**Status:** Approved (design)
**Scope:** The data layer between the phone (React Native) and the Wear OS app.
Builds on Spec 1 (the `:wear` module + config plugin). Part of the multi-spec
Wear OS effort toward Apple Watch parity.

## Goal

Round-trip proof: the phone pushes a real `WatchSnapshot` → the watch decodes it
and shows live data (competition name + current hole) instead of "waiting for
phone…"; the watch sends a message back → the phone receives it. The existing
platform-agnostic `src/watch` pipeline (snapshot building, score writes, wind,
leaderboard) is reused unchanged — only a new transport and the Wear-side client
are added. The real Distance/Score/Leaderboard screens are Spec 3+.

## Architecture — three units

### 1. Phone-side local Expo module — `modules/wear-bridge/`

A local Expo module (autolinked, lives in the repo, survives prebuild). Android
implementation mirrors the iOS `ConnectivityClient`:
- `updateData(json: String)` → `DataClient.putDataItem("/snapshot", …)`, storing
  the JSON plus the snapshot `rev` (so identical-looking payloads still trigger a
  data-changed event); `setUrgent()`.
- `sendMessage(json: String)` → `MessageClient.sendMessage(node, "/ack", bytes)`
  to all connected nodes.
- Emits an `onMessage` JS event from a `MessageClient.OnMessageReceivedListener`
  for watch→phone paths (`/score-write`, `/navigate`).
- `isSupported()` reflecting Play Services availability.
- iOS: no-op (iOS continues to use `react-native-watch-connectivity`).

### 2. TS transport — `src/watch/transport.ts`

- `createWearTransport(): WatchTransport` over the `wear-bridge` module, with the
  same try/catch guard as iOS so Expo Go / missing-module falls back to the
  no-op transport. Mapping:
  - `updateContext(s)` → `WearBridge.updateData(JSON.stringify(s))`
  - `onMessage(h)` → subscribe to `onMessage`, parse JSON, forward when
    `!isWatchNavigate`
  - `onNavigate(h)` → subscribe, forward when `isWatchNavigate`
  - `sendAck(a)` → `WearBridge.sendMessage(JSON.stringify(a))`
- `createWatchTransport(): WatchTransport` — platform dispatcher: iOS →
  `createWatchConnectivityTransport()`, Android → `createWearTransport()`, else
  `createNullTransport()`.
- `useWatchBridge` calls `createWatchTransport()` instead of the iOS factory
  directly. **iOS behaviour is unchanged.**

### 3. Wear-side data client — `wear/`

- `WearDataRepository`: registers a `DataClient.OnDataChangedListener` for
  `/snapshot`, decodes JSON → `WatchSnapshot`, exposes `StateFlow<WatchSnapshot?>`.
  Sends writes/navigate via `MessageClient`; receives `/ack`.
- Kotlin `@Serializable` model classes mirroring `src/watch/types.ts`
  (kotlinx.serialization, `Json { ignoreUnknownKeys = true }`). Full model now —
  Spec 3 needs it.
- UI: `WearApp` renders competition name + "Hole {currentHole}" when a snapshot
  is present, else the existing placeholder.
- Gradle (added to the `wear` module): `play-services-wearable`,
  `org.jetbrains.kotlinx:kotlinx-serialization-json`, and the
  `org.jetbrains.kotlin.plugin.serialization` plugin — the latter added to the
  root buildscript classpath by the config plugin, the same way the Compose
  compiler plugin already is.

## Data flow

```
phone (RN)                         watch (Wear)
 buildWatchSnapshot ──updateData──▶ DataClient "/snapshot" ──▶ StateFlow ──▶ UI
 onMessage  ◀──MessageClient "/score-write","/navigate"──── user actions
 sendAck ──MessageClient "/ack"──▶ receive ack
```

JSON wire format is identical to iOS (same `buildWatchSnapshot` output);
applicationId already matches across phone and wear (Spec 1) so the Data Layer
treats them as the same app.

## Wire paths

- `/snapshot` — DataItem, phone→watch latest state (DataMap: `json`, `rev`).
- `/ack` — message, phone→watch.
- `/score-write`, `/navigate` — messages, watch→phone.

## Testing

**Verifiable in this environment:**
- `./gradlew :wear:assembleDebug` and the phone module compile.
- TS: `tsc` + a transport unit test (dispatcher selection; mapping with a mocked
  `wear-bridge`).
- Kotlin: a unit test decoding a representative snapshot JSON into the model
  (asserts field parity with the TS shape).
- A temporary **"inject sample snapshot"** dev path on the watch (DEBUG only) so
  the decoded data is visible rendering on the Wear emulator — proves
  model + UI without a paired phone. Removed before the feature is considered
  done (like the wind demo harness).

**Deferred (needs a paired setup):**
- Live cross-device round-trip — RN app on an Android **phone** emulator paired
  with the **wear** emulator via Data Layer bridging. Flagged as a device check,
  consistent with how compass/GPS/keep-alive are treated. The full RN Android
  build is also large; not attempted here.

## Risks

- Cross-device round-trip unverifiable in this environment (above).
- Data Layer node/capability discovery; resolved by the matching applicationId.
- kotlinx.serialization model drift vs `types.ts` — mitigated by the decode unit
  test and `ignoreUnknownKeys`.

## Out of scope (Spec 2)

Real screens, wind/compass, scoring UI, keep-alive, tile, embedded Play delivery.
All Spec 3+.
