# Watch Score Screen — Blank Default + Synced Hole Navigation

**Date:** 2026-06-03
**Branch:** feature/apple-watch-companion
**Status:** Design approved, pending spec review

## Problem

Two issues on the Apple Watch score-entry screen:

1. **Par makers never get saved.** `loadExisting()` pre-fills the gross stepper with the hole's par (`strokes = existing?.strokes ?? hole.par`), and the watch only sends a write when the user taps something. A player who makes par sees "par" already shown, taps nothing, and **no score is ever recorded**. The default should be blank ("—") so any input is an explicit action that triggers the save.

2. **No hole navigation.** The watch only ever shows the phone's current hole. There's no way to move between holes from the wrist. The user wants to **swipe horizontally between holes**, and (decision) have it **stay in sync with the phone's score screen**.

## Decisions (from brainstorming)

- **Blank default:** the gross value defaults to "—"; the first explicit input (`+`, `Par`, or `Pick up`) records the score.
- **Hole navigation axis:** horizontal swipe = holes (currently unused; players use vertical paging today).
- **Sync model:** watch hole navigation is **kept in sync with the phone** (bidirectional), not independent.
- **Player axis:** a **compact player picker at the top** of each hole page replaces vertical player-paging; hidden when the user only scores themselves.

## Feasibility (confirmed in code)

- `WatchHoleScore.strokes` is already `Int?`, so "not entered" is representable.
- The phone's `updatePlayerHoleScore(playerId, hole, updates)` (`scoreUpdateSlice.ts:173`) accepts **any** hole number and persists it.
- `buildWatchSnapshot` flattens **every** pair player's per-hole scores into the snapshot's top-level `scores` map and carries all `holes`, so the watch can prefill/score any hole.
- The phone's score screen reads `currentHole` + `setCurrentHole` from `scorecardStore`, so calling `setCurrentHole(N)` from the bridge moves the phone screen and (via Effect 1's `currentHole` dependency) pushes a confirming snapshot.

## Design

### A. Score defaults to "—" (save on first input)

- The gross stroke state becomes optional (`Int?`, `nil` = not entered). `loadExisting()` sets it to `existing?.strokes` only — **no par fallback**. Display shows "—" when `nil`.
- Button behaviour from blank:
  - `+` → 1 (and commit)
  - `−` → no-op (nothing to decrement)
  - `Par` → par (and commit)
  - `Pick up` → pickup (and commit)
- Once a value exists, behaviour is unchanged (`−` floors at 1; every change commits).
- No change to the auto-save mechanism — it already fires on tap. The fix is purely that the screen no longer pre-fills par, so a recorded par now requires (and gets) an explicit tap.

### B. Horizontal hole navigation, synced with the phone

- `ScoreView` outer container becomes a **horizontal paged `TabView`** over `snapshot.holes`, bound to a `@State holeIndex` initialized from `snapshot.currentHole`.
- **Watch → phone:** on user swipe, optimistically update `holeIndex` and send a navigate message `{ type: "navigate", hole: N }`. Use `sendMessage` when the session is reachable, else `transferUserInfo` (guaranteed-delivery fallback).
- **Phone receive:** the transport routes a message with `type === "navigate"` to a new `onNavigate` handler (NOT the score-write path). `useWatchBridge` subscribes and calls `setCurrentHole(hole)`. That moves the phone's score screen and, because `currentHole` is an Effect 1 dependency, pushes a new snapshot with the updated `currentHole`.
- **Phone → watch:** when a snapshot arrives whose `currentHole` differs from `holeIndex`'s hole, the watch updates `holeIndex` to follow. (Phone-initiated navigation, or the round advancing, moves the watch.)
- **Loop safety:** a watch-initiated nav returns as a snapshot whose `currentHole` matches the already-updated `holeIndex` → no further change. Last-write-wins on simultaneous changes (acceptable for a tethered companion).
- Each hole page scores `holes[holeIndex].hole`, prefilled from `snapshot.score(selectedPlayerId, hole)`.

### C. Player picker at top

- The vertical player-paging `TabView` is removed (horizontal is now holes). `selectedPlayerIndex` becomes a `ScoreView`-level `@State` (persists as you swipe holes — you keep marking the same player).
- Each hole page renders, top to bottom: a compact player control (segmented/cycle over `pairPlayers`, **hidden when `pairPlayers.count <= 1`**), then the gross section + stat sections in a vertical `ScrollView`.
- Switching player reloads the current hole page's entry for the newly selected player (`onChange(of: selectedPlayerIndex)` → reload).

## Data Flow

```
Swipe hole on watch
  → holeIndex updates (optimistic)
  → ConnectivityClient.navigate(toHole:) sends {type:"navigate", hole:N}
Phone (useWatchBridge)
  → transport.onNavigate → setCurrentHole(N)
  → phone score screen follows; Effect 1 re-pushes snapshot (currentHole=N)
Watch
  → snapshot.currentHole == holeIndex's hole → no jump (confirmed)

Phone changes hole (Next Hole / Quick View)
  → setCurrentHole → snapshot pushed (currentHole changed)
  → watch holeIndex follows

Enter a score on any hole
  → write targets holes[holeIndex].hole (existing auto-save path)
  → phone updatePlayerHoleScore(playerId, hole, …) persists it
```

## Message Protocol

- **Score write** (existing): `WatchScoreWrite` — has `clientWriteId`, `strokes`, etc. Routed to the score-write handler.
- **Navigate** (new): `WatchNavigate = { type: 'navigate'; hole: number }`. Routed to `onNavigate`.
- The transport's inbound listener discriminates by the `type` field: messages with `type === 'navigate'` go to nav subscribers; everything else (score writes) to `onMessage`. A score write has no `type` field, so existing behaviour is preserved.

## Edge Cases

- **Nav vs score-write disambiguation:** a navigate message has no `clientWriteId`; routing is by the explicit `type` field so a nav is never mistaken for a score write (and vice-versa).
- **Offline / unreachable:** navigate falls back to `transferUserInfo`; score writes already use `transferUserInfo`. Scores persist per hole regardless of which hole the watch is on.
- **Hole not in snapshot (9-hole rounds / filtered holes):** `holeIndex` is clamped to `holes.indices`; the watch only pages over holes present in `snapshot.holes`.
- **Player switch on a hole with no score:** shows "—" for that player+hole (Section A default).
- **Round advances on the phone while the watch user is mid-navigation:** phone-initiated `currentHole` change moves the watch (sync model, last-write-wins).

## Files Touched

| File | Change |
|---|---|
| `ios/TheNineteenthWatch Watch App/ScoreView.swift` + `watch/Views/ScoreView.swift` | Restructure: horizontal hole `TabView`, `holeIndex` follow/drive, top player picker, optional/blank gross value |
| `ios/TheNineteenthWatch Watch App/ConnectivityClient.swift` + `watch/Services/ConnectivityClient.swift` | `navigate(toHole:)` — send nav message (sendMessage when reachable, else transferUserInfo) |
| `src/watch/types.ts` | `WatchNavigate` message type |
| `src/watch/transport.ts` | add `onNavigate(handler)` to the (phone-side) transport interface + RNWC adapter; discriminate inbound messages by `type`. Nav is watch→phone only, so the phone transport needs receive-only — no send method here. |
| `src/watch/useWatchBridge.ts` | subscribe to `onNavigate` → `setCurrentHole(hole)` |

> Dual-source note: the watch Swift exists as two identical copies (`ios/TheNineteenthWatch Watch App/*` and `watch/*`); every Swift edit applies to both, kept byte-identical.

## Testing

- **Pure TS (transport):** unit test that an inbound `{ type: 'navigate', hole }` routes to `onNavigate` and NOT `onMessage`, and that a `WatchScoreWrite` (no `type`) routes to `onMessage` and NOT `onNavigate`.
- **On-device (simulators):**
  - Blank default: open a fresh hole → gross shows "—"; tapping `Par` records par on the phone; tapping nothing records nothing.
  - Hole nav sync: swipe holes on the watch → phone score screen follows; change holes on the phone → watch follows.
  - Score a non-current hole from the watch → persists on the phone.
  - Player picker: with a scoring pair, switch player at top → entry reflects that player; with a solo round, the picker is hidden.
