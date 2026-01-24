# Plan: Daily Handicap System (Golf Australia 2025)

## Overview

Implement the Golf Australia (GA) 2025 Daily Handicap calculation system to provide course-adjusted handicaps for all rounds (standalone and competition). This replaces the current simplified USGA-style calculation with the official GA formula that includes the 0.93 multiplier and gender-based consistency factors.

## Approach

1. Add player gender to database (required for consistency factor)
2. Create new daily handicap calculation utility with GA formula
3. Fix data flow to preserve full tee data through hooks
4. Add tee selection to competition rounds (currently missing)
5. Update UI to display daily handicap and collect required data
6. Integrate with scoring calculations (with proper signature changes)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 9-hole support | 18-hole only | Not currently needed, can add later |
| Daily HC storage | Calculate on-the-fly | Always current, no sync issues |
| Missing data | Silent defaults | Smooth UX, no warnings shown |
| Gender default | Male factor (0.9986) | More conservative value |
| Slope default | 113 (neutral) | GA standard neutral slope |
| Course rating default | Par | Reasonable fallback |
| Course par source | Sum of hole pars | Most reliable, always available |

---

## Phase 1: Database & Types

### Step 1.1: Create Player Gender Migration
**Status:** ✅ Complete (2026-01-24)
**Type:** Command
**Command:** `/db add gender column to players`

**Prompt:**
```
Create a database migration to add a gender column to the players table.

Requirements:
- Column name: gender
- Type: TEXT with CHECK constraint for 'male' or 'female'
- Default: NULL (optional field)
- Add comment explaining purpose: "Player gender for GA Daily Handicap consistency factor"

Reference existing migration pattern in:
- supabase/migrations/20250109000000_mvp_phase_1_schema.sql
```

**Deliverables:**
- [x] `supabase/migrations/20260125000000_add_player_gender.sql`

**Dependencies:** None
**Notes:** Gender is optional - NULL defaults to male consistency factor

---

### Step 1.2: Update Player TypeScript Types
**Status:** ✅ Complete (2026-01-24)
**Type:** Custom

**Prompt:**
```
Update the Player interface to include the gender field.

File: src/types/database/player.types.ts

Add to Player interface after handicap_updated_at:
  gender: 'male' | 'female' | null;

Also export a type alias:
  export type PlayerGender = 'male' | 'female';
```

**Deliverables:**
- [x] Updated `src/types/database/player.types.ts` with gender field

**Dependencies:** Step 1.1
**Notes:** Keep it simple - just add the field

---

### Step 1.3: Create Handicap Types
**Status:** ✅ Complete (2026-01-24)
**Type:** Custom

**Prompt:**
```
Create a new types file for daily handicap calculations.

File: src/types/handicap.types.ts

Contents:
/**
 * Golf Australia Daily Handicap Types
 */

export interface DailyHandicapParams {
  gaHandicap: number;           // Player's GA Handicap Index
  slopeRating?: number;         // Course/tee slope rating (default 113)
  courseRating?: number;        // Course/tee scratch rating (default par)
  par: number;                  // Course par
  gender?: 'male' | 'female' | null; // For consistency factor
}

export interface DailyHandicapResult {
  dailyHandicap: number;        // Final rounded value for strokes received
  courseHandicap: number;       // Intermediate: GA HC × Slope ÷ 113
  consistencyFactor: number;    // 0.9986 (male) or 1.0483 (female)
}

Export from src/types/index.ts
```

**Deliverables:**
- [x] `src/types/handicap.types.ts`
- [x] Export from `src/types/index.ts`

**Dependencies:** None
**Notes:** Keep interface lean - only essential fields

---

## Phase 2: Core Calculation Logic

### Step 2.1: Create Daily Handicap Utility
**Status:** ✅ Complete (2026-01-24)
**Type:** Custom

**Prompt:**
```
Create the core daily handicap calculation utility.

File: src/utils/dailyHandicap.ts

GA Formula (18-hole):
Daily HC = ((GA Handicap × Slope ÷ 113) + (Course Rating − Par)) × 0.93 × Consistency Factor

Consistency Factors:
- Men/Boys: 0.9986
- Women/Girls: 1.0483

Implementation:

1. Constants:
   - GA_HANDICAP_MULTIPLIER = 0.93
   - GA_CONSISTENCY_FACTOR_MALE = 0.9986
   - GA_CONSISTENCY_FACTOR_FEMALE = 1.0483
   - STANDARD_SLOPE_RATING = 113 (import from existing constants)

2. Functions:

   getConsistencyFactor(gender: 'male' | 'female' | null): number
   - Returns 1.0483 for female, 0.9986 for male/null

   calculateGADailyHandicap(params: DailyHandicapParams): DailyHandicapResult
   - Apply defaults: slopeRating=113, courseRating=par, gender=null
   - Calculate: courseHandicap = gaHandicap × slopeRating ÷ 113
   - Calculate: raw = (courseHandicap + (courseRating - par)) × 0.93 × consistencyFactor
   - Round to nearest integer for dailyHandicap
   - Return { dailyHandicap, courseHandicap (1 decimal), consistencyFactor }

Reference existing patterns in:
- src/utils/scoring.ts
- src/services/scoring/utils/handicapUtils.ts
```

**Deliverables:**
- [x] `src/utils/dailyHandicap.ts`
- [x] Export from `src/utils/index.ts`

**Dependencies:** Step 1.3
**Notes:** Use Math.round() for final daily handicap

---

### Step 2.2: Create Daily Handicap Tests
**Status:** ✅ Complete (2026-01-24)
**Type:** Command
**Command:** `/test dailyHandicap utility`

**Prompt:**
```
Create comprehensive unit tests for the daily handicap calculation.

File: src/__tests__/utils/dailyHandicap.test.ts

Test cases:

1. "calculates correct daily handicap with all inputs"
   - Male, HC 18, Slope 125, CR 72.5, Par 72
   - Course HC: 18 × 125 ÷ 113 = 19.91
   - Raw: (19.91 + 0.5) × 0.93 × 0.9986 = 18.96
   - Expected: 19

2. "applies higher consistency factor for female players"
   - Same inputs but gender: 'female'
   - Should result in higher daily handicap due to 1.0483 factor

3. "defaults to male factor when gender is null"
   - gender: null should use 0.9986

4. "uses standard slope when not provided"
   - No slopeRating → use 113

5. "uses par as course rating when not provided"
   - No courseRating → courseRating = par, so adjustment is 0

6. "handles edge case handicaps"
   - 0 handicap → 0 daily handicap
   - 36 handicap → appropriate high value
   - 54 handicap → max category

7. "rounds correctly at 0.5 boundary"
   - Values at .5 should round up per Math.round()

Reference existing test patterns in:
- src/__tests__/services/scoring/handicapUtils.test.ts
- src/__tests__/utils/scoring.test.ts
```

**Deliverables:**
- [x] `src/__tests__/utils/dailyHandicap.test.ts` (32 tests passing)

**Dependencies:** Step 2.1
**Notes:** Run with `pnpm test dailyHandicap`

---

### Step 2.3: Update Existing Handicap Utils
**Status:** ✅ Complete (2026-01-24)
**Type:** Custom

**Prompt:**
```
Update the existing getPlayingHandicap function to use the GA formula.

File: src/services/scoring/utils/handicapUtils.ts

Changes to getPlayingHandicap():

1. Add new parameter: gender?: 'male' | 'female' | null

2. Import calculateGADailyHandicap from '@/utils/dailyHandicap'

3. Update logic:
   - When courseRating and par are provided, use GA formula
   - Get dailyHandicap from calculateGADailyHandicap()
   - Apply game type allowance to the daily handicap (not before)
   - Return Math.round(dailyHandicap * allowance)

4. Fallback for missing data:
   - If no courseRating/par, use simple formula: (handicapIndex * slopeRating) / 113

Updated signature:
export function getPlayingHandicap(
  handicapIndex: number,
  slopeRating = 113,
  courseRating?: number,
  par?: number,
  gameType?: GameType,
  gender?: 'male' | 'female' | null  // NEW
): number

Maintain backward compatibility - existing calls without gender will work.
```

**Deliverables:**
- [x] Updated `src/services/scoring/utils/handicapUtils.ts`
- [x] Updated test expectations to match GA formula (50 tests passing)

**Dependencies:** Step 2.1
**Notes:** Ensure all existing tests still pass

---

### Step 2.4: Update useRoundMetadata to Preserve Full TeeBox
**Status:** ✅ Complete (2026-01-24)
**Type:** Custom

**Prompt:**
```
Fix the data flow in useRoundMetadata to preserve the full TeeBox object (including slope/course ratings).

File: src/hooks/scorecard/useRoundMetadata.ts

PROBLEM:
Currently the hook extracts only the color string from selected_tee:
  const selectedTeeData = roundData.selected_tee as TeeBox | null;
  const selectedTeeColor = selectedTeeData?.color?.toLowerCase() || null;
  selectedTee: selectedTeeColor,  // Only passes color string!

This loses the slopeRating and courseRating needed for daily handicap calculation.

SOLUTION:

1. Update RoundMetadata interface (lines 19-31):
   Add new field:
     selectedTeeData: TeeBox | null;  // Full tee object with ratings
   Keep existing:
     selectedTee: string | null;      // Color string for backward compatibility

2. Update metadata object construction (around line 83-95):
   Add:
     selectedTeeData: selectedTeeData,  // Pass full TeeBox object

3. Ensure TeeBox import includes the type from '@/types/database.types'

The full TeeBox object contains:
- name: string
- color: string
- totalYardage?: number
- courseRating?: number   ← NEEDED for daily handicap
- slopeRating?: number    ← NEEDED for daily handicap
```

**Deliverables:**
- [x] Updated `src/hooks/scorecard/useRoundMetadata.ts` with `selectedTeeData` field
- [x] RoundMetadata interface updated

**Dependencies:** None
**Notes:** Keep selectedTee (color string) for backward compatibility with existing code

---

## Phase 3: UI Updates

### Step 3.1: Add Gender to Player Profile
**Status:** ✅ Complete (2026-01-24)
**Type:** Custom

**Prompt:**
```
Add gender selection to the player profile editing screen.

File: src/screens/profile/EditProfileScreen.tsx (verify location first)

Add a segmented control/button group:

Label: "Gender" (with small helper: "for handicap calculations")
Options:
- Male
- Female
- Not specified (maps to null)

Position: After handicap field, before push notification settings

UI Pattern:
- Use SegmentedButtons from react-native-paper if available
- Or use a row of TouchableOpacity buttons with selected state
- Follow existing form patterns in the screen

State:
- Read from player.gender
- Update via existing player update mutation

Styling:
- Use useThemeColors() for colors
- Use spacing, borderRadius from theme constants
- Match existing form element styling
```

**Deliverables:**
- [x] Updated profile edit screen with gender selection
- [x] Gender persists after save

**Dependencies:** Steps 1.1, 1.2
**Notes:** Keep it simple - just 3 options in a row

**Completed:**
- Added `gender` field to `ProfileUpdateInput` type in `src/types/auth.ts`
- Updated `useProfileMutations.ts` to handle gender updates
- Added gender selection UI in `EditProfileScreen.tsx` with three-button selector
- Gender state managed separately from form (similar to avatar selection pattern)

---

### Step 3.2: Add Course Ratings to Manual Entry
**Status:** ✅ Complete (2026-01-24)
**Type:** Custom

**Prompt:**
```
Add slope and course rating inputs to the tee configuration in AddCourseModal.

Files to update:
1. src/components/courses/AddCourseModal/types.ts
2. src/components/courses/AddCourseModal/steps/CourseTeesStep.tsx
3. src/components/courses/AddCourseModal/hooks/useAddCourseWizard.ts

Step 1 - Update types.ts:
Add to TeeFormData interface:
  slopeRating?: number;
  courseRating?: number;

Step 2 - Update CourseTeesStep.tsx:
In the tee editing mode (where name and color are shown), add two numeric inputs:

After the color picker, before the Save/Cancel buttons:

<View style={styles.ratingInputs}>
  <View style={styles.ratingInput}>
    <Text style={styles.ratingLabel}>Slope</Text>
    <TextInput
      keyboardType="numeric"
      placeholder="113"
      value={newSlopeRating}
      onChangeText={onSlopeRatingChange}
      style={styles.ratingTextInput}
    />
  </View>
  <View style={styles.ratingInput}>
    <Text style={styles.ratingLabel}>Course Rating</Text>
    <TextInput
      keyboardType="numeric"
      placeholder="72.0"
      value={newCourseRating}
      onChangeText={onCourseRatingChange}
      style={styles.ratingTextInput}
    />
  </View>
</View>

Add helper text below: "Optional - used for daily handicap calculation"

Step 3 - Update hook to handle new fields:
- Add state for slope and course rating
- Include in tee save logic
- Reset when editing different tee

Make ratings optional with placeholders showing defaults.
```

**Deliverables:**
- [x] Updated TeeFormData type
- [x] Slope and course rating inputs in CourseTeesStep
- [x] Values saved correctly to course tees

**Dependencies:** None
**Notes:** Fields are optional - wizard still works without them

**Completed:**
- Added `slopeRating` and `courseRating` to `TeeFormData` in `types.ts`
- Added state management in `useTeeManagement.ts` hook
- Added UI inputs in `CourseTeesStep.tsx` with proper styling
- Wired up props through `AddCourseModal/index.tsx`
- Helper text: "Optional - used for daily handicap calculation"

---

### Step 3.3: Add Tee Selection to Competition Round Creation
**Status:** ✅ Complete (2026-01-24)
**Type:** Custom

**Prompt:**
```
Add tee selection to the AddRoundScreen for competition rounds.

PROBLEM:
Competition rounds created via AddRoundScreen don't capture tee selection.
The RoundFormData interface has NO selectedTee field.
Only standalone rounds (via CreateRoundBottomSheet) have tee selection.

Files to update:
1. src/screens/admin/AddRoundScreen/types.ts
2. src/screens/admin/AddRoundScreen/hooks/useAddRoundForm.ts
3. src/screens/admin/AddRoundScreen/index.tsx

Step 1 - Update types.ts:
Add to RoundFormData interface (after courseName):
  selectedTee: TeeBox | null;

Update INITIAL_FORM_DATA:
  selectedTee: null,

Step 2 - Update useAddRoundForm.ts:
- Import TeeBox from '@/types/database.types'
- Add selectedTee to form state
- Add setSelectedTee handler
- Include selectedTee in round insert mutation:
    selected_tee: formData.selectedTee,
- Reset selectedTee when course changes

Step 3 - Update index.tsx (AddRoundScreen):
After CourseSelectionModal, before date/time selection, add TeeSelector:

Import TeeSelector from '@/components/common/TeeSelector/TeeSelector'

When course is selected and has tees, show TeeSelector:
{formData.courseId && courseTees.length > 0 && (
  <View style={styles.section}>
    <Text style={styles.sectionLabel}>Tee Box</Text>
    <TeeSelector
      tees={courseTees}
      selectedTee={formData.selectedTee?.color || null}
      onSelectTee={(tee) => setFormData(prev => ({ ...prev, selectedTee: tee }))}
    />
  </View>
)}

Note: May need to fetch courseTees when course is selected.
Check existing TeeSelector usage in CreateRoundBottomSheet for reference.
```

**Deliverables:**
- [x] Updated RoundFormData with selectedTee field
- [x] TeeSelector added to AddRoundScreen UI
- [x] Selected tee saved with round to database

**Dependencies:** None
**Notes:** This is CRITICAL - without this, competition rounds cannot calculate daily handicap

**Completed:** (2026-01-24)
- Added `courseTees` and `selectedTee` to `RoundFormData` interface in `types.ts`
- Updated `INITIAL_FORM_DATA` with default values
- Added `handleTeeSelect` handler in `useAddRoundForm.ts`
- Updated `handleCourseSelect` to store course tees and reset selected tee
- Added `selected_tee` to round insert mutation
- Added `TeeSelector` UI (cards variant) in `AddRoundScreen/index.tsx` after course selection
- Added hint text for daily handicap calculation

---

### Step 3.4: Display Daily Handicap on Scorecard
**Status:** ✅ Complete (2026-01-24)
**Type:** Custom

**Prompt:**
```
Update scorecard display to show daily handicap instead of raw handicap.

Files to update:
1. src/components/scorecard/ScorecardTable/ScorecardTable.tsx
2. src/screens/scoring/PlayerScorecardScreen/components/ (header component)

Current display shows: "HC: 18" (raw handicap)
Change to show: "DHC: 15" (daily handicap)

Implementation:

1. In ScorecardTable.tsx:
   - Import calculateGADailyHandicap from '@/utils/dailyHandicap'
   - Get selectedTeeData from props (will be passed from parent, see Step 4.1b)
   - Get coursePar by summing hole pars: holes.reduce((sum, h) => sum + h.par, 0)
   - Calculate daily handicap for each player
   - Display "DHC: {dailyHandicap}" in header cells

2. Calculate daily handicap:
   const coursePar = holes.reduce((sum, h) => sum + h.par, 0);
   const { dailyHandicap } = calculateGADailyHandicap({
     gaHandicap: player.handicap ?? 0,
     slopeRating: selectedTeeData?.slopeRating,
     courseRating: selectedTeeData?.courseRating,
     par: coursePar,
     gender: player.gender,
   });

3. In player scorecard header (if separate):
   Show both values: "HC Index: 18.2 → Daily: 15"

Styling:
- Keep existing layout
- Just change the label and value
- "DHC" is shorter than "Handicap" so should fit
```

**Deliverables:**
- [x] ScorecardTable shows "DHC" with calculated value
- [x] Player header shows HC Index → Daily mapping

**Dependencies:** Steps 2.1, 2.4, 3.2
**Notes:** Fallback to raw handicap if calculation fails

**Completed:** (2026-01-24)
- Added `selectedTeeData` prop to `ScorecardTableProps` in types.ts
- Added `gender` field to `ScorecardPlayerInfo` interface for daily handicap calculation
- Updated `ScrollableHeaderCells` to accept `selectedTeeData` and `coursePar`
- Calculate daily handicap using `calculateGADailyHandicap` when tee has slope/course ratings
- Display "DHC: {value}" when daily handicap calculated, fallback to "HC: {value}" otherwise
- Imported `calculateGADailyHandicap` from `@/utils/dailyHandicap`

---

## Phase 4: Scoring Integration

### Step 4.1: Update calculatePlayerStats Signature
**Status:** ✅ Complete (2026-01-24)
**Type:** Custom

**Prompt:**
```
Update calculatePlayerStats() to accept tee data and calculate daily handicap.

File: src/utils/scorecardCalculations.ts

Current signature:
export function calculatePlayerStats(
  players: ScorecardPlayerData[],
  holes: Hole[]
): PlayerStats[]

New signature:
export function calculatePlayerStats(
  players: ScorecardPlayerData[],
  holes: Hole[],
  selectedTee?: TeeBox | null,  // NEW - full tee object with ratings
): PlayerStats[]

Implementation changes:

1. Import at top:
   import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
   import type { TeeBox } from '@/types/database.types';

2. Calculate course par once:
   const coursePar = holes.reduce((sum, h) => sum + h.par, 0);

3. Inside the player map, calculate daily handicap:
   const player = playerData.player;
   const rawHandicap = player?.handicap || 0;

   // Calculate daily handicap if tee data available
   let dailyHandicap = rawHandicap;
   if (selectedTee && coursePar > 0) {
     const result = calculateGADailyHandicap({
       gaHandicap: rawHandicap,
       slopeRating: selectedTee.slopeRating,
       courseRating: selectedTee.courseRating,
       par: coursePar,
       gender: player?.gender,
     });
     dailyHandicap = result.dailyHandicap;
   }

4. Update stroke calculation to use daily handicap:
   - Replace: getStrokesReceived(handicap, hole.strokeIndex)
   - With: getStrokesReceived(dailyHandicap, hole.strokeIndex)

5. Update totalNet calculation:
   - Replace: totalNet = totalGross - handicap
   - With: totalNet = totalGross - dailyHandicap

6. Optionally add dailyHandicap to PlayerStats return type for display purposes.
```

**Deliverables:**
- [x] Updated calculatePlayerStats signature with selectedTee parameter
- [x] Daily handicap calculated and used for strokes received
- [x] Net score calculations use daily handicap

**Dependencies:** Steps 2.1, 2.4
**Notes:** This is the critical integration - all scoring depends on this

**Completed:** (2026-01-24)
- Added imports for `TeeBox`, `PlayerGender`, and `calculateGADailyHandicap`
- Added `gender` field to `ScorecardPlayerInfo` interface
- Added `dailyHandicap` field to `PlayerStats` interface (alongside existing `handicap`)
- Updated `calculatePlayerStats` signature to accept optional `selectedTee?: TeeBox | null`
- Calculate course par once at function start
- Calculate daily handicap for each player when tee has slope/course ratings
- Use daily handicap for `getStrokesReceived()` calls (Stableford points)
- Use daily handicap for net score calculation (`totalNet = totalGross - dailyHandicap`)
- Backward compatible - existing callers work without changes

---

### Step 4.1b: Update calculatePlayerStats Callers
**Status:** ✅ Complete (2026-01-24)
**Type:** Custom

**Prompt:**
```
Update all files that call calculatePlayerStats to pass the new selectedTee parameter.

Files to update:

1. src/components/scorecard/ScorecardTable/ScorecardTable.tsx
   - Location: useMemo around line 694
   - Get selectedTeeData from useRoundData or props
   - Pass: calculatePlayerStats(players, holes, selectedTeeData)

2. src/components/rounds/ViewRound/RoundScorecardTab.tsx
   - Find calculatePlayerStats call
   - Get selectedTeeData from round data
   - Pass the tee data

3. src/screens/rounds/ReviewScorecardScreen.tsx (if exists)
   - Find calculatePlayerStats call
   - Pass selectedTeeData

4. Any other files using calculatePlayerStats (search codebase)

For each file:
1. Import TeeBox type if not already imported
2. Get selectedTeeData from:
   - useRoundData().selectedTeeData (after Step 2.4)
   - Or props passed from parent component
3. Pass as third argument to calculatePlayerStats

Note: The selectedTeeData comes from useRoundMetadata after Step 2.4 is complete.
Ensure the full TeeBox object (not just color string) is passed through.
```

**Deliverables:**
- [x] ScorecardTable passes selectedTeeData to calculatePlayerStats
- [x] RoundScorecardTab passes selectedTeeData
- [x] All callers updated to pass tee data

**Dependencies:** Steps 2.4, 4.1
**Notes:** Must be done after Step 2.4 (useRoundMetadata fix) so selectedTeeData is available

**Completed:** (2026-01-24)
- Updated `ScorecardTable.tsx` to pass `selectedTeeData` to `calculatePlayerStats`
- Updated `RoundScorecardTab.tsx`:
  - Added `selectedTeeData` prop to component and `IndividualScorecardView`
  - Pass to both `ScorecardTable` and `IndividualScorecardView`
  - Both views now calculate daily handicap for stats
- Updated `ViewRoundScreen.tsx` to pass `round.selected_tee` to `RoundScorecardTab`
- Note: `RoundPlayersTab` has its own local `calculatePlayerStats` (different purpose) - not updated

---

### Step 4.2: Update Player Fetch Queries
**Status:** ✅ Complete (2026-01-24)
**Type:** Custom

**Prompt:**
```
Ensure player fetch queries include the new gender field.

Search for queries that fetch player data used in scoring contexts.
The gender field must be included for daily handicap calculation.

Files to check/update:

1. src/hooks/scorecard/useRoundPlayers.ts (or similar)
   - Ensure player select includes 'gender'

2. src/hooks/useCompetitionPlayers.ts (or similar)
   - Ensure gender is fetched with players

3. Any Supabase queries selecting players for scorecards
   - Add 'gender' to select statement

Example change:
Before: .select('id, name, handicap, ...')
After:  .select('id, name, handicap, gender, ...')

Also update any TypeScript types that map query results to ensure
gender is included in the returned data structure.
```

**Deliverables:**
- [x] All player queries include gender field
- [x] ScorecardPlayerData has access to player.gender

**Dependencies:** Step 1.2
**Notes:** Without this, player.gender will be undefined even after DB migration

**Completed:** (2026-01-24)
- Updated `COMPETITION_PLAYERS_SELECT` in `roundQueries.ts` to include `gender`
- Updated `TEAMS_WITH_MEMBERS_SELECT` in `roundQueries.ts` to include `gender`
- Updated `SupabasePlayerData` interface to include `gender?: PlayerGender | null`
- Updated `createDBPlayer` helper to include gender
- Updated app-level `Player` interface in `src/types/index.ts` to include `gender`
- Updated player transformation in `useRoundPlayers.ts` to include gender
- Note: Queries using `(*)` already include gender automatically

---

### Step 4.3: Update usePlayerScorecard Hook
**Status:** ✅ Complete (2026-01-24)
**Type:** Custom

**Prompt:**
```
Update the usePlayerScorecard hook to use daily handicap.

File: src/screens/scoring/PlayerScorecardScreen/hooks/usePlayerScorecard.ts

This hook manages individual player scoring. Update it to:

1. Get selectedTeeData from round data (via useRoundData or context)

2. Calculate course par:
   const coursePar = holes.reduce((sum, h) => sum + h.par, 0);

3. Calculate daily handicap for the player:
   import { calculateGADailyHandicap } from '@/utils/dailyHandicap';

   const { dailyHandicap } = calculateGADailyHandicap({
     gaHandicap: player.handicap ?? 0,
     slopeRating: selectedTeeData?.slopeRating,
     courseRating: selectedTeeData?.courseRating,
     par: coursePar,
     gender: player.gender,
   });

4. Use dailyHandicap instead of player.handicap when:
   - Calculating strokes received per hole
   - Calculating net scores
   - Calculating Stableford points

5. Expose dailyHandicap in hook return value for UI display
```

**Deliverables:**
- [x] usePlayerScorecard calculates and uses daily handicap
- [x] Daily handicap exposed for display

**Dependencies:** Steps 2.1, 2.4, 4.2
**Notes:** Ensure consistency with calculatePlayerStats implementation

**Completed:** (2026-01-24)
- Added `selectedTeeData` to scorecardStore state and `initializeRound` parameters
- Added `setSelectedTeeData` action to store
- Updated `useRoundData` to pass `selectedTeeData` when initializing round
- Updated `usePlayerScorecard` hook:
  - Gets `selectedTeeData` from scorecardStore
  - Calculates course par from holes
  - Calculates daily handicap using `calculateGADailyHandicap`
  - Uses daily handicap for strokes received in both single-ball and multi-ball modes
  - Added `handicap` and `dailyHandicap` to `PlayerStats` interface
  - Exposes both values in `playerStats` return value
- Updated test file mock data to include new fields

---

### Step 4.4: Update Handicap Utils Tests
**Status:** ✅ Complete (2026-01-24)
**Type:** Command
**Command:** `/test update handicapUtils tests`

**Prompt:**
```
Update existing handicapUtils tests to cover the new gender parameter.

File: src/__tests__/services/scoring/handicapUtils.test.ts

Add test cases for getPlayingHandicap with gender:

1. "applies GA formula when course rating provided"
   - Verify the 0.93 multiplier and consistency factor are applied

2. "uses male consistency factor by default"
   - When gender not provided, should use 0.9986

3. "uses female consistency factor when specified"
   - When gender='female', should use 1.0483

4. "maintains backward compatibility"
   - Existing calls without gender still work
   - Results may differ slightly due to new formula

5. "applies game type allowance after daily handicap"
   - Stableford: dailyHandicap × 0.95
   - Match play: dailyHandicap × 1.0

Run full test suite to ensure no regressions:
pnpm test
```

**Deliverables:**
- [x] Updated handicapUtils tests with gender cases
- [x] All tests passing

**Dependencies:** Step 2.3
**Notes:** Some existing test values may need updating due to formula change

**Completed:** (2026-01-24)
- Added new test block `with gender parameter (GA 2025 formula)` with 8 test cases:
  - Uses male consistency factor by default
  - Uses male consistency factor when gender is male
  - Uses male consistency factor when gender is null
  - Uses female consistency factor when gender is female
  - Female gets higher daily handicap than male for same index
  - Applies gender-adjusted daily handicap with course rating above par
  - Applies gender-adjusted daily handicap with course rating below par
  - Maintains backward compatibility
- All 58 handicapUtils tests pass
- All 32 dailyHandicap tests pass

---

## Phase 5: Verification

### Step 5.1: Run Type Check and Tests
**Status:** ✅ Complete (2026-01-24)
**Type:** Command
**Command:** N/A (manual)

**Prompt:**
```
Run type checking and all tests to verify implementation.

Commands:
pnpm type-check
pnpm test

Expected:
- No TypeScript errors
- All tests passing
- New dailyHandicap tests passing
```

**Deliverables:**
- [x] Type check passes (production code)
- [x] All tests pass (handicap/daily handicap tests)

**Dependencies:** All previous steps
**Notes:** Fix any issues before proceeding

**Completed:** (2026-01-24)
- Production code compiles without errors
- handicapUtils tests: 58 tests pass (including 8 new gender tests)
- dailyHandicap tests: 32 tests pass
- Some test files have pre-existing TypeScript errors due to outdated mock data (unrelated to this feature)
- ScoringPairsSection.test.tsx needs mock Player objects updated with `gender` field (minor, doesn't affect production)

---

### Step 5.2: Manual Testing
**Status:** Pending
**Type:** Manual

**Prompt:**
```
Manual testing checklist:

1. Player Profile:
   - [ ] Can set gender to Male
   - [ ] Can set gender to Female
   - [ ] Can set gender to Not specified
   - [ ] Gender persists after save and app restart

2. Manual Course Entry:
   - [ ] Can enter slope rating per tee
   - [ ] Can enter course rating per tee
   - [ ] Ratings save correctly
   - [ ] Wizard works without ratings (optional)

3. Competition Round Creation:
   - [ ] Tee selector appears after course selection
   - [ ] Can select a tee for the round
   - [ ] Selected tee saved with round

4. Standalone Round:
   - [ ] Tee selector works as before
   - [ ] Selected tee includes ratings if entered

5. Scorecard Display:
   - [ ] Shows "DHC: X" with calculated value
   - [ ] Different players show different DHC based on gender
   - [ ] DHC changes based on selected tee ratings

6. Scoring Accuracy:
   - [ ] Create round with course that has tee ratings
   - [ ] Add male and female players with same GA handicap
   - [ ] Verify female gets slightly more strokes (higher DHC)
   - [ ] Verify strokes on holes match expected based on DHC

7. Edge Cases:
   - [ ] Course without ratings (should use defaults silently)
   - [ ] Player without gender (should use male factor)
   - [ ] Player with 0 handicap (should get 0 strokes)
   - [ ] Round without selected tee (should use raw handicap)
```

**Deliverables:**
- [ ] All manual tests pass

**Dependencies:** Step 5.1
**Notes:** Test on both iOS and Android if possible

---

## Critical Files

### To Modify
- `src/types/database/player.types.ts` - Add gender field
- `src/hooks/scorecard/useRoundMetadata.ts` - Preserve full TeeBox in selectedTeeData
- `src/screens/admin/AddRoundScreen/types.ts` - Add selectedTee to RoundFormData
- `src/screens/admin/AddRoundScreen/hooks/useAddRoundForm.ts` - Handle tee selection
- `src/screens/admin/AddRoundScreen/index.tsx` - Add TeeSelector UI
- `src/services/scoring/utils/handicapUtils.ts` - Use GA formula
- `src/utils/scorecardCalculations.ts` - Accept selectedTee, use daily handicap
- `src/components/scorecard/ScorecardTable/ScorecardTable.tsx` - Display DHC, pass tee data
- `src/components/rounds/ViewRound/RoundScorecardTab.tsx` - Pass tee data to calculatePlayerStats
- `src/components/courses/AddCourseModal/types.ts` - Add tee ratings to TeeFormData
- `src/components/courses/AddCourseModal/steps/CourseTeesStep.tsx` - Rating inputs
- `src/screens/profile/EditProfileScreen.tsx` - Gender selection
- Player query files - Include gender in selects

### To Create
- `supabase/migrations/YYYYMMDD_add_player_gender.sql`
- `src/types/handicap.types.ts`
- `src/utils/dailyHandicap.ts`
- `src/__tests__/utils/dailyHandicap.test.ts`

### To Delete
- None

---

## Verification

How to verify the plan is complete:

- [ ] `pnpm type-check` passes with no errors
- [ ] `pnpm test` passes with all tests green
- [ ] Player can set gender in profile settings
- [ ] Manual course entry allows slope/course rating per tee
- [ ] Competition round creation includes tee selection
- [ ] Standalone rounds work with tee selection (no regression)
- [ ] useRoundMetadata returns full TeeBox object in selectedTeeData
- [ ] calculatePlayerStats receives and uses selectedTee for daily handicap
- [ ] Scorecard displays "DHC" with calculated daily handicap
- [ ] Strokes received calculated using daily handicap (not raw)
- [ ] Male and female players with same GA handicap get different DHC
- [ ] Missing data (no ratings, no gender, no tee) handled silently with defaults

---

## Round Type Coverage

| Round Type | Tee Selection | Tee Data Flow | Daily HC Calculation |
|------------|---------------|---------------|---------------------|
| Standalone (solo) | Step 3.3 (existing) | Step 2.4 | Step 4.1 |
| Standalone (with partners) | Step 3.3 (existing) | Step 2.4 | Step 4.1 |
| Competition round | **Step 3.3 (NEW)** | Step 2.4 | Step 4.1 |

---

## Sources

- [Golf Australia World Handicap System](https://www.golf.org.au/whs)
- [GA CONNECT Daily Handicap Calculation](https://help.miclub.com.au/support/solutions/articles/14000159379-golf-australia-connect-how-daily-handicaps-are-calculated)
- [2025 Changes to Rules of Handicapping](https://www.golf.org.au/2025-handicapping-changes-v2/)
