/**
 * Shared styles for DetailsTab sections
 */

import { StyleSheet } from 'react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

export const sharedStyles = StyleSheet.create({
  // Section
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  noMargin: {
    marginBottom: 0,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionEditButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Detail Row
  detailRowPressable: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  detailLabel: {
    ...typography.body,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailValue: {
    ...typography.body,
    textAlign: 'right',
  },
  detailChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  detailChipText: {
    ...typography.small,
  },
  detailDivider: {
    height: 1,
    marginHorizontal: spacing.lg,
  },

  // Card
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
});
