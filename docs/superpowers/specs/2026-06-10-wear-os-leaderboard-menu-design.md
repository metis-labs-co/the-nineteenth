# Wear OS Companion — Spec 3c: Leaderboard + round menu

**Date:** 2026-06-10
**Status:** Approved (design)
**Scope:** The Wear round menu + Leaderboard screen, and wiring the real
navigation entry points. Builds on 3a (Distance) and 3b (Score). Toward Apple
Watch parity.

## Context

3a made Distance the home screen; 3b added Score reachable only via a DEBUG route
override. This spec ports the iOS `NowPlayingView` (round menu) and
`LeaderboardView`, and wires the menu so Distance / Score / Leaderboard are all
reachable for real — removing the DEBUG override.

## Decisions (from brainstorming)

- Distance stays home; a small menu affordance on it opens the round menu
  (matches iOS: open to Distance, toolbar button → menu).

## Components

### MenuScreen — `wear/.../ui/MenuScreen.kt` (port of `NowPlayingView`)

- `ScalingLazyColumn`:
  - Header card: competition name, "Hole {currentHole} of {holes.count}", a slim
    custom progress bar (fraction = currentHole / holeCount). Custom bar avoids
    Wear progress-indicator API surprises.
  - `MenuRow` × 3 — Distance / Enter score / Leaderboard — each a tinted glyph
    chip (⛳ / ✎ / 🏆) + label; tapping navigates to the route.

### LeaderboardScreen — `wear/.../ui/LeaderboardScreen.kt` (port of `LeaderboardView`)

- `ScalingLazyColumn` of rows: `rank` (secondary) · `name` (bold + primary when
  `isCurrentUser`) · `detail` (monospaced). Empty state "No standings yet". Rows
  are already trimmed on the phone (`trimLeaderboard`), so this is pure render.

### Distance entry point — `DistanceScreen`

- Add an `onOpenMenu` callback; render a small circular ☰ affordance bottom-center
  (wind badge stays top-center). Tapping → open the menu route.

### Navigation — `WearApp`

- Routes: `distance` (home), `menu`, `score`, `leaderboard`.
- Distance ☰ → `navigate("menu")`; menu rows → `navigate("distance" | "score" |
  "leaderboard")`; swipe-to-dismiss returns.
- Remove the 3b DEBUG score start-destination override; production start =
  `distance`. `WEAR_PREVIEW` remains an emulator-only sample-snapshot injector,
  and `WEAR_PREVIEW_START` may point at any route for screenshotting.

## Data flow

`snapshot.leaderboard` → LeaderboardScreen; `snapshot` (competitionName,
currentHole, holes.count) → MenuScreen header. All from the existing repository
`StateFlow`; no new bridge work.

## Testing

- No new pure logic (leaderboard trimming already lives + is tested on the
  phone), so render-verified: emulator walk-through Distance → ☰ → menu → tap
  Leaderboard → list, using a sample snapshot carrying leaderboard rows.
- Existing 16 Kotlin tests stay green; `:wear:assembleDebug` builds.

## Risks

- Wear progress-indicator API — mitigated by a custom fraction bar.
- Menu's "Distance" row re-pushing the home route (minor; matches iOS listing all
  three).
- Emulator tap coordinates for the walk-through screenshots.

## Out of scope (3c)

Keep-alive (foreground service / Health Services) and tile/complication — Spec 3d.
