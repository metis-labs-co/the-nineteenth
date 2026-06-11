# Watch 5-Hour Round Reminder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a one-time, dismissible reminder on the Apple Watch when a round has been in progress for over 5 hours, nudging the user to wrap up and submit on their phone.

**Architecture:** Entirely contained in the watchOS app. The existing `HKWorkoutSession` (started by `WorkoutController` when a round goes live) is the timer anchor — its start time is the same clock the user's on-watch workout timer counts from. A small new `RoundDurationMonitor` polls elapsed time on a 60s timer and flips a published flag once the 5-hour threshold is crossed. `RootView` presents a SwiftUI `.alert` bound to that flag, with a haptic. No phone, database, or watch-snapshot changes.

**Tech Stack:** Swift, SwiftUI, Combine, HealthKit, WatchKit (watchOS target). No automated Swift test target exists in this RN/Expo project, so verification is by Xcode build + manual runtime testing with a temporarily lowered threshold.

**Spec:** `docs/superpowers/specs/2026-06-11-watch-5h-round-reminder-design.md`

---

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `ios/TheNineteenthWatch Watch App/WorkoutController.swift` | Owns the workout session. Now also exposes when it started. | Modify |
| `ios/TheNineteenthWatch Watch App/RoundDurationMonitor.swift` | Single purpose: watch elapsed time vs a 5h limit, publish a one-shot "prompt" flag. | Create |
| `ios/TheNineteenthWatch Watch App/TheNineteenthWatchApp.swift` | App entry + `RootView`. Owns the monitor lifecycle and presents the alert. | Modify |

**Note on Xcode target membership:** The project (`ios/TheNineteenth.xcodeproj`) uses Xcode 16 synchronized file groups (`PBXFileSystemSynchronizedRootGroup`). A new `.swift` file created inside the `TheNineteenthWatch Watch App/` folder is automatically compiled into the watch target — **no `project.pbxproj` edit required.**

**Note on testing:** There is no `XCTest` target for the watch app. "Verify" steps are: (a) compile the watch code via Xcode build, and (b) a final manual runtime test (Task 4) using a temporarily lowered threshold. There is no failing-test-first loop here because there is no test runner; instead each code task ends with a compile check.

---

### Task 1: Expose the workout session start time on `WorkoutController`

**Files:**
- Modify: `ios/TheNineteenthWatch Watch App/WorkoutController.swift`

The session already records a `start = Date()` in `beginSession()` (line 66) and ends in `stop()`. We publish that start `Date` so the monitor can anchor to it, and clear it on stop / failure.

- [ ] **Step 1: Add the published property**

In `WorkoutController` (just below the existing `@Published private(set) var isActive = false` on line 15), add:

```swift
    @Published private(set) var isActive = false

    /// The instant the live workout session began, or `nil` when no session is
    /// running. This is the clock the on-watch workout timer counts from, and the
    /// anchor for the 5-hour round-duration reminder.
    @Published private(set) var startDate: Date?
```

- [ ] **Step 2: Set `startDate` when the session begins**

In `beginSession()`, the success path already creates `let start = Date()` (line 66) and sets `isActive = true` (line 72). Set `startDate` alongside it. Change:

```swift
            self.session = session
            self.builder = builder
            isActive = true
```

to:

```swift
            self.session = session
            self.builder = builder
            startDate = start
            isActive = true
```

- [ ] **Step 3: Clear `startDate` on stop**

In `stop()`, there are two exit paths. Update both.

Change the early guard (line 42):

```swift
        guard let session else { isActive = false; return }
```

to:

```swift
        guard let session else { isActive = false; startDate = nil; return }
```

And at the end of `stop()`, after `isActive = false` (line 49), add the clear:

```swift
        self.session = nil
        self.builder = nil
        isActive = false
        startDate = nil
```

- [ ] **Step 4: Clear `startDate` on the failure path of `beginSession()`**

In the `catch` block of `beginSession()` (lines 73-79), it already resets `session/builder/isActive`. Add the start clear. Change:

```swift
        } catch {
            // Session couldn't start (e.g. simulator limitation / unauthorized).
            // Leave the app running normally without keep-alive.
            session = nil
            builder = nil
            isActive = false
        }
```

to:

```swift
        } catch {
            // Session couldn't start (e.g. simulator limitation / unauthorized).
            // Leave the app running normally without keep-alive.
            session = nil
            builder = nil
            isActive = false
            startDate = nil
        }
```

- [ ] **Step 5: Verify it compiles**

In Xcode, open `ios/TheNineteenth.xcworkspace`, select the **TheNineteenth** scheme (it embeds the watch app), and build (Cmd+B). Expected: build succeeds, no errors in `WorkoutController.swift`.

Command-line alternative (slower, requires pods installed):

```bash
xcodebuild -workspace ios/TheNineteenth.xcworkspace -scheme TheNineteenth -destination 'generic/platform=iOS' build CODE_SIGNING_ALLOWED=NO | tail -20
```

Expected: ends with `** BUILD SUCCEEDED **`.

- [ ] **Step 6: Commit**

```bash
git add "ios/TheNineteenthWatch Watch App/WorkoutController.swift"
git commit -m "feat(watch): expose workout session startDate on WorkoutController"
```

---

### Task 2: Create `RoundDurationMonitor`

**Files:**
- Create: `ios/TheNineteenthWatch Watch App/RoundDurationMonitor.swift`

A focused `ObservableObject` whose only job is to watch elapsed time against a 5-hour limit and raise a one-shot flag. It does not touch HealthKit, connectivity, or UI — `RootView` drives its lifecycle and reads its flag.

- [ ] **Step 1: Create the file with the full implementation**

Create `ios/TheNineteenthWatch Watch App/RoundDurationMonitor.swift` with exactly:

```swift
import Foundation
import Combine

/// Watches how long the current round has been running and raises a one-shot
/// flag once it crosses `limit` (5 hours). Anchored to the workout session start
/// date supplied by `RootView` — the same clock the on-watch workout timer shows.
///
/// Single purpose: it knows nothing about HealthKit, connectivity, or the UI. The
/// owner calls `start(at:)` when a round goes live and `stop()` when it ends, and
/// observes `shouldPromptCompletion` to present the reminder. The prompt fires at
/// most once per round (`hasPrompted`), so dismissing it won't make it reappear.
@MainActor
final class RoundDurationMonitor: ObservableObject {
    /// Threshold after which we nudge the user to wrap up. Most rounds finish well
    /// under this. Temporarily lower it for manual testing (see the plan's Task 4).
    static let limit: TimeInterval = 5 * 60 * 60

    /// How often we re-check elapsed time. 60s gives ±1 min precision at the 5-hour
    /// mark, which is plenty, and keeps the timer cheap.
    private static let tickInterval: TimeInterval = 60

    @Published var shouldPromptCompletion = false

    private var startDate: Date?
    private var hasPrompted = false
    private var timer: Timer?

    /// Begin monitoring from `date`. Re-arms a fresh round (clears the one-shot
    /// flag) so a new round after a previously dismissed prompt can prompt again.
    func start(at date: Date) {
        stop()
        startDate = date
        hasPrompted = false
        shouldPromptCompletion = false

        let timer = Timer(timeInterval: Self.tickInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.check() }
        }
        // .common so it keeps firing while the user interacts with the UI.
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer

        // Check immediately in case we somehow start already past the limit.
        check()
    }

    /// Stop monitoring and reset all state. Safe to call when already stopped.
    func stop() {
        timer?.invalidate()
        timer = nil
        startDate = nil
        hasPrompted = false
        shouldPromptCompletion = false
    }

    private func check() {
        guard !hasPrompted, let startDate else { return }
        if Date().timeIntervalSince(startDate) >= Self.limit {
            hasPrompted = true
            shouldPromptCompletion = true
        }
    }
}
```

- [ ] **Step 2: Verify it compiles**

In Xcode, build the **TheNineteenth** scheme (Cmd+B). Expected: build succeeds; the new file appears under the watch app group automatically (synchronized group) and compiles with no errors.

If the file does not appear in the target, confirm it was saved inside `ios/TheNineteenthWatch Watch App/` (not a subfolder) and re-build.

- [ ] **Step 3: Commit**

```bash
git add "ios/TheNineteenthWatch Watch App/RoundDurationMonitor.swift"
git commit -m "feat(watch): add RoundDurationMonitor for 5-hour round reminder"
```

---

### Task 3: Wire the monitor and alert into `RootView`

**Files:**
- Modify: `ios/TheNineteenthWatch Watch App/TheNineteenthWatchApp.swift`

`RootView` already starts/stops `WorkoutController` as the round goes live/ends. We add a `RoundDurationMonitor`, drive it off `workout.startDate`, and present the reminder alert with a haptic.

- [ ] **Step 1: Import WatchKit for the haptic**

At the top of `TheNineteenthWatchApp.swift`, change:

```swift
import SwiftUI
```

to:

```swift
import SwiftUI
import WatchKit
```

- [ ] **Step 2: Add the monitor as a `@StateObject` and pass it into `RootView`**

In `TheNineteenthWatchApp`, add the monitor next to the other state objects and pass it down. Change:

```swift
@main
struct TheNineteenthWatchApp: App {
    @StateObject private var connectivity = ConnectivityClient.shared
    @StateObject private var location = LocationProvider()
    @StateObject private var workout = WorkoutController()

    var body: some Scene {
        WindowGroup {
            RootView(connectivity: connectivity, location: location, workout: workout)
        }
    }
}
```

to:

```swift
@main
struct TheNineteenthWatchApp: App {
    @StateObject private var connectivity = ConnectivityClient.shared
    @StateObject private var location = LocationProvider()
    @StateObject private var workout = WorkoutController()
    @StateObject private var durationMonitor = RoundDurationMonitor()

    var body: some Scene {
        WindowGroup {
            RootView(
                connectivity: connectivity,
                location: location,
                workout: workout,
                durationMonitor: durationMonitor
            )
        }
    }
}
```

- [ ] **Step 3: Accept the monitor in `RootView`**

In `RootView`, add the observed object alongside the others. Change:

```swift
struct RootView: View {
    @ObservedObject var connectivity: ConnectivityClient
    @ObservedObject var location: LocationProvider
    @ObservedObject var workout: WorkoutController
```

to:

```swift
struct RootView: View {
    @ObservedObject var connectivity: ConnectivityClient
    @ObservedObject var location: LocationProvider
    @ObservedObject var workout: WorkoutController
    @ObservedObject var durationMonitor: RoundDurationMonitor
```

- [ ] **Step 4: Drive the monitor off the workout start date and present the alert**

Replace the existing lifecycle modifiers at the end of `RootView.body`. Change:

```swift
        // Keep the app alive while a round is live; release it when the round ends.
        .onAppear { if connectivity.snapshot != nil { workout.start() } }
        .onChange(of: connectivity.snapshot != nil) { _, live in
            if live { workout.start() } else { workout.stop() }
        }
    }
}
```

to:

```swift
        // Keep the app alive while a round is live; release it when the round ends.
        .onAppear { if connectivity.snapshot != nil { workout.start() } }
        .onChange(of: connectivity.snapshot != nil) { _, live in
            if live { workout.start() } else { workout.stop() }
        }
        // Anchor the 5-hour reminder to the workout session start (the clock the
        // on-watch timer shows). Starts when the session begins, stops when it ends.
        .onChange(of: workout.startDate) { _, started in
            if let started { durationMonitor.start(at: started) } else { durationMonitor.stop() }
        }
        .alert(
            "Round running long",
            isPresented: $durationMonitor.shouldPromptCompletion
        ) {
            Button("Got it", role: .cancel) {}
        } message: {
            Text("You've been playing over 5 hours. Time to wrap up and submit your scorecard on your phone.")
        }
        .onChange(of: durationMonitor.shouldPromptCompletion) { _, prompting in
            if prompting { WKInterfaceDevice.current().play(.notification) }
        }
    }
}
```

- [ ] **Step 5: Verify it compiles**

In Xcode, build the **TheNineteenth** scheme (Cmd+B). Expected: `** BUILD SUCCEEDED **`, no errors in `TheNineteenthWatchApp.swift`.

- [ ] **Step 6: Commit**

```bash
git add "ios/TheNineteenthWatch Watch App/TheNineteenthWatchApp.swift"
git commit -m "feat(watch): present 5-hour round reminder alert in RootView"
```

---

### Task 4: Manual runtime verification

**Files:**
- Temporarily modify: `ios/TheNineteenthWatch Watch App/RoundDurationMonitor.swift`

No automated runner exists, so confirm behaviour on a paired watch (or watchOS simulator with the iOS app running a live round).

- [ ] **Step 1: Temporarily lower the threshold**

In `RoundDurationMonitor.swift`, change:

```swift
    static let limit: TimeInterval = 5 * 60 * 60
```

to (testing only):

```swift
    static let limit: TimeInterval = 90
```

Also temporarily change `tickInterval` from `60` to `10` so the check fires quickly:

```swift
    private static let tickInterval: TimeInterval = 10
```

- [ ] **Step 2: Build and run, start a round**

Build and run the watch app (with the phone app in a live round so `connectivity.snapshot != nil` and the workout session starts). Confirm `workout.startDate` becomes non-nil (the keep-alive workout begins).

- [ ] **Step 3: Verify the prompt fires once**

Wait ~90 seconds. Expected:
- The **"Round running long"** alert appears over whichever screen is showing (Distance / Score / NowPlaying).
- A notification haptic plays as it appears.
- Wait another minute: the alert does **not** re-appear (one-shot `hasPrompted`).

- [ ] **Step 4: Verify dismissal**

Tap **"Got it"**. Expected: alert dismisses and does not return for the remainder of this round.

- [ ] **Step 5: Verify re-arming on a new round**

End the round (phone stops sending the snapshot → `workout.stop()` → `startDate` nil → `durationMonitor.stop()`). Start a fresh round. Wait ~90s. Expected: the alert fires again for the new round.

- [ ] **Step 6: Restore production thresholds**

Revert both constants in `RoundDurationMonitor.swift`:

```swift
    static let limit: TimeInterval = 5 * 60 * 60
```

```swift
    private static let tickInterval: TimeInterval = 60
```

- [ ] **Step 7: Verify restore compiles and commit nothing-or-noop**

Confirm `git diff` shows the file back at production values (no net change vs Task 2's committed version):

```bash
git diff -- "ios/TheNineteenthWatch Watch App/RoundDurationMonitor.swift"
```

Expected: **no output** (file matches the committed version). If there is output, the constants weren't fully restored — fix them. No commit needed for this task.

---

## Self-Review

**Spec coverage:**
- "Reminder only / nudge to phone" → Task 3 alert (informational, single "Got it" button, no completion message). ✓
- "Timer anchor = workout session start" → Task 1 exposes `startDate`; Task 3 `.onChange(of: workout.startDate)` drives the monitor. ✓
- "RoundDurationMonitor, single-purpose, 60s tick, named 5h constant, fires once" → Task 2. ✓
- "Prompt at RootView level, shows over any sub-screen" → Task 3 `.alert` on `RootView.body`. ✓
- "Notification haptic matching existing pattern" → Task 3 `WKInterfaceDevice.current().play(.notification)`. ✓
- "Wiring: start on startDate non-nil, stop + reset on round end" → Task 3 `.onChange`; `stop()` resets `hasPrompted`. ✓
- "Out of scope: no DB/snapshot/phone changes, no completion action, no re-nag" → none of those files touched; `hasPrompted` prevents re-nag. ✓
- "Edge: new round re-arms" → `start(at:)` resets flags; verified in Task 4 Step 5. ✓
- "Testing: manual with lowered threshold then restore" → Task 4. ✓

**Placeholder scan:** No TBD/TODO/"add error handling"-style placeholders; every code step shows complete code. ✓

**Type consistency:** `startDate: Date?` (Task 1) is read as `workout.startDate` (Task 3) and passed to `start(at: Date)` (Task 2). `shouldPromptCompletion: Bool` (Task 2) bound via `$durationMonitor.shouldPromptCompletion` (Task 3). `RoundDurationMonitor()` init matches its `@StateObject` use. `limit` / `tickInterval` names consistent across Tasks 2 and 4. ✓
