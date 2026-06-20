# Prominent Social Handicap Index on Home — Design

**Date:** 2026-06-20
**Status:** Approved

## Goal

Surface the player's Social Handicap Index prominently on the Home screen via a
tappable card that shows the index value and a compact trend graph, and deep-links
to the full `HandicapHistory` screen. Users whose tier does not include the
handicap-history feature see the card under the standard tier-lock overlay.

## Context (current state)

- **Data:** `useHandicapHistory(playerId)` (`src/hooks/useHandicapHistory.ts`,
  re-exported via `src/hooks/player`) returns a `HandicapSummary`
  (`handicapIndex`, `totalRounds`, `qualifyingRoundsCount`, `rounds[]`,
  `combinablePairs[]`). Index value formatted via `formatHandicapIndex`
  (`src/utils/displayHelpers`).
- **Full screen:** `HandicapHistoryScreen`
  (`src/screens/profile/HandicapHistoryScreen/index.tsx`), route `HandicapHistory`
  (`params: undefined`). On that screen the **index value is shown to all tiers**;
  only the trend chart + round history + combinable pairs are gated behind the
  `handicap_history` feature via `<FeatureLock>`.
- **Chart:** `HandicapTrendChart`
  (`src/screens/profile/HandicapHistoryScreen/components/HandicapTrendChart.tsx`)
  renders a `react-native-gifted-charts` `LineChart` with title, legend, axis
  labels, and card chrome. No compact mode today.
- **Home:** `HomeScreen.tsx` is a `ScrollView` of conditional sections fed by
  `useHomeData()` (`src/hooks/home/useHomeData.ts`). `useHomeData` does **not**
  currently fetch handicap history. Section order inside `styles.body`:
  NewUserFallback → in-progress carousel → `RoundTodayCard` →
  `PendingActionsSection` → `MatesThisWeekSection` → `BagSummarySection` →
  `UpcomingRoundsSection` → `HomeTileGrid`.
- **Gating:** `<FeatureLock feature="..." onUpgradePress={...}>` dims children and
  shows a lock overlay when the feature is not allowed.

## Decisions

- **Gating tier:** Reuse the existing `handicap_history` feature flag — one source
  of truth with the full history screen.
- **Placement:** Below active-round sections (after `RoundTodayCard`), before
  `PendingActionsSection`.
- **Mini graph:** Reuse `HandicapTrendChart` via a new compact variant (not a new
  sparkline) — single source of truth for the chart.
- **Empty state:** When there is no qualifying index yet, the card still renders
  with a "Play rounds to establish your index" prompt (no graph).
- **Whole-card gating:** The entire card (index + graph) sits under the tier
  overlay for users without access. Accepted minor inconsistency: a Free user can
  still see their bare index number on the history screen, but the richer Home card
  is overlaid. This matches the requested behaviour.

## Components & changes

### New: `HandicapHomeCard`
`src/screens/home/components/HandicapHomeCard.tsx`

- Props: `summary: HandicapSummary | null`, `onPress: () => void`.
- Full-width `TouchableOpacity` card (theme tokens, `surface` background, `shadows`).
- Content:
  - "Social Handicap Index" label + large value via `formatHandicapIndex`.
  - Subtitle line, e.g. `Best {qualifyingRoundsCount} of {totalRounds}`.
  - Compact `HandicapTrendChart` (variant `compact`) when `rounds.length >= 2`.
  - Chevron affordance indicating tap-through.
- Empty state (`handicapIndex == null` / `totalRounds === 0`): show "—" and prompt
  "Play rounds to establish your index"; no graph.
- `onPress` → navigate to `HandicapHistory`.

### Edit: `HandicapTrendChart`
Add `variant?: 'full' | 'compact'` (default `'full'`). Compact mode renders only
the curved line (`colors.primary`), height ~56px, no title/legend/axis labels/card
chrome. `rounds.length < 2` in compact mode renders nothing (the card shows its
empty prompt instead).

### Edit: `useHomeData`
- Call `useHandicapHistory(userId)`.
- Add `handicapSummary: HandicapSummary | null` to the `HomeData` interface and the
  returned object (existing `handicap: HandicapHighlight` is unchanged).
- Add its refetch to `refetchAll`.
- Add `handicapSummary: null` to the dev `forceNewUserHome` blank-state return.

### Edit: `HomeScreen`
- Render `<FeatureLock feature="handicap_history" onUpgradePress={() => navigation.navigate('Subscription')}><HandicapHomeCard summary={home.handicapSummary} onPress={() => navigation.navigate('HandicapHistory')} /></FeatureLock>`
  inside `styles.body`, after `RoundTodayCard` and before `PendingActionsSection`.

### Edit: `src/screens/home/components/index.ts`
Export `HandicapHomeCard`.

## Files touched

- New: `src/screens/home/components/HandicapHomeCard.tsx`
- Edit: `src/screens/profile/HandicapHistoryScreen/components/HandicapTrendChart.tsx`
- Edit: `src/hooks/home/useHomeData.ts`
- Edit: `src/screens/home/HomeScreen.tsx`
- Edit: `src/screens/home/components/index.ts`

## Out of scope / YAGNI

- No new data layer, no DB/migration changes.
- No 30-day delta indicator (already punted in `HandicapHighlight`).
- No changes to the gating logic of the existing `HandicapHistoryScreen`.

## Testing

- Unit: `useHomeData` exposes `handicapSummary` and includes its refetch; dev
  blank-state returns `null`.
- Component: `HandicapHomeCard` renders index, subtitle, and compact chart with
  data; renders empty prompt with no/`null` summary; `onPress` fires.
- Manual: verify on Home for a tier with `handicap_history` (card live) and a tier
  without (card dimmed under overlay; upgrade tap routes to `Subscription`); tap
  routes to `HandicapHistory`; light/dark themes.
