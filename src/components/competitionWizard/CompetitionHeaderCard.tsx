// src/components/competition/CompetitionHeaderCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Divider } from 'react-native-paper';
import { IconCalendar, IconGolf, IconUsers } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { formatDateRange } from '@/utils/formatting';
import { StatusBadge, type StatusVariant } from '@/components/common/StatusBadge';
import type { CompetitionStatus } from '@/types/database.types';

/**
 * Map CompetitionStatus to StatusVariant
 * Note: 'in-progress' competitions show as 'active' in the badge
 */
const getStatusVariant = (status: CompetitionStatus): StatusVariant => {
  // 'in-progress' competitions are shown as 'active' for better UX
  if (status === 'in-progress') return 'active';
  return status as StatusVariant;
};

/**
 * Get status label for accessibility
 */
const getStatusLabel = (status: CompetitionStatus): string => {
  const labels: Record<CompetitionStatus, string> = {
    upcoming: 'Upcoming',
    'in-progress': 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status];
};

export interface CompetitionHeaderCardProps {
  /**
   * Competition name (required)
   */
  name: string;
  /**
   * Competition start date in ISO format (YYYY-MM-DD)
   */
  startDate: string;
  /**
   * Competition end date in ISO format (optional, for multi-round)
   */
  endDate?: string | null;
  /**
   * Competition description (optional)
   */
  description?: string | null;
  /**
   * Competition status for badge display
   */
  status: CompetitionStatus;
  /**
   * Number of players in the competition (optional)
   */
  playerCount?: number;
  /**
   * Name of the course (optional)
   */
  courseName?: string;
  /**
   * Callback when card is pressed (optional)
   */
  onPress?: () => void;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * CompetitionHeaderCard - Reusable card showing competition info
 *
 * @description
 * Displays competition name, dates, description, and status badge.
 * Uses React Native Paper Card component with design tokens.
 * Supports Australian date format (DD/MM/YYYY).
 *
 * @example
 * ```tsx
 * <CompetitionHeaderCard
 *   name="Summer Series 2025"
 *   startDate="2025-01-15"
 *   endDate="2025-02-15"
 *   description="Monthly Stableford competition"
 *   status="in-progress"
 *   playerCount={12}
 *   courseName="Royal Melbourne"
 *   onPress={() => navigation.navigate('CompetitionDetails')}
 * />
 * ```
 */
export const CompetitionHeaderCard = React.memo(function CompetitionHeaderCard({
  name,
  startDate,
  endDate,
  description,
  status,
  playerCount,
  courseName,
  onPress,
  testID,
}: CompetitionHeaderCardProps) {
  const colors = useThemeColors();
  const dateDisplay = formatDateRange(startDate, endDate);
  const statusVariant = getStatusVariant(status);
  const statusLabel = getStatusLabel(status);

  return (
    <Card
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Competition: ${name}. Status: ${statusLabel}. Dates: ${dateDisplay}`}
      accessibilityHint={onPress ? 'Double tap to view competition details' : undefined}
    >
      <Card.Content style={styles.content}>
        {/* Header Row: Name + Status Badge */}
        <View style={styles.headerRow}>
          <Text
            variant="titleLarge"
            style={[styles.name, { color: colors.textPrimary }]}
            numberOfLines={2}
            ellipsizeMode="tail"
            accessibilityRole="header"
          >
            {name}
          </Text>
          <StatusBadge status={statusVariant} />
        </View>

        {/* Date Display */}
        <View style={styles.dateRow}>
          <IconCalendar size={16} color={colors.textSecondary} />
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{dateDisplay}</Text>
        </View>

        {/* Optional: Course Name */}
        {courseName && (
          <View style={styles.infoRow}>
            <IconGolf size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
              {courseName}
            </Text>
          </View>
        )}

        {/* Optional: Player Count */}
        {typeof playerCount === 'number' && (
          <View style={styles.infoRow}>
            <IconUsers size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {playerCount} {playerCount === 1 ? 'player' : 'players'}
            </Text>
          </View>
        )}

        {/* Optional: Description */}
        {description && (
          <>
            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text
              style={[styles.description, { color: colors.textSecondary }]}
              numberOfLines={3}
              ellipsizeMode="tail"
            >
              {description}
            </Text>
          </>
        )}
      </Card.Content>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  content: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  name: {
    ...typography.h3,
    flex: 1,
    flexShrink: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  dateText: {
    ...typography.body,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },
  divider: {
    marginVertical: spacing.md,
  },
  description: {
    ...typography.small,
    lineHeight: 20,
  },
});

export default CompetitionHeaderCard;
