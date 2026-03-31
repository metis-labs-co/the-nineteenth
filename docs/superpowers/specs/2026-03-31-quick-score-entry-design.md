# Quick Score Entry for Admins & Organizers

## Context

There is currently no way to backfill a player's score after a round has been played. If a player forgets to enter their scores during the round, an organizer has no option to enter them on their behalf. This is particularly problematic for leagues where leaderboard accuracy depends on all rounds being recorded.

This feature adds two capabilities:
1. **Quick score entry from round view** — organizers and superadmins can enter/edit scores for any player in their rounds
2. **Quick add round from league details** — superadmins can create an entire round (course + scores) for a league member and have it tagged to the league in one flow

## Access Control

| Context | Superadmin | Competition Organizer | League Organizer | Player |
|---------|------------|----------------------|------------------|--------|
| Quick score entry (round) | Any round | Their competition rounds | — | — |
| Quick add round (league) | Any league | — | — | — |

- Superadmin detected via `useIsSuperAdmin()` / `isSuperAdmin` from subscription store
- Competition organizer detected via `competition.organizer_id === user.id`
- League quick-add is superadmin-only for now (may expand to league organizers later)

## Feature 1: Quick Score Entry (Round)

### Entry Point

From the round's player list in `ViewRoundScreen` (`src/screens/rounds/ViewRoundScreen/`), an "Enter Scores" action appears next to each player who:
- Has no scorecard yet (creates a new one)
- Has an incomplete or not-started scorecard (edits existing)

The action is only visible when `isSuperAdmin || isOrganizer`.

### Screen: `QuickScoreEntryScreen`

**Route**: `QuickScoreEntry`
**Params**: `{ roundId: string, playerId: string }`
**Location**: `src/screens/scoring/QuickScoreEntryScreen/`

### Layout (top to bottom)

1. **Header**: Player name, course name, round identifier
2. **Running totals bar**: Gross, Net, Stableford points — recalculates live as scores change
3. **Scrollable hole list**: All holes for the round (18, front 9, or back 9 based on `nine_type`), each row containing:
   - Hole number, par, stroke index
   - `−` / score / `+` stepper (same pattern as existing `PlayerScoreCard`)
   - Score circle color-coded by relation to par: birdie (blue), par (green), bogey (orange), double bogey+ (red)
   - Stableford points on the right
   - Empty holes shown with dashed border and placeholder
4. **Save button**: Fixed at bottom of screen
5. **Quick review modal**: On save tap, shows summary (total gross, net, points, holes entered count) with Confirm and Go Back actions

### Data Flow

1. **Load**:
   - Fetch round details: course holes (pars, stroke indexes), selected tee, `nine_type`, `game_type`
   - Fetch player profile: handicap index
   - Fetch existing scorecard if one exists (pre-populate stepper values)
   - Calculate strokes received per hole using existing handicap logic

2. **Entry**:
   - User taps `+`/`−` steppers to set strokes per hole
   - Running totals recalculate on each change using existing scoring algorithms
   - Local state only (no offline/SQLite persistence — admin is expected to be online)

3. **Save** (on confirm):
   - Build `Scorecard` object with `scores` JSONB in standard format: `{ "1": { strokes: 4 }, "2": { strokes: 5 }, ... }`
   - Calculate `total_gross`, `total_net`, `total_points` using existing algorithm functions from `src/services/rounds/roundResultsService.ts` or scoring utils
   - Capture handicap snapshot: `ga_handicap_used`, `daily_handicap_used`, `handicap_differential`, `course_rating_used`, `slope_rating_used`
   - Upsert to `scorecards` table via Supabase (insert if new, update if existing)
   - Set `status: 'completed'`, `submitted_by: currentUser.id`, `submitted_at: now()`
   - Invalidate React Query caches: round details, round leaderboard, competition leaderboard
   - Navigate back to round view

### Edge Cases

- **Existing scorecard with scores**: Pre-populate steppers with current values so admin can edit
- **Partial entry**: Allow saving with some holes empty — incomplete scorecards are valid
- **9-hole rounds**: Respect `nine_type` field — only show front 9, back 9, or full 18
- **No side-game processing**: Skins, wolf, scoring pairs, and mismatch detection are not triggered — this is a simple score backfill
- **No offline support**: This feature requires network connectivity

## Feature 2: Quick Add Round (League)

### Entry Point

"Add Round" button on `LeagueDetailScreen` (`src/screens/leagues/LeagueDetailScreen/`), visible only when `isSuperAdmin`.

### Flow (Wizard Steps)

All steps presented within a single screen or a simple step-through wizard:

1. **Select player**: Pick from existing league members (list with search/filter). League members only — if a player isn't a member, they must be added to the league separately first.

2. **Select course**: Full course search via GolfAPI.io, reusing existing `CourseSearch` component.

3. **Select tee**: Pick tee box from the selected course's available tees.

4. **Enter scores**: Same scrollable hole list with `+`/`−` steppers as `QuickScoreEntryScreen`. Course holes, pars, and stroke indexes loaded from the selected course/tee.

5. **Quick review + confirm**: Summary showing player, course, tee, total gross, net, points, handicap differential.

### Data Flow on Save

Creates three records in sequence:

1. **Standalone round**: Insert into `rounds` table with:
   - `user_id`: superadmin's ID (round creator)
   - `course_id`: selected course
   - `game_type`: 'stableford' (leagues use stableford for handicap differential calculation)
   - `selected_tee`: chosen tee box data
   - `date`: today by default, with optional date picker to backfill past rounds
   - `status`: 'completed'
   - `nine_type`: 'full' (18 holes only — leagues require full rounds for valid differentials)
   - `competition_id`: null (standalone)

2. **Scorecard**: Insert into `scorecards` table with:
   - `round_id`: the new round's ID
   - `player_id`: selected player
   - `scores`: entered hole-by-hole data in standard JSONB format
   - `total_gross`, `total_net`, `total_points`: calculated
   - `status`: 'completed'
   - `submitted_by`: superadmin's user ID
   - Handicap snapshot fields populated

3. **League round tag**: Insert into `league_rounds` table with:
   - `league_id`: current league
   - `scorecard_id`: the new scorecard's ID
   - `player_id`: selected player
   - `handicap_differential`: calculated from player's WHS handicap index + course/slope rating

After save:
- Invalidate league leaderboard, league stats, and player league rounds caches
- Navigate back to league detail screen

## Reusable Components & Utilities

These existing modules should be reused — not reimplemented:

| What | File | Usage |
|------|------|-------|
| Score color coding | `src/constants/theme.ts` (`colors.birdie`, `colors.par`, etc.) | Stepper circle colors |
| Handicap calculation | `src/services/` (handicap utils) | Strokes received per hole, daily handicap |
| Stableford points | Existing scoring algorithms | Points per hole calculation |
| Course search | Existing `CourseSearch` component | Course selection in league flow |
| Stepper UI pattern | `PlayerScoreCard` / `ScoreInputStepper` | Reference for +/− stepper design |
| Subscription checks | `useIsSuperAdmin()`, `useSubscriptionStore` | Permission gating |
| Organizer check | `competition.organizer_id === user.id` | Permission gating |

## What This Feature Does NOT Do

- No offline/SQLite persistence (online-only feature)
- No scoring pair or mismatch detection
- No skins or wolf game processing
- No putts, fairway, GIR, or penalty tracking (strokes only)
- No visual attribution on the scorecard (looks identical to player-entered scores)
- No team format support (individual scores only)
- No round creation from the competition context (competition rounds must use the existing flow)

## Verification

1. **Round quick entry (organizer)**:
   - As a competition organizer, navigate to a round in your competition
   - Verify "Enter Scores" action appears next to a player with no scorecard
   - Enter scores for all 18 holes, verify totals are correct
   - Confirm via review modal, verify scorecard appears in round and leaderboard updates

2. **Round quick entry (superadmin)**:
   - As superadmin, navigate to any round (not your competition)
   - Verify "Enter Scores" action is visible
   - Enter and save scores, verify leaderboard reflects changes

3. **Round quick entry (edit existing)**:
   - Navigate to a player who has a partial scorecard
   - Verify existing scores are pre-populated in steppers
   - Edit some scores, save, verify changes persist

4. **League quick add (superadmin)**:
   - From league detail, tap "Add Round"
   - Select a league member, search and select a course, pick a tee
   - Enter all 18 scores, review summary
   - Confirm, verify: round created, scorecard created, league leaderboard updated with new differential

5. **Permission checks**:
   - As a regular player, verify "Enter Scores" action is NOT visible
   - As a league organizer (non-superadmin), verify "Add Round" is NOT visible on league detail
   - As a competition organizer, verify action only appears on their own competition rounds

6. **9-hole rounds**:
   - On a front9/back9 round, verify only 9 holes are shown
   - Verify totals calculate correctly for 9 holes
