# Plan: Scramble Format Score Entry Enhancement

## Overview
Improve the scramble format experience in the "Create Round" flow and score entry screen to properly support team-based scramble gameplay.

## Approach
1. **Phase 1**: Add team formation UI to the Create Round wizard (ScoringSetupStep)
2. **Phase 2** (Future): Update TeamScoreCard to support shot-by-shot attribution (Drive, Approach, Putt)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Team sizes | 2-player teams (3 if odd count) | Keeps it simple, allows odd player counts |
| Team storage (standalone) | JSONB on `rounds.team_config` | Ephemeral teams don't need separate tables |
| Team storage (competition) | Use existing `teams`/`team_members` tables | Already exists, reuse infrastructure |
| Teams UI | Auto-enabled for scramble + 4 players | Remove friction, no toggle needed |
| Shot attribution | Phase 2 (optional, future) | Keep Phase 1 simple, existing contributor dropdown suffices |

---

## Phase 1: Team Formation in Create Round

### Step 1.0: Database Migration
**Status:** ✅ Complete (2026-01-26)
**Type:** Migration
**Command:** `supabase migration new add_round_team_config`

**Prompt:**
```sql
-- Add team_config JSONB column to rounds for standalone scramble team storage
-- Competition rounds use existing teams/team_members tables instead

ALTER TABLE rounds ADD COLUMN team_config JSONB;

COMMENT ON COLUMN rounds.team_config IS 'Stores ephemeral team configuration for standalone scramble rounds. Structure: { "teams": [{ "id": "team-1", "name": "Team 1", "memberIds": ["uuid1", "uuid2"] }] }';
```

**Deliverables:**
- [x] Migration file created (`supabase/migrations/20260125230426_add_round_team_config.sql`)
- [x] `team_config` column added to rounds table
- [x] TypeScript types added: `ScrambleTeam` and `TeamConfig` in `src/screens/rounds/CreateRoundBottomSheet/types.ts`
- [x] `WizardData` interface updated with `teams` and `teamsLocked` fields
- [x] `initialData` in hook updated with default values

**Dependencies:** None
**Notes:** Competition scramble rounds will use existing `teams`/`team_members` tables, not this column

---

### Step 1.1: Update Wizard Types
**Status:** ✅ Complete (2026-01-26)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update the CreateRoundBottomSheet types to support team formation for scramble format.

File to modify: src/screens/rounds/CreateRoundBottomSheet/types.ts

Add the following:

1. Add ScrambleTeam interface (for wizard state):
interface ScrambleTeam {
  id: string;
  name: string;  // "Team 1", "Team 2"
  members: PlayingPartner[];
}

2. Add TeamConfig interface (for database storage):
interface TeamConfig {
  teams: Array<{
    id: string;
    name: string;
    memberIds: string[];  // Player UUIDs
  }>;
}

3. Add to WizardData interface:
- teams: ScrambleTeam[] (default [])
- teamsLocked: boolean (default false) // True when using competition teams

4. Export both types

Reference existing patterns:
- PlayingPartner interface in the same file
- ScoringPairsConfig structure for similar grouped data
```

**Deliverables:**
- [x] `ScrambleTeam` interface added to types.ts
- [x] `TeamConfig` interface added to types.ts (matches JSONB structure)
- [x] `teams` and `teamsLocked` added to `WizardData`
- [x] Updated `initialData` constant in useCreateRoundWizard.ts

**Completed:** As part of Step 1.0 implementation

**Dependencies:** Step 1.0 (for TeamConfig structure alignment)
**Notes:** `teamsLocked` prevents shuffling when using existing competition teams

---

### Step 1.2: Create TeamFormationInline Component
**Status:** ✅ Complete (2026-01-26)
**Type:** /component
**Command:** `/component TeamFormationInline`

**Prompt:**
```
Create a TeamFormationInline component for displaying and shuffling scramble teams.

Location: src/components/scoring/TeamFormationInline.tsx

UI Requirements:
- Similar layout to ScoringPairFormationInline component
- Header row with "Teams" title and "Shuffle" button (IconRefresh)
- Shuffle button hidden when `locked` prop is true
- When locked, show lock icon with "Competition teams" label
- Team cards showing:
  - Team name (Team 1, Team 2, etc.)
  - Player avatars side by side with names (2 or 3 players)
- Help text: "Players are paired into teams"

Props:
interface TeamFormationInlineProps {
  teams: ScrambleTeam[];
  onShuffle: () => void;
  locked?: boolean;  // True for competition teams (can't shuffle)
  testID?: string;
}

Styling:
- Use useThemeColors() for all colors
- Container: backgroundColor colors.gray100, borderRadius.lg, padding spacing.md
- Header: flexDirection row, justifyContent space-between
- Shuffle button: IconRefresh icon, "Shuffle" text, backgroundColor colors.surface
- Locked state: IconLock icon, "Competition teams" text, muted colors
- Team cards: backgroundColor colors.surface, borderRadius.md, padding spacing.sm
- Player display: PlayerAvatar (28px) + name (typography.small)
- Support 2-3 players per team card

Reference:
- Copy patterns from src/components/scoring/ScoringPairFormationInline.tsx
- Use PlayerAvatar from @/components/common
- Import icons from @tabler/icons-react-native
```

**Deliverables:**
- [x] `src/components/scoring/TeamFormationInline.tsx` created
- [x] Component exported from `src/components/scoring/index.ts`
- [x] Locked state UI implemented (shows lock icon + "Competition teams" label)
- [x] Supports 2-3 player teams with dynamic help text for odd counts

**Dependencies:** Step 1.1 (needs ScrambleTeam type)
**Notes:** Shuffle logic is in the wizard hook; this component just displays and calls onShuffle

---

### Step 1.3: Update Wizard Hook with Team Handlers
**Status:** ✅ Complete (2026-01-26)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update useCreateRoundWizard hook to manage team formation state.

File: src/screens/rounds/CreateRoundBottomSheet/hooks/useCreateRoundWizard.ts

Add to initialData:
teams: [],
teamsLocked: false,

Add handlers:

1. Auto-generate teams when scramble selected with 4+ players:
- Add useEffect that watches selectedMatchType and selectedPartners
- If scramble && totalPlayers >= 4, auto-generate teams
- If not scramble or < 4 players, clear teams

2. For competition rounds with existing teams:
- If competitionId prop exists, fetch teams from teams/team_members tables
- Set teamsLocked: true (prevent shuffling)
- Map database teams to ScrambleTeam[] format

3. shuffleTeams():
- Only works if !teamsLocked
- Randomize player assignments to teams
- Use Fisher-Yates shuffle on player array, then re-pair

4. Update handleStartScoring:
- For standalone rounds: convert teams to TeamConfig and pass to onStartRound
- For competition rounds: teams already exist in DB, no need to pass

Team generation algorithm (handles odd players):
function generateTeams(
  players: PlayingPartner[],
  currentUser: { id: string; name: string; handicap?: number }
): ScrambleTeam[] {
  const allPlayers = [currentUser, ...players];
  const teams: ScrambleTeam[] = [];

  for (let i = 0; i < allPlayers.length; i += 2) {
    const members = [allPlayers[i]];
    if (i + 1 < allPlayers.length) {
      members.push(allPlayers[i + 1]);
    } else if (teams.length > 0) {
      // Odd player: add to last team as 3rd member
      teams[teams.length - 1].members.push(allPlayers[i]);
      continue;
    }
    teams.push({
      id: `team-${teams.length + 1}`,
      name: `Team ${teams.length + 1}`,
      members
    });
  }
  return teams;
}

Add to return object:
- shuffleTeams
- teamsLocked
```

**Deliverables:**
- [x] `teams` and `teamsLocked` in wizard state (completed in Step 1.0)
- [x] Auto-generation when scramble + 4 players (useEffect added)
- [ ] Competition team fetching (when competitionId exists) - **Deferred**: wizard doesn't have competitionId prop currently
- [x] `shuffleTeams` handler (disabled when locked)
- [ ] TeamConfig passed to `onStartRound` for standalone rounds - **See Step 1.5**

**Completed:**
- Added `useAuth` hook for current user access
- Added `currentUserAsPartner` memo to build current user as PlayingPartner
- Added `generateTeams` function with odd player handling
- Added `shuffleTeams` with Fisher-Yates algorithm
- Added `useEffect` for auto-team generation when scramble + 4 players
- Teams auto-clear when not scramble or < 4 players

**Dependencies:** Step 1.1
**Notes:** Current user must include handicap for team handicap calculations

---

### Step 1.4: Update ScoringSetupStep with Teams Display
**Status:** ✅ Complete (2026-01-26)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update ScoringSetupStep to show team formation UI for scramble format (auto-enabled, no toggle).

File: src/screens/rounds/CreateRoundBottomSheet/steps/ScoringSetupStep.tsx

Add new props:
- selectedMatchType: GameType (already exists)
- teams: ScrambleTeam[]
- teamsLocked: boolean
- onShuffleTeams: () => void

Add Teams Section (between Scoring Pairs and Skins sections):

Visibility conditions:
- Only show when selectedMatchType === 'scramble' && teams.length > 0

UI Structure:
1. Divider (like skinsDivider)

2. Section Header:
- Icon: IconUsers or IconUsersGroup
- Title: "Teams"
- Subtitle: "Playing as 2-player teams" (or "3-player team" if odd)

3. TeamFormationInline component:
- Pass teams and onShuffleTeams
- Hide shuffle button if teamsLocked (competition teams)
- Show lock icon with "Competition teams" label if locked

4. Info for 3-player team:
- Show subtle note: "One team has 3 players due to odd count"

Reference styling from:
- scoringPairsToggle styles for the header row
- scoringPairsFormation styles for the formation container

Import TeamFormationInline from @/components/scoring
```

**Deliverables:**
- [x] Teams section auto-displayed for scramble with teams
- [x] TeamFormationInline rendered with teams
- [x] Shuffle button hidden when teamsLocked (via component prop)
- [x] Info note for odd player counts (in header subtitle)

**Completed:**
- Added `teams`, `teamsLocked`, `onShuffleTeams` props to ScoringSetupStepProps
- Added teams section with divider and header between scoring pairs and skins
- Added TeamFormationInline component with all props wired
- Added styles for teams section
- Updated CreateRoundBottomSheet/index.tsx to pass teams props

**Dependencies:** Step 1.2, Step 1.3
**Notes:** No toggle needed - teams auto-created for scramble + 4 players

---

### Step 1.5: Update onStartRound to Persist Teams
**Status:** ✅ Complete (2026-01-26)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update the onStartRound callback and round creation to persist team_config for standalone rounds.

Files to modify:
- src/screens/rounds/CreateRoundBottomSheet/index.tsx (or wherever onStartRound is called)
- Round creation hook/service

1. Update CreateRoundBottomSheetProps.onStartRound signature:
onStartRound: (
  courseId: string,
  courseName: string,
  partners: PlayingPartner[],
  selectedTee?: TeeBox,
  gameType?: GameType,
  scoringPairs?: ScoringPairsConfig,
  ballCount?: BallCount,
  skinsConfig?: StandaloneSkinsConfig,
  teamConfig?: TeamConfig  // NEW
) => void;

2. In handleStartScoring, convert teams to TeamConfig:
const teamConfig: TeamConfig | undefined = teams.length > 0 && !teamsLocked
  ? {
      teams: teams.map(t => ({
        id: t.id,
        name: t.name,
        memberIds: t.members.map(m => m.id)
      }))
    }
  : undefined;

3. Pass teamConfig to onStartRound

4. In round creation service/hook:
- If teamConfig provided, save to rounds.team_config column
- If competitionId provided, teams already exist in teams table (no action needed)
```

**Deliverables:**
- [x] onStartRound signature updated with teamConfig param (in types.ts, CreateRoundBottomSheetProps)
- [x] Teams converted to TeamConfig format before passing (in handleStartScoring)
- [x] Round creation saves team_config JSONB for standalone rounds (in useStartNewRound)
- [x] Competition rounds skip team_config (teamsLocked check prevents passing)

**Completed:**
- Updated `CreateRoundBottomSheetProps.onStartRound` signature in types.ts
- Updated `UseCreateRoundWizardOptions.onStartRound` signature in hook
- Added TeamConfig building logic in `handleStartScoring`
- Updated `useStartNewRound` interface and function to accept teamConfig
- Added `team_config` to rounds table insert
- Exported `TeamConfig` type from CreateRoundBottomSheet/index.tsx

**Dependencies:** Step 1.0, Step 1.3
**Notes:** Only standalone rounds use team_config column; competition rounds use teams/team_members tables

---

## Phase 2: Shot Attribution in Score Entry (Future/Optional)

> **Note:** Phase 2 is deferred and not required for initial scramble support. The existing single "Contributed by" dropdown in TeamScoreCard is sufficient for MVP. Implement Phase 2 only if users request more granular shot tracking.

### Step 2.1: Add ShotContributions Type
**Status:** ✅ Complete (2026-01-26)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Add ShotContributions interface for tracking who made each shot in scramble.

Find score-related types file. Check:
- src/types/database/score.types.ts
- src/types/database.types.ts
- src/types/index.ts

Add interface:
export interface ShotContributions {
  drive?: string;    // playerId who hit the tee shot used
  approach?: string; // playerId who hit the approach shot used
  putt?: string;     // playerId who made the putt
}

If no dedicated score types file exists, add to:
src/types/database/score.types.ts (create if needed)

Export from src/types/index.ts if that's the pattern used.
```

**Deliverables:**
- [x] `ShotContributions` interface defined in `src/types/database/scorecard.types.ts`
- [x] Type exported from `src/types/database/index.ts`

**Dependencies:** None
**Notes:** Keep it simple - just 3 optional player IDs

---

### Step 2.2: Update TeamScoreCard with Shot Attribution
**Status:** ✅ Complete (2026-01-26)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update TeamScoreCard to replace single contributor dropdown with shot attribution UI.

File: src/components/scorecard/TeamScoreCard.tsx

Replace existing contributor section with Shot Contributions section:

1. Update props:
- Remove: onContributorSelect, selectedContributor
- Add: onShotContributionsChange?: (contributions: ShotContributions) => void
- Add: shotContributions?: ShotContributions

2. Replace contributorContainer section with new UI:

```tsx
{/* Shot Contributions (optional) */}
{onShotContributionsChange && (
  <>
    <View style={[styles.divider, { backgroundColor: colors.border }]} />
    <View style={styles.shotContributionsContainer}>
      <Text style={[styles.shotContributionsTitle, { color: colors.textSecondary }]}>
        Shot Contributions
      </Text>
      <Text style={[styles.shotContributionsSubtitle, { color: colors.textTertiary }]}>
        Optional - track who contributed each shot
      </Text>

      {/* Drive */}
      <ShotContributorRow
        label="Drive"
        icon="golf-tee" // or appropriate icon
        playerId={shotContributions?.drive}
        players={team.members}
        onSelect={(playerId) => handleShotSelect('drive', playerId)}
      />

      {/* Approach */}
      <ShotContributorRow
        label="Approach"
        icon="target"
        playerId={shotContributions?.approach}
        players={team.members}
        onSelect={(playerId) => handleShotSelect('approach', playerId)}
      />

      {/* Putt */}
      <ShotContributorRow
        label="Putt"
        icon="circle"
        playerId={shotContributions?.putt}
        players={team.members}
        onSelect={(playerId) => handleShotSelect('putt', playerId)}
      />
    </View>
  </>
)}
```

3. Create internal ShotContributorRow component or inline UI:
- Label + icon on left
- Dropdown/menu on right showing team members
- Default text: "Select player"
- Use Menu component from react-native-paper (like existing contributor)

4. Handler:
const handleShotSelect = (shotType: 'drive' | 'approach' | 'putt', playerId: string | undefined) => {
  onShotContributionsChange?.({
    ...shotContributions,
    [shotType]: playerId
  });
};

5. New styles:
- shotContributionsContainer: paddingTop spacing.md
- shotContributionsTitle: typography.smallBold, marginBottom spacing.xs
- shotContributionsSubtitle: typography.caption, marginBottom spacing.md
- shotRow: flexDirection row, alignItems center, justifyContent space-between, marginBottom spacing.sm
- shotLabel: typography.body with icon
- shotDropdown: similar to contributorButton but more compact

Icons to use (from @tabler/icons-react-native):
- Drive: IconGolf or IconFlag
- Approach: IconTarget or IconFlagFilled
- Putt: IconCircle or IconHexagon
```

**Deliverables:**
- [x] Shot contributions props added (legacy contributor props preserved for backward compatibility)
- [x] Three shot type dropdowns added (Drive, Approach, Putt) with icons
- [x] All dropdowns default to unselected ("Select player")
- [x] Styling matches existing card design

**Completed:**
- Added `shotContributions` and `onShotContributionsChange` props
- Added state for menu visibility (drive, approach, putt)
- Added handlers for each shot type selection
- Created Shot Contributions section with three rows
- Used react-native-paper Menu for dropdowns
- Legacy contributor UI preserved for backward compatibility
- Exported `ShotContributions` type from main types index

**Dependencies:** Step 2.1
**Notes:** Keep the dropdowns compact - this section shouldn't dominate the card

---

### Step 2.3: Update Score Content to Pass Shot Contributions
**Status:** ✅ Complete (2026-01-26)
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update ScorecardScoreContent to manage shot contributions state and pass to TeamScoreCard.

File: src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx

1. Add state for shot contributions per hole:
const [shotContributions, setShotContributions] = useState<Record<number, ShotContributions>>({});

2. Create handler:
const handleShotContributionsChange = (holeNumber: number, contributions: ShotContributions) => {
  setShotContributions(prev => ({
    ...prev,
    [holeNumber]: contributions
  }));
};

3. Update TeamScoreCard render to pass props:
<TeamScoreCard
  key={team.id}
  team={team}
  currentHole={currentHoleData}
  currentScore={getTeamScore(index)}
  onScoreSelect={(strokes) => handleTeamScoreSelect(index, strokes)}
  shotContributions={shotContributions[currentHoleNumber]}
  onShotContributionsChange={(contributions) =>
    handleShotContributionsChange(currentHoleNumber, contributions)
  }
/>

4. Include shot contributions when saving scores (if applicable):
- Check how scores are saved in handleSubmitScorecard or similar
- Add shotContributions to the score data being saved

Note: The shot contributions data structure should be saved alongside hole scores.
Check the existing score submission flow to understand where to add this data.
```

**Deliverables:**
- [x] Shot contributions state managed in ScorecardScoreContent (useState with Record<number, ShotContributions>)
- [x] Props passed to TeamScoreCard (`shotContributions` and `onShotContributionsChange`)
- [x] Contributions persist when navigating between holes (state keyed by hole number)
- [ ] Contributions included in score submission - **Deferred**: Requires updating score submission API/types

**Completed:**
- Added `shotContributions` state with `useState<Record<number, ShotContributions>>({})`
- Added `handleShotContributionsChange` callback
- Updated TeamScoreCard render to pass both new props and legacy props for backward compatibility

**Dependencies:** Step 2.2
**Notes:** Shot contributions are stored locally; saving to database would require updating the score submission flow

---

## Critical Files

### To Modify
| File | Changes |
|------|---------|
| `supabase/migrations/YYYYMMDD_add_round_team_config.sql` | Add `team_config` JSONB column |
| `src/screens/rounds/CreateRoundBottomSheet/types.ts` | Add `ScrambleTeam`, `TeamConfig`, `teams`, `teamsLocked` |
| `src/screens/rounds/CreateRoundBottomSheet/hooks/useCreateRoundWizard.ts` | Add team handlers, auto-generation, competition team fetch |
| `src/screens/rounds/CreateRoundBottomSheet/steps/ScoringSetupStep.tsx` | Add teams display section for scramble |
| `src/screens/rounds/CreateRoundBottomSheet/index.tsx` | Update onStartRound to pass teamConfig |

### To Create
| File | Description |
|------|-------------|
| `src/components/scoring/TeamFormationInline.tsx` | Team formation UI with shuffle and locked state |

### Phase 2 Only (Future)
| File | Changes |
|------|---------|
| `src/components/scorecard/TeamScoreCard.tsx` | Replace contributor with shot attribution |
| `src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx` | Manage shot contributions state |

---

## Verification

### Create Round Flow (Standalone) - Phase 1
- [ ] Select scramble format with 4 players → teams auto-generated
- [ ] Verify teams section appears on Scoring Setup step (no toggle)
- [ ] Click shuffle and verify team assignments change
- [ ] With 5 players, verify one team has 3 players
- [ ] With 2-3 players, verify teams section not shown
- [ ] Start round and verify team_config saved to rounds table

### Create Round Flow (Competition) - Phase 1
- [ ] In competition with existing teams, select scramble round
- [ ] Verify teams pre-populated from competition teams
- [ ] Verify shuffle button is hidden (teams locked)
- [ ] Verify "Competition teams" lock indicator shown

### Score Entry - Phase 1
- [ ] Start scramble round and enter scorecard
- [ ] Verify TeamScoreCard displays correctly for each team
- [ ] Verify existing "Contributed by" dropdown still works
- [ ] Submit scorecard and verify scores saved

### Shot Attribution - Phase 2 (Implemented)
- [ ] Verify TeamScoreCard shows Drive/Approach/Putt dropdowns (when onShotContributionsChange is provided)
- [ ] Verify dropdowns default to unselected ("Select player")
- [ ] Select different players for each shot type
- [ ] Navigate between holes → verify selections persist per hole

---

## Notes

- Scramble is a Premium tier feature, so no additional tier gating needed
- Competition teams already exist in `teams`/`team_members` tables - reuse them
- Standalone round teams stored as JSONB in `rounds.team_config` (ephemeral, no separate table)
- Teams auto-generated when scramble + 4 players selected (no toggle needed)
- Odd player counts allowed - last player joins existing team as 3rd member
- Phase 2 (shot attribution) is optional - existing contributor dropdown is sufficient for MVP
- Team formation follows the same UI pattern as ScoringPairFormationInline for consistency
