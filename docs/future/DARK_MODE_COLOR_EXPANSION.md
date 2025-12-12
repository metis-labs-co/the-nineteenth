# Dark Mode Color System Expansion

> **Status**: Future Enhancement
> **Priority**: Low
> **Created**: December 2024

## Overview

The current dark mode implementation uses 4 brand overrides that seed algorithmic color generation. While functional, there are opportunities to improve brand consistency and visual polish by expanding the configurable overrides.

## Current Implementation

### Brand Config (`src/config/brands/theNineteenth.brand.ts`)

```typescript
darkMode: {
  primary: '#5aab7d',        // Brighter green for dark backgrounds
  background: '#0f1710',     // Dark green-tinted black
  surface: '#1a2b1e',        // Dark forest green
  surfaceVariant: '#2d4033', // Medium dark green
}
```

### Color Generation (`src/constants/colors.ts`)

The `generateDarkColors()` function derives ~56 colors from these 4 overrides using:
- Direct usage of overrides for backgrounds/surfaces
- `brightenColor()` for semantic colors (success, warning, error)
- `darkenColor()` for score backgrounds
- Hardcoded Tailwind colors for some backgrounds and text

## Identified Issues

### 1. Text Colors Are Hardcoded Slate Grays
```typescript
textPrimary: '#f1f5f9',    // Slate 100 - cool gray
textSecondary: '#94a3b8',  // Slate 400 - cool gray
```
These cool slate grays may clash with the warm green-tinted surfaces (`#0f1710`, `#1a2b1e`).

### 2. Golf Score Backgrounds Partially Hardcoded
```typescript
eagleBackground: '#064e3b',      // Hardcoded Emerald 900
birdieBackground: '#14532d',     // Hardcoded Green 900
parBackground: darkenColor(...)  // ✓ Brand-derived
bogeyBackground: '#78350f',      // Hardcoded Amber 900
doubleBogeyBackground: '#7f1d1d' // Hardcoded Red 900
```

### 3. Status Backgrounds Hardcoded
```typescript
successBackground: '#052e16',  // Hardcoded Green 950
warningBackground: '#451a03',  // Hardcoded Amber 950
errorBackground: '#450a0a',    // Hardcoded Red 950
```

### 4. No Surface Elevation Differentiation
```typescript
surfaceElevated: darkMode.surface,  // Same as surface
```
In Material Design, elevated surfaces in dark mode should be *lighter* to convey depth.

### 5. Border Colors May Lack Contrast
```typescript
border: darkMode.surfaceVariant,     // #2d4033
borderLight: darkMode.surface,       // #1a2b1e
```
Both are close in luminance, potentially making borders hard to distinguish.

---

## Proposed Enhancement

### Phase 1: Expand Type Definitions

**File**: `src/config/brand.types.ts`

```typescript
export interface BrandDarkModeOverrides {
  // Required (current)
  primary: string;
  background: string;
  surface: string;
  surfaceVariant: string;

  // Optional text overrides
  textPrimary?: string;
  textSecondary?: string;
  textTertiary?: string;

  // Optional surface overrides
  surfaceElevated?: string;

  // Optional border overrides
  border?: string;
  borderStrong?: string;
}
```

### Phase 2: Update Color Generation

**File**: `src/constants/colors.ts`

Modify `generateDarkColors()` to use optional overrides when provided:

```typescript
// Text colors - use overrides or fall back to current hardcoded values
textPrimary: darkMode.textPrimary ?? '#f1f5f9',
textSecondary: darkMode.textSecondary ?? '#94a3b8',
textTertiary: darkMode.textTertiary ?? '#64748b',

// Surface elevation
surfaceElevated: darkMode.surfaceElevated ?? darkMode.surface,

// Borders
border: darkMode.border ?? darkMode.surfaceVariant,
borderStrong: darkMode.borderStrong ?? brightenColor(darkMode.surfaceVariant, 0.15),
```

### Phase 3: Update Brand Config

**File**: `src/config/brands/theNineteenth.brand.ts`

Add green-tinted text colors that harmonize with the forest green surfaces:

```typescript
darkMode: {
  // Current (unchanged)
  primary: '#5aab7d',
  background: '#0f1710',
  surface: '#1a2b1e',
  surfaceVariant: '#2d4033',

  // New - green-tinted text for brand harmony
  textPrimary: '#e8f5e9',     // Light green-tinted white
  textSecondary: '#a5d6a7',   // Soft green-tinted gray
  textTertiary: '#66bb6a',    // Muted green

  // New - elevated surface (lighter for depth)
  surfaceElevated: '#243d2a',

  // New - more visible borders
  border: '#3d5a45',
  borderStrong: '#4a7055',
}
```

---

## Implementation Checklist

- [ ] Update `BrandDarkModeOverrides` interface in `brand.types.ts`
- [ ] Update `generateDarkColors()` to use optional overrides with fallbacks
- [ ] Add new color values to `theNineteenth.brand.ts`
- [ ] Test dark mode appearance across all screens
- [ ] Verify contrast ratios meet WCAG AA standards
- [ ] Update any other brand configs (if white-label brands exist)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/config/brand.types.ts` | Add optional properties to `BrandDarkModeOverrides` |
| `src/constants/colors.ts` | Update `generateDarkColors()` with fallback logic |
| `src/config/brands/theNineteenth.brand.ts` | Add new dark mode color values |

---

## Testing Considerations

1. **Visual regression** - Compare before/after screenshots of key screens
2. **Contrast ratios** - Verify text readability (use Chrome DevTools or similar)
3. **Edge cases** - Check modals, bottom sheets, and overlays
4. **Scorecard legibility** - Ensure golf score colors are distinguishable

---

## Alternative Approaches Considered

### A. Derive Text Colors Algorithmically
Instead of hardcoding or manual overrides, derive text colors from the brand primary:
```typescript
textPrimary: adjustLightness(primary.primary, 0.95),
textSecondary: adjustLightness(primary.primary, 0.65),
```
**Rejected**: This could produce poor contrast ratios and requires careful tuning.

### B. Full Dark Theme Object
Define a complete parallel color palette for dark mode rather than overrides.
**Rejected**: Increases maintenance burden and breaks the "derive from brand" philosophy.

### C. Keep Current Implementation
The current system works - hardcoded values are reasonable defaults.
**Status**: This is the current state. The enhancement above is optional polish.

---

## Notes

- The current implementation is **functional and production-ready**
- This enhancement is **cosmetic polish**, not a bug fix
- Consider implementing if users report dark mode visual issues
- Low priority unless pursuing white-label builds with different brand colors
