import SwiftUI

@main
struct TheNineteenthWatchApp: App {
    @StateObject private var connectivity = ConnectivityClient.shared
    @StateObject private var location = LocationProvider()

    var body: some Scene {
        WindowGroup {
            RootView(connectivity: connectivity, location: location)
        }
    }
}

/// When a round is live, open straight to Distance (the most-used screen) with a
/// toolbar button to the round menu. Otherwise show the empty state.
struct RootView: View {
    @ObservedObject var connectivity: ConnectivityClient
    @ObservedObject var location: LocationProvider

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
    }
}
