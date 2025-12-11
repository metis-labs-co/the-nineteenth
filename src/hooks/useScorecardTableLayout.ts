/**
 * useScorecardTableLayout
 *
 * Custom hook for calculating scorecard table layout based on screen dimensions
 * and player count. Provides memoized layout configuration for optimal performance.
 */

import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  calculateScorecardLayout,
  type ScorecardLayout,
} from '@/utils/scorecardLayout';

/**
 * Calculate scorecard table layout based on screen width and player count
 *
 * @param playerCount Number of players in the scorecard
 * @returns Layout configuration with cell widths and scroll behavior
 */
export function useScorecardTableLayout(playerCount: number): ScorecardLayout & {
  screenWidth: number;
} {
  const { width: screenWidth } = useWindowDimensions();

  const layout = useMemo(
    () => calculateScorecardLayout(screenWidth, playerCount),
    [screenWidth, playerCount]
  );

  return {
    ...layout,
    screenWidth,
  };
}

export default useScorecardTableLayout;
