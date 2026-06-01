import SwiftUI

/// Read-only leaderboard glance. The current user's row is highlighted.
struct LeaderboardView: View {
    @ObservedObject var connectivity: ConnectivityClient

    private var rows: [WatchLeaderboardRow] { connectivity.snapshot?.leaderboard ?? [] }

    var body: some View {
        Group {
            if rows.isEmpty {
                Text("No standings yet").foregroundStyle(.secondary)
            } else {
                List(rows, id: \.rank) { row in
                    HStack {
                        Text("\(row.rank)")
                            .foregroundStyle(.secondary)
                            .frame(width: 18, alignment: .leading)
                        Text(row.name)
                            .fontWeight(row.isCurrentUser ? .bold : .regular)
                            .lineLimit(1)
                        Spacer()
                        Text(row.detail).monospacedDigit()
                    }
                    .foregroundStyle(row.isCurrentUser ? Color.green : Color.primary)
                }
            }
        }
        .navigationTitle("Leaderboard")
    }
}
