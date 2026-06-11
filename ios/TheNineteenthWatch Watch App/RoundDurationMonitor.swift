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
            // Added to RunLoop.main below, so the callback always fires on the main
            // thread — assert the main-actor isolation instead of hopping via a Task.
            MainActor.assumeIsolated { self?.check() }
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
        // Wall-clock Date is intentional: a monotonic clock (CACurrentMediaTime)
        // pauses while watchOS suspends the app, which would under-count elapsed
        // time. Date subtraction measures real-world duration across suspensions.
        if Date().timeIntervalSince(startDate) >= Self.limit {
            hasPrompted = true
            shouldPromptCompletion = true
        }
    }
}
