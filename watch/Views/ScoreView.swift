import SwiftUI

/// Score entry. Horizontal paging = holes (kept in sync with the phone's current
/// hole). Each hole page: a top player picker (for scoring pairs) over a
/// vertical-scroll gross + stat sections.
struct ScoreView: View {
    @ObservedObject var connectivity: ConnectivityClient
    @State private var holeIndex = 0
    @State private var selectedPlayerIndex = 0
    @State private var didInitHole = false

    private var snapshot: WatchSnapshot? { connectivity.snapshot }

    var body: some View {
        if let snapshot, !snapshot.holes.isEmpty, !snapshot.pairPlayers.isEmpty {
            TabView(selection: $holeIndex) {
                ForEach(Array(snapshot.holes.enumerated()), id: \.element.hole) { index, hole in
                    HoleScorePage(connectivity: connectivity, snapshot: snapshot,
                                  hole: hole, selectedPlayerIndex: $selectedPlayerIndex)
                        // selection (holeIndex) is positional; tag mirrors the enumeration order
                        .tag(index)
                }
            }
            .tabViewStyle(.page) // horizontal paging = holes
            .navigationTitle("Score")
            .onAppear {
                guard !didInitHole else { return }
                didInitHole = true
                holeIndex = snapshot.holes.firstIndex { $0.hole == snapshot.currentHole } ?? 0
            }
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
            Text("No round to score").foregroundStyle(.secondary)
        }
    }
}

/// One hole's scrollable page: player picker (pairs only) + gross + stat sections.
private struct HoleScorePage: View {
    @ObservedObject var connectivity: ConnectivityClient
    let snapshot: WatchSnapshot
    let hole: WatchHole
    @Binding var selectedPlayerIndex: Int

    @State private var strokes: Int? = nil // nil = "—" (not entered)
    @State private var putts: Int = 0
    @State private var bunkerShots: Int = 0
    @State private var fairway: String? // "hit"|"left"|"right"|"short"|"long"|"miss"
    @State private var gir: String?
    @State private var hazards: Set<String> = []

    private var flags: WatchStatFlags { snapshot.statFlags }
    private var player: WatchPairPlayer {
        // Safe: HoleScorePage is only built when pairPlayers is non-empty (parent guard).
        let i = min(max(selectedPlayerIndex, 0), snapshot.pairPlayers.count - 1)
        return snapshot.pairPlayers[i]
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                if snapshot.pairPlayers.count > 1 { playerPicker }
                grossSection
                savedIndicator
                if flags.putts { stepperSection(title: "Putts", value: $putts) { commit() } }
                if flags.fairways, hole.par >= 4 {
                    SegmentSection(title: "Fairway",
                                   options: flags.fairwayDirection == true
                                     ? ["hit", "left", "right", "short", "long"]
                                     : ["hit", "miss"],
                                   selection: $fairway) { commit() }
                }
                if flags.gir {
                    SegmentSection(title: "Green",
                                   options: flags.greenDirection == true
                                     ? ["hit", "left", "right", "short", "long"]
                                     : ["hit", "miss"],
                                   selection: $gir) { commit() }
                }
                if flags.bunker { stepperSection(title: "Bunker", value: $bunkerShots) { commit() } }
                if flags.penalties {
                    MultiSelectSection(title: "Penalties", options: ["water", "ob", "lateral", "lost_ball"], selection: $hazards) { commit() }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .onAppear(perform: loadExisting)
        .onChange(of: selectedPlayerIndex) { _, _ in loadExisting() }
        // Retained neighbor pages don't re-onAppear; resync when this hole's
        // stored score changes (another scorer / the phone updated it).
        .onChange(of: snapshot.score(playerId: player.playerId, hole: hole.hole)) { _, _ in loadExisting() }
    }

    // MARK: Sections

    private var playerPicker: some View {
        HStack(spacing: 6) {
            ForEach(Array(snapshot.pairPlayers.enumerated()), id: \.offset) { i, p in
                Button(p.name) { selectedPlayerIndex = i }
                    .font(.caption2)
                    .lineLimit(1)
                    .buttonStyle(.bordered)
                    .tint(selectedPlayerIndex == i ? .brandPrimary : .secondary)
            }
        }
    }

    private var grossSection: some View {
        VStack(spacing: 6) {
            Text("Hole \(hole.hole) · Par \(hole.par)")
                .font(.caption2).foregroundStyle(.secondary)
            HStack(spacing: 12) {
                StepButton(symbol: "minus") {
                    if let s = strokes { strokes = max(1, s - 1); commit() }
                }
                Text(strokes.map(String.init) ?? "—")
                    .font(.system(size: 44, weight: .bold))
                    .monospacedDigit()
                    .frame(minWidth: 44)
                    .foregroundStyle(strokes.map { Color.score(strokes: $0, par: hole.par) } ?? .primary)
                StepButton(symbol: "plus") {
                    strokes = (strokes ?? 0) + 1; commit()
                }
            }
            HStack(spacing: 8) {
                QuickButton(label: "Pick up") { commitPickup() }
                QuickButton(label: "Par", tinted: true) { strokes = hole.par; commit() }
            }
        }
    }

    private var savedIndicator: some View {
        Group {
            switch connectivity.saveState {
            case .saved:
                Label("Saved", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(Color.brandSuccess)
            case .failed:
                Label("Retry", systemImage: "exclamationmark.triangle.fill")
                    .foregroundStyle(Color.brandWarning)
            case .idle:
                Color.clear
            }
        }
        .font(.caption2)
        .frame(height: 16) // fixed slot so the layout never reflows
        .animation(.easeInOut(duration: 0.2), value: connectivity.saveState)
    }

    private func stepperSection(title: String, value: Binding<Int>, onChange: @escaping () -> Void) -> some View {
        VStack(spacing: 4) {
            Text(title).font(.headline)
            HStack(spacing: 12) {
                StepButton(symbol: "minus", tinted: false) {
                    value.wrappedValue = max(0, value.wrappedValue - 1); onChange()
                }
                Text("\(value.wrappedValue)").font(.system(size: 34, weight: .bold)).monospacedDigit().frame(minWidth: 34)
                StepButton(symbol: "plus", tinted: false) {
                    value.wrappedValue += 1; onChange()
                }
            }
        }
    }

    // MARK: Load / commit

    private func loadExisting() {
        let existing = snapshot.score(playerId: player.playerId, hole: hole.hole)
        strokes = existing?.strokes // nil -> "—"; no par fallback
        putts = existing?.putts ?? 0
        bunkerShots = existing?.bunkerShots ?? 0
        fairway = existing?.fairwayHit == true ? "hit"
            : (existing?.fairwayMissDirection ?? (existing?.fairwayHit == false ? "miss" : nil))
        gir = existing?.greenInRegulation == true ? "hit"
            : (existing?.greenMissDirection ?? (existing?.greenInRegulation == false ? "miss" : nil))
        // If direction mode is off, collapse any stored directional miss to a
        // plain "miss" so the loaded value matches the hit/miss-only options.
        if let f = fairway, flags.fairwayDirection != true, f != "hit", f != "miss" { fairway = "miss" }
        if let g = gir, flags.greenDirection != true, g != "hit", g != "miss" { gir = "miss" }
        hazards = Set((existing?.hazards ?? []).map { $0.type })
    }

    private func buildStat() -> WatchScoreStat? {
        var stat = WatchScoreStat()
        if flags.putts { stat.putts = putts }
        if flags.bunker { stat.bunkerShots = bunkerShots }
        if flags.fairways, let fairway {
            stat.fairwayHit = (fairway == "hit")
            stat.fairwayMissDirection =
                (flags.fairwayDirection == true && fairway != "hit") ? fairway : nil
        }
        if flags.gir, let gir {
            stat.greenInRegulation = (gir == "hit")
            stat.greenMissDirection =
                (flags.greenDirection == true && gir != "hit") ? gir : nil
        }
        if flags.penalties { stat.hazards = hazards.sorted().map { WatchHazard(type: $0) } }
        let empty = stat.putts == nil && stat.bunkerShots == nil && stat.fairwayHit == nil
            && stat.greenInRegulation == nil && (stat.hazards?.isEmpty ?? true)
        return empty ? nil : stat
    }

    private func commit() {
        guard let s = strokes else { return }
        send(strokes: .number(s))
    }

    private func commitPickup() {
        send(strokes: .pickup)
    }

    private func send(strokes: StrokesValue) {
        let write = WatchScoreWrite(
            clientWriteId: UUID().uuidString,
            ts: Date().timeIntervalSince1970,
            baseRev: snapshot.rev,
            roundId: snapshot.roundId,
            hole: hole.hole,
            playerId: player.playerId,
            strokes: strokes,
            stat: buildStat()
        )
        connectivity.send(write: write)
    }
}

// MARK: - Reusable controls

private struct StepButton: View {
    let symbol: String
    var tinted: Bool = true
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 20, weight: .bold))
                .frame(width: 44, height: 44)
        }
        .buttonStyle(.borderedProminent)
        .tint(tinted ? .brandPrimary : .gray)
        .clipShape(RoundedRectangle(cornerRadius: 13))
    }
}

private struct QuickButton: View {
    let label: String
    var tinted: Bool = false
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(label).font(.caption).frame(maxWidth: .infinity)
        }
        .buttonStyle(.bordered)
        .tint(tinted ? .brandPrimary : .secondary)
    }
}

/// Single-select segmented control (FIR/GIR).
private struct SegmentSection: View {
    let title: String
    let options: [String]
    @Binding var selection: String?
    let onChange: () -> Void

    var body: some View {
        VStack(spacing: 4) {
            Text(title).font(.headline)
            HStack(spacing: 6) {
                ForEach(options, id: \.self) { option in
                    Button(label(option)) {
                        selection = (selection == option) ? nil : option
                        onChange()
                    }
                    .font(.caption2)
                    .buttonStyle(.bordered)
                    .tint(selection == option ? .brandPrimary : .secondary)
                }
            }
        }
    }

    private func label(_ option: String) -> String {
        switch option {
        case "hit": return "✓"
        case "left": return "L"
        case "right": return "R"
        case "short": return "S"
        case "long": return "Lo"
        case "miss": return "✗"
        default: return option
        }
    }
}

/// Multi-select toggles (penalties/hazards).
private struct MultiSelectSection: View {
    let title: String
    let options: [String]
    @Binding var selection: Set<String>
    let onChange: () -> Void

    var body: some View {
        VStack(spacing: 4) {
            Text(title).font(.headline)
            HStack(spacing: 6) {
                ForEach(options, id: \.self) { option in
                    Button(label(option)) {
                        if selection.contains(option) { selection.remove(option) } else { selection.insert(option) }
                        onChange()
                    }
                    .font(.caption2)
                    .buttonStyle(.bordered)
                    .tint(selection.contains(option) ? .brandWarning : .secondary)
                }
            }
        }
    }

    private func label(_ option: String) -> String {
        switch option {
        case "water": return "Wtr"
        case "ob": return "OB"
        case "lateral": return "Lat"
        case "lost_ball": return "Lost"
        default: return option
        }
    }
}
