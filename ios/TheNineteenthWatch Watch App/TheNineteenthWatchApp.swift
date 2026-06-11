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

    var body: some View {
        NavigationStack {
            if connectivity.snapshot != nil {
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
                NowPlayingView(connectivity: connectivity, location: location)
            }
        }
        // Keep the app alive while a round is live; release it when the round ends.
        .onAppear { if connectivity.snapshot != nil { workout.start() } }
        .onChange(of: connectivity.snapshot != nil) { _, live in
            if live { workout.start() } else { workout.stop() }
        }
        // Anchor the 5-hour reminder to the workout session start (the clock the
        // on-watch timer shows). Starts when the session begins, stops when it ends.
        // Note: if the watch app is force-relaunched mid-round, the workout session
        // restarts and this anchor resets to the relaunch time — the keep-alive
        // session exists precisely to make that rare.
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
            // Rising edge only: haptic on the alert appearing, not on dismissal.
            if prompting { WKInterfaceDevice.current().play(.notification) }
        }
    }
}
