# Design: 9-Hole Rounds + Per-Player Tee Selection

## Problem

The app currently restricts all rounds to 18 holes and assigns a single tee per round. Players want to:

1. Play quick 9-hole practice rounds (front 9 or back 9) at any course
2. Play off different tees in the same round (e.g., men's vs women's tees)

## Scope

| Feature | Standalone | Competitions |
|---------|-----------|-------------|
| 9-hole rounds | Yes | No (future) |
| Per-player tees | Yes | Yes |

## Data Model

### New column: `rounds.nine_type`

```sql
ALTER TABLE rounds ADD COLUMN nine_type TEXT NOT NULL DEFAULT 'full';
ALTER TABLE rounds ADD CONSTRAINT rounds_nine_type_check
  CHECK (nine_type IN ('full', 'front9', 'back9'));
```

Values: `'full'` (18 holes), `'front9'` (holes 1-9), `'back9'` (holes 10-18). Default `'full'` ensures backward compatibility.

### New column: `round_players.selected_tee`

```sql
ALTER TABLE round_players ADD COLUMN selected_tee JSONB;
```

Per-player tee for standalone rounds. Null means use the round's default tee (`rounds.selected_tee`).

### New column: `competition_players.selected_tee`

```sql
ALTER TABLE competition_players ADD COLUMN selected_tee JSONB;
```

Player's default tee across a competition. Null means use the round's default tee.

### New table: `competition_round_player_tees`

```sql
CREATE TABLE competition_round_player_tees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  selected_tee JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(round_id, player_id)
);
```

Per-round tee override for competition players. Takes precedence over `competition_players.selected_tee`.

RLS policies:
- **SELECT**: Viewable by competition members (via round → competition join) and the round's competition organizer
- **INSERT/UPDATE/DELETE**: Only the competition organizer (created_by on the parent competition)

### Tee Resolution Order

For any player in any round, resolve their tee by checking (first non-null wins):

1. **Standalone rounds**: `round_players.selected_tee` → `rounds.selected_tee`
2. **Competition rounds**: `competition_round_player_tees.selected_tee` → `competition_players.selected_tee` → `rounds.selected_tee`

### Type: `NineType`

```typescript
type NineType = 'full' | 'front9' | 'back9';
```

Added to `Round` interface as `nine_type: NineType`.

## Wizard Flows (Standalone Rounds)

### Group Rounds (1+ partners)

```
Course → Nine Type → Match Type → Partners (inline tee pickers) → Scoring Setup
```

- **Nine Type step**: Three selectable cards — "Full 18", "Front 9 (1-9)", "Back 9 (10-18)". Auto-skipped for 9-hole courses (auto-selects `'front9'`).
- **Partners step**: Current user shown at top with inline tee picker (pill-style buttons for each available tee). Each added partner also gets an inline tee picker. All partners default to the creator's selected tee. Individual override by tapping a different pill.
- **No tees available**: Tee picker hidden. Players use base handicap (no daily HC). Matches current behavior.

### Solo Rounds (no partners)

```
Course → Nine Type → Match Type → Your Setup (tee + ball count)
```

- **Your Setup step**: Replaces the old dedicated Tee step and Ball Count step. Shows the user's player card with inline tee picker and ball count selector (if Social tier+).
- Same pattern as group rounds — you always pick your tee on a player card.
- **Skip condition**: If no tees available AND not Social tier (no ball count), skip this step entirely and start scoring immediately after Match Type.

### Old Tee Step

Removed entirely. Tee selection is always inline on player cards.

## Competition Per-Player Tees

### Competition Settings Screen

New "Player Tees" section showing all competition players with a tee picker per player. A round/course selector at the top lets the organizer choose which round's course tees to show (defaults to first upcoming round). Updates `competition_players.selected_tee`. Since the default tee is competition-wide, it's most useful when all rounds share the same course. For multi-course competitions, per-round overrides handle the differences.

### Per-Round Override

On each round's detail screen (organizer view), a "Player Tees" section allows per-round overrides. These are stored in `competition_round_player_tees` and take precedence over the competition-level default.

### Existing Bug Fix

The competition creation API (`services/api/competitions.ts` ~line 180) currently does not pass `selected_tee` from the round form to the round insert. This is fixed as part of this work.

## Scoring Engine Changes

### Dynamic Hole Bounds

All hardcoded `18` references in scoring navigation, completion checks, and submission logic are replaced with dynamic bounds derived from the `holes` array in the scorecard store.

**Scorecard store** (`store/scorecardStore.ts`):
- `setCurrentHole`: Validates against actual `holes` array instead of `1 <= hole <= 18`
- `getCompletedHolesCount`: Iterates `holes` array instead of `1..18` loop
- New state: `playerTeeMap: Map<string, TeeBox>`, `nineType: NineType`
- New getter: `getPlayerTee(playerId)` — checks `playerTeeMap`, falls back to `selectedTeeData`

**Initialize round** (`store/initializeRoundSlice.ts`):
- Accepts `playerTeeMap` and `nineType`
- Resume loop iterates stored `holes` array (not 1..18)
- Sets `currentHole` to `holes[0].number` (handles back 9 starting at hole 10)

**Hole filtering on round creation** (`useStartNewRound.ts`):
- `'front9'` → `holes.filter(h => h.number <= 9)`
- `'back9'` → `holes.filter(h => h.number >= 10)`
- `'full'` → all holes (no change)

### Navigation

**`useScorecardNavigation`**: Derives `firstHole` and `lastHole` from the `holes` array. Navigation bounds use these instead of hardcoded 1 and 18.

**`useScorecardSubmission`**: Completion check uses `holes.length` instead of 18.

**MatchPlay/TeamMatchPlay screens**: Same pattern — all `< 18` bounds replaced with dynamic last hole.

### Back 9 Hole Numbering

Back 9 holes keep their real numbers (10-18). Scorecard keys are `"10"`, `"11"`, etc. No remapping. The `SwipeableHoleNavigator` and all navigation logic works with the actual hole numbers from the `holes` array.

## Handicap Calculations

### Per-Player Tee in Handicap

`ScorecardEntryScreen` pre-computes `playerHandicapMap` by iterating all players. Currently uses a single `selectedTeeData` for everyone. Changed to: `playerTeeMap.get(playerId) || selectedTeeData`.

`usePlayingHandicap` already accepts `selectedTeeData` per call — callers just pass the player-specific tee.

### 9-Hole Ratings

The tees table already has `slope_front9`, `slope_back9`, `course_rating_front9`, `course_rating_back9`. New utility:

```typescript
function getEffectiveTeeRatings(tee: TeeBox, nineType: NineType) {
  if (nineType === 'front9') return { slope: tee.slopeRatingFront9 ?? tee.slopeRating, cr: tee.courseRatingFront9 ?? tee.courseRating };
  if (nineType === 'back9') return { slope: tee.slopeRatingBack9 ?? tee.slopeRating, cr: tee.courseRatingBack9 ?? tee.courseRating };
  return { slope: tee.slopeRating, cr: tee.courseRating };
}
```

Falls back to full-round ratings when 9-hole ratings are unavailable.

Course par for daily handicap is computed from the filtered `holes` array, so it naturally reflects 9-hole par.

## Side Games

Skins and Wolf are both available on 9-hole rounds. All functions that use `HOLES_PER_ROUND` get an optional `totalHoles` parameter (default 18):

- `isSkinsGameComplete(results, totalHoles?)`
- `getNextHoleNumber(results, totalHoles?)`
- `calculateHoleValue(potType, potValue, totalHoles?)`
- `calculateTotalPot(potType, potValue, totalHoles?)`
- `isWolfGameComplete(decisions, totalHoles?)`
- `getNextHoleForDecision(decisions, totalHoles?)`
- `getWolfRotationForRound(wolfOrder, totalHoles?)`

For back 9 rounds, functions also need the hole range (start at 10 not 1). A `getHoleRange(nineType)` utility provides `{ start, end }` bounds.

## Scorecard Display

### Tee Indicator

When players in the same group are on different tees, a colored dot (matching the tee color) appears next to each player's name in:
- Scorecard entry screen (player rows)
- Review scorecard screen
- Leaderboard entries
- Round details / results

The dot only appears when players have different tees. If everyone is on the same tee, no dots shown (avoids visual noise).

### 9-Hole Display

- `RoundListCard`: Shows "Front 9" or "Back 9" badge for 9-hole rounds
- `ScorecardTable`: Already filters by `holes.length` — naturally shows only the relevant 9 holes
- Back-9 tiebreaker in leaderboard: Skipped when fewer than 18 scores
- League tagging: Already rejects `< 18` holes — no change needed

## Constants & Utilities

`HOLES_PER_ROUND = 18` remains as a domain constant. New helpers in `src/constants/scoring.ts`:

```typescript
function getHoleCount(nineType: NineType): number
function getHoleRange(nineType: NineType): { start: number; end: number }
```

## What's NOT Changing

- Competition rounds stay 18 holes only (9-hole competitions deferred)
- `Hole.number` type union (1-18) stays the same — both nines fit within it
- `HOLES_PER_ROUND` constant stays at 18
- Offline SQLite schema (holes table has no 1-18 constraint)
- League tagging rejection for < 18 holes
