# Plan: Dedicated Score Entry Screens for Each Game Type

## Overview

Create dedicated score entry screens for each game type so users can easily distinguish what format they're playing and see relevant data. Currently, the app has only 2 screens: `ScorecardEntryScreen` (generic) and `MatchPlayScoringScreen` (match play specific). Team Match Play incorrectly uses the generic screen.

## Approach

1. **Reuse existing infrastructure** - All screens share `useScorecardStore`, offline sync, and common components
2. **Create format-specific headers** - Each format shows relevant running totals and status
3. **Create format-specific score cards** - Different layouts optimized for each scoring method
4. **Update routing logic** - Route to correct screen based on `gameType` and `teamFormat`
5. **Skins overlay** - Integrate skins indicator into all screens (already exists)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Extend existing screens, not replace | Reuse all hooks, store, offline sync |
| Priority | Team formats first | User-requested priority |
| Header differentiation | Format-specific headers | Show relevant stats per format |
| Score cards | Format-specific components | Different input methods per format |

---

## Phase 1: Team Format Score Entry Improvements

### Step 1.1: Create GameTypeHeader Component
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a reusable header component that displays format-specific information below the course/tee header.

Files to create:
- src/components/scorecard/GameTypeHeader/GameTypeHeader.tsx
- src/components/scorecard/GameTypeHeader/index.ts

The component should display different information based on game type:
- Best Ball: Team points comparison (Team Alpha: 32 pts | Team Bravo: 29 pts)
- Scramble: Team score and points (The Hackers: +2 gross | 18 pts)
- Team Match Play: Match status (Team Alpha 2 UP with 5 to play)
- Stroke Play: Game type badge with "thru X" indicator
- Stableford: Game type badge with "thru X" indicator

Props interface:
- gameType: GameType
- teamFormat?: TeamFormat
- isTeamRound?: boolean
- teams?: TeamWithMembers[]
- teamScores?: { teamId: string; teamName: string; points: number; gross?: number }[]
- matchStatus?: TeamMatchStatus
- currentHole?: number

Export from src/components/scorecard/index.ts
```

**Deliverables:**
- [x] GameTypeHeader component with conditional rendering per format
- [x] Exported from scorecard components index

**Dependencies:** None
**Notes:** Component created at `src/components/scorecard/GameTypeHeader/`

---

### Step 1.2: Update BestBallScoreView Component
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Enhance the existing BestBallScoreView to better highlight the best score and show team competition status.

File to modify:
- src/components/scorecard/BestBallScoreView.tsx

Changes:
- Change points label from "pts" to "BEST" for the best player
- Already has: Star icon for best player, team total points, shots received indicator, highlight row

The component already has most features. Just update the points label for clarity.
```

**Deliverables:**
- [x] Best score highlighting with "BEST" label
- [x] Team total points in card header (already exists)
- [x] Shots received indicator per player (already exists)

**Dependencies:** None
**Notes:** Minor enhancement - changed points label to "BEST" for best player

---

### Step 1.3: Update TeamScoreCard Component (Scramble)
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Enhance the existing TeamScoreCard for Scramble format with better team stats display.

File to modify:
- src/components/scorecard/TeamScoreCard.tsx

Changes:
1. Add new props:
   - runningTotalPoints?: number
   - runningTotalGross?: number
   - currentHoleNumber?: number

2. Add "SCRAMBLE" format badge in header

3. Update handicap display to show shots received on current hole

4. Add running total row showing "Thru X: Y strokes | Z pts"

5. Update stats display to show cumulative team points
```

**Deliverables:**
- [x] Team running totals display
- [x] Team handicap in header with shots received
- [x] SCRAMBLE format badge
- [x] Running total row

**Dependencies:** None
**Notes:** Added format badge and running totals display

---

### Step 1.4: Create TeamMatchPlayScoringScreen
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a dedicated screen for Team Match Play that mirrors the individual MatchPlayScoringScreen but for teams.

Files to create:
- src/screens/scoring/TeamMatchPlayScoringScreen/index.tsx
- src/screens/scoring/TeamMatchPlayScoringScreen/components/TeamMatchPlayHeader.tsx
- src/screens/scoring/TeamMatchPlayScoringScreen/components/TeamScorePanel.tsx
- src/screens/scoring/TeamMatchPlayScoringScreen/components/TeamMatchProgress.tsx
- src/screens/scoring/TeamMatchPlayScoringScreen/components/index.ts
- src/screens/scoring/TeamMatchPlayScoringScreen/types.ts
- src/screens/scoring/TeamMatchPlayScoringScreen/utils/teamMatchPlayCalculations.ts
- src/screens/scoring/TeamMatchPlayScoringScreen/utils/index.ts

Reference the existing MatchPlayScoringScreen at:
- src/screens/scoring/MatchPlayScoringScreen/index.tsx
- src/screens/scoring/MatchPlayScoringScreen/components/
- src/screens/scoring/MatchPlayScoringScreen/utils/

Key features:
1. Match status bar showing which team is up ("Team Alpha 2 UP with 5 to play")
2. Side-by-side team panels with VS divider
3. Individual player scores shown within team panels
4. Team total automatically calculated (sum of best ball or all scores)
5. Hole winner indicator
6. Match progress showing A/B/= per hole
7. Early finish detection (dormie)
8. Skins indicator in header

Layout wireframe:
+----------------------------------------------------------+
|  [<]  Course Name - Tees                    [dice] [sync] |
+----------------------------------------------------------+
|  [<]  HOLE 7  [>]  |  Par 4  |  SI: 12  |  385m          |
+----------------------------------------------------------+
|  ┌─────────────────────────────────────────────────────┐  |
|  │     TEAM ALPHA  2 UP  with 5 to play                │  |
|  │     ( 4 ) HOLES WON ( 2 )     1 halved              │  |
|  └─────────────────────────────────────────────────────┘  |
|                                                           |
|  ┌─────────────────┐   VS   ┌─────────────────┐          |
|  │  TEAM ALPHA     │        │  TEAM BRAVO     │          |
|  │     [  9  ]     │        │     [ 10  ]     │          |
|  │  John: 4        │        │  Mike: 5        │          |
|  │  Sarah: 5       │        │  Alex: 5        │          |
|  │   WINNING       │        │                 │          |
|  └─────────────────┘        └─────────────────┘          |
|                                                           |
|  ┌── Match Progress ─────────────────────────────────┐   |
|  │  1  2  3  4  5  6  7  8  9  10 11 12 ...          │   |
|  │  A  B  =  A  A  B  ?  -  -  -  -  -               │   |
|  └───────────────────────────────────────────────────┘   |
+----------------------------------------------------------+
|   [  < Previous  ]              [  Next >  ]             |
|              [Submit Match Result]                        |
+----------------------------------------------------------+

Use hooks from:
- useRoundDetails, useRoundPlayers for data fetching
- useTeamScoring for team score management
- Pattern from MatchPlayScoringScreen for match status calculations
```

**Deliverables:**
- [x] TeamMatchPlayScoringScreen main component
- [x] TeamMatchPlayHeader with match status and skins indicator
- [x] TeamScorePanel showing team score + individual player scores
- [x] TeamMatchProgress component with A/B/= indicators
- [x] Team match play calculation utilities
- [x] Types file

**Dependencies:** Step 1.1
**Notes:**
- Created complete screen at `src/screens/scoring/TeamMatchPlayScoringScreen/`
- Follows same patterns as individual MatchPlayScoringScreen
- Includes TeamMatchPlayFooter component for navigation
- Added teamMatchPlayLogger to debugLogger.ts
- Uses best ball scoring (lowest score from team counts)

---

### Step 1.5: Update Navigation Routing
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update the routing logic to send Team Match Play to the new dedicated screen.

Files to modify:
1. src/navigation/types.ts
   - Add TeamMatchPlayScoring route params:
     TeamMatchPlayScoring: {
       roundId: string;
       team1Id?: string;
       team2Id?: string;
     };

2. src/navigation/RootNavigator.tsx
   - Import TeamMatchPlayScoringScreen
   - Add Stack.Screen for TeamMatchPlayScoring

3. src/screens/rounds/RoundListScreen/hooks/useRoundActions.ts
   - Update handleScoreRound to check for team match play:
     if (gameType === 'match-play') {
       if (isTeamRound) {
         navigation.navigate('TeamMatchPlayScoring', { roundId, team1Id, team2Id });
       } else {
         navigation.navigate('MatchPlayScoring', { roundId, player1Id, player2Id });
       }
     }

4. src/screens/rounds/ViewRoundScreen.tsx
   - Update handleScoreRound with same logic

5. src/screens/competitions/CompetitionDetailScreen.tsx
   - Update handleScoreRound with same logic

Current logic:
if (gameType === 'match-play' && !isTeamRound) → MatchPlayScoring
else → Scorecard

New logic:
if (gameType === 'match-play') {
  if (isTeamRound) → TeamMatchPlayScoring
  else → MatchPlayScoring
} else → Scorecard
```

**Deliverables:**
- [x] Add TeamMatchPlayScoring route to navigation types
- [x] Add TeamMatchPlayScoring screen to RootNavigator
- [x] Update routing in useRoundActions
- [x] Update routing in ViewRoundScreen
- [x] Update routing in CompetitionDetailScreen

**Dependencies:** Step 1.4
**Notes:**
- Added `TeamMatchPlayScoring` route type to `src/navigation/types.ts`
- Imported and registered `TeamMatchPlayScoringScreen` in `src/navigation/RootNavigator.tsx`
- Updated routing logic in all 3 locations to route team match play rounds to the new screen
- Individual match play still routes to `MatchPlayScoring`
- All other game types route to `Scorecard`

---

## Phase 2: Individual Format Improvements

### Step 2.1: Create StrokePlayScoreCard Component
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a score card optimized for Stroke Play with relative-to-par buttons.

Files to create:
- src/components/scorecard/StrokePlayScoreCard/StrokePlayScoreCard.tsx
- src/components/scorecard/StrokePlayScoreCard/index.ts

Layout wireframe:
┌────────────────────────────────────────────────────────┐
│  John Smith                          GROSS   NET      │
│  HC: 18  |  +1 shot this hole         +2     E        │
├────────────────────────────────────────────────────────┤
│                                                        │
│        Score Relative to Par (Par 4)                   │
│                                                        │
│   [-2]  [-1]  [ E ]  [+1]  [+2]  [+3]   [...]         │
│   EAG   BIR   PAR    BOG   DBL  TRIP   MORE           │
│                                                        │
│   Current: [ 5 ]  =  +1 (Bogey)                       │
│                                                        │
│   FIR: [x] Yes  [ ] No    GIR: [ ] Yes  [x] No       │
└────────────────────────────────────────────────────────┘

Props interface:
- player: Player
- currentHole: Hole
- currentScore: HoleScore | undefined
- onScoreSelect: (playerId: string, strokes: number) => void
- onStatsUpdate: (playerId: string, updates: Partial<HoleScore>) => void
- onPlayerPress?: (playerId: string) => void
- runningGross?: number
- runningNet?: number
- showFIR?: boolean
- showGIR?: boolean

Key features:
1. Relative-to-par buttons (Eagle -2 through Triple +3)
2. "MORE" button that opens a modal/stepper for worse scores
3. Shows current strokes with relative-to-par label (e.g., "5 = +1 Bogey")
4. Running gross and net totals in header
5. Shots received indicator
6. FIR/GIR toggles (premium feature)
7. Score color coding (eagle=dark green, birdie=green, par=blue, bogey=orange, double+=red)

Export from src/components/scorecard/index.ts
```

**Deliverables:**
- [x] StrokePlayScoreCard component
- [x] Relative-to-par button row
- [x] Gross/net running totals
- [x] Score color coding
- [x] Export from index

**Dependencies:** None
**Notes:**
- Created component at `src/components/scorecard/StrokePlayScoreCard/`
- Features relative-to-par quick buttons (Eagle through Triple Bogey)
- Includes "MORE" modal for extended score selection (1-10)
- Displays running gross/net totals in header
- Shows shots received badge when applicable
- Score color coding using theme golf colors (eagle/birdie/par/bogey/doubleBogey)
- Reuses StatsRow component from PlayerScoreCard for FIR/GIR/Putts
- Includes Pick Up functionality with undo option
- Current score display shows strokes = relative-to-par (description)

---

### Step 2.2: Create StrokePlayLeaderboard Component
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a mini leaderboard showing running standings during stroke play.

Files to create:
- src/components/scorecard/StrokePlayLeaderboard/StrokePlayLeaderboard.tsx
- src/components/scorecard/StrokePlayLeaderboard/index.ts

Layout wireframe:
┌── Leaderboard (thru 6) ──────────────────────────────┐
│  1. Sarah Lee    E  (Net: -2)                        │
│  2. John Smith  +2  (Net: E)                         │
│  3. Mike Chen   +4  (Net: +1)                        │
└──────────────────────────────────────────────────────┘

Props interface:
- players: Player[]
- getPlayerScore: (playerId: string, hole: number) => HoleScore | undefined
- currentHole: number
- holes: Hole[]
- currentUserId?: string
- sortBy?: 'gross' | 'net'

Key features:
1. Calculate gross and net totals through current hole
2. Sort players by selected metric
3. Show position, name, gross score, net score in parentheses
4. Highlight current user row
5. Collapsible (default collapsed, tap to expand)

Export from src/components/scorecard/index.ts
```

**Deliverables:**
- [x] StrokePlayLeaderboard component
- [x] Sort by gross or net
- [x] Highlight current user
- [x] Collapsible view
- [x] Export from index

**Dependencies:** None
**Notes:**
- Created component at `src/components/scorecard/StrokePlayLeaderboard/`
- Collapsible with LayoutAnimation for smooth expand/collapse
- Calculates gross and net totals through current hole
- Handles ties in position assignment
- Highlights current user row with primary color tint
- Default collapsed, expandable via header tap
- Trophy icon in header for visual appeal
- Handles picked up holes with double-par penalty
- Exported from scorecard/index.ts with type export

---

### Step 2.3: Update ScorecardScoreContent for Stroke Play
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Add conditional rendering in ScorecardScoreContent to use StrokePlayScoreCard when game type is stroke play.

File to modify:
- src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx

Changes:
1. Add gameType prop to ScorecardScoreContentProps
2. Add imports for StrokePlayScoreCard and StrokePlayLeaderboard
3. Add condition before team format checks:

if (gameType === 'stroke' && !isTeamRound) {
  return (
    <>
      {playersToRender.map((player) => (
        <StrokePlayScoreCard
          key={player.id}
          player={player}
          currentHole={currentHoleData}
          currentScore={getPlayerScore(player.id, currentHole)}
          onScoreSelect={onScoreSelect}
          onStatsUpdate={onStatsUpdate}
          onPlayerPress={onPlayerPress}
          showFIR={showFIR}
          showGIR={showGIR}
        />
      ))}
      <StrokePlayLeaderboard
        players={playersToRender}
        getPlayerScore={getPlayerScore}
        currentHole={currentHole}
        holes={/* pass holes from parent */}
      />
    </>
  );
}

4. Update ScorecardEntryScreen to pass gameType prop
```

**Deliverables:**
- [x] Add gameType prop to ScorecardScoreContent
- [x] Conditional rendering for stroke play
- [x] Include mini leaderboard
- [x] Update parent to pass gameType

**Dependencies:** Step 2.1, Step 2.2
**Notes:**
- Added `gameType`, `holes`, and `currentUserId` props to ScorecardScoreContentProps
- Added `gameType` to useRoundData hook return value
- Stroke play now renders StrokePlayScoreCard for each player with relative-to-par buttons
- Mini StrokePlayLeaderboard component included after score cards
- Updated ScorecardEntryScreen to pass all new props
- Leaderboard sorts by net score with current user highlighting

---

### Step 2.4: Enhance PlayerScoreCard for Stableford
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Enhance the existing PlayerScoreCard to better show Stableford-specific info.

File to modify:
- src/components/scorecard/PlayerScoreCard/PlayerScoreCard.tsx

Changes:
1. Add optional props:
   - runningTotalPoints?: number
   - showPointsPreview?: boolean (default true for stableford)

2. Update header stats to show running total points

3. Add "Points for this score" preview below score controls:
   - Calculate what points the current score would earn
   - Show text like "Points: 2 (Par)" or "Points: 3 (Birdie)"
   - Color-code based on points value

Layout update:
┌────────────────────────────────────────────────────────┐
│  John Smith                              SHOTS   PTS   │
│  HC: 18  |  +1 shot                        1     24    │
├────────────────────────────────────────────────────────┤
│                                                        │
│   [PICK UP]    [-]  [  5  ]  [+]    [PAR]             │
│       P                                                │
│                                                        │
│   Points for this score: 1 (Bogey)                    │
│                                                        │
│   FIR: [ ] Yes  [ ] No    GIR: [ ] Yes  [ ] No       │
└────────────────────────────────────────────────────────┘

Use calculateStablefordPoints from src/utils/scoring.ts
```

**Deliverables:**
- [x] Points preview display
- [x] Running total in header
- [x] Shots received indicator (if not already)

**Dependencies:** None
**Notes:**
- Added `runningTotalPoints` and `showPointsPreview` props to PlayerScoreCard
- Header now shows running total points (previous holes + current) and shots received indicator
- Added points preview section below score controls showing "Points for this score: X (Description)"
- Color-coded points using theme golf colors (eagle/birdie/par/bogey/doubleBogey)
- Added helper functions `getPointsDescription()` and `getPointsColor()`
- Updated ScorecardScoreContent to calculate and pass running total for Stableford games
- Points preview only shows when `showPointsPreview=true` and score is selected (not picked up)

---

## Phase 3: Skins Integration Enhancement

### Step 3.1: Verify Skins Indicator on All Screens
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Ensure SkinsIndicator component is properly integrated into all score entry screen headers.

Files to check and update if needed:
1. src/screens/scoring/ScorecardEntryScreen/components/ScorecardHeader.tsx
   - Verify SkinsIndicator is imported and rendered
   - Pass roundId prop

2. src/screens/scoring/MatchPlayScoringScreen/components/MatchPlayHeader.tsx
   - Verify SkinsIndicator is imported and rendered
   - Pass roundId prop

3. src/screens/scoring/TeamMatchPlayScoringScreen/components/TeamMatchPlayHeader.tsx
   - Add SkinsIndicator (new screen)
   - Pass roundId prop

SkinsIndicator component is at:
- src/components/skins/SkinsIndicator.tsx

It shows:
- Dice icon with amber/gold color
- Badge with carryover count
- Popover on tap with current pot/carryover/last winner
```

**Deliverables:**
- [x] Verify ScorecardHeader has SkinsIndicator
- [x] Verify MatchPlayHeader has SkinsIndicator
- [x] Add SkinsIndicator to TeamMatchPlayHeader

**Dependencies:** Step 1.4
**Notes:**
- All three headers already have SkinsIndicator properly integrated
- ScorecardHeader.tsx (line 16, 114): imports and renders SkinsIndicator with roundId and size="sm"
- MatchPlayHeader.tsx (line 16, 58): imports and renders SkinsIndicator with roundId and size="sm"
- TeamMatchPlayHeader.tsx (line 16, 58): imports and renders SkinsIndicator with roundId and size="sm"
- SkinsIndicator component auto-hides when no active skins game exists for the round
- Displays dice icon with carryover badge and summary popover on tap

---

## Critical Files

### To Modify
| File | Changes |
|------|---------|
| `src/components/scorecard/BestBallScoreView.tsx` | Changed "pts" to "BEST" label |
| `src/components/scorecard/TeamScoreCard.tsx` | Added format badge, running totals |
| `src/components/scorecard/PlayerScoreCard/PlayerScoreCard.tsx` | Add Stableford points preview |
| `src/components/scorecard/index.ts` | Export new components |
| `src/screens/scoring/ScorecardEntryScreen/components/ScorecardScoreContent.tsx` | Add gameType conditional rendering |
| `src/screens/rounds/RoundListScreen/hooks/useRoundActions.ts` | Team Match Play routing |
| `src/screens/rounds/ViewRoundScreen.tsx` | Team Match Play routing |
| `src/screens/competitions/CompetitionDetailScreen.tsx` | Team Match Play routing |
| `src/navigation/RootNavigator.tsx` | Add TeamMatchPlayScoring route |
| `src/navigation/types.ts` | Add TeamMatchPlayScoring params |

### To Create
| File | Purpose |
|------|---------|
| `src/components/scorecard/GameTypeHeader/` | Format-specific status header |
| `src/components/scorecard/StrokePlayScoreCard/` | Stroke play score entry |
| `src/components/scorecard/StrokePlayLeaderboard/` | Running standings |
| `src/screens/scoring/TeamMatchPlayScoringScreen/` | Dedicated team match play screen |

---

## Phase 4: Swipe Gesture Navigation

### Step 4.1: Add Swipe Navigation to MatchPlayScoringScreen
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Add SwipeableHoleNavigator to MatchPlayScoringScreen for swipe gesture hole navigation.

File to modify:
- src/screens/scoring/MatchPlayScoringScreen/index.tsx

Reference the existing implementation in:
- src/screens/scoring/ScorecardEntryScreen/index.tsx (lines 555-561)

Changes:
1. Import SwipeableHoleNavigator from '@/components/scorecard'
2. Create a renderHoleContent callback that renders the content area for any hole
3. Wrap the content area (ScrollView with player cards, VS divider, match progress) with SwipeableHoleNavigator
4. Pass currentHole, totalHoles (18), onHoleChange (setCurrentHole), and enabled props
5. Disable swipe when isSubmitting or isMatchComplete

Key considerations:
- The content for each hole needs to recalculate based on the holeNumber parameter
- HoleHeader should be inside the swipeable content
- Match status bar should remain outside (static)
- Footer should remain outside (static)

Layout structure:
┌─────────────────────────────────────────┐
│ MatchPlayHeader (static)                │
├─────────────────────────────────────────┤
│ Match Status Bar (static)               │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ SwipeableHoleNavigator              │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ HoleHeader                      │ │ │
│ │ │ ScrollView                      │ │ │
│ │ │   - PlayerScoreCard x 2         │ │ │
│ │ │   - VS Divider                  │ │ │
│ │ │   - Hole Result                 │ │ │
│ │ │   - Match Progress              │ │ │
│ │ └─────────────────────────────────┘ │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ MatchPlayFooter (static)                │
└─────────────────────────────────────────┘
```

**Deliverables:**
- [x] SwipeableHoleNavigator wrapping content area
- [x] renderHoleContent callback for dynamic hole rendering
- [x] Swipe disabled during submission and when match complete

**Dependencies:** None (SwipeableHoleNavigator already exists)
**Notes:**
- Imported SwipeableHoleNavigator from '@/components/scorecard'
- Created `renderHoleContent` callback with `getHoleData` and `getHoleResult` helpers
- Match status bar remains static outside SwipeableHoleNavigator
- Footer remains static outside SwipeableHoleNavigator
- Swipe gestures disabled when `isSubmitting` or `isMatchComplete`
- Moved `handlePlayer1Press`/`handlePlayer2Press` callbacks before `renderHoleContent` for proper dependency order
- Updated `getScoreColor` to accept optional `par` parameter for dynamic hole rendering
- Added new `scrollContent` style for inner ScrollView

---

### Step 4.2: Add Swipe Navigation to TeamMatchPlayScoringScreen
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Add SwipeableHoleNavigator to TeamMatchPlayScoringScreen for swipe gesture hole navigation.

File to modify:
- src/screens/scoring/TeamMatchPlayScoringScreen/index.tsx

Reference the existing implementation in:
- src/screens/scoring/ScorecardEntryScreen/index.tsx (lines 555-561)
- Step 4.1 implementation for MatchPlayScoringScreen

Changes:
1. Import SwipeableHoleNavigator from '@/components/scorecard'
2. Create a renderHoleContent callback that renders the content area for any hole
3. Wrap the content area (ScrollView with team panels, VS divider, match progress) with SwipeableHoleNavigator
4. Pass currentHole, totalHoles (18), onHoleChange (setCurrentHole), and enabled props
5. Disable swipe when isSubmitting or isMatchComplete

Key considerations:
- Team scores need to recalculate for the rendered hole
- Best contributor needs to recalculate for the rendered hole
- HoleHeader should be inside the swipeable content
- Match status bar and holes won bar should remain outside (static)
- Footer should remain outside (static)

Layout structure:
┌─────────────────────────────────────────┐
│ TeamMatchPlayHeader (static)            │
├─────────────────────────────────────────┤
│ Match Status Bar (static)               │
├─────────────────────────────────────────┤
│ Holes Won Bar (static)                  │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ SwipeableHoleNavigator              │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ HoleHeader                      │ │ │
│ │ │ ScrollView                      │ │ │
│ │ │   - TeamScorePanel x 2          │ │ │
│ │ │   - VS Divider                  │ │ │
│ │ │   - Hole Result                 │ │ │
│ │ │   - TeamMatchProgress           │ │ │
│ │ └─────────────────────────────────┘ │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ TeamMatchPlayFooter (static)            │
└─────────────────────────────────────────┘
```

**Deliverables:**
- [x] SwipeableHoleNavigator wrapping content area
- [x] renderHoleContent callback for dynamic hole rendering
- [x] Swipe disabled during submission and when match complete

**Dependencies:** Step 4.1
**Notes:**
- Imported SwipeableHoleNavigator from '@/components/scorecard'
- Created helper functions for dynamic hole rendering:
  - `getHoleData` - returns hole data for any hole number
  - `getHoleResult` - returns TeamHoleResult for any hole number
  - `getPlayerScoreForHole` - returns player score for any hole (dynamic version)
  - `getTeamBestScoreForHole` - returns team's best score for any hole
  - `getBestContributorForHole` - returns best contributor player ID for any hole
  - `getHoleWinnerForHole` - determines winner for any hole
  - `getHoleResultDisplay` - returns display text/color for hole result
- Created `renderHoleContent` callback that dynamically calculates all values for the given hole
- Match status bar and holes won bar remain static (outside SwipeableHoleNavigator)
- Footer remains static (outside SwipeableHoleNavigator)
- Swipe gestures disabled when `isSubmitting` or `isMatchComplete`
- Added `scrollContent` style for inner ScrollView

---

## Phase 5: Automated Tests

### Step 5.1: Unit Tests for Team Match Play Calculations
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create unit tests for team match play calculation utilities.

File to create:
- src/screens/scoring/TeamMatchPlayScoringScreen/utils/teamMatchPlayCalculations.test.ts

Test the following functions from ./index.ts:
1. determineTeamHoleWinner(team1Score, team2Score)
   - Team 1 wins when lower score
   - Team 2 wins when lower score
   - Halved when scores equal
   - null when either score is null

2. calculateTeamMatchStatus(holeResults)
   - All square when tied
   - Team up with X to play
   - Complete when lead exceeds remaining holes (dormie)
   - Complete when all 18 holes played

3. getTeamMatchStatusText(status, team1Name, team2Name)
   - "All Square" format
   - "Team A 2 UP with 5 to play" format
   - "Team A wins 3&2" format
   - "Team B wins 1 UP" format

4. getTeamMatchStatusDisplay(status, team)
   - Returns correct status per team
   - Handles winning/losing/tied states

5. getBestContributor(team, holeNumber, getPlayerScore)
   - Returns player ID with lowest score
   - Returns null if no scores

6. countHolesWon(holeResults)
   - Counts team1, team2, halved correctly
```

**Deliverables:**
- [x] Test file with comprehensive coverage
- [x] Edge cases for null/undefined scores
- [x] Dormie/early finish scenarios
- [x] All 18 hole scenarios

**Dependencies:** None
**Notes:**
- Created test file at `src/screens/scoring/TeamMatchPlayScoringScreen/utils/teamMatchPlayCalculations.test.ts`
- 57 tests covering all utility functions
- Tests include: calculateTeamBestScore, determineTeamHoleWinner, calculateTeamMatchStatus, getTeamMatchStatusText, getTeamMatchStatusDisplay, countHolesWon, getBestPlayerScore, getBestContributor
- Includes integration/scenario tests for complete matches, comebacks, and edge cases

---

### Step 5.2: Unit Tests for Stroke Play Score Card Calculations
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create unit tests for stroke play score card utility functions.

File to create:
- src/components/scorecard/StrokePlayScoreCard/StrokePlayScoreCard.test.tsx

Test the following:
1. getRelativeToPar(strokes, par) - if exists as utility
   - Returns correct relative value (e.g., -2 for eagle on par 4)
   - Handles edge cases

2. getScoreDescription(relativeToPar)
   - "Eagle" for -2
   - "Birdie" for -1
   - "Par" for 0
   - "Bogey" for +1
   - "Double Bogey" for +2
   - "Triple Bogey" for +3

3. Component rendering tests:
   - Renders player name and handicap
   - Shows running gross/net totals
   - Renders relative-to-par buttons
   - Shows "MORE" button for extended scores
   - Score color coding (eagle=dark green, birdie=green, etc.)
   - Shots received badge when applicable

4. Interaction tests:
   - Button presses update score correctly
   - MORE modal opens/closes
   - Pick up functionality works
   - Stats row toggles (FIR/GIR)
```

**Deliverables:**
- [x] Component test file
- [x] Rendering tests for all states
- [x] Interaction tests for score selection
- [x] Color coding validation

**Dependencies:** None
**Notes:**
- Created test file at `src/components/scorecard/StrokePlayScoreCard/StrokePlayScoreCard.test.tsx`
- 46 tests covering component rendering and interactions
- Test categories: Basic Rendering, Running Totals Display, Relative-to-Par Buttons, Score Button Interactions, Current Score Display, Pick Up Functionality, Shots Received Indicator, MORE Modal, Player Press Handler, Accessibility, Edge Cases, Par Variations

---

### Step 5.3: Unit Tests for Individual Match Play Calculations
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create unit tests for individual match play calculation utilities.

File to create:
- src/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations.test.ts

Test the following functions from ./index.ts:
1. determineHoleWinner(player1Score, player2Score)
   - player1 wins when lower score
   - player2 wins when lower score
   - halved when scores equal
   - null when either score is null

2. calculateMatchStatus(holeResults)
   - All square when tied
   - Player up with X to play
   - Complete when lead exceeds remaining holes (dormie)
   - Complete when all 18 holes played
   - Handles picked up scenarios

3. getMatchStatusText(status, player1Name, player2Name)
   - "All Square" format
   - "John 2 UP with 5 to play" format
   - "John wins 3&2" format
   - "Mike wins 1 UP" format

4. getPlayerMatchStatus(status, player)
   - Returns correct status per player
   - UP/DOWN/AS indicators
```

**Deliverables:**
- [x] Test file with comprehensive coverage
- [x] Pick up/concede scenarios
- [x] Early finish (dormie) tests
- [x] Edge cases

**Dependencies:** None
**Notes:**
- Created test file at `src/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations.test.ts`
- 48 tests covering all utility functions
- Test categories: determineHoleWinner (basic scoring, null handling, edge cases), calculateMatchStatus (initial state, in progress, early finish, full 18 holes, incomplete holes, picked up scenarios), getMatchStatusText (in progress and complete), getPlayerMatchStatus (all states)
- Includes integration/scenario tests for complete matches, comebacks, dormie situations, and pick up to concede

---

### Step 5.4: Integration Tests for Navigation Routing
**Status:** ✅ Complete
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create integration tests for score entry screen navigation routing.

File to create:
- src/__tests__/navigation/scoreEntryRouting.test.tsx

Test the routing logic in these files:
- src/screens/rounds/RoundListScreen/hooks/useRoundActions.ts
- src/screens/rounds/ViewRoundScreen.tsx
- src/screens/competitions/CompetitionDetailScreen.tsx

Test scenarios:
1. Match Play (individual) routes to MatchPlayScoring
   - gameType = 'match-play'
   - isTeamRound = false
   - Verify navigation.navigate called with 'MatchPlayScoring'

2. Team Match Play routes to TeamMatchPlayScoring
   - gameType = 'match-play'
   - isTeamRound = true
   - Verify navigation.navigate called with 'TeamMatchPlayScoring'

3. Stroke Play routes to Scorecard
   - gameType = 'stroke'
   - Verify navigation.navigate called with 'Scorecard'

4. Stableford routes to Scorecard
   - gameType = 'stableford'
   - Verify navigation.navigate called with 'Scorecard'

5. Team formats (Best Ball, Scramble) route to Scorecard
   - teamFormat = 'best-ball' or 'scramble'
   - Verify navigation.navigate called with 'Scorecard'

Mock requirements:
- Mock useNavigation from @react-navigation/native
- Mock round data with different game types
- Mock team format variations
```

**Deliverables:**
- [x] Integration test file
- [x] All game type routing scenarios
- [x] Team format routing scenarios
- [x] Verify correct params passed to navigation

**Dependencies:** None
**Notes:**
- Created test file at `src/__tests__/navigation/scoreEntryRouting.test.tsx`
- 34 tests covering all routing scenarios
- Test categories:
  - useRoundActions hook tests: Match Play routing (4 tests), Stroke Play routing (2 tests), Stableford routing (2 tests), Completed round routing (3 tests), Standalone rounds (1 test)
  - Pure routing logic unit tests: Game type variations (6 tests), Status variations (9 tests), Edge cases (3 tests)
  - Navigation params tests: Verifies correct params for each screen type (4 tests)
- Mocks navigation, useAuth, React Query, and Supabase

---

## Verification

### Manual Testing
- [ ] Create a Best Ball round and verify best score shows "BEST" label
- [ ] Create a Scramble round and verify SCRAMBLE badge and team totals display
- [ ] Create a Team Match Play round and verify it routes to new screen
- [ ] Create a Stroke Play round and verify relative-to-par buttons work
- [ ] Create a Stableford round and verify points preview displays
- [ ] Verify skins indicator appears on all score entry screens
- [ ] Test offline scoring on all formats
- [ ] Verify scores persist and sync correctly
- [ ] Test swipe gesture navigation on MatchPlayScoringScreen
- [ ] Test swipe gesture navigation on TeamMatchPlayScoringScreen
- [ ] Verify swipe is disabled when match is complete

### Automated Tests
- [ ] Run: pnpm test src/screens/scoring/TeamMatchPlayScoringScreen/utils
- [ ] Run: pnpm test src/components/scorecard/StrokePlayScoreCard
- [ ] Run: pnpm test src/screens/scoring/MatchPlayScoringScreen/utils
- [ ] Run: pnpm test src/__tests__/navigation/scoreEntryRouting
