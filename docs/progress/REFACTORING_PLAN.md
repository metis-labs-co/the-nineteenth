# Codebase Refactoring Plan

## Overview
This plan identifies overly large files, duplicate components, and refactoring opportunities across the codebase to improve maintainability, reduce code duplication, and ensure consistent use of the design system.

## Summary of Findings

| Category | Count | Priority |
|----------|-------|----------|
| Large files (700+ lines) | 10 screens, 10 components | High |
| Duplicate components | 3 component groups | High |
| Theme token inconsistencies | 10+ files | Medium |
| Missing abstractions | 5 patterns | Medium |

---

## Phase 1: Consolidate Duplicate Components (High Priority)

### 1.1 TeeSelector Consolidation
**Current State:** 3 separate implementations with different APIs

| File | Lines | Description |
|------|-------|-------------|
| `src/screens/courses/CourseDetailScreen/components/TeeSelector.tsx` | 99 | Horizontal scrollable pills |
| `src/screens/admin/EditRoundScreen/components/TeeSelector.tsx` | 110 | Grid cards with CR/Slope |
| `src/screens/rounds/CreateRoundBottomSheet/steps/TeeSelectionStep.tsx` | 213 | Full-screen list with banner |

**Target:** Single `src/components/common/TeeSelector.tsx` with `variant` prop

**Refactor Prompt:**
```
Consolidate the three TeeSelector implementations into a single reusable component:

1. Create `src/components/common/TeeSelector.tsx` with these variants:
   - variant="pills" - Horizontal scrollable chips (from CourseDetailScreen)
   - variant="cards" - Grid layout with CR/Slope info (from EditRoundScreen)
   - variant="list" - Full-screen FlatList with banner (from TeeSelectionStep)

2. Unified props interface:
   - tees: Tee[] (required)
   - selectedTeeId: string | null
   - onSelect: (tee: Tee) => void
   - variant: 'pills' | 'cards' | 'list'
   - showYardage?: boolean (for pills variant)
   - showBanner?: boolean (for list variant)
   - onSkip?: () => void (for list variant)

3. Update these files to use the new component:
   - src/screens/courses/CourseDetailScreen/index.tsx
   - src/screens/admin/EditRoundScreen/index.tsx
   - src/screens/rounds/CreateRoundBottomSheet/steps/TeeSelectionStep.tsx

4. Delete the old component files after migration

5. Create TeeSelector.stories.tsx and TeeSelector.test.tsx
```

---

### 1.2 Badge/Pill Component Consolidation
**Current State:** 4 overlapping badge-style components

| Component | Purpose |
|-----------|---------|
| `src/components/common/Pill.tsx` | Static info pills |
| `src/components/common/StatusBadge.tsx` | Status indicators |
| `src/components/common/FilterPill.tsx` | Interactive filter toggles |
| `src/components/subscription/TierBadge.tsx` | Subscription tier display |

**Refactor Prompt:**
```
Review and potentially consolidate badge/pill components:

1. Analyze current usage of each component across the codebase:
   - Pill.tsx - where is it used?
   - StatusBadge.tsx - where is it used?
   - FilterPill.tsx - where is it used?
   - TierBadge.tsx - where is it used?

2. Determine if consolidation makes sense:
   - Option A: Keep separate (if use cases are distinct enough)
   - Option B: Create unified Badge component with variant prop

3. If consolidating (Option B):
   - Create src/components/common/Badge.tsx with variants:
     - variant="pill" | "status" | "filter" | "tier"
     - size="sm" | "md" | "lg"
     - interactive?: boolean
     - status?: 'draft' | 'active' | 'completed' | 'cancelled'

4. Ensure all use cases are covered and update imports across codebase

5. Add comprehensive tests and stories
```

---

### 1.3 Score Indicator Consolidation
**Current State:** 2 similar components for score display

| Component | Rendering Style |
|-----------|-----------------|
| `src/components/scorecard/ScoreIndicator.tsx` | Border-based circles/squares |
| `src/components/scorecard/CompactScoreIndicator.tsx` | Background-based colored cells |

**Refactor Prompt:**
```
Consolidate ScoreIndicator components:

1. Create unified src/components/scorecard/ScoreIndicator.tsx with:
   - display="bordered" - circles/squares with colored borders
   - display="compact" - solid colored background cells
   - score: number
   - par: number
   - size?: 'sm' | 'md' | 'lg'

2. Migrate all usages of CompactScoreIndicator to use ScoreIndicator with display="compact"

3. Delete CompactScoreIndicator.tsx after migration

4. Update tests and stories
```

---

## Phase 2: Split Large Screen Files (High Priority)

### 2.1 EditRoundScreen (888 lines)
**File:** `src/screens/admin/EditRoundScreen/index.tsx`

**Refactor Prompt:**
```
Refactor EditRoundScreen to reduce complexity:

1. Extract custom hooks:
   - useEditRoundForm() - Manage form state (date, time, course, tees, players)
   - useRoundValidation() - Form validation logic
   - useRoundSubmission() - Mutation and submission handling

2. Extract sub-components:
   - CourseSection.tsx - Course selection and display
   - DateTimeSection.tsx - Date and time pickers (use DateTimeFields)
   - TeesSection.tsx - Tee selection UI
   - PlayersSection.tsx - Player management

3. Move types to types.ts within the component folder

4. Target: Main index.tsx should be under 300 lines, orchestrating the sub-components
```

---

### 2.2 ScorecardEntryScreen (811 lines)
**File:** `src/screens/scoring/ScorecardEntryScreen.tsx`

**Refactor Prompt:**
```
Refactor ScorecardEntryScreen to reduce state complexity:

1. Extract custom hooks:
   - useScorecardDialogs() - Manage dialog states (submit, incomplete, leave, error)
   - useScorecardNavigation() - Hole navigation and swipe logic
   - useScorecardSubmission() - Score submission and offline sync
   - useScorecardState() - Core scorecard state management

2. Extract sub-components:
   - ScorecardHeader.tsx - Current hole info, progress bar
   - ScorecardFooter.tsx - Navigation buttons, submit button
   - ScorecardDialogs.tsx - All confirmation/error dialogs
   - ScorecardViewSwitcher.tsx - Switch between PlayerScoreCard/TeamScoreCard variants

3. Target: Main screen under 350 lines
```

---

### 2.3 RoundLeaderboard (857 lines)
**File:** `src/components/leaderboard/RoundLeaderboard.tsx`

**Refactor Prompt:**
```
Refactor RoundLeaderboard using composition pattern:

1. Extract format-specific leaderboard components:
   - StablefordLeaderboard.tsx - Stableford points display
   - StrokePlayLeaderboard.tsx - Stroke play scoring
   - MatchPlayLeaderboard.tsx - Match play results

2. Extract shared components:
   - LeaderboardHeader.tsx - Column headers
   - LeaderboardRow.tsx - Individual player/team row
   - LeaderboardEmptyState.tsx - No scores state

3. Extract utilities:
   - leaderboardUtils.ts - getGameTypeLabel, formatMatchResult, getMatchResultDescription
   - leaderboardTypeGuards.ts - isTeamEntry, isStablefordScore, etc.

4. Move StyleSheet to RoundLeaderboard.styles.ts (200+ lines of styles)

5. Main RoundLeaderboard.tsx should:
   - Select correct format component based on game type
   - Handle data fetching/loading states
   - Target: Under 200 lines
```

---

### 2.4 TeamFormationUI (843 lines)
**File:** `src/components/teams/TeamFormationUI.tsx`

**Refactor Prompt:**
```
Refactor TeamFormationUI to separate algorithm from UI:

1. Extract custom hooks:
   - useTeamGeneration() - Team generation algorithm
   - useTeamBalanceCalculation() - Balance quality calculations
   - useTeamDragDrop() - Drag and drop reordering logic

2. Extract sub-components:
   - TeamCard.tsx - Individual team display with members
   - TeamBalanceIndicator.tsx - Balance quality visualization
   - TeamMemberList.tsx - List of team members with handicaps
   - TeamActions.tsx - Regenerate, save, cancel buttons

3. Extract utilities:
   - teamAlgorithms.ts - Sorting, balancing, generation algorithms

4. Target: Main component under 300 lines
```

---

### 2.5 AICompetitionScreen (788 lines)
**File:** `src/screens/admin/AICompetitionScreen.tsx`

**Refactor Prompt:**
```
Analyze and refactor AICompetitionScreen:

1. First, understand the component structure:
   - What AI features does it provide?
   - What are the main sections/steps?

2. Extract custom hooks based on functionality:
   - useAIGeneration() - AI prompt and generation logic
   - useAICompetitionForm() - Form state management

3. Extract sub-components based on UI sections found

4. Target: Under 350 lines
```

---

### 2.6 RoundListScreen (786 lines)
**File:** `src/screens/rounds/RoundListScreen.tsx`

**Refactor Prompt:**
```
Refactor RoundListScreen to extract filter and list logic:

1. Extract custom hooks:
   - useRoundFilters() - Filter state and logic
   - useRoundList() - Data fetching with filters applied

2. Extract sub-components:
   - RoundFilters.tsx - Filter pills/chips UI
   - RoundListHeader.tsx - Title and filter toggle
   - RoundListEmpty.tsx - Empty state when no rounds match filters

3. Target: Under 300 lines
```

---

### 2.7 PlayerScorecardScreen (770 lines)
**File:** `src/screens/scoring/PlayerScorecardScreen.tsx`

**Refactor Prompt:**
```
Refactor PlayerScorecardScreen:

1. Extract custom hooks:
   - usePlayerScorecard() - Scorecard data and calculations
   - useScorecardMode() - Team vs individual mode switching

2. Extract sub-components:
   - ScorecardSummary.tsx - Overall score summary
   - ScorecardHoleGrid.tsx - Hole-by-hole display
   - ScorecardPlayerInfo.tsx - Player header with handicap

3. Move calculation utilities:
   - scorecardCalculations.ts - Net score, stableford points, etc.

4. Target: Under 350 lines
```

---

### 2.8 EditCompetitionScreen (743 lines)
**File:** `src/screens/admin/EditCompetitionScreen.tsx`

**Refactor Prompt:**
```
Refactor EditCompetitionScreen:

1. Extract custom hooks:
   - useEditCompetitionForm() - Form state management
   - useCompetitionValidation() - Validation rules
   - useCompetitionSubmission() - Save/update mutation

2. Extract sub-components based on form sections:
   - CompetitionBasicInfo.tsx - Name, description, dates
   - CompetitionSettings.tsx - Handicap system, scoring options
   - CompetitionPlayers.tsx - Player management section

3. Target: Under 350 lines
```

---

### 2.9 ReviewScorecardScreen (729 lines)
**File:** `src/screens/scoring/ReviewScorecardScreen.tsx`

**Refactor Prompt:**
```
Refactor ReviewScorecardScreen:

1. Extract custom hooks:
   - useScoreReview() - Review state and validation
   - useScoreSubmission() - Final submission logic

2. Extract sub-components:
   - ReviewSummary.tsx - Score totals and summary
   - ReviewHoleList.tsx - Hole-by-hole review
   - ReviewActions.tsx - Submit, edit, cancel buttons
   - ReviewWarnings.tsx - Validation warnings display

3. Target: Under 300 lines
```

---

### 2.10 MyStatisticsScreen (720 lines)
**File:** `src/screens/profile/MyStatisticsScreen.tsx`

**Refactor Prompt:**
```
Refactor MyStatisticsScreen:

1. Analyze current structure - what stats are displayed?

2. Extract sub-components:
   - OverviewStats.tsx - Main stat cards
   - RoundHistory.tsx - Recent rounds list
   - PerformanceCharts.tsx - Visualization components
   - StatFilters.tsx - Time period filters

3. Extract custom hooks:
   - usePlayerStats() - Stats data fetching
   - useStatsFilters() - Filter state management

4. Target: Under 300 lines
```

---

## Phase 3: Fix Theme Token Inconsistencies (Medium Priority)

### 3.1 Hardcoded Values Audit

**Refactor Prompt:**
```
Audit and fix hardcoded values across the codebase:

1. Search for hardcoded colors:
   - Regex: /#[0-9a-fA-F]{3,8}/ in .tsx files
   - Replace with colors.* from useThemeColors()

2. Search for hardcoded spacing:
   - Regex: /padding:\s*\d+/ and /margin:\s*\d+/
   - Replace with spacing.* tokens

3. Search for hardcoded borderRadius:
   - Regex: /borderRadius:\s*\d+/
   - Replace with borderRadius.* tokens

4. Known files with issues:
   - src/screens/courses/CourseDetailScreen/index.tsx (color opacity calculations)
   - src/screens/rounds/CreateRoundBottomSheet/steps/TeeSelectionStep.tsx
   - src/screens/admin/EditRoundScreen/components/TeeSelector.tsx

5. Create consistent opacity utility if needed:
   - withOpacity(color, opacity) function
```

---

### 3.2 Inline Styles Audit

**Refactor Prompt:**
```
Review inline styles and move to StyleSheet where appropriate:

1. Find components with extensive inline styles (style={{...}} patterns)

2. Move repeated inline styles to StyleSheet.create()

3. Keep only dynamic values inline (colors from useThemeColors())

4. Pattern to follow:
   - Static: StyleSheet.create({ container: { padding: spacing.md } })
   - Dynamic: style={[styles.container, { backgroundColor: colors.surface }]}
```

---

## Phase 4: Create Missing Abstractions (Medium Priority)

### 4.1 DateTimeFieldGroup Component

**Refactor Prompt:**
```
Create reusable DateTimeFieldGroup component:

1. Create src/components/common/DateTimeFieldGroup.tsx

2. Props:
   - date: Date
   - onDateChange: (date: Date) => void
   - time?: Date
   - onTimeChange?: (time: Date) => void
   - label?: string
   - showTime?: boolean
   - minimumDate?: Date
   - maximumDate?: Date

3. Encapsulate iOS/Android date picker differences

4. Replace usage in:
   - EditRoundScreen
   - EditCompetitionScreen
   - AddRoundScreen

5. Add stories and tests
```

---

### 4.2 PlayerSelector Component

**Refactor Prompt:**
```
Create unified PlayerSelector component:

1. Create src/components/common/PlayerSelector.tsx

2. Props:
   - players: Player[]
   - selectedIds: string[]
   - onSelect: (ids: string[]) => void
   - multiSelect?: boolean
   - maxSelections?: number
   - searchable?: boolean
   - showHandicap?: boolean

3. Should integrate with existing FriendSelector patterns

4. Add stories and tests
```

---

### 4.3 FormSection Component

**Refactor Prompt:**
```
Create FormSection wrapper component:

1. Create src/components/common/FormSection.tsx

2. Props:
   - title?: string
   - description?: string
   - children: React.ReactNode
   - error?: string
   - required?: boolean

3. Provides consistent spacing, typography, and layout for form sections

4. Add stories and tests
```

---

## Phase 5: Large Component Files (Lower Priority)

### 5.1 Paywall Component (680 lines)
**File:** `src/components/subscription/Paywall.tsx`

**Refactor Prompt:**
```
Refactor Paywall component:

1. Extract sub-components:
   - TierCard.tsx - Individual subscription tier card
   - FeatureComparisonTable.tsx - Feature matrix
   - FeatureRow.tsx - Single feature comparison row

2. Move tier data to constants:
   - tierConfig.ts - Tier features, pricing, descriptions

3. Target: Main component under 250 lines
```

---

### 5.2 ApiSearchModal (REMOVED)
**Status:** Component deleted (January 2025)

**Reason:** The ApiSearchModal component is no longer needed. All related code has been removed from the codebase including:
- `src/components/courses/ApiSearchModal.tsx`
- `src/components/courses/ApiSearchModal.test.tsx`
- `src/components/courses/ApiSearchModal.stories.tsx`
- Export from `src/components/courses/index.ts`
- Usage in `CourseListScreen.tsx` and `CourseListContent.tsx`

---

### 5.3 RoundListCard (593 lines)
**File:** `src/components/rounds/RoundListCard.tsx`

**Refactor Prompt:**
```
Refactor RoundListCard:

1. Extract custom hooks:
   - useSwipeGesture() - PanResponder + Animated logic

2. Extract sub-components:
   - RoundCardHeader.tsx - Title and status
   - RoundCardMeta.tsx - Date, course, players info
   - RoundCardActions.tsx - Swipe actions (delete, edit)

3. Move types to separate types.ts file

4. Target: Under 250 lines
```

---

### 5.4 DetailsTab (709 lines)
**File:** `src/components/competitions/detail/DetailsTab.tsx`

**Refactor Prompt:**
```
Refactor DetailsTab:

1. Analyze sections within the tab

2. Extract sub-components for each section:
   - CompetitionInfoSection.tsx
   - RoundsListSection.tsx
   - PlayersSection.tsx
   - SettingsSection.tsx

3. Target: Under 300 lines
```

---

### 5.5 PlayerScoreCard (581 lines)
**File:** `src/components/scorecard/PlayerScoreCard.tsx`

**Refactor Prompt:**
```
Refactor PlayerScoreCard:

1. Extract sub-components:
   - StatsRow.tsx - Optional stats display (FIR, GIR, putts)
   - QuickActionButtons.tsx - Score adjustment buttons
   - ScoreInputStepper.tsx - +/- score input

2. Extract hooks:
   - usePlayerScoreCard() - Score state and calculations

3. Target: Under 300 lines
```

---

## Implementation Order

### Recommended Sequence:

1. **Week 1: Duplicate Components (Phase 1)**
   - 1.1 TeeSelector consolidation
   - 1.2 Badge/Pill review
   - 1.3 ScoreIndicator consolidation

2. **Week 2-3: Large Screens (Phase 2)**
   - Start with ScorecardEntryScreen (most complex user flow)
   - Then EditRoundScreen
   - Then RoundLeaderboard

3. **Week 4: Theme & Abstractions (Phase 3-4)**
   - Theme token audit
   - Create DateTimeFieldGroup
   - Create FormSection

4. **Ongoing: Lower Priority (Phase 5)**
   - Address as time permits
   - Can be done opportunistically when touching these files

---

## Progress Tracking

### Phase 1: Duplicate Components
- [x] 1.1 TeeSelector consolidation
- [x] 1.2 Badge/Pill review - **Decision: Keep Separate** (see analysis below)
- [x] 1.3 ScoreIndicator consolidation - **Completed** (see details below)

#### 1.3 ScoreIndicator Consolidation Results

**Action Taken: Unified into single component with display prop**

The two separate components (`ScoreIndicator` and `CompactScoreIndicator`) have been consolidated into a single `ScoreIndicator` component with a `display` prop:

| Prop | Values | Description |
|------|--------|-------------|
| `display` | `'bordered'` (default), `'compact'` | Controls rendering style |
| `size` | `'sm'`, `'md'` (default), `'lg'` | Controls size of indicator |
| `strokes` | `number \| undefined` | Score for the hole |
| `par` | `number` | Par for the hole |

**Changes Made:**
1. Updated `src/components/scorecard/ScoreIndicator.tsx` to support both display modes
2. Migrated `RoundScorecardTab.tsx` to use `ScoreIndicator` with `display="compact"`
3. Deleted `CompactScoreIndicator.tsx`
4. Updated barrel export in `src/components/scorecard/index.ts`
5. Updated tests with new size naming (`sm`, `md`, `lg`) and compact display tests
6. Updated stories with compact display stories and display mode comparison

**Migration Guide:**
```typescript
// Before:
import { CompactScoreIndicator } from '@/components/scorecard';
<CompactScoreIndicator strokes={4} par={4} />

// After:
import { ScoreIndicator } from '@/components/scorecard';
<ScoreIndicator strokes={4} par={4} display="compact" />
```

#### 1.2 Badge/Pill Analysis Results

**Decision: Keep components separate (Option A)**

After comprehensive analysis, consolidation was determined to be unnecessary. The four components serve distinct purposes:

| Component | Purpose | Key Differentiator |
|-----------|---------|-------------------|
| `Pill` | Static informational labels | Full pill shape, many color variants, golf-specific variants |
| `StatusBadge` | Status indicators | Rounded rectangle, semantic status colors, default labels |
| `FilterPill` | Interactive filter toggles | Has `onPress`, `selected`, `disabled` props |
| `TierBadge` | Subscription tier display | Domain-specific (context-aware), icons, glow effects |

**Rationale:**
- Different styling philosophies (pill vs rounded rectangle)
- FilterPill is interactive; others are not
- TierBadge has subscription-specific business logic
- All components already have comprehensive tests and stories
- Consolidation would add complexity without reducing code significantly

### Phase 2: Large Screens
- [x] 2.1 EditRoundScreen (888 lines → 402 lines)

#### 2.1 EditRoundScreen Refactoring Results

**Action Taken: Extracted hooks and sub-components**

The screen was refactored from 888 lines to 402 lines by extracting reusable hooks and components.

**New Hooks Created:**
| Hook | Purpose |
|------|---------|
| `useEditRoundForm` | Manages form state (date, time, gameType, tee, scoringPairs) and dirty checking |
| `useRoundValidation` | Form validation logic with error collection |
| `useRoundSubmission` | Handles update and shuffle mutations with error handling |

**New Components Created:**
| Component | Purpose |
|-----------|---------|
| `CourseSection` | Read-only course information display |
| `DateTimeSection` | Date and tee time pickers with iOS/Android handling |
| `GameTypeSection` | Game format selection wrapper |
| `TeesSection` | Tee selection UI wrapper |
| `ScoringPairsSection` | Scoring pairs toggle with premium gating |

**File Structure:**
```
src/screens/admin/EditRoundScreen/
├── index.tsx (402 lines - main orchestrator)
├── types.ts (existing)
├── hooks/
│   ├── index.ts
│   ├── useEditRoundData.ts (existing)
│   ├── useEditRoundForm.ts (new)
│   ├── useRoundValidation.ts (new)
│   └── useRoundSubmission.ts (new)
├── components/
│   ├── index.ts (new)
│   ├── CourseSection.tsx (new)
│   ├── DateTimeSection.tsx (new)
│   ├── GameTypeSection.tsx (new)
│   ├── TeesSection.tsx (new)
│   └── ScoringPairsSection.tsx (new)
└── utils/
    ├── index.ts
    └── dateTimeHelpers.ts
```

- [x] 2.2 ScorecardEntryScreen (811 lines → 424 lines)

#### 2.2 ScorecardEntryScreen Refactoring Results

**Action Taken: Extracted hooks and sub-components**

The screen was refactored from 811 lines to 424 lines by extracting reusable hooks and components.

**New Hooks Created:**
| Hook | Purpose |
|------|---------|
| `useScorecardDialogs` | Manages dialog states (leave, incomplete, error, debug panel) |
| `useScorecardNavigation` | Hole navigation, swipe logic, Android back button handling |
| `useScorecardSubmission` | Score submission, offline sync, round deletion |

**New Components Created:**
| Component | Purpose |
|-----------|---------|
| `ScorecardHeader` | PageHeader, offline indicator, sync line animation, scoring pairs info |
| `ScorecardFooter` | Navigation buttons, View Scorecard link, Review & Submit |
| `ScorecardDialogs` | All confirmation/error dialogs, debug panel |
| `ScorecardScoreContent` | Renders appropriate scoring UI based on format (Individual/Scramble/Best Ball/Match Play) |

**File Structure:**
```
src/screens/scoring/ScorecardEntryScreen/
├── index.tsx (424 lines - main orchestrator)
├── hooks/
│   ├── index.ts
│   ├── useScorecardDialogs.ts (95 lines)
│   ├── useScorecardNavigation.ts (111 lines)
│   └── useScorecardSubmission.ts (137 lines)
├── components/
│   ├── index.ts
│   ├── ScorecardHeader.tsx (183 lines)
│   ├── ScorecardFooter.tsx (130 lines)
│   ├── ScorecardDialogs.tsx (123 lines)
│   └── ScorecardScoreContent.tsx (174 lines)
```

- [x] 2.3 RoundLeaderboard (857 lines → 169 lines)

#### 2.3 RoundLeaderboard Refactoring Results

**Action Taken: Extracted format-specific components using composition pattern**

The component was refactored from 857 lines to 169 lines by extracting format-specific leaderboard components, shared components, utilities, and styles.

**New Format-Specific Components:**
| Component | Purpose |
|-----------|---------|
| `StablefordLeaderboard` | Stableford points table display (Position, Name, HC, Pts) |
| `StrokePlayLeaderboard` | Stroke play table display (Position, Name, HC, Net, Gross) |
| `MatchPlayLeaderboard` | Match play card-based display with results and stats |

**New Shared Components:**
| Component | Purpose |
|-----------|---------|
| `LeaderboardHeader` | Round info header with game type badge, team badge, date, course |
| `LeaderboardRow` | Individual player/team row for table-based leaderboards |

**New Utilities:**
| File | Purpose |
|------|---------|
| `leaderboardUtils.ts` | Helper functions: getGameTypeLabel, formatMatchResult, getMatchResultDescription, getEntryName, getEntryId, getEntryHandicap, isCurrentUserEntry |
| `RoundLeaderboard.styles.ts` | StyleSheet extracted (180+ lines of styles) |

**File Structure:**
```
src/components/leaderboard/
├── RoundLeaderboard.tsx (169 lines - main orchestrator)
├── RoundLeaderboard.styles.ts (180 lines)
├── leaderboardUtils.ts (110 lines)
├── LeaderboardHeader.tsx (75 lines)
├── LeaderboardRow.tsx (140 lines)
├── StablefordLeaderboard.tsx (80 lines)
├── StrokePlayLeaderboard.tsx (90 lines)
├── MatchPlayLeaderboard.tsx (165 lines)
└── index.ts (updated exports)
```

**Key Improvements:**
- Main component reduced from 857 to 169 lines (80% reduction)
- Clear separation of concerns by game type
- Reusable LeaderboardRow component shared between Stableford and Stroke Play
- All 26 existing tests continue to pass
- Utilities can be reused by other components
- [x] 2.4 TeamFormationUI (843 lines → 238 lines)

#### 2.4 TeamFormationUI Refactoring Results

**Action Taken: Extracted hooks, sub-components, and utilities**

The component was refactored from 843 lines to 238 lines (72% reduction) by extracting reusable hooks, sub-components, utilities, and styles.

**New Hooks Created:**
| Hook | Purpose |
|------|---------|
| `useTeamFormation` | Manages team state, player selection, balance calculations, auto-generation, and swap logic |

**New Components Created:**
| Component | Purpose |
|-----------|---------|
| `TeamFormationCard` | Individual team display with members for formation/editing (separate from existing TeamCard) |
| `TeamBalanceIndicator` | Balance quality visualization (good/fair/poor with handicap spread) |
| `TeamFormationActions` | Action bar with Reset/Cancel and Save buttons, validation warning |

**New Utilities:**
| File | Purpose |
|------|---------|
| `teamAlgorithms.ts` | Sorting, balancing, generation algorithms: calculateTeamHandicap, calculateHandicapSpread, getBalanceQuality, areAllPlayersAssigned, swapPlayers |
| `TeamFormationUI.styles.ts` | Extracted StyleSheet (100 lines) |

**File Structure:**
```
src/components/teams/
├── TeamFormationUI.tsx (238 lines - main orchestrator)
├── TeamFormationUI.styles.ts (100 lines)
├── teamAlgorithms.ts (95 lines)
├── useTeamFormation.ts (145 lines)
├── TeamFormationCard.tsx (175 lines)
├── TeamBalanceIndicator.tsx (115 lines)
├── TeamFormationActions.tsx (115 lines)
├── TeamCard.tsx (existing - for display)
├── EditTeamNameModal.tsx (existing)
├── index.ts (updated exports)
├── TeamFormationUI.test.tsx (existing - 40 tests pass)
└── TeamFormationUI.stories.tsx (existing)
```

**Key Improvements:**
- Main component reduced from 843 to 238 lines (72% reduction)
- Clear separation between UI, logic, and utilities
- Reusable hook for team formation logic
- Algorithm utilities can be reused by other components
- All 40 existing tests continue to pass
- TypeScript types properly exported
- [x] 2.5 AICompetitionScreen (788 lines → 108 lines)

#### 2.5 AICompetitionScreen Refactoring Results

**Action Taken: Extracted hooks and sub-components**

The screen was refactored from 788 lines to 108 lines (86% reduction) by extracting reusable hooks and components.

**New Hooks Created:**
| Hook | Purpose |
|------|---------|
| `useAILoadingAnimation` | Manages spin animation, dot animations, and loading step progression (118 lines) |
| `useAICompetitionFlow` | Handles prompt validation, AI generation, competition creation, navigation (258 lines) |

**New Components Created:**
| Component | Purpose |
|-----------|---------|
| `AILoadingState` | Loading state display with animated progress ring, dots, and step checklist (211 lines) |
| `AIErrorState` | Error state display with message and retry button (87 lines) |
| `AIInputState` | Input state with prompt input, suggestions, and info cards (123 lines) |
| `AICompetitionHeader` | Header with back button, title, and beta badge (102 lines) |

**File Structure:**
```
src/screens/admin/AICompetitionScreen/
├── index.tsx (108 lines - main orchestrator)
├── hooks/
│   ├── index.ts
│   ├── useAILoadingAnimation.ts (118 lines)
│   └── useAICompetitionFlow.ts (258 lines)
├── components/
│   ├── index.ts
│   ├── AILoadingState.tsx (211 lines)
│   ├── AIErrorState.tsx (87 lines)
│   ├── AIInputState.tsx (123 lines)
│   └── AICompetitionHeader.tsx (102 lines)
```

**Key Improvements:**
- Main component reduced from 788 to 108 lines (86% reduction)
- Clear separation of concerns: animations, flow logic, and UI components
- Reusable hooks for loading animations and competition flow
- Each component is focused and maintainable
- No TypeScript errors in refactored code
- [x] 2.6 RoundListScreen (786 lines → 156 lines)

#### 2.6 RoundListScreen Refactoring Results

**Action Taken: Extracted hooks and sub-components**

The screen was refactored from 786 lines to 156 lines (80% reduction) by extracting reusable hooks and components.

**New Hooks Created:**
| Hook | Purpose |
|------|---------|
| `useRoundFilters` | Manages round filter state (active/history tabs) |
| `useRoundList` | Fetches standalone rounds data with pagination support |
| `useRoundActions` | Handles round actions (navigate, delete) with confirmation dialog |
| `useStartNewRound` | Creates new standalone round with all related records |

**New Components Created:**
| Component | Purpose |
|-----------|---------|
| `RoundListEmpty` | Empty state when no rounds match filters |
| `RoundListHeader` | Header section with tabs, new round button, and limit indicator |

**File Structure:**
```
src/screens/rounds/RoundListScreen/
├── index.tsx (156 lines - main orchestrator)
├── types.ts (53 lines)
├── hooks/
│   ├── index.ts
│   ├── useRoundFilters.ts (26 lines)
│   ├── useRoundList.ts (276 lines)
│   ├── useRoundActions.ts (95 lines)
│   └── useStartNewRound.ts (212 lines)
├── components/
│   ├── index.ts
│   ├── RoundListEmpty.tsx (59 lines)
│   └── RoundListHeader.tsx (107 lines)
```

**Key Improvements:**
- Main component reduced from 786 to 156 lines (80% reduction)
- Clear separation of concerns: data fetching, filtering, actions, and UI
- Reusable hooks for round management
- Shared RoundListCardData type from @/components/rounds
- All TypeScript checks pass
- [x] 2.7 PlayerScorecardScreen (770 lines → 139 lines)

#### 2.7 PlayerScorecardScreen Refactoring Results

**Action Taken: Extracted hooks and sub-components**

The screen was refactored from 770 lines to 139 lines (82% reduction) by extracting a custom hook and sub-components.

**New Hooks Created:**
| Hook | Purpose |
|------|---------|
| `usePlayerScorecard` | Manages scorecard data, player lookup, hole row data, and player statistics calculations |

**New Components Created:**
| Component | Purpose |
|-----------|---------|
| `ScorecardPlayerHeader` | Custom header with back button, player name, and handicap display |
| `ScorecardTable` | Full scorecard table with header, hole rows, subtotals (OUT/IN), and total row. Uses existing `ScoreIndicator` component |
| `ScorecardLoadingState` | Loading spinner state |
| `ScorecardPlayerNotFound` | Error state when player is not found |
| `ScorecardNoScores` | Empty state when player has no scores |

**File Structure:**
```
src/screens/scoring/PlayerScorecardScreen/
├── index.tsx (139 lines - main orchestrator)
├── hooks/
│   ├── index.ts (2 lines)
│   └── usePlayerScorecard.ts (186 lines)
├── components/
│   ├── index.ts (7 lines)
│   ├── ScorecardPlayerHeader.tsx (99 lines)
│   ├── ScorecardTable.tsx (298 lines)
│   └── ScorecardEmptyStates.tsx (139 lines)
```

**Key Improvements:**
- Main component reduced from 770 to 139 lines (82% reduction)
- Clear separation of concerns: data/calculations in hook, UI in components
- Reuses existing `ScoreIndicator` component from `@/components/scorecard` for score display
- Empty states extracted for reuse
- All TypeScript checks pass
- Exported types (`PlayerStats`, `HoleRowData`) for use by other components
- [x] 2.8 EditCompetitionScreen (743 lines → 138 lines)

#### 2.8 EditCompetitionScreen Refactoring Results

**Action Taken: Extracted hooks and sub-components**

The screen was refactored from 743 lines to 138 lines (81% reduction) by extracting reusable hooks and components.

**New Hooks Created:**
| Hook | Purpose |
|------|---------|
| `useCompetitionData` | Fetches competition data for editing (57 lines) |
| `useEditCompetitionForm` | Manages form state with react-hook-form + Zod validation (148 lines) |
| `useCompetitionValidation` | Zod schema and validation rules (56 lines) |
| `useCompetitionSubmission` | Handles update mutation with error handling (95 lines) |

**New Components Created:**
| Component | Purpose |
|-----------|---------|
| `CompetitionBasicInfo` | Name and description form fields (55 lines) |
| `CompetitionSettings` | Competition type, team mode, and date fields (169 lines) |
| `InviteCodeSection` | Read-only invite code display (56 lines) |
| `EditCompetitionContent` | Main form content wrapper (116 lines) |
| `EditCompetitionFooter` | Save and cancel buttons (111 lines) |
| `EditCompetitionStates` | Loading and error state displays (98 lines) |

**New Utilities:**
| File | Purpose |
|------|---------|
| `dateHelpers.ts` | Australian date parsing/formatting utilities (30 lines) |

**File Structure:**
```
src/screens/admin/EditCompetitionScreen/
├── index.tsx (138 lines - main orchestrator)
├── types.ts (23 lines)
├── hooks/
│   ├── index.ts (9 lines)
│   ├── useCompetitionData.ts (57 lines)
│   ├── useCompetitionSubmission.ts (95 lines)
│   ├── useCompetitionValidation.ts (56 lines)
│   └── useEditCompetitionForm.ts (148 lines)
├── components/
│   ├── index.ts (10 lines)
│   ├── CompetitionBasicInfo.tsx (55 lines)
│   ├── CompetitionSettings.tsx (169 lines)
│   ├── InviteCodeSection.tsx (56 lines)
│   ├── EditCompetitionContent.tsx (116 lines)
│   ├── EditCompetitionFooter.tsx (111 lines)
│   └── EditCompetitionStates.tsx (98 lines)
└── utils/
    ├── index.ts (5 lines)
    └── dateHelpers.ts (30 lines)
```

**Key Improvements:**
- Main component reduced from 743 to 138 lines (81% reduction)
- Clear separation of concerns: data fetching, form state, validation, submission
- Reusable hooks for competition management
- TypeScript types properly inferred from Zod schema
- No TypeScript errors in refactored code

- [x] 2.9 ReviewScorecardScreen (729 lines → 183 lines)

#### 2.9 ReviewScorecardScreen Refactoring Results

**Action Taken: Extracted hooks and sub-components**

The screen was refactored from 729 lines to 183 lines (75% reduction) by extracting reusable hooks and components.

**New Hooks Created:**
| Hook | Purpose |
|------|---------|
| `useScoreReview` | Manages review state, data transformation (holes, tablePlayerData), and validation logic |
| `useScoreSubmission` | Handles submission flow, offline sync, round status updates, and navigation |

**New Components Created:**
| Component | Purpose |
|-----------|---------|
| `IncompleteScoresModal` | Modal showing which holes have missing scores with navigation to fix |
| `ReviewActions` | Submit and edit score action buttons with offline state handling |
| `ReviewLoadingState` | Loading spinner state |
| `ReviewEmptyState` | Empty state when no scores are recorded |

**File Structure:**
```
src/screens/scoring/ReviewScorecardScreen/
├── index.tsx (183 lines - main orchestrator)
├── hooks/
│   ├── index.ts (2 lines)
│   ├── useScoreReview.ts (126 lines)
│   └── useScoreSubmission.ts (235 lines)
├── components/
│   ├── index.ts (4 lines)
│   ├── IncompleteScoresModal.tsx (234 lines)
│   ├── ReviewActions.tsx (99 lines)
│   └── ReviewEmptyStates.tsx (64 lines)
```

**Key Improvements:**
- Main component reduced from 729 to 183 lines (75% reduction)
- Clear separation of concerns: review state, submission logic, and UI components
- Reusable hooks for score review and submission
- IncompleteScoresModal extracted as standalone component
- All TypeScript checks pass
- Exported types (`IncompleteHole`) for use by other components

- [x] 2.10 MyStatisticsScreen (720 lines → 197 lines)

#### 2.10 MyStatisticsScreen Refactoring Results

**Action Taken: Extracted hooks and sub-components**

The screen was refactored from 720 lines to 197 lines (73% reduction) by extracting reusable hooks and components.

**New Hooks Created:**
| Hook | Purpose |
|------|---------|
| `useStatsUpgradePrompt` | Manages upgrade prompt state for score distribution and advanced stats features |

**New Components Created:**
| Component | Purpose |
|-----------|---------|
| `StatisticsLoadingState` | Loading spinner state display |
| `StatisticsErrorState` | Error state with retry button |
| `StatisticsEmptyState` | Empty state when no rounds played |
| `OverviewStats` | Overview stats grid, round breakdown, averages, and recent activity |
| `GameStats` | Putting, fairway hit, and GIR stats (based on user settings visibility) |
| `ScoreDistributionSection` | Score distribution breakdown (Social+ tier feature) |
| `AdvancedAnalytics` | Performance trend, best performances, favourite course, courses played (Premium tier) |

**File Structure:**
```
src/screens/profile/MyStatisticsScreen/
├── index.tsx (197 lines - main orchestrator)
├── hooks/
│   ├── index.ts (2 lines)
│   └── useStatsUpgradePrompt.ts (92 lines)
├── components/
│   ├── index.ts (5 lines)
│   ├── StatisticsEmptyStates.tsx (129 lines)
│   ├── OverviewStats.tsx (165 lines)
│   ├── GameStats.tsx (164 lines)
│   ├── ScoreDistributionSection.tsx (104 lines)
│   └── AdvancedAnalytics.tsx (209 lines)
```

**Key Improvements:**
- Main component reduced from 720 to 197 lines (73% reduction)
- Clear separation of concerns: upgrade prompts, empty states, and stat sections
- Reusable hook for upgrade prompt management
- Components organized by tier feature (basic, social, premium)
- All TypeScript checks pass
- Leverages existing `usePlayerStatistics` hook for data fetching

### Phase 3: Theme Tokens
- [x] 3.1 Hardcoded values audit
- [x] 3.2 Inline styles audit

#### 3.2 Inline Styles Audit Results

**Action Taken: Audited and refactored inline styles to StyleSheet**

**Summary:**
- Found 468 inline style occurrences across 85 files
- Most were in test/story files (expected)
- Only 22 occurrences in component files
- Most component inline styles correctly follow the pattern (dynamic colors inline)

**Files Refactored:**

| File | Issue | Fix |
|------|-------|-----|
| `CompareStatsScreen.tsx` | 5x `style={{ marginTop: spacing.xl }}` on SectionHeader | Moved to `styles.sectionHeader` |
| `UnevenTeamWarning.tsx` | 2x `style={{ fontWeight: '600' }}` | Moved to `styles.boldText` |
| `Paywall.tsx` | `marginVertical: spacing.lg` on Divider | Moved to `styles.divider` |

**Pattern Verified:**
- Static values (spacing, borderRadius) → StyleSheet.create()
- Dynamic values (colors from useThemeColors()) → inline style array `style={[styles.x, { color: colors.y }]}`

**Files Already Correct (dynamic colors inline):**
- `FriendsScreen.tsx` - Badge backgroundColor
- `CourseTeesStep.tsx` - Dynamic button colors
- `ScoringSetupStep.tsx` - Dynamic text colors
- `PartnersStep.tsx` - Dynamic text colors
- `MatchTypeStep.tsx` - Dynamic text colors
- `BallCountStep.tsx` - Dynamic text colors
- `PlanComparisonCard.tsx` - Divider backgroundColor

#### 3.1 Hardcoded Values Audit Results

**Action Taken: Comprehensive audit and fix of hardcoded style values**

**Hardcoded Colors:**
| Category | Result |
|----------|--------|
| Source files (.tsx) | 1 intentional hardcoded color found |
| Test/Story files | Many (expected - for mocking theme) |

**Findings:**
- `#7c3aed` in `CompetitionsListScreen.tsx:401` - **Intentionally hardcoded purple** for AI Create button to visually distinguish AI features from the primary green brand color
- The `withOpacity()` utility already exists in `src/constants/colors.ts` (lines 17-50)

**Hardcoded Spacing:**
- **No issues found** in screen source files
- All spacing values correctly use `spacing.*` tokens

**Hardcoded borderRadius - Fixed 20 instances across 15 files:**

| File | Before | After |
|------|--------|-------|
| `onboarding/NotificationsStep.tsx:181` | `borderRadius: 70` | `borderRadius.full` |
| `onboarding/OnboardingDots.tsx:64` | `borderRadius: 4` | `borderRadius.sm` |
| `onboarding/HandicapCaptureStep.tsx:169` | `borderRadius: 70` | `borderRadius.full` |
| `onboarding/HomeVenueStep.tsx:339` | `borderRadius: 70` | `borderRadius.full` |
| `onboarding/CreateCompetitionsStep.tsx:54` | `borderRadius: 70` | `borderRadius.full` |
| `scoring/ScorecardFooter.tsx:118` | `borderRadius: 12` | `borderRadius.lg` |
| `competitions/LeaderboardScreen.tsx:163,181` | `borderRadius: 40, 12` | `borderRadius.full, borderRadius.lg` |
| `competitions/JoinCompetitionScreen.tsx:584` | `borderRadius: 40` | `borderRadius.full` |
| `auth/SignupScreen.tsx:478` | `borderRadius: 40` | `borderRadius.full` |
| `rounds/CreateRoundBottomSheet/index.tsx:304` | `borderRadius: 4` | `borderRadius.sm` |
| `admin/AILoadingState.tsx:154,161,203` | `borderRadius: 50, 50, 12` | `borderRadius.full (x3)` |
| `admin/CreateCompetitionScreen.tsx:519` | `borderRadius: 5` | `borderRadius.full` |
| `admin/TeamRoundSection.tsx:292` | `borderRadius: 14` | `borderRadius.full` |
| `profile/SettingsScreen.tsx:465` | `borderRadius: 10` | `borderRadius.full` |
| `profile/EditProfileScreen.tsx:494` | `borderRadius: 16` | `borderRadius.full` |
| `profile/StatisticsEmptyStates.tsx:103` | `borderRadius: 40` | `borderRadius.full` |
| `social/PlayerDetailScreen.tsx:549` | `borderRadius: 20` | `borderRadius.full` |
| `scoring/MatchProgress.tsx:133` | `borderRadius: 6` | `borderRadius.full` |

**Pattern Applied:**
- All circular elements (where borderRadius = width/2 or height/2) now use `borderRadius.full` (9999)
- This ensures circles remain circular regardless of size changes
- Standard rounded corners use appropriate tokens: `borderRadius.sm` (4), `borderRadius.lg` (12), etc.

**Known Files from Plan - Status:**
| File | Status |
|------|--------|
| `CourseDetailScreen/index.tsx` | ✅ Uses `colors.warningLight + '30'` - OK (withOpacity not needed here) |
| `TeeSelectionStep.tsx` | ✅ Already refactored to TeeSelector component |
| `EditRoundScreen/components/TeeSelector.tsx` | ✅ Deleted (consolidated into common TeeSelector) |

### Phase 4: Missing Abstractions
- [x] 4.1 DateTimeFieldGroup
- [x] 4.2 PlayerSelector
- [x] 4.3 FormSection

#### 4.1 DateTimeFieldGroup Results

**Action Taken: Created reusable date+time picker component**

The `DateTimeFieldGroup` component consolidates date and optional time selection into a single reusable component that encapsulates iOS/Android date picker differences.

**Component Created:**
| File | Purpose |
|------|---------|
| `src/components/common/DateTimeFieldGroup.tsx` | Main component (320 lines) |
| `src/components/common/DateTimeFieldGroup.stories.tsx` | Storybook stories (350 lines) |
| `src/components/common/DateTimeFieldGroup.test.tsx` | Unit tests (49 tests, 100% pass) |

**Props Interface:**
```typescript
interface DateTimeFieldGroupProps {
  date: Date;
  onDateChange: (date: Date) => void;
  time?: Date;
  onTimeChange?: (time: Date) => void;
  label?: string;
  showTime?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  dateError?: string;
  timeError?: string;
  disabled?: boolean;
  required?: boolean;
  timeLabel?: string;
  minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
  showTimeClear?: boolean;
  onTimeClear?: () => void;
  testID?: string;
}
```

**Key Features:**
- Encapsulates iOS modal picker and Android inline picker differences
- Australian date format (DD/MM/YYYY) built-in
- Optional time field with clear button
- Configurable minute intervals (5min default)
- Error states for both date and time fields
- Disabled state support
- Minimum/maximum date constraints
- Full accessibility support
- Dark mode support via `useThemeColors()`

**Files Updated to Use Component:**
| File | Change |
|------|--------|
| `src/screens/admin/EditRoundScreen/components/DateTimeSection.tsx` | Now wraps `DateTimeFieldGroup` |
| `src/screens/admin/AddRoundScreen/components/DateTimeFields.tsx` | Now wraps `DateTimeFieldGroup` |

**Note:** `EditCompetitionScreen` uses date-only pickers via the existing `DatePicker` component, which is appropriate for competition start/end dates that don't need time selection.

**Usage Example:**
```typescript
import { DateTimeFieldGroup } from '@/components/common';

// Date only
<DateTimeFieldGroup
  date={selectedDate}
  onDateChange={setSelectedDate}
  label="Round Date"
/>

// Date and time
<DateTimeFieldGroup
  date={selectedDate}
  onDateChange={setSelectedDate}
  time={selectedTime}
  onTimeChange={setSelectedTime}
  showTime
  timeLabel="Tee Time (Optional)"
  onTimeClear={() => setSelectedTime(undefined)}
  showTimeClear
  minuteInterval={5}
/>
```

#### 4.2 PlayerSelector Results

**Action Taken: Created unified player selection component**

The `PlayerSelector` component provides a flexible way to select players from any array of player-like objects, supporting both single and multi-select modes.

**Key Differences from FriendSelector:**
- Works with any `SelectablePlayer[]` (not just `Friend[]`)
- Supports single-select mode (default) and multi-select mode
- No add friend button (pure selection, not creation)
- Simplified props interface
- Internal search state management

**Component Created:**
| File | Purpose |
|------|---------|
| `src/components/common/PlayerSelector/PlayerSelector.tsx` | Main component |
| `src/components/common/PlayerSelector/PlayerListItem.tsx` | Individual player row |
| `src/components/common/PlayerSelector/SelectedPlayerPill.tsx` | Selected player chip |
| `src/components/common/PlayerSelector/PlayerSelector.types.ts` | TypeScript types |
| `src/components/common/PlayerSelector/PlayerSelector.test.tsx` | Unit tests |
| `src/components/common/PlayerSelector/PlayerSelector.stories.tsx` | Storybook stories |
| `src/components/common/PlayerSelector/index.ts` | Barrel exports |

**Props Interface:**
```typescript
interface PlayerSelectorProps<T extends SelectablePlayer> {
  players: T[];                    // Array of players to select from
  selectedIds: string[];           // Currently selected player IDs
  onSelect: (ids: string[]) => void; // Selection change callback
  multiSelect?: boolean;           // Enable multi-select (default: false)
  maxSelections?: number;          // Max selections (multi-select only)
  searchable?: boolean;            // Enable search bar (default: true)
  showHandicap?: boolean;          // Show handicap (default: true)
  loading?: boolean;               // Loading state
  listTitle?: string;              // Title above player list
  selectedTitle?: string;          // Title above selected section
  emptyMessage?: string;           // No players message
  emptySearchMessage?: string;     // No search results message
  searchPlaceholder?: string;      // Search input placeholder
  lockedPlayerIds?: string[];      // IDs that cannot be deselected
  showReadyBadge?: boolean;        // Show "Ready" when min met
  limits?: PlayerSelectionLimits;  // Min/max selection limits
  showLimitIndicator?: boolean;    // Show limit progress bar
  limitIndicatorLabel?: string;    // Label for limit indicator
  testID?: string;                 // Test ID
}

interface SelectablePlayer {
  id: string;
  name: string;
  email?: string | null;
  handicap?: number | null;
  photo_url?: string | null;
}
```

**Key Features:**
- Single-select mode: selecting new player replaces current selection
- Multi-select mode: add/remove players, limit enforcement
- Built-in search filtering by name or email
- Locked players cannot be deselected (useful for current user)
- Approaching limit and at limit warnings
- Ready badge when minimum requirement met
- Dark mode support via `useThemeColors()`
- Full accessibility support

**Usage Examples:**
```typescript
import { PlayerSelector } from '@/components/common';

// Single select (e.g., choose opponent)
<PlayerSelector
  players={roundPlayers}
  selectedIds={selectedOpponentId ? [selectedOpponentId] : []}
  onSelect={(ids) => setSelectedOpponentId(ids[0] || null)}
  listTitle="Select your opponent"
/>

// Multi-select with limits (e.g., round creation)
<PlayerSelector
  players={availablePlayers}
  selectedIds={selectedPlayerIds}
  onSelect={setSelectedPlayerIds}
  multiSelect
  maxSelections={4}
  showLimitIndicator
  lockedPlayerIds={[currentUserId]}
  limits={{ min: 2, max: 4 }}
  showReadyBadge
  selectedTitle="YOUR GROUP"
/>

// Team formation
<PlayerSelector
  players={competitionPlayers}
  selectedIds={teamAIds}
  onSelect={setTeamAIds}
  multiSelect
  limits={{ min: 2, max: 2 }}
  showReadyBadge
  selectedTitle="TEAM A"
  listTitle="Select 2 players for Team A"
/>
```

**Exported from:**
- `@/components/common` (barrel export)
- `@/components/common/PlayerSelector` (direct import)

#### 4.3 FormSection Results

**Action Taken: Created reusable form section wrapper component**

The `FormSection` component provides consistent spacing, typography, and layout for form sections across the app.

**Component Created:**
| File | Purpose |
|------|---------|
| `src/components/common/FormSection.tsx` | Main component (140 lines) |
| `src/components/common/FormSection.stories.tsx` | Storybook stories (500+ lines) |
| `src/components/common/FormSection.test.tsx` | Unit tests (66 tests, 100% pass) |

**Props Interface:**
```typescript
interface FormSectionProps {
  title?: string;          // Optional section title
  description?: string;    // Optional description below title
  children: React.ReactNode; // Form content
  error?: string;          // Optional error message to display
  required?: boolean;      // Show required indicator (*) after title
  noCard?: boolean;        // Hide surface card styling (for nested sections)
  style?: ViewStyle;       // Container style override
  titleStyle?: TextStyle;  // Title style override
  descriptionStyle?: TextStyle; // Description style override
  testID?: string;         // Test ID for testing
}
```

**Key Features:**
- Surface card styling by default with shadows
- Optional title with required indicator (*)
- Optional description text below title
- Error message display (red text)
- `noCard` variant for nested sections without card styling
- Full dark mode support via `useThemeColors()`
- Accessibility (title has header role)
- Memoized for performance

**Usage Examples:**
```typescript
import { FormSection } from '@/components/common';

// Basic usage
<FormSection title="Competition Details">
  <TextInput ... />
</FormSection>

// With description and required indicator
<FormSection
  title="Player Information"
  description="Enter details for each player"
  required
>
  <TextInput ... />
</FormSection>

// With error message
<FormSection
  title="Handicap"
  error="Please enter a valid handicap between 0 and 54"
>
  <TextInput ... />
</FormSection>

// Nested sections (no card styling)
<FormSection title="Competition Setup">
  <FormSection title="Basic Info" noCard>
    <TextInput ... />
  </FormSection>
  <FormSection title="Settings" noCard>
    <TextInput ... />
  </FormSection>
</FormSection>
```

**Exported from:**
- `@/components/common` (barrel export)

### Phase 5: Large Components
- [x] 5.1 Paywall (684 lines → 326 lines)
- [x] 5.2 ApiSearchModal (REMOVED - component deleted, no longer needed)
- [x] 5.3 RoundListCard (593 lines → 170 lines)
- [x] 5.4 DetailsTab (709 lines → 101 lines)
- [x] 5.5 PlayerScoreCard (581 lines → 209 lines)

#### 5.1 Paywall Refactoring Results

**Action Taken: Extracted sub-components, utilities, and styles**

The component was refactored from 684 lines to 326 lines (52% reduction) by extracting sub-components, tier configuration, and styles.

**New Files Created:**
| File | Purpose |
|------|---------|
| `tierConfig.ts` | Tier configuration constants (features, colors, descriptions) - 90 lines |
| `TierCard.tsx` | Individual subscription tier card component - 100 lines |
| `FeatureRow.tsx` | Single feature row with checkmark icon - 65 lines |
| `FeaturesList.tsx` | Features list card for a tier - 55 lines |
| `Paywall.styles.ts` | Extracted StyleSheet - 115 lines |

**File Structure:**
```
src/components/subscription/
├── Paywall.tsx (326 lines - main component)
├── Paywall.styles.ts (115 lines)
├── tierConfig.ts (90 lines)
├── TierCard.tsx (100 lines)
├── FeatureRow.tsx (65 lines)
├── FeaturesList.tsx (55 lines)
└── index.ts (updated exports)
```

**Key Improvements:**
- Main component reduced from 684 to 326 lines (52% reduction)
- Tier configuration centralized in `tierConfig.ts` with typed exports
- `TierCard` reusable for tier selection UI
- `FeatureRow` reusable for any feature list display
- `FeaturesList` combines features for a tier with styled card
- Styles extracted to separate file for maintainability
- All TypeScript types properly exported
- Existing tests and stories remain compatible

#### 5.3 RoundListCard Refactoring Results

**Action Taken: Extracted custom hook, sub-components, and types**

The component was refactored from 593 lines to 170 lines (71% reduction) by extracting a custom hook, sub-components, and types.

**New Hook Created:**
| Hook | Purpose |
|------|---------|
| `useSwipeGesture` | Manages PanResponder and Animated logic for swipe-to-delete functionality (118 lines) |

**New Components Created:**
| Component | Purpose |
|-----------|---------|
| `RoundCardHeader` | Status badge, round pill, and title (56 lines) |
| `RoundCardMeta` | Course info, players, date, game type, and progress bar (121 lines) |
| `RoundCardActions` | Delete button for swipe actions (65 lines) |

**New Types/Utilities:**
| File | Purpose |
|------|---------|
| `types.ts` | All interfaces (RoundListCardData, RoundListCardProps, etc.) and utility functions (formatGameType, getStatusVariant) - 136 lines |

**File Structure:**
```
src/components/rounds/RoundListCard/
├── index.ts (15 lines - barrel exports)
├── types.ts (136 lines)
├── useSwipeGesture.ts (118 lines)
├── RoundListCard.tsx (170 lines - main component)
├── RoundCardHeader.tsx (56 lines)
├── RoundCardMeta.tsx (121 lines)
├── RoundCardActions.tsx (65 lines)
├── RoundListCard.test.tsx (889 lines - 61 tests, 100% pass)
└── RoundListCard.stories.tsx (550 lines)
```

**Key Improvements:**
- Main component reduced from 593 to 170 lines (71% reduction)
- Clear separation of concerns: swipe logic in hook, header/meta/actions in sub-components
- Types extracted to dedicated file for reuse
- Eliminated code duplication between swipe and non-swipe render paths
- Backward compatibility maintained via re-export from original location
- All 61 existing tests continue to pass
- Utility functions (formatGameType, getStatusVariant) exported for reuse

#### 5.4 DetailsTab Refactoring Results

**Action Taken: Extracted sub-components to sections subdirectory**

The component was refactored from 709 lines to 101 lines (86% reduction) by extracting sections into reusable sub-components.

**New Components Created:**
| Component | Purpose |
|-----------|---------|
| `CompetitionInfoSection` | Header card with competition icon, name, dates, type badge, description, quick stats (rounds/players), and invite code with copy functionality (215 lines) |
| `CurrentStandingSection` | Player's current standing card showing position and points - only shown for non-organizers (80 lines) |
| `SettingsSection` | Competition settings display with type, handicap system, team mode, team size, and status. Includes EditableDetailRow helper component (210 lines) |
| `CoursesSection` | List of unique courses used in competition rounds, with empty state (66 lines) |

**New Types/Utilities:**
| File | Purpose |
|------|---------|
| `types.ts` | Shared types (CompetitionInfoSectionProps, CurrentStandingSectionProps, SettingsSectionProps, CoursesSectionProps, EditableDetailRowProps) and label helpers (competitionTypeLabels, handicapSystemLabels, teamModeLabels) - 67 lines |
| `styles.ts` | Shared styles for section components (optional, not heavily used) - 75 lines |

**File Structure:**
```
src/components/competitions/detail/
├── DetailsTab.tsx (101 lines - main orchestrator)
├── DetailsTab.test.tsx (existing - 65 tests, 100% pass)
├── DetailsTab.stories.tsx (existing)
├── types.ts (existing)
├── sections/
│   ├── index.ts (barrel exports)
│   ├── types.ts (67 lines)
│   ├── styles.ts (75 lines)
│   ├── CompetitionInfoSection.tsx (215 lines)
│   ├── CurrentStandingSection.tsx (80 lines)
│   ├── SettingsSection.tsx (210 lines)
│   └── CoursesSection.tsx (66 lines)
```

**Key Improvements:**
- Main component reduced from 709 to 101 lines (86% reduction)
- Clear separation of concerns: each section is self-contained
- Shared types and label helpers in dedicated types file
- All 65 existing tests continue to pass
- No TypeScript errors in refactored code
- Consistent with existing codebase patterns (sections subdirectory)

#### 5.5 PlayerScoreCard Refactoring Results

**Action Taken: Extracted sub-components and custom hook**

The component was refactored from 581 lines to 209 lines (64% reduction) by extracting reusable sub-components and a logic hook.

**New Hook Created:**
| Hook | Purpose |
|------|---------|
| `usePlayerScoreCardLogic` | Manages score state, calculations, and all event handlers (score select, stats updates) |

**New Components Created:**
| Component | Purpose |
|-----------|---------|
| `QuickActionButton` | Reusable button for quick actions (Pick Up, Par) with label below |
| `ScoreInputStepper` | +/- stepper for score entry with current score display |
| `StatsRow` | Optional stats display (FIR, GIR, Putts) based on visibility settings |

**File Structure:**
```
src/components/scorecard/PlayerScoreCard/
├── index.ts (barrel exports)
├── PlayerScoreCard.tsx (209 lines - main component)
├── QuickActionButton.tsx (88 lines)
├── ScoreInputStepper.tsx (110 lines)
├── StatsRow.tsx (195 lines)
└── usePlayerScoreCardLogic.ts (120 lines)
```

**Key Improvements:**
- Main component reduced from 581 to 209 lines (64% reduction)
- Clear separation of concerns: logic in hook, UI in sub-components
- Reusable components for quick actions and steppers
- Stats row fully encapsulated with visibility logic
- All handlers memoized in hook for performance
- Backward compatibility via re-export from original location
- No TypeScript errors in refactored code

**Bug Fixes Also Applied:**

1. **Multi-ball scorecard columns width issue**: Changed from fixed widths to flex ratios so columns fill the screen width properly for 2-ball and 3-ball rounds.

2. **View mode toggle not working**: Connected the `viewMode` state from the header toggle to the `ScorecardTable` component, enabling switching between standard (multi-ball) and compact (single best score) views.
