# Mates This Week — Home Screen Section Design

**Date:** 2026-06-11
**Status:** Approved

## Summary

Replace the home screen's `FriendActivitySection` (card-based friend activity preview) with a ranked **"Mates this week"** leaderboard showing each friend's — and your own — best Stableford round submitted this week.

## Decisions

- **Ranking metric:** Best single-round Stableford score (`scorecards.total_points`) per player this week. One entry per player.
- **Include current user:** Yes — ranked alongside friends, row labelled "You" and visually highlighted.
- **Live in-progress rounds:** Out of scope for v1. Only `completed`/`confirmed` scorecards count.
- **Week definition:** Monday → Sunday of the current local week, compared against `rounds.date` (a local `YYYY-MM-DD` date string).
- **Data approach:** Client-side Supabase query (no new RPC/migration). RLS already permits reading friends' scorecards (precedent: `useFriendStats` in `src/hooks/friends/queries.ts`).

## Data Layer

### `getWeekRange()` — `src/utils/formatting.ts`

New utility returning `{ start, end }` as `YYYY-MM-DD` strings for Monday–Sunday of the current local week. Unit tested.

### `useMatesThisWeek()` — `src/hooks/home/useMatesThisWeek.ts`

- Inputs: friend IDs from existing `useFriends()` + current user ID.
- Query: `scorecards` select `player_id, total_points, round_id, rounds!inner(date)` where:
  - `player_id IN [me, ...friendIds]`
  - `status IN ('completed', 'confirmed')`
  - `rounds.date` between week start and end
- Aggregation (pure, exported for testing): reduce to best `total_points` per player (keep that round's `round_id` for tap-through), sort descending. Players with no qualifying round are omitted. Ties: equal points share the same sequential ordering (no tie indicator in v1); secondary sort by name for stable output.
- Output entry shape: `{ playerId, name, photoUrl, points, roundId, isCurrentUser }` (name/photo joined from the `useFriends()` cache and the current user's profile).
- `enabled` only when friends/user data is loaded. Standard TanStack Query key under a home/mates key factory.

## UI

### `MatesThisWeekSection` — `src/screens/home/components/MatesThisWeekSection.tsx`

Replaces `<FriendActivitySection />` in `src/screens/home/HomeScreen.tsx`.

- **Header:** existing `SectionHeader` — title "Mates this week", action "See all" → `Activity` screen (same target the old section used). Sub-caption beneath: "Stableford points · tap to view" in `colors.textSecondary`.
- **Rows:** new focused row component (existing leaderboard rows have no avatar column and competition-specific props). Each row: position number, `PlayerAvatar`, name ("You" for current user), sublabel ("Leading" for #1, "N behind" otherwise — N = leader's points minus player's points), right-aligned points. Current-user row highlighted using the same treatment `LeaderboardTable` applies (`colors.primaryLight`-style background).
- Styling reuses existing design tokens (`spacing`, `typography`, `borderRadius`, `shadows`) and `useThemeColors()` per the styling guide. Do not copy the reference screenshot's visual design.
- **Tap row:** navigate to that round's feed/detail screen (same navigation target the old `FriendActivitySection` cards used).
- **Empty state:** section renders nothing when no one (including you) has a submitted round this week. Loading/error: render nothing (no spinner on home).

## Cleanup

- Remove `FriendActivitySection` from `HomeScreen.tsx`.
- Delete `FriendActivitySection` and `useHomeActivityPreview` if no other consumers exist (verify before deleting; the full `Activity` screen and `useActivityFeed` are untouched).

## Testing

- Unit: `getWeekRange` (incl. Sunday edge — week starts Monday), best-round-per-player aggregation (multiple rounds, ties, empty input).
- Component: `MatesThisWeekSection` — renders ranked rows, "You" labelling/highlight, "Leading"/"N behind" sublabels, hidden when empty.

## Out of Scope

- Live in-progress round indicator.
- Dedicated "see all mates" leaderboard screen (See all goes to existing Activity screen).
- Server-side RPC aggregation (revisit if friend lists make the client query heavy).
