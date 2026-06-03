import SwiftUI

/// Root view when a round is live: round status + navigation to the three
/// feature screens. Also the complication's tap target.
struct NowPlayingView: View {
    @ObservedObject var connectivity: ConnectivityClient
    @ObservedObject var location: LocationProvider

    var body: some View {
        if let snapshot = connectivity.snapshot {
            List {
                Section {
                    Text(snapshot.competitionName).font(.headline)
                    Text("Hole \(snapshot.currentHole) of \(snapshot.holes.count)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                NavigationLink {
                    DistanceView(connectivity: connectivity, location: location)
                } label: { Label("Distance", systemImage: "flag.fill") }
                NavigationLink {
                    ScoreView(connectivity: connectivity)
                } label: { Label("Enter score", systemImage: "pencil") }
                NavigationLink {
                    LeaderboardView(connectivity: connectivity)
                } label: { Label("Leaderboard", systemImage: "trophy.fill") }
            }
            .navigationTitle("The Nineteenth")
        } else {
            VStack(spacing: 6) {
                Text("No round in progress").font(.headline)
                Text("Start one on your phone")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding()
        }
    }
}
