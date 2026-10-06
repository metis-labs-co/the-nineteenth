# Upcoming-competition card: weather forecast + description

**Date:** 2026-06-23
**Status:** Approved (brainstorm)

## Goal

On the Home screen's "Upcoming competition" card (`NextCompetitionCard`), add:

1. The competition **description**, shown below the title.
2. A **weather forecast** for each day the competition runs (one line per distinct
   round day), shown only for days within the available forecast window.

## Context

- The card is rendered by `NextCompetitionCard` from `homeData.nextCompetition`
  (a single `RoundWithCourse` — the next competition round within 7 days).
- `useUpcomingRounds` already fetches **all** of the user's upcoming competition
  rounds (`status = 'upcoming'`, `date >= today`, no upper bound), each with
  `course.clubs` joined and `clubs.latitude`/`longitude` hydrated from the PostGIS
  `location`. So the per-day data is already in memory — no new round query needed.
- Existing weather infrastructure:
  - `useWeather` — Open-Meteo, modes `current` / `at-time` (hourly, `forecast_days=2`).
  - `weatherCodeToIcon` — WMO code → MDI icon + label.
  - `WeatherStrip`, `dateLabels.ts` (`formatDayLabel`, `localDateStr`).
- `competition.description` exists (`competition.types.ts:63`) but is **not** in the
  `useUpcomingRounds` select (`competition(id, name)` only).

## Design

### 1. Data: derive the competition's distinct days (`useHomeData`)

Add `competition.description` to the `useUpcomingRounds` select:
`competition:competitions(id, name, description)`.

In `useHomeData`, alongside `nextCompetition`, derive a new field
`nextCompetitionDays: CompetitionDay[]` (and expose it on `HomeData`):

```ts
interface CompetitionDay {
  dateIso: string;   // YYYY-MM-DD (local)
  lat: number;
  lng: number;
}
```

Derivation (pure helper `computeCompetitionDays(upcoming, competitionId)`, exported
for unit tests):
- Filter `upcomingRoundsRwc` to rounds where `competition?.id === nextCompetition.competition.id`.
- For each, resolve coords from the hydrated club (`clubs.latitude/longitude`, else
  `clubs.location.coordinates` `[lng, lat]`). Drop rounds with no coords.
- Dedupe by `dateIso` (first round wins for that day's coords).
- Sort ascending by `dateIso`.
- Return `[]` when there is no `nextCompetition`.

In the `forceNewUserHome` dev branch, return `nextCompetitionDays: []`.

> Past days of an already-started competition are not in `useUpcomingRounds`
> (`date >= today`), and past weather is irrelevant — acceptable.
>
> The hole-coordinate fallback (`useFallbackCourseCoords`) is a hook and cannot be
> looped per day, so it is intentionally not used here; club coords only. Days with
> no resolvable coords drop their weather line.

### 2. Daily-forecast hook: `useCompetitionWeather`

New file `src/hooks/weather/useCompetitionWeather.ts`.

```ts
interface DailyWeather {
  weatherCode: number;
  tempMaxC: number;
  tempMinC: number;
  precipProbabilityMax: number;
}
function useCompetitionWeather(
  days: CompetitionDay[],
): UseQueryResult<Record<string, DailyWeather | null>>;
```

- Single `useQuery` (rules-of-hooks safe for any day count). `enabled` when `days.length > 0`.
- Query key: `['weather', 'competition', sortedUniqueRoundedCoords, sortedDateIsos]`.
- For each **unique rounded coordinate** (coords rounded to 2dp, matching `useWeather`),
  one Open-Meteo fetch:
  `daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max`
  `&timezone=auto&forecast_days=16`. Run the (usually 1) fetches with `Promise.all`.
- Build `Record<dateIso, DailyWeather | null>`: for each day, find its coord's response
  and the index where `daily.time[i] === dateIso`. If the date is outside the returned
  range (too far out), the day gets **no entry** (omitted).
- Fail-soft: any fetch error → that coordinate contributes no entries (logged via
  `console.warn`, consistent with `useWeather`). Never throws to the UI.
- `staleTime: CACHE_TIMES.STATIC`, `gcTime: GC_TIMES.LONG` (same as `useWeather`).

### 3. UI: `NextCompetitionCard`

Props gain `days: CompetitionDay[]` (description comes from `round.competition.description`).

- **Description**: below the title, `typography.caption`/`small` in `colors.textSecondary`,
  `numberOfLines={2}`, rendered only when non-empty. Placed under the existing
  title/subtitle block.
- **Weather section**: below the main row, call `useCompetitionWeather(days)`. For each
  day that has a forecast entry, render a `CompetitionWeatherRow`:
  - Left: day label + short date — `formatDayLabel(dateIso)` + `formatDisplayDate(.., {day:'numeric', month:'short'})`, e.g. `Fri · 26 Jun`.
  - Right: `weatherCodeToIcon(weatherCode).icon` + `Math.round(max)°/Math.round(min)°`
    + (when `precipProbabilityMax >= 10`) `water-percent` icon + `NN%`.
  - Styling mirrors `WeatherStrip` (`colors.textTertiary`, small/smallBold type, gap `xs`).
  - Accessibility label per row, e.g. `"Friday 26 Jun, Partly cloudy, 24 to 14 degrees, 20 percent chance of rain"`.
- Render **nothing** for the weather section when no day has an entry (far-off comp looks
  exactly as today). Don't show a loading spinner — the section just appears when data lands.

`CompetitionWeatherRow` is a small subcomponent in
`src/screens/home/components/` (co-located with `NextCompetitionCard`).

### 4. Wiring

`HomeScreen` passes `homeData.nextCompetitionDays` to `NextCompetitionCard` as `days`.

## Files

| File | Change |
|------|--------|
| `src/hooks/home/useUpcomingRounds.ts` | Add `description` to `competition` select |
| `src/hooks/home/useHomeData.ts` | `computeCompetitionDays` helper + `nextCompetitionDays` on `HomeData` (+ dev branch) |
| `src/hooks/weather/useCompetitionWeather.ts` | **New** daily-forecast hook |
| `src/hooks/weather/index.ts` | Export `useCompetitionWeather`, `CompetitionDay`, `DailyWeather` (if barrel exists) |
| `src/screens/home/components/NextCompetitionCard.tsx` | Description + weather section |
| `src/screens/home/components/CompetitionWeatherRow.tsx` | **New** per-day row |
| `src/screens/home/HomeScreen.tsx` | Pass `days` prop |

## Testing

- Unit: `computeCompetitionDays` — filters by comp id, dedupes by date, sorts, drops
  no-coord rounds, returns `[]` when no `nextCompetition`.
- Unit: `useCompetitionWeather` URL/response mapping — date→index lookup, out-of-range
  date omitted, error → fail-soft empty, multi-coordinate grouping.
- Component: `NextCompetitionCard` renders description when present / hidden when null;
  renders a weather row per forecastable day; renders no weather section when empty.

## Non-goals

- Hourly/tee-time-specific forecast per comp day (daily summary only).
- Hole-coordinate coordinate fallback for comp days.
- Weather for past (already-played) competition days.
- Placeholder text for days beyond the forecast window (silently omitted).
