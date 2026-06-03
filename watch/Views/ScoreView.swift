import SwiftUI

/// Score entry for the players in the user's scoring-pair. Horizontal paging
/// switches players; vertical scroll reveals optional Premium stat sections.
struct ScoreView: View {
    @ObservedObject var connectivity: ConnectivityClient
    @State private var playerIndex = 0

    private var snapshot: WatchSnapshot? { connectivity.snapshot }

    var body: some View {
        if let snapshot, !snapshot.pairPlayers.isEmpty {
            TabView(selection: $playerIndex) {
                ForEach(Array(snapshot.pairPlayers.enumerated()), id: \.element.playerId) { index, player in
                    PlayerScorePage(connectivity: connectivity, snapshot: snapshot, player: player)
                        .tag(index)
                }
            }
            .tabViewStyle(.verticalPage)
            .navigationTitle("Score")
        } else {
            Text("No players to score").foregroundStyle(.secondary)
        }
    }
}

/// One scrollable page for a single player: gross + optional stat sections.
private struct PlayerScorePage: View {
    @ObservedObject var connectivity: ConnectivityClient
    let snapshot: WatchSnapshot
    let player: WatchPairPlayer

    @State private var strokes: Int? = nil // nil = "—" (not entered)
    @State private var putts: Int = 0
    @State private var bunkerShots: Int = 0
    @State private var fairway: String? // "hit"|"left"|"right"|"short"|"long"
    @State private var gir: String?
    @State private var hazards: Set<String> = []

    private var hole: WatchHole? { snapshot.currentHoleObject }
    private var flags: WatchStatFlags { snapshot.statFlags }

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                grossSection
                savedIndicator
                if flags.putts { stepperSection(title: "Putts", value: $putts) { commit() } }
                if flags.fairways, let hole, hole.par >= 4 {
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
    }

    // MARK: Sections

    private var grossSection: some View {
        VStack(spacing: 6) {
            if let hole {
                Text("Hole \(hole.hole) · Par \(hole.par)")
                    .font(.caption2).foregroundStyle(.secondary)
            }
            Text("Marking: \(player.name)").font(.caption2)
            HStack(spacing: 12) {
                StepButton(symbol: "minus") {
                    if let s = strokes { strokes = max(1, s - 1); commit() }
                }
                Text(strokes.map(String.init) ?? "—")
                    .font(.system(size: 44, weight: .bold))
                    .monospacedDigit()
                    .frame(minWidth: 44)
                    .foregroundStyle(strokes.flatMap { s in hole.map { Color.score(strokes: s, par: $0.par) } } ?? .primary)
                StepButton(symbol: "plus") {
                    strokes = (strokes ?? 0) + 1; commit()
                }
            }
            HStack(spacing: 8) {
                QuickButton(label: "Pick up") { commitPickup() }
                QuickButton(label: "Par", tinted: true) {
                    if let hole { strokes = hole.par; commit() }
                }
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
        guard let hole else { return }
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
        // Nil only when no stat category is enabled at all.
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
        guard let hole else { return }
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
