# Subscription Downgrade Feature - Implementation Plan

> **Document Location:** `docs/progress/SUBSCRIPTION-DOWNGRADE-PLAN.md`
> **Created:** January 2026
> **Status:** COMPLETED (100%)

## Overview

Currently, users can tap on subscription tier cards to upgrade their plan, but tapping on a lower tier does nothing. This feature will enable users to tap on lower tiers to initiate a downgrade, showing them what features they'll lose before redirecting to App Store subscription management.

### Problem Statement
- Users expect to manage their subscription from the subscription screen
- Hiding downgrade options feels manipulative and increases support burden
- Users will email asking how to downgrade anyway

### Solution
- Make all tier cards tappable (not just upgrade options)
- Show a confirmation modal explaining what will be lost
- Redirect to App Store subscription settings (Apple handles the actual downgrade)
- Existing content is grandfathered (preserved after downgrade)

## Requirements

### Functional Requirements
- [ ] Lower tier cards are tappable on the Subscription screen
- [ ] Tapping shows a "Downgrade Confirmation" modal
- [ ] Modal displays features that will be lost
- [ ] Modal reassures users their existing content is preserved
- [ ] "Manage Subscription" button opens App Store settings
- [ ] "Keep Current Plan" button dismisses the modal

### Non-Functional Requirements
- [ ] Follows existing modal patterns (UpgradePrompt style)
- [ ] Supports light/dark theme
- [ ] Accessible (screen reader support)
- [ ] Works offline (modal is local, only App Store link needs network)

## Current State Analysis

### Existing Implementation
| File | Purpose |
|------|---------|
| `src/screens/subscription/SubscriptionScreen.tsx` | Main subscription screen - blocks downgrade taps at line 323 |
| `src/components/subscription/PlanComparisonCard.tsx` | Tier cards - only tappable when `isUpgradeOption=true` |
| `src/components/subscription/UpgradePrompt.tsx` | Modal pattern to follow for DowngradeConfirmation |
| `src/components/subscription/tierConfig.ts` | Tier metadata (colors, icons, features) |

### What's Missing
- `DowngradeConfirmationModal` component
- `isDowngradeOption` prop on PlanComparisonCard
- Deep-link utility for App Store subscription settings
- Logic in SubscriptionScreen to handle downgrade flow

---

## Sprint 1: Core Components

### Task 1: Create DowngradeConfirmationModal Component
**Status:** COMPLETED
**File:** `src/components/subscription/DowngradeConfirmationModal.tsx`
**Completed:** 2026-01-05

**Command (copy and run):**
```
/component DowngradeConfirmationModal

Create a modal component for confirming subscription downgrades. Follow the UpgradePrompt.tsx pattern exactly.

## Props
interface DowngradeConfirmationModalProps {
  visible: boolean;
  currentTier: SubscriptionTier;  // 'premium' | 'social'
  targetTier: SubscriptionTier;   // 'social' | 'free'
  onConfirm: () => void;          // Opens App Store settings
  onDismiss: () => void;          // Closes modal
  testID?: string;
}

## Layout (top to bottom)
1. **Header**: Icon (arrow-down-circle) + "Downgrade Plan?"
2. **Tier Change**: "{Current} → {Target}" with tier colors
3. **Warning Section**:
   - Icon: alert-circle-outline (warning color)
   - Title: "You'll lose access to:"
   - List of features being lost (compare tier limits)
4. **Reassurance Section**:
   - Icon: check-circle (success color)
   - Title: "Your existing content is safe:"
   - Bullet: "Current competitions preserved"
   - Bullet: "All historical data kept"
5. **Timing Note**:
   - Icon: clock-outline
   - Text: "Changes take effect at end of billing period"
6. **Buttons**:
   - Primary: "Manage in App Store" (opens settings)
   - Secondary: "Keep {CurrentTier}" (dismisses)

## Feature Comparison Logic
Use tierConfig.ts to get features for each tier, then compute the difference:
- lostFeatures = currentTierFeatures.filter(f => !targetTierFeatures.includes(f))

## Styling
- Follow UpgradePrompt.tsx modal pattern (animated, centered, backdrop)
- Use useThemeColors() for all colors
- Use spacing, typography, borderRadius from theme
- Support dark mode

## Accessibility
- Modal should announce on open
- Buttons have accessibilityRole="button"
- accessibilityLabel on all interactive elements

## Reference Files
- src/components/subscription/UpgradePrompt.tsx (modal pattern)
- src/components/subscription/tierConfig.ts (tier features)
- src/constants/theme.ts (design tokens)
```

**Deliverables:**
- [x] DowngradeConfirmationModal.tsx created
- [x] Follows UpgradePrompt modal pattern
- [x] Displays lost features dynamically
- [x] Shows reassurance about existing content
- [x] Has Manage/Keep buttons
- [x] Supports light/dark theme
- [x] Exported from components/subscription/index.ts

---

### Task 2: Create openAppStoreSubscriptionSettings Utility
**Status:** COMPLETED
**File:** `src/utils/appStore.ts`
**Completed:** 2026-01-05

**Command (copy and run):**
```
/hook openAppStoreSubscriptionSettings

Create a utility function (not a hook) that opens the App Store subscription management screen.

## Function Signature
export async function openAppStoreSubscriptionSettings(): Promise<boolean>

## Implementation
import { Linking, Platform, Alert } from 'react-native';

// iOS: Opens directly to subscription management
const IOS_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

// Android: Opens Play Store subscriptions (future support)
const ANDROID_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

export async function openAppStoreSubscriptionSettings(): Promise<boolean> {
  const url = Platform.select({
    ios: IOS_SUBSCRIPTIONS_URL,
    android: ANDROID_SUBSCRIPTIONS_URL,
    default: IOS_SUBSCRIPTIONS_URL,
  });

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    } else {
      Alert.alert(
        'Unable to Open Settings',
        'Please go to Settings > Apple ID > Subscriptions to manage your subscription.',
        [{ text: 'OK' }]
      );
      return false;
    }
  } catch (error) {
    console.error('[openAppStoreSubscriptionSettings] Error:', error);
    Alert.alert(
      'Error',
      'Could not open subscription settings. Please try again.',
      [{ text: 'OK' }]
    );
    return false;
  }
}

## File Location
Create new file: src/utils/appStore.ts
Export from src/utils/index.ts (create if doesn't exist)

## Testing Notes
- iOS Simulator: URL will open but may not show subscriptions (no App Store account)
- Real device: Opens App Store subscription management
- Android: Opens Play Store subscription page
```

**Deliverables:**
- [x] appStore.ts utility created
- [x] openAppStoreSubscriptionSettings function exported
- [x] Handles iOS and Android URLs
- [x] Error handling with user-friendly alerts
- [x] Exported from utils/index.ts

---

## Sprint 2: Integration

### Task 3: Update PlanComparisonCard for Downgrade Support
**Status:** COMPLETED
**File:** `src/components/subscription/PlanComparisonCard.tsx`
**Completed:** 2026-01-05

**Command (copy and run):**
```
/refactor PlanComparisonCard downgrade support

Update PlanComparisonCard to support downgrade interactions.

## Changes Required

### 1. Add isDowngradeOption prop
Add to PlanComparisonCardProps interface:
  /** Whether this is a downgrade option (lower tier than current) */
  isDowngradeOption?: boolean;

### 2. Update hint text
Replace the upgradeHintRow section (lines 155-163) with:

{/* Action hint for upgrade/downgrade options */}
{(isUpgradeOption || isDowngradeOption) && (
  <View style={[styles.actionHintRow, { borderTopColor: colors.border }]}>
    <Icon
      source={isUpgradeOption ? 'arrow-up-circle' : 'arrow-down-circle'}
      size={16}
      color={isUpgradeOption ? colors.primary : colors.textSecondary}
    />
    <Text style={[
      styles.actionHintText,
      { color: isUpgradeOption ? colors.primary : colors.textSecondary }
    ]}>
      {isUpgradeOption ? 'Tap to upgrade' : 'Tap to manage'}
    </Text>
  </View>
)}

### 3. Update TouchableOpacity wrapper
Change line 167-177 from:
  if (onPress && isUpgradeOption) {
To:
  if (onPress && (isUpgradeOption || isDowngradeOption)) {

Update accessibilityLabel:
  accessibilityLabel={isUpgradeOption ? `Upgrade to ${planName}` : `Manage ${planName} plan`}

### 4. Rename style
Rename `upgradeHintRow` to `actionHintRow` and `upgradeHintText` to `actionHintText` for consistency.

## Files to Modify
- src/components/subscription/PlanComparisonCard.tsx
```

**Deliverables:**
- [x] isDowngradeOption prop added
- [x] Cards show "Tap to manage" for downgrade options
- [x] Cards are tappable for both upgrade and downgrade
- [x] Accessibility labels updated
- [x] Style names updated for clarity

---

### Task 4: Update SubscriptionScreen to Handle Downgrades
**Status:** COMPLETED
**File:** `src/screens/subscription/SubscriptionScreen.tsx`
**Completed:** 2026-01-05

**Command (copy and run):**
```
/refactor SubscriptionScreen downgrade flow

Update SubscriptionScreen to handle downgrade taps and show the confirmation modal.

## Changes Required

### 1. Add state for downgrade modal
After line 172 (showPaywall state), add:
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [downgradeTier, setDowngradeTier] = useState<SubscriptionTier>('free');

### 2. Import new components
Add to imports:
  import { DowngradeConfirmationModal } from '@/components/subscription';
  import { openAppStoreSubscriptionSettings } from '@/utils/appStore';

### 3. Update handlePlanCardPress (lines 315-333)
Replace the entire function:

const handlePlanCardPress = useCallback((selectedTier: SubscriptionTier) => {
  const tierOrder: Record<SubscriptionTier, number> = {
    free: 0,
    social: 1,
    premium: 2,
    super_admin: 3,
  };

  const selectedOrder = tierOrder[selectedTier];
  const currentOrder = tierOrder[tier];

  // Same tier - do nothing
  if (selectedOrder === currentOrder) {
    return;
  }

  // Upgrade flow
  if (selectedOrder > currentOrder) {
    setSelectedUpgradeTier(selectedTier);
    if (purchasesEnabled) {
      setShowPaywall(true);
    } else {
      setShowUpgradePrompt(true);
    }
    return;
  }

  // Downgrade flow
  setDowngradeTier(selectedTier);
  setShowDowngradeModal(true);
}, [tier, purchasesEnabled]);

### 4. Add downgrade handlers
After handlePurchaseSuccess (around line 360), add:

// Handle downgrade confirmation
const handleDowngradeConfirm = useCallback(async () => {
  setShowDowngradeModal(false);
  await openAppStoreSubscriptionSettings();
}, []);

// Handle downgrade dismiss
const handleDowngradeDismiss = useCallback(() => {
  setShowDowngradeModal(false);
}, []);

### 5. Update PlanComparisonCard rendering (around line 506-517)
Pass isDowngradeOption prop:

const isDowngradeOption = tierOrder[comparisonTier] < tierOrder[tier];

return (
  <PlanComparisonCard
    key={comparisonTier}
    planName={tierLimits.displayName}
    description={tierLimits.description}
    icon={TIER_ICONS[comparisonTier]}
    badgeColor={tierColor}
    features={buildPlanFeatures(tierLimits, comparisonTier)}
    isCurrentPlan={isCurrentTier}
    isUpgradeOption={isUpgradeOption}
    isDowngradeOption={isDowngradeOption}
    onPress={() => handlePlanCardPress(comparisonTier)}
  />
);

### 6. Add DowngradeConfirmationModal to render
After Paywall component (around line 569), add:

{/* Downgrade Confirmation Modal */}
<DowngradeConfirmationModal
  visible={showDowngradeModal}
  currentTier={tier}
  targetTier={downgradeTier}
  onConfirm={handleDowngradeConfirm}
  onDismiss={handleDowngradeDismiss}
/>

## Files to Modify
- src/screens/subscription/SubscriptionScreen.tsx
```

**Deliverables:**
- [x] Downgrade modal state added
- [x] handlePlanCardPress handles upgrade AND downgrade
- [x] isDowngradeOption passed to PlanComparisonCard
- [x] DowngradeConfirmationModal rendered
- [x] Confirm opens App Store settings
- [x] Dismiss closes modal
- [x] DowngradeConfirmationModal exported from index.ts

---

## Sprint 3: Polish & Testing

### Task 5: Add Component Tests
**Status:** COMPLETED
**File:** `src/components/subscription/DowngradeConfirmationModal.test.tsx`
**Completed:** 2026-01-05

**Test Coverage:**
- **55 tests written** across 10 test categories
- Rendering tests (13 tests)
- Tier display tests (4 tests)
- Feature comparison tests (4 tests)
- Interaction tests (3 tests)
- Accessibility tests (10 tests)
- Props tests (3 tests)
- Animation tests (2 tests)
- Modal behavior tests (2 tests)
- Edge cases tests (4 tests)
- Dark mode tests (5 tests)
- Specific downgrade scenario tests (3 tests)
- Performance tests (2 tests)

**Deliverables:**
- [x] DowngradeConfirmationModal.test.tsx created
- [x] All rendering tests pass
- [x] All interaction tests pass
- [x] All accessibility tests pass
- [x] Coverage > 80%

---

### Task 6: Update Storybook Stories
**Status:** COMPLETED
**File:** `src/components/subscription/DowngradeConfirmationModal.stories.tsx`
**Completed:** 2026-01-05

**Stories Created:**
1. **Default** - Premium to Social downgrade
2. **PremiumToFree** - Premium to Free downgrade (maximum feature loss)
3. **SocialToFree** - Social to Free downgrade (moderate feature loss)
4. **SuperAdminToPremium** - Admin tier downgrade
5. **SuperAdminToFree** - Maximum admin downgrade
6. **Hidden** - Modal hidden state
7. **Interactive** - With console logging for manual testing
8. **WithTestID** - With custom testID

**Deliverables:**
- [x] Stories file created
- [x] All tier combinations have stories
- [x] Stories render correctly in Storybook

---

### Task 7: Code Review
**Status:** COMPLETED
**Files:** All modified files
**Completed:** 2026-01-05

**Review Summary:**
All 6 files reviewed and passed:

| File | TypeScript | Styling | Accessibility | Performance | Result |
|------|------------|---------|---------------|-------------|--------|
| DowngradeConfirmationModal.tsx | ✅ | ✅ | ✅ | ✅ | PASS |
| DowngradeConfirmationModal.test.tsx | ✅ | N/A | N/A | N/A | PASS |
| DowngradeConfirmationModal.stories.tsx | ✅ | N/A | N/A | N/A | PASS |
| PlanComparisonCard.tsx | ✅ | ✅ | ✅ | ✅ | PASS |
| SubscriptionScreen.tsx | ✅ | ✅ | ✅ | ✅ | PASS |
| appStore.ts | ✅ | N/A | N/A | ✅ | PASS |

**Review Checklist:**
- [x] TypeScript: No type errors, proper typing
- [x] Styling: Uses theme tokens, supports dark mode
- [x] Accessibility: Proper labels, roles, announcements
- [x] Performance: No unnecessary re-renders (React.memo, useMemo, useCallback)
- [x] Error handling: Graceful failures with user-friendly alerts
- [x] Consistency: Matches existing patterns (UpgradePrompt style)
- [x] Tests: Adequate coverage (55 tests)

**Deliverables:**
- [x] All files pass code review
- [x] No TypeScript errors
- [x] No accessibility issues
- [x] Consistent with codebase patterns

---

## Progress Summary

| Sprint | Task | Description | Status | Completed |
|--------|------|-------------|--------|-----------|
| 1 | 1 | DowngradeConfirmationModal component | COMPLETED | 2026-01-05 |
| 1 | 2 | App Store utility function | COMPLETED | 2026-01-05 |
| 2 | 3 | PlanComparisonCard downgrade support | COMPLETED | 2026-01-05 |
| 2 | 4 | SubscriptionScreen integration | COMPLETED | 2026-01-05 |
| 3 | 5 | Component tests (55 tests) | COMPLETED | 2026-01-05 |
| 3 | 6 | Storybook stories (8 stories) | COMPLETED | 2026-01-05 |
| 3 | 7 | Code review | COMPLETED | 2026-01-05 |

**Status Legend:** PENDING | IN_PROGRESS | REVIEW | COMPLETED | BLOCKED

### Completion Statistics
- **Total Tasks:** 7
- **Completed:** 7 (100%)
- **In Progress:** 0 (0%)
- **Not Started:** 0 (0%)

---

## Critical Files

### New Files
| File | Purpose | Status |
|------|---------|--------|
| `src/components/subscription/DowngradeConfirmationModal.tsx` | Modal showing downgrade consequences | CREATED |
| `src/components/subscription/DowngradeConfirmationModal.test.tsx` | Component tests (55 tests) | CREATED |
| `src/components/subscription/DowngradeConfirmationModal.stories.tsx` | Storybook stories (8 stories) | CREATED |
| `src/utils/appStore.ts` | App Store deep-link utility | CREATED |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/subscription/PlanComparisonCard.tsx` | Add isDowngradeOption prop, update hint text |
| `src/components/subscription/index.ts` | Export DowngradeConfirmationModal |
| `src/screens/subscription/SubscriptionScreen.tsx` | Handle downgrade flow, render modal |
| `src/utils/index.ts` | Export appStore utilities |

---

## Testing Checklist

### Manual Testing
- [ ] Tap lower tier card shows downgrade modal
- [ ] Modal shows correct features being lost
- [ ] "Manage in App Store" opens subscription settings
- [ ] "Keep Current Plan" dismisses modal
- [ ] Works in light mode
- [ ] Works in dark mode
- [ ] Accessible with VoiceOver/TalkBack

### Automated Testing
- [x] All unit tests pass (55 tests passing)
- [x] TypeScript compilation succeeds (Task 1 verified)
- [x] ESLint passes (Task 1 verified)
- [x] Storybook stories created (8 stories)

---

## Success Criteria

1. Users can tap on any tier card (not just upgrades)
2. Downgrade shows clear information about what will be lost
3. Users are reassured their existing content is preserved
4. App Store subscription settings open correctly
5. Feature follows existing modal patterns (consistent UX)
6. All tests pass with >80% coverage
7. No TypeScript errors
8. Accessible to screen reader users

---

## Notes

### Why App Store Instead of In-App Downgrade?
- Apple requires subscription management through App Store
- RevenueCat doesn't support direct downgrades via SDK
- Simpler implementation - Apple handles billing changes
- Users already familiar with App Store subscription management

### Grandfathering Behavior
Per SUBSCRIPTION_TIERS.md, existing competitions are preserved after downgrade:
- User can still access competitions they created
- Cannot create new ones beyond new tier limit
- This is already implemented in the subscription system

---

**Last Updated:** 2026-01-05
**Status:** COMPLETED - All 7 tasks finished. Feature ready for manual testing and deployment.
