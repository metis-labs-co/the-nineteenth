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
    borderBottomWidth: 1,
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
    paddingVertical: spacing.sm,
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
  },
  totalText: {
    ...typography.bodyBold,
  },
  stablefordLabelText: {
    ...typography.smallBold,
  },
  stablefordText: {
    ...typography.bodyBold,
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
