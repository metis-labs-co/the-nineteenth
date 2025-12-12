/**
 * Brand Configuration Types
 *
 * Defines the shape of a brand configuration file for white-label theming.
 * Each brand provides core colors, from which light/dark mode palettes are derived.
 *
 * To create a new brand:
 * 1. Create a new file in src/config/brands/ (e.g., myBrand.brand.ts)
 * 2. Export a BrandConfig object
 * 3. Update src/config/brands/index.ts to use your brand
 */

/**
 * Core brand identity colors - the primary color palette
 */
export interface BrandPrimaryColors {
  /** Main brand color (e.g., #3b82f6 for blue) */
  primary: string;
  /** Darker shade of primary for pressed states */
  primaryDark: string;
  /** Lighter shade of primary for hover states */
  primaryLight: string;
  /** Even lighter shade for backgrounds and tints */
  primaryLighter: string;
}

/**
 * Semantic color definitions with base, light, and dark variants
 */
export interface BrandSemanticColors {
  success: {
    base: string;
    light: string;
    dark: string;
  };
  warning: {
    base: string;
    light: string;
    dark: string;
  };
  error: {
    base: string;
    light: string;
    dark: string;
  };
  info: {
    base: string;
    light: string;
    dark: string;
  };
}

/**
 * Golf-specific score colors
 * These are domain colors that typically remain consistent
 * but can be customized per brand if needed
 */
export interface BrandGolfColors {
  eagle: string;
  birdie: string;
  par: string;
  bogey: string;
  doubleBogey: string;
}

/**
 * Gray scale palette
 * Brands can customize the gray tones (warm, cool, neutral)
 */
export interface BrandGrayScale {
  white: string;
  gray50: string;
  gray100: string;
  gray200: string;
  gray300: string;
  gray400: string;
  gray500: string;
  gray600: string;
  gray700: string;
  gray800: string;
  gray900: string;
  black: string;
}

/**
 * Dark mode specific overrides
 * These define how colors adapt in dark mode
 */
export interface BrandDarkModeOverrides {
  /** Primary color in dark mode (typically brighter for visibility) */
  primary: string;
  /** Background color for dark mode screens */
  background: string;
  /** Surface color for dark mode cards/containers */
  surface: string;
  /** Variant surface color for dark mode */
  surfaceVariant: string;
}

/**
 * Complete brand configuration
 *
 * @example
 * ```typescript
 * const myBrand: BrandConfig = {
 *   id: 'my-brand',
 *   name: 'My Golf App',
 *   primary: {
 *     primary: '#059669',
 *     primaryDark: '#047857',
 *     primaryLight: '#10b981',
 *     primaryLighter: '#6ee7b7',
 *   },
 *   // ... rest of config
 * };
 * ```
 */
export interface BrandConfig {
  /** Unique identifier for the brand */
  id: string;
  /** Display name of the brand */
  name: string;
  /** Primary brand colors */
  primary: BrandPrimaryColors;
  /** Semantic colors (success, warning, error, info) */
  semantic: BrandSemanticColors;
  /** Golf score colors */
  golf: BrandGolfColors;
  /** Gray scale */
  grays: BrandGrayScale;
  /** Dark mode specific overrides */
  darkMode: BrandDarkModeOverrides;
}
