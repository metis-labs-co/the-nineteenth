import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useThemeColors } from '@/context/ThemeContext';

interface LogoProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Logo component - Pennant icon for The Nineteenth app
 *
 * Uses the Tabler pennant-2 icon paths directly via react-native-svg
 * for maximum compatibility with Expo.
 */
export function Logo({
  size = 64,
  color,
  strokeWidth = 2,
}: LogoProps) {
  const colors = useThemeColors();
  const strokeColor = color ?? colors.primary;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Pennant-2 icon paths from Tabler */}
      <Path d="M16 21h-4" />
      <Path d="M14 21v-18" />
      <Path d="M14 4l-9 4l9 4" />
    </Svg>
  );
}

export default Logo;
