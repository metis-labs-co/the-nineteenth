# Teams and Multiple Game Types - Implementation Plan

**Goal:** Add team support and multiple game types (Match Play, Scramble, Best Ball) to enable mixed-format competitions
**Status:** 🔄 In Progress - 96% Complete (23/24 tasks)

---

## Overview

This plan extends the existing competition system to support:
- **Teams**: Auto-generated balanced teams (2-4 players) with organizer adjustment
- **Team Scope**: Flexible - fixed teams for competition OR per-round teams
- **Multiple Game Types**: Stableford, Stroke Play, Match Play, Best Ball, Scramble
- **Points System**: Convert all round results to competition points for unified leaderboards

### Example Competition
- Round 1: Individual Stableford → points based on position
- Round 2: Team Match Play (2v2 best ball) → team gets points for win/draw/loss
- Round 3: Team Scramble → teams compete, points based on position

---

## Sprint 1: Database Foundation

### Task 1: Database Migration - Teams and Game Types Schema
**Status:** ✅ Complete
**Command:**
```bash
/db "Create migration for teams and multiple game types. New tables: (1) teams table with id, competition_id FK, name, created_at, updated_at, unique constraint on (competition_id, name). (2) team_members join table with team_id FK, player_id FK, joined_at, composite PK. (3) round_results table with id, round_id FK, player_id FK nullable, team_id FK nullable, raw_score, raw_result_data JSONB, position, competition_points, is_team_result boolean, check constraint ensuring either player_id OR team_id is set. Alter competitions table: add team_mode ('none'|'fixed'|'per-round'), team_size (2-4), point_system JSONB with default position-based rules. Alter rounds table: add is_team_round boolean, team_format ('best-ball'|'scramble'|'aggregate'|'match-play-team'). Include indexes, RLS policies (organizers manage, players view), and updated_at triggers."
```
**Deliverables:**
- [x] `supabase/migrations/20250122000000_teams_and_game_types.sql`
- [x] `teams` table with RLS policies
- [x] `team_members` join table with RLS policies
- [x] `round_results` table with RLS policies
- [x] `competitions` table alterations (team_mode, team_size, point_system)
- [x] `rounds` table alterations (is_team_round, team_format)
- [x] Indexes for team lookups and round results
- [x] Updated_at triggers for new tables
- [x] Helper functions: `get_team_with_members`, `get_competition_team_standings`, `get_competition_individual_standings`

**Dependencies:** None
**Completed:** 2025-12-08

---

### Task 2: TypeScript Types - Teams and Results
**Status:** ✅ Complete
**Command:**
```bash
/component "Create TypeScript types for teams and game type scoring. File: src/types/teams.ts. Types needed: (1) TeamMode = 'none' | 'fixed' | 'per-round'. (2) TeamFormat = 'best-ball' | 'scramble' | 'aggregate' | 'match-play-team'. (3) Team interface with id, competitionId, name, members array, timestamps. (4) TeamMember interface with teamId, playerId, player reference, joinedAt. (5) PointSystemConfig interface with type ('position'|'custom'), rules (position to points mapping), matchPlay (win/draw/loss points). (6) RoundResult interface with id, roundId, playerId/teamId (one nullable), rawScore, rawResultData, position, competitionPoints, isTeamResult. (7) MatchPlayResult interface with opponentId, holesWon/Lost/Halved, matchResult enum, holeByHole array. (8) TeamScorecard interface for team formats. Update src/types/index.ts to export all new types."
```
**Deliverables:**
- [x] `src/types/database.types.ts` updated with all team-related types
- [x] TeamMode, TeamFormat type aliases
- [x] Team, TeamWithMembers, TeamMember interfaces
- [x] PointSystemConfig interface with DEFAULT_POINT_SYSTEM constant
- [x] RoundResult interface
- [x] RoundResultData, MatchPlayHoleResult interfaces
- [x] TeamStandingsEntry, IndividualStandingsEntry interfaces
- [x] Competition interface updated with team_mode, team_size, point_system
- [x] Round interface updated with is_team_round, team_format
- [x] Database interface updated with teams, team_members, round_results tables and new functions

**Dependencies:** Task 1 (database schema)
**Completed:** 2025-12-08

---

## Sprint 2: Scoring Algorithms

### Task 3: Team Scoring Utilities
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Create team scoring utilities in src/utils/teamScoring.ts. Functions: (1) calculateBestBallHole(teamScores, hole) - returns best net score among team members and contributing player ID. (2) calculateScrambleHole(teamScore, teamHandicap, hole) - applies team handicap to single team score. (3) calculateTeamHandicap(teamMembers, teamSize) - for 2-person use 35% low + 15% high, for 3-4 person use average/teamSize. (4) calculateMatchPlayHoleResult(score1, score2, hole) - returns holeNumber, playerScore, opponentScore, result ('won'|'lost'|'halved'). (5) calculateMatchPlayMatchResult(holeResults) - returns holesWon, holesLost, holesHalved, matchResult including early finish detection (dormie). Import existing functions from scoring.ts (calculateNetScore, getStrokesOnHole). Include JSDoc comments and unit test examples."
```
**Deliverables:**
- [x] `src/utils/teamScoring.ts`
- [x] `calculateBestBallHole()` - best team score per hole
- [x] `calculateScrambleHole()` - team handicap application
- [x] `calculateTeamHandicap()` - combined handicap formula
- [x] `calculateMatchPlayHoleResult()` - single hole result
- [x] `calculateMatchPlayMatchResult()` - overall match result with early finish
- [x] JSDoc documentation with unit test examples
- [x] Helper functions: `calculateMatchPlayHoleResultWithHandicaps()`, `formatMatchPlayScore()`
- [x] Export from `src/utils/index.ts`

**Dependencies:** Task 2 (types)
**Completed:** 2025-12-08

---

### Task 4: Competition Points System
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Create competition points utilities in src/utils/competitionPoints.ts. Functions: (1) calculateCompetitionPoints(results, gameType, pointSystem) - sort results by raw score (desc for Stableford, asc for Stroke), assign positions with tie handling, return array with position and competition points from pointSystem rules. (2) calculateMatchPlayPoints(matchResult, pointSystem) - return points for win/draw/loss from pointSystem.matchPlay config. (3) aggregateCompetitionStandings(roundResults) - group by participant (player or team), sum competition points across rounds, return sorted standings with totalPoints and roundsPlayed. Handle both individual and team results. Include TypeScript generics for flexibility."
```
**Deliverables:**
- [x] `src/utils/competitionPoints.ts`
- [x] `calculateCompetitionPoints()` - position-based points with tie handling (averaged points)
- [x] `calculateMatchPlayPoints()` - match result to points
- [x] `aggregateCompetitionStandings()` - overall standings with per-round breakdown
- [x] Tie handling logic with position sharing
- [x] Support for mixed individual/team results via TypeScript generics
- [x] Default point systems: `STANDARD_POINT_SYSTEM`, `LEAGUE_POINT_SYSTEM`
- [x] Full type definitions: `PointSystemRules`, `RoundResult`, `ScoredResult`, `MatchResult`, `StandingsEntry`
- [x] Export from `src/utils/index.ts`

**Dependencies:** Task 2 (types), Task 3 (team scoring)
**Completed:** 2025-12-08

---

### Task 5: Team Generation Algorithm
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Create team generation utilities in src/utils/teamGeneration.ts. Functions: (1) generateBalancedTeams(players, config) - use snake draft by handicap for balanced teams. Config includes teamSize (2-4) and balanceByHandicap boolean. Sort players by handicap, assign to teams using snake pattern (1-2-3-4, 8-7-6-5, 9-10-11-12...). Return array of {name: 'Team N', members: Player[]}. (2) getTeamStats(team) - calculate avgHandicap, totalHandicap, lowestHandicap, highestHandicap for display. Handle edge cases: uneven player counts, players without handicaps (default to 0). Generate team names as 'Team 1', 'Team 2', etc."
```
**Deliverables:**
- [x] `src/utils/teamGeneration.ts`
- [x] `generateBalancedTeams()` - snake draft algorithm
- [x] `getTeamStats()` - team handicap statistics
- [x] Handle uneven player counts
- [x] Handle missing handicaps (default 0)
- [x] Export from `src/utils/index.ts`

**Dependencies:** Task 2 (types)
**Completed:** 2025-12-08

---

## Sprint 3: Services Layer

### Task 6: Team Service
**Status:** ✅ Complete
**Command:**
```bash
/hook "Create team service in src/services/teams/teamService.ts. Functions: (1) createTeam(competitionId, name, memberIds) - insert team, then insert team_members, return Team with members. (2) getCompetitionTeams(competitionId) - select teams with team_members joined to players, return Team[] with full player data. (3) updateTeamMembers(teamId, memberIds) - delete existing members, insert new members. (4) deleteTeam(teamId) - cascade delete team and members. (5) autoGenerateTeams(competitionId, teamSize) - fetch competition players, call generateBalancedTeams, create teams in DB, return created Team[]. All functions use Supabase client, handle errors with descriptive messages, and follow existing service patterns."
```
**Deliverables:**
- [x] `src/services/teams/teamService.ts`
- [x] `createTeam()` - create team with members
- [x] `getCompetitionTeams()` - fetch teams with players
- [x] `updateTeamMembers()` - modify team membership
- [x] `deleteTeam()` - remove team
- [x] `autoGenerateTeams()` - auto-create balanced teams
- [x] `src/services/teams/index.ts` barrel export
- [x] Error handling with typed errors (`TeamServiceError`)
- [x] `getTeamWithMembers()` - fetch single team with members
- [x] `updateTeamName()` - update team name

**Dependencies:** Task 5 (team generation), Task 1 (database)
**Completed:** 2025-12-08

---

### Task 7: Round Results Service
**Status:** ✅ Complete
**Command:**
```bash
/hook "Create round results service in src/services/rounds/roundResultsService.ts. Functions: (1) saveRoundResults(roundId, results) - insert round_results records, handle both player and team results. (2) getRoundResults(roundId) - select round_results with player and team joins, order by position. (3) getCompetitionResults(competitionId) - select all round_results for competition via rounds join, include round info (round_number, game_type). (4) finalizeRound(roundId, scorecards, gameType, pointSystem) - calculate raw scores from scorecards based on gameType, call calculateCompetitionPoints to assign positions and points, call saveRoundResults. Handle Stableford (sum points), Stroke (sum gross/net), Match Play (win/loss result)."
```
**Deliverables:**
- [x] `src/services/rounds/roundResultsService.ts`
- [x] `saveRoundResults()` - persist round results (with re-finalization support)
- [x] `getRoundResults()` - fetch round results with player/team joins
- [x] `getCompetitionResults()` - fetch all competition results grouped by round
- [x] `finalizeRound()` - calculate scores and competition points from scorecards
- [x] Support for all game types (Stableford, Stroke, Match Play, Best Ball, Ambrose)
- [x] `finalizeTeamRound()` - team-specific finalization
- [x] `deleteRoundResults()` - utility to delete results
- [x] `isRoundFinalized()` - check if round has results
- [x] `src/services/rounds/index.ts` barrel export
- [x] Typed errors (`RoundResultsServiceError`)

**Dependencies:** Task 4 (competition points), Task 1 (database)
**Completed:** 2025-12-08

---

## Sprint 4: React Query Hooks

### Task 8: Team Hooks
**Status:** ✅ Complete
**Command:**
```bash
/hook "Create TanStack Query hooks for teams in src/hooks/useTeams.ts. Hooks: (1) useTeams(competitionId) - query hook fetching teams via getCompetitionTeams, staleTime 5min. (2) useCreateTeam() - mutation calling createTeam, invalidates ['teams', competitionId]. (3) useUpdateTeam() - mutation for updateTeamMembers, invalidates team queries. (4) useDeleteTeam() - mutation for deleteTeam, invalidates and removes from cache. (5) useAutoGenerateTeams() - mutation calling autoGenerateTeams, shows loading state, invalidates on success. All hooks follow existing patterns in useCompetitions.ts, include proper error handling, and export from src/hooks/index.ts."
```
**Deliverables:**
- [x] `src/hooks/useTeams.ts`
- [x] `useTeams()` - fetch teams query (5min staleTime, enabled when competitionId provided)
- [x] `useCreateTeam()` - create team mutation with cache invalidation
- [x] `useUpdateTeam()` - update team mutation with cache invalidation
- [x] `useDeleteTeam()` - delete team mutation with cache removal
- [x] `useAutoGenerateTeams()` - generate teams mutation with cache invalidation
- [x] Query key definitions in `src/hooks/queryKeys.ts` (`teamKeys`)
- [x] Export from `src/hooks/index.ts`
- [x] JSDoc documentation with usage examples

**Dependencies:** Task 6 (team service)
**Completed:** 2025-12-08

---

### Task 9: Competition Leaderboard Hook
**Status:** ✅ Complete
**Command:**
```bash
/hook "Create useCompetitionLeaderboard hook in src/hooks/useCompetitionLeaderboard.ts. This replaces the existing useLeaderboard for competitions with teams. Returns CompetitionLeaderboardEntry[] with: participantId, participantName, isTeam, totalPoints (competition points), roundsPlayed, position, handicap (for individuals), teamMembers (for teams). Fetch all round_results for competition, call aggregateCompetitionStandings, enrich with player/team names. Sort by totalPoints descending, assign positions with tie handling. Configure staleTime 30s, auto-refetch interval optional. Support filtering by individual vs team standings."
```
**Deliverables:**
- [x] `src/hooks/useCompetitionLeaderboard.ts`
- [x] `CompetitionLeaderboardEntry` interface
- [x] `useCompetitionLeaderboard(competitionId)` hook
- [x] Individual standings support
- [x] Team standings support
- [x] Tie handling with position calculation
- [x] Query key in `src/hooks/queryKeys.ts` (`leaderboardKeys.competition`)
- [x] `LeaderboardFilter` type ('all' | 'individuals' | 'teams')
- [x] `UseCompetitionLeaderboardOptions` with autoRefresh, refetchInterval
- [x] Exported from `src/hooks/index.ts`

**Dependencies:** Task 7 (round results service), Task 4 (competition points)
**Completed:** 2025-12-08

---

### Task 10: Round Leaderboard Hook
**Status:** ✅ Complete
**Command:**
```bash
/hook "Create useRoundLeaderboard hook in src/hooks/useRoundLeaderboard.ts. Format-specific leaderboard for individual rounds. Returns RoundLeaderboardEntry[] with format-specific data: for Stableford return totalPoints, for Stroke return grossScore/netScore, for Match Play return matchResult/holesUpDown/opponent. Fetch round_results for roundId, join player/team data, format based on round.game_type. Include round metadata (game_type, is_team_round, team_format) in response."
```
**Deliverables:**
- [x] `src/hooks/useRoundLeaderboard.ts`
- [x] `RoundLeaderboardEntry` interface (format-specific union type)
- [x] `useRoundLeaderboard(roundId)` hook
- [x] Stableford format (`StablefordScoreData` - totalPoints)
- [x] Stroke format (`StrokeScoreData` - grossScore/netScore)
- [x] Match Play format (`MatchPlayScoreData` - matchResult, holesUpDown, opponent)
- [x] Team format support (`TeamScoreData`)
- [x] `RoundMetadata` interface with game_type, is_team_round, team_format
- [x] Type guards: `isPlayerEntry`, `isTeamEntry`, `isStablefordScore`, etc.
- [x] Query key in `src/hooks/queryKeys.ts` (`leaderboardKeys.round`)
- [x] Exported from `src/hooks/index.ts`

**Dependencies:** Task 7 (round results service)
**Completed:** 2025-12-08

---

## Sprint 5: Team Management UI

### Task 11: Team Card Component
**Status:** ✅ Complete
**Command:**
```bash
/component "TeamCard - Display team with members and stats. Props: team (Team), isEditable (boolean), onEdit (function), onDelete (function). Show team name (editable via inline TextInput if isEditable), member list with Avatar, name, and handicap for each. Display team stats: average handicap badge, total handicap. Expandable/collapsible member details. Edit button (pencil icon) and Delete button (trash icon) if isEditable. Use React Native Paper Card, List.Item, Avatar, IconButton. Follow existing PlayerCard patterns from CompetitionDetailScreen. Include accessibility labels."
```
**Deliverables:**
- [x] `src/components/teams/TeamCard.tsx`
- [x] Team name display (editable when allowed via inline TextInput)
- [x] Member list with avatars and handicaps (`MemberRow` component)
- [x] Average handicap badge and Total handicap badge
- [x] Expand/collapse for member details (with LayoutAnimation)
- [x] Edit and Delete buttons (pencil/trash icons via IconButton)
- [x] React Native Paper components (Card, Avatar, IconButton, Divider)
- [x] Accessibility labels on all interactive elements
- [x] `src/components/teams/index.ts` barrel export
- [x] `TeamCardProps` interface exported
- [x] Theme-aware styling via `useThemeColors`
- [x] `onNameChange` callback for inline editing
- [x] `onPress` callback for navigation

**Dependencies:** Task 2 (types)
**Completed:** 2025-12-08

---

### Task 12: Team Formation UI Component
**Status:** ✅ Complete
**Command:**
```bash
/component "TeamFormationUI - Team creation and editing interface. Props: competitionId, players (Player[]), existingTeams (Team[]), teamSize (2-4), onSave (teams) => void, onCancel. Features: (1) 'Auto-Generate Teams' button that calls useAutoGenerateTeams, shows loading. (2) Display generated/existing teams as list of TeamCards. (3) Allow manual member swapping - tap player in one team, then tap player in another to swap. (4) Handicap balance indicator showing team handicap spread (good/fair/poor). (5) 'Save Teams' and 'Reset' buttons. Use React Native Paper Button, Surface. Show empty state if no players. Validate all players assigned before save."
```
**Deliverables:**
- [x] `src/components/teams/TeamFormationUI/TeamFormationUI.tsx`
- [x] Auto-generate teams button with loading state
- [x] Team list display using TeamFormationCard
- [x] Player swap functionality (tap-to-swap with visual feedback)
- [x] Handicap balance indicator (good/fair/poor with spread calculation)
- [x] Save and Reset buttons
- [x] Validation (all players assigned)
- [x] Empty state handling (no players, no teams)

**Dependencies:** Task 11 (TeamCard), Task 8 (useTeams hooks)
**Completed:** 2025-12-08

---

### Task 13: Team Management Screen
**Status:** ✅ Complete
**Command:**
```bash
/screen "TeamManagementScreen - Full screen for managing competition teams. Route params: competitionId. Fetch competition players and existing teams. Display TeamFormationUI component for team creation/editing. Header with back button and 'Manage Teams' title. Show loading state while fetching. Error state with retry. Success feedback on save (snackbar). Navigate back on successful save. Add to RootStackParamList in navigation/types.ts. Register in RootNavigator."
```
**Deliverables:**
- [x] `src/screens/admin/TeamManagementScreen.tsx`
- [x] Fetch competition players and teams (useTeamManagementData hook)
- [x] TeamFormationUI integration
- [x] Loading, error, success states
- [x] Navigation setup in `src/navigation/types.ts` (TeamManagement route)
- [x] Navigation registered in `src/navigation/RootNavigator.tsx`
- [x] Back navigation on save
- [x] Snackbar feedback (success/error)
- [x] Custom Header component with back button and subtitle

**Dependencies:** Task 12 (TeamFormationUI), Task 8 (useTeams)
**Completed:** 2025-12-08

---

### Task 14: Teams Tab in CompetitionDetailScreen
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Add Teams tab to CompetitionDetailScreen. Modify src/screens/admin/CompetitionDetailScreen.tsx: (1) Add 'teams' to TabValue type. (2) Add Teams tab button between Players and Leaderboard in tab bar. (3) Create TeamsTab component showing team list using TeamCard components. (4) Show 'Manage Teams' button for organizers that navigates to TeamManagementScreen. (5) Show empty state if team_mode is 'none' with message 'This competition doesn't use teams'. (6) Show team count badge on tab. Fetch teams using useTeams hook."
```
**Deliverables:**
- [x] Update `TabValue` type to include 'teams' (line 50)
- [x] Add Teams tab button to tab bar (lines 431-448)
- [x] `TeamsTab` component with team list (lines 1023-1109)
- [x] 'Manage Teams' button for organizers (lines 1062-1076)
- [x] Empty state for non-team competitions (team_mode === 'none')
- [x] Team count badge on tab (dynamic color based on active state)
- [x] useTeams integration (lines 267-271)
- [x] Loading state handling for teams
- [x] Navigation to TeamManagementScreen via handleManageTeams

**Dependencies:** Task 11 (TeamCard), Task 8 (useTeams)
**Completed:** 2025-12-08

---

## Sprint 6: Competition Setup Changes

### Task 15: Team Settings Step in CreateCompetitionScreen
**Status:** ✅ Complete
**Command:**
```bash
/screen "Add Team Settings step to CreateCompetitionScreen wizard. Insert as Step 2 (shift existing steps). Create TeamSettingsStep component with: (1) Team Mode selector - SegmentedButtons for 'No Teams', 'Fixed Teams', 'Per-Round Teams' with descriptions. (2) Team Size selector (if teams enabled) - chips for 2, 3, 4 players per team. (3) Point System preview showing default position-based points table. (4) 'Customize Points' expandable section for advanced users to modify point values. Store team_mode, team_size, point_system in wizard state. Update step numbers (now 5 steps total). Validate selections before proceeding."
```
**Deliverables:**
- [x] `src/components/competition/create/TeamSettingsStep.tsx`
- [x] Team mode selector (none/fixed/per-round) with SegmentedButtons and descriptions
- [x] Team size selector (2/3/4) with chips
- [x] Point system preview (shows first 5 positions)
- [x] Customize points section (expandable with reset button)
- [x] React Hook Form integration with Zod validation
- [x] Sticky footer with Back/Next buttons
- [x] LayoutAnimation for smooth transitions

**Dependencies:** Task 2 (types)
**Completed:** 2025-12-09

---

### Task 16: Game Type Selector Component
**Status:** ✅ Complete
**Command:**
```bash
/component "GameTypeSelector - Radio button group for selecting game type. Props: value (GameType), onChange (GameType) => void, teamMode (TeamMode), disabled (boolean). Show individual game types: Stableford, Stroke Play, Match Play (individual). If teamMode is not 'none', also show team game types: Team Best Ball, Team Scramble, Team Match Play. Use React Native Paper RadioButton.Group with RadioButton.Item. Each option shows name and brief description. Disable team options if teamMode is 'none'. Highlight currently selected option."
```
**Deliverables:**
- [x] `src/components/competition/create/GameTypeSelector.tsx`
- [x] Individual game type options (Stableford, Stroke Play, Match Play)
- [x] Team game type options (Team Best Ball, Team Scramble)
- [x] RadioButton.Group implementation with custom styled cards
- [x] Option descriptions and icons
- [x] Disabled state handling with "Enable teams first" badge
- [x] Selected state highlighting with checkmark
- [x] Full accessibility support (labels, hints, roles)

**Dependencies:** Task 2 (types)
**Completed:** 2025-12-09

---

### Task 17: Update AddRoundScreen with Game Type Selection
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Update AddRoundScreen to support game type and team round selection. Modifications: (1) Add GameTypeSelector component after course selection. (2) Add 'Team Round' toggle switch (shown only if competition.team_mode is not 'none'). (3) Add TeamFormatSelector (Best Ball, Scramble, Match Play) when team round is enabled. (4) Update form state to include game_type, is_team_round, team_format. (5) Pass new fields to createRound mutation. (6) Update validation - team format required when team round enabled. (7) Show team pairing preview if team round selected."
```
**Deliverables:**
- [x] Add GameTypeSelector to AddRoundScreen
- [x] 'Team Round' toggle (conditional)
- [x] TeamFormatSelector component (new)
- [x] Update form state and validation
- [x] Pass team fields to createRound
- [x] Team pairing preview (optional)

**Dependencies:** Task 16 (GameTypeSelector)
**Completed:** 2025-12-09

---

## Sprint 7: Leaderboard Updates

### Task 18: Team Leaderboard Table Component
**Status:** ✅ Complete
**Command:**
```bash
/component "TeamLeaderboardTable - Display team standings similar to LeaderboardTable. Props: leaderboard (TeamLeaderboardEntry[]), isLoading (boolean), currentUserId (string). Columns: Position (with trophy for 1st), Team Name, Avg HC, Points. Rows expandable to show team members with individual stats. Highlight row if currentUserId is member of team. Tie indicator ('T' suffix on position). Empty state message. Loading state with skeleton. Follow existing LeaderboardTable patterns from src/components/competition/LeaderboardTable.tsx."
```
**Deliverables:**
- [x] `src/components/competition/TeamLeaderboardTable.tsx`
- [x] Position, Team Name, Avg HC, Points columns
- [x] Expandable rows for team members with LayoutAnimation
- [x] Current user highlighting (checks team membership)
- [x] Trophy icon for 1st place (IconTrophy)
- [x] Tie indicator ('T' suffix on position)
- [x] Loading state with ActivityIndicator
- [x] Empty state with IconChartBar and custom message
- [x] Member count display and individual member stats
- [x] Full accessibility support

**Dependencies:** Task 9 (useCompetitionLeaderboard)
**Completed:** 2025-12-09

---

### Task 19: Round Leaderboard Component
**Status:** ✅ Complete
**Command:**
```bash
/component "RoundLeaderboard - Format-specific leaderboard display. Props: roundId (string), gameType (GameType), isTeamRound (boolean). Renders different layouts based on gameType: (1) Stableford/Stroke: table with Position, Name, Score columns. (2) Match Play: bracket-style or list showing matchups with results (e.g., 'Player A def. Player B 3&2'). Use useRoundLeaderboard hook. Show round info header (game type badge, date). Handle team rounds by showing team names. Loading and error states."
```
**Deliverables:**
- [x] `src/components/leaderboard/RoundLeaderboard/RoundLeaderboard.tsx`
- [x] Stableford/Stroke format (TableLeaderboard component with Position, Name, HC, Pts/Net, Gross columns)
- [x] Match Play format (MatchPlayLeaderboard component with card-style matchups)
- [x] Team round support (shows team names and members)
- [x] Round info header (RoundHeader with game type Pill, team badge, date, course)
- [x] Loading state with ActivityIndicator
- [x] Error state with ErrorState component and retry
- [x] Empty state with EmptyState component
- [x] Auto-refresh support via useRoundLeaderboard hook
- [x] Current user highlighting
- [x] Type guards for score data (isStablefordScore, isStrokeScore, isMatchPlayScore, isTeamScore)

**Dependencies:** Task 10 (useRoundLeaderboard)
**Completed:** 2025-12-09

---

### Task 20: Update Leaderboard Tab in CompetitionDetailScreen
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Update Leaderboard tab in CompetitionDetailScreen to support both individual and team standings. Modifications: (1) Add sub-tabs or toggle for 'Individual' vs 'Team' standings when competition.team_mode is not 'none'. (2) Use existing LeaderboardTable for individual standings. (3) Use new TeamLeaderboardTable for team standings. (4) Use useCompetitionLeaderboard hook instead of useLeaderboard. (5) Show appropriate empty states for each view. (6) Add round-specific leaderboard section showing per-round results with RoundLeaderboard component."
```
**Deliverables:**
- [x] Individual/Team standings toggle
- [x] TeamLeaderboardTable integration
- [x] useCompetitionLeaderboard hook usage
- [x] Round-specific leaderboard section
- [x] Empty states for both views
- [x] Proper loading states

**Dependencies:** Task 18 (TeamLeaderboardTable), Task 19 (RoundLeaderboard), Task 9 (useCompetitionLeaderboard)
**Completed:** 2025-12-09

---

## Sprint 8: Scoring Screen Updates

### Task 21: Team Scorecard Entry Mode
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Update ScorecardEntryScreen to support team scoring modes. Detect team round via round.is_team_round and round.team_format. For Scramble format: show single score entry per team (TeamScoreCard component) instead of individual PlayerScoreCards. For Best Ball format: show all player scores but highlight the best score on each hole. For Team Match Play: show side-by-side team scores with match status. Add TeamScoreCard component for scramble - similar to PlayerScoreCard but shows team name and contributing player selector. Update scoring logic to calculate team scores appropriately."
```
**Deliverables:**
- [x] Detect team round in ScorecardEntryScreen
- [x] `src/components/scorecard/TeamScoreCard.tsx` for Scramble
- [x] Best Ball highlighting in PlayerScoreCard
- [x] Team Match Play side-by-side layout
- [x] Team score calculation
- [x] Contributing player selector for Scramble

**Dependencies:** Task 3 (team scoring utils)
**Completed:** 2025-12-09

---

### Task 22: Match Play Scoring Screen
**Status:** ✅ Complete
**Command:**
```bash
/screen "MatchPlayScoringScreen - Specialized scoring for Match Play format. Route params: roundId, player1Id (or team1Id), player2Id (or team2Id). Layout: side-by-side score entry for both players/teams. Show hole header with par. Score buttons for each side. After both scores entered, show hole result (Won/Lost/Halved). Match status display: 'Player A is 2 up with 5 to play' or 'All Square'. Handle early finish: when lead exceeds remaining holes, show 'Match Complete' with final result (e.g., '3 & 2'). Submit match result button when complete."
```
**Deliverables:**
- [x] `src/screens/scoring/MatchPlayScoringScreen.tsx`
- [x] Side-by-side score entry
- [x] Hole result display
- [x] Match status calculation and display
- [x] Early finish detection (dormie)
- [x] 'Match Complete' handling
- [x] Submit match result
- [x] Navigation registration

**Dependencies:** Task 3 (team scoring utils), Task 21 (team scorecard)
**Completed:** 2025-12-09

---

## Sprint 9: Integration & Testing

### Task 23: Update API Client
**Status:** ✅ Complete
**Command:**
```bash
/refactor "Update src/services/api/client.ts to support team and game type fields. Modifications: (1) Update createCompetition to accept team_mode, team_size, point_system. (2) Update createRound to accept game_type, is_team_round, team_format. (3) Add team-related API methods: createTeam, getTeams, updateTeam, deleteTeam. (4) Add round results methods: saveRoundResults, getRoundResults. (5) Update TypeScript return types for all modified methods. Ensure backward compatibility - existing calls without team fields should still work."
```
**Deliverables:**
- [x] Update `createCompetition()` with team fields
- [x] Update `createRound()` with game type fields
- [x] Add team CRUD methods
- [x] Add round results methods
- [x] TypeScript type updates
- [x] Backward compatibility

**Dependencies:** Task 1 (database)
**Completed:** 2025-12-09

---

### Task 24: Integration Testing
**Status:** ⬜ Not Started
**Command:**
```bash
/test "Teams and Game Types Integration Tests. Test flows: (1) Create competition with fixed teams - verify teams persist across rounds. (2) Create competition with per-round teams - verify teams can differ per round. (3) Auto-generate balanced teams - verify handicap distribution. (4) Score team Best Ball round - verify best score used. (5) Score team Scramble round - verify single team score. (6) Score Match Play round - verify match result calculation and early finish. (7) Competition leaderboard - verify points aggregation across mixed formats. (8) Team leaderboard - verify team standings. Test on both iOS and Android simulators."
```
**Deliverables:**
- [ ] Fixed teams test
- [ ] Per-round teams test
- [ ] Auto-generate teams test
- [ ] Best Ball scoring test
- [ ] Scramble scoring test
- [ ] Match Play scoring test
- [ ] Leaderboard aggregation test
- [ ] iOS and Android testing

**Dependencies:** All previous tasks
**Estimated Time:** 8-10 hours

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 24
- **Completed:** 23 ✅ (96%)
- **In Progress:** 0 🔄 (0%)
- **Not Started:** 1 ⬜ (4%)

### Sprint Progress

**Sprint 1: Database Foundation** ✅ Complete
- ✅ Task 1: Database Migration
- ✅ Task 2: TypeScript Types

**Sprint 2: Scoring Algorithms** ✅ Complete
- ✅ Task 3: Team Scoring Utilities
- ✅ Task 4: Competition Points System
- ✅ Task 5: Team Generation Algorithm

**Sprint 3: Services Layer** ✅ Complete
- ✅ Task 6: Team Service
- ✅ Task 7: Round Results Service

**Sprint 4: React Query Hooks** ✅ Complete
- ✅ Task 8: Team Hooks
- ✅ Task 9: Competition Leaderboard Hook
- ✅ Task 10: Round Leaderboard Hook

**Sprint 5: Team Management UI** ✅ Complete
- ✅ Task 11: Team Card Component
- ✅ Task 12: Team Formation UI
- ✅ Task 13: Team Management Screen
- ✅ Task 14: Teams Tab in CompetitionDetail

**Sprint 6: Competition Setup Changes** ✅ Complete
- ✅ Task 15: Team Settings Step
- ✅ Task 16: Game Type Selector
- ✅ Task 17: Update AddRoundScreen

**Sprint 7: Leaderboard Updates** ✅ Complete
- ✅ Task 18: Team Leaderboard Table
- ✅ Task 19: Round Leaderboard Component
- ✅ Task 20: Update Leaderboard Tab

**Sprint 8: Scoring Screen Updates** ✅ Complete
- ✅ Task 21: Team Scorecard Entry Mode
- ✅ Task 22: Match Play Scoring Screen

**Sprint 9: Integration & Testing** 🔄 In Progress (1/2)
- ✅ Task 23: Update API Client
- ⬜ Task 24: Integration Testing

---

## Critical Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/` | New migration for teams and game types |
| `src/types/teams.ts` | New - all team types |
| `src/types/index.ts` | Export team types |
| `src/types/database.types.ts` | Add DB row types |
| `src/utils/teamScoring.ts` | New - team scoring functions |
| `src/utils/competitionPoints.ts` | New - points calculation |
| `src/utils/teamGeneration.ts` | New - team generation |
| `src/services/teams/teamService.ts` | New - team CRUD |
| `src/services/rounds/roundResultsService.ts` | New - round results |
| `src/services/api/client.ts` | Add team and game type fields |
| `src/hooks/useTeams.ts` | New - team query/mutation hooks |
| `src/hooks/useCompetitionLeaderboard.ts` | New - points-based leaderboard |
| `src/hooks/queryKeys.ts` | Add team and result keys |
| `src/screens/admin/CompetitionDetailScreen.tsx` | Add Teams tab, update Leaderboard |
| `src/screens/admin/CreateCompetitionScreen.tsx` | Add Team Settings step |
| `src/screens/admin/AddRoundScreen.tsx` | Add game type selection |
| `src/screens/admin/TeamManagementScreen.tsx` | New - team management |
| `src/screens/scoring/ScorecardEntryScreen.tsx` | Team scoring modes |
| `src/screens/scoring/MatchPlayScoringScreen.tsx` | New - match play |
| `src/components/teams/TeamCard.tsx` | New - team display |
| `src/components/teams/TeamFormationUI.tsx` | New - team creation |
| `src/components/competition/GameTypeSelector.tsx` | New - game type picker |
| `src/components/competition/TeamLeaderboardTable.tsx` | New - team standings |
| `src/components/competition/RoundLeaderboard.tsx` | New - round results |
| `src/components/scorecard/TeamScoreCard.tsx` | New - team scoring |

---

## Command Usage Reference

| Command | Use For |
|---------|---------|
| `/db` | Database schema design and migrations |
| `/component` | Reusable UI components |
| `/screen` | Full screen implementations |
| `/hook` | TanStack Query hooks and data fetching |
| `/feature` | Large multi-component features |
| `/refactor` | Modifying existing code, utilities |
| `/test` | Test suites and testing |
| `/review` | Code quality audits |

---

## Time Estimates

| Sprint | Tasks | Estimated Hours |
|--------|-------|-----------------|
| Sprint 1: Database | 2 | 6-9 hours |
| Sprint 2: Algorithms | 3 | 9-12 hours |
| Sprint 3: Services | 2 | 9-11 hours |
| Sprint 4: Hooks | 3 | 10-13 hours |
| Sprint 5: Team UI | 4 | 14-18 hours |
| Sprint 6: Setup Changes | 3 | 10-13 hours |
| Sprint 7: Leaderboards | 3 | 12-15 hours |
| Sprint 8: Scoring | 2 | 12-16 hours |
| Sprint 9: Integration | 2 | 11-14 hours |

**Total Estimated:** 93-121 hours

---

## Notes

### Backward Compatibility
- Existing Stableford individual competitions work unchanged
- `team_mode: 'none'` is default - no teams unless explicitly enabled
- Existing leaderboard hook continues to work for simple competitions

### Key Design Decisions
1. **Point System**: Position-based points normalize all formats to unified leaderboard
2. **Team Handicap**: Uses 35% low + 15% high for 2-person, average/size for larger teams
3. **Snake Draft**: Balances teams by alternating pick order based on handicap
4. **Match Play Early Finish**: Detects dormie and ends match when lead exceeds holes remaining

---

**Last Updated:** 2025-12-09
**Next Review:** After completing Task 24 (Integration Testing)
**Current Sprint:** Sprint 9 - Task 24 (Integration Testing) remaining
