/**
 * RoundLeaderboard styles
 *
 * Shared styles for all leaderboard components
 */

import { StyleSheet } from 'react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';

export const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  roundTitle: {
    ...typography.h3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  teamBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  courseName: {
    ...typography.caption,
    flex: 1,
  },

  // Card
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },

  // Table
  table: {
    paddingVertical: spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  headerCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  cell: {
    justifyContent: 'center',
  },

  // Column widths
  positionCol: {
    width: 36,
    alignItems: 'center',
  },
  nameCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  handicapCol: {
    width: 36,
    alignItems: 'center',
  },
  scoreCol: {
    width: 44,
    alignItems: 'flex-end',
  },
  grossCol: {
    width: 44,
    alignItems: 'flex-end',
  },

  // Text styles
  positionText: {
    ...typography.bodyBold,
  },
  tiedIndicator: {
    ...typography.caption,
    marginLeft: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  nameText: {
    ...typography.body,
    flexShrink: 1,
  },
  bypassIcon: {
    marginLeft: spacing.xs,
  },
  membersText: {
    ...typography.caption,
    marginTop: 2,
  },
  handicapText: {
    ...typography.small,
  },
  scoreText: {
    ...typography.h4,
  },
  grossText: {
    ...typography.small,
  },

  // Match Play styles
  matchPlayContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  matchCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  matchLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
  },
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  matchPlayer: {
    flex: 1,
  },
  matchPlayerName: {
    ...typography.bodyBold,
  },
  matchPlayerMembers: {
    ...typography.caption,
    marginTop: 2,
  },
  matchResult: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  matchResultText: {
    ...typography.smallBold,
  },
  matchOpponent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  vsText: {
    ...typography.caption,
    marginBottom: 2,
  },
  matchOpponentName: {
    ...typography.body,
    textAlign: 'right',
  },
  matchFooter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  matchStats: {
    ...typography.caption,
    textAlign: 'center',
  },

  // Loading state
  loadingContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
});
