import Foundation
import CoreLocation

/// Haversine distance + unit conversion + accuracy gating, kept in parity with
/// the TS `calculateDistance` in `src/utils/gpsCalculations.ts` via the shared
/// fixtures in `fixtures/distance-vectors.json`. EARTH_RADIUS_METERS = 6_371_000.
enum DistanceEngine {
    static let earthRadiusMetres = 6_371_000.0
    static let metresToYards = 1.09361

    static func metres(from a: LatLng, to b: LatLng) -> Double {
        let dLat = (b.latitude - a.latitude) * .pi / 180
        let dLon = (b.longitude - a.longitude) * .pi / 180
        let lat1 = a.latitude * .pi / 180
        let lat2 = b.latitude * .pi / 180
        let h = sin(dLat / 2) * sin(dLat / 2)
            + sin(dLon / 2) * sin(dLon / 2) * cos(lat1) * cos(lat2)
        return 2 * earthRadiusMetres * asin(min(1, sqrt(h)))
    }

    /// Display distance rounded to a whole number in the requested unit.
    static func display(_ metresValue: Double, unit: String) -> Int {
        let value = unit == "yards" ? metresValue * metresToYards : metresValue
        return Int(value.rounded())
    }

    /// True when a CoreLocation horizontal accuracy is good enough to trust
    /// (negative means invalid). Threshold matches the design's ~20m gate.
    static func isAccurate(_ accuracy: CLLocationAccuracy) -> Bool {
        accuracy >= 0 && accuracy <= 20
    }
}
