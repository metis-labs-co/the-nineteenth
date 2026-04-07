/**
 * PartnershipRoundCard - Tagged partnership round with target differential
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { PartnershipRound, DifficultyLevel } from '@/types/database';

interface PartnershipRoundCardProps {
  round: PartnershipRound;
  onUntag?: (roundId: string) => void;
}

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  easy: '#4CAF50',
  standard: '#2196F3',
  challenge: '#FF9800',
  heroic: '#F44336',
};

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'Easy',
  standard: 'Standard',
  challenge: 'Challenge',
  heroic: 'Heroic',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export const PartnershipRoundCard = React.memo(function PartnershipRoundCard({
  round,
  onUntag,
}: PartnershipRoundCardProps) {
  const colors = useThemeColors();
  const diffColor = DIFFICULTY_COLORS[round.difficulty_level];
  const isUnderTarget = round.target_differential <= 0;

  const handleUntag = useCallback(() => {
    onUntag?.(round.id);
  }, [onUntag, round.id]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Differential Badge */}
      <View style={[styles.diffBadge, { backgroundColor: isUnderTarget ? colors.successBackground : colors.errorBackground }]}>
        <Text style={[styles.diffValue, { color: isUnderTarget ? colors.success : colors.error }]}>
          {round.target_differential > 0 ? '+' : ''}{round.target_differential}
        </Text>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <Text style={[styles.courseName, { color: colors.textPrimary }]} numberOfLines={1}>
          {round.course_name}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {formatDate(round.played_at)} · {round.combined_gross} gross · Target {round.target_score}
        </Text>
        <View style={styles.badges}>
          <View style={[styles.difficultyBadge, { backgroundColor: diffColor + '20' }]}>
            <Text style={[styles.difficultyText, { color: diffColor }]}>
              {DIFFICULTY_LABELS[round.difficulty_level]}
            </Text>
          </View>
        </View>
      </View>

      {/* Untag button */}
      {onUntag && (
        <TouchableOpacity
          onPress={handleUntag}
          style={styles.untagButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Remove tagged round"
        >
          <Icon source="close-circle-outline" size={20} color={colors.gray400} />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  diffBadge: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffValue: {
    ...typography.h3,
    fontSize: 18,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  courseName: {
    ...typography.bodyBold,
  },
  meta: {
    ...typography.small,
  },
  badges: {
    flexDirection: 'row',
    marginTop: 2,
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  difficultyText: {
    ...typography.small,
    fontSize: 11,
    fontWeight: '600',
  },
  untagButton: {
    padding: spacing.xs,
  },
});

export default PartnershipRoundCard;
