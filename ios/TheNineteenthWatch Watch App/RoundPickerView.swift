import SwiftUI
import WatchKit

/// Lets the player choose which round to score from the watch. Shown when no
/// round is active, and reachable via "Switch round" while one is. Tapping a row
/// asks the phone to open that round; the watch then waits for the phone to push
/// the active-round snapshot (or, for upcoming rounds, for setup to finish).
struct RoundPickerView: View {
    @ObservedObject var connectivity: ConnectivityClient
    /// Optional: dismiss after a tap when presented over a live round.
    var onSelected: (() -> Void)?

    private var rounds: [WatchAvailableRound] {
        connectivity.snapshot?.pickerRounds ?? []
    }

    var body: some View {
        Group {
            if rounds.isEmpty {
                EmptyPickerState()
            } else {
                List {
                    Section("Rounds") {
                        ForEach(rounds) { round in
                            Button {
                                connectivity.selectRound(roundId: round.roundId)
                                WKInterfaceDevice.current().play(.click)
                                onSelected?()
                            } label: {
                                RoundRow(round: round)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Rounds")
    }
}

/// One picker row: title plus a live/tee-time subtitle.
private struct RoundRow: View {
    let round: WatchAvailableRound

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(round.title)
                .font(.body)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
            HStack(spacing: 5) {
                Image(systemName: round.isLive ? "dot.radiowaves.left.and.right" : "clock")
                    .font(.caption2)
                    .foregroundStyle(round.isLive ? Color.scoreBirdie : .secondary)
                Text(round.isLive ? "Live" : (round.teeTime ?? "Scheduled"))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }
}

/// Shown when there are no rounds to pick (replaces the old "start on phone" copy
/// when the phone has cleared the round but the user has nothing scheduled today).
private struct EmptyPickerState: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "flag.slash")
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(.secondary)
            Text("No rounds today")
                .font(.headline)
                .multilineTextAlignment(.center)
            Text("Start or schedule one on your phone")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}
