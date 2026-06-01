import Foundation

/// `strokes` is either a number or the literal "pickup"; the phone maps "pickup"
/// to the canonical PICKUP_SCORE. Mirrors the union in `src/watch/types.ts`.
enum StrokesValue: Codable, Equatable {
    case number(Int)
    case pickup

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intValue = try? container.decode(Int.self) {
            self = .number(intValue)
        } else {
            self = .pickup
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .number(let value):
            try container.encode(value)
        case .pickup:
            try container.encode("pickup")
        }
    }
}

/// Optional per-hole shot stats sent alongside a score write (Premium only).
struct WatchScoreStat: Codable, Equatable {
    var putts: Int?
    var fairwayHit: Bool?
    var fairwayMissDirection: String?
    var greenInRegulation: Bool?
    var greenMissDirection: String?
    var bunkerShots: Int?
    var hazards: [WatchHazard]?
}

/// A score write the watch sends to the phone via `transferUserInfo`.
struct WatchScoreWrite: Codable, Equatable {
    let clientWriteId: String
    let ts: Double
    let baseRev: Int
    let roundId: String
    let hole: Int
    let playerId: String
    let strokes: StrokesValue
    var stat: WatchScoreStat?

    /// Serialise to a `[String: Any]` dictionary suitable for WCSession transfer.
    func asDictionary() -> [String: Any]? {
        guard let data = try? JSONEncoder().encode(self),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return nil }
        return object
    }
}
