# Split Alt-Shot Leaderboard Reuse — Design

**Date:** 2026-06-27
**Status:** Approved (design), pending implementation plan
**Author:** Sam / Claude

## Problem

A **split alt-shot** round (`round_format === 'split'` and `game_type === 'alt-shot'` /
`team_format === 'alt-shot'`) has no leaderboard in two places:

1. **ViewRound screen** — no leaderboard tab at all (only a Sub-matches tab showing groups,
   no match status / Ryder-cup tally).
2. **Competition leaderboard** (`LeaderboardTab`) — the per-round leaderboard is **empty**
   while the round is in progress.

The scoring logic to render this already exists: `SubMatchLeaderboardTab` computes a live
per-sub-match leaderboard (match-play rows / net cards + Ryder-cup tally) directly from
`sub_matches` + scorecards. It is currently used only on the Review Scorecard screen and is
coupled to the live scoring store.

## Root cause (competition side)

`LeaderboardTab.tsx:467-499` renders in-progress rounds live only when
`!round.is_team_round && IN_PROGRESS_SUPPORTED_GAME_TYPES.has(gameType)` (the set is
`{stableford, stroke, par}`). A split alt-shot round is `is_team_round = true` **and**
`alt-shot`, so it fails both checks and falls back to `RoundLeaderboard`, which reads only
`round_results`. `round_results` is empty until the round is finalised → empty leaderboard.
(`RoundLeaderboard` / `useRoundLeaderboard` never compute live — `hooks/rounds/leaderboard.ts`.)

## Goals

1. ViewRound gets a **Leaderboard tab** for split alt-shot rounds, reusing the existing
   sub-match leaderboard, shown for both in-progress and completed rounds.
2. The **competition per-round leaderboard** renders the same live sub-match leaderboard for
   split alt-shot rounds (in-progress and completed), instead of the empty `RoundLeaderboard`.
3. No behaviour change to the Review Scorecard screen's existing leaderboard tab.

## Non-goals

- No change to **overall competition standings** aggregation (that reads `round_results` and
  rolls the round in once finalised, as today). This spec only fixes the **per-round**
  leaderboard display.
- No change to non-alt-shot split rounds (e.g. split match-play), nor to combined alt-shot.
- No schema change. `sub_matches`, scorecards, `useRoundDetails`, `useRoundScorecards`,
  `useRoundTeams` all already exist.

## Decisions (user, 2026-06-27)

- Round shape: **split alt-shot** (sub-matches).
- ViewRound placement: a new dedicated **Leaderboard tab**.
- When shown: **both in-progress and completed**, computed live from scorecards.
- Competition: live sub-match leaderboard for **both** states.
- Refactor shape: `SubMatchLeaderboardTab` takes a **required injected `getStrokes` prop**
  (remove the store coupling).
- Component location: **move `SubMatchLeaderboardTab` to `src/components/leaderboard/`**
  (shared), leave the math util `subMatchLeaderboard.ts` in place.

## Design

Three units with clear boundaries.

### Unit A — `SubMatchLeaderboardTab` (presentational, store-decoupled)

Move from `src/screens/scoring/ReviewScorecardScreen/components/SubMatchLeaderboardTab.tsx`
to `src/components/leaderboard/SubMatchLeaderboardTab.tsx`.

- Remove `import { useScorecardStore }` (line 8) and the `getPlayerScoreFromStore` selector
  (line 64) and the internal `getStrokes` `useMemo` (lines 68-75).
- Add a **required prop** `getStrokes: (playerId: string, holeNumber: number) => number | undefined`
  and use it directly where the internal `getStrokes` was used (lines 124, 140).
- Drop the now-unused `isSingleBallScore` import.
- Update its import of `../utils/subMatchLeaderboard` to the absolute alias
  `@/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard` (util stays put).

The component keeps fetching `useSubMatches(roundId)` and `useRoundTeams(...)` internally —
both are server-backed and work anywhere. Only the **score source** is now injected.

**Consumer:** the Review Scorecard screen (`ReviewScorecardScreen/index.tsx`) updates its
import path and passes a store-backed `getStrokes` built from the `getPlayerScore` it already
has:

```tsx
const getStrokes = useCallback(
  (playerId: string, hole: number): number | undefined => {
    const raw = getPlayerScore(playerId, hole);
    if (!raw) return undefined;
    return isSingleBallScore(raw) ? raw.strokes : raw.balls?.[0]?.strokes;
  },
  [getPlayerScore]
);
```

No other change to the Review screen; the live store path is preserved exactly.

### Unit B — `RoundSubMatchLeaderboard` (self-contained, server-backed)

New: `src/components/leaderboard/RoundSubMatchLeaderboard.tsx`. Given a `roundId`, it fetches
everything and renders Unit A. Drop-in anywhere with just a round id.

Props: `{ roundId: string; competitionId?: string | null; currentUserId?: string;
isRefreshing?: boolean; onRefresh?: () => void; bottomInset: number }`.

Data:
- `useRoundDetails(roundId)` → `course.holes` (Hole[]), `selected_tee` (TeeBox),
  `handicap_source`, `game_type`, `team_format`, `is_team_round`.
- `useRoundScorecards(roundId)` → `ScorecardWithPlayer[]` (includes in-progress), used to
  build a server `getStrokes`:

```tsx
const getStrokes = useCallback(
  (playerId: string, hole: number): number | undefined => {
    const sc = scorecards?.find((s) => s.player_id === playerId);
    const raw = sc?.scores?.[String(hole)];
    if (!raw) return undefined;
    return isSingleBallScore(raw) ? raw.strokes : raw.balls?.[0]?.strokes;
  },
  [scorecards]
);
```

Renders `<SubMatchLeaderboardTab roundId competitionId gameType={round.game_type}
teamFormat={round.team_format} holes={round.course?.holes ?? []} currentUserId
selectedTeeData={round.selected_tee} handicapSource={round.handicap_source}
getStrokes={getStrokes} isRefreshing={!!isRefreshing} onRefresh={onRefresh ?? noop}
bottomInset={bottomInset} />`. Shows the component's existing empty/loading states while data
loads.

### Unit C — mount points

**Shared detection helper** (avoid duplication) — add
`isSplitAltShotRound(round: { round_format?; game_type?; team_format? }): boolean` returning
`round.round_format === 'split' && (round.game_type === 'alt-shot' || round.team_format === 'alt-shot')`.
Location: `src/utils/roundFormat.ts` (new small util) or co-located with the leaderboard
components — implementation plan picks the lightest.

**C1 — ViewRound Leaderboard tab:**
- `ViewRoundScreen/types.ts`: add `'leaderboard'` to `TabKey`.
- `ViewRoundScreen/hooks/useViewRoundTabs.ts`: push `{ key: 'leaderboard', label: 'Leaderboard' }`
  when `isSplitAltShotRound(round)`.
- `ViewRoundScreen/index.tsx`: when `activeTab === 'leaderboard'`, render
  `<RoundSubMatchLeaderboard roundId={round.id} competitionId={competitionInfo?.id}
  currentUserId={currentUserId} isRefreshing={isRefreshing} onRefresh={onRefresh}
  bottomInset={insets.bottom} />`.

**C2 — Competition per-round leaderboard:**
- In `LeaderboardTab.tsx`, both the in-progress map (467-499) and the completed map (502-517):
  when `isSplitAltShotRound(round)` is true, render
  `<RoundSubMatchLeaderboard roundId={round.id} competitionId={competitionId}
  currentUserId={currentUserId} />` instead of `InProgressRoundLeaderboard` /
  `RoundLeaderboard`. Otherwise keep the existing branch unchanged.
- `competitionId` is available in `LeaderboardTab` (it renders a competition's board); if not
  directly in scope, thread it from the parent — implementation plan to confirm.

## Data flow

```
roundId
  ├─ useRoundDetails ──→ holes, selected_tee, handicap_source, game_type, team_format
  ├─ useRoundScorecards ──→ scorecards ──→ getStrokes(playerId, hole) → number
  └─ (inside SubMatchLeaderboardTab) useSubMatches, useRoundTeams ──→ sides + teams
        └─→ resolveSubMatchModel('alt-shot') → computeNetSubMatch → SubMatchNetCard + tally
```

Review screen keeps its own store-backed `getStrokes`; ViewRound and competition use the
server-backed `RoundSubMatchLeaderboard`. Same presentational component, two score sources.

## Error / edge handling

- No sub-matches yet → existing `EmptyState` in `SubMatchLeaderboardTab` ("No Sub-Matches").
- Round details / scorecards loading → component's existing loading (RefreshControl spinner);
  `RoundSubMatchLeaderboard` renders the tab with empty data until hooks resolve.
- Standalone round (no competitionId) on ViewRound → `useRoundTeams(undefined, true, roundId)`
  resolves teams from the round's `team_config` (already supported).
- Completed round → server scorecards are final → same computation yields the final
  sub-match leaderboard (no `round_results` dependency).

## Testing strategy

- **Unit A decoupling:** render `SubMatchLeaderboardTab` with a stub `getStrokes` and mocked
  `useSubMatches`/`useRoundTeams`; assert it renders sub-match rows + overall tally with **no**
  scorecard store present (proves store decoupling). The pure math stays covered by the
  existing `subMatchLeaderboard.ts` tests.
- **`isSplitAltShotRound` helper:** unit tests for split+alt-shot (game_type and team_format
  variants) true; combined / non-alt-shot / non-split false.
- **`RoundSubMatchLeaderboard`:** light render/smoke test mocking `useRoundDetails` +
  `useRoundScorecards` (+ the tab's hooks) to confirm it builds `getStrokes` and renders.
- **Manual QA (deferred):** split alt-shot round — (a) ViewRound Leaderboard tab shows live
  sub-match cards + tally in-progress and after completion; (b) competition per-round
  leaderboard shows the same instead of empty, both states; (c) Review screen leaderboard tab
  unchanged.

## Affected files

- Move + edit: `SubMatchLeaderboardTab.tsx` → `src/components/leaderboard/`.
- Edit: `src/screens/scoring/ReviewScorecardScreen/index.tsx` (import path + pass `getStrokes`).
- New: `src/components/leaderboard/RoundSubMatchLeaderboard.tsx`.
- New: `isSplitAltShotRound` helper (+ test).
- Edit: `ViewRoundScreen/types.ts`, `hooks/useViewRoundTabs.ts`, `index.tsx`.
- Edit: `src/components/leaderboard/LeaderboardTab.tsx`.
- Tests: Unit A render test, helper test, wrapper smoke test.

## Risks

- **Type compatibility:** `round.selected_tee` / `handicap_source` from `useRoundDetails`
  must satisfy `SubMatchLeaderboardTab`'s `TeeBox` / `HandicapSource` prop types — verify
  during implementation (they are the same `RoundWithCourse` types the Review path ultimately
  uses).
- **Util import smell:** the moved component imports the math util from a scoring-screen
  folder via `@/` alias (accepted trade-off; util left in place per decision).
- **Completed-round display change (competition):** split alt-shot completed rounds now show
  the live sub-match leaderboard instead of the `round_results` table — intended per the
  both-states decision; overall standings unaffected.
