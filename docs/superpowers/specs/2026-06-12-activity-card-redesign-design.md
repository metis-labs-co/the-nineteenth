# Activity Card Redesign — Design

**Date:** 2026-06-12
**Status:** Approved

## Goal

Restructure the activity feed card (`src/components/activity/ActivityRoundCard.tsx`) to match the new reference design: player-led header with score, course row, inset photo, and a footer with stacked participant avatars.

## Scope

Layout-only change to `ActivityRoundCard`. No changes to the data layer (`ActivityFeedCard` type, `useActivityFeed` hook) or to the screens that host the card (`ActivityScreen`, `RoundActivityScreen`) beyond what the card itself renders. Both screens pick up the new layout automatically since they share the component.

## Card structure (top to bottom)

### 1. Player header

- `PlayerAvatar` (~40px) for the **headline participant**.
- Headline participant selection: the signed-in viewer if they played in the round, otherwise the first participant (the friend whose activity it is).
- Name in bold, followed by a green outlined **YOU** pill when the headline participant's `player_id` matches the signed-in user.
- Subtitle: `played a round · 2d` — relative time derived from `activity_at` (m/h/d/w granularity).
- **Score top-right** in green: reuse the existing `participantScoreLabel` logic (`34 pts` for stableford; gross/net for stroke play). Hidden if the headline participant has no score.

### 2. Course row

- Flag icon inside a small rounded-square container.
- Club name in bold.
- Subtitle: `Mon 8 Jun · Hepburn Springs · VIC` — formatted `round_date` plus parsed `club_location`. Falls back gracefully when `club_location` is missing.
- The existing **Comp** pill remains on this row for competition rounds.

### 3. Photo

- Existing `RoundPhotoBanner` moves from the top of the card to below the course row.
- Inset with rounded corners (not full-bleed).
- Section collapses entirely when the round has no photos (current behavior preserved).

### 4. Competition link (unchanged)

- The "View competition leaderboard" row stays, between the photo and the footer.

### 5. Footer

- Left: like and comment buttons with counts (existing behavior unchanged).
- Right: **stacked overlapping avatars** of the remaining participants (everyone except the headline participant), capped at 4 with a `+N` overflow chip. This replaces the previous right-aligned chevron.
- Solo rounds render no footer avatars.
- Tapping the card still navigates to the round detail as today.

## Edge cases

- Solo round → no stacked avatars in footer.
- No photos → photo section collapses.
- Missing `club_location` → subtitle shows date (and course name fallback) only.
- Headline participant without a score → no top-right score.

## Theming & conventions

- `useThemeColors()` for all colors; static tokens (`spacing`, `typography`, `borderRadius`, `shadows`) imported from `@/constants/theme`.
- Touch targets ≥ 44px for interactive footer elements.

## Testing

- Update/extend existing `ActivityRoundCard` tests (if present) for: headline participant selection (viewer vs friend), YOU pill visibility, relative-time formatting, stacked avatar cap/overflow, and collapsed photo/footer states.
- Manual check of both `ActivityScreen` (feed) and `RoundActivityScreen` (detail) in light and dark themes.
