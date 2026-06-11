import Foundation
import Combine
import HealthKit

/// Keeps the watch app foregrounded for the duration of a live round by running
/// an `HKWorkoutSession` (the mechanism golf GPS apps use). A running session
/// stops watchOS from returning to the clock face and wakes back to the app on
/// wrist raise.
///
/// Best-effort: if HealthKit is unavailable or the user denies authorization,
/// every call is a no-op and the app keeps working normally — it just won't stay
/// foregrounded. Nothing here ever blocks the UI.
@MainActor
final class WorkoutController: NSObject, ObservableObject {
    @Published private(set) var isActive = false

    /// The instant the live workout session began, or `nil` when no session is
    /// running. This is the clock the on-watch workout timer counts from, and the
    /// anchor for the 5-hour round-duration reminder.
    @Published private(set) var startDate: Date?

    private let healthStore = HKHealthStore()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?

    /// Begin a round session: request authorization once, then start the session.
    /// Safe to call repeatedly — a no-op while already active.
    func start() {
        guard !isActive, HKHealthStore.isHealthDataAvailable() else { return }

        let typesToShare: Set = [HKQuantityType.workoutType()]
        let typesToRead: Set<HKObjectType> = [
            HKQuantityType(.heartRate),
            HKQuantityType(.activeEnergyBurned),
            HKQuantityType(.distanceWalkingRunning),
        ]
        healthStore.requestAuthorization(toShare: typesToShare, read: typesToRead) { [weak self] _, _ in
            // We don't gate on `success`: even partial/denied share auth still lets
            // the session run enough to hold the foreground. Hop back to the main
            // actor to touch session state.
            Task { @MainActor in self?.beginSession() }
        }
    }

    /// End the round session and finalize the workout. Safe to call when inactive.
    func stop() {
        guard let session else { isActive = false; startDate = nil; return }
        session.end()
        builder?.endCollection(withEnd: Date()) { [weak self] _, _ in
            self?.builder?.finishWorkout { _, _ in }
        }
        self.session = nil
        self.builder = nil
        isActive = false
        startDate = nil
    }

    private func beginSession() {
        guard !isActive else { return }

        let config = HKWorkoutConfiguration()
        config.activityType = .golf
        config.locationType = .outdoor

        do {
            let session = try HKWorkoutSession(healthStore: healthStore, configuration: config)
            let builder = session.associatedWorkoutBuilder()
            builder.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: config)
            session.delegate = self
            builder.delegate = self

            let start = Date()
            session.startActivity(with: start)
            builder.beginCollection(withStart: start) { _, _ in }

            self.session = session
            self.builder = builder
            startDate = start
            isActive = true
        } catch {
            // Session couldn't start (e.g. simulator limitation / unauthorized).
            // Leave the app running normally without keep-alive.
            session = nil
            builder = nil
            isActive = false
            startDate = nil
        }
    }
}

// MARK: - Delegates (required conformances; collection runs unattended)

extension WorkoutController: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession,
                                    didChangeTo toState: HKWorkoutSessionState,
                                    from fromState: HKWorkoutSessionState,
                                    date: Date) {}

    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession,
                                    didFailWithError error: Error) {
        Task { @MainActor in self.stop() }
    }
}

extension WorkoutController: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    nonisolated func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder,
                                    didCollectDataOf collectedTypes: Set<HKSampleType>) {}
}
