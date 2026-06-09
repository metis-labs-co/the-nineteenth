import SwiftUI

/// On-screen rotation (clockwise from up) for the wind arrow. Mirrors
/// `windArrowDegrees` in src/watch/windArrow.ts (kept in sync; unit-tested there).
/// `+180` turns "wind from" into "wind blows to"; `- heading` makes it head-up.
func windArrowDegrees(fromDeg: Double, heading: Double) -> Double {
    let v = fromDeg + 180 - heading
    return (v.truncatingRemainder(dividingBy: 360) + 360).truncatingRemainder(dividingBy: 360)
}

/// km/h for metres, mph for yards (follows the user's distance unit).
func windSpeedText(_ kph: Double, unit: String?) -> String {
    if unit == "yards" { return "\(Int((kph * 0.621371).rounded()))" }
    return "\(Int(kph.rounded()))"
}

/// Top-corner wind indicator: an arrow pointing the way the wind blows TO, rotated
/// head-up so it tracks the wind as the user turns, plus the speed.
/// `headingDegrees == nil` → north-up fallback with an "N" marker.
struct WindIndicator: View {
    let wind: WatchWind
    let unit: String?
    let headingDegrees: Double?

    var body: some View {
        let angle = windArrowDegrees(fromDeg: wind.fromDeg, heading: headingDegrees ?? 0)
        HStack(spacing: 1) {
            Image(systemName: "arrow.up")
                .rotationEffect(.degrees(angle))
                .animation(.easeOut(duration: 0.3), value: angle)
            Text(windSpeedText(wind.speedKph, unit: unit)).monospacedDigit()
            if headingDegrees == nil {
                Text("N").font(.system(size: 8, weight: .semibold))
            }
        }
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
}

/// Live distance to the green, computed on-watch from its own GPS against the
/// cached green coords. Default screen once a round is live.
///
/// Horizontal paging = holes, kept in sync with the phone's current hole (same
/// pattern as `ScoreView`): swiping here drives the phone, and phone-initiated
/// navigation is followed back.
struct DistanceView: View {
    @ObservedObject var connectivity: ConnectivityClient
    @ObservedObject var location: LocationProvider
    @State private var holeIndex = 0
    @State private var didInitHole = false

    private var snapshot: WatchSnapshot? { connectivity.snapshot }

    var body: some View {
        if let snapshot, !snapshot.holes.isEmpty {
            TabView(selection: $holeIndex) {
                ForEach(Array(snapshot.holes.enumerated()), id: \.element.hole) { index, hole in
                    HoleDistancePage(hole: hole, connectivity: connectivity, location: location)
                        // selection (holeIndex) is positional; tag mirrors the enumeration order
                        .tag(index)
                }
            }
            .tabViewStyle(.page) // horizontal paging = holes
            .navigationTitle("Distance")
            .onAppear {
                location.start()
                guard !didInitHole else { return }
                didInitHole = true
                holeIndex = snapshot.holes.firstIndex { $0.hole == snapshot.currentHole } ?? 0
            }
            .onDisappear { location.stop() }
            .onChange(of: snapshot.currentHole) { _, newHole in
                // Follow phone-initiated navigation.
                if let i = snapshot.holes.firstIndex(where: { $0.hole == newHole }), i != holeIndex {
                    holeIndex = i
                }
            }
            .onChange(of: holeIndex) { _, newIndex in
                // Watch-initiated navigation -> drive the phone (skip the echo
                // when we just followed the phone).
                guard snapshot.holes.indices.contains(newIndex) else { return }
                let hole = snapshot.holes[newIndex].hole
                if hole != snapshot.currentHole { connectivity.navigate(toHole: hole) }
            }
        } else {
            Text("No round")
                .foregroundStyle(.secondary)
                .navigationTitle("Distance")
        }
    }
}

/// One hole's distance readout: centre (big), front/back below, wind in the corner.
private struct HoleDistancePage: View {
    let hole: WatchHole
    @ObservedObject var connectivity: ConnectivityClient
    @ObservedObject var location: LocationProvider

    private var wind: WatchWind? { connectivity.snapshot?.wind }
    private var unit: String? { connectivity.snapshot?.unit }

    /// True heading when valid, else magnetic; nil when no compass fix yet.
    private var headingDegrees: Double? {
        guard let h = location.heading else { return nil }
        return h.trueHeading >= 0 ? h.trueHeading : h.magneticHeading
    }

    private func distance(to point: LatLng?) -> String {
        guard
            let point,
            let loc = location.current,
            DistanceEngine.isAccurate(loc.horizontalAccuracy),
            let unit
        else { return "—" }
        let here = LatLng(latitude: loc.coordinate.latitude, longitude: loc.coordinate.longitude)
        return "\(DistanceEngine.display(DistanceEngine.metres(from: here, to: point), unit: unit))"
    }

    var body: some View {
        VStack(spacing: 2) {
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
        }
        .padding(.horizontal)
        .overlay(alignment: .topTrailing) {
            if let wind {
                WindIndicator(wind: wind, unit: unit, headingDegrees: headingDegrees)
                    .padding(.trailing, 2)
            }
        }
    }
}
