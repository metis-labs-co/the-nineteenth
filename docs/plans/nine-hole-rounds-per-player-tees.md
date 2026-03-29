# Plan: 9-Hole Rounds + Per-Player Tee Selection

## Context

Two bundled changes to the round system:

1. **9-hole rounds** (standalone only) - Players can play front 9 or back 9 at any course
2. **Per-player tee selection** (standalone + competitions) - Different players can play off different tees in the same round

Currently the app hardcodes 18 holes across ~5 layers (store, navigation, submission, side games, types) and assigns a single tee per round. These changes touch the database, wizard flow, scorecard store, scoring screens, handicap calculations, and side games.

---

## Design Decisions

- **`nine_type` column** on `rounds` table: `'full' | 'front9' | 'back9'` (default `'full'`). Captures both count and which holes.
- **`selected_tee` JSONB** added to `round_players` and `competition_players`. Null = use round default.
- **Keep `rounds.selected_tee`** as default/display tee. Per-player overrides live on the join tables.
- **Back 9 keeps real hole numbers** (10-18). No remapping. Scorecard keys stay real.
- **Dynamic bounds from `holes` array** everywhere. `HOLES_PER_ROUND = 18` stays as domain constant.
- **Wizard flow**: `Course → NineType → MatchType → Partners (inline tees) → BallCount → ScoringSetup`. Solo rounds keep the dedicated Tee step.
- **Scorecard store** gets `playerTeeMap: Map<string, TeeBox>` and `nineType: NineType`.

---

## Step 1: Database Migrations

**New migration file**

```sql
-- nine_type for 9-hole rounds
ALTER TABLE rounds ADD COLUMN nine_type TEXT NOT NULL DEFAULT 'full';
ALTER TABLE rounds ADD CONSTRAINT rounds_nine_type_check CHECK (nine_type IN ('full', 'front9', 'back9'));

-- per-player tee selection
ALTER TABLE round_players ADD COLUMN selected_tee JSONB;
ALTER TABLE competition_players ADD COLUMN selected_tee JSONB;
```

No data migration needed - null means "use round default", `'full'` covers all existing rounds.

---

## Step 2: Type Definitions

**`src/types/database/enums.ts`** - Add `NineType = 'full' | 'front9' | 'back9'`

**`src/types/database/round.types.ts`** - Add `nine_type: NineType` to `Round`, add `selected_tee: TeeBox | null` to `RoundPlayer`

**`src/types/database/competition.types.ts`** - Add `selected_tee: TeeBox | null` to `CompetitionPlayer`

**`src/constants/scoring.ts`** - Add helpers:
- `getHoleCount(nineType): number` → 18 or 9
- `getHoleRange(nineType): { start: number, end: number }` → bounds for iteration

**`src/screens/rounds/CreateRoundBottomSheet/types.ts`**:
- Add `'nineType'` to `WizardStep` union
- Add `nineType: NineType` to `WizardData` (default `'full'`)
- Add `selectedTee?: TeeBox` to `PlayingPartner`
- Add `nineType?: NineType` param to `onStartRound` callback

---

## Step 3: Scorecard Store - Per-Player Tees + Dynamic Holes

**`src/store/scorecardStore.ts`**:
- Add `playerTeeMap: Map<string, TeeBox>` and `nineType: NineType` to state
- Add `getPlayerTee(playerId): TeeBox | null` getter (checks playerTeeMap, falls back to selectedTeeData)
- `setCurrentHole` (line 142): Replace `hole >= 1 && hole <= 18` → validate against `holes` array
- `getCompletedHolesCount` (line 206): Replace `for h = 1..18` → iterate `holes` array

**`src/store/initializeRoundSlice.ts`**:
- Accept `playerTeeMap` and `nineType` in `initializeRound`
- `loadFromOffline` resume loop (line 151): Replace `h <= 18` → iterate stored `holes` array
- Set `currentHole` to `holes[0].number` (handles back 9 starting at hole 10)

---

## Step 4: Scoring Screen Navigation

**`src/screens/scoring/ScorecardEntryScreen/hooks/useScorecardNavigation.ts`**:
- Add `holes: Hole[]` to params
- Derive `firstHole = holes[0].number`, `lastHole = holes[holes.length - 1].number`
- Replace `currentHole > 1` → `> firstHole` and `currentHole < 18` → `< lastHole`

**`src/screens/scoring/ScorecardEntryScreen/hooks/useScorecardSubmission.ts`**:
- Replace `totalHoles: 18` and `completedCount < 18` → use `holes.length`

**`src/screens/scoring/ScorecardEntryScreen/index.tsx`**:
- Pass `holes` to `useScorecardNavigation`
- Pass `holes.length` to `SwipeableHoleNavigator`
- `playerHandicapMap`: use `playerTeeMap.get(player.id) || selectedTeeData` per player

**MatchPlay/TeamMatchPlay screens** - Same pattern: replace all hardcoded `18` with hole bounds from `safeHoles` array. Key files:
- `MatchPlayScoringScreen/index.tsx` - navigation bounds
- `MatchPlayScoringScreen/utils/matchPlayCalculations.ts` - `18 - holesPlayed`
- `MatchPlayScoringScreen/components/MatchPlayFooter.tsx` - `currentHole < 18`
- `hooks/scorecard/useMatchPlayScoring.ts` - loop `h <= 18`
- `TeamMatchPlayScoringScreen/` - same pattern

---

## Step 5: Side Games - Parameterize Hole Count

Add optional `totalHoles = HOLES_PER_ROUND` parameter to:

**Skins** (`src/utils/skins/`):
- `validation.ts`: `isSkinsGameComplete`, `getNextHoleNumber`
- `pot.ts`: `calculateHoleValue`, `calculateTotalPot`, `calculateBuyIn`

**Wolf** (`src/utils/wolf/`):
- `validation.ts`: `isWolfGameComplete`, `getNextHoleForDecision`
- `rotation.ts`: `getWolfRotationForRound`

For back 9, these also need awareness of hole range (start at 10 not 1). Use `getHoleRange(nineType)` utility.

---

## Step 6: Wizard - Nine Type Step

**New file: `src/screens/rounds/CreateRoundBottomSheet/steps/NineTypeStep.tsx`**
- 3 selectable cards: "Full 18 Holes", "Front 9 (Holes 1-9)", "Back 9 (Holes 10-18)"
- For 9-hole courses (`selectedCourse.holes?.length <= 9`): auto-select `'front9'`, skip step

**`src/screens/rounds/CreateRoundBottomSheet/hooks/useWizardTeeSelection.ts`**:
- After tee selection/skip → navigate to `'nineType'` instead of `'matchType'`

**`src/screens/rounds/CreateRoundBottomSheet/hooks/useWizardNavigation.ts`**:
- Add `handleBackToNineType` callback
- Update `handleBackToMatchType` → go to `'nineType'`
- Thread `nineType` through all `onStartRound` calls

**`src/screens/rounds/CreateRoundBottomSheet/index.tsx`** - Render `NineTypeStep`, update step indicator

---

## Step 7: Wizard - Per-Player Tee Inline Selection

**`src/screens/rounds/CreateRoundBottomSheet/steps/PartnersStep.tsx`**:
- Show current user at top of player list with inline tee picker (pill-style `TeeSelector`)
- Each partner row gets same inline tee picker below their name
- Props: `availableTees: TeeBox[]`, `defaultTee: TeeBox | null`
- Default tee pre-populates all players; individual overrides possible

**`src/screens/rounds/CreateRoundBottomSheet/hooks/useWizardPartners.ts`**:
- Add `handlePlayerTeeChange(playerId, tee)` → updates `selectedTee` on the `PlayingPartner`

**Solo rounds**: Keep existing `TeeSelectionStep` (no partners step to embed tees in)

---

## Step 8: Round Creation - Wire It Together

**`src/screens/rounds/RoundListScreen/hooks/useStartNewRound.ts`**:
- Accept `nineType` parameter
- Insert `nine_type` into round DB record
- Insert `selected_tee` per player into `round_players` records
- Filter holes by `nineType` before passing to store:
  - `'front9'` → `holes.filter(h => h.number <= 9)`
  - `'back9'` → `holes.filter(h => h.number >= 10)`
- Build `playerTeeMap` from partners' `selectedTee` fields
- Pass filtered holes + `playerTeeMap` + `nineType` to `initializeRound`

---

## Step 9: Competition Per-Player Tees

**`src/services/competitionPlayers/competitionPlayersService.ts`**:
- Add `updatePlayerTee(competitionId, playerId, tee)` function

**`src/screens/competitions/CompetitionSettingsScreen.tsx`**:
- Add "Player Tees" section - list of players with tee picker per player

**`src/services/api/competitions.ts`** (line ~180):
- Fix existing bug: pass `selected_tee` from round form data to round insert payload

**`src/hooks/scorecard/useRoundMetadata.ts`**:
- Fetch per-player tees from `round_players.selected_tee` or `competition_players.selected_tee`
- Build `playerTeeMap` and expose it

---

## Step 10: Handicap Calculations

**`src/hooks/usePlayingHandicap.ts`**:
- Already accepts per-call `selectedTeeData` - callers just pass per-player tee
- Add optional `nineType` param to use 9-hole slope/CR when available

**New utility: `getEffectiveTeeRatings(tee, nineType)`**:
- `'full'` → `{ slope: tee.slopeRating, cr: tee.courseRating }`
- `'front9'` → `{ slope: tee.slopeRatingFront9 ?? tee.slopeRating, cr: tee.courseRatingFront9 ?? tee.courseRating }`
- `'back9'` → same pattern with back9 fields

**`src/services/handicap/recalculateScorecardDifferential.ts`**:
- Look up per-player tee from `round_players`/`competition_players` instead of only `rounds.selected_tee`
- Use `nine_type` to apply 9-hole ratings

---

## Step 11: Display & Results

- **`src/components/rounds/RoundListCard/`** - Show "9 holes (Front 9)" / "Back 9" badge
- **`src/screens/rounds/ViewRoundScreen/hooks/useViewRoundPermissions.ts`** - Replace `scoredHoles.length >= 18` with dynamic count
- **`src/components/matchPlay/MatchPlayResultsCard.tsx`** - Iterate actual holes not 1-18
- **`src/components/skins/SkinsResultsCard/hooks/useSkinsResultRows.ts`** - Skip back 9 section for 9-hole rounds
- **`src/components/wolf/WolfResultsCard.tsx`** - Skip back 9 section for 9-hole rounds
- **`src/services/scoring/utils/leaderboardUtils.ts`** - Skip back-9 tiebreaker when < 18 scores
- **League tagging** (`src/services/api/leagues/mutations.ts` line 217) - Already rejects < 18 holes, no change needed

---

## Verification

1. **Front 9 round at 18-hole course** - Only holes 1-9 in scoring, nav stops at 9, submission works, handicap uses front9 ratings
2. **Back 9 round at 18-hole course** - Holes 10-18, scorecard keys "10"-"18", currentHole starts at 10, nav correct
3. **Full 18-hole round** - No regression, everything works as before
4. **Per-player tees (standalone)** - Two players with different tees get different daily handicaps
5. **Per-player tees (competition)** - Organizer assigns tees in settings, scoring uses correct per-player tee
6. **Skins/Wolf with 9 holes** - Pot calculations use 9, completion triggers correctly
7. **League tagging** - 9-hole rounds still rejected
8. **Offline resume** - Start back-9 round, close app, reopen → resumes on correct hole (10+)
9. **`pnpm type-check`** and **`pnpm test`** pass
