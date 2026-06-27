# Competition Round Results — Show Round Name — Design

**Date:** 2026-06-27
**Status:** Approved (design), pending implementation plan
**Author:** Sam / Claude

## Problem

On the competition Leaderboard tab → Round Results section, each round's heading shows
`Round {round_number}` (e.g. "Round 2", "Round 4", "Round 6"). Rounds have descriptive
**names** (e.g. "2v2 Alt Shot", "1v1 Singles Match Play"), and the stored numbers can be
confusing (non-contiguous when earlier rounds were deleted). Show the round **name** instead.

## Decisions (user, 2026-06-27)

- Heading shows the round's **name** when set; **falls back to `Round {round_number}`** when
  the name is null/empty.
- **Keep** the existing format pill (and team badge, date/course line) beside the heading.
- Scope: the competition Round Results section only. Review Scorecard and ViewRound headers
  are unchanged.

## Current rendering (verified)

The Round Results section (`LeaderboardTab.tsx`, `orderedRounds.map`) renders three header
paths, all showing `Round {roundNumber}`:
1. **Alt-shot / split match-play** branch → `<LeaderboardHeader roundNumber={round.round_number} …/>` directly.
2. **In-progress non-alt-shot, live** (`stableford/stroke/par`) → `<InProgressRoundLeaderboard roundNumber={round.round_number} …/>`, which renders its **own** header text `Round ${roundNumber}` (`InProgressRoundLeaderboard.tsx:223`).
3. **Completed, or in-progress non-live** → `<RoundLeaderboard …/>`, which renders `LeaderboardHeader` twice (empty-state at ~`:153`, main at ~`:247`) with `roundNumber={metadata.roundNumber}`.

`round.name` (string | null) is already present on the `RoundWithCourse` object in
`LeaderboardTab`. `LeaderboardHeader` does not currently accept a name; `RoundMetadata`
(used by `RoundLeaderboard`) does not expose one.

## Design

Thread `round.name` from `LeaderboardTab` into each header path as an optional `roundName`
prop; the heading prefers it over `Round {roundNumber}`.

### Unit A — `LeaderboardHeader`

Add optional prop `roundName?: string | null`. Compute the title:

```tsx
const title = roundName && roundName.trim().length > 0 ? roundName : `Round ${roundNumber}`;
```

Render `title` in place of the current `Round {roundNumber}` (`LeaderboardHeader.tsx:85`).
Everything else (format pill via `formatLabel`, team badge, date/course) is unchanged.

### Unit B — `RoundLeaderboard`

Add optional prop `roundName?: string | null`; pass it to **both** `LeaderboardHeader`
usages (the empty-state header and the main header).

### Unit C — `InProgressRoundLeaderboard`

Add optional prop `roundName?: string | null`; change its header text (`:223`) to prefer it:

```tsx
{roundName && roundName.trim().length > 0 ? roundName : `Round ${roundNumber}`}
```

### Unit D — `LeaderboardTab`

In the Round Results render paths, pass `roundName={round.name}` to:
- the alt-shot/match-play `LeaderboardHeader`,
- `InProgressRoundLeaderboard`,
- both `RoundLeaderboard` usages (completed map + in-progress fallback).

## Non-goals

- No change to Review Scorecard or ViewRound headers (they don't pass `roundName`).
- No change to `RoundMetadata` / the leaderboard query (the name comes from `LeaderboardTab`'s
  round object, not the metadata).
- No schema/data change. No change to ordering, points, or which component renders.
- No change to the format pill behaviour (kept as-is).

## Testing

- **`LeaderboardHeader`** (extend/create its test): renders the round name when `roundName`
  is a non-empty string; falls back to `Round {roundNumber}` when `roundName` is null,
  undefined, or whitespace.
- **`InProgressRoundLeaderboard`**: a focused assertion that its header shows the name when
  `roundName` is passed (and `Round N` otherwise) — extend its existing test if present, else
  type-check + the `LeaderboardHeader` coverage is the safety net.
- Existing `LeaderboardTab` tests stay green (the round-leaderboard mocks ignore the new prop).
- Manual QA: competition Round Results shows each round's name + pill; an unnamed round shows
  `Round N`.

## Affected files

- `src/components/leaderboard/LeaderboardHeader.tsx` (Unit A, + test)
- `src/components/leaderboard/RoundLeaderboard.tsx` (Unit B)
- `src/components/leaderboard/InProgressRoundLeaderboard.tsx` (Unit C)
- `src/components/leaderboard/LeaderboardTab.tsx` (Unit D)

## Risks

- **Long names** could overflow the header — the existing title uses `ScaledText category="title"`; rely on its wrapping/scaling. Acceptable; revisit only if QA shows clipping.
- Three header components must stay consistent in the name-vs-number rule; the `roundName &&
  roundName.trim()` check is duplicated in `LeaderboardHeader` and `InProgressRoundLeaderboard`
  (two different header implementations) — kept inline for simplicity rather than a shared util.
