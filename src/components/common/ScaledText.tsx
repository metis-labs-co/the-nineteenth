/**
 * ScaledText Component
 *
 * A wrapper around React Native Paper's Text component that supports
 * iOS Dynamic Type and Android font scaling with controlled maximums.
 *
 * This component applies `maxFontSizeMultiplier` based on the text category
 * to prevent layout breakage while maintaining accessibility support.
 *
 * @example
 * // Default body text - scales up to 1.5x
 * <ScaledText>Description text</ScaledText>
 *
 * // Title text - scales up to 1.35x
 * <ScaledText category="title">Page Title</ScaledText>
 *
 * // Critical UI text (score buttons) - scales up to 1.2x
 * <ScaledText category="critical">7</ScaledText>
 *
 * // Caption text - scales up to 1.35x
 * <ScaledText category="caption">Par 4</ScaledText>
 *
 * // Display numbers - scales up to 1.35x
 * <ScaledText category="display">+12</ScaledText>
 */

import React from 'react';
import { Text } from 'react-native-paper';

/**
 * Text scaling category that determines the maximum font size multiplier.
 *
 * - `critical`: 1.2x - For text inside fixed-size containers (score buttons, etc.)
 * - `title`: 1.35x - For headers and page titles
 * - `body`: 1.5x - For body text and descriptions (default)
 * - `caption`: 1.35x - For small labels and metadata
 * - `display`: 1.35x - For large display numbers
 */
export type ScaledTextCategory =
  | 'display'
  | 'title'
  | 'body'
  | 'caption'
  | 'critical';

/**
 * Props for the ScaledText component.
 * Extends all props from React Native Paper's Text component.
 */
export interface ScaledTextProps extends React.ComponentProps<typeof Text> {
  /**
   * The scaling category that determines maximum font size multiplier.
   * @default 'body'
   */
  category?: ScaledTextCategory;
}

/**
 * Maximum font size multiplier values for each category.
 * These values balance accessibility with layout stability.
 */
const SCALE_MULTIPLIERS: Record<ScaledTextCategory, number> = {
  critical: 1.2, // Fixed containers like score buttons
  title: 1.35, // Headers
  body: 1.5, // Descriptions (most generous for readability)
  caption: 1.35, // Small labels
  display: 1.35, // Large numbers
};

/**
 * ScaledText - Accessible text component with controlled scaling.
 *
 * Wraps React Native Paper's Text component and applies maxFontSizeMultiplier
 * based on the category prop. This ensures text scales with system accessibility
 * settings while preventing layout breakage.
 */
export function ScaledText({
  category = 'body',
  children,
  ...props
}: ScaledTextProps) {
  const maxFontSizeMultiplier = SCALE_MULTIPLIERS[category];

  return (
    <Text maxFontSizeMultiplier={maxFontSizeMultiplier} {...props}>
      {children}
    </Text>
  );
}

export default ScaledText;
