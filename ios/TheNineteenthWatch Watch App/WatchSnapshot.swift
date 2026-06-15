import Foundation

/// Swift mirrors of the bridge types in `src/watch/types.ts`. Decoded from the
/// `applicationContext` dictionary the phone sends over WCSession.

struct LatLng: Codable, Equatable {
    let latitude: Double
    let longitude: Double
}

struct Green: Codable, Equatable {
    var center: LatLng?
    var front: LatLng?
    var back: LatLng?
}

struct WatchHole: Codable, Equatable {
    let hole: Int
    let par: Int
    let strokeIndex: Int
    let green: Green
}

struct WatchPairPlayer: Codable, Equatable {
    let playerId: String
    let name: String
}

struct WatchStatFlags: Codable, Equatable {
    let putts: Bool
    let fairways: Bool
    let gir: Bool
    let penalties: Bool
    let bunker: Bool
    // Optional for backward-compatible decode of older cached snapshots
    // (missing key -> nil -> treated as false at the call site).
    let fairwayDirection: Bool?
    let greenDirection: Bool?
}

struct WatchLeaderboardRow: Codable, Equatable {
    let rank: Int
    let name: String
    let detail: String
    let isCurrentUser: Bool
}

/// Course wind from the phone's weather fetch. `fromDeg` is the meteorological
/// bearing the wind blows FROM (true north); the Distance view converts to
/// "blows to" at render. Optional on the snapshot for backward-compatible decode.
struct WatchWind: Codable, Equatable {
    let speedKph: Double
    let fromDeg: Double
}

/// One hazard incident, mirroring `HazardEntry` in the RN model.
struct WatchHazard: Codable, Equatable {
    let type: String // "water" | "ob" | "lateral" | "lost_ball"
}

/// A recorded hole score, mirroring the subset of `HoleScore` the watch reads
/// back from the snapshot to pre-fill the score screen.
struct WatchHoleScore: Codable, Equatable {
    var strokes: Int?
    var putts: Int?
    var fairwayHit: Bool?
    var fairwayMissDirection: String?
    var greenInRegulation: Bool?
    var greenMissDirection: String?
    var bunkerShots: Int?
    var hazards: [WatchHazard]?
}

/// One round the user can open from the watch picker. Mirrors
/// `WatchAvailableRound` in `src/watch/types.ts`.
struct WatchAvailableRound: Codable, Equatable, Identifiable {
    let roundId: String
    let competitionId: String?
    let title: String
    let teeTime: String?
    let status: String      // "in-progress" | "upcoming"
    let gameType: String
    let isTeamRound: Bool

    var id: String { roundId }
    var isLive: Bool { status == "in-progress" }
}

struct WatchSnapshot: Codable, Equatable {
    let rev: Int
    let roundId: String
    let competitionName: String
    let unit: String // "metres" | "yards"
    let isPremium: Bool
    let statFlags: WatchStatFlags
    let pairPlayers: [WatchPairPlayer]
    let holes: [WatchHole]
    let currentHole: Int
    /// Keyed `"playerId:hole"`; absent means no score entered yet.
    let scores: [String: WatchHoleScore]
    let leaderboard: [WatchLeaderboardRow]
    /// Optional: missing from older snapshots / when the phone has no weather.
    let wind: WatchWind?
    /// Rounds the user can open from the watch. Optional for backward-compatible
    /// decode of older snapshots (missing key -> treated as empty).
    let availableRounds: [WatchAvailableRound]?

    /// Convenience: the hole object for the current hole, if present.
    var currentHoleObject: WatchHole? {
        holes.first { $0.hole == currentHole }
    }

    /// True when the snapshot describes a round currently being scored. The phone
    /// sends an empty `roundId` (with availableRounds populated) to clear a
    /// finished round while still feeding the picker.
    var hasActiveRound: Bool { !roundId.isEmpty }

    /// Picker list, excluding the active round, with nil decoded as empty.
    var pickerRounds: [WatchAvailableRound] {
        (availableRounds ?? []).filter { $0.roundId != roundId }
    }

    func score(playerId: String, hole: Int) -> WatchHoleScore? {
        scores["\(playerId):\(hole)"]
    }
}
