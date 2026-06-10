# Wear OS Companion — Spec 3b: Score entry

**Date:** 2026-06-10
**Status:** Approved (design)
**Scope:** The Wear Score screen — watch-side producer of `WatchScoreWrite`.
Builds on Spec 2 (bridge) and 3a (nav scaffold + Distance). Toward Apple Watch
parity.

## Context

The phone already receives and applies score writes: `wear-bridge` emits
`onMessage` for `/score-write` → `createWearTransport().onMessage` →
`useWatchBridge` → `applyWatchScoreWrite` (dedup by `clientWriteId`,
`allowedPlayerIds`, `baseRev` supersede check, stat-flag gating), then acks via
`/ack`. Spec 3b is the watch-side UI that produces those writes and reflects the
ack — a port of the iOS `ScoreView`.

## Decisions (from brainstorming)

- Full Score screen (gross + Par/Pickup + player picker + ack indicator + all
  stat sections), matching iOS.
- Reached via a DEBUG route override; the production entry point (the menu) lands
  in Spec 3c.

## Components

### Score-write models + builder — `wear/.../data/`

- `@Serializable WatchScoreStat`, `WatchHoleScore`, `WatchAck` mirroring
  `src/watch/types.ts`.
- Promote `WatchSnapshot.scores` from `Map<String, JsonElement>` →
  `Map<String, WatchHoleScore>` so the screen pre-fills existing scores. (Update
  the Spec-2 decode test accordingly.)
- `ScoreWriteBuilder.build(...)` → `WatchScoreWrite` JSON via `buildJsonObject`,
  handling the `strokes: Int | "pickup"` union explicitly. Fields:
  `clientWriteId` (UUID), `ts` (epoch seconds), `baseRev` (snapshot.rev),
  `roundId`, `hole`, `playerId`, optional `stat` (only flag-enabled fields).

### Ack / Saved indicator — `WearDataRepository`

- Decode `/ack` (`WatchAck { clientWriteId, status, rev }`) → `saveState:
  StateFlow<SaveState>` (`Idle | Saved | Failed`). Optimistic `Saved` on send;
  `Failed` on `unauthorized`/`error`; auto-reset to `Idle` after ~1.5 s. Mirrors
  the iOS `ConnectivityClient.saveState`.

### ScoreScreen — `wear/.../ui/ScoreScreen.kt`

- `HorizontalPager` over `snapshot.holes`, two-way synced with the phone
  (`sendNavigate` out / `currentHole` in, echo-guarded) — same as Distance.
- Per-hole vertical scroll (`ScalingLazyColumn`):
  - Player picker (only when `pairPlayers.size > 1`).
  - Gross: "Hole N · Par P", `−` / value / `+` stepper, `Par` and `Pick up`
    quick actions.
  - Saved/Retry indicator from `saveState`.
  - Stat sections, each gated by `statFlags` (exactly the iOS gating):
    - putts stepper (`putts`)
    - fairway segment (`fairways`; 5-way L/Sh/✓/Lo/R when `fairwayDirection`,
      else hit/miss) — only for par ≥ 4
    - green segment (`gir`; directional when `greenDirection`)
    - bunker stepper (`bunker`)
    - penalties multi-select (`penalties`: water/ob/lateral/lost_ball)
- Pre-fills from `snapshot.scores["{playerId}:{hole}"]`. Any edit →
  `ScoreWriteBuilder` → `repository.sendScoreWrite`. Commit semantics mirror iOS
  `commit()`: a write is sent only once a stroke value exists; `Pick up` sends
  `"pickup"`.
- Reusable controls: `Stepper`, `SegmentSection` (single-select),
  `MultiSelectSection` — ports of the iOS components.

### Navigation

- Add a `score` route to the `SwipeDismissableNavHost`. In DEBUG, the start
  destination points at `score` (via the existing preview flag) so it is testable
  on the emulator now. The real entry point (menu) is Spec 3c.

## Data flow

`snapshot` (holes, currentHole, pairPlayers, statFlags, scores) + `saveState` →
`ScoreScreen`. Edits → `ScoreWriteBuilder` → `repository.sendScoreWrite` →
(phone) `applyWatchScoreWrite` → `/ack` → `saveState`.

## Testing

**Verifiable here:**
- Kotlin unit tests: `ScoreWriteBuilder` (strokes Int vs `"pickup"`; stat fields
  present/omitted; required ids present) and `WatchAck` decode. These pin the
  wire contract to `types.ts`.
- `:wear:assembleDebug` + `:wear:testDebugUnitTest` pass.
- Emulator render of the Score screen via the DEBUG route with a preview snapshot
  (pair players + stat flags so sections appear).

**Deferred (device/paired):**
- Live send → `applyWatchScoreWrite` → ack round-trip with a paired phone.

## Risks

- `strokes` union serialization — handled by the explicit `buildJsonObject`.
- Fitting gross + stat sections on a round screen — `ScalingLazyColumn` scroll.
- Live round-trip unverifiable in this environment.

## Out of scope (3b)

Menu entry point + contents (3c), Leaderboard (3c), keep-alive/tile (3d).
