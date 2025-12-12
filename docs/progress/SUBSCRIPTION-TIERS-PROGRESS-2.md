# User Subscription Tier System - Implementation Plan (Phase 2)

**Goal:** Complete remaining subscription tier enforcement gaps identified in Phase 1 review
**Status:** 🔄 In Progress - 25% Complete (2/8 tasks)
**Predecessor:** [SUBSCRIPTION-TIERS-PROGRESS.md](./SUBSCRIPTION-TIERS-PROGRESS.md) (93% complete)

---

## Overview

This document tracks the remaining implementation tasks to complete the subscription tier system. These gaps were identified during a comprehensive review of Phase 1 implementation.

### Gap Summary

| Priority | Gap | Impact |
|----------|-----|--------|
| **CRITICAL** | Add Round/Player limits not enforced in CompetitionDetailScreen | Users can bypass tier limits |
| **CRITICAL** | Missing context barrel export | Inconsistent import patterns |
| **HIGH** | Export data feature undefined | Feature advertised but not implemented |
| **HIGH** | Team format tier gating incomplete | Premium features accessible to all |
| **MEDIUM** | Scoring pairs form validation missing | Invalid data can be submitted |
| **LOW** | No Profile → Subscription navigation | Poor UX for subscription management |
| **CLEANUP** | Task 29 marked incomplete but is done | Documentation inaccuracy |
| **CLEANUP** | Update Phase 1 progress document | Keep docs in sync |

---

## Sprint 10: Critical Fixes

### Task 30: CompetitionDetailScreen - Add Round Limit Enforcement
**Status:** ✅ Complete
**Priority:** CRITICAL
**Command:**
```bash
/refactor "Update src/screens/competitions/CompetitionDetailScreen.tsx to enforce round limits before allowing Add Round. Import useSubscriptionContext and useCanAddRound from SubscriptionContext. In handleAddRound callback: (1) Get current round count from competition data. (2) Call checkCanAddRound(competitionId, currentRoundCount). (3) If not allowed, show UpgradePrompt modal with benefits=['Add more rounds to your competitions', 'Up to 3 rounds on Social', 'Up to 10 rounds on Premium'] instead of navigating. (4) Only navigate to AddRound screen if allowed. Add state for showRoundUpgradePrompt and render UpgradePrompt component conditionally. Pass competitionId context to the check."
```
**Deliverables:**
- [x] Import subscription hooks in CompetitionDetailScreen
- [x] Add `showRoundUpgradePrompt` state
- [x] Update `handleAddRound` to check limits before navigation
- [x] Render UpgradePrompt modal when at round limit
- [x] Benefits list specific to round limits
- [x] Navigate to Subscription screen on upgrade tap

**Dependencies:** Task 11 (SubscriptionContext)
**Completed:** 2025-12-10

---

### Task 31: CompetitionDetailScreen - Add Player Limit Enforcement
**Status:** ✅ Complete
**Priority:** CRITICAL
**Completed:** 2025-12-10
**Deliverables:**
- [x] Add `showPlayerUpgradePrompt` state
- [x] Update `handleAddPlayers` to check limits before opening sheet
- [x] Render UpgradePrompt modal when at player limit
- [x] Pass `maxPlayers` and `currentPlayerCount` props to AddPlayersBottomSheet
- [x] Add LimitIndicator inside AddPlayersBottomSheet header
- [x] Disable add functionality in sheet when at limit (visual + functional)
- [x] Show warning text when at limit

**Implementation Details:**
- CompetitionDetailScreen now imports `useTierLimits` from SubscriptionContext
- `handleAddPlayers` callback checks `checkCanAddPlayer(id, currentPlayerCount)` before opening sheet
- If not allowed, shows UpgradePrompt modal with player-specific benefits
- AddPlayersBottomSheet accepts `maxPlayers` and `currentPlayerCount` props
- LimitIndicator shows "X/Y Players" progress bar when limits are defined
- Player selection is disabled (opacity 0.5, non-interactive) when at limit
- Warning text displayed when limit is reached

**Dependencies:** Task 11 (SubscriptionContext), Task 19 (LimitIndicator)

---

### Task 32: Create Context Barrel Export
**Status:** ✅ Complete
**Priority:** CRITICAL
**Completed:** 2025-12-10
**Deliverables:**
- [x] Create `src/context/index.ts`
- [x] Export all SubscriptionContext exports (SubscriptionProvider, useSubscriptionContext, useTier, useTierLimits, useIsPremium, useCheckFeature)
- [x] Export all ThemeContext exports (ThemeProvider, useTheme, useThemeColors, useIsDark, ColorPalette type)
- [x] Export NotificationContext (NotificationProvider, useNotificationContext)
- [x] Verify imports work with new barrel export (TypeScript passes)

**Dependencies:** Task 11 (SubscriptionContext)

---

## Sprint 11: High Priority Fixes

### Task 33: Export Data Feature - Decision & Implementation
**Status:** ⬜ Not Started
**Priority:** HIGH
**Command:**
```bash
/refactor "Implement export data feature for Social+ tiers. Create src/services/export/exportService.ts with functions: (1) exportLeaderboardToCSV(competitionId) - generates CSV string with player names, scores, positions. (2) exportScorecardToPDF(scorecardId) - generates PDF blob using react-native-pdf-lib or similar. (3) exportStatisticsToCSV(userId) - generates CSV of user's statistics. Create src/components/common/ExportButton.tsx - button wrapped in FeatureLock with feature='export_data'. Props: onExport, exportType ('csv'|'pdf'), label. Add ExportButton to: LeaderboardScreen (export leaderboard CSV), MyStatisticsScreen (export stats CSV). For MVP, implement CSV only - PDF can be Phase 3. Use Share API to share/save the generated file."
```
**Deliverables:**
- [ ] `src/services/export/exportService.ts` with CSV generation
- [ ] `src/services/export/index.ts` barrel export
- [ ] `src/components/common/ExportButton.tsx` with FeatureLock
- [ ] Add ExportButton to LeaderboardScreen
- [ ] Add ExportButton to MyStatisticsScreen
- [ ] Use Share API for file sharing
- [ ] FeatureLock enforces Social+ requirement

**Alternative (if export deferred):**
```bash
/refactor "Remove export data references from UI if not implementing. Update src/screens/subscription/SubscriptionScreen.tsx to remove 'Export data' from plan comparison features. Update docs/guides/SUBSCRIPTION_TIERS.md to mark export as 'Coming Soon' or remove. Keep database schema and types for future implementation."
```

**Dependencies:** Task 17 (FeatureLock)
**Estimated Time:** 4-6 hours (implement) OR 1 hour (defer)

---

### Task 34: TeamFormatSelector Tier Enforcement
**Status:** ⬜ Not Started
**Priority:** HIGH
**Command:**
```bash
/refactor "Update src/components/competitionWizard/create/TeamFormatSelector.tsx to enforce Premium-only team formats. Import useIsPremium and useCheckFeature from @/context/SubscriptionContext. Add props: onUpgradePress?: () => void. In component: (1) Get isPremium from hook. (2) If not Premium, render each team format option with: opacity 0.5, lock icon overlay, 'Premium' badge. (3) On tap of locked option, call onUpgradePress if provided, otherwise show Alert with upgrade message. (4) Only allow selection of team formats if isPremium. Update AddRoundScreen.tsx to pass onUpgradePress={() => navigation.navigate('Subscription')} to TeamFormatSelector. Ensure the 'None' option (no team format) is always selectable regardless of tier."
```
**Deliverables:**
- [ ] Import subscription hooks in TeamFormatSelector
- [ ] Add `onUpgradePress` prop
- [ ] Render locked state for non-Premium users (opacity, lock icon, badge)
- [ ] Prevent selection of team formats for non-Premium
- [ ] 'None' option always selectable
- [ ] Update AddRoundScreen to pass onUpgradePress
- [ ] Navigate to Subscription on upgrade tap

**Dependencies:** Task 11 (SubscriptionContext)
**Estimated Time:** 2-3 hours

---

## Sprint 12: Medium Priority Fixes

### Task 35: AddRoundScreen Scoring Pairs Form Validation
**Status:** ⬜ Not Started
**Priority:** MEDIUM
**Command:**
```bash
/refactor "Update src/screens/admin/AddRoundScreen.tsx to prevent non-Premium users from submitting with scoringPairsRequired=true. Import useIsPremium from SubscriptionContext. In form submission handler (handleSubmit or similar): (1) If scoringPairsRequired is true AND !isPremium, show Alert.alert('Premium Feature', 'Scoring pairs require a Premium subscription. Please upgrade or disable this option.'). (2) Return early without submitting. (3) Alternatively, automatically set scoringPairsRequired to false for non-Premium before submission with a toast notification. Also ensure the scoringPairsRequired toggle/switch is disabled (not just visually locked) for non-Premium users - use the disabled prop on the Switch component. Update the locked row to be truly non-interactive."
```
**Deliverables:**
- [ ] Import `useIsPremium` in AddRoundScreen
- [ ] Add form submission validation for scoringPairsRequired
- [ ] Show alert if non-Premium tries to submit with scoring pairs
- [ ] Disable Switch component for non-Premium (not just visual lock)
- [ ] Ensure form cannot be submitted with invalid tier/feature combination

**Dependencies:** Task 11 (SubscriptionContext)
**Estimated Time:** 1-2 hours

---

### Task 36: ProfileScreen Subscription Navigation
**Status:** ⬜ Not Started
**Priority:** LOW
**Command:**
```bash
/refactor "Update src/screens/profile/ProfileScreen.tsx to add Subscription menu item. Import TierBadge from @/components/subscription. Add new MenuItem after 'My Statistics': icon='card-account-details-star-outline' (or 'crown-outline'), label='Subscription', onPress navigates to 'Subscription' screen. Show small TierBadge (size='small') as rightElement on the menu item to indicate current tier. For Premium/Super Admin users, show checkmark icon instead to indicate they have full access. This provides easy access to subscription management from the main profile screen."
```
**Deliverables:**
- [ ] Import TierBadge in ProfileScreen
- [ ] Add 'Subscription' MenuItem after 'My Statistics'
- [ ] Navigate to Subscription screen on tap
- [ ] Show TierBadge as right element
- [ ] Alternative icon for Premium users (checkmark)

**Dependencies:** Task 16 (TierBadge), Task 22 (SubscriptionScreen)
**Estimated Time:** 30 minutes - 1 hour

---

## Sprint 13: Documentation Cleanup

### Task 37: Update Phase 1 Progress Document
**Status:** ⬜ Not Started
**Priority:** CLEANUP
**Command:**
```bash
/docs "Update docs/SUBSCRIPTION-TIERS-PROGRESS.md to reflect accurate completion status. Changes: (1) Task 29 (AddRoundScreen Game Type Enforcement) - change status from '⬜ Not Started' to '✅ Complete' with note that game type enforcement was implemented as part of Task 20 in RoundDetailsStep. (2) Update Task 11 deliverables to mark 'Export from src/context/index.ts' as completed once Task 32 is done. (3) Update Progress Summary to show 28/29 tasks complete (97%). (4) Add reference to SUBSCRIPTION-TIERS-PROGRESS-2.md for remaining gaps. (5) Update 'Last Updated' date and 'Current Sprint' info."
```
**Deliverables:**
- [ ] Update Task 29 status to ✅ Complete
- [ ] Update Task 11 deliverables (after Task 32)
- [ ] Update completion statistics
- [ ] Add reference to Phase 2 document
- [ ] Update metadata (date, sprint info)

**Dependencies:** Task 32 (context export)
**Estimated Time:** 30 minutes

---

## Progress Summary

### Completion Statistics
- **Total Tasks:** 8
- **Completed:** 3 ✅ (37.5%)
- **In Progress:** 0 🔄 (0%)
- **Not Started:** 5 ⬜ (62.5%)

### Sprint Progress

**Sprint 10: Critical Fixes** ✅ Complete (3/3 tasks)
- ✅ Task 30: Add Round Limit Enforcement
- ✅ Task 31: Add Player Limit Enforcement
- ✅ Task 32: Context Barrel Export

**Sprint 11: High Priority Fixes** ⬜ Not Started (0/2 tasks)
- ⬜ Task 33: Export Data Feature
- ⬜ Task 34: TeamFormatSelector Tier Enforcement

**Sprint 12: Medium Priority Fixes** ⬜ Not Started (0/2 tasks)
- ⬜ Task 35: Scoring Pairs Form Validation
- ⬜ Task 36: ProfileScreen Subscription Navigation

**Sprint 13: Documentation Cleanup** ⬜ Not Started (0/1 task)
- ⬜ Task 37: Update Phase 1 Progress Document

---

## Critical Files

### New Files
| File | Purpose |
|------|---------|
| `src/context/index.ts` | Context barrel export (Task 32) |
| `src/services/export/exportService.ts` | CSV/PDF export (Task 33, if implemented) |
| `src/services/export/index.ts` | Export service barrel (Task 33) |
| `src/components/common/ExportButton.tsx` | Export with tier gate (Task 33) |

### Modified Files
| File | Changes |
|------|---------|
| `src/screens/competitions/CompetitionDetailScreen.tsx` | Add round/player limit checks (Tasks 30, 31) |
| `src/components/competitions/AddPlayersBottomSheet.tsx` | Add maxPlayers prop, LimitIndicator (Task 31) |
| `src/components/competitionWizard/create/TeamFormatSelector.tsx` | Premium tier gating (Task 34) |
| `src/screens/admin/AddRoundScreen.tsx` | Scoring pairs validation, TeamFormatSelector props (Tasks 34, 35) |
| `src/screens/profile/ProfileScreen.tsx` | Subscription menu item (Task 36) |
| `src/screens/subscription/SubscriptionScreen.tsx` | Export feature display (Task 33, if deferred) |
| `docs/SUBSCRIPTION-TIERS-PROGRESS.md` | Status updates (Task 37) |

---

## Time Estimates

| Sprint | Tasks | Estimated Hours |
|--------|-------|-----------------|
| Sprint 10: Critical Fixes | 3 | 3.5-5.5 hours |
| Sprint 11: High Priority | 2 | 6-9 hours (or 3-4 if export deferred) |
| Sprint 12: Medium Priority | 2 | 1.5-3 hours |
| Sprint 13: Documentation | 1 | 0.5 hours |

**Total Estimated:** 11.5-18 hours (or 8.5-13 hours if export deferred)

---

## Decision Points

### Export Data Feature (Task 33)
**Options:**
1. **Implement CSV Export** - 4-6 hours, provides real value for Social+ users
2. **Defer to Phase 3** - 1 hour cleanup, remove from UI messaging
3. **Implement with External Service** - Use cloud function for PDF generation

**Recommendation:** Implement CSV-only for MVP (option 1). PDF can be added later. CSV export for leaderboards and statistics is straightforward and provides immediate value.

---

## Acceptance Criteria

### Phase 2 Complete When:
1. ✅ All tier limits enforced at UI level before API calls
2. ✅ Context exports follow project patterns
3. ✅ Export feature either implemented OR removed from messaging
4. ✅ Team formats properly gated to Premium
5. ✅ Form validation prevents invalid tier/feature submissions
6. ✅ Easy navigation to subscription management from Profile
7. ✅ Phase 1 document accurately reflects completion status

### Testing Checklist:
- [ ] Free tier user cannot add 2nd round to competition
- [ ] Free tier user cannot add 9th player to competition
- [ ] Social tier user cannot add 4th round to competition
- [ ] Social tier user cannot add 17th player to competition
- [ ] Free/Social user cannot select team formats (Best Ball, Scramble, etc.)
- [ ] Free/Social user cannot submit round with scoringPairsRequired=true
- [ ] Export button shows upgrade prompt for Free users (if implemented)
- [ ] Profile screen has Subscription menu item with tier badge
- [ ] All imports can use `@/context` barrel export

---

## Command Usage Reference

| Command | Use For |
|---------|---------|
| `/refactor` | Modifying existing code, adding features |
| `/docs` | Documentation updates |

---

**Created:** 2025-12-10
**Last Updated:** 2025-12-10
**Related:** [SUBSCRIPTION-TIERS-PROGRESS.md](./SUBSCRIPTION-TIERS-PROGRESS.md)
