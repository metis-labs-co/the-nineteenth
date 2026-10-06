# Home "Upcoming competition" card — Design

**Date:** 2026-06-22
**Branch:** `worktree-home-upcoming-competition-card`
**Status:** Approved design — ready for implementation plan

## Problem

When the logged-in user has a competition scheduled in the near future (e.g. this
coming Friday), nothing about it appears on the home screen. The user has to
navigate into the Competitions list to find it.

### Root cause

The home screen already has machinery for upcoming rounds, but a competition
round more than 24h out falls through a gap:

- **Hero card** (`RoundTodayCard`) is fed by `useUpcomingRounds()`, which *does*
  include competition rounds — but `useHomeData` only surfaces a round in the
  hero if its tee time is **within the next 24 hours**
  (`computeUpcomingRwcWithin24h`). A Friday round seen on Monday is skipped.
- **"Coming up" list** (`UpcomingRoundsSection`) shows rounds further out, but is
  sourced **only from standalone rounds** via `useRoundList` — competition rounds
  are explicitly excluded (`useHomeData.ts:315-316`).

So a competition round 1–7 days away is too far out for the hero and the wrong
source for the list, and is therefore invisible.

## Goal

Add a dedicated **"Upcoming competition"** card to the home screen that surfaces
the user's next competition round, with a quick link into the competition.

## Decisions (confirmed with user)

| Question | Decision |
| --- | --- |
| UI shape | Dedicated card (not folded into the generic list) |
| Tap target | Open `CompetitionDetail` for that competition |
| Visibility window | Only when the next competition round is within the next **7 days** |
| Card content | **Competition name** + **date with day label** (no tee time / course) |

## Design

### Data layer — `src/hooks/home/useHomeData.ts`

`useUpcomingRounds()` already returns the user's upcoming rounds (standalone +
accepted-competition) in `RoundWithCourse` shape, including the
`competition: { id, name }` join, sorted by date then tee time ascending, and
already filtered to `status = 'upcoming'` and `date >= today`. Reuse it — no new
query.

Add a pure, exported helper (testable without a React runtime, matching the
existing `computeUpcoming*` helpers):

```ts
export function computeNextCompetitionWithin7Days(
  upcoming: RoundWithCourse[],
  now: Date,
  excludeId: string | null,
): RoundWithCourse | null
```

Logic:
1. Keep only rounds that belong to a competition (`competition_id` set / a
   non-null `competition` join).
2. Keep only rounds whose computed start (`date` + `tee_time`, defaulting tee
   time to `09:00:00` as the other helpers do) falls within `[now, now + 7d]`.
3. Exclude the round already shown in the 24h hero (`excludeId`) so it is never
   shown twice.
4. Return the earliest qualifying round (list is already date-sorted, so the
   first match).

Expose on `HomeData` as `nextCompetition: RoundWithCourse | null`, computed via
`useMemo` from `upcomingRoundsRwc` and `upcomingWithin24h?.id`.

### Component — `src/screens/home/components/NextCompetitionCard.tsx`

New card mirroring `RoundTodayCard`'s structure and styling:
- Surface background, subtle border, leading icon (trophy/golf), headline +
  subtitle, trailing chevron.
- `useThemeColors()` for dynamic colours; `spacing`/`typography`/`borderRadius`
  imported directly.
- Section header label: "Upcoming competition".
- Headline: competition name (`round.competition.name`).
- Subtitle: day label + date, e.g. "This Friday · 26 Jun" using the shared date
  helper (see refactor below).
- `onPress` → `navigation.navigate('CompetitionDetail', { id: round.competition.id })`.
- Accessibility: `accessibilityRole="button"`, descriptive label + hint.
- `React.memo`, consistent with the other home cards.

Props: `{ round: RoundWithCourse }` (only rendered when non-null, so no internal
null handling).

### Shared date helper — small refactor

`formatDayLabel` and `localDateStr` currently live privately inside
`RoundTodayCard.tsx`. Extract them into a small shared module
(`src/screens/home/components/dateLabels.ts`) and have both `RoundTodayCard` and
`NextCompetitionCard` import from it, rather than duplicating. Keep the existing
behaviour identical ("Today" / "Tomorrow" / weekday via `formatDisplayDate`).

### Screen — `src/screens/home/HomeScreen.tsx`

Render `<NextCompetitionCard round={home.nextCompetition} />` immediately **below
the hero round card** and above the handicap card, gated on
`home.nextCompetition != null`.

## Edge cases

- **No `date` on the competition round.** `useUpcomingRounds` filters
  `date >= today`, which drops rounds with a null `date`. If the user's Friday
  round has no per-round `date` (only the competition `start_date`), it will not
  appear. **Action:** verify during testing that the target round has a `date`.
  If competition rounds commonly lack per-round dates and rely on the
  competition `start_date`, that is a separate, larger change — flag it rather
  than silently widening scope here.
- **Round within 24h.** If the next competition round is also the 24h hero round,
  it is excluded by `excludeId` and the card is hidden, so no duplication.
- **Multiple competition rounds in the window.** Show the single earliest.
- **No qualifying round.** Card is not rendered.

## Testing

Unit tests for `computeNextCompetitionWithin7Days`:
- picks the earliest competition round within the window;
- excludes standalone (non-competition) rounds;
- excludes the hero round by id;
- window boundaries: today included, +7d edge included, beyond excluded, past
  tee-time-today excluded;
- returns null when nothing qualifies.

Manual: confirm the user's real Friday competition surfaces on the home screen
and tapping it opens the correct `CompetitionDetail`.

## Out of scope

- Changing how/whether competition rounds get per-round `date`s.
- Folding competition rounds into the existing "Coming up" standalone list.
- Tee time / course / weather on this card.
