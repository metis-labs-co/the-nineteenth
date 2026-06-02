# Watch Scoring — Save Feedback & Stat Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Apple Watch scorer clear save feedback (auto-save stays) and make its stat-input sections appear per the same tier rules the phone uses, including hit/miss-vs-direction granularity.

**Architecture:** The phone already builds a tier-resolved `WatchSnapshot.statFlags` and the watch already auto-saves each change via `transferUserInfo`. We (1) extend `statFlags` with two booleans for fairway/green miss-direction, (2) delete the coarse `isPremium` gate in the watch `ScoreView` so it renders by flag, and (3) add an optimistic `✓ Saved` indicator + haptic driven by a new `saveState` on `ConnectivityClient`.

**Tech Stack:** TypeScript + Jest (snapshot builder), SwiftUI + WatchConnectivity (watch app). Spec: `docs/superpowers/specs/2026-06-02-watch-scoring-feedback-and-stats-design.md`.

---

## Dual-Source Note (read before editing Swift)

The watch Swift sources exist as **two identical copies**. Every Swift edit in this plan must be applied to **both** files, kept byte-identical:

- `ios/TheNineteenthWatch Watch App/<File>.swift` — compiled by the Xcode target
- `watch/<dir>/<File>.swift` — the mirror copy

After editing, verify they match: `diff "ios/TheNineteenthWatch Watch App/ScoreView.swift" watch/Views/ScoreView.swift` (and likewise for `WatchSnapshot.swift` ↔ `watch/Models/WatchSnapshot.swift`, `ConnectivityClient.swift` ↔ `watch/Services/ConnectivityClient.swift`).

**Watch build command (used for Swift verification throughout):**

```bash
xcodebuild -workspace ios/TheNineteenth.xcworkspace \
  -scheme "TheNineteenthWatch Watch App" -configuration Debug \
  -destination 'platform=watchOS Simulator,name=Apple Watch Series 9 (45mm)' \
  -derivedDataPath ios/build/watch build 2>&1 | tail -5
```
Expected (success): `** BUILD SUCCEEDED **`

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/watch/types.ts` | TS snapshot/stat shapes | add `fairwayDirection`, `greenDirection` to `WatchStatFlags` |
| `src/watch/useWatchBridge.ts` | builds `statFlags` from phone tier state | map the two new flags |
| `src/watch/__tests__/snapshot.test.ts` | pure snapshot-builder tests | update fixture + add passthrough test |
| `ios/TheNineteenthWatch Watch App/WatchSnapshot.swift` + `watch/Models/WatchSnapshot.swift` | Swift snapshot model | add two optional `Bool` flags |
| `ios/TheNineteenthWatch Watch App/ConnectivityClient.swift` + `watch/Services/ConnectivityClient.swift` | WCSession client | add `saveState` + haptic; (optional) ack-receive |
| `ios/TheNineteenthWatch Watch App/ScoreView.swift` + `watch/Views/ScoreView.swift` | scoring UI | drop `isPremium` gates; hit/miss-vs-direction; save indicator |

---

## Task 1: Extend `WatchStatFlags` (TypeScript) — TDD

**Files:**
- Modify: `src/watch/__tests__/snapshot.test.ts:75` and `:96`
- Modify: `src/watch/types.ts:17-19`
- Modify: `src/watch/useWatchBridge.ts` (the `statFlags` literal, ~line 72)

- [ ] **Step 1: Update the test fixture and assertion, add a passthrough test**

In `src/watch/__tests__/snapshot.test.ts`, change the `baseInput` `statFlags` (line 75) to include the two new flags:

```typescript
  statFlags: { putts: true, fairways: true, gir: false, penalties: false, bunker: true, fairwayDirection: false, greenDirection: false },
```

Change the existing assertion (line 96) to match:

```typescript
    expect(snap.statFlags).toEqual({ putts: true, fairways: true, gir: false, penalties: false, bunker: true, fairwayDirection: false, greenDirection: false });
```

Add a new test inside the `describe('buildWatchSnapshot', ...)` block:

```typescript
  it('passes through the fairway/green miss-direction stat flags', () => {
    const input = baseInput();
    input.statFlags = { ...input.statFlags, fairwayDirection: true, greenDirection: true };
    const snap = buildWatchSnapshot(input);
    expect(snap.statFlags.fairwayDirection).toBe(true);
    expect(snap.statFlags.greenDirection).toBe(true);
  });
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx jest src/watch/__tests__/snapshot.test.ts`
Expected: FAIL — TypeScript compile error that `fairwayDirection`/`greenDirection` are not in type `WatchStatFlags` (object literal may only specify known properties).

- [ ] **Step 3: Add the fields to the type**

In `src/watch/types.ts`, replace the `WatchStatFlags` interface (lines 17-19):

```typescript
export interface WatchStatFlags {
  putts: boolean; fairways: boolean; gir: boolean; penalties: boolean; bunker: boolean;
  /** Show fairway miss direction (Premium); when false, fairway is hit/miss only. */
  fairwayDirection: boolean;
  /** Show green miss direction (Premium); when false, green is hit/miss only. */
  greenDirection: boolean;
}
```

- [ ] **Step 4: Map the flags in the bridge**

In `src/watch/useWatchBridge.ts`, find the `statFlags` literal (the `const statFlags: WatchStatFlags = { ... }` near line 72) and add the two fields so it reads:

```typescript
  const statFlags: WatchStatFlags = {
    putts: vis.showPutts,
    fairways: vis.showFairwayHit,
    gir: vis.showGreenInRegulation,
    penalties: vis.showHazards,
    bunker: vis.showBunkerShots,
    fairwayDirection: vis.showFairwayMissDirection,
    greenDirection: vis.showGreenMissDirection,
  };
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `npx jest src/watch/__tests__/snapshot.test.ts`
Expected: PASS (all tests, including the new passthrough test).

- [ ] **Step 6: Type-check**

Run: `pnpm type-check 2>&1 | grep -E "watch/(types|useWatchBridge|__tests__)" ; echo done`
Expected: no lines before `done` (no type errors in the watch files).

- [ ] **Step 7: Commit**

```bash
git add src/watch/types.ts src/watch/useWatchBridge.ts src/watch/__tests__/snapshot.test.ts
git commit -m "feat(watch): add fairway/green miss-direction stat flags to snapshot"
```

---

## Task 2: Add the flags to the Swift snapshot model

**Files (edit BOTH, keep identical):**
- Modify: `ios/TheNineteenthWatch Watch App/WatchSnapshot.swift:29-35`
- Modify: `watch/Models/WatchSnapshot.swift` (same struct)

- [ ] **Step 1: Add two optional Bool fields to `WatchStatFlags`**

Replace the `WatchStatFlags` struct in **both** files with:

```swift
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
```

- [ ] **Step 2: Verify the two copies are identical**

Run: `diff "ios/TheNineteenthWatch Watch App/WatchSnapshot.swift" watch/Models/WatchSnapshot.swift && echo IDENTICAL`
Expected: `IDENTICAL`

- [ ] **Step 3: Build the watch app**

Run the watch build command (top of plan).
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 4: Commit**

```bash
git add "ios/TheNineteenthWatch Watch App/WatchSnapshot.swift" watch/Models/WatchSnapshot.swift
git commit -m "feat(watch): add miss-direction flags to Swift WatchStatFlags"
```

---

## Task 3: Add `saveState` + haptic to `ConnectivityClient`

**Files (edit BOTH, keep identical):**
- Modify: `ios/TheNineteenthWatch Watch App/ConnectivityClient.swift`
- Modify: `watch/Services/ConnectivityClient.swift`

- [ ] **Step 1: Import WatchKit**

At the top of **both** files, add `import WatchKit` to the import list (after `import WidgetKit`).

- [ ] **Step 2: Add the `SaveState` type and published property**

Inside the `ConnectivityClient` class, directly under `@Published var lastContextSummary: String = "Waiting for phone…"`, add:

```swift
    /// Transient outcome of the most recent score write, for UI feedback.
    enum SaveState: Equatable { case idle, saved(Date), failed }
    @Published var saveState: SaveState = .idle

    /// Bumped on each send so a stale auto-reset can't clear a newer "saved".
    private var saveGeneration = 0
```

- [ ] **Step 3: Set `saveState` + haptic optimistically in `send`**

Replace the `send(write:)` method body in **both** files with:

```swift
    /// Send a score write to the phone. Uses `transferUserInfo` for guaranteed
    /// FIFO delivery that survives disconnects. Confirms optimistically — the
    /// write is queued for delivery even when the phone is unreachable.
    func send(write: WatchScoreWrite) {
        guard let dict = write.asDictionary() else { return }
        WCSession.default.transferUserInfo(dict)
        DispatchQueue.main.async {
            self.saveGeneration += 1
            let gen = self.saveGeneration
            self.saveState = .saved(Date())
            WKInterfaceDevice.current().play(.success)
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                if self.saveGeneration == gen { self.saveState = .idle }
            }
        }
    }
```

- [ ] **Step 4: Verify the two copies are identical**

Run: `diff "ios/TheNineteenthWatch Watch App/ConnectivityClient.swift" watch/Services/ConnectivityClient.swift && echo IDENTICAL`
Expected: `IDENTICAL`

- [ ] **Step 5: Build the watch app**

Run the watch build command.
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 6: Commit**

```bash
git add "ios/TheNineteenthWatch Watch App/ConnectivityClient.swift" watch/Services/ConnectivityClient.swift
git commit -m "feat(watch): optimistic saveState + success haptic on score write"
```

---

## Task 4: `ScoreView` — drop the gate, direction rendering, save indicator

**Files (edit BOTH, keep identical):**
- Modify: `ios/TheNineteenthWatch Watch App/ScoreView.swift`
- Modify: `watch/Views/ScoreView.swift`

- [ ] **Step 1: Render stat sections by flag (drop `isPremium`) with hit/miss-vs-direction**

In `PlayerScorePage.body`, replace the `ScrollView { VStack(...) { ... } }` content (the `grossSection` + `if snapshot.isPremium { ... }` block, lines ~44-63) with:

```swift
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
```

- [ ] **Step 2: Add the `savedIndicator` view (fixed-height, transient)**

In `PlayerScorePage`, directly below the `grossSection` computed property, add:

```swift
    private var savedIndicator: some View {
        Group {
            switch connectivity.saveState {
            case .saved:
                Label("Saved", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            case .failed:
                Label("Retry", systemImage: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
            case .idle:
                Color.clear
            }
        }
        .font(.caption2)
        .frame(height: 16) // fixed slot so the layout never reflows
        .animation(.easeInOut(duration: 0.2), value: connectivity.saveState)
    }
```

(Note: `connectivity` is already an `@ObservedObject` on `PlayerScorePage`, so the indicator updates automatically.)

- [ ] **Step 3: Remove the premium guard in `buildStat` and gate miss-direction by flag**

Replace the `buildStat()` method with:

```swift
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
```

- [ ] **Step 4: Add a `"miss"` label to `SegmentSection`**

In the private `SegmentSection.label(_:)` function, add a `miss` case before `default`:

```swift
        case "miss": return "✗"
```

- [ ] **Step 5: Make a recorded miss re-highlight on reload**

In `loadExisting()`, a plain miss (no direction) is stored as `fairwayHit == false` with `fairwayMissDirection == nil`; the current mapping leaves the control unselected. Replace the two mapping lines so an explicit miss maps to `"miss"`:

```swift
        fairway = existing?.fairwayHit == true ? "hit"
            : (existing?.fairwayMissDirection ?? (existing?.fairwayHit == false ? "miss" : nil))
        gir = existing?.greenInRegulation == true ? "hit"
            : (existing?.greenMissDirection ?? (existing?.greenInRegulation == false ? "miss" : nil))
```

- [ ] **Step 6: Verify the two copies are identical**

Run: `diff "ios/TheNineteenthWatch Watch App/ScoreView.swift" watch/Views/ScoreView.swift && echo IDENTICAL`
Expected: `IDENTICAL`

- [ ] **Step 7: Build the watch app**

Run the watch build command.
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 8: Commit**

```bash
git add "ios/TheNineteenthWatch Watch App/ScoreView.swift" watch/Views/ScoreView.swift
git commit -m "feat(watch): stat sections mirror phone tier flags + save indicator"
```

---

## Task 5 (OPTIONAL): Surface rejected writes as `⚠ Retry`

Only do this if reject feedback is wanted. Without it, `saveState` never enters `.failed` and the `.failed` UI branch is simply never shown.

**Files (edit BOTH, keep identical):**
- Modify: `ios/TheNineteenthWatch Watch App/ConnectivityClient.swift`
- Modify: `watch/Services/ConnectivityClient.swift`

- [ ] **Step 1: Add an ack-receive delegate method**

The phone acks via `sendMessage` (`transport.sendAck`), which lands in `didReceiveMessage`. Add to the `// MARK: - Receiving` section of **both** files:

```swift
    /// The phone acks each applied write via `sendMessage`. Surface genuine
    /// rejections (unauthorized / error) as a retry hint; duplicate/superseded
    /// are benign and ignored.
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        guard let status = message["status"] as? String else { return }
        if status == "unauthorized" || status == "error" {
            DispatchQueue.main.async { self.saveState = .failed }
        }
    }
```

- [ ] **Step 2: Verify identical + build**

Run: `diff "ios/TheNineteenthWatch Watch App/ConnectivityClient.swift" watch/Services/ConnectivityClient.swift && echo IDENTICAL`
Then the watch build command. Expected: `IDENTICAL` then `** BUILD SUCCEEDED **`.

- [ ] **Step 3: Commit**

```bash
git add "ios/TheNineteenthWatch Watch App/ConnectivityClient.swift" watch/Services/ConnectivityClient.swift
git commit -m "feat(watch): show retry hint when the phone rejects a write"
```

---

## Task 6: On-device (simulator) verification

No automated Swift tests exist for the watch target; verify behaviour on the paired simulators (see the run flow used previously: build watch scheme, install on the paired Apple Watch sim, run the phone app + Metro, start a round).

- [ ] **Step 1: Build + install the watch app, start a round on the phone** (paired Apple Watch Series 9 + iPhone 15 Pro; phone app on Metro). Open the watch app → **Enter score**.

- [ ] **Step 2: Save feedback** — tap `+`/`−`/`Par`/`Pick up`. Expected: a green `✓ Saved` appears under the stepper for ~1.5s with a success haptic; the value lands on the phone scorecard.

- [ ] **Step 3: Stat visibility by tier** — confirm the scrollable sections match the phone:
  - Free/Social with putts enabled → **Putts** section visible.
  - Social → **Fairway/Green** show hit/miss only (`✓` / `✗`).
  - Premium → **Fairway/Green** show `hit / L / R / S / Lo`; **Bunker** and **Penalties** visible.
  - Par-3 hole → no **Fairway** section.

- [ ] **Step 4: Offline** — disable the phone's reachability (background the phone app), score on the watch. Expected: `✓ Saved` still shows (optimistic); the write applies once the phone is foregrounded again.

- [ ] **Step 5 (only if Task 5 done):** force an `unauthorized`/`error` ack and confirm `⚠ Retry` appears.

---

## Self-Review Notes

- **Spec coverage:** Section A (save feedback) → Tasks 3, 4. Section B (mirror phone + granularity) → Tasks 1, 2, 4. Optional Retry → Task 5. On-device testing → Task 6. ✅
- **Type consistency:** `fairwayDirection`/`greenDirection` are `boolean` (TS, required) and `Bool?` (Swift, optional for decode safety); Swift call sites always compare `== true`. `SaveState` cases (`idle`/`saved(Date)`/`failed`) match between `ConnectivityClient` (producer) and `ScoreView.savedIndicator` (consumer). ✅
- **No placeholders:** every code step shows full replacement code. ✅
