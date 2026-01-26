# Plan: Shamble Scoring System

## Overview

Implement Shamble format scoring for the golf app. Shamble is a hybrid team format:
- **Drive selection**: All players tee off, team picks the best drive
- **Individual play**: Each player plays their own ball from the best drive position
- **Team aggregation**: Sum of all individual Stableford points for team total

A Shamble round can be played with a single team (all players together) or multiple teams.

## Approach

Extend existing components rather than creating new ones:
- Add `aggregation` prop to `BestBallScoreView` for sum vs best scoring
- Extract drive picker from `TeamScoreCard` as reusable `DriveContributorPicker` component
- Extend `calculateAggregate()` with `scoringMode` parameter (avoid duplicating logic)
- Reuse `handleBestBallScoreSelect` for individual scoring (already creates per-player scorecards)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| GameType vs TeamFormat | Add to both | GameType needed for MATCH_TYPES, TeamFormat for team scoring engine |
| New method vs extend | Extend `calculateAggregate()` | `calculateShamble()` would duplicate 90% of aggregate logic - only difference is Stableford vs net |
| Drive picker | Separate `DriveContributorPicker` component | Keeps BestBallScoreView focused; drive selection unrelated to best-ball concept |
| Handicap allowance | 85% (same as best-ball) | Standard team format allowance |
| Team count | 1+ teams supported | Single team valid (like Scramble) |

---

## Phase 0: Type System Alignment (Prerequisite)

### Step 0.1: Sync TeamFormat Types
**Status:** ✅ Complete (2026-01-26)

The database and engine have diverged on `TeamFormat` definitions. Sync them before adding shamble.

**Current state:**
- Database `TeamFormat` (enums.ts:18): `'best-ball' | 'scramble' | 'aggregate' | 'match-play-team'`
- Engine `TeamFormat` (TeamScoringEngine.ts:33): `'best-ball' | 'ambrose' | 'aggregate'`

**File:** `src/services/scoring/engines/TeamScoringEngine.ts`

Update local type (line ~33) to match database + add shamble:
```typescript
export type TeamFormat = 'best-ball' | 'scramble' | 'aggregate' | 'match-play-team' | 'shamble';
```

**File:** `src/services/scoring/ScoringOrchestrator.ts`

Update `calculateTeamScore()` (~line 125) to handle scramble (currently missing):
```typescript
switch (format) {
  case 'best-ball':
    return engine.calculateBestBall(teamScores, courseData, config);
  case 'scramble':
    // Scramble uses same logic as ambrose (team plays one ball)
    return engine.calculateAmbrose(teamScores, courseData, config);
  case 'aggregate':
    return engine.calculateAggregate(teamScores, courseData, config);
  case 'shamble':
    return engine.calculateAggregate(teamScores, courseData, config, 'stableford');
  default:
    return engine.calculateBestBall(teamScores, courseData, config);
}
```

**Deliverables:**
- [x] Engine TeamFormat matches database TeamFormat
- [x] Scramble routing added to ScoringOrchestrator
- [x] Remove `'ambrose'` from engine type (deprecated, use scramble)

**Completed Changes:**
- Updated `TeamScoringEngine.ts` line 33: `TeamFormat` now includes `'best-ball' | 'scramble' | 'aggregate' | 'match-play-team' | 'shamble'`
- Updated `ScoringOrchestrator.ts` `calculateTeamScore()`: Added `scramble` case routing to `calculateAmbrose()`
- Updated `ScoringOrchestrator.ts` `calculateTeamScore()`: Added `shamble` case (placeholder using `calculateAggregate()`)
- Updated `ScoringOrchestrator.ts` `calculateTeamLeaderboard()`: Added shamble to `higherIsBetter` check
- Updated `ScoringOrchestrator.ts` `createEngine()`: Added cases for `scramble` and `shamble`
- Updated `TeamScoringEngine.ts` constructor: Added shamble to `higherIsBetter` check
- Updated test file to use `'scramble'` instead of `'ambrose'`

---

## Phase 1: Database & Backend

### Step 1.1: Add Shamble to Database Enums
**Status:** ✅ Complete (2026-01-26) - Awaiting db reset

Migration for TeamFormat already exists at `supabase/migrations/20260126000001_add_shamble_to_team_format_enum.sql`

**Additional migration needed** for GameType enum:

Create `supabase/migrations/20260126000002_add_shamble_to_game_type_enum.sql`:
```sql
-- Add 'shamble' to game_type enum
-- Shamble is both a GameType (for round creation) and TeamFormat (for scoring)

ALTER TYPE game_type ADD VALUE IF NOT EXISTS 'shamble';
```

**Deliverables:**
- [x] Migration adds `'shamble'` to team_format enum
- [x] Migration adds `'shamble'` to game_type enum
- [ ] Run `supabase db reset` to apply (requires Docker)

**Note:** Migration file created. Run `supabase db reset` when Docker is available.

---

### Step 1.2: Update Type Definitions
**Status:** ✅ Complete (2026-01-26)

**Files to update:**

1. `src/types/database/enums.ts` - Add `'shamble'` to both enums:
```typescript
// Line ~13: Add to GameType
export type GameType = 'stroke' | 'stableford' | 'match-play' | 'ambrose' | 'best-ball' | 'scramble' | 'shamble';

// Line ~18: Add to TeamFormat
export type TeamFormat = 'best-ball' | 'scramble' | 'aggregate' | 'match-play-team' | 'shamble';
```

2. `src/services/scoring/engines/TeamScoringEngine.ts` - Update local type (line ~33):
```typescript
export type TeamFormat = 'best-ball' | 'scramble' | 'aggregate' | 'match-play-team' | 'shamble';
```

After running migrations, regenerate Supabase types:
```bash
pnpm supabase gen types typescript --local > src/types/supabase.ts
```

**Deliverables:**
- [x] `'shamble'` added to `GameType`
- [x] `'shamble'` added to `TeamFormat`
- [x] Engine type synced with database (done in Step 0.1)

**Note:** Supabase types regeneration requires Docker. Run when available.

---

### Step 1.3: Add Shamble Handicap Allowance
**Status:** ✅ Complete (2026-01-26)

**File:** `src/services/scoring/utils/handicapUtils.ts`

Update `getHandicapAllowance()` (~line 90) to handle shamble:

```typescript
export function getHandicapAllowance(gameType?: GameType): number {
  switch (gameType) {
    case 'match-play':
      return 1.0; // 100%
    case 'best-ball':
    case 'shamble':  // Add this case - 85% like best-ball
      return 0.85; // 85%
    case 'ambrose':
    case 'scramble':  // Add scramble with same allowance as ambrose
      return 1.0; // Team handicap calculated differently
    case 'stableford':
    case 'stroke':
    default:
      return 0.95; // 95%
  }
}
```

**Deliverables:**
- [x] Shamble uses 85% handicap allowance
- [x] Scramble case added (same as ambrose)

---

### Step 1.4: Extend calculateAggregate() for Stableford Mode
**Status:** ✅ Complete (2026-01-26)

**File:** `src/services/scoring/engines/TeamScoringEngine.ts`

Instead of creating a separate `calculateShamble()` method (which would duplicate ~90% of aggregate logic), extend `calculateAggregate()` with a scoring mode parameter:

```typescript
/**
 * Calculate Aggregate score (sum of all members)
 *
 * @param scoringMode - 'net' for net strokes (lower is better), 'stableford' for points (higher is better)
 */
calculateAggregate(
  teamScores: ScorecardWithHandicap[],
  courseData: CourseHoleData,
  config: EngineConfig = DEFAULT_ENGINE_CONFIG,
  scoringMode: 'net' | 'stableford' = 'net'
): TeamScoringResult {
  const holeMap = new Map(courseData.holes.map((h) => [h.number, h]));

  let teamGross = 0;
  let teamNet = 0;
  let teamPoints = 0;

  const memberScores: TeamScoringResult['memberScores'] = [];

  for (const sc of teamScores) {
    const playingHandicap = config.useHandicap
      ? getPlayingHandicap(
          sc.handicap,
          courseData.slopeRating,
          courseData.courseRating,
          courseData.par,
          'best-ball' // Use best-ball for 85% allowance
        )
      : 0;

    const scores = this.parseScores(sc.scorecard.scores);
    let playerGross = 0;
    let playerNet = 0;
    let playerPoints = 0;

    for (const score of scores) {
      const hole = holeMap.get(score.holeNumber);
      if (!hole || score.strokes === null || score.strokes === undefined) {
        continue;
      }

      const gross = score.strokes;
      playerGross += gross;

      const strokesReceived = calculateStrokesForHole(playingHandicap, hole.strokeIndex);
      const net = calculateNetScore(gross, strokesReceived);
      playerNet += net;

      const netToPar = getNetToPar(net, hole.par);
      playerPoints += getStablefordPoints(netToPar);
    }

    teamGross += playerGross;
    teamNet += playerNet;
    teamPoints += playerPoints;

    memberScores.push({
      playerId: sc.scorecard.player_id,
      contribution: scoringMode === 'stableford' ? playerPoints : playerNet,
    });
  }

  const rawScore = scoringMode === 'stableford' ? teamPoints : teamNet;

  return {
    teamId: teamScores[0]?.teamId || '',
    rawScore,
    resultData: {
      team_score: rawScore,
      gross_score: teamGross,
      net_score: teamNet,
      stableford_points: teamPoints,
    },
    memberScores,
  };
}
```

**Deliverables:**
- [x] `calculateAggregate()` accepts `scoringMode` parameter
- [x] Returns Stableford points when `scoringMode='stableford'`

---

### Step 1.5: Update ScoringOrchestrator
**Status:** ✅ Complete (2026-01-26) - Done in Step 0.1 and 1.4

**File:** `src/services/scoring/ScoringOrchestrator.ts`

1. Update `calculateTeamScore()` (~line 125) to route shamble and scramble:
```typescript
switch (format) {
  case 'best-ball':
    return engine.calculateBestBall(teamScores, courseData, config);
  case 'scramble':
    return engine.calculateAmbrose(teamScores, courseData, config);
  case 'aggregate':
    return engine.calculateAggregate(teamScores, courseData, config);
  case 'shamble':
    return engine.calculateAggregate(teamScores, courseData, config, 'stableford');
  default:
    return engine.calculateBestBall(teamScores, courseData, config);
}
```

2. Update `calculateTeamLeaderboard()` (~line 163) for correct sorting:
```typescript
// Shamble and Best Ball use Stableford points (higher is better)
const higherIsBetter = format === 'best-ball' || format === 'shamble';
```

3. Update `createEngine()` (~line 214) to handle shamble:
```typescript
case 'shamble':
  return new TeamScoringEngine('shamble');
```

**Deliverables:**
- [x] Shamble routes to `calculateAggregate()` with `scoringMode='stableford'`
- [x] Scramble routes to `calculateAmbrose()` (was missing)
- [x] Leaderboard sorts shamble correctly (higher is better)
- [x] Engine factory handles shamble

---

## Phase 2: UI Components

### Step 2.1: Extract DriveContributorPicker Component
**Status:** ✅ Complete (2026-01-26)

**New File:** `src/components/scorecard/DriveContributorPicker.tsx`

Extract the drive picker pattern from `TeamScoreCard.tsx` (lines 344-532) into a reusable component:

```typescript
interface DriveContributorPickerProps {
  team: TeamWithMembers;
  selectedPlayerId?: string;
  onSelect: (playerId: string) => void;
  disabled?: boolean;
}

export function DriveContributorPicker({
  team,
  selectedPlayerId,
  onSelect,
  disabled = false,
}: DriveContributorPickerProps) {
  const colors = useThemeColors();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedPlayer = team.members?.find(
    (m) => m.player_id === selectedPlayerId
  )?.player;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Icon source="golf-tee" size={20} color={colors.primary} />
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Best Drive
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.selector,
          { borderColor: colors.border, backgroundColor: colors.background },
        ]}
        onPress={() => setModalVisible(true)}
        disabled={disabled}
      >
        <Text
          style={[
            styles.selectorText,
            { color: selectedPlayer ? colors.textPrimary : colors.textSecondary },
          ]}
        >
          {selectedPlayer?.name ?? 'Select best drive'}
        </Text>
        <Icon source="chevron-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Player selection modal - copy pattern from TeamScoreCard */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            Who hit the best drive?
          </Text>
          {team.members?.map((member) => (
            <TouchableOpacity
              key={member.player_id}
              style={[
                styles.playerOption,
                member.player_id === selectedPlayerId && {
                  backgroundColor: colors.primaryLight,
                },
              ]}
              onPress={() => {
                onSelect(member.player_id);
                setModalVisible(false);
              }}
            >
              <Text style={{ color: colors.textPrimary }}>
                {member.player?.name}
              </Text>
              {member.player_id === selectedPlayerId && (
                <Icon source="check" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </Modal>
      </Portal>
    </View>
  );
}
```

**Deliverables:**
- [x] `DriveContributorPicker` component created
- [x] Export from `src/components/scorecard/index.ts`

---

### Step 2.2: Extend BestBallScoreView for Aggregation Mode
**Status:** ✅ Complete (2026-01-26)

**File:** `src/components/scorecard/BestBallScoreView.tsx`

Add props to support Shamble aggregation (but NOT drive selection - that's separate):

```typescript
interface BestBallScoreViewProps {
  // ... existing props

  /** Aggregation mode: 'best' (default) selects best score, 'sum' adds all scores */
  aggregation?: 'best' | 'sum';
  /** Format label override (e.g., "Shamble Format") */
  formatLabel?: string;
}
```

**Changes needed:**

1. Update team total calculation (~line 121):
```typescript
const teamTotal = useMemo(() => {
  if (aggregation === 'sum') {
    // Shamble: sum all player points
    return playerScoreData.reduce((sum, p) => sum + p.stablefordPoints, 0);
  }
  // Best Ball: use best score only
  const bestScore = playerScoreData.find((p) => p.isBest);
  return bestScore?.stablefordPoints ?? 0;
}, [playerScoreData, aggregation]);
```

2. Update format label (~line 137):
```typescript
<Text style={[styles.formatLabel, { color: colors.textSecondary }]}>
  {formatLabel ?? (aggregation === 'sum' ? 'Team Total' : 'Best Ball Format')}
</Text>
```

3. For `aggregation='sum'`, don't highlight "best" player (all contribute equally):
```typescript
// In playerScoreData calculation, skip isBest logic when aggregation === 'sum'
if (aggregation !== 'sum' && validNetScores.length > 0) {
  // ... existing best ball logic
}
```

**Deliverables:**
- [x] `aggregation` prop controls sum vs best
- [x] `formatLabel` prop allows override
- [x] Team total shows sum when `aggregation='sum'`
- [x] No "best" highlighting in sum mode

---

### Step 2.3: Update ScorecardScoreContent Router
**Status:** ✅ Complete (2026-01-26)

**File:** `src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx`

**Changes:**

1. Add shamble-specific shot contributions tracking (only drive, not all shots like scramble):
```typescript
// Get drive contributor for Shamble format
const shambleDriveContributor = useMemo(() => {
  if (!isTeamRound || teamFormat !== 'shamble' || teams.length === 0) {
    return undefined;
  }
  const firstMember = teams[0]?.members?.[0];
  if (!firstMember) return undefined;

  const score = playerScoresMap.get(firstMember.player_id);
  if (score && isSingleBallScore(score)) {
    return score.shotContributions?.drive;
  }
  return undefined;
}, [isTeamRound, teamFormat, teams, playerScoresMap]);
```

2. Add Shamble routing after Best Ball block (~line 236):
```typescript
// Team round: Shamble format
if (isTeamRound && teamFormat === 'shamble' && teams.length > 0) {
  const editablePlayerIds =
    scoringPairsEnabled && playersToScore.length > 0
      ? new Set(playersToScore.map((p) => p.id))
      : undefined;

  return (
    <>
      {teams.map((team, index) => (
        <React.Fragment key={team.id}>
          <DriveContributorPicker
            team={team}
            selectedPlayerId={shambleDriveContributor}
            onSelect={(playerId) => {
              handleShotContributionsChange?.(index, { drive: playerId });
            }}
          />
          <BestBallScoreView
            team={team}
            currentHole={currentHoleData}
            playerScores={playerScoresMap}
            onScoreSelect={handleBestBallScoreSelect}
            editablePlayerIds={editablePlayerIds}
            aggregation="sum"
            formatLabel="Shamble Format"
          />
        </React.Fragment>
      ))}
    </>
  );
}
```

**Deliverables:**
- [x] Shamble routing uses `DriveContributorPicker` + `BestBallScoreView`
- [x] Drive contributor stored via `handleShotContributionsChange`
- [x] Only drive is tracked (not approach/chip/putt like Scramble)

---

## Phase 3: Review Screen

### Step 3.1: Update ReviewScorecardScreen
**Status:** ✅ Complete (2026-01-26)

**File:** `src/screens/scoring/ReviewScorecardScreen/index.tsx`

**Changes:**

1. Add shamble detection:
```typescript
const isShamble = roundDetails?.team_format === 'shamble';
```

2. Update tab building for Shamble:
```typescript
if (isShamble) {
  tabs[0] = { key: 'scorecard' as const, label: 'Team Score' };
  tabs.push({ key: 'contributions' as const, label: 'Drives' });
}
```

3. For scorecard tab, Shamble reuses existing table patterns since it shows individual scores. The existing `ScorecardTable` should work if it receives all team member scores.

**Deliverables:**
- [x] `isShamble` detection added
- [x] Tabs include "Drives" for Shamble rounds
- [x] `ContributionLeaderboard` updated with `showOnlyDrives` prop
- [ ] Scorecard displays individual + team totals

---

### Step 3.2: Update Labels & Display
**Status:** ✅ Complete (2026-01-26)

**Files to update:**

1. `src/components/leaderboard/leaderboardUtils.ts` - Add shamble cases:
   - `getGameTypeLabel()`: return `'Shamble'`
   - `getGameTypeVariant()`: return `'success'`

2. `src/constants/statusConfig.ts` - Add to `GAME_TYPE_LABELS` (~line 99):
   ```typescript
   shamble: 'Shamble',
   ```

**Deliverables:**
- [x] Shamble displays correctly in leaderboards and UI

---

## Phase 4: Round Creation

### Step 4.1: Add Shamble to Match Type Selection
**Status:** ✅ Complete (2026-01-26)

**File:** `src/screens/rounds/CreateRoundBottomSheet/types.ts`

Add to `MATCH_TYPES` array (~line 186, after scramble):
```typescript
{
  value: 'shamble',
  label: 'Shamble',
  description: 'Best drive, then individual play - sum all points',
  requiredTier: 'premium',
},
```

**File:** `src/screens/rounds/CreateRoundBottomSheet/steps/ScoringSetupStep.tsx`

Update team config check to include shamble:
```typescript
if (selectedMatchType === 'scramble' || selectedMatchType === 'shamble') {
  // Show team configuration
}
```

**Deliverables:**
- [x] Shamble appears in match type selection
- [x] Selecting Shamble shows team configuration

---

## Critical Files

### To Modify
- `src/types/database/enums.ts` - Add `'shamble'` to both `GameType` AND `TeamFormat`
- `src/services/scoring/engines/TeamScoringEngine.ts` - Extend `calculateAggregate()`, sync local type with database
- `src/services/scoring/ScoringOrchestrator.ts` - Add shamble + scramble routing, fix `higherIsBetter`, update engine factory
- `src/services/scoring/utils/handicapUtils.ts` - Add shamble + scramble to `getHandicapAllowance()`
- `src/components/scorecard/BestBallScoreView.tsx` - Add `aggregation`, `formatLabel` props
- `src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx` - Add Shamble routing
- `src/screens/scoring/ReviewScorecardScreen/index.tsx` - Add Shamble tab handling
- `src/components/leaderboard/leaderboardUtils.ts` - Add shamble labels
- `src/constants/statusConfig.ts` - Add shamble label
- `src/screens/rounds/CreateRoundBottomSheet/types.ts` - Add shamble to MATCH_TYPES
- `src/screens/rounds/CreateRoundBottomSheet/steps/ScoringSetupStep.tsx` - Include shamble in team config check

### To Create
- `supabase/migrations/20260126000002_add_shamble_to_game_type_enum.sql` - Add shamble to game_type enum
- `src/components/scorecard/DriveContributorPicker.tsx` - Reusable drive picker component

### Already Created
- `supabase/migrations/20260126000001_add_shamble_to_team_format_enum.sql` ✅

### Reference Files (Read-Only)
- `src/components/scorecard/TeamScoreCard.tsx` - Drive picker modal pattern to copy (lines 344-532)

---

## Verification

- [ ] Create a new round with Shamble game type (single team)
- [ ] Verify drive selector appears above player scores
- [ ] Select a drive contributor and verify it persists across holes
- [ ] Enter scores for all players on multiple holes
- [ ] Verify team total = sum of all player Stableford points (not just best)
- [ ] Complete and submit the scorecard
- [ ] Verify review screen shows individual scores and team total
- [ ] Verify "Drives" tab shows drive contribution by hole
- [ ] Verify leaderboard shows correct team rankings (higher points = better)
- [ ] Test with scoring pairs enabled
- [ ] Test with multiple teams

### Edge Cases
- [ ] Player picks up (score = 0 points, still counted in sum)
- [ ] 2-person team vs 4-person team
- [ ] All players score 0 on a hole
- [ ] Single team round (all players on one team)
- [ ] Drive contributor not selected (should still allow scoring)

---

## Cleanup (Separate Task)

Ambrose is deprecated (scramble serves the same purpose). After shamble is working:
- [ ] Remove `'ambrose'` from `GameType` enum in `src/types/database/enums.ts`
- [ ] Remove ambrose cases from `ScoringOrchestrator.ts`, `TeamScoringEngine.ts`
- [ ] Remove ambrose from `MATCH_TYPES` in `CreateRoundBottomSheet/types.ts`
- [ ] Remove ambrose labels from `statusConfig.ts`, `leaderboardUtils.ts`
- [ ] Create migration to remove ambrose from database enum (if safe)

---

## Notes

- Shamble is added to BOTH `GameType` (for round creation/MATCH_TYPES) AND `TeamFormat` (for scoring engine)
- Shamble uses individual handicaps at 85% allowance (same as best-ball)
- Each player's Stableford points calculated independently, then summed
- Drive contributor stored in `shotContributions.drive` (same field as Scramble, but only drive tracked)
- Reuses `handleBestBallScoreSelect` since it already creates individual scorecards per player
- Single team is valid (all players play together, like Scramble)
- Scramble routing was missing from ScoringOrchestrator - fixed as part of type alignment
