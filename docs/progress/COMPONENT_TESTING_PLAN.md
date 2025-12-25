# Component Testing Plan - The Nineteenth

> **Document Location:** `docs/progress/COMPONENT_TESTING_PLAN.md`
> **Created:** December 2024
> **Related:** See `TESTING_PLAN.md` for utility/hook/service testing

## Overview

This document outlines all **React components** that need testing in The Nineteenth golf app. Currently 78 of 129 components (60.5%) have test coverage.

> **Note:** FriendSelector was already in the tested list but tests were fixed on 2024-12-25.

**Note:** This complements `TESTING_PLAN.md` which covers utilities, hooks, stores, and services.

## Current Test Coverage

### Components WITH Tests (78 total)
| Component | Lines | Has Stories |
|-----------|-------|-------------|
| `src/components/ai/GeneratedPreview.tsx` | 511 | Yes |
| `src/components/ai/PromptInput.tsx` | 175 | Yes |
| `src/components/ai/SuggestionChips.tsx` | 129 | Yes |
| `src/components/subscription/Paywall.tsx` | 680 | Yes |
| `src/components/common/AvatarSelectionModal.tsx` | 229 | Yes |
| `src/components/common/GolferIcon.tsx` | 249 | Yes |
| `src/components/common/PlayerAvatar.tsx` | 127 | Yes |
| `src/components/common/FeatureButton.tsx` | 175 | Yes |
| `src/components/common/BottomSheet/BottomSheetHeader.tsx` | 137 | Yes |
| `src/components/common/ErrorState.tsx` | 191 | Yes |
| `src/components/notifications/NotificationItem.tsx` | 253 | Yes |
| `src/components/notifications/NotificationToast.tsx` | 273 | Yes |
| `src/components/rounds/ViewRound/RoundLeaderboardTab.tsx` | 271 | Yes |
| `src/components/layout/BottomNavigation.tsx` | 283 | Yes |
| `src/components/social/PlayerCard.tsx` | 286 | Yes |
| `src/components/subscription/FeatureLock.tsx` | 328 | Yes |
| `src/components/leaderboard/LeaderboardTable.tsx` | 342 | Yes |
| `src/components/scorecard/QuickScorecardView.tsx` | 265 | Yes |
| `src/components/courses/AddCourseModal/index.tsx` | 222 | Yes |
| `src/components/common/BottomSheet/BottomSheet.tsx` | 260 | Yes |
| `src/components/common/ConfirmationDialog.tsx` | 234 | Yes |
| `src/components/common/DatePicker.tsx` | 276 | Yes |
| `src/components/common/ExpandableItem.tsx` | 219 | Yes |
| `src/components/common/FormInput.tsx` | 276 | Yes |
| `src/components/common/PageHeader.tsx` | 347 | Yes |
| `src/components/common/SegmentedButton.tsx` | 206 | Yes |
| `src/components/common/Tabs.tsx` | 249 | Yes |
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
| `src/components/subscription/UpgradePrompt.tsx` | 433 | Yes |
| `src/components/teams/TeamFormationUI.tsx` | 851 | Yes |
| `src/components/common/Pill.tsx` | 257 | Yes |
| `src/components/common/EmptyState.tsx` | 208 | Yes |
| `src/components/common/StatusBadge.tsx` | 200 | Yes |
| `src/components/competitionWizard/create/RoundGameTypeSelector.tsx` | 398 | Yes |
| `src/components/competitionWizard/create/RoundDetailsStep/components/RoundCard.tsx` | 378 | Yes |
| `src/components/competitionWizard/RoundCard.tsx` | 313 | Yes |
| `src/components/competitionWizard/create/CompetitionDetailsStep.tsx` | 309 | Yes |
| `src/components/competitionWizard/create/RoundDetailsStep/index.tsx` | 267 | Yes |
| `src/components/competitionWizard/create/TeamFormatSelector.tsx` | 260 | Yes |
| `src/components/courses/AddCourseModal/steps/HoleDataStep.tsx` | 352 | Yes |
| `src/components/courses/AddCourseModal/steps/CourseTeesStep.tsx` | 323 | Yes |
| `src/components/courses/CourseCard.tsx` | 290 | Yes |
| `src/components/scorecard/ScoreIndicator.tsx` | 249 | Yes |
| `src/components/rounds/ViewRound/RoundDetailsTab/components/HoleTable.tsx` | 214 | Yes |
| `src/components/teams/TeamCard.tsx` | 430 | Yes |
| `src/components/rounds/ViewRound/RoundPlayersTab.tsx` | 365 | Yes |
| `src/components/scoring/ScoringPairFormationInline.tsx` | 346 | Yes |
| `src/components/common/OfflineIndicator.tsx` | 193 | Yes |
| `src/components/common/StepIndicator.tsx` | 175 | Yes |
| `src/components/common/DateTimeDisplay.tsx` | 172 | Yes |
| `src/components/common/ProgressBar.tsx` | 171 | Yes |
| `src/components/common/GolfBallLoader.tsx` | 149 | Yes |
| `src/components/common/LoadingSpinner.tsx` | 143 | Yes |
| `src/components/common/SectionHeader.tsx` | 123 | Yes |
| `src/components/common/FriendSelector/FriendSelector.tsx` | 395 | Yes |
| `src/components/common/FriendSelector/FriendListItem.tsx` | 162 | Yes |
| `src/components/settings/PushNotificationSettings.tsx` | 395 | Yes |

---

## Components Needing Tests

### TIER 1: Critical/Complex (600+ lines) - 0 components

All Tier 1 components have been tested.

### TIER 2: High Priority (400-599 lines) - 0 components

All Tier 2 components have been tested.

### TIER 3: Medium Priority (200-399 lines) - 0 components

All Tier 3 components have been tested.

### TIER 4: Lower Priority (100-199 lines) - 33 components

#### AI (0)
All AI components have been tested.

#### Common (3)
- `FilterPill.tsx` (120), `NotificationBell.tsx` (120), `SearchBar.tsx` (106)

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

#### Notifications (0)
All Notification components have been tested.

#### Scorecard (4)
- `HoleHeader.tsx` (194), `HoleProgressBar.tsx` (122), `CompactScoreIndicator.tsx` (100)

#### Scoring (5)
- `ScoringPairCard.tsx` (215), `CircularChainDiagram.tsx` (204)
- `UnevenTeamWarning.tsx` (174), `PlayerSelectionChip.tsx` (128), `PairingTypeBadge.tsx` (88)

#### Courses (2)
- `CourseListContent.tsx` (149), `StateFilterList.tsx` (120)

### TIER 5: Small Components (<100 lines) - 3 components

#### Common (3)
- `LogoHorizontal.tsx` (87 lines)
- `FriendSelector/SelectedPlayerChip.tsx` (71 lines)
- `Logo.tsx` (44 lines)

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
| Already Tested | 78 | 60.5% |
| Tier 1 (Critical) | 0 | 0.0% |
| Tier 2 (High) | 0 | 0.0% |
| Tier 3 (Medium) | 0 | 0.0% |
| Tier 4 (Lower) | 33 | 25.6% |
| Tier 5 (Small) | 3 | 2.3% |
| **Total Needing Tests** | **36** | **27.9%** |

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
- `src/components/common/ConfirmationDialog.test.tsx`
- `src/components/common/PageHeader.test.tsx`
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
- `src/components/subscription/UpgradePrompt.test.tsx`
- `src/components/subscription/Paywall.test.tsx`
- `src/components/common/FormInput.test.tsx`
- `src/components/common/Pill.test.tsx`
- `src/components/common/SegmentedButton.test.tsx`
- `src/components/common/Tabs.test.tsx`
- `src/components/common/EmptyState.test.tsx`
- `src/components/common/StatusBadge.test.tsx`
- `src/components/competitionWizard/create/RoundGameTypeSelector.test.tsx`
- `src/components/competitionWizard/create/RoundDetailsStep/components/RoundCard.test.tsx`
- `src/components/competitionWizard/create/CompetitionDetailsStep.test.tsx`
- `src/components/competitionWizard/create/RoundDetailsStep/RoundDetailsStep.test.tsx`
- `src/components/competitionWizard/create/TeamFormatSelector.test.tsx`
- `src/components/scorecard/QuickScorecardView.test.tsx`
- `src/components/courses/AddCourseModal/AddCourseModal.test.tsx`
- `src/components/courses/AddCourseModal/steps/HoleDataStep.test.tsx`
- `src/components/courses/AddCourseModal/steps/CourseTeesStep.test.tsx`
- `src/components/scorecard/ScoreIndicator.test.tsx`
- `src/components/rounds/ViewRound/RoundDetailsTab/components/HoleTable.test.tsx`
- `src/components/rounds/ViewRound/RoundPlayersTab.test.tsx`
- `src/components/teams/TeamCard.test.tsx`
- `src/components/scoring/ScoringPairFormationInline.test.tsx`
- `src/components/leaderboard/LeaderboardTable.test.tsx`
- `src/components/subscription/FeatureLock.test.tsx`
- `src/components/layout/BottomNavigation.test.tsx`
- `src/components/social/PlayerCard.test.tsx`
- `src/components/rounds/ViewRound/RoundLeaderboardTab.test.tsx`
- `src/components/notifications/NotificationToast.test.tsx`
- `src/components/common/FeatureButton.test.tsx`
- `src/components/notifications/NotificationItem.test.tsx`
- `src/components/common/OfflineIndicator.test.tsx`
- `src/components/common/ErrorState.test.tsx`
- `src/components/common/StepIndicator.test.tsx`
- `src/components/common/DateTimeDisplay.test.tsx`
- `src/components/common/GolfBallLoader.test.tsx`
- `src/components/common/LoadingSpinner.test.tsx`
- `src/components/common/AvatarSelectionModal.test.tsx`
- `src/components/common/GolferIcon.test.tsx`
- `src/components/common/PlayerAvatar.test.tsx`
- `src/components/common/SectionHeader.test.tsx`
- `src/components/ai/GeneratedPreview.test.tsx`
- `src/components/common/FriendSelector/FriendSelector.test.tsx`
- `src/components/common/FriendSelector/FriendListItem.test.tsx`
- `src/components/settings/PushNotificationSettings.test.tsx`
- `src/components/ai/PromptInput.test.tsx`
- `src/components/ai/SuggestionChips.test.tsx`

---

## Phase Status Tracking

| Phase | Description | Status | Completed |
|-------|-------------|--------|-----------|
| 0 | Setup (plan + existing tests) | COMPLETED | 2024-12-17 |
| 1 | Tier 1 Critical Components | COMPLETED | 2024-12-18 |
| 2 | Tier 2 High Priority Components | COMPLETED | 2024-12-20 |
| 3 | Tier 3 Medium Priority Components | COMPLETED | 2024-12-25 |
| 4 | Tier 4 Lower Priority Components | IN_PROGRESS | - |

**Status Legend:** PENDING | IN_PROGRESS | REVIEW | COMPLETED | BLOCKED

### Recent Test Additions:
- **2024-12-25**: `FriendListItem.tsx` - 64 tests, 37 stories (Tier 4)
- **2024-12-25**: `SuggestionChips.tsx` - 29 tests, 10 stories (Tier 4, AI COMPLETE)
- **2024-12-25**: `PromptInput.tsx` - 57 tests, 34 stories (Tier 4)
- **2024-12-25**: `PushNotificationSettings.tsx` - 60 tests, 28 stories (Tier 3 COMPLETE)
- **2024-12-25**: `FriendSelector.tsx` - 66 tests (fixed), 28 stories (Tier 3)
- **2024-12-25**: `GeneratedPreview.tsx` - 74 tests, 47 stories (Tier 2 COMPLETE)
- **2024-12-25**: `Paywall.tsx` - 75 tests, 38 stories (Tier 1 COMPLETE)
- **2024-12-25**: `SectionHeader.tsx` - 64 tests, 38 stories (Tier 4)
- **2024-12-25**: `AvatarSelectionModal.tsx` - tests added (Tier 4)
- **2024-12-25**: `GolferIcon.tsx` - tests added (Tier 4)
- **2024-12-25**: `PlayerAvatar.tsx` - tests added (Tier 4)
- **2024-12-25**: `FeatureButton.tsx` - 65 tests, 38 stories (Tier 4)
- **2024-12-25**: `BottomSheetHeader.tsx` - 46 tests, 27 stories (Tier 4)
- **2024-12-25**: `LoadingSpinner.tsx` - 58 tests, 38 stories (Tier 4)
- **2024-12-25**: `GolfBallLoader.tsx` - 51 tests, 22 stories (Tier 4)
- **2024-12-25**: `ProgressBar.tsx` - 76 tests, 38 stories (Tier 4)
- **2024-12-25**: `DateTimeDisplay.tsx` - 75 tests, 38 stories (Tier 4)
- **2024-12-25**: `StepIndicator.tsx` - 57 tests, 38 stories (Tier 4)
- **2024-12-25**: `ErrorState.tsx` - 65 tests, 38 stories (Tier 4)
- **2024-12-25**: `OfflineIndicator.tsx` - 66 tests, 38 stories (Tier 4)
- **2024-12-25**: `NotificationItem.tsx` - 67 tests, 20 stories (Tier 4)
- **2024-12-25**: `NotificationToast.tsx` - 81 tests, 38 stories (Tier 4 START)
- **2024-12-25**: `RoundLeaderboardTab.tsx` - 46 tests, 43 stories (Tier 3 COMPLETE)
- **2024-12-25**: `BottomNavigation.tsx` - 47 tests, 35 stories (Tier 3)
- **2024-12-25**: `PlayerCard.tsx` - 75 tests, 38 stories (Tier 3)
- **2024-12-25**: `FeatureLock.tsx` - 64 tests, 39 stories (Tier 3)
- **2024-12-25**: `LeaderboardTable.tsx` - 55 tests, 38 stories (Tier 3)
- **2024-12-25**: `ScoringPairFormationInline.tsx` - 51 tests, 36 stories (Tier 3)
- **2024-12-25**: `RoundPlayersTab.tsx` - 68 tests, 38 stories (Tier 3)
- **2024-12-25**: `TeamCard.tsx` - 60 tests, 38 stories (Tier 3)
- **2024-12-25**: `HoleTable.tsx` - 57 tests, 37 stories (Tier 3)
- **2024-12-25**: `ScoreIndicator.tsx` - 93 tests, 37 stories (Tier 3)
- **2024-12-25**: `QuickScorecardView.tsx` - 47 tests, 28 stories (Tier 3)
- **2024-12-25**: `AddCourseModal/index.tsx` - 70 tests, 35 stories (Tier 3)
- **2024-12-25**: `CourseCard.tsx` - 68 tests, 33 stories (Tier 3)
- **2024-12-25**: `CourseTeesStep.tsx` - 71 tests, 43 stories (Tier 3)
- **2024-12-25**: `HoleDataStep.tsx` - 71 tests, 30 stories (Tier 3)
- **2024-12-24**: `TeamFormatSelector.tsx` - 63 tests, 38 stories (Tier 3)
- **2024-12-24**: `RoundDetailsStep/index.tsx` - 60 tests, 34 stories (Tier 3)
- **2024-12-24**: `CompetitionDetailsStep.tsx` - 54 tests, 38 stories (Tier 3)
- **2024-12-24**: `RoundCard.tsx` (competitionWizard) - 56 tests, 34 stories (Tier 3)
- **2024-12-24**: `RoundCard.tsx` (RoundDetailsStep) - 80 tests, 48 stories (Tier 3)
- **2024-12-24**: `RoundGameTypeSelector.tsx` - 59 tests, 38 stories (Tier 3)
- **2024-12-24**: `StatusBadge.tsx` - 76 tests, 36 stories (Tier 3)
- **2024-12-24**: `SegmentedButton.tsx` - 59 tests, 38 stories (Tier 3)
- **2024-12-24**: `EmptyState.tsx` - 57 tests, 38 stories (Tier 3)
- **2024-12-24**: `ExpandableItem.tsx` - 60 tests, 26 stories (Tier 3)
- **2024-12-24**: `ConfirmationDialog.tsx` - 69 tests, 36 stories (Tier 3)
- **2024-12-24**: `Tabs.tsx` - 57 tests, 36 stories (Tier 3)
- **2024-12-24**: `Pill.tsx` - 63 tests, 38 stories (Tier 3)
- **2024-12-22**: `FormInput.tsx` - 67 tests, 40 stories (Tier 3)
- **2024-12-22**: `DatePicker.tsx` - 65 tests, 35 stories (Tier 3)
- **2024-12-22**: `PageHeader.tsx` - 51 tests, 32 stories (Tier 3)
- **2024-12-20**: `UpgradePrompt.tsx` - 53 tests, 41 stories (Tier 2 COMPLETE)
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
