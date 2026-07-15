/**
 * ScorecardTable Styles
 *
 * Shared styles for the scorecard table components.
 */

import { StyleSheet } from 'react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import {
  HOLE_CELL_WIDTH,
  INDEX_CELL_WIDTH,
  PAR_CELL_WIDTH,
  CELL_HEIGHTS,
} from '@/utils/scorecardLayout';

/**
 * Fixed dark-green band colors for the header and Gross rows.
 *
 * Intentionally hardcoded (NOT theme tokens): the band is the same dark green
 * in BOTH light and dark themes, matching the HeroCard / heroPalette
 * convention (see src/components/common/HeroCard.tsx and the Score & Round
 * redesign spec).
 */
export const scorecardBand = {
  /** Dark band background (header row + Gross row) */
  background: '#1f2a19',
  /** Primary label text on the band (HOLE, GROSS) */
  label: '#c8d6bd',
  /** Muted label text on the band (PAR, SI, handicap line) */
  muted: '#94a688',
  /** Green accent on the band (Pts column header) */
  accent: '#a9d38a',
  /** Values on the band (player names, gross totals) */
  text: '#ffffff',
} as const;

export const styles = StyleSheet.create({
  // =====================================================
  // CONTAINER
  // =====================================================
  tableContainer: {
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  stickyTableWrapper: {
    flexDirection: 'row',
  },
  fixedColumnsContainer: {
    zIndex: 1,
  },
  scrollableColumnsContainer: {
    flex: 1,
  },

  // =====================================================
  // ROWS
  // =====================================================
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subtotalRow: {},
  totalRow: {},
  stablefordRow: {
    borderBottomWidth: 0,
  },

  // =====================================================
  // CELLS - BASE
  // =====================================================
  tableCell: {
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    height: CELL_HEIGHTS.standard,
  },
  headerCell: {
    paddingVertical: spacing.md,
    height: CELL_HEIGHTS.header,
  },
  subtotalCell: {},
  totalCell: {},
  stablefordCell: {},

  // =====================================================
  // CELLS - FIXED COLUMNS
  // =====================================================
  holeCell: {
    width: HOLE_CELL_WIDTH,
  },
  indexCell: {
    width: INDEX_CELL_WIDTH,
  },
  parCell: {
    width: PAR_CELL_WIDTH,
  },
  // Stats cells (Putts, FIR, GIR, Pts) - used in solo mode
  // Uses flex: 1 for even distribution with player column in non-scroll path
  statCell: {
    flex: 1,
  },

  // =====================================================
  // TEXT STYLES
  // =====================================================
  headerText: {
    ...typography.smallBold,
    textAlign: 'center',
  },
  /** Uppercase fixed-column labels (Hole / SI / Par) on the dark header band */
  headerLabelText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  handicapText: {
    ...typography.caption,
    marginTop: 2,
  },
  holeCellText: {
    ...typography.bodyBold,
  },
  indexCellText: {
    ...typography.small,
  },
  parCellText: {
    ...typography.body,
  },
  subtotalText: {
    ...typography.smallBold,
  },
  totalLabelText: {
    ...typography.smallBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  totalText: {
    ...typography.bodyBold,
  },
  /** Gross totals on the dark band */
  grossValueText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  /** Net totals on the plain row */
  netValueText: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
  },
  stablefordLabelText: {
    ...typography.smallBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  stablefordText: {
    ...typography.bodyBold,
  },
  /** Points totals on the green Points band */
  pointsValueText: {
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '800',
  },
  parScoreText: {
    ...typography.bodyBold,
    textAlign: 'center',
  },
  stablefordSubscript: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center' as const,
  },
});

export default styles;
