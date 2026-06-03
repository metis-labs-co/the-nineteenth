# Watch Score Screen — Blank Default + Synced Hole Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Default the watch gross score to "—" (so a par-maker's explicit input saves), and add horizontal swipe to navigate holes kept in sync with the phone, with a top player picker.

**Architecture:** The watch `ScoreView` becomes a horizontal paged `TabView` over all holes (driven by a local `holeIndex` that follows/drives the phone's `currentHole`); each hole page has a top player picker + vertical-scroll gross/stats. A new `{type:"navigate",hole}` message flows watch→phone, routed (by `type`) to a new `onNavigate` transport handler that calls `setCurrentHole`. The gross value becomes optional (`nil` = "—").

**Tech Stack:** TypeScript + Jest (transport routing), SwiftUI + WatchConnectivity (watch app). Spec: `docs/superpowers/specs/2026-06-03-watch-hole-nav-and-blank-default-design.md`.

---

## Dual-Source Note (read before editing Swift)

The watch Swift sources exist as **two identical copies**. Every Swift edit applies to **both**, kept byte-identical:
- `ios/TheNineteenthWatch Watch App/<File>.swift` — compiled by the Xcode target
- `watch/<dir>/<File>.swift` — the mirror copy (ScoreView → `watch/Views/`, ConnectivityClient → `watch/Services/`)

After each Swift edit verify: `diff "ios/TheNineteenthWatch Watch App/<File>.swift" "watch/<dir>/<File>.swift" && echo IDENTICAL`

**Watch build command (Swift verification gate, used throughout):**
```bash
xcodebuild -workspace ios/TheNineteenth.xcworkspace \
  -scheme "TheNineteenthWatch Watch App" -configuration Debug \
  -destination 'platform=watchOS Simulator,name=Apple Watch Series 9 (45mm)' \
  -derivedDataPath ios/build/watch build 2>&1 | tail -6
```
Expected: `** BUILD SUCCEEDED **`

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/watch/types.ts` | bridge message shapes | add `WatchNavigate` |
| `src/watch/transport.ts` | phone-side WCSession transport | `isWatchNavigate` guard + `onNavigate`; discriminate inbound by `type` |
| `src/watch/__tests__/transport.test.ts` | transport unit tests | test the routing guard |
| `src/watch/useWatchBridge.ts` | bridge wiring | subscribe `onNavigate` → `setCurrentHole` |
| `ios/.../ConnectivityClient.swift` + `watch/Services/ConnectivityClient.swift` | WCSession client | `navigate(toHole:)` |
| `ios/.../ScoreView.swift` + `watch/Views/ScoreView.swift` | score UI | blank "—" default; then restructure to horizontal holes + sync + player picker |

---

## Task 1: Navigate message type + transport routing (TypeScript) — TDD

**Files:**
- Modify: `src/watch/types.ts`
- Modify: `src/watch/transport.ts`
- Modify: `src/watch/__tests__/transport.test.ts`

- [ ] **Step 1: Add the message type**

In `src/watch/types.ts`, add near the other message interfaces (e.g. after `WatchScoreWrite`):
```typescript
/** Watch → phone: move the active hole. Discriminated from score writes by `type`. */
export interface WatchNavigate {
  type: 'navigate';
  hole: number;
}
```

- [ ] **Step 2: Write the failing test for the routing guard**

In `src/watch/__tests__/transport.test.ts`, add:
```typescript
import { createNullTransport, isWatchNavigate } from '../transport';

describe('isWatchNavigate', () => {
  it('returns true for a navigate message', () => {
    expect(isWatchNavigate({ type: 'navigate', hole: 5 })).toBe(true);
  });
  it('returns false for a score write (no type field)', () => {
    expect(isWatchNavigate({ clientWriteId: 'w1', hole: 5, playerId: 'p', strokes: 4 })).toBe(false);
  });
  it('returns false for junk / wrong shape', () => {
    expect(isWatchNavigate(null)).toBe(false);
    expect(isWatchNavigate({ type: 'navigate' })).toBe(false); // missing hole
    expect(isWatchNavigate({ type: 'other', hole: 1 })).toBe(false);
  });
});
```
(Keep the existing `createNullTransport` import working — update the import line to include `isWatchNavigate` as shown.)

- [ ] **Step 3: Run the test, verify it fails**

Run: `npx jest src/watch/__tests__/transport.test.ts`
Expected: FAIL — `isWatchNavigate` is not exported.

- [ ] **Step 4: Implement the guard, the interface method, and routing**

In `src/watch/transport.ts`:

(a) Update the import to add `WatchNavigate`:
```typescript
import type { WatchSnapshot, WatchScoreWrite, WatchAck, WatchNavigate } from './types';
```

(b) Add the exported guard (top-level, after imports):
```typescript
export function isWatchNavigate(msg: unknown): msg is WatchNavigate {
  return (
    typeof msg === 'object' && msg !== null &&
    (msg as { type?: unknown }).type === 'navigate' &&
    typeof (msg as { hole?: unknown }).hole === 'number'
  );
}
```

(c) Add `onNavigate` to the `WatchTransport` interface (after `onMessage`):
```typescript
  onNavigate(handler: (nav: WatchNavigate) => void): () => void;
```

(d) Add `onNavigate` to `createNullTransport`'s returned object (after `onMessage`):
```typescript
    onNavigate: () => () => {},
```

(e) In `createWatchConnectivityTransport`, make `onMessage` ignore navigate messages and add `onNavigate`. Replace the existing `onMessage` property with:
```typescript
    onMessage: (handler) => {
      const fwd = (m: any) => { if (!isWatchNavigate(m)) handler(m as WatchScoreWrite); };
      const a = rnwc.watchEvents.addListener('message', fwd);
      const b = rnwc.watchEvents.addListener('user-info', fwd);
      return () => { a(); b(); };
    },
    onNavigate: (handler) => {
      const fwd = (m: any) => { if (isWatchNavigate(m)) handler(m as WatchNavigate); };
      const a = rnwc.watchEvents.addListener('message', fwd);
      const b = rnwc.watchEvents.addListener('user-info', fwd);
      return () => { a(); b(); };
    },
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `npx jest src/watch/__tests__/transport.test.ts`
Expected: PASS (all, including the 3 new guard tests).

- [ ] **Step 6: Type-check**

Run: `pnpm type-check 2>&1 | grep -E "watch/(types|transport|__tests__)"; echo done`
Expected: no lines before `done`.

- [ ] **Step 7: Commit**
```bash
git add src/watch/types.ts src/watch/transport.ts src/watch/__tests__/transport.test.ts
git commit -m "feat(watch): WatchNavigate message + transport onNavigate routing"
```

---

## Task 2: Bridge subscribes to navigate → setCurrentHole (TypeScript)

**Files:**
- Modify: `src/watch/useWatchBridge.ts`

- [ ] **Step 1: Pull `setCurrentHole` from the store**

In `src/watch/useWatchBridge.ts`, near the other `useScorecardStore` selectors (e.g. after `const updatePlayerHoleScore = useScorecardStore((s) => s.updatePlayerHoleScore);`), add:
```typescript
  const setCurrentHole = useScorecardStore((s) => s.setCurrentHole);
```

- [ ] **Step 2: Add an effect subscribing to navigate messages**

In `src/watch/useWatchBridge.ts`, after the existing "Effect 2: apply inbound writes and ack" `useEffect`, add:
```typescript
  // ── Effect 3: apply inbound hole-navigation from the watch ────────────────
  useEffect(() => {
    if (!transport.isSupported() || !roundId || !user) return;
    const off = transport.onNavigate((nav) => {
      setCurrentHole(nav.hole);
    });
    return off;
  }, [transport, roundId, user, setCurrentHole]);
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check 2>&1 | grep -E "watch/useWatchBridge"; echo done`
Expected: no lines before `done`.

- [ ] **Step 4: Sanity — existing watch tests still pass**

Run: `npx jest src/watch`
Expected: all pass (this file has no unit test; this confirms nothing else broke).

- [ ] **Step 5: Commit**
```bash
git add src/watch/useWatchBridge.ts
git commit -m "feat(watch): apply watch hole navigation via setCurrentHole"
```

---

## Task 3: ConnectivityClient.navigate(toHole:) (Swift)

**Files (edit BOTH, keep identical):**
- Modify: `ios/TheNineteenthWatch Watch App/ConnectivityClient.swift`
- Modify: `watch/Services/ConnectivityClient.swift`

- [ ] **Step 1: Add the navigate sender**

In the `// MARK: - Sending` section of BOTH files, directly after the existing `send(write:)` method, add:
```swift
    /// Tell the phone to move the active hole. Real-time, so prefer `sendMessage`
    /// when reachable; fall back to `transferUserInfo` for guaranteed delivery.
    func navigate(toHole hole: Int) {
        let msg: [String: Any] = ["type": "navigate", "hole": hole]
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(msg, replyHandler: nil) { _ in
                WCSession.default.transferUserInfo(msg)
            }
        } else {
            WCSession.default.transferUserInfo(msg)
        }
    }
```

- [ ] **Step 2: Verify identical**

Run: `diff "ios/TheNineteenthWatch Watch App/ConnectivityClient.swift" watch/Services/ConnectivityClient.swift && echo IDENTICAL`
Expected: `IDENTICAL`

- [ ] **Step 3: Build**

Run the watch build command. Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 4: Commit**
```bash
git add "ios/TheNineteenthWatch Watch App/ConnectivityClient.swift" watch/Services/ConnectivityClient.swift
git commit -m "feat(watch): send navigate message to move the phone's hole"
```

---

## Task 4: Score defaults to "—" (Swift, Section A)

Minimal change to the **current** `ScoreView` structure so the gross value starts blank. (Task 5 later restructures the screen but preserves this behaviour.)

**Files (edit BOTH, keep identical):**
- Modify: `ios/TheNineteenthWatch Watch App/ScoreView.swift`
- Modify: `watch/Views/ScoreView.swift`

- [ ] **Step 1: Make the stroke state optional**

Change the declaration `@State private var strokes: Int = 0` to:
```swift
    @State private var strokes: Int? = nil // nil = "—" (not entered)
```

- [ ] **Step 2: Update the gross stepper display + buttons**

In `grossSection`, replace the `HStack(spacing: 12) { … }` (the minus button / number / plus button) with:
```swift
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
```
(The `Par` and `Pick up` buttons below are unchanged — `Par` already sets `strokes = hole.par`.)

- [ ] **Step 3: Stop defaulting to par in loadExisting**

In `loadExisting()`, change:
```swift
        strokes = existing?.strokes ?? hole.par
```
to:
```swift
        strokes = existing?.strokes // nil -> "—"; no par fallback
```

- [ ] **Step 4: Guard commit against a nil value**

Replace `commit()` with:
```swift
    private func commit() {
        guard let s = strokes else { return }
        send(strokes: .number(s))
    }
```

- [ ] **Step 5: Verify identical + build**

Run: `diff "ios/TheNineteenthWatch Watch App/ScoreView.swift" watch/Views/ScoreView.swift && echo IDENTICAL` then the watch build command.
Expected: `IDENTICAL` then `** BUILD SUCCEEDED **`.

- [ ] **Step 6: Commit**
```bash
git add "ios/TheNineteenthWatch Watch App/ScoreView.swift" watch/Views/ScoreView.swift
git commit -m "feat(watch): default gross score to — so a par must be tapped to save"
```

---

## Task 5: Restructure ScoreView — horizontal holes + sync + player picker (Swift, Sections B & C)

This replaces the entire `ScoreView.swift` with a horizontal hole `TabView` (driving/following the phone's `currentHole`), a top player picker, and per-hole pages. It carries forward the Task 4 blank-default behaviour.

**Files (edit BOTH, keep identical):**
- Replace: `ios/TheNineteenthWatch Watch App/ScoreView.swift`
- Replace: `watch/Views/ScoreView.swift`

- [ ] **Step 1: Replace the file contents (BOTH copies) with:**

```swift
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
```

- [ ] **Step 2: Verify identical**

Run: `diff "ios/TheNineteenthWatch Watch App/ScoreView.swift" watch/Views/ScoreView.swift && echo IDENTICAL`
Expected: `IDENTICAL`

- [ ] **Step 3: Build**

Run the watch build command. Expected: `** BUILD SUCCEEDED **`.
If it fails on `onChange(of:)`'s two-parameter closure, confirm the watchOS deployment target is 10.0+ (it is); the `(oldValue, newValue)` form is available on watchOS 10. If `Color.score`/`.brandPrimary`/`.brandSuccess`/`.brandWarning` are unresolved, they are existing extensions used by the prior ScoreView — do not redefine them; ensure the import/those files are unchanged.

- [ ] **Step 4: Commit**
```bash
git add "ios/TheNineteenthWatch Watch App/ScoreView.swift" watch/Views/ScoreView.swift
git commit -m "feat(watch): horizontal hole navigation synced to phone + player picker"
```

---

## Task 6: On-device verification (simulators)

No automated Swift tests exist for the watch target. Verify on the paired sims (build the watch scheme, install on the paired Apple Watch, run the phone app + Metro, start a round). The phone dev-client needs the temporary `runtimeVersion` dev-shim to load over the separate Metro (see prior session notes) — pin `app.json` `runtimeVersion` to `"1.12.7"` for the test, then revert.

- [ ] **Step 1: Blank default** — open a hole with no score: gross shows `—`. Tap `Par` → phone records par for that hole. Tap nothing on another hole → phone records nothing there.
- [ ] **Step 2: Watch → phone hole sync** — swipe left/right on the watch: the phone's score-entry screen moves to the same hole.
- [ ] **Step 3: Phone → watch hole sync** — tap Next Hole / Quick View on the phone: the watch follows to that hole.
- [ ] **Step 4: Score a non-current hole** — from the watch, swipe to a different hole and enter a score → it persists on the phone for that hole.
- [ ] **Step 5: Player picker** — with a scoring pair (2+ players), the top picker switches the marked player and the gross/stats reflect that player; with a solo round the picker is hidden.

---

## Self-Review Notes

- **Spec coverage:** Section A (blank default) → Task 4 (and carried in Task 5). Section B (horizontal holes + sync) → Tasks 1, 2, 3, 5. Section C (player picker) → Task 5. Transport routing test → Task 1. On-device → Task 6. ✅
- **Type/name consistency:** `WatchNavigate` (`{type:'navigate', hole:number}`) defined in Task 1, consumed in Tasks 1/2 (TS) and produced as `["type":"navigate","hole":hole]` in Task 3 (Swift) — shapes match. `isWatchNavigate` used in `transport.ts` only. `navigate(toHole:)` (Swift) called from `ScoreView` Task 5. `setCurrentHole` is a real `scorecardStore` action. `strokes: Int?` consistent across Task 4 and Task 5. ✅
- **No placeholders:** every code step is complete. ✅
