# Apple Watch Companion — Design Spec

**Date:** 2026-06-01
**Status:** Approved (design) — pending implementation plan
**Author:** Sam + Claude (brainstorming session)

## Context

The Nineteenth is an Expo (SDK 54) / React Native iOS + Android app for social golf
competitions. There is currently no Apple Watch support anywhere in the codebase. With
a watch now available for development and testing, this spec defines a **watchOS
companion app**.

The watch's most natural golf jobs are glanceable distance-to-pin and hands-free
on-course scoring (phone stays in the bag). The app already has the building blocks the
companion reuses: a GPS distance-to-pin feature, a `HoleScore` model with detailed shot
stats, a scoring engine (Stableford / Stroke / Match / teams), live leaderboards, an
offline SQLite queue with background sync, and a subscription-tier system.

### Hard constraint

**React Native does not run on watchOS.** The watch UI is native **SwiftUI** regardless
of approach. The decisions below concern how to add and maintain a watchOS target
alongside Expo's managed/CNG workflow, and how the watch communicates with the app.

## Goals (Phase 1)

A **tethered** ("phone is the brain") SwiftUI companion with four screens plus a
complication and mirrored notifications:

1. **Distance-to-pin** — live yardage computed from the **watch's own GPS**.
2. **Score entry** — for the players in the user's **scoring-pair assignment**, including
   optional detailed shot stats for Premium users.
3. **Leaderboard glance** — read-only current standing.
4. **Now-playing (root)** — round status + navigation; the complication's tap target.

### Non-goals (Phase 1)

- Standalone operation without the phone (Phase 2).
- Starting/advancing rounds from the watch (Phase 3).
- Full-group scoring beyond the user's scoring-pair (Phase 3).
- A live/interactive hole map (needs green-polygon data we do not have).
- Any Supabase, auth, or credential handling on the watch.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary job | Full companion, vision captured but build **phased** | Manage scope; ship value early |
| Connectivity | **Tethered** Phase 1, standalone later | Validate UX fast; phone is usually nearby |
| Scoring scope | The user's **scoring-pair assignments** | Respects existing `ScoringPair` feature |
| Build approach | **Expo config plugin + SwiftUI target + `react-native-watch-connectivity`** | Stays in managed/CNG, EAS-buildable, no hand-maintained `ios/` |
| Distance GPS | **Watch-native CoreLocation** (pulled forward from Phase 2) | Removes phone-foreground dependency for the most-used screen |
| Map backdrop | **Dropped** | Only point coords (centre/front/back) exist, not green polygons |
| Pickup write | Watch sends *intent*; phone writes `PICKUP_SCORE` (10) | Phone owns canonical engine mapping |
| Stat fields | 1:1 with existing `HoleScore` JSONB | No DB migration; phone/watch consistency |
| Source of truth | The phone's scorecard | Watch is a remote editor that self-corrects from snapshots |

## Architecture — "phone is the brain"

The watch is a thin SwiftUI client; the existing RN app does all real work except
distance, which the watch computes locally.

```
⌚ SwiftUI Watch App                         📱 The Nineteenth (RN, phone)         ☁️ Supabase
  • CoreLocation (own GPS)                     • WatchBridge service                 • no watch-
  • Distance engine (local calc)   ◀── WCSession ──▶  (state ⇄ watch messages)        specific
  • 4 screens + complication        via react-native-       • useUserLocation          changes
  • caches current hole +           watch-connectivity      • TanStack Query/Supabase  • scores via
    green coords only (no DB)                               • SQLite offline queue       normal sync
                                                            • scoring engine           • RLS unchanged
```

The watch never touches Supabase, auth, or the network in Phase 1. Distance is the only
thing computed on-device; everything else flows through the phone's existing, tested
sync path. The phone pushes the current course's green coordinates (from Supabase
`HoleCoordinate` data) so the watch can compute distance against its own GPS fix.

### New / changed components

- **`WatchBridge`** (new RN service) — maps app state ⇄ watch messages; builds the
  snapshot, handles inbound score writes. Designed as small, focused, unit-testable
  modules (snapshot builder, write handler, transport adapter).
- **`react-native-watch-connectivity`** (new dependency) — `WCSession` bridge to JS,
  wrapped in a thin **mockable adapter** so logic is testable without a device.
- **Expo config plugin** (new) — injects the watchOS SwiftUI target (sources,
  Info.plist, entitlements incl. `NSLocationWhenInUseUsageDescription`, embed build
  phase) on `expo prebuild`.
- **watchOS SwiftUI target** (new) — the four screens, distance engine, complication,
  view-models.

## Screens

All screens use the app's dark golf palette. **Distance is the default screen** once a
round is live.

### 1. Distance

- Header: `Hole N · Par P`. Large yardage **to centre**, with **F**/**B** (front/back)
  below when available. Units (m/yds) follow the user's existing app setting.
- Driven by watch CoreLocation against cached green coords (Haversine).
- GPS searching / low-accuracy → "GPS…"; no green coords → "—".
- No map backdrop (only point coords exist, not polygons).

### 2. Score entry (one vertically-scrolling screen per player)

- **Horizontal swipe** = next player in the scoring-pair (pager dots).
  **Vertical scroll** = more detail for the current player.
- **Gross score** (always shown): rounded-square **+ / −** buttons (app
  `borderRadius.lg` style, green) flanking the value; Digital Crown also adjusts it.
  Quick marks: **Pick up** and **Par** (1-tap to the hole's par).
- **Auto-saves** — no submit button; inline ✓ once queued.
- **Detailed stats** (Premium only, each section gated by the user's existing per-stat
  settings toggle — the watch reads the same settings the phone uses) appear as
  additional scroll-down sections:
  - **Putts** — number stepper.
  - **Fairway (FIR)** — 5-way tap-segments: Hit / Left / Right / Short / Long.
    *Hidden on par 3s.* Maps to `fairwayHit` + `fairwayMissDirection`.
  - **Green (GIR)** — 5-way: Hit / Left / Right / Short / Long. Maps to
    `greenInRegulation` + `greenMissDirection`.
  - **Bunker shots** — number stepper (0–5). Maps to `bunkerShots`.
  - **Penalties** — **multi-select** toggles: Water / OB / Lateral / Lost. Maps to
    `hazards: [{type}]` with `type ∈ water | ob | lateral | lost_ball`.
- Free / non-Premium users see only Gross + Par/Pick-up.
- All values map 1:1 to the existing `HoleScore` JSONB — **no DB migration**.

### 3. Leaderboard (read-only)

- Compact list: a few players around the user; **the user's row is pinned and
  highlighted**. Shows `toPar` and `thru`. Updates from snapshots; stale marker when
  the phone is unreachable.

### 4. Now-playing (root)

- Competition name, "Round in progress", `Hole N of 18`, quick navigation to the other
  three screens. This is the **complication's tap target**.
- No active round → "No round in progress — start one on your phone."

### Complication & notifications

- Watch-face complication: "Round in progress — tap to open", refreshed from snapshots.
- Push notifications mirror to the watch via the system automatically (no double-send).

## Sync & Message Protocol (`WCSession`)

Three channels:

### ① Phone → Watch — `applicationContext` (latest-wins snapshot, background-delivered)

Sent on round start and on change; carries a monotonic `rev`. Two logical parts:

- **Static round config** (rarely changes): `roundId`, competition name, units,
  `isPremium`, enabled per-stat flags, scoring-pair players `[{id, name}]`, and the
  **full hole list** `[{hole, par, strokeIndex, green:{center, front, back} as
  lat/lng}]`. Pushing all 18 holes' coords up front lets the watch compute distance and
  score for **any** hole with **zero round-trips** when the phone drifts out of range.
- **Live state** (changes often): each pair-player's currently-recorded score+stats per
  hole, the phone's "current hole" hint, and a trimmed **leaderboard snapshot**
  `[{rank, name, toPar, thru}]`.

### ② Watch → Phone — `transferUserInfo` (guaranteed FIFO, survives disconnect, wakes phone)

One **score-write** message per save:

```jsonc
{
  "clientWriteId": "uuid",          // idempotency
  "ts": 1780000000,                 // informational
  "roundId": "...",
  "hole": 7,
  "playerId": "...",
  "strokes": 4,                     // or "pickup" → phone writes PICKUP_SCORE (10)
  "stat": {                         // optional, Premium
    "putts": 2,
    "fairwayHit": true,
    "fairwayMissDirection": "left",
    "greenInRegulation": false,
    "greenMissDirection": "short",
    "bunkerShots": 1,
    "hazards": [{ "type": "water" }]
  }
}
```

The phone validates and feeds the write through the **existing** scorecard mutation +
SQLite offline queue → Supabase. No new backend surface.

### ③ Watch ⇄ Phone — `sendMessage` (live, only when reachable)

Latency optimisation only: instant ✓ acks and snapshot nudges. If unreachable,
everything still flows via ① and ②.

### Idempotency & conflict resolution

- Every write carries a `clientWriteId`; the phone **dedups** on redelivery.
- Resolution is **last-write-wins**, but the **phone resolves using its own clock**: a
  watch write applies unless the phone has a *more recent local user edit of that exact
  field*. This sidesteps watch/phone clock skew (the watch's `ts` is informational, not
  authoritative).
- The **phone's scorecard is the source of truth**; the watch self-corrects from the
  next `applicationContext` push.

### Pickup rule

The engine's canonical pickup representation is `PICKUP_SCORE = 10` stored as the gross
(rendered as a red "P", 0 Stableford points, a loss in match play). The watch sends a
**pickup intent**; the phone writes `PICKUP_SCORE`. The watch never hard-codes the
constant.

## Error & Edge Cases

**Connectivity (phone unreachable — range / force-quit / dead):**
- Distance keeps working (watch GPS + cached coords).
- Score writes queue on the watch (`transferUserInfo`); UI shows "Saved · syncing"
  until a snapshot confirms. Nothing lost.
- Leaderboard shows last snapshot with an "as of HH:MM" stale marker.
- Force-quit asymmetry: `sendMessage` acks stop, but `transferUserInfo` +
  `applicationContext` still relaunch the phone app in the background; sync resumes.

**Location / distance:**
- GPS searching / low accuracy → "GPS…" (gate on horizontal accuracy); never a
  confidently-wrong number.
- Watch location permission denied → distance shows an enable-location prompt; score +
  leaderboard still work.
- No green coords for the hole → "—"; other screens unaffected.

**Round state:**
- No active round → root prompts to start on the phone.
- Round live but phone app never launched / WCSession not activated → "Open The
  Nineteenth on your phone to begin."
- Watch not paired / app not installed → phone `WatchBridge` no-ops silently.

**Scoring correctness:**
- Duplicate delivery → deduped by `clientWriteId`.
- Conflicting phone + watch edits → phone-clock rule above; watch self-corrects.
- Rapid crown spins → **debounced** into one write on settle.
- Scoring-pair changes mid-round → next snapshot updates the player list; a queued write
  for an unassigned player is dropped + logged by the phone.

**Tier / permissions:**
- Premium downgrade mid-round → snapshot flips `isPremium`/flags; watch hides stat
  sections on next push; already-entered stats remain (grandfathering).
- Units changed on phone → snapshot carries units; watch re-renders.

**Battery / performance:**
- Watch GPS throttled (~1–3s, backs off when stationary) and stopped when off the
  distance screen, wrist-down, or round inactive.

Theme: the watch **degrades gracefully and never blocks** — optimistic local state,
reconciled from the phone's snapshot.

## Testing Strategy

Split by layer because native watchOS cannot be Jest-tested:

- **RN-side bridge logic (Jest — highest value, where correctness lives):**
  - `WatchBridge` snapshot builder (app state → `applicationContext`): pure function.
  - Score-write handler: pickup intent → `PICKUP_SCORE`, stat → `HoleScore` mapping,
    `clientWriteId` dedup, phone-clock conflict rule, scoring-pair validation. **High
    coverage** (matches the 80% scoring target). Extend existing scoring tests with
    watch-originated cases.
- **Distance calc parity:** a tested TS reference (Haversine + unit conversion +
  accuracy gating) and a Swift mirror, both driven by the **same input→expected
  fixtures** so they cannot drift.
- **Swift / watchOS (XCTest):** distance engine vs golden vectors; view-model state
  machines (round active/inactive, GPS states); message encode/decode. SwiftUI previews
  for layout.
- **Bridge transport:** `react-native-watch-connectivity` wrapped in a mockable adapter;
  real `WCSession` verified on a paired simulator + device.
- **Manual device matrix (checklist in the plan):** phone-in-bag, force-quit, airplane
  mode, GPS loss, all-day battery — the connectivity/GPS/battery scenarios that cannot
  be unit-tested.

## Phasing Roadmap

- **Phase 1 (this spec):** tethered SwiftUI companion — 4 screens + complication /
  notifications; config-plugin watch target; `WatchBridge`; message protocol.
- **Phase 2 — Standalone:** watch talks to Supabase directly (own auth + offline store +
  sync), works with no phone. Optional full hole-map screen *if* green-polygon data
  lands.
- **Phase 3 — Richer on-wrist:** start/advance rounds from the watch; full-group
  scoring; HealthKit (heart rate / steps / auto-round detection); Siri shortcuts; more
  complication families.

## Implementation Sequencing Risk

The **single biggest Phase 1 risk is the Expo config plugin that injects the watchOS
target** into the Xcode project (pbxproj manipulation). The implementation plan should
**spike this first** — get a "hello world" watch target building through EAS *before*
building any screens — to de-risk the hard part early.
