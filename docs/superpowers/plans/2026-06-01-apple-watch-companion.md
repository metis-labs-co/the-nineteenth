# Apple Watch Companion (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a tethered watchOS companion for The Nineteenth — live distance-to-pin (watch GPS), score entry for the user's scoring-pair with optional shot stats, a leaderboard glance, and a complication — with the phone as the brain over `WCSession`.

**Architecture:** The phone (existing RN app) owns all data, Supabase sync, scoring, and leaderboard. A new pure-TS `WatchBridge` layer builds a snapshot for the watch and applies inbound score writes through the existing `useScorecardStore.updatePlayerHoleScore` action (which already saves offline and queues sync). A native SwiftUI watchOS target — injected into the Xcode project by a custom Expo config plugin — renders four screens and computes distance locally from the watch's own GPS against green coordinates the phone pushes. Transport is `react-native-watch-connectivity`, wrapped in a mockable adapter so all bridge logic is unit-tested without a device.

**Tech Stack:** Expo SDK 54, React Native, TypeScript, Zustand, TanStack Query, Jest (`pnpm test`), `react-native-watch-connectivity`, `@expo/config-plugins`, SwiftUI, WatchConnectivity (`WCSession`), CoreLocation, XCTest.

**Spec:** `docs/superpowers/specs/2026-06-01-apple-watch-companion-design.md`

---

## Verified Codebase Integration Points

These are confirmed against the codebase; all tasks below use exactly these names.

| Concern | Real API | File |
|---------|----------|------|
| Save a hole score (incl. stats) | `useScorecardStore` action `updatePlayerHoleScore(playerId, hole, updates: Partial<HoleScore>)`; also `setPlayerScore(playerId, hole, strokes, scoredBy?)` | `src/store/scorecardStore.ts` |
| Active round / current hole / players | `useScorecardStore`: `currentRoundId`, `currentHole`, `currentPlayers: Player[]`, `holes: Hole[]`, `groupScorecards: Map<string, Scorecard>` | `src/store/scorecardStore.ts` |
| `HoleScore` + enums | `HoleScore`, `FairwayMissDirection`, `GreenMissDirection`, `HazardType='water'\|'ob'\|'lateral'\|'lost_ball'`, `HazardEntry` | `src/types/database/base.ts` |
| Pickup sentinel | `PICKUP_SCORE = 10` | `src/constants/scoring.ts` |
| Stat visibility (tier+toggle resolved) | `useStatsVisibilityWithTier()` → `{ showPutts, showFairwayHit, showGreenInRegulation, showFairwayMissDirection, showGreenMissDirection, showBunkerShots, showHazards }` | `src/hooks/subscription/statsVisibility.ts` |
| Premium / tier | `useIsPremium()`, `useTier()` | `src/context/SubscriptionContext` |
| Players the user scores | `usePlayersToScore(roundId, scorerId)` → `Player[]` | `src/hooks/scoringPairs/queries.ts` |
| Leaderboard | `useCompetitionLeaderboard(competitionId)` → `CompetitionLeaderboardEntry[]` (`position`, `participantId`, `participantName`, `totalPoints`, `roundsPlayed`, `tied`) | `src/hooks/competitions/leaderboard.ts` |
| Green coords | `HoleCoordinate` (`poi_type`, `hole_number`, `latitude`, `longitude`); `HoleCoordinateSet` per hole | `src/types/database/course.types.ts`, `src/hooks/coordinates/` |
| Distance maths | `calculateDistance(lat1, lon1, lat2, lon2)`, `metersToYards`, `METERS_TO_YARDS` | `src/utils/gpsCalculations.ts` |
| Distance unit setting | `useSettingsStore` → `distanceUnit: 'yards' \| 'metres'` | `src/store/settingsStore.ts` |
| Auth user | `useAuth()` → `user.id` | `src/hooks/useAuth` |
| Expo config | `app.config.js` spreads base `app.json`; add the plugin to `app.json` `expo.plugins`. No existing `plugins/` dir. | `app.config.js`, `app.json` |
| Tests | `pnpm test <path>`; specs as `*.test.ts` colocated or under `__tests__/` | `jest.config.js` |

**ⓘ One unconfirmed accessor:** the exact hook that returns the **raw list of `HoleCoordinate` rows for a course** (vs the `useDistanceToGreen` convenience hook). Confirm in `src/hooks/coordinates/` when wiring M3.2; the plan calls it `useHoleCoordinates(courseId): HoleCoordinate[]` and only the mapping layer changes if the real name differs.

---

## Milestones

- **M0 — Foundation & config-plugin spike** (highest risk; de-risk first): a hello-world SwiftUI watch target injected by a config plugin, building via EAS, exchanging a ping over `WCSession`.
- **M1 — Snapshot builder** (pure TS, TDD): `buildWatchSnapshot`.
- **M2 — Score-write handler** (pure TS, TDD): `applyWatchScoreWrite` (idempotency, conflict, pickup, stat gating).
- **M3 — Transport adapter + bridge wiring**: mockable `WatchTransport`, `useWatchBridge` hook mounted on the phone.
- **M4 — SwiftUI screens + distance engine**: distance (XCTest golden-vector parity), score, leaderboard, now-playing, complication.
- **M5 — Device test pass**: the manual connectivity/GPS/battery matrix.

**Milestones M1–M3 are pure RN/TS and can be built and fully tested with zero native/device work.** M0 and M4 require Xcode + a paired watch/simulator.

---

## File Structure

**New — RN / TypeScript (phone side):**
- `src/watch/types.ts` — shared message types (`WatchSnapshot`, `WatchScoreWrite`, results).
- `src/watch/snapshot.ts` — `buildWatchSnapshot` + helpers (`groupGreenCoords`, `trimLeaderboard`).
- `src/watch/scoreWrite.ts` — `applyWatchScoreWrite` + `ScoreWriteContext`.
- `src/watch/transport.ts` — `WatchTransport` interface, `createWatchConnectivityTransport`, `createNullTransport`.
- `src/watch/useWatchBridge.ts` — React hook wiring stores/hooks → snapshot → transport, and inbound writes → `applyWatchScoreWrite`.
- `src/watch/__tests__/{snapshot,scoreWrite,transport,distanceParity}.test.ts`.

**New — shared fixtures:**
- `fixtures/distance-vectors.json` — canonical input-coords→expected-metres vectors, consumed by both the TS parity test and the Swift `DistanceEngineTests`.

**New — native (committed in repo, copied into generated `ios/` by the plugin since `ios/` is gitignored):**
- `plugins/withWatchApp.js` — config plugin that injects the watchOS target.
- `watch/TheNineteenthWatchApp.swift`, `watch/Models/*.swift`, `watch/Services/*.swift`, `watch/Views/*.swift`, `watch/Complication/*.swift`, `watch/Info.plist`, `watch/TheNineteenthWatch.entitlements`, `watch/Tests/*.swift`.

**Modified:**
- `app.json` — add the plugin to `plugins`; add watch GPS usage string.
- `App.tsx` — mount `useWatchBridge()` once.
- `package.json` — add `react-native-watch-connectivity`.

---

# M0 — Foundation & Config-Plugin Spike

> Acceptance: a watch app launches, the phone pushes an `applicationContext` the watch displays, and a watch tap sends a message the phone logs. Native-heavy; steps are coarser than the TS milestones and you WILL iterate with `expo prebuild` + Xcode.

### Task M0.1: Install the connectivity dependency

**Files:** Modify `package.json`

- [ ] **Step 1: Install** — Run: `pnpm add react-native-watch-connectivity` → package added to `dependencies`.
- [ ] **Step 2: Commit**
```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add react-native-watch-connectivity"
```

### Task M0.2: Scaffold a minimal SwiftUI watch app

**Files:** Create `watch/TheNineteenthWatchApp.swift`, `watch/Info.plist`, `watch/TheNineteenthWatch.entitlements`

- [ ] **Step 1: `@main` app**

`watch/TheNineteenthWatchApp.swift`:
```swift
import SwiftUI

@main
struct TheNineteenthWatchApp: App {
    @StateObject private var connectivity = ConnectivityClient.shared
    var body: some Scene {
        WindowGroup {
            VStack(spacing: 8) {
                Text("The Nineteenth").font(.headline)
                Text(connectivity.lastContextSummary).font(.caption)
                Button("Ping phone") { connectivity.sendPing() }
            }
        }
    }
}
```

- [ ] **Step 2: Info.plist (with location usage string)**

`watch/Info.plist`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>The Nineteenth uses your location to show live distance to the green.</string>
<key>WKApplication</key>
<true/>
```

- [ ] **Step 3: Entitlements**

`watch/TheNineteenthWatch.entitlements`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict/></plist>
```

- [ ] **Step 4: Commit**
```bash
git add watch/
git commit -m "feat(watch): minimal SwiftUI watch app scaffold"
```

### Task M0.3: Minimal connectivity client (Swift)

**Files:** Create `watch/Services/ConnectivityClient.swift`

- [ ] **Step 1: WCSession delegate**

`watch/Services/ConnectivityClient.swift`:
```swift
import Foundation
import WatchConnectivity

final class ConnectivityClient: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = ConnectivityClient()
    @Published var lastContextSummary: String = "Waiting for phone…"

    private override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }
    func sendPing() {
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(["type": "ping"], replyHandler: nil)
    }
    func session(_ s: WCSession, didReceiveApplicationContext ctx: [String: Any]) {
        DispatchQueue.main.async { self.lastContextSummary = (ctx["hello"] as? String) ?? "ctx received" }
    }
    func session(_ s: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {}
}
```

- [ ] **Step 2: Commit**
```bash
git add watch/Services/ConnectivityClient.swift
git commit -m "feat(watch): minimal WCSession connectivity client"
```

### Task M0.4: Config plugin that injects the watch target

**Files:** Create `plugins/withWatchApp.js`; Modify `app.json`

> The plugin (1) copies `watch/` into the generated `ios/` tree during prebuild and (2) adds a watchOS application target to the `.pbxproj` with Info.plist, entitlements, a source phase for the Swift files, and an embed-watch-content phase on the main app. Use `@expo/config-plugins` (`withDangerousMod`, `withXcodeProject`) + the `xcode` package's `addTarget`/`addBuildPhase` APIs. Iterate via `expo prebuild --clean` + Xcode until it builds.

- [ ] **Step 1: Plugin skeleton**

`plugins/withWatchApp.js`:
```js
const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WATCH_NAME = 'TheNineteenthWatch';

const withWatchSources = (config) =>
  withDangerousMod(config, ['ios', (cfg) => {
    const src = path.join(cfg.modRequest.projectRoot, 'watch');
    const dest = path.join(cfg.modRequest.platformProjectRoot, WATCH_NAME);
    fs.mkdirSync(dest, { recursive: true });
    for (const file of walk(src)) {
      const out = path.join(dest, path.relative(src, file));
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.copyFileSync(file, out);
    }
    // also copy the shared distance fixtures so the watch test target can load them
    const fx = path.join(cfg.modRequest.projectRoot, 'fixtures', 'distance-vectors.json');
    if (fs.existsSync(fx)) fs.copyFileSync(fx, path.join(dest, 'distance-vectors.json'));
    return cfg;
  }]);

const withWatchTarget = (config) =>
  withXcodeProject(config, (cfg) => {
    const proj = cfg.modResults;
    // proj.addTarget(WATCH_NAME, 'watch2_app', WATCH_NAME); then attach a
    // sources phase (all .swift under ios/<WATCH_NAME>), a resources phase
    // (Info.plist, distance-vectors.json, Assets), set INFOPLIST_FILE,
    // CODE_SIGN_ENTITLEMENTS, WATCHOS_DEPLOYMENT_TARGET, PRODUCT_BUNDLE_IDENTIFIER
    // (com.the.nineteenth.golf.watchkitapp), and add an "Embed Watch Content"
    // copy-files phase to the main app target.
    return cfg;
  });

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

module.exports = (config) => withWatchTarget(withWatchSources(config));
```

- [ ] **Step 2: Register the plugin** — In `app.json`, append to `expo.plugins`: `"./plugins/withWatchApp"`.
- [ ] **Step 3: Prebuild** — Run: `npx expo prebuild --clean -p ios` → `ios/TheNineteenthWatch/` exists; grep `project.pbxproj` for `TheNineteenthWatch` finds the target.
- [ ] **Step 4: Build & launch** — Open `ios/*.xcworkspace`, select the watch scheme + paired sim, Run → watch shows "The Nineteenth / Waiting for phone…".
- [ ] **Step 5: Commit**
```bash
git add plugins/withWatchApp.js app.json
git commit -m "feat(watch): config plugin injects watchOS target"
```

### Task M0.5: Prove the ping round-trip

**Files:** Modify `App.tsx`

- [ ] **Step 1: Temporary hello + log**

In `App.tsx`, a once-only effect:
```ts
import { updateApplicationContext, watchEvents } from 'react-native-watch-connectivity';
// inside useEffect(() => { ... }, []):
updateApplicationContext({ hello: 'Hello from phone' });
const unsub = watchEvents.addListener('message', (msg) => console.log('[watch] message', msg));
return () => unsub();
```

- [ ] **Step 2: Verify** — Run the iOS app on the paired phone+watch sim → watch shows "Hello from phone"; tapping "Ping phone" logs `[watch] message { type: 'ping' }` in Metro.
- [ ] **Step 3: Commit**
```bash
git add App.tsx
git commit -m "feat(watch): prove WCSession ping round-trip"
```

> ✅ M0 acceptance met. Remove this temporary code when M3 lands.

---

# M1 — Snapshot Builder (pure TS, TDD)

### Task M1.1: Shared message types

**Files:** Create `src/watch/types.ts`

- [ ] **Step 1: Define the types**

`src/watch/types.ts`:
```ts
import type {
  HoleScore, FairwayMissDirection, GreenMissDirection, HazardEntry,
} from '@/types/database/base';

export interface LatLng { latitude: number; longitude: number; }
export type WatchUnit = 'metres' | 'yards';

export interface WatchHole {
  hole: number;
  par: number;
  strokeIndex: number;
  green: { center?: LatLng; front?: LatLng; back?: LatLng };
}

export interface WatchPairPlayer { playerId: string; name: string; }

export interface WatchStatFlags {
  putts: boolean; fairways: boolean; gir: boolean; penalties: boolean; bunker: boolean;
}

export interface WatchLeaderboardRow {
  rank: number; name: string; detail: string; isCurrentUser: boolean;
}

export interface WatchSnapshot {
  rev: number;
  roundId: string;
  competitionName: string;
  unit: WatchUnit;
  isPremium: boolean;
  statFlags: WatchStatFlags;
  pairPlayers: WatchPairPlayer[];
  holes: WatchHole[];
  currentHole: number;
  scores: Record<string, HoleScore>; // key `${playerId}:${hole}`; absent = not entered
  leaderboard: WatchLeaderboardRow[];
}

export interface WatchScoreStat {
  putts?: number;
  fairwayHit?: boolean;
  fairwayMissDirection?: FairwayMissDirection;
  greenInRegulation?: boolean;
  greenMissDirection?: GreenMissDirection;
  bunkerShots?: number;
  hazards?: HazardEntry[];
}

export interface WatchScoreWrite {
  clientWriteId: string;
  ts: number;
  baseRev: number; // rev of the snapshot the watch edited from
  roundId: string;
  hole: number;
  playerId: string;
  strokes: number | 'pickup';
  stat?: WatchScoreStat;
}

export type WatchWriteStatus =
  | 'applied' | 'duplicate' | 'superseded' | 'unauthorized' | 'error';
export interface WatchWriteResult { status: WatchWriteStatus; clientWriteId: string; rev?: number; }
export interface WatchAck { clientWriteId: string; status: WatchWriteStatus; rev: number; }
```

- [ ] **Step 2: Type-check** — Run: `pnpm type-check` → PASS.
- [ ] **Step 3: Commit**
```bash
git add src/watch/types.ts
git commit -m "feat(watch): shared bridge message types"
```

### Task M1.2: `groupGreenCoords` helper

**Files:** Create `src/watch/snapshot.ts`; Test `src/watch/__tests__/snapshot.test.ts`

- [ ] **Step 1: Failing test**

`src/watch/__tests__/snapshot.test.ts`:
```ts
import { groupGreenCoords } from '../snapshot';

describe('groupGreenCoords', () => {
  it('groups green coords by hole and type, ignoring any tee poi', () => {
    const out = groupGreenCoords([
      { hole: 1, poiType: 'green_center', latitude: 1, longitude: 2 },
      { hole: 1, poiType: 'green_front', latitude: 3, longitude: 4 },
      { hole: 1, poiType: 'tee_back', latitude: 9, longitude: 9 },
      { hole: 2, poiType: 'green_back', latitude: 5, longitude: 6 },
    ]);
    expect(out.get(1)).toEqual({ center: { latitude: 1, longitude: 2 }, front: { latitude: 3, longitude: 4 } });
    expect(out.get(2)).toEqual({ back: { latitude: 5, longitude: 6 } });
  });
});
```

- [ ] **Step 2: Run to verify it fails** — Run: `pnpm test src/watch/__tests__/snapshot.test.ts` → FAIL (not exported).
- [ ] **Step 3: Implement**

`src/watch/snapshot.ts`:
```ts
import type { WatchHole } from './types';

export interface SnapshotCoord {
  hole: number;
  poiType: string; // 'green_center' | 'green_front' | 'green_back' | 'tee_front' | 'tee_back' | ...
  latitude: number;
  longitude: number;
}

export function groupGreenCoords(coords: SnapshotCoord[]): Map<number, WatchHole['green']> {
  const map = new Map<number, WatchHole['green']>();
  for (const c of coords) {
    if (!c.poiType.startsWith('green_')) continue;
    const g = map.get(c.hole) ?? {};
    const ll = { latitude: c.latitude, longitude: c.longitude };
    if (c.poiType === 'green_center') g.center = ll;
    if (c.poiType === 'green_front') g.front = ll;
    if (c.poiType === 'green_back') g.back = ll;
    map.set(c.hole, g);
  }
  return map;
}
```

- [ ] **Step 4: Run to verify it passes** — Run: `pnpm test src/watch/__tests__/snapshot.test.ts` → PASS.
- [ ] **Step 5: Commit**
```bash
git add src/watch/snapshot.ts src/watch/__tests__/snapshot.test.ts
git commit -m "feat(watch): groupGreenCoords helper"
```

### Task M1.3: `trimLeaderboard` helper

**Files:** Modify `src/watch/snapshot.ts`; Test `src/watch/__tests__/snapshot.test.ts`

- [ ] **Step 1: Add failing test**

Append to `src/watch/__tests__/snapshot.test.ts`:
```ts
import { trimLeaderboard } from '../snapshot';

describe('trimLeaderboard', () => {
  const board = [
    { rank: 1, name: 'A', detail: '12', playerId: 'a' },
    { rank: 2, name: 'B', detail: '10', playerId: 'b' },
    { rank: 3, name: 'C', detail: '9', playerId: 'c' },
    { rank: 4, name: 'D', detail: '7', playerId: 'd' },
    { rank: 5, name: 'Me', detail: '6', playerId: 'me' },
    { rank: 6, name: 'F', detail: '4', playerId: 'f' },
  ];
  it('returns top 3 plus the current user and one neighbour each side, sorted, deduped', () => {
    const out = trimLeaderboard(board, 'me');
    expect(out.map((r) => r.name)).toEqual(['A', 'B', 'C', 'D', 'Me', 'F']);
    expect(out.find((r) => r.name === 'Me')?.isCurrentUser).toBe(true);
  });
  it('returns just the top 3 when the user is absent', () => {
    const out = trimLeaderboard(board.slice(0, 3), 'ghost');
    expect(out.map((r) => r.name)).toEqual(['A', 'B', 'C']);
    expect(out.every((r) => !r.isCurrentUser)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — Run: `pnpm test src/watch/__tests__/snapshot.test.ts` → FAIL (not exported).
- [ ] **Step 3: Implement**

Append to `src/watch/snapshot.ts`:
```ts
import type { WatchLeaderboardRow } from './types';

export interface SnapshotLeaderboardEntry {
  rank: number; name: string; detail: string; playerId: string;
}

export function trimLeaderboard(
  board: SnapshotLeaderboardEntry[],
  currentUserId: string,
): WatchLeaderboardRow[] {
  const byRank = [...board].sort((a, b) => a.rank - b.rank);
  const keep = new Set<number>();
  byRank.slice(0, 3).forEach((e) => keep.add(e.rank));
  const meIdx = byRank.findIndex((e) => e.playerId === currentUserId);
  if (meIdx >= 0) {
    [meIdx - 1, meIdx, meIdx + 1].forEach((i) => {
      if (i >= 0 && i < byRank.length) keep.add(byRank[i].rank);
    });
  }
  return byRank
    .filter((e) => keep.has(e.rank))
    .map((e) => ({
      rank: e.rank, name: e.name, detail: e.detail, isCurrentUser: e.playerId === currentUserId,
    }));
}
```

- [ ] **Step 4: Run to verify it passes** — Run: `pnpm test src/watch/__tests__/snapshot.test.ts` → PASS.
- [ ] **Step 5: Commit**
```bash
git add src/watch/snapshot.ts src/watch/__tests__/snapshot.test.ts
git commit -m "feat(watch): trimLeaderboard helper"
```

### Task M1.4: `buildWatchSnapshot`

**Files:** Modify `src/watch/snapshot.ts`; Test `src/watch/__tests__/snapshot.test.ts`

> Stat flags arrive **already tier+toggle resolved** from `useStatsVisibilityWithTier()`, so this pure function passes them through (no re-gating). `isPremium` is carried separately for the UI and the write-handler.

- [ ] **Step 1: Add failing test**

Append to `src/watch/__tests__/snapshot.test.ts`:
```ts
import { buildWatchSnapshot, BuildSnapshotInput } from '../snapshot';

const baseInput = (): BuildSnapshotInput => ({
  rev: 7,
  roundId: 'r1',
  competitionName: 'Saturday Medal',
  unit: 'metres',
  isPremium: true,
  statFlags: { putts: true, fairways: true, gir: false, penalties: false, bunker: true },
  currentHole: 7,
  currentUserId: 'me',
  holes: [{ hole: 7, par: 4, strokeIndex: 5 }],
  coords: [{ hole: 7, poiType: 'green_center', latitude: 1, longitude: 2 }],
  pairPlayers: [{ playerId: 'me', name: 'You', scores: { '7': { strokes: 4, putts: 2 } } }],
  leaderboard: [{ rank: 1, name: 'You', detail: 'E', playerId: 'me' }],
});

describe('buildWatchSnapshot', () => {
  it('builds holes with grouped green coords and a scores map keyed playerId:hole', () => {
    const snap = buildWatchSnapshot(baseInput());
    expect(snap.rev).toBe(7);
    expect(snap.unit).toBe('metres');
    expect(snap.holes[0].green.center).toEqual({ latitude: 1, longitude: 2 });
    expect(snap.scores['me:7']).toEqual({ strokes: 4, putts: 2 });
    expect(snap.pairPlayers).toEqual([{ playerId: 'me', name: 'You' }]);
  });
  it('passes through the already-resolved stat flags and isPremium', () => {
    const snap = buildWatchSnapshot(baseInput());
    expect(snap.isPremium).toBe(true);
    expect(snap.statFlags).toEqual({ putts: true, fairways: true, gir: false, penalties: false, bunker: true });
  });
  it('trims the leaderboard and marks the current user', () => {
    const snap = buildWatchSnapshot(baseInput());
    expect(snap.leaderboard).toEqual([{ rank: 1, name: 'You', detail: 'E', isCurrentUser: true }]);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — Run: `pnpm test src/watch/__tests__/snapshot.test.ts` → FAIL (not exported).
- [ ] **Step 3: Implement**

Append to `src/watch/snapshot.ts`:
```ts
import type { HoleScore } from '@/types/database/base';
import type { WatchSnapshot, WatchStatFlags, WatchUnit } from './types';

export interface SnapshotPlayer { playerId: string; name: string; scores: Record<string, HoleScore>; }
export interface SnapshotHole { hole: number; par: number; strokeIndex: number; }

export interface BuildSnapshotInput {
  rev: number;
  roundId: string;
  competitionName: string;
  unit: WatchUnit;
  isPremium: boolean;
  statFlags: WatchStatFlags;     // already tier+toggle resolved
  currentHole: number;
  currentUserId: string;
  holes: SnapshotHole[];
  coords: SnapshotCoord[];
  pairPlayers: SnapshotPlayer[];
  leaderboard: SnapshotLeaderboardEntry[];
}

export function buildWatchSnapshot(input: BuildSnapshotInput): WatchSnapshot {
  const greens = groupGreenCoords(input.coords);
  const holes = input.holes.map((h) => ({
    hole: h.hole, par: h.par, strokeIndex: h.strokeIndex, green: greens.get(h.hole) ?? {},
  }));
  const scores: Record<string, HoleScore> = {};
  for (const p of input.pairPlayers) {
    for (const [hole, hs] of Object.entries(p.scores)) scores[`${p.playerId}:${hole}`] = hs;
  }
  return {
    rev: input.rev,
    roundId: input.roundId,
    competitionName: input.competitionName,
    unit: input.unit,
    isPremium: input.isPremium,
    statFlags: input.statFlags,
    pairPlayers: input.pairPlayers.map((p) => ({ playerId: p.playerId, name: p.name })),
    holes,
    currentHole: input.currentHole,
    scores,
    leaderboard: trimLeaderboard(input.leaderboard, input.currentUserId),
  };
}
```

- [ ] **Step 4: Run to verify it passes** — Run: `pnpm test src/watch/__tests__/snapshot.test.ts` → PASS (all snapshot tests).
- [ ] **Step 5: Commit**
```bash
git add src/watch/snapshot.ts src/watch/__tests__/snapshot.test.ts
git commit -m "feat(watch): buildWatchSnapshot"
```

---

# M2 — Score-Write Handler (pure TS, TDD)

> Writes are keyed by **playerId** (the store's `updatePlayerHoleScore(playerId, hole, updates)` API) — no scorecardId resolution needed. Conflict tracking uses a `baseRev` counter, not wall-clock time (skew-free; implements the spec's "phone resolves authoritatively" intent deterministically).

### Task M2.1: `applyWatchScoreWrite` — happy path & pickup

**Files:** Create `src/watch/scoreWrite.ts`; Test `src/watch/__tests__/scoreWrite.test.ts`

- [ ] **Step 1: Failing test**

`src/watch/__tests__/scoreWrite.test.ts`:
```ts
import { applyWatchScoreWrite, ScoreWriteContext } from '../scoreWrite';
import type { WatchScoreWrite } from '../types';
import { PICKUP_SCORE } from '@/constants/scoring';

function makeCtx(over: Partial<ScoreWriteContext> = {}) {
  const applied: any[] = [];
  let rev = 100;
  const ctx: ScoreWriteContext = {
    currentUserId: 'me',
    allowedPlayerIds: new Set(['me', 'p2']),
    isPremium: true,
    getExisting: () => undefined,
    getLastEditedRev: () => -1,
    seen: new Set<string>(),
    applyHoleScore: async (playerId, hole, holeScore) => { applied.push({ playerId, hole, holeScore }); },
    markEdited: () => {},
    nextRev: () => ++rev,
    ...over,
  };
  return Object.assign(ctx, { _applied: applied });
}

const write = (over: Partial<WatchScoreWrite> = {}): WatchScoreWrite => ({
  clientWriteId: 'w1', ts: 1, baseRev: 7, roundId: 'r1', hole: 7, playerId: 'me', strokes: 4, ...over,
});

describe('applyWatchScoreWrite', () => {
  it('applies a gross score with scoredBy set', async () => {
    const ctx = makeCtx();
    const res = await applyWatchScoreWrite(write(), ctx);
    expect(res.status).toBe('applied');
    expect((ctx as any)._applied[0]).toEqual({ playerId: 'me', hole: 7, holeScore: { strokes: 4, scoredBy: 'me' } });
  });
  it('maps a pickup intent to PICKUP_SCORE', async () => {
    const ctx = makeCtx();
    await applyWatchScoreWrite(write({ strokes: 'pickup' }), ctx);
    expect((ctx as any)._applied[0].holeScore.strokes).toBe(PICKUP_SCORE);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — Run: `pnpm test src/watch/__tests__/scoreWrite.test.ts` → FAIL (module not found).
- [ ] **Step 3: Implement**

`src/watch/scoreWrite.ts`:
```ts
import { PICKUP_SCORE } from '@/constants/scoring';
import type { HoleScore } from '@/types/database/base';
import type { WatchScoreWrite, WatchWriteResult } from './types';

export interface ScoreWriteContext {
  currentUserId: string;
  allowedPlayerIds: Set<string>;
  isPremium: boolean;
  getExisting: (playerId: string, hole: number) => HoleScore | undefined;
  getLastEditedRev: (playerId: string, hole: number) => number; // -1 if never
  seen: Set<string>;
  applyHoleScore: (playerId: string, hole: number, holeScore: HoleScore) => Promise<void>;
  markEdited: (playerId: string, hole: number, rev: number) => void;
  nextRev: () => number;
}

export async function applyWatchScoreWrite(
  write: WatchScoreWrite,
  ctx: ScoreWriteContext,
): Promise<WatchWriteResult> {
  if (ctx.seen.has(write.clientWriteId)) return { status: 'duplicate', clientWriteId: write.clientWriteId };
  if (!ctx.allowedPlayerIds.has(write.playerId)) return { status: 'unauthorized', clientWriteId: write.clientWriteId };
  if (ctx.getLastEditedRev(write.playerId, write.hole) > write.baseRev) {
    return { status: 'superseded', clientWriteId: write.clientWriteId };
  }
  const existing = ctx.getExisting(write.playerId, write.hole) ?? ({} as HoleScore);
  const strokes = write.strokes === 'pickup' ? PICKUP_SCORE : write.strokes;
  const next: HoleScore = { ...existing, strokes, scoredBy: ctx.currentUserId };
  if (ctx.isPremium && write.stat) {
    const s = write.stat;
    if (s.putts !== undefined) next.putts = s.putts;
    if (s.fairwayHit !== undefined) next.fairwayHit = s.fairwayHit;
    if (s.fairwayMissDirection !== undefined) next.fairwayMissDirection = s.fairwayMissDirection;
    if (s.greenInRegulation !== undefined) next.greenInRegulation = s.greenInRegulation;
    if (s.greenMissDirection !== undefined) next.greenMissDirection = s.greenMissDirection;
    if (s.bunkerShots !== undefined) next.bunkerShots = s.bunkerShots;
    if (s.hazards !== undefined) next.hazards = s.hazards;
  }
  await ctx.applyHoleScore(write.playerId, write.hole, next);
  const rev = ctx.nextRev();
  ctx.markEdited(write.playerId, write.hole, rev);
  ctx.seen.add(write.clientWriteId);
  return { status: 'applied', clientWriteId: write.clientWriteId, rev };
}
```

- [ ] **Step 4: Run to verify it passes** — Run: `pnpm test src/watch/__tests__/scoreWrite.test.ts` → PASS.
- [ ] **Step 5: Commit**
```bash
git add src/watch/scoreWrite.ts src/watch/__tests__/scoreWrite.test.ts
git commit -m "feat(watch): applyWatchScoreWrite happy path + pickup"
```

### Task M2.2: Idempotency, authorization, conflict, stat-merge & gating

**Files:** Modify `src/watch/__tests__/scoreWrite.test.ts`

- [ ] **Step 1: Add the tests**

Append to `src/watch/__tests__/scoreWrite.test.ts`:
```ts
describe('applyWatchScoreWrite — guards', () => {
  it('dedups a clientWriteId already seen', async () => {
    const ctx = makeCtx({ seen: new Set(['w1']) });
    const res = await applyWatchScoreWrite(write(), ctx);
    expect(res.status).toBe('duplicate');
    expect((ctx as any)._applied).toHaveLength(0);
  });
  it('rejects a player the user is not assigned to score', async () => {
    const res = await applyWatchScoreWrite(write({ playerId: 'stranger' }), makeCtx());
    expect(res.status).toBe('unauthorized');
  });
  it('rejects a stale write whose baseRev predates the last phone edit', async () => {
    const ctx = makeCtx({ getLastEditedRev: () => 9 }); // 9 > baseRev 7
    const res = await applyWatchScoreWrite(write(), ctx);
    expect(res.status).toBe('superseded');
    expect((ctx as any)._applied).toHaveLength(0);
  });
  it('merges stat fields onto the existing HoleScore when premium', async () => {
    const ctx = makeCtx({ getExisting: () => ({ strokes: 9, putts: 9 }) });
    await applyWatchScoreWrite(write({ stat: { putts: 2, bunkerShots: 1, hazards: [{ type: 'water' }] } }), ctx);
    expect((ctx as any)._applied[0].holeScore).toEqual({
      strokes: 4, putts: 2, bunkerShots: 1, hazards: [{ type: 'water' }], scoredBy: 'me',
    });
  });
  it('drops stat fields entirely when not premium', async () => {
    const ctx = makeCtx({ isPremium: false });
    await applyWatchScoreWrite(write({ stat: { putts: 2 } }), ctx);
    expect((ctx as any)._applied[0].holeScore).toEqual({ strokes: 4, scoredBy: 'me' });
  });
});
```

- [ ] **Step 2: Run** — Run: `pnpm test src/watch/__tests__/scoreWrite.test.ts` → PASS. If any fail, fix `scoreWrite.ts` minimally until green.
- [ ] **Step 3: Commit**
```bash
git add src/watch/__tests__/scoreWrite.test.ts
git commit -m "test(watch): lock idempotency/auth/conflict/stat-gating behaviour"
```

---

# M3 — Transport Adapter + Bridge Wiring

### Task M3.1: Transport interface + null transport + RNWC adapter

**Files:** Create `src/watch/transport.ts`; Test `src/watch/__tests__/transport.test.ts`

- [ ] **Step 1: Failing test**

`src/watch/__tests__/transport.test.ts`:
```ts
import { createNullTransport } from '../transport';

describe('createNullTransport', () => {
  it('reports unsupported and no-ops without throwing', () => {
    const t = createNullTransport();
    expect(t.isSupported()).toBe(false);
    expect(() => t.updateContext({} as any)).not.toThrow();
    const off = t.onMessage(() => {});
    expect(typeof off).toBe('function');
    off();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — Run: `pnpm test src/watch/__tests__/transport.test.ts` → FAIL.
- [ ] **Step 3: Implement**

`src/watch/transport.ts`:
```ts
import { Platform } from 'react-native';
import type { WatchSnapshot, WatchScoreWrite, WatchAck } from './types';

export interface WatchTransport {
  isSupported(): boolean;
  updateContext(snapshot: WatchSnapshot): void;          // applicationContext
  onMessage(handler: (msg: WatchScoreWrite) => void): () => void; // transferUserInfo + message
  sendAck(ack: WatchAck): void;                           // sendMessage when reachable
}

export function createNullTransport(): WatchTransport {
  return { isSupported: () => false, updateContext: () => {}, onMessage: () => () => {}, sendAck: () => {} };
}

export function createWatchConnectivityTransport(): WatchTransport {
  if (Platform.OS !== 'ios') return createNullTransport();
  const rnwc = require('react-native-watch-connectivity'); // lazy: never loaded on Android/test
  return {
    isSupported: () => true,
    updateContext: (snapshot) => rnwc.updateApplicationContext(snapshot as any),
    onMessage: (handler) => {
      const a = rnwc.watchEvents.addListener('message', (m: any) => handler(m as WatchScoreWrite));
      const b = rnwc.watchEvents.addListener('user-info', (m: any) => handler(m as WatchScoreWrite));
      return () => { a(); b(); };
    },
    sendAck: (ack) => { if (rnwc.sendMessage) rnwc.sendMessage(ack as any, () => {}, () => {}); },
  };
}
```

- [ ] **Step 4: Run to verify it passes** — Run: `pnpm test src/watch/__tests__/transport.test.ts` → PASS.
- [ ] **Step 5: Commit**
```bash
git add src/watch/transport.ts src/watch/__tests__/transport.test.ts
git commit -m "feat(watch): WatchTransport interface + null/RNWC adapters"
```

### Task M3.2: `useWatchBridge` wiring hook

**Files:** Create `src/watch/useWatchBridge.ts`; Modify `App.tsx`

> Thin wiring only; all testable logic lives in the pure functions. Verify on device (M5).

- [ ] **Step 1: Implement the hook**

`src/watch/useWatchBridge.ts`:
```ts
import { useEffect, useMemo, useRef } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import { useSettingsStore } from '@/store/settingsStore';
import { usePlayersToScore } from '@/hooks/scoringPairs/queries';
import { useStatsVisibilityWithTier } from '@/hooks/subscription/statsVisibility';
import { useIsPremium } from '@/context/SubscriptionContext';
import { useCompetitionLeaderboard } from '@/hooks/competitions/leaderboard';
import { useHoleCoordinates } from '@/hooks/coordinates'; // ⓘ confirm exact export (see Integration Points)
import { useAuth } from '@/hooks/useAuth';
import { buildWatchSnapshot } from './snapshot';
import { applyWatchScoreWrite, ScoreWriteContext } from './scoreWrite';
import { createWatchConnectivityTransport } from './transport';
import type { WatchScoreWrite, WatchStatFlags } from './types';

export function useWatchBridge(opts: { competitionId?: string; courseId?: string }) {
  const transport = useMemo(() => createWatchConnectivityTransport(), []);
  const revRef = useRef(0);
  const seenRef = useRef(new Set<string>());
  const lastEditedRef = useRef(new Map<string, number>());

  const { user } = useAuth();
  const roundId = useScorecardStore((s) => s.currentRoundId);
  const currentHole = useScorecardStore((s) => s.currentHole);
  const currentPlayers = useScorecardStore((s) => s.currentPlayers);
  const holes = useScorecardStore((s) => s.holes);
  const groupScorecards = useScorecardStore((s) => s.groupScorecards);
  const updatePlayerHoleScore = useScorecardStore((s) => s.updatePlayerHoleScore);

  const unit = useSettingsStore((s) => s.distanceUnit);
  const vis = useStatsVisibilityWithTier();
  const isPremium = useIsPremium();
  const { data: playersToScore = [] } = usePlayersToScore(roundId ?? '', user?.id ?? '');
  const { data: leaderboard = [] } = useCompetitionLeaderboard(opts.competitionId ?? '');
  const { data: coords = [] } = useHoleCoordinates(opts.courseId ?? '');

  const statFlags: WatchStatFlags = {
    putts: vis.showPutts, fairways: vis.showFairwayHit, gir: vis.showGreenInRegulation,
    penalties: vis.showHazards, bunker: vis.showBunkerShots,
  };
  const allowedIds = playersToScore.length ? playersToScore.map((p) => p.id) : (user ? [user.id] : []);
  const scoresFor = (playerId: string): Record<string, any> =>
    (groupScorecards.get(playerId)?.scores as Record<string, any>) ?? {};

  // Push snapshot on change.
  useEffect(() => {
    if (!transport.isSupported() || !roundId || !user) return;
    const rev = ++revRef.current;
    transport.updateContext(buildWatchSnapshot({
      rev,
      roundId,
      competitionName: 'Round',
      unit,
      isPremium,
      statFlags,
      currentHole,
      currentUserId: user.id,
      holes: holes.map((h) => ({ hole: h.number, par: h.par, strokeIndex: h.strokeIndex })),
      coords: coords.map((c) => ({ hole: c.hole_number, poiType: c.poi_type, latitude: c.latitude, longitude: c.longitude })),
      pairPlayers: currentPlayers
        .filter((p) => allowedIds.includes(p.id))
        .map((p) => ({ playerId: p.id, name: p.name, scores: scoresFor(p.id) })),
      leaderboard: leaderboard.map((e) => ({
        rank: e.position, name: e.participantName, detail: `${e.totalPoints}`, playerId: e.participantId,
      })),
    }));
  }, [transport, roundId, user, unit, isPremium, currentHole, holes, coords, currentPlayers, groupScorecards, leaderboard]);

  // Inbound writes.
  useEffect(() => {
    if (!transport.isSupported() || !roundId || !user) return;
    const ctx: ScoreWriteContext = {
      currentUserId: user.id,
      allowedPlayerIds: new Set(allowedIds),
      isPremium,
      getExisting: (playerId, hole) => scoresFor(playerId)[String(hole)],
      getLastEditedRev: (playerId, hole) => lastEditedRef.current.get(`${playerId}:${hole}`) ?? -1,
      seen: seenRef.current,
      applyHoleScore: async (playerId, hole, holeScore) => { await updatePlayerHoleScore(playerId, hole, holeScore); },
      markEdited: (playerId, hole, rev) => lastEditedRef.current.set(`${playerId}:${hole}`, rev),
      nextRev: () => ++revRef.current,
    };
    const off = transport.onMessage(async (msg: WatchScoreWrite) => {
      const res = await applyWatchScoreWrite(msg, ctx);
      transport.sendAck({ clientWriteId: res.clientWriteId, status: res.status, rev: res.rev ?? revRef.current });
    });
    return off;
  }, [transport, roundId, user, isPremium, groupScorecards, updatePlayerHoleScore]);
}
```

> The phone tracks the active `competitionId`/`courseId` wherever the score-entry screen does (derive from the active round). Pass them into `useWatchBridge({ competitionId, courseId })` from `App.tsx` (or move the call into the score-entry provider if those ids aren't available at the root). `holes[].number/par/strokeIndex` and `Player.name` accessors must match the real `Hole`/`Player` types — adjust the mapping only.

- [ ] **Step 2: Mount it once**

In `App.tsx`, remove the temporary M0 ping code and call the hook in the root component:
```ts
import { useWatchBridge } from '@/watch/useWatchBridge';
// inside the root component (with providers above it):
useWatchBridge({});
```

- [ ] **Step 3: Type-check & test** — Run: `pnpm type-check && pnpm test src/watch` → type-check PASS; all `src/watch` tests PASS.
- [ ] **Step 4: Commit**
```bash
git add src/watch/useWatchBridge.ts App.tsx
git commit -m "feat(watch): mount useWatchBridge (snapshot push + inbound writes)"
```

---

# M4 — SwiftUI Screens + Distance Engine

### Task M4.1: Shared distance fixtures + TS parity test

**Files:** Create `fixtures/distance-vectors.json`; Test `src/watch/__tests__/distanceParity.test.ts`

- [ ] **Step 1: Create fixtures**

`fixtures/distance-vectors.json`:
```json
[
  { "name": "same point", "from": { "latitude": -37.8136, "longitude": 144.9631 }, "to": { "latitude": -37.8136, "longitude": 144.9631 }, "metres": 0 },
  { "name": "~100m north", "from": { "latitude": -37.8136, "longitude": 144.9631 }, "to": { "latitude": -37.81270, "longitude": 144.9631 }, "metres": 100 },
  { "name": "~150m", "from": { "latitude": -37.8136, "longitude": 144.9631 }, "to": { "latitude": -37.81495, "longitude": 144.9631 }, "metres": 150 }
]
```

> Replace each `metres` with the actual `calculateDistance(...)` output (run it once, paste, round to whole metres). The fixture is the shared contract; assert with ±1m.

- [ ] **Step 2: Write the parity test**

`src/watch/__tests__/distanceParity.test.ts`:
```ts
import vectors from '../../../fixtures/distance-vectors.json';
import { calculateDistance } from '@/utils/gpsCalculations';

describe('distance fixtures parity (TS side)', () => {
  it.each(vectors)('$name', (v) => {
    const m = calculateDistance(v.from.latitude, v.from.longitude, v.to.latitude, v.to.longitude);
    expect(m).toBeCloseTo(v.metres, 0);
  });
});
```

- [ ] **Step 3: Run & reconcile** — Run: `pnpm test src/watch/__tests__/distanceParity.test.ts` → PASS. If a vector is off >1m, update its `metres` to the computed value.
- [ ] **Step 4: Commit**
```bash
git add fixtures/distance-vectors.json src/watch/__tests__/distanceParity.test.ts
git commit -m "test(watch): shared distance fixtures + TS parity"
```

### Task M4.2: Swift Codable models

**Files:** Create `watch/Models/WatchSnapshot.swift`, `watch/Models/WatchScoreWrite.swift`; Test `watch/Tests/ConnectivityDecodeTests.swift`

- [ ] **Step 1: Model structs**

`watch/Models/WatchSnapshot.swift`:
```swift
import Foundation

struct LatLng: Codable, Equatable { let latitude: Double; let longitude: Double }
struct Green: Codable, Equatable { var center: LatLng?; var front: LatLng?; var back: LatLng? }
struct WatchHole: Codable, Equatable { let hole: Int; let par: Int; let strokeIndex: Int; let green: Green }
struct WatchPairPlayer: Codable, Equatable { let playerId: String; let name: String }
struct WatchStatFlags: Codable, Equatable { let putts, fairways, gir, penalties, bunker: Bool }
struct WatchLeaderboardRow: Codable, Equatable { let rank: Int; let name: String; let detail: String; let isCurrentUser: Bool }

struct WatchSnapshot: Codable, Equatable {
    let rev: Int
    let roundId: String
    let competitionName: String
    let unit: String           // "metres" | "yards"
    let isPremium: Bool
    let statFlags: WatchStatFlags
    let pairPlayers: [WatchPairPlayer]
    let holes: [WatchHole]
    let currentHole: Int
    let leaderboard: [WatchLeaderboardRow]
}
```

`watch/Models/WatchScoreWrite.swift`:
```swift
import Foundation

enum StrokesValue: Codable, Equatable {
    case number(Int); case pickup
    init(from d: Decoder) throws {
        let c = try d.singleValueContainer()
        if let i = try? c.decode(Int.self) { self = .number(i) } else { self = .pickup }
    }
    func encode(to e: Encoder) throws {
        var c = e.singleValueContainer()
        switch self { case .number(let i): try c.encode(i); case .pickup: try c.encode("pickup") }
    }
}

struct WatchScoreStat: Codable, Equatable {
    var putts: Int?; var fairwayHit: Bool?; var fairwayMissDirection: String?
    var greenInRegulation: Bool?; var greenMissDirection: String?
    var bunkerShots: Int?; var hazards: [[String: String]]?
}

struct WatchScoreWrite: Codable, Equatable {
    let clientWriteId: String
    let ts: Double
    let baseRev: Int
    let roundId: String
    let hole: Int
    let playerId: String
    let strokes: StrokesValue
    var stat: WatchScoreStat?
}
```

- [ ] **Step 2: Decode test**

`watch/Tests/ConnectivityDecodeTests.swift`:
```swift
import XCTest
@testable import TheNineteenthWatch

final class ConnectivityDecodeTests: XCTestCase {
    func testDecodesSnapshot() throws {
        let json = """
        {"rev":7,"roundId":"r1","competitionName":"Sat Medal","unit":"metres","isPremium":true,
         "statFlags":{"putts":true,"fairways":true,"gir":false,"penalties":false,"bunker":true},
         "pairPlayers":[{"playerId":"me","name":"You"}],
         "holes":[{"hole":7,"par":4,"strokeIndex":5,"green":{"center":{"latitude":1,"longitude":2}}}],
         "currentHole":7,"leaderboard":[]}
        """.data(using: .utf8)!
        let snap = try JSONDecoder().decode(WatchSnapshot.self, from: json)
        XCTAssertEqual(snap.holes.first?.green.center, LatLng(latitude: 1, longitude: 2))
    }
}
```

- [ ] **Step 3: Run** — In Xcode run the watch test scheme (`xcodebuild test -scheme TheNineteenthWatch -destination 'platform=watchOS Simulator,name=Apple Watch Series 9 (45mm)'`) → PASS.
- [ ] **Step 4: Commit**
```bash
git add watch/Models watch/Tests/ConnectivityDecodeTests.swift
git commit -m "feat(watch): Codable models + decode test"
```

### Task M4.3: DistanceEngine against the shared fixtures

**Files:** Create `watch/Services/DistanceEngine.swift`, `watch/Tests/DistanceEngineTests.swift`

- [ ] **Step 1: Implement**

`watch/Services/DistanceEngine.swift`:
```swift
import Foundation
import CoreLocation

enum DistanceEngine {
    static func metres(from a: LatLng, to b: LatLng) -> Double {
        let R = 6_371_000.0
        let dLat = (b.latitude - a.latitude) * .pi / 180
        let dLon = (b.longitude - a.longitude) * .pi / 180
        let lat1 = a.latitude * .pi / 180, lat2 = b.latitude * .pi / 180
        let h = sin(dLat/2)*sin(dLat/2) + sin(dLon/2)*sin(dLon/2)*cos(lat1)*cos(lat2)
        return 2 * R * asin(min(1, sqrt(h)))
    }
    static func display(_ metres: Double, unit: String) -> Int {
        let v = unit == "yards" ? metres * 1.09361 : metres
        return Int(v.rounded())
    }
    static func isAccurate(_ accuracy: CLLocationAccuracy) -> Bool { accuracy >= 0 && accuracy <= 20 }
}
```

> The constant `6_371_000` matches `EARTH_RADIUS_METERS` in `src/utils/gpsCalculations.ts`; the fixture test guarantees parity regardless.

- [ ] **Step 2: Fixture-driven test**

`watch/Tests/DistanceEngineTests.swift`:
```swift
import XCTest
@testable import TheNineteenthWatch

final class DistanceEngineTests: XCTestCase {
    struct Vector: Codable { let name: String; let from: LatLng; let to: LatLng; let metres: Double }
    func testMatchesSharedFixtures() throws {
        let url = Bundle(for: type(of: self)).url(forResource: "distance-vectors", withExtension: "json")!
        let vectors = try JSONDecoder().decode([Vector].self, from: Data(contentsOf: url))
        for v in vectors {
            XCTAssertEqual(DistanceEngine.metres(from: v.from, to: v.to), v.metres, accuracy: 1.0, v.name)
        }
    }
    func testYardConversion() { XCTAssertEqual(DistanceEngine.display(100, unit: "yards"), 109) }
}
```

- [ ] **Step 3: Run & reconcile** — Run the watch test scheme → PASS within ±1m. (Fixtures are copied into the watch bundle by the plugin in M0.4.)
- [ ] **Step 4: Commit**
```bash
git add watch/Services/DistanceEngine.swift watch/Tests/DistanceEngineTests.swift
git commit -m "feat(watch): DistanceEngine with TS-parity fixture tests"
```

### Task M4.4: LocationProvider + ConnectivityClient store

**Files:** Create `watch/Services/LocationProvider.swift`; Modify `watch/Services/ConnectivityClient.swift`

- [ ] **Step 1: LocationProvider**

`watch/Services/LocationProvider.swift`:
```swift
import Foundation
import CoreLocation

final class LocationProvider: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var current: CLLocation?
    private let mgr = CLLocationManager()
    override init() {
        super.init()
        mgr.delegate = self
        mgr.desiredAccuracy = kCLLocationAccuracyBest
        mgr.distanceFilter = 2
    }
    func start() { mgr.requestWhenInUseAuthorization(); mgr.startUpdatingLocation() }
    func stop() { mgr.stopUpdatingLocation() }
    func locationManager(_ m: CLLocationManager, didUpdateLocations locs: [CLLocation]) {
        DispatchQueue.main.async { self.current = locs.last }
    }
}
```

- [ ] **Step 2: Expand ConnectivityClient**

In `watch/Services/ConnectivityClient.swift` add `@Published var snapshot: WatchSnapshot?` and:
```swift
func send(write: WatchScoreWrite) {
    guard let data = try? JSONEncoder().encode(write),
          let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
    WCSession.default.transferUserInfo(dict) // guaranteed; wakes the phone in the background
}
func session(_ s: WCSession, didReceiveApplicationContext ctx: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: ctx),
          let snap = try? JSONDecoder().decode(WatchSnapshot.self, from: data) else { return }
    DispatchQueue.main.async { self.snapshot = snap }
}
```

- [ ] **Step 3: Build** — Run the watch scheme → compiles & launches.
- [ ] **Step 4: Commit**
```bash
git add watch/Services/LocationProvider.swift watch/Services/ConnectivityClient.swift
git commit -m "feat(watch): location provider + snapshot decode + write queue"
```

### Task M4.5: DistanceView (default screen)

**Files:** Create `watch/Views/DistanceView.swift`

- [ ] **Step 1: Implement**

`watch/Views/DistanceView.swift`:
```swift
import SwiftUI

struct DistanceView: View {
    @ObservedObject var connectivity: ConnectivityClient
    @ObservedObject var location: LocationProvider

    private var hole: WatchHole? {
        guard let snap = connectivity.snapshot else { return nil }
        return snap.holes.first { $0.hole == snap.currentHole }
    }
    private func dist(_ p: LatLng?) -> String {
        guard let p, let loc = location.current,
              DistanceEngine.isAccurate(loc.horizontalAccuracy),
              let unit = connectivity.snapshot?.unit else { return "—" }
        let here = LatLng(latitude: loc.coordinate.latitude, longitude: loc.coordinate.longitude)
        return "\(DistanceEngine.display(DistanceEngine.metres(from: here, to: p), unit: unit))"
    }
    var body: some View {
        VStack(spacing: 2) {
            if let h = hole {
                Text("Hole \(h.hole) · Par \(h.par)").font(.caption2).foregroundStyle(.secondary)
                Text(dist(h.green.center)).font(.system(size: 56, weight: .bold))
                Text("to centre").font(.caption2).foregroundStyle(.secondary)
                Spacer()
                HStack { Text("F \(dist(h.green.front))"); Spacer(); Text("B \(dist(h.green.back))") }.font(.footnote)
            } else { Text("No round").foregroundStyle(.secondary) }
        }
        .padding()
        .onAppear { location.start() }
        .onDisappear { location.stop() }
    }
}
```

- [ ] **Step 2: Verify** — Add a `#Preview` with a sample snapshot; confirm yardage + F/B render and "—" shows without GPS.
- [ ] **Step 3: Commit**
```bash
git add watch/Views/DistanceView.swift
git commit -m "feat(watch): DistanceView (watch-GPS distance to green)"
```

### Task M4.6: ScoreView (gross + Par/Pickup + scroll-down stats)

**Files:** Create `watch/Views/ScoreView.swift`

- [ ] **Step 1: Implement gross entry + quick marks + player pager**

`watch/Views/ScoreView.swift`:
```swift
import SwiftUI

struct ScoreView: View {
    @ObservedObject var connectivity: ConnectivityClient
    @State private var playerIdx = 0
    @State private var strokes = 0

    private var snap: WatchSnapshot? { connectivity.snapshot }
    private var player: WatchPairPlayer? { snap?.pairPlayers[safe: playerIdx] }
    private var hole: WatchHole? { guard let s = snap else { return nil }; return s.holes.first { $0.hole == s.currentHole } }

    private func save(_ strokes: StrokesValue, stat: WatchScoreStat? = nil) {
        guard let snap, let player, let hole else { return }
        connectivity.send(write: WatchScoreWrite(
            clientWriteId: UUID().uuidString, ts: Date().timeIntervalSince1970,
            baseRev: snap.rev, roundId: snap.roundId, hole: hole.hole,
            playerId: player.playerId, strokes: strokes, stat: stat))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                if let h = hole, let p = player {
                    Text("Hole \(h.hole) · Par \(h.par)").font(.caption2).foregroundStyle(.secondary)
                    Text("Marking: \(p.name)").font(.caption2)
                    HStack(spacing: 12) {
                        Button("−") { strokes = max(1, strokes - 1); save(.number(strokes)) }.buttonStyle(.bordered)
                        Text("\(strokes)").font(.system(size: 48, weight: .bold))
                            .focusable().digitalCrownRotation(
                                .init(get: { Double(strokes) }, set: { strokes = Int($0); save(.number(strokes)) }),
                                from: 1, through: 15, by: 1)
                        Button("+") { strokes += 1; save(.number(strokes)) }.buttonStyle(.bordered)
                    }
                    HStack {
                        Button("Pick up") { save(.pickup) }
                        Button("Par") { strokes = h.par; save(.number(h.par)) }
                    }.font(.caption)
                    if snap?.statFlags.putts == true {
                        StatStepper(title: "Putts") { save(.number(strokes), stat: WatchScoreStat(putts: $0)) }
                    }
                    // fairways (h.par >= 4) / gir / bunker / penalties sections, each gated by snap.statFlags.*
                } else { Text("No round").foregroundStyle(.secondary) }
            }.padding()
        }
    }
}

extension Array { subscript(safe i: Int) -> Element? { indices.contains(i) ? self[i] : nil } }
```

> Implement `StatStepper` and the FIR/GIR segmented + penalties multi-select controls as small subviews in this file, each gated by `snap.statFlags.*`; the fairway section is shown only when `h.par >= 4`. Move between `pairPlayers` with a `TabView(.page)` or a swipe.

- [ ] **Step 2: Verify** — On the simulator: +/− and crown change the value and each emits a write (watch Metro for the inbound message); paging switches players.
- [ ] **Step 3: Commit**
```bash
git add watch/Views/ScoreView.swift
git commit -m "feat(watch): ScoreView (gross, par/pickup, crown, gated stats)"
```

### Task M4.7: LeaderboardView + NowPlayingView + root navigation

**Files:** Create `watch/Views/LeaderboardView.swift`, `watch/Views/NowPlayingView.swift`; Modify `watch/TheNineteenthWatchApp.swift`

- [ ] **Step 1: LeaderboardView**

`watch/Views/LeaderboardView.swift`:
```swift
import SwiftUI
struct LeaderboardView: View {
    @ObservedObject var connectivity: ConnectivityClient
    var body: some View {
        List(connectivity.snapshot?.leaderboard ?? [], id: \.rank) { row in
            HStack {
                Text("\(row.rank)").foregroundStyle(.secondary).frame(width: 18, alignment: .leading)
                Text(row.name).fontWeight(row.isCurrentUser ? .bold : .regular)
                Spacer()
                Text(row.detail)
            }
            .foregroundStyle(row.isCurrentUser ? Color.green : Color.primary)
        }
        .navigationTitle("Leaderboard")
    }
}
```

- [ ] **Step 2: NowPlayingView**

`watch/Views/NowPlayingView.swift`:
```swift
import SwiftUI
struct NowPlayingView: View {
    @ObservedObject var connectivity: ConnectivityClient
    @ObservedObject var location: LocationProvider
    var body: some View {
        if let snap = connectivity.snapshot {
            List {
                Section {
                    Text(snap.competitionName).font(.headline)
                    Text("Hole \(snap.currentHole) of \(snap.holes.count)").foregroundStyle(.secondary)
                }
                NavigationLink("⛳ Distance") { DistanceView(connectivity: connectivity, location: location) }
                NavigationLink("✏️ Enter score") { ScoreView(connectivity: connectivity) }
                NavigationLink("🏆 Leaderboard") { LeaderboardView(connectivity: connectivity) }
            }
        } else {
            VStack(spacing: 6) {
                Text("No round in progress").font(.headline)
                Text("Start one on your phone").font(.caption).foregroundStyle(.secondary)
            }
        }
    }
}
```

- [ ] **Step 3: Root navigation** — Update `TheNineteenthWatchApp.swift` so the root is a `NavigationStack` showing `DistanceView` directly when `snapshot != nil` (distance is default mid-round), with a toolbar/back path to `NowPlayingView`; otherwise show `NowPlayingView`'s empty state.
- [ ] **Step 4: Verify** — Start a round on the phone sim; the watch shows distance by default, score entry writes back, leaderboard populates.
- [ ] **Step 5: Commit**
```bash
git add watch/Views/LeaderboardView.swift watch/Views/NowPlayingView.swift watch/TheNineteenthWatchApp.swift
git commit -m "feat(watch): leaderboard, now-playing root, default-to-distance nav"
```

### Task M4.8: Complication

**Files:** Create `watch/Complication/ComplicationController.swift`

- [ ] **Step 1: Minimal accessory widget** — A WidgetKit complication showing "Round in progress" (+ hole) when active, tapping deep-links into the app. Have `ConnectivityClient` persist `{ active, hole, name }` to a shared App Group on each snapshot; the widget's `TimelineProvider` reads it. Add the App Group to `watch/TheNineteenthWatch.entitlements` and the main app via `withWatchApp.js`. Families: `accessoryRectangular` + `accessoryCircular`.
- [ ] **Step 2: Verify** — Add the complication to a face in the simulator; start/stop a round on the phone; confirm it reflects state and launches the app on tap.
- [ ] **Step 3: Commit**
```bash
git add watch/Complication watch/TheNineteenthWatch.entitlements plugins/withWatchApp.js
git commit -m "feat(watch): round-in-progress complication"
```

---

# M5 — Device Test Pass

### Task M5.1: Manual connectivity / GPS / battery matrix

**Files:** Create `docs/superpowers/plans/apple-watch-device-checklist.md`

- [ ] **Step 1: Write & execute the checklist on real hardware**

```
- [ ] Distance updates live walking toward a green (watch GPS), phone in pocket
- [ ] Distance keeps working with the phone app backgrounded
- [ ] Distance keeps working with the phone ~30m away (out of BT range) mid-hole
- [ ] Score entry from the watch appears on the phone scorecard within seconds
- [ ] Score entered while phone force-quit syncs after reopening the phone app (nothing lost)
- [ ] Score entered in airplane mode (both devices) syncs when back online
- [ ] Switching players in the scoring-pair writes to the correct player
- [ ] Pickup shows as "P" on the phone; Par sets the hole's par
- [ ] Premium user sees enabled stat sections; Free user sees only gross
- [ ] FIR section hidden on a par 3
- [ ] Leaderboard reflects the user's row, highlighted; stale when phone unreachable
- [ ] Complication shows round state and launches the app
- [ ] Full 18-hole round on one battery charge — note % used
```

- [ ] **Step 2: Triage** — File a follow-up task per failing case. Battery regressions → revisit the GPS throttle (`distanceFilter`, stop on wrist-down).
- [ ] **Step 3: Commit**
```bash
git add docs/superpowers/plans/apple-watch-device-checklist.md
git commit -m "docs(watch): device test checklist + results"
```

---

## Self-Review (author's notes)

**Spec coverage:** architecture/phone-as-brain → M1–M3 + M0; build approach → M0.1/M0.4/M3.1; watch-GPS distance → M4.3/M4.5 + parity M4.1; 4 screens → M4.5–M4.7; stats + gating + 1:1 `HoleScore` + no migration → M1.4/M2.2; pickup=`PICKUP_SCORE` → M2.1; protocol/idempotency/conflict → M2/M3.1 (conflict via `baseRev`, skew-free, `ts` informational); complication+notifications → M4.8 (notifications mirror via OS automatically); edge cases → M4.5/M4.7/M2/M5; testing → M1/M2/M3 (Jest) + M4.1–M4.3 (parity) + M5 (manual); 9-hole support → `holes.count`, never hard-coded.

**Integration accuracy:** all RN APIs verified against the codebase (see Verified Integration Points). Score writes use `useScorecardStore.updatePlayerHoleScore(playerId, hole, updates)`; stat gating via `useStatsVisibilityWithTier()` (passed through, not re-gated); players via `usePlayersToScore`; leaderboard via `useCompetitionLeaderboard`; distance via `calculateDistance`; unit literal `'metres'`.

**Type consistency:** `WatchSnapshot`/`WatchScoreWrite` field names match across `types.ts`, `snapshot.ts`, `scoreWrite.ts`, the Swift models, and `useWatchBridge.ts`. The pure handler is keyed by `playerId` end-to-end (matches the store API). `WatchLeaderboardRow.detail` is a preformatted string consistent across TS + Swift.

**Remaining confirm-at-wiring point (flagged inline):** the exact raw-`HoleCoordinate`-list hook name in `src/hooks/coordinates/` (`useHoleCoordinates` assumed) and `competitionId`/`courseId` sourcing for `useWatchBridge` — only the mapping layer changes, never the pure functions.

**Placeholder scan:** native pbxproj wiring (M0.4) and a few SwiftUI subviews/complication timeline are described rather than fully coded — genuinely iterative Xcode work, flagged as the known M0 risk; each has concrete APIs + acceptance criteria. All TS tasks contain complete code.
