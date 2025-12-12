# White-Label Branding System

## Overview

The Nineteenth uses a **build-time brand configuration system** that allows the entire app's color palette to be changed by modifying a single configuration file. This enables white-labeling the app for different organizations (e.g., "Golf Australia", "Green Golf Co") without making scattered code changes throughout the codebase.

### Key Features

- **Single swap point** - Change one import to rebrand the entire app
- **Light/dark mode preserved** - Each brand defines both light and dark variants
- **Type-safe** - Full TypeScript interfaces ensure brand configs are complete
- **Backwards compatible** - Existing `useThemeColors()` API unchanged
- **Algorithmically derived** - Secondary colors generated from brand primaries

---

## Architecture

```
src/config/brands/index.ts  ← SINGLE SWAP POINT
         ↓
src/config/brands/theNineteenth.brand.ts  ← Brand colors defined here
         ↓
src/constants/colors.ts  ← Generates light/dark palettes
         ↓
src/constants/theme.ts  ← Exports to rest of app
         ↓
useThemeColors() hook  ← Components consume colors
```

### File Structure

```
src/
  config/
    brand.types.ts              # TypeScript interfaces
    brands/
      theNineteenth.brand.ts    # Default brand (blue)
      index.ts                  # Exports active brand
  constants/
    colors.ts                   # Color generation utilities
    theme.ts                    # Exports lightColors/darkColors
```

---

## Quick Start: Switching Brands

### Step 1: Create a New Brand Config

Create a new file in `src/config/brands/`:

```typescript
// src/config/brands/greenGolf.brand.ts
import type { BrandConfig } from '../brand.types';

export const greenGolfBrand: BrandConfig = {
  id: 'green-golf',
  name: 'Green Golf Co',

  primary: {
    primary: '#059669',      // Emerald 600
    primaryDark: '#047857',  // Emerald 700
    primaryLight: '#10b981', // Emerald 500
    primaryLighter: '#6ee7b7', // Emerald 300
  },

  semantic: {
    success: { base: '#22c55e', light: '#86efac', dark: '#16a34a' },
    warning: { base: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
    error: { base: '#ef4444', light: '#fca5a5', dark: '#dc2626' },
    info: { base: '#0ea5e9', light: '#7dd3fc', dark: '#0284c7' },
  },

  golf: {
    eagle: '#10b981',
    birdie: '#22c55e',
    par: '#059669',        // Matches brand primary
    bogey: '#f59e0b',
    doubleBogey: '#ef4444',
  },

  grays: {
    white: '#ffffff',
    gray50: '#fafaf9',     // Stone scale (warmer)
    gray100: '#f5f5f4',
    gray200: '#e7e5e4',
    gray300: '#d6d3d1',
    gray400: '#a8a29e',
    gray500: '#78716c',
    gray600: '#57534e',
    gray700: '#44403c',
    gray800: '#292524',
    gray900: '#1c1917',
    black: '#000000',
  },

  darkMode: {
    primary: '#34d399',      // Brighter emerald for dark mode
    background: '#0c0a09',   // Stone 950
    surface: '#1c1917',      // Stone 900
    surfaceVariant: '#292524', // Stone 800
  },
};

export default greenGolfBrand;
```

### Step 2: Update the Active Brand

Edit `src/config/brands/index.ts`:

```typescript
// Change from:
import { theNineteenthBrand } from './theNineteenth.brand';
export const activeBrand = theNineteenthBrand;

// To:
import { greenGolfBrand } from './greenGolf.brand';
export const activeBrand = greenGolfBrand;
```

### Step 3: Rebuild the App

```bash
npx expo start --clear  # Clear cache and restart
```

That's it! The entire app now uses the new brand colors.

---

## Brand Configuration Reference

### BrandConfig Interface

```typescript
interface BrandConfig {
  id: string;           // Unique identifier (e.g., 'green-golf')
  name: string;         // Display name (e.g., 'Green Golf Co')
  primary: BrandPrimaryColors;
  semantic: BrandSemanticColors;
  golf: BrandGolfColors;
  grays: BrandGrayScale;
  darkMode: BrandDarkModeOverrides;
}
```

### Primary Colors

The core brand identity colors:

```typescript
interface BrandPrimaryColors {
  primary: string;       // Main brand color (buttons, links, accents)
  primaryDark: string;   // Darker shade (pressed states)
  primaryLight: string;  // Lighter shade (hover states)
  primaryLighter: string; // Lightest (backgrounds, tints)
}
```

**Example:**
```typescript
primary: {
  primary: '#3b82f6',     // Blue 500
  primaryDark: '#2563eb', // Blue 600
  primaryLight: '#60a5fa', // Blue 400
  primaryLighter: '#93c5fd', // Blue 300
}
```

### Semantic Colors

Status and feedback colors:

```typescript
interface BrandSemanticColors {
  success: { base: string; light: string; dark: string };
  warning: { base: string; light: string; dark: string };
  error: { base: string; light: string; dark: string };
  info: { base: string; light: string; dark: string };
}
```

**Recommendations:**
- `success` - Typically green (#22c55e)
- `warning` - Typically amber/orange (#f59e0b)
- `error` - Typically red (#ef4444)
- `info` - Can match primary or use a distinct blue

### Golf Colors

Score visualization colors for the scorecard:

```typescript
interface BrandGolfColors {
  eagle: string;       // 2+ under par (typically emerald)
  birdie: string;      // 1 under par (typically green)
  par: string;         // Even par (can match brand primary)
  bogey: string;       // 1 over par (typically orange)
  doubleBogey: string; // 2+ over par (typically red)
}
```

**Tip:** Setting `par` to match your brand primary creates visual cohesion.

### Gray Scale

Neutral colors for backgrounds, borders, and text:

```typescript
interface BrandGrayScale {
  white: string;
  gray50: string;   // Lightest
  gray100: string;
  gray200: string;
  gray300: string;
  gray400: string;
  gray500: string;  // Mid-tone
  gray600: string;
  gray700: string;
  gray800: string;
  gray900: string;  // Darkest
  black: string;
}
```

**Gray Scale Options:**

| Style | Description | Example gray500 |
|-------|-------------|-----------------|
| Neutral | Pure gray, no undertone | #6b7280 (default) |
| Cool | Blue undertone | #64748b (Slate) |
| Warm | Brown undertone | #78716c (Stone) |

### Dark Mode Overrides

Specific adjustments for dark mode:

```typescript
interface BrandDarkModeOverrides {
  primary: string;        // Brighter version of primary for visibility
  background: string;     // Main screen background
  surface: string;        // Card/container backgrounds
  surfaceVariant: string; // Alternate surface (borders, dividers)
}
```

**Example:**
```typescript
darkMode: {
  primary: '#60a5fa',      // Brighter blue (was #3b82f6)
  background: '#0f172a',   // Very dark slate
  surface: '#1e293b',      // Dark slate
  surfaceVariant: '#334155', // Medium dark slate
}
```

---

## Color Generation

The `colors.ts` module generates complete light and dark palettes from your brand config:

### Light Mode Generation

```typescript
import { generateLightColors } from '@/constants/colors';

const lightColors = generateLightColors(brand);
// Returns ~50 color properties including:
// - primary, primaryDark, primaryLight, primaryLighter
// - All grays
// - success, warning, error, info (with Light/Dark variants)
// - birdie, par, bogey, doubleBogey, eagle
// - Background colors (eagleBackground, birdieBackground, etc.)
// - background, surface, surfaceVariant
// - border, borderStrong, borderLight
// - textPrimary, textSecondary, textTertiary, textDisabled
// - overlay, scrim
```

### Dark Mode Generation

The generator automatically:
- Brightens primary colors for visibility on dark backgrounds
- Inverts the gray scale semantically
- Adjusts semantic colors for dark backgrounds
- Creates darker background tints for score cells

---

## Environment-Based Brand Selection

For CI/CD builds with different brands:

### Option 1: Environment Variable

```typescript
// src/config/brands/index.ts
import { theNineteenthBrand } from './theNineteenth.brand';
import { greenGolfBrand } from './greenGolf.brand';

const brands = {
  'the-nineteenth': theNineteenthBrand,
  'green-golf': greenGolfBrand,
} as const;

type BrandId = keyof typeof brands;
const brandId = (process.env.EXPO_PUBLIC_BRAND_ID || 'the-nineteenth') as BrandId;
export const activeBrand = brands[brandId] || theNineteenthBrand;
```

### Option 2: EAS Build Profiles

In `eas.json`:

```json
{
  "build": {
    "production-the-nineteenth": {
      "env": {
        "EXPO_PUBLIC_BRAND_ID": "the-nineteenth"
      }
    },
    "production-green-golf": {
      "env": {
        "EXPO_PUBLIC_BRAND_ID": "green-golf"
      }
    }
  }
}
```

Build with:
```bash
eas build --profile production-green-golf --platform ios
```

---

## Best Practices

### 1. Color Contrast

Ensure sufficient contrast for accessibility:
- Text on background: minimum 4.5:1 ratio
- Large text/icons: minimum 3:1 ratio
- Use tools like [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### 2. Dark Mode Primary

Make the dark mode primary brighter than the light mode primary:
```typescript
primary: {
  primary: '#3b82f6',  // Light mode: Blue 500
},
darkMode: {
  primary: '#60a5fa',  // Dark mode: Blue 400 (brighter)
}
```

### 3. Gray Scale Consistency

Use a complete gray scale from a design system:
- **Tailwind CSS**: gray, slate, zinc, neutral, stone
- **Material Design**: Gray scale
- **Custom**: Generate using [ColorBox](https://colorbox.io/)

### 4. Golf Color Semantics

Keep golf colors intuitive:
- Eagle/Birdie: Green shades (under par = good)
- Bogey/Double: Orange/Red shades (over par = needs improvement)
- Par: Can match brand primary or use neutral blue

### 5. Testing Brands

Test your brand on multiple screens:
- Scorecard (uses all golf colors)
- Settings (uses primary for toggles)
- Dark mode toggle
- Error/success states

---

## Troubleshooting

### Colors Not Updating

1. Clear Metro cache:
   ```bash
   npx expo start --clear
   ```

2. Delete `node_modules/.cache` if issues persist

3. Verify `activeBrand` export in `src/config/brands/index.ts`

### TypeScript Errors

If you see type errors after creating a brand:

```typescript
// Ensure all required properties are defined
const myBrand: BrandConfig = {
  id: '...',
  name: '...',
  primary: { ... },     // All 4 properties required
  semantic: { ... },    // All 4 colors with base/light/dark
  golf: { ... },        // All 5 score colors
  grays: { ... },       // All 12 gray values
  darkMode: { ... },    // All 4 overrides
};
```

### Dark Mode Looks Wrong

Check these common issues:
1. `darkMode.primary` should be brighter than `primary.primary`
2. `darkMode.background` should be very dark
3. `darkMode.surface` should be slightly lighter than background

---

## Component Usage

Components continue to use `useThemeColors()` as before:

```typescript
import { useThemeColors } from '@/context/ThemeContext';

function MyComponent() {
  const colors = useThemeColors();

  return (
    <View style={{ backgroundColor: colors.surface }}>
      <Text style={{ color: colors.textPrimary }}>Hello</Text>
      <Button color={colors.primary}>Action</Button>
    </View>
  );
}
```

No changes are needed to existing components when switching brands.

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/config/brand.types.ts` | TypeScript interfaces for brand config |
| `src/config/brands/index.ts` | **Single swap point** - exports active brand |
| `src/config/brands/theNineteenth.brand.ts` | Default brand (blue) |
| `src/constants/colors.ts` | Light/dark palette generation |
| `src/constants/theme.ts` | Exports `lightColors` and `darkColors` |

---

## Migration Notes

### From Hardcoded Colors

If you have components with hardcoded hex values:

```typescript
// Before (hardcoded)
<View style={{ backgroundColor: '#3b82f6' }}>

// After (theme-aware)
const colors = useThemeColors();
<View style={{ backgroundColor: colors.primary }}>
```

### Available Color Properties

All colors available via `useThemeColors()`:

| Category | Properties |
|----------|------------|
| Primary | `primary`, `primaryDark`, `primaryLight`, `primaryLighter` |
| Grays | `white`, `gray50`-`gray900`, `black` |
| Semantic | `success`, `warning`, `error`, `info` (+ Light/Dark variants) |
| Golf | `birdie`, `par`, `bogey`, `doubleBogey`, `eagle` |
| Backgrounds | `background`, `surface`, `surfaceVariant`, `surfaceElevated` |
| Score BGs | `birdieBackground`, `parBackground`, `bogeyBackground`, etc. |
| Text | `textPrimary`, `textSecondary`, `textTertiary`, `textDisabled`, `textInverse` |
| Borders | `border`, `borderStrong`, `borderLight` |
| Overlays | `overlay`, `scrim` |
