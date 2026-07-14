/**
 * CombinablePairsSection - Lists 9-hole rounds that can be combined into 18.
 *
 * Renders a card for each (course, tee) group where the player has both a
 * front-9 and back-9 scorecard. Tapping "Combine" pairs them into a single
 * 18-hole entry counted toward the WHS Social Handicap Index.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { formatHandicapIndex } from '@/utils/displayHelpers';
import { formatDateDisplay } from '@/utils/formatting';
import type { CombinableNinePair } from '@/types';

interface CombinablePairsSectionProps {
  pairs: CombinableNinePair[];
  playerId: string;
  isCombining: boolean;
  onCombine: (pair: CombinableNinePair) => void;
}

function formatDate(dateString: string): string {
  if (!dateString) return '';
  return formatDateDisplay(dateString, {
    day: '2-digit',
    month: 'short',
  });
}

export function CombinablePairsSection({
  pairs,
  isCombining,
  onCombine,
}: CombinablePairsSectionProps) {
  const colors = useThemeColors();

  const handleCombinePress = useCallback(
    (pair: CombinableNinePair) => {
      Alert.alert(
        'Combine 9-hole rounds?',
        `Pair your front-9 (${pair.front.totalGross}) with your back-9 (${pair.back.totalGross}) at ${pair.courseName} into a single 18-hole round for handicap tracking.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Combine', onPress: () => onCombine(pair) },
        ],
      );
    },
    [onCombine],
  );

  if (pairs.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        Combine 9-hole rounds
      </Text>
      <Text style={[styles.sectionHint, { color: colors.textTertiary }]}>
        Pair a front and back 9 from the same course into an 18-hole handicap round.
      </Text>

      {pairs.map((pair) => (
        <View
          key={pair.id}
          style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}
        >
          {/* Course + tee */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.courseName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {pair.courseName}
              </Text>
              {pair.teeName && (
                <Text style={[styles.teeName, { color: colors.textSecondary }]}>
                  {pair.teeName} tees
                </Text>
              )}
            </View>
          </View>

          {/* Front / Back summary */}
          <View style={styles.pieceRow}>
            <View style={styles.piece}>
              <Text style={[styles.pieceLabel, { color: colors.textSecondary }]}>
                Front 9 · {formatDate(pair.front.roundDate)}
              </Text>
              <Text style={[styles.pieceGross, { color: colors.textPrimary }]}>
                {pair.front.totalGross}
              </Text>
            </View>
            <Icon source="plus" size={16} color={colors.textTertiary} />
            <View style={styles.piece}>
              <Text style={[styles.pieceLabel, { color: colors.textSecondary }]}>
                Back 9 · {formatDate(pair.back.roundDate)}
              </Text>
              <Text style={[styles.pieceGross, { color: colors.textPrimary }]}>
                {pair.back.totalGross}
              </Text>
            </View>
          </View>

          {/* Projected combined values */}
          <View style={[styles.projectedRow, { borderTopColor: colors.border }]}>
            <View>
              <Text style={[styles.projectedLabel, { color: colors.textSecondary }]}>
                Combined gross
              </Text>
              <Text style={[styles.projectedValue, { color: colors.textPrimary }]}>
                {pair.projectedCombinedGross}
              </Text>
            </View>
            <View>
              <Text style={[styles.projectedLabel, { color: colors.textSecondary }]}>
                Differential
              </Text>
              <Text style={[styles.projectedValue, { color: colors.textPrimary }]}>
                {formatHandicapIndex(pair.projectedDifferential)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.combineButton,
              { backgroundColor: colors.primary },
              isCombining && { opacity: 0.5 },
            ]}
            onPress={() => handleCombinePress(pair)}
            disabled={isCombining}
            accessibilityRole="button"
            accessibilityLabel={`Combine front and back 9 at ${pair.courseName}`}
          >
            <Icon source="link-variant" size={16} color={colors.white} />
            <Text style={[styles.combineButtonText, { color: colors.white }]}>
              Combine into 18-hole round
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  courseName: {
    ...typography.bodyBold,
  },
  teeName: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  pieceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  piece: {
    flex: 1,
    alignItems: 'center',
  },
  pieceLabel: {
    ...typography.caption,
    fontSize: 11,
    marginBottom: spacing.xxs,
    textAlign: 'center',
  },
  pieceGross: {
    ...typography.h4,
  },
  projectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    marginBottom: spacing.md,
  },
  projectedLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  projectedValue: {
    ...typography.bodyBold,
    marginTop: spacing.xxs,
  },
  combineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    minHeight: 44,
  },
  combineButtonText: {
    ...typography.bodyBold,
  },
});
