/**
 * SimplifiedRoundCard - Compact round card for simplified wizard flow
 * Shows configured state or "tap to configure" placeholder
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { format, parse, isValid } from 'date-fns';
import type { SimplifiedRoundFormData, GameType } from '@/schemas/competition';
import { GAME_TYPE_LABELS } from '../types';

export interface SimplifiedRoundCardProps {
  round: SimplifiedRoundFormData;
  roundNumber: number;
  onPress: () => void;
}

// Helper to format date from DD/MM/YYYY to display format
function formatDisplayDate(dateString?: string): string {
  if (!dateString) return '';
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  if (!isValid(parsed)) return dateString;
  return format(parsed, 'EEE d MMM yyyy');
}

export function SimplifiedRoundCard({
  round,
  roundNumber,
  onPress,
}: SimplifiedRoundCardProps) {
  const colors = useThemeColors();

  // A round is considered configured if it has a course or has been explicitly edited
  const isConfigured = round.isConfigured || !!round.courseId;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isConfigured ? colors.primary : colors.gray200,
          borderWidth: isConfigured ? 2 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.roundBadge,
              { backgroundColor: isConfigured ? colors.primaryLighter : colors.gray100 },
            ]}
          >
            <Text
              style={[
                styles.roundBadgeText,
                { color: isConfigured ? colors.primary : colors.gray500 },
              ]}
            >
              {roundNumber}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Round {roundNumber}
          </Text>
        </View>
        <Icon
          source="chevron-right"
          size={24}
          color={isConfigured ? colors.primary : colors.gray400}
        />
      </View>

      {isConfigured ? (
        <View style={styles.content}>
          {/* Course Name */}
          {round.courseName && (
            <View style={styles.infoRow}>
              <Icon source="golf" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textPrimary }]} numberOfLines={1}>
                {round.courseName}
              </Text>
            </View>
          )}

          {/* Date */}
          {round.date && (
            <View style={styles.infoRow}>
              <Icon source="calendar" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textPrimary }]}>
                {formatDisplayDate(round.date)}
              </Text>
            </View>
          )}

          {/* Game Type */}
          <View style={styles.infoRow}>
            <Icon source="trophy" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textPrimary }]}>
              {GAME_TYPE_LABELS[(round.matchType as GameType) || 'stableford']}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.placeholder, { backgroundColor: colors.gray50 }]}>
          <Icon source="pencil-outline" size={20} color={colors.gray400} />
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            Tap to configure
          </Text>
        </View>
      )}

      {/* Status indicator */}
      <View style={styles.footer}>
        {isConfigured ? (
          <View style={[styles.statusBadge, { backgroundColor: colors.successLight }]}>
            <Icon source="check-circle" size={14} color={colors.success} />
            <Text style={[styles.statusText, { color: colors.success }]}>Configured</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: colors.gray100 }]}>
            <Icon source="clock-outline" size={14} color={colors.gray500} />
            <Text style={[styles.statusText, { color: colors.gray500 }]}>Not configured</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roundBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundBadgeText: {
    ...typography.bodyBold,
  },
  title: {
    ...typography.bodyBold,
  },
  content: {
    paddingLeft: spacing.xs,
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },
  placeholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  placeholderText: {
    ...typography.body,
  },
  footer: {
    marginTop: spacing.sm,
    alignItems: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '500',
  },
});
