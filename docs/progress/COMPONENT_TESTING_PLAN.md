# Component Testing Plan - The Nineteenth

> **Document Location:** `docs/progress/COMPONENT_TESTING_PLAN.md`
> **Created:** December 2024
> **Related:** See `TESTING_PLAN.md` for utility/hook/service testing

## Overview

This document outlines all **React components** that need testing in The Nineteenth golf app. Currently 25 of 147 components (17.0%) have test coverage.

**Note:** This complements `TESTING_PLAN.md` which covers utilities, hooks, stores, and services.

## Current Test Coverage

### Components WITH Tests (25 total)
| Component | Lines | Has Stories |
|-----------|-------|-------------|
| `src/components/common/BottomSheet/BottomSheet.tsx` | 260 | Yes |
| `src/components/competitions/CompetitionListCard.tsx` | 459 | Yes |
| `src/components/competitions/detail/DetailsTab.tsx` | 709 | Yes |
| `src/components/competitionWizard/AddPlayersBottomSheet.tsx` | 847 | Yes |
| `src/components/competitionWizard/create/AddPlayersStep.tsx` | 619 | Yes |
| `src/components/competitionWizard/create/ReviewStep.tsx` | 452 | Yes |
| `src/components/competitionWizard/create/TeamSettingsStep.tsx` | 587 | Yes |
| `src/components/courses/ApiSearchModal.tsx` | 628 | Yes |
| `src/components/courses/VenueCard.tsx` | 444 | Yes |
| `src/components/leaderboard/LeaderboardTab.tsx` | 567 | Yes |
| `src/components/leaderboard/RoundLeaderboard.tsx` | 857 | Yes |
| `src/components/leaderboard/TeamLeaderboardTable.tsx` | 538 | Yes |
| `src/components/rounds/RoundListCard.tsx` | 593 | Yes |
| `src/components/rounds/ViewRound/RoundDetailsTab/index.tsx` | 482 | Yes |
| `src/components/rounds/ViewRound/RoundDetailsTab/components/ScoringPairsSection.tsx` | 448 | Yes |
| `src/components/rounds/ViewRound/RoundScorecardTab.tsx` | 581 | Yes |
| `src/components/scorecard/BestBallScoreView.tsx` | 477 | Yes |
| `src/components/scorecard/PlayerScoreCard.tsx` | 581 | Yes |
| `src/components/scorecard/ScorecardDebugPanel.tsx` | 771 | Yes |
| `src/components/scorecard/ScorecardTable/ScorecardTable.tsx` | 548 | Yes |
| `src/components/scorecard/SwipeableHoleNavigator.tsx` | 529 | Yes |
| `src/components/scorecard/TeamMatchPlayScoreView.tsx` | 524 | Yes |
| `src/components/scorecard/TeamScoreCard.tsx` | 467 | Yes |
| `src/components/scoring/ScoringPairFormationUI/index.tsx` | 810 | Yes |
| `src/components/teams/TeamFormationUI.tsx` | 851 | Yes |

---

## Components Needing Tests

### TIER 1: Critical/Complex (600+ lines) - COMPLETED

All Tier 1 critical/complex components have been tested.

### TIER 2: High Priority (400-599 lines) - 1 component

| Component | Lines | Directory |
|-----------|-------|-----------|
| `UpgradePrompt.tsx` | 433 | subscription |

### TIER 3: Medium Priority (200-399 lines) - 32 components

#### Common Components (11)
| Component | Lines |
|-----------|-------|
| `PageHeader.tsx` | 347 |
| `DatePicker.tsx` | 276 |
| `FormInput.tsx` | 276 |
| `Pill.tsx` | 257 |
| `Tabs.tsx` | 249 |
| `ConfirmationDialog.tsx` | 234 |
| `ExpandableItem.tsx` | 219 |
| `EmptyState.tsx` | 208 |
| `SegmentedButton.tsx` | 206 |
| `StatusBadge.tsx` | 200 |

#### Competition Wizard (6)
| Component | Lines |
|-----------|-------|
| `RoundGameTypeSelector.tsx` | 398 |
| `RoundCard.tsx` (RoundDetailsStep) | 378 |
| `RoundCard.tsx` | 313 |
| `CompetitionDetailsStep.tsx` | 309 |
| `RoundDetailsStep/index.tsx` | 267 |
| `TeamFormatSelector.tsx` | 260 |

#### Courses (4)
| Component | Lines |
|-----------|-------|
| `HoleDataStep.tsx` | 352 |
| `CourseTeesStep.tsx` | 323 |
| `CourseCard.tsx` | 290 |
| `AddCourseModal/index.tsx` | 222 |

#### Scorecard (3)
| Component | Lines |
|-----------|-------|
| `QuickScorecardView.tsx` | 265 |
| `ScoreIndicator.tsx` | 249 |
| `HoleTable.tsx` | 214 |

#### Other (8)
| Component | Lines | Directory |
|-----------|-------|-----------|
| `TeamCard.tsx` | 430 | teams |
| `RoundPlayersTab.tsx` | 365 | rounds/ViewRound |
| `ScoringPairFormationInline.tsx` | 346 | scoring |
| `LeaderboardTable.tsx` | 342 | leaderboard |
| `FeatureLock.tsx` | 328 | subscription |
| `PlayerCard.tsx` | 286 | social |
| `BottomNavigation.tsx` | 283 | layout |
| `RoundLeaderboardTab.tsx` | 271 | rounds/ViewRound |

### TIER 4: Lower Priority (100-199 lines) - 45 components

#### Common (13)
- `OfflineIndicator.tsx` (193), `ErrorState.tsx` (191), `StepIndicator.tsx` (175)
- `DateTimeDisplay.tsx` (172), `ProgressBar.tsx` (171), `GolfBallLoader.tsx` (149)
- `LoadingSpinner.tsx` (143), `BottomSheetHeader.tsx` (137), `FeatureButton.tsx` (136)
- `SectionHeader.tsx` (123), `FilterPill.tsx` (120), `NotificationBell.tsx` (120)
- `SearchBar.tsx` (106)

#### Competition Wizard (5)
- `CompetitionHeaderCard.tsx` (230), `CourseSelectionModal.tsx` (221)
- `TeeSelectionModal.tsx` (175), `MatchTypeModal.tsx` (152), `VenueDetailsStep.tsx` (123)

#### Competitions (4)
- `CompetitionRoundCard.tsx` (249), `TeamsTab.tsx` (212), `PlayersTab.tsx` (185)
- `RoundsTab.tsx` (125)

#### Social (8)
- `AddFriendModal.tsx` (206), `SearchResultCard.tsx` (181), `DistributionComparison.tsx` (179)
- `FriendRequestCard.tsx` (172), `PlayerCompareHeader.tsx` (135), `ComparisonRow.tsx` (134)
- `FriendCard.tsx` (122), `ComparisonLegend.tsx` (100)

#### Statistics (6)
- `PerformanceChart.tsx` (235), `RecentRoundRow.tsx` (138), `StatCard.tsx` (120)
- `ScoreDistributionBar.tsx` (111), `CourseStatsCard.tsx` (107), `PerformanceRow.tsx` (100)

#### Subscription (4)
- `LimitIndicator.tsx` (245), `TierBadge.tsx` (244), `EditTeamNameModal.tsx` (236)
- `FeatureLockButton.tsx` (224)

#### Notifications (2)
- `NotificationToast.tsx` (273), `NotificationItem.tsx` (253)

#### Scorecard (4)
- `HoleHeader.tsx` (194), `HoleProgressBar.tsx` (122), `CompactScoreIndicator.tsx` (100)

#### Scoring (5)
- `ScoringPairCard.tsx` (215), `CircularChainDiagram.tsx` (204)
- `UnevenTeamWarning.tsx` (174), `PlayerSelectionChip.tsx` (128), `PairingTypeBadge.tsx` (88)

#### Courses (2)
- `CourseListContent.tsx` (149), `StateFilterList.tsx` (120)

---

## Recommended Testing Approach

### For Each Component:
1. Create `ComponentName.test.tsx` in same directory
2. Create `ComponentName.stories.tsx` for visual testing
3. Follow patterns from existing tests (BottomSheet, ScorecardTable, RoundLeaderboard)

### Test Categories to Cover:
- **Rendering**: Component mounts without errors
- **Props**: Different prop combinations render correctly
- **User Interactions**: Buttons, inputs, gestures work
- **State Changes**: State updates trigger correct UI changes
- **Edge Cases**: Empty data, null values, errors
- **Accessibility**: Labels, roles, hints

### Mocking Patterns Established:
```typescript
// Icons - use require inside factory
jest.mock('@tabler/icons-react-native', () => {
  const { View } = require('react-native');
  return {
    IconGolf: (props) => <View testID="icon-golf" {...props} />,
  };
});

// Child components
jest.mock('@/components/common/DateTimeDisplay', () => {
  const { View, Text } = require('react-native');
  return {
    DateTimeDisplay: ({ date }) => (
      <View testID="datetime-display"><Text>{date}</Text></View>
    ),
  };
});

// Hooks
jest.mock('@/hooks/useRoundLeaderboard', () => ({
  useRoundLeaderboard: jest.fn(),
}));
```

---

## Summary Statistics

| Tier | Components | % of Total |
|------|------------|------------|
| Already Tested | 25 | 17.0% |
| Tier 1 (Critical) | 0 | 0.0% |
| Tier 2 (High) | 1 | 0.7% |
| Tier 3 (Medium) | 32 | 21.8% |
| Tier 4 (Lower) | 45 | 30.6% |
| **Total Needing Tests** | **122** | **83.0%** |

---

## Files Reference

### Test Infrastructure (already set up)
- `jest.config.js` - Jest configuration
- `jest.setup.js` - Global test setup with mocks
- `src/__tests__/utils/renderHelpers.tsx` - Custom render with providers
- `src/__tests__/utils/testFixtures.ts` - Reusable test data
- `src/__tests__/mocks/` - Mock files for contexts, stores, navigation

### Example Test Files (use as templates)
- `src/components/common/BottomSheet/BottomSheet.test.tsx`
- `src/components/competitions/CompetitionListCard.test.tsx`
- `src/components/competitions/detail/DetailsTab.test.tsx`
- `src/components/competitionWizard/AddPlayersBottomSheet.test.tsx`
- `src/components/competitionWizard/create/AddPlayersStep.test.tsx`
- `src/components/courses/ApiSearchModal.test.tsx`
- `src/components/courses/VenueCard.test.tsx`
- `src/components/leaderboard/LeaderboardTab.test.tsx`
- `src/components/leaderboard/RoundLeaderboard.test.tsx`
- `src/components/rounds/RoundListCard.test.tsx`
- `src/components/rounds/ViewRound/RoundScorecardTab.test.tsx`
- `src/components/scorecard/BestBallScoreView.test.tsx`
- `src/components/scorecard/PlayerScoreCard.test.tsx`
- `src/components/scorecard/ScorecardDebugPanel.test.tsx`
- `src/components/scorecard/ScorecardTable/ScorecardTable.test.tsx`
- `src/components/scorecard/TeamMatchPlayScoreView.test.tsx`
- `src/components/scorecard/TeamScoreCard.test.tsx`
- `src/components/scoring/ScoringPairFormationUI/ScoringPairFormationUI.test.tsx`
- `src/components/teams/TeamFormationUI.test.tsx`
- `src/components/competitionWizard/create/TeamSettingsStep.test.tsx`
- `src/components/leaderboard/TeamLeaderboardTable.test.tsx`
- `src/components/scorecard/SwipeableHoleNavigator.test.tsx`
- `src/components/rounds/ViewRound/RoundDetailsTab/RoundDetailsTab.test.tsx`
- `src/components/rounds/ViewRound/RoundDetailsTab/components/ScoringPairsSection.test.tsx`
- `src/components/competitionWizard/create/ReviewStep.test.tsx`

---

## Phase Status Tracking

| Phase | Description | Status | Completed |
|-------|-------------|--------|-----------|
| 0 | Setup (plan + existing tests) | COMPLETED | 2024-12-17 |
| 1 | Tier 1 Critical Components | COMPLETED | 2024-12-18 |
| 2 | Tier 2 High Priority Components | IN_PROGRESS | - |
| 3 | Tier 3 Medium Priority Components | PENDING | - |
| 4 | Tier 4 Lower Priority Components | PENDING | - |

**Status Legend:** PENDING | IN_PROGRESS | REVIEW | COMPLETED | BLOCKED

### Recent Test Additions:
- **2024-12-20**: `VenueCard.tsx` - 59 tests, 26 stories
- **2024-12-20**: `ScoringPairsSection.tsx` - 55 tests, 34 stories
- **2024-12-19**: `ReviewStep.tsx` - 77 tests, 34 stories
- **2024-12-19**: `CompetitionListCard.tsx` - 62 tests, 38 stories
- **2024-12-19**: `TeamScoreCard.tsx` - 66 tests, 30 stories
- **2024-12-19**: `BestBallScoreView.tsx` - 59 tests, 35 stories
- **2024-12-18**: `RoundDetailsTab/index.tsx` - 70 tests, 47 stories
- **2024-12-18**: `TeamMatchPlayScoreView.tsx` - 64 tests, 35 stories
- **2024-12-18**: `SwipeableHoleNavigator.tsx` - 51 tests, 17 stories
- **2024-12-18**: `TeamLeaderboardTable.tsx` - 47 tests, 26 stories
- **2024-12-18**: `LeaderboardTab.tsx` - 49 tests, 20 stories
- **2024-12-18**: `PlayerScoreCard.tsx` - 75 tests, 24 stories
- **2024-12-18**: `RoundScorecardTab.tsx` - 40 tests, 22 stories
- **2024-12-18**: `TeamSettingsStep.tsx` - 65 tests, 20 stories
- **2024-12-18**: `RoundListCard.tsx` - 61 tests, 28 stories
- **2024-12-18**: `AddPlayersStep.tsx` - 46 tests, 10 stories
- **2024-12-17**: `ApiSearchModal.tsx` - 46 tests, 10 stories
- **2024-12-17**: `DetailsTab.tsx` - 65 tests, 17 stories
- **2024-12-17**: `ScorecardDebugPanel.tsx` - 66 tests, 14 stories
- **2024-12-17**: `AddPlayersBottomSheet.tsx` - 45 tests, 10 stories
