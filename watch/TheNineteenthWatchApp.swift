import SwiftUI

@main
struct TheNineteenthWatchApp: App {
    @StateObject private var connectivity = ConnectivityClient.shared

    var body: some Scene {
        WindowGroup {
            VStack(spacing: 8) {
                Text("The Nineteenth").font(.headline)
                Text(connectivity.lastContextSummary)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Button("Ping phone") { connectivity.sendPing() }
            }
            .padding()
        }
    }
}
