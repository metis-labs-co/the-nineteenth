import SwiftUI
import WatchKit

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

/// When a round is live, open straight to Distance (the most-used screen) with a
/// toolbar button to the round menu. Otherwise show the empty state.
///
/// A live round also runs a workout session (`WorkoutController`) to keep the app
/// foregrounded for the duration of play instead of returning to the clock face.
struct RootView: View {
    @ObservedObject var connectivity: ConnectivityClient
    @ObservedObject var location: LocationProvider
    @ObservedObject var workout: WorkoutController
    @ObservedObject var durationMonitor: RoundDurationMonitor

    private var hasActiveRound: Bool {
        connectivity.snapshot?.hasActiveRound ?? false
    }

    var body: some View {
        NavigationStack {
            if hasActiveRound {
                DistanceView(connectivity: connectivity, location: location)
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            NavigationLink {
                                NowPlayingView(connectivity: connectivity, location: location)
                            } label: {
                                Image(systemName: "list.bullet")
                            }
                        }
                    }
            } else {
                // No active round: show the picker (it renders its own empty state
                // when there's nothing to pick).
                RoundPickerView(connectivity: connectivity)
            }
        }
        // Keep the app alive only while a round is actually live.
        .onAppear { if hasActiveRound { workout.start() } }
        .onChange(of: hasActiveRound) { _, live in
            if live { workout.start() } else { workout.stop() }
        }
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
