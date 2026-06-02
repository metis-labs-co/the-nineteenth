# Watch Scoring — Save Feedback & Stat-Section Visibility

**Date:** 2026-06-02
**Branch:** feature/apple-watch-companion
**Status:** Design approved, pending spec review

## Problem

Two issues reported while scoring a hole on the Apple Watch companion:

1. **No sign that a score saved.** The watch auto-saves every change (each `+`/`−`,
   "Par", "Pick up" tap sends a `WatchScoreWrite` to the phone via
   `transferUserInfo`), but nothing in the UI confirms it. With no submit button
   and no feedback, it feels like scoring does nothing.
2. **Stat-input sections don't appear on scroll.** `ScoreView` already renders
   Putts/Fairway/Green/Bunker/Penalties sections on vertical scroll, but they are
   hidden behind a single coarse gate (`if snapshot.isPremium`). The phone uses
   finer per-tier logic (`useStatsVisibilityWithTier`): putts for everyone, FIR/GIR
   for Social+, miss-directions/bunker/penalties for Premium. So Free/Social users
   get stat entry on the phone but none on the watch.

Neither is a missing feature — it's a feedback gap plus an over-coarse tier gate.

## Goals

- Auto-save remains the interaction model (no submit button). Add clear, transient
  confirmation that a save happened.
- Watch stat-section visibility mirrors the phone exactly, including the
  hit/miss-only (Social) vs hit/miss-with-direction (Premium) distinction.

## Non-Goals

- No submit/confirm button, no "Next hole" advance button.
- No new watch screens; no change to horizontal paging between scoring-pair players.
- No change to the phone's scoring or stat-visibility logic.

## Design

### A. Save feedback (auto-save preserved)

**`ConnectivityClient.swift`**
- Add `@Published var saveState: SaveState` with
  `enum SaveState { case idle, saving, saved(Date), failed }`.
- `send(write:)` sets `.saving`, performs the existing `transferUserInfo`, then
  optimistically sets `.saved(<now>)` and plays a success haptic
  (`WKInterfaceDevice.current().play(.success)`).
- **Optimistic, not ack-gated.** Acks return via `sendMessage` (reachable-only), so
  waiting on them would leave the indicator blank whenever the phone is asleep or out
  of range — exactly when `transferUserInfo`'s offline guarantee matters most.
- **Failure path is optional (secondary scope).** `ConnectivityClient` does **not**
  currently receive acks at all (no `didReceiveMessage`/`didReceiveUserInfo`). The
  `✓ Saved` + haptic path needs none of that and is the core deliverable. Surfacing
  `.failed`/`⚠ Retry` requires adding an ack-receive `WCSessionDelegate` method that
  parses `WatchAck.status` — implement only if we want reject feedback; otherwise
  `saveState` never enters `.failed` and the enum case stays unused-but-reserved.

**`ScoreView.swift`**
- A fixed-height slot beneath the gross stepper shows a transient status:
  `✓ Saved` on commit (auto-fades after ~1.5s), `⚠ Retry` on `.failed`.
- Fixed height so the layout never reflows/jumps when the indicator appears/clears.

### B. Stat sections mirror the phone

**Remove the coarse gate.**
- `ScoreView.body`: delete the `if snapshot.isPremium { … }` wrapper around the stat
  sections; render each section by its own flag (`flags.putts`, `flags.fairways`,
  `flags.gir`, `flags.bunker`, `flags.penalties`).
- `ScoreView.buildStat()`: delete `guard snapshot.isPremium else { return nil }`;
  keep the existing per-flag field population. (Without this, a Social user could
  enter putts but the value would never be serialized.)

The snapshot's `statFlags` are already tier- and setting-resolved on the phone
(`useStatsVisibilityWithTier`), so dropping the gate makes the watch match
automatically.

**Add miss-direction granularity to the snapshot.**
- `src/watch/types.ts` — extend `WatchStatFlags` with `fairwayDirection: boolean`
  and `greenDirection: boolean`.
- `src/watch/useWatchBridge.ts` — map them from
  `vis.showFairwayMissDirection` / `vis.showGreenMissDirection`.
- Swift `WatchStatFlags` model — add the two matching `Bool` fields (Codable; default
  `false` for backward-compatible decode of older snapshots).
- `ScoreView` Fairway/Green sections — when the direction flag is **off**, render a
  hit/miss control (two options: `✓` / miss); when **on**, render the existing
  `hit / left / right / short / long` control. `buildStat()` only writes a
  miss-direction when the corresponding direction flag is on (otherwise hit/miss only).

### Unchanged behaviour

- Par-3 holes still hide the Fairway section (`hole.par >= 4`).
- Pick-up sends `.pickup` strokes; "Par" sets strokes to par; both auto-save.
- Horizontal paging across scoring-pair players; vertical scroll reveals stats.

## Data Flow

```
Watch tap (+/−/Par/Pickup/stat)
  → ScoreView.commit() builds WatchScoreWrite (gross + buildStat by flags)
  → ConnectivityClient.send: transferUserInfo + saveState=.saved + haptic
  → ScoreView shows ✓ Saved (transient)
Phone (useWatchBridge Effect 2)
  → onMessage(user-info) → applyWatchScoreWrite → updatePlayerHoleScore (offline save + sync)
  → sendAck (sendMessage, reachable-only)
Watch (optional)
  → didReceive ack: on reject → saveState=.failed → ⚠ Retry
```

## Edge Cases

- **Offline / phone asleep:** `transferUserInfo` queues; indicator shows `✓ Saved`
  optimistically (delivery guaranteed). No false failure.
- **Rapid taps:** each tap re-sends; `saved(Date)` timestamp restarts the fade. Last
  write wins on the phone (existing `baseRev`/`seen` dedup in `applyWatchScoreWrite`).
- **Older snapshot without new flags:** Swift decodes missing `fairwayDirection`/
  `greenDirection` as `false` → hit/miss-only, safe default.
- **Par-3:** no Fairway section regardless of flags.

## Files Touched

| File | Change |
|---|---|
| `ios/TheNineteenthWatch Watch App/ConnectivityClient.swift` | `saveState` + optimistic set + haptic; (optional) ack-receive delegate method for `.failed` |
| `ios/TheNineteenthWatch Watch App/ScoreView.swift` | transient save indicator; drop `isPremium` gates; hit/miss-vs-direction rendering |
| `ios/TheNineteenthWatch Watch App/WatchSnapshot.swift` | add `fairwayDirection`, `greenDirection` Bools to `WatchStatFlags` (default `false`) |
| `watch/Views/ScoreView.swift` + `watch/…` mirror copies | keep in sync with `ios/` copies (identical source) |
| `src/watch/types.ts` | extend `WatchStatFlags` |
| `src/watch/useWatchBridge.ts` | map miss-direction flags into `statFlags` |

> Note: the watch Swift sources exist in **two identical copies** (`watch/…` and
> `ios/TheNineteenthWatch Watch App/…`). Both must be edited so they stay in sync;
> the Xcode target compiles the `ios/` copy.

## Testing

- **Pure TS:** extend `buildWatchSnapshot` unit coverage to assert the new
  `fairwayDirection`/`greenDirection` flags propagate from inputs.
- **On-device (simulator):** score a hole → `✓ Saved` + haptic; confirm value lands on
  the phone. As Free/Social user, confirm putts (and FIR/GIR for Social) sections now
  appear; as Premium, confirm direction controls appear. Par-3 hides Fairway.
- **Offline:** disable phone reachability, score, confirm optimistic `✓ Saved` and that
  the write applies once reachable.
