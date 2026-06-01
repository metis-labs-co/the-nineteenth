import WidgetKit
import SwiftUI

/// Round-in-progress complication. Reads shared round state (written by the
/// watch app) and shows whether a round is live + the current hole. Tapping it
/// launches the watch app. Static (no configuration intent).

struct RoundEntry: TimelineEntry {
    let date: Date
    let state: WatchSharedState.RoundState
}

struct RoundProvider: TimelineProvider {
    func placeholder(in context: Context) -> RoundEntry {
        RoundEntry(date: Date(), state: .init(active: true, hole: 7, holeCount: 18, name: "Round"))
    }

    func getSnapshot(in context: Context, completion: @escaping (RoundEntry) -> Void) {
        completion(RoundEntry(date: Date(), state: WatchSharedState.read()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RoundEntry>) -> Void) {
        let entry = RoundEntry(date: Date(), state: WatchSharedState.read())
        // Refresh periodically; the watch app also nudges reloads on new snapshots.
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct RoundComplicationView: View {
    @Environment(\.widgetFamily) private var family
    let entry: RoundEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: entry.state.active ? "figure.golf" : "flag")
                    .font(.title3)
            }
        default: // .accessoryRectangular and others
            HStack(spacing: 6) {
                Image(systemName: "figure.golf")
                VStack(alignment: .leading, spacing: 1) {
                    if entry.state.active {
                        Text(entry.state.name.isEmpty ? "Round in progress" : entry.state.name)
                            .font(.headline)
                            .lineLimit(1)
                        Text("Hole \(entry.state.hole) of \(entry.state.holeCount)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    } else {
                        Text("The Nineteenth").font(.headline).lineLimit(1)
                        Text("No round").font(.caption2).foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}

struct TheNineteenthWatchComplication: Widget {
    let kind = "TheNineteenthWatchComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RoundProvider()) { entry in
            RoundComplicationView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Round")
        .description("Shows your round in progress.")
        .supportedFamilies([.accessoryRectangular, .accessoryCircular])
    }
}
