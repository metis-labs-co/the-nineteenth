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
                    RoundHeader(snapshot: snapshot)
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets(top: 2, leading: 0, bottom: 6, trailing: 0))
                }

                MenuRow(title: "Distance", systemImage: "flag.fill", tint: .brandPrimary) {
                    DistanceView(connectivity: connectivity, location: location)
                }
                MenuRow(title: "Enter score", systemImage: "pencil", tint: .scoreBirdie) {
                    ScoreView(connectivity: connectivity)
                }
                MenuRow(title: "Leaderboard", systemImage: "trophy.fill", tint: .brandWarning) {
                    LeaderboardView(connectivity: connectivity)
                }
                if !(snapshot.pickerRounds.isEmpty) {
                    MenuRow(title: "Switch round", systemImage: "arrow.left.arrow.right", tint: .secondary) {
                        RoundPickerView(connectivity: connectivity)
                    }
                }
            }
            .navigationTitle("The Nineteenth")
        } else {
            EmptyRoundState()
        }
    }
}

/// Compact status card: competition name, hole progress, and a brand-tinted
/// progress bar across the round.
private struct RoundHeader: View {
    let snapshot: WatchSnapshot

    private var holeCount: Int { max(snapshot.holes.count, 1) }

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(snapshot.competitionName)
                .font(.headline)
                .lineLimit(2)
                .minimumScaleFactor(0.8)

            HStack(spacing: 4) {
                Image(systemName: "flag.checkered")
                Text("Hole \(snapshot.currentHole) of \(snapshot.holes.count)")
            }
            .font(.caption2)
            .foregroundStyle(.secondary)

            ProgressView(
                value: Double(min(snapshot.currentHole, holeCount)),
                total: Double(holeCount)
            )
            .tint(.brandPrimary)
        }
        .padding(.vertical, 2)
    }
}

/// A navigation row with a rounded, tinted icon chip for clearer hierarchy.
private struct MenuRow<Destination: View>: View {
    let title: String
    let systemImage: String
    let tint: Color
    @ViewBuilder var destination: () -> Destination

    var body: some View {
        NavigationLink(destination: destination) {
            HStack(spacing: 10) {
                Image(systemName: systemImage)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(tint)
                    .frame(width: 30, height: 30)
                    .background(
                        tint.opacity(0.18),
                        in: RoundedRectangle(cornerRadius: 8, style: .continuous)
                    )
                Text(title)
                    .font(.body)
            }
            .padding(.vertical, 2)
        }
    }
}

/// Friendly placeholder shown when no round is live.
private struct EmptyRoundState: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "flag.slash")
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(.secondary)
            Text("No round in progress")
                .font(.headline)
                .multilineTextAlignment(.center)
            Text("Start one on your phone")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}
