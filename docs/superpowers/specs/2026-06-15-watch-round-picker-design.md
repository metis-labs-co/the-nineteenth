# Watch Round Picker — Design

**Date:** 2026-06-15
**Status:** Approved design — ready for implementation plan

## Problem

The Apple Watch app can only display a single round at a time, and it does not
choose that round — it passively renders whatever "active round" snapshot the
phone last pushed. This causes real failures on the course:

1. **Stale round won't clear.** When a round finishes or is reset on the phone,
   the phone never tells the watch. The old snapshot persists
   (`ConnectivityClient.snapshot` stays non-nil), so the watch keeps showing the
   completed round and refuses to move on to the day's new round.
2. **No way to pick between concurrent rounds.** If more than one round is live
   (e.g. a competition round plus a social round), the watch can only follow one
   and offers no way to choose.
3. **A round exists but hasn't been opened on the phone.** A round scheduled for
   today never reaches the watch until the user opens it in the phone's scoring
   screen, so it can't be started from the watch.

## Goal

Give the watch a **round picker** driven by a list of "today's playable rounds"
the phone pushes, plus reliable clearing when a round ends. Selecting a round on
the watch makes the **phone** open that round (foreground navigation), which
keeps the watch thin and reuses all existing phone setup/scoring flows.

Non-goal: the watch scoring rounds independently of the phone (no offline round
store on the watch). Scores continue to flow watch → phone → sync as today.

## Eligibility — what counts as a "playable round"

Rounds where the current user is a participant/scorer that are **in-progress** OR
**scheduled for today**. Sourced from the existing hooks:

- `src/hooks/home/useInProgressRounds.ts` — `status = 'in-progress'`
- `src/hooks/home/useUpcomingRounds.ts` — `status = 'upcoming'`, filtered to
  today's date.

Both already scope to standalone rounds owned by the user plus competition rounds
where the user is an accepted participant, and both expose the fields we need
(`id`, `status`, `date`, `tee_time`, `course.name`, `competition.{id,name}`).

## Approach

Extend the **existing single snapshot** (`applicationContext`) with an
`availableRounds` list rather than introducing a second channel. The phone
**always** pushes a snapshot — including when no round is active — so the same
push both clears stale state and delivers the picker list.

This was chosen over a separate "round list" context (more native plumbing, two
contexts to keep in sync) and over a watch-pull-on-demand model (requires the
phone reachable at request time, worse offline).

## Architecture

### Data model — new `availableRounds` on the snapshot

Add to the snapshot type (`src/watch/types.ts`) and its Swift mirror
(`WatchSnapshot.swift`):

```ts
interface WatchAvailableRound {
  roundId: string;
  competitionId: string | null;   // null for standalone rounds
  title: string;                  // competition name, else course name
  teeTime: string | null;         // HH:MM for display
  status: 'in-progress' | 'upcoming';
}
```

Snapshot gains: `availableRounds: WatchAvailableRound[]`.

The active-round fields (`roundId`, `holes`, `scores`, …) remain exactly as today.
When there is **no** active round, `roundId` is empty/`""` and `availableRounds`
carries the list. This empty-`roundId` snapshot is the explicit clear signal.

### Phone bridge changes (`src/watch/useWatchBridge.ts`)

1. **Always push (Effect 1).** Remove the early `if (!roundId) return;`. Build the
   snapshot in two shapes:
   - **Active round present:** full scoring data (as today) **plus**
     `availableRounds`.
   - **No active round:** empty `roundId` + `availableRounds`.
   This requires wiring `useInProgressRounds()` and today's `useUpcomingRounds()`
   into the bridge so the list is available regardless of active-round state.
   Merge + de-dup the two sources into `WatchAvailableRound[]`, in-progress first,
   then upcoming by tee time.

2. **New Effect 4 — inbound selection.**
   `transport.onSelectRound((msg) => routeToRound(msg))`. No active-round guard
   (we are choosing *a* round, not acting within one).

3. **Routing by status (`routeToRound`).**
   - `in-progress` → `navigate('Scorecard', { roundId, competitionId })`, reusing
     the exact params the Home screen uses when resuming these rounds (verify the
     standalone `competitionId` convention at implementation time).
   - `upcoming` → `navigate('ViewRound', { roundId, competitionId })` — the
     round's normal entry point, so any required tee/group setup happens on the
     phone. The watch receives the full scoring snapshot once scoring begins.

4. **Pending-selection robustness.** `navigate()` no-ops when
   `navigationRef.isReady()` is false (app backgrounded/killed). Store the latest
   inbound selection and flush it once navigation becomes ready, so a watch tap
   that wakes the app still lands on the right round. Single-slot (latest wins),
   short-lived; cleared after it fires.

### Transport + native plumbing

- `src/watch/types.ts`: add
  `WatchSelectRound { type: 'selectRound'; roundId: string; competitionId: string | null }`.
- `src/watch/transport.ts`: add `onSelectRound(handler): () => void`, mirroring the
  existing `onNavigate` subscription.
- Swift `ConnectivityClient`: add a `selectRound(roundId:competitionId:)` send path
  mirroring the existing `navigate(toHole:)` (sendMessage when reachable,
  `transferUserInfo` fallback).

### Watch UI

New `RoundPickerView.swift`; routing in `TheNineteenthWatchApp.swift` RootView:

- **No active round + non-empty list** → render `RoundPickerView` (a `List` of
  rows: `title`, tee time, and a tag — `● Live` for in-progress, `○ <teeTime>`
  for upcoming).
- **Active round present** → scoring views as today, with a **"Switch round"**
  action added to the `NowPlayingView` toolbar that opens the same picker.
- **No active round + empty list** → "No rounds to score today" empty state
  (replaces today's bare empty state).

Tapping a row calls `connectivity.selectRound(roundId:competitionId:)`. The watch
does not optimistically switch views; it waits for the phone to push the new
active-round snapshot (or, for upcoming rounds, stays on the picker while the user
completes setup on the phone).

```
 ┌─────────────────┐
 │  Rounds         │
 │─────────────────│
 │ Royal Melbourne │
 │ ● Live · h7     │
 │─────────────────│
 │ Sat Comp R2     │
 │ ○ 1:20 PM       │
 └─────────────────┘
```

### Complication

`WatchSharedState` / the complication currently mirrors the active round and is
only written when a snapshot is received. With "always push," the no-active-round
snapshot must also update shared state so the complication clears instead of
showing a finished round. Write the cleared state on the empty-`roundId` push.

## Data flow

1. Phone state changes (round opened, scores entered, round reset) **or** the
   playable-rounds queries change → bridge builds and pushes a snapshot
   (active-round data when present, always `availableRounds`).
2. Watch stores the snapshot; RootView picks scoring vs picker vs empty state.
3. User taps a round on the watch → `selectRound` message → phone.
4. Phone routes: in-progress → `Scorecard`; upcoming → `ViewRound`. If navigation
   isn't ready, the selection is held and flushed when it is.
5. Opening the round on the phone initializes/resumes it, which triggers a fresh
   full snapshot back to the watch → watch shows scoring.

## Error handling & edge cases

- **Stale round after completion:** resolved by always pushing — the reset pushes
  an empty-`roundId` snapshot that clears the watch and shows the picker.
- **Phone unreachable when watch taps:** `selectRound` falls back to
  `transferUserInfo` (guaranteed delivery); the pending-selection flush handles the
  not-ready-yet navigation.
- **Selected round no longer playable** (finished between push and tap): the phone
  routes as best it can; the next snapshot push (without that round in
  `availableRounds`) corrects the watch. Acceptable; no special error UI in v1.
- **Empty list:** explicit empty state, not a blank screen.
- **Duplicate rounds across the two source queries:** de-dup by `roundId` in the
  merge step.

## Testing

- **Bridge unit tests** (`src/watch/`): snapshot now includes `availableRounds`;
  push fires with empty `roundId` on reset; `onSelectRound` routes in-progress →
  `Scorecard` and upcoming → `ViewRound` with correct params; pending-selection
  flushes once navigation is ready.
- **Merge/eligibility tests:** in-progress + today's upcoming merged, de-duped,
  ordered; non-today upcoming excluded.
- **Manual / device:** finish a round → watch clears to picker; two live rounds →
  pick each → phone opens the right one; scheduled round → watch tap → phone opens
  ViewRound; complication clears after completion.

## Out of scope

- Watch-side offline round storage / independent scoring.
- Rounds beyond today (no recent-history window).
- Reordering/configuring the picker; it's a simple ordered list.
