import SwiftUI

/// Live distance to the green, computed on-watch from its own GPS against the
/// cached green coords. Default screen once a round is live.
struct DistanceView: View {
    @ObservedObject var connectivity: ConnectivityClient
    @ObservedObject var location: LocationProvider

    private var hole: WatchHole? { connectivity.snapshot?.currentHoleObject }

    private func distance(to point: LatLng?) -> String {
        guard
            let point,
            let loc = location.current,
            DistanceEngine.isAccurate(loc.horizontalAccuracy),
            let unit = connectivity.snapshot?.unit
        else { return "—" }
        let here = LatLng(latitude: loc.coordinate.latitude, longitude: loc.coordinate.longitude)
        return "\(DistanceEngine.display(DistanceEngine.metres(from: here, to: point), unit: unit))"
    }

    var body: some View {
        VStack(spacing: 2) {
            if let hole {
                Text("Hole \(hole.hole) · Par \(hole.par)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text(distance(to: hole.green.center))
                    .font(.system(size: 56, weight: .bold))
                    .monospacedDigit()
                Text("to centre")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Spacer(minLength: 8)
                HStack {
                    Text("F \(distance(to: hole.green.front))")
                    Spacer()
                    Text("B \(distance(to: hole.green.back))")
                }
                .font(.footnote)
                .monospacedDigit()
            } else {
                Text("No round").foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal)
        .navigationTitle("Distance")
        .onAppear { location.start() }
        .onDisappear { location.stop() }
    }
}
