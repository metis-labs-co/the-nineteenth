# Tier-Based Accent Colors Plan

## Overview

Add tier-specific accent colors for visual differentiation between subscription tiers (free, social, premium, super_admin). This is a minimal approach that consolidates existing color definitions and adds light/dark mode support.

## Current State

- **Duplicate colors**: `TIER_BADGE_COLORS` in `TierBadge.tsx` and `TIER_COLORS` in `tierConfig.ts`
- **Database support**: `badge_color` field exists in `tier_limits` table
- **No dark mode variants**: Current tier colors don't adapt to theme

---

## Tier Color Values

| Tier | Primary | Description |
|------|---------|-------------|
| Free | `#6b7280` | Gray - Neutral, basic |
| Social | `#3b82f6` | Blue - Friendly, social |
| Premium | `#f59e0b` | Amber/Gold - Premium, valuable |
| Super Admin | `#dc2626` | Red - Powerful, distinguished |

---

## Implementation Steps

### Step 1: Create Centralized Tier Colors

**File:** `src/constants/tierColors.ts` (NEW)

Define tier color sets with light/dark mode variants:

```typescript
import type { SubscriptionTier } from '@/types/subscription.types';

export interface TierColorSet {
  primary: string;        // Main tier color (badges, buttons)
  text: string;           // Text on primary background
  background: string;     // Light mode subtle background
  backgroundDark: string; // Dark mode subtle background
  border: string;         // Light mode border
  borderDark: string;     // Dark mode border
}

export const TIER_COLOR_SETS: Record<SubscriptionTier, TierColorSet> = {
  free: {
    primary: '#6b7280',      // Gray 500
    text: '#ffffff',
    background: '#f3f4f6',   // Gray 100
    backgroundDark: '#374151', // Gray 700
    border: '#d1d5db',       // Gray 300
    borderDark: '#4b5563',   // Gray 600
  },
  social: {
    primary: '#3b82f6',      // Blue 500
    text: '#ffffff',
    background: '#dbeafe',   // Blue 100
    backgroundDark: '#1e3a5f', // Dark blue
    border: '#93c5fd',       // Blue 300
    borderDark: '#1e40af',   // Blue 800
  },
  premium: {
    primary: '#f59e0b',      // Amber 500
    text: '#ffffff',
    background: '#fef3c7',   // Amber 100
    backgroundDark: '#78350f', // Amber 900
    border: '#fcd34d',       // Amber 300
    borderDark: '#92400e',   // Amber 800
  },
  super_admin: {
    primary: '#dc2626',      // Red 600
    text: '#ffffff',
    background: '#fee2e2',   // Red 100
    backgroundDark: '#7f1d1d', // Red 900
    border: '#fca5a5',       // Red 300
    borderDark: '#991b1b',   // Red 800
  },
};
```

### Step 2: Create useTierColors Hook

**File:** `src/hooks/useTierColors.ts` (NEW)

Theme-aware hook that returns current tier's colors:

```typescript
import { useMemo } from 'react';
import { useTier, useTierLimits } from '@/context/SubscriptionContext';
import { useIsDark } from '@/context/ThemeContext';
import { TIER_COLOR_SETS, type TierColorSet } from '@/constants/tierColors';
import type { SubscriptionTier } from '@/types/subscription.types';

export interface TierColors {
  /** Main tier accent color */
  primary: string;
  /** Text color for use on primary background */
  textOnPrimary: string;
  /** Subtle background tint (theme-aware) */
  background: string;
  /** Border color (theme-aware) */
  border: string;
  /** The raw color set for advanced use cases */
  colorSet: TierColorSet;
}

/**
 * Hook to get theme-aware tier accent colors
 *
 * @param overrideTier - Optional tier to get colors for (defaults to current user's tier)
 * @returns TierColors object with theme-aware color values
 */
export function useTierColors(overrideTier?: SubscriptionTier): TierColors {
  const currentTier = useTier();
  const limits = useTierLimits();
  const isDark = useIsDark();

  const tier = overrideTier ?? currentTier;

  return useMemo(() => {
    const colorSet = TIER_COLOR_SETS[tier];

    // Use database badge_color if available, otherwise use constant
    const primary = limits?.badgeColor ?? colorSet.primary;

    return {
      primary,
      textOnPrimary: colorSet.text,
      background: isDark ? colorSet.backgroundDark : colorSet.background,
      border: isDark ? colorSet.borderDark : colorSet.border,
      colorSet,
    };
  }, [tier, limits?.badgeColor, isDark]);
}

/**
 * Get tier colors for a specific tier (without using current user context)
 * Useful for comparison views or displaying other tiers
 */
export function getTierColorsForTier(
  tier: SubscriptionTier,
  isDark: boolean,
  badgeColorOverride?: string | null
): TierColors {
  const colorSet = TIER_COLOR_SETS[tier];
  const primary = badgeColorOverride ?? colorSet.primary;

  return {
    primary,
    textOnPrimary: colorSet.text,
    background: isDark ? colorSet.backgroundDark : colorSet.background,
    border: isDark ? colorSet.borderDark : colorSet.border,
    colorSet,
  };
}
```

Export from `src/hooks/index.ts`:
```typescript
export { useTierColors, getTierColorsForTier } from './useTierColors';
```

### Step 3: Refactor TierBadge

**File:** `src/components/subscription/TierBadge.tsx` (MODIFY)

Changes:
- Import `TIER_COLOR_SETS` from `@/constants/tierColors`
- Remove local `TIER_BADGE_COLORS` constant (lines 93-98)
- Update fallback to use `TIER_COLOR_SETS[tier].primary`

```typescript
// Before
const TIER_BADGE_COLORS: Record<SubscriptionTier, string> = {
  free: '#6b7280',
  social: '#3b82f6',
  premium: '#f59e0b',
  super_admin: '#dc2626',
};

// After
import { TIER_COLOR_SETS } from '@/constants/tierColors';

// In component:
const badgeColor = overrideBadgeColor ?? limits?.badgeColor ?? TIER_COLOR_SETS[tier].primary;
```

### Step 4: Refactor tierConfig

**File:** `src/components/subscription/tierConfig.ts` (MODIFY)

Changes:
- Import colors from `tierColors.ts`
- Remove local `TIER_COLORS` constant
- Update `TIER_CONFIGS` to reference shared colors

```typescript
// Before
export const TIER_COLORS: Record<PaywallTier, string> = {
  social: '#3b82f6',
  premium: '#f59e0b',
};

// After
import { TIER_COLOR_SETS } from '@/constants/tierColors';

export const TIER_COLORS: Record<PaywallTier, string> = {
  social: TIER_COLOR_SETS.social.primary,
  premium: TIER_COLOR_SETS.premium.primary,
};
```

### Step 5: Update FeatureLock (Optional Enhancement)

**File:** `src/components/subscription/FeatureLock.tsx` (MODIFY)

Add tier-colored styling for the upgrade prompt:

```typescript
import { useTierColors, getTierColorsForTier } from '@/hooks/useTierColors';
import { useIsDark } from '@/context/ThemeContext';

// In component - get colors for the required tier
const isDark = useIsDark();
const requiredTierColors = getTierColorsForTier(requiredTier, isDark);

// Apply to upgrade button/badge
<TouchableOpacity
  style={[styles.upgradeButton, { backgroundColor: requiredTierColors.primary }]}
>
  <Text style={{ color: requiredTierColors.textOnPrimary }}>
    Upgrade to {requiredTier}
  </Text>
</TouchableOpacity>
```

### Step 6: Add Profile Tier Accent

**File:** `src/screens/profile/components/ProfileHeader.tsx` (MODIFY)

Add subtle tier-colored accent:

```typescript
import { useTierColors } from '@/hooks/useTierColors';

// In component
const tierColors = useTierColors();

// Apply as left border accent
<View style={[
  styles.container,
  {
    borderLeftWidth: 3,
    borderLeftColor: tierColors.primary,
  }
]}>
  {/* Profile content */}
</View>
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/constants/tierColors.ts` | NEW | Centralized tier color definitions |
| `src/hooks/useTierColors.ts` | NEW | Theme-aware tier colors hook |
| `src/hooks/index.ts` | MODIFY | Export new hook |
| `src/components/subscription/TierBadge.tsx` | MODIFY | Use shared colors, remove duplicate |
| `src/components/subscription/tierConfig.ts` | MODIFY | Import from tierColors.ts |
| `src/components/subscription/FeatureLock.tsx` | MODIFY | Add tier-colored styling (optional) |
| `src/screens/profile/components/ProfileHeader.tsx` | MODIFY | Add tier accent |

---

## Benefits

1. **Single source of truth** - No more duplicate color definitions
2. **Dark mode support** - Each tier has proper light/dark variants
3. **Database override** - Admin can change colors without app update via `badge_color` field
4. **Minimal changes** - Builds on existing patterns
5. **Progressive enhancement** - Can extend to more components later

---

## Future Enhancements

Once tier accent colors are in place, these could be added later:

- **Header accent line** - Subtle tier-colored line below headers
- **Navigation highlights** - Tier color on active tab indicator
- **Card accents** - Tier-colored top border on competition/round cards
- **Loading states** - Tier-colored activity indicators

---

## Progress Tracking

- [ ] Create `src/constants/tierColors.ts`
- [ ] Create `src/hooks/useTierColors.ts`
- [ ] Export hook from `src/hooks/index.ts`
- [ ] Refactor `TierBadge.tsx`
- [ ] Refactor `tierConfig.ts`
- [ ] Update `FeatureLock.tsx` (optional)
- [ ] Add profile tier accent to `ProfileHeader.tsx`
- [ ] Test in light and dark modes
- [ ] Verify database badge_color override works
