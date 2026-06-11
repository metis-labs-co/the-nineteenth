# Watch 5-Hour Round Reminder — Design

**Date:** 2026-06-11
**Status:** Approved (design)
**Scope:** watchOS app only — no phone, DB, or snapshot changes

## Problem

While a round is in progress, the Apple Watch app keeps a workout session
running (and the user sees its elapsed timer). Most rounds finish well under 5
hours. If a round runs over 5 hours it is likely the user has finished playing
but forgotten to submit. We want a one-time, dismissible reminder on the watch
nudging them to wrap up and submit on the phone.

## Decisions

- **Prompt behaviour:** Reminder only — a dismissible alert that nudges the user
  to submit on their phone. The watch does **not** gain any round-completion
  capability (no new watch→phone message, no status changes).
- **Timer anchor:** The HealthKit workout session start time. This is the same
  clock the user's on-watch workout timer already counts from, so the reminder
  aligns with what they see. No real "round started playing" timestamp exists in
  the data model (for social rounds, `status: 'in-progress'` is written at
  `created_at`), and the workout session start is the most accurate available
  signal — entirely contained in the watch app.

### Why not a phone-sent timestamp

There is no distinct play-start timestamp stored. Sending one would require a new
DB column (or reusing `created_at`, which equals the in-progress time for social
rounds anyway), fetching it in `useActiveRoundIds`, threading it through
`buildWatchSnapshot`, adding it to `WatchSnapshot` (TS + Swift), and decoding it —
~4 layers of plumbing for a value the workout session already provides on-device.

## Components

### 1. `WorkoutController` — expose session start
File: `ios/TheNineteenthWatch Watch App/WorkoutController.swift`

- Add `@Published private(set) var startDate: Date?`
- Set it when the session starts (from `HKWorkoutSession.startDate`, or `Date()`
  at the point `start()` begins the session)
- Clear it to `nil` in `stop()`

### 2. `RoundDurationMonitor` — new single-purpose type
New file: `ios/TheNineteenthWatch Watch App/RoundDurationMonitor.swift`

An `ObservableObject` whose only job is to watch elapsed time and decide when to
prompt.

- `static let limit: TimeInterval = 5 * 60 * 60` (named constant; lowered
  temporarily for manual testing)
- `func start(at: Date)` — begins a repeating `Timer` firing every 60s
- `func stop()` — invalidates the timer and resets state
- `@Published var shouldPromptCompletion: Bool`
- A private `hasPrompted` flag so the prompt fires **once per round**, not every
  minute
- On each tick: if `Date().timeIntervalSince(startDate) >= limit` and not yet
  prompted, set `shouldPromptCompletion = true` and `hasPrompted = true`
- The elapsed check is a trivial pure comparison, verifiable by lowering `limit`

60s tick cadence gives ±1 minute precision, which is fine at a 5-hour threshold
and keeps the timer cheap.

### 3. Prompt UI — at `RootView`
File: `ios/TheNineteenthWatch Watch App/TheNineteenthWatchApp.swift`

Attach a SwiftUI `.alert(...)` at `RootView` level so it appears regardless of
which sub-screen (DistanceView, ScoreView, NowPlayingView) is on screen.

- Bound to `monitor.shouldPromptCompletion`
- Title: **"Round running long"**
- Message: **"You've been playing over 5 hours. Time to wrap up and submit your
  scorecard on your phone."**
- Single **"Got it"** button — dismisses (sets `shouldPromptCompletion = false`);
  the `hasPrompted` flag prevents it reappearing this round
- Play a `.notification` haptic via `WKInterfaceDevice.current().play(.notification)`
  when the prompt appears, matching the existing haptic pattern used on score save

### 4. Wiring — `RootView`
- When `workout.startDate` becomes non-nil → `monitor.start(at: startDate)`
- When the round ends (`connectivity.snapshot == nil` / `workout.stop()`, i.e.
  `startDate` returns to `nil`) → `monitor.stop()` (which resets `hasPrompted`), so
  the next round starts clean

## Out of scope (explicit)

- No DB column, no snapshot field, no phone-side changes
- No "complete round from watch" action
- No re-prompting after dismissal within the same round
- No second/parallel clock — the workout session is the single source of truth

## Edge cases

- **Watch app relaunch mid-round:** The workout session keeps the app
  foregrounded specifically to avoid this. If a relaunch does occur, the session
  (and thus the clock) restarts — accepted trade-off for keeping the feature fully
  on-device.
- **Round ends before 5h:** `stop()` resets state; prompt never fires.
- **New round after a dismissed prompt:** `start(at:)` re-arms `hasPrompted`.

## Testing

No Swift test target exists in this RN project, so verification is manual:

1. Temporarily set `limit` to ~60 seconds.
2. Start a round; confirm the alert + haptic fire once at the threshold.
3. Confirm it does **not** repeat on subsequent timer ticks.
4. Confirm "Got it" dismisses it.
5. End the round and start a fresh one; confirm the prompt re-arms and fires again.
6. Restore `limit` to `5 * 60 * 60`.
