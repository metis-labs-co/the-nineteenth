/**
 * BallCountStep - Ball count selection for solo practice rounds
 *
 * Features:
 * - Display selected course/tee/match type info
 * - Select number of balls to score per hole (1-4)
 * - Multi-ball (2-4) requires Social tier or higher
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconGolf, IconCircle, IconCircleCheck } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { TeeBox, GameType } from '@/types/database.types';
import type { BallCount } from '@/types/multiball.types';
import { BALL_COUNT_OPTIONS } from '@/types/multiball.types';
import type { SelectedCourse } from '../types';
import { MATCH_TYPES } from '../types';

interface BallCountStepProps {
  selectedCourse: SelectedCourse | null;
  selectedTee: TeeBox | null;
  selectedMatchType: GameType;
  ballCount: BallCount;
  onBallCountChange: (ballCount: BallCount) => void;
  onStartRound: () => void;
}

export const BallCountStep = memo(function BallCountStep({
  selectedCourse,
  selectedTee,
  selectedMatchType,
  ballCount,
  onBallCountChange,
  onStartRound,
}: BallCountStepProps) {
  const colors = useThemeColors();

  return (
    <>
      {/* Selected Course & Match Type Banner */}
      <View style={[styles.selectedBanner, { backgroundColor: colors.primaryLighter }]}>
        <IconGolf size={20} color={colors.primary} />
        <View style={styles.selectedBannerText}>
          <Text style={[styles.selectedBannerName, { color: colors.primaryDark }]}>
            {selectedCourse?.courseName}
            {selectedTee && (
              <Text style={{ color: colors.primary }}> · {selectedTee.name}</Text>
            )}
          </Text>
          <Text style={[styles.selectedBannerLocation, { color: colors.primary }]}>
            {selectedCourse?.venue && (
              <>
                {selectedCourse.venue.name}
                {(selectedCourse.venue.city || selectedCourse.venue.state) &&
                  ` · ${[selectedCourse.venue.city, selectedCourse.venue.state]
                    .filter(Boolean)
                    .join(', ')}`}
                {' · '}
              </>
            )}
            {MATCH_TYPES.find((m) => m.value === selectedMatchType)?.label}
          </Text>
        </View>
      </View>

      {/* Ball Count Selection */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          How many balls per hole?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Multi-ball scoring is great for practice rounds
        </Text>

        <View style={styles.optionsList}>
          {BALL_COUNT_OPTIONS.map((option) => {
            const isSelected = ballCount === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  {
                    backgroundColor: isSelected ? colors.primaryLighter : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => onBallCountChange(option.value)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  {isSelected ? (
                    <IconCircleCheck size={24} color={colors.primary} />
                  ) : (
                    <IconCircle size={24} color={colors.textSecondary} />
                  )}
                  <View style={styles.optionText}>
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: isSelected ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                      {option.description}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Start Round Button */}
      <View
        style={[styles.buttonContainer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}
      >
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: colors.primary }]}
          onPress={onStartRound}
          activeOpacity={0.8}
        >
          <Text style={[styles.startButtonText, { color: colors.white }]}>
            Start Solo Round
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  selectedBannerText: {
    flex: 1,
  },
  selectedBannerName: {
    ...typography.bodyBold,
  },
  selectedBannerLocation: {
    ...typography.caption,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionItem: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ...typography.bodyBold,
  },
  optionDescription: {
    ...typography.caption,
    marginTop: 2,
  },
  buttonContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  startButtonText: {
    ...typography.bodyBold,
  },
});
