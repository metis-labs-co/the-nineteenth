/**
 * Scorecard Layout Utilities
 *
 * Shared utility functions for calculating scorecard table layouts,
 * column widths, and scroll behavior. Used by ReviewScorecardScreen
 * and RoundScorecardTab for consistent table displays.
 */

import { spacing } from '@/constants/theme';

// Re-export for backward compatibility with existing imports
export { PICKUP_SCORE } from '@/constants/scoring';

// =====================================================
// CONSTANTS
// =====================================================

/** Width of the hole number column */
export const HOLE_CELL_WIDTH = 48;

/** Width of the stroke index (SI) column */
export const INDEX_CELL_WIDTH = 36;

/** Width of the par column */
export const PAR_CELL_WIDTH = 44;

/** Minimum width for player score columns */
export const MIN_PLAYER_CELL_WIDTH = 72;

/** Total horizontal padding (both sides) */
export const HORIZONTAL_PADDING = spacing.md * 2;

/** Fixed column widths combined (Hole + SI + Par) */
export const FIXED_COLUMNS_WIDTH = HOLE_CELL_WIDTH + INDEX_CELL_WIDTH + PAR_CELL_WIDTH;

// =====================================================
// LAYOUT CALCULATION FUNCTIONS
// =====================================================

/**
 * Layout configuration for scorecard table
 */
export interface ScorecardLayout {
  /** Width of each player column */
  playerCellWidth: number;
  /** Width of all fixed columns combined (Hole, SI, Par) */
  fixedColumnsWidth: number;
  /** Whether horizontal scrolling is needed for player columns */
  needsHorizontalScroll: boolean;
  /** Available width for player columns */
  availablePlayerWidth: number;
}

/**
 * Calculate the layout configuration for a scorecard table
 *
 * @param screenWidth Total screen width
 * @param playerCount Number of players in the scorecard
 * @returns Layout configuration object
 */
export function calculateScorecardLayout(
  screenWidth: number,
  playerCount: number
): ScorecardLayout {
  const availableWidth = screenWidth - HORIZONTAL_PADDING - FIXED_COLUMNS_WIDTH;
  const widthPerPlayer = availableWidth / playerCount;

  // Use the larger of minimum width or calculated width (fills screen for fewer players)
  const playerCellWidth = Math.max(MIN_PLAYER_CELL_WIDTH, Math.floor(widthPerPlayer));

  // Determine if horizontal scrolling is needed
  const minPlayerColumnsWidth = MIN_PLAYER_CELL_WIDTH * playerCount;
  const needsHorizontalScroll = minPlayerColumnsWidth > availableWidth;

  return {
    playerCellWidth,
    fixedColumnsWidth: FIXED_COLUMNS_WIDTH,
    needsHorizontalScroll,
    availablePlayerWidth: availableWidth,
  };
}

/**
 * Calculate the total table width based on players and layout
 *
 * @param layout Layout configuration
 * @param playerCount Number of players
 * @returns Total table width in pixels
 */
export function calculateTableWidth(layout: ScorecardLayout, playerCount: number): number {
  return layout.fixedColumnsWidth + layout.playerCellWidth * playerCount;
}

/**
 * Get cell height based on row type
 */
export interface CellHeights {
  /** Standard data row height */
  standard: number;
  /** Header row height */
  header: number;
}

/**
 * Standard cell heights for scorecard tables
 */
export const CELL_HEIGHTS: CellHeights = {
  standard: 44,
  header: 56,
};

// =====================================================
// INDIVIDUAL SCORECARD LAYOUT
// =====================================================

/** Width of the label column in individual scorecard view */
export const INDIVIDUAL_LABEL_WIDTH = 40;

/** Width of the total column in individual scorecard view */
export const INDIVIDUAL_TOTAL_WIDTH = 36;

/**
 * Calculate cell width for individual scorecard view
 * Each hole gets equal width after accounting for label and total columns
 *
 * @param containerWidth Total container width
 * @param holeCount Number of holes to display (typically 9)
 * @returns Width for each hole cell
 */
export function calculateIndividualHoleCellWidth(
  containerWidth: number,
  holeCount: number = 9
): number {
  const availableWidth = containerWidth - INDIVIDUAL_LABEL_WIDTH - INDIVIDUAL_TOTAL_WIDTH;
  return Math.floor(availableWidth / holeCount);
}
