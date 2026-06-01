import Foundation

/// Tiny shared store the watch app writes and the complication reads, via an
/// App Group shared UserDefaults. Keep this in sync between both targets.
enum WatchSharedState {
    static let appGroup = "group.com.the.nineteenth.golf"

    private enum Key {
        static let active = "round.active"
        static let hole = "round.hole"
        static let holeCount = "round.holeCount"
        static let name = "round.name"
    }

    struct RoundState: Equatable {
        var active: Bool
        var hole: Int
        var holeCount: Int
        var name: String
    }

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroup)
    }

    /// Called by the watch app whenever a snapshot arrives (or clears).
    static func write(_ state: RoundState) {
        guard let defaults else { return }
        defaults.set(state.active, forKey: Key.active)
        defaults.set(state.hole, forKey: Key.hole)
        defaults.set(state.holeCount, forKey: Key.holeCount)
        defaults.set(state.name, forKey: Key.name)
    }

    /// Read by the complication's timeline provider.
    static func read() -> RoundState {
        guard let defaults else {
            return RoundState(active: false, hole: 0, holeCount: 0, name: "")
        }
        return RoundState(
            active: defaults.bool(forKey: Key.active),
            hole: defaults.integer(forKey: Key.hole),
            holeCount: defaults.integer(forKey: Key.holeCount),
            name: defaults.string(forKey: Key.name) ?? ""
        )
    }
}
