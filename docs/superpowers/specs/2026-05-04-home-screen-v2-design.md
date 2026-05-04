# Home Screen v2 — Reformat & Weather

**Status:** Draft
**Date:** 2026-05-04
**Supersedes (partially):** `docs/superpowers/specs/2026-04-29-home-screen-design.md` — v1 *layout decisions* are replaced by §4 of this doc. v1's *data model, conditional-section rules, new-user fallback, and skeleton concept* still stand.

---

## 1. Goal

Reformat the existing Home screen to reduce visual density, lift the most actionable items above the fold, and introduce contextual weather. The data set the screen exposes does not change materially — what changes is grouping, hierarchy, and the addition of weather.

## 2. Why

The current Home screen stacks ~10 full-width sections vertically (`HomeScreen.tsx:174-247`). On a typical phone the user sees only the hero CTA and one or two sections without scrolling, and "trend" content (Stats, Achievements, Last Round) competes for the same vertical real estate as the action items the user actually needs first. Two problems follow:

- **Action latency** — the things a user opens the app to *do* (continue scoring, handle invites, prep for today's round) are interleaved with passive-consumption content.
- **Weather is missing** — players want a glance at conditions for an upcoming round; today they have to leave the app.

## 3. Audience priorities (validated in brainstorm)

The user (project owner) confirmed that the home screen should function as an **action launch pad**, with a secondary role of **personalisation / new-feature discoverability** (the bag summary in particular is treated as a hero element while it's still a new feature). Stats and achievements are valuable but de-prioritised — they belong as condensed entry points rather than full sections.

## 4. New layout

```
┌──────────────────────────────────────────────┐
│ PageHeader: Welcome Sam   [⛳] [🔔] [🌤 18°*] │  *chip only when no round in next 24h
├──────────────────────────────────────────────┤
│ + Score Social Round                         │  hero CTA
├──────────────────────────────────────────────┤
│ ▶ Continue scoring (carousel)                │  conditional
│   View all rounds ›                          │
├──────────────────────────────────────────────┤
│ 🏌 Round today / tomorrow                    │  conditional — replaces v1 "Coming up"
│   Royal Melbourne · Tue 7:30 AM              │  when round in next 24h
│   ─────────────────────────────────────      │
│   🌤 18° · 🌬 12 km/h SW · ☔ 10%             │  weather strip (fail-soft)
├──────────────────────────────────────────────┤
│ ⚠ Pending actions                            │  conditional
├──────────────────────────────────────────────┤
│ 🎒 What's in the Bag · 12/14 · 7i 145 yds    │  unchanged BagSummarySection
├──────────────────────────────────────────────┤
│ 📅 Coming up (future rounds)                 │  conditional — only future rounds
│   Other scheduled rounds beyond 24h          │  beyond the hero card above
├──────────────────────────────────────────────┤
│ ┌──────────┬──────────┐                      │
│ │ 📊 Stats │ 🏆 Achs  │                      │  2×2 tile grid
│ ├──────────┼──────────┤                      │
│ │ 🏁 Comps │ 📜 Last  │                      │
│ └──────────┴──────────┘                      │
└──────────────────────────────────────────────┘
```

### 4.1 Section-by-section changes

| Element | v1 behaviour | v2 behaviour |
|---|---|---|
| Header | Title + golf + bell | + **Mini weather chip** (icon + temp) on the right, shown *only when no round in next 24h*. Tapping the chip is a no-op visually but is keyboard/AT-focusable with a descriptive accessibility label (it's an ambient indicator, not a CTA — keeps the surface honest and avoids ambiguous navigation). |
| Hero CTA | "Score Social Round" | Unchanged. |
| Continue scoring | In-progress carousel + "View all rounds" link | Unchanged behaviour. Stays first because mid-round is the most urgent state. |
| **Round-today hero card** *(new)* | — | Replaces v1's "Coming up" *when* the next round starts within 24h. Shows course, tee time, partners (if pairings exist), and a weather strip. |
| Pending actions | Existing list | Unchanged. |
| Bag summary | Existing card | Unchanged component (`BagSummarySection.tsx`). Position moves so it sits above the fold for discoverability. |
| Coming up (Upcoming) | Up to 3 upcoming rounds | Conditional: hidden if the only upcoming round is the one already shown in the round-today hero card. |
| Stats highlights | Full-width section | Folded into the **Stats tile** in the grid. |
| Achievement stats | Full-width section | Folded into the **Achievements tile** (combines earned/total + "X close"). |
| Achievements in progress | Up to 2 progress cards | Folded into the **Achievements tile** subtext ("3 close to unlocking"). Tapping the tile opens the full achievements screen. |
| Competitions & leagues | Horizontal scroll list | Folded into the **Competitions tile** ("2 active · next: Sunday"). Tapping opens the full list. |
| Last round | Full-width card | Folded into the **Last round tile** (score · course · days ago). |
| Friend activity | Empty placeholder | **Removed** from this revision. The data feed isn't wired (`FriendActivitySection items={[]}` in `HomeScreen.tsx:246`). Reintroduce as a separate piece of work once the feed exists. |
| New-user fallback | `NewUserFallback` | Unchanged. |
| Skeleton | `HomeSkeleton` | Updated to match the new layout (action stack + 2×2 tiles). |

### 4.2 Render order

```
PageHeader (with conditional weather chip)
└─ ScrollView
   ├─ FeatureButton "Score Social Round"
   ├─ if (isNewUser) NewUserFallback else:
   │   ├─ if (inProgressRounds.length) "Continue scoring" carousel + ViewAll
   │   ├─ if (roundIn24h) RoundTodayCard (with WeatherStrip)
   │   ├─ if (pendingActions.length) PendingActionsSection
   │   ├─ BagSummarySection
   │   ├─ if (otherUpcomingRounds.length) UpcomingRoundsSection (filtered)
   │   └─ HomeTileGrid
   │       ├─ StatsTile
   │       ├─ AchievementsTile
   │       ├─ CompetitionsTile
   │       └─ LastRoundTile
   └─ DEV TOOLS (dev only, unchanged)
```

## 5. Weather

### 5.1 Behaviour rules (validated)

- **Round-today hero card with weather strip:** appears when there is a round scheduled within the next **24 hours**.
- **Mini weather chip in the header:** appears when there is **no** round in the next 24 hours. Hidden otherwise (the round card already covers conditions).
- **Mutually exclusive** — chip and card never both render.

### 5.2 Data sources

| Surface | Location | API call |
|---|---|---|
| Round-today card | `course.latitude`, `course.longitude` for the round's course | Hourly forecast for the date+hour of the tee time |
| Header chip | Device location via existing `useUserLocation()` hook (`src/hooks/location/userLocation.ts`) | Current conditions |

If the round's course is missing coordinates, the weather strip is omitted (round card still renders normally). If device location is unavailable or denied, the header chip is omitted.

### 5.3 API choice — Open-Meteo

**Default:** [Open-Meteo](https://open-meteo.com/) (`api.open-meteo.com/v1/forecast`).
- Free, no API key required, generous 10k req/day.
- Returns temperature, wind speed/direction, precipitation probability, weather code (mapped to icon).
- Supports hourly forecasts (needed for tee-time-specific data).

**Alternative:** if the team prefers Apple WeatherKit or OpenWeatherMap later, the new hook is the only seam — the rest of the screen is API-agnostic.

### 5.4 Hook contract

```ts
// src/hooks/weather/useWeather.ts
type WeatherInput =
  | { kind: 'current'; lat: number; lng: number }
  | { kind: 'at-time'; lat: number; lng: number; isoDateTime: string };

interface WeatherSnapshot {
  tempC: number;
  weatherCode: number;        // Open-Meteo WMO code
  windKph: number;
  windDirDeg: number;         // 0=N
  precipProbability: number;  // 0-100
  fetchedAt: string;
}

useWeather(input: WeatherInput | null): UseQueryResult<WeatherSnapshot | null>;
```

- Disabled when `input === null`.
- Stale time: 30 minutes.
- Cache key: `['weather', input.kind, input.lat, input.lng, input.isoDateTime ?? 'current']`.
- Coordinates rounded to 2 decimal places (~1 km grid) before keying, so a small movement doesn't cause re-fetches.
- Errors are logged and surface as `null`; consumers render fail-soft.

### 5.5 Display

- **Temp** — integer, °C, respects future temperature-unit setting if added.
- **Condition icon** — mapped from Open-Meteo weather code → existing `Icon` source set or a small inline SVG sprite. (See §8 for icon mapping table.)
- **Wind** — `12 km/h SW`. Direction is the cardinal of the *origin*, matching golf convention.
- **Precip** — only shown when probability ≥ 10%, otherwise omitted to keep the strip clean.

## 6. Tile grid contract

A new `HomeTileGrid` component renders four tiles in a 2-column grid (50% width minus gutter). Each tile is a `TouchableOpacity` styled with `colors.surface`, `borderRadius.lg`, `borderColor: colors.borderLight`, fixed minimum height (~96px), and an internal layout of:

```
┌────────────────┐
│ [icon]  TITLE  │
│                │
│ HEADLINE       │
│ subtext        │
└────────────────┘
```

| Tile | Headline | Subtext | onPress |
|---|---|---|---|
| Stats | Handicap (e.g. "12.4"), or "—" if none | "avg 84 · last 5: 82" or "Play 3 rounds to unlock" | nav: Stats screen |
| Achievements | "23 / 40" earned | "3 close to unlocking" or "—" | nav: Achievements screen |
| Competitions | Active count (e.g. "2") | Next deadline ("next: Sun 11 May") or "No active comps" | nav: Competitions list |
| Last round | Score (e.g. "82") | Course · days ago ("Royal Melb · 4d ago") or "No completed rounds" | nav: ViewRound for that round |

All tile copy is sourced from the existing `useHomeData()` hook — no new queries needed for the grid itself.

## 7. Data layer impact

The `useHomeData` hook (`src/hooks/home/useHomeData.ts`) already returns everything the tiles need (`stats`, `achievementSummary`, `achievementsInProgress`, `competitions`, `leagues`, `lastRound`). Two small additions:

1. **`upcomingWithin24h`** — computed memo that derives from `upcomingRounds` and the current time, so the screen can decide whether to render the round-today hero card vs. the regular Upcoming list.
2. **`upcomingRoundsForList`** — `upcomingRounds` minus any round already shown in the hero card.

The `friends` and `friendCount` outputs remain (other screens use them) but are no longer consumed by Home. The `useHomeData` return shape gains the two memos above; nothing is removed.

A new hook is added under `src/hooks/weather/`:
- `useWeather(input)` (see §5.4)
- `useUpcomingRoundWeather(round)` — convenience wrapper that selects `at-time` mode using the round's course coordinates and tee time.
- `useDeviceWeather()` — convenience wrapper that selects `current` mode using `useUserLocation()`.

## 8. Components to add

```
src/screens/home/components/
  RoundTodayCard.tsx          // hero card for round in next 24h
  WeatherStrip.tsx            // shared weather row used inside RoundTodayCard
  HeaderWeatherChip.tsx       // mini chip rendered in PageHeader rightActions
  HomeTileGrid.tsx            // wrapper that renders the 4 tiles
  HomeTile.tsx                // generic tile (icon, title, headline, subtext)
  tiles/
    StatsTile.tsx
    AchievementsTile.tsx
    CompetitionsTile.tsx
    LastRoundTile.tsx
src/hooks/weather/
  useWeather.ts
  useUpcomingRoundWeather.ts
  useDeviceWeather.ts
  weatherCodeToIcon.ts        // pure mapping module + tests
  index.ts
```

`PageHeader` needs to support an optional non-button right slot (or a typed extension to `rightActions` that accepts a custom render). Pick whichever fits cleanest with the existing API once we open the file in plan execution.

## 9. Components to remove from Home

These files become unused by Home but stay in the codebase if other screens reference them. Removing them is a follow-up; for the v2 ship we just stop importing them in `HomeScreen.tsx`:

- `StatsHighlightsSection.tsx`
- `AchievementStatsSection.tsx`
- `AchievementProgressSection.tsx`
- `LastRoundSection.tsx`
- `FriendActivitySection.tsx`

After the v2 lands and we confirm no other consumers, delete them.

## 10. Edge cases & states

- **No data of any kind** → `NewUserFallback` (unchanged).
- **No upcoming round, no in-progress** → header shows weather chip; body shows hero CTA + bag + tile grid (with empty-state subtext per tile).
- **Round in next 24h, weather API fails** → hero card renders without the weather strip.
- **Round in next 24h, course missing coords** → hero card renders without the weather strip.
- **Device location denied** → header chip hidden, no error UI.
- **Offline** → React Query's cached snapshot is shown if present; otherwise weather UIs are silently omitted. The rest of the screen continues to work.
- **Tile with no data** → renders the empty-state subtext from §6 instead of an empty value.

## 11. Accessibility

- Mini weather chip has `accessibilityLabel="Currently 18 degrees, partly cloudy"` (spelt out, not just an icon).
- Round-today card describes the full state in one label: `"Round at Royal Melbourne, Tuesday 7:30 AM, partly cloudy 18 degrees, light wind"`.
- Tile grid items each have a clear accessible name and a chevron-free tap target ≥ 44 pt.

## 12. Out of scope

- Live re-fetch of weather while the app is foregrounded (we lean on `useFocusEffect`'s existing refetch).
- Multi-day forecast UI.
- Weather notifications / push.
- Friend activity feed (revisit when the data layer exists).
- Reordering personalisation (drag-to-reorder tiles) — defer.
- Localised units (mph, °F) — covered when global unit settings expand.

## 13. Verification

- Manual: open Home in each of these states — empty (new user), in-progress only, scheduled round in 24h, scheduled round outside 24h, completed round only, no internet.
- Snapshot tests for `RoundTodayCard`, `HeaderWeatherChip`, each tile (loading + populated + empty-state).
- Pure-function test for `weatherCodeToIcon` covering the WMO code ranges Open-Meteo returns.
- Manual perf check: grid renders without layout jumps; existing skeleton matches final layout dimensions.

---

*End of spec.*
