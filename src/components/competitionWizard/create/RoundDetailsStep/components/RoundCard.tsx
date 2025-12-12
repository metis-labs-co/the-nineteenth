/**
 * RoundCard - Individual round card with course, date, tee, and match type fields
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, Text, IconButton, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { DatePicker } from '@/components/common/DatePicker';
import { TEE_COLORS, GAME_TYPE_LABELS, type RoundCardProps } from '../types';

export const RoundCard = React.memo(function RoundCard({
  round,
  index,
  errors,
  isRemovable,
  availableTees,
  isPremium,
  onUpdate,
  onRemove,
  onOpenCourseModal,
  onOpenTeeModal,
  onOpenMatchTypeModal,
}: RoundCardProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[styles.roundCard, { backgroundColor: colors.surface }]}
    >
      {/* Round Header */}
      <View style={[styles.roundHeader, { borderBottomColor: colors.gray200 }]}>
        <Text style={[styles.roundTitle, { color: colors.primary }]}>Round {index + 1}</Text>
        {isRemovable && (
          <IconButton
            icon="close"
            size={20}
            onPress={onRemove}
            iconColor={colors.gray400}
            style={styles.removeButton}
          />
        )}
      </View>

      {/* Course Selection */}
      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Course *</Text>
        <TouchableOpacity onPress={onOpenCourseModal} activeOpacity={0.7}>
          <TextInput
            placeholder="Select a course"
            value={round.courseName || ''}
            mode="outlined"
            error={!!errors.course}
            editable={false}
            pointerEvents="none"
            style={[styles.input, { backgroundColor: colors.surface }]}
            outlineColor={errors.course ? colors.error : colors.gray300}
            activeOutlineColor={errors.course ? colors.error : colors.primary}
            textColor={colors.textPrimary}
            right={
              <TextInput.Icon
                icon="chevron-down"
                onPress={onOpenCourseModal}
                color={colors.primary}
              />
            }
          />
        </TouchableOpacity>
        {errors.course ? (
          <Text style={[styles.errorText, { color: colors.error }]}>{errors.course}</Text>
        ) : (
          <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
            Tap to select from your saved courses
          </Text>
        )}
      </View>

      {/* Tee Selection - Only show if course has tees */}
      {round.courseId && availableTees.length > 0 && (
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Playing Tees</Text>
          <TouchableOpacity onPress={onOpenTeeModal} activeOpacity={0.7}>
            <View
              style={[
                styles.teeSelector,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.gray300,
                },
              ]}
            >
              {round.selectedTee ? (
                <View style={styles.selectedTeeDisplay}>
                  <View
                    style={[
                      styles.teeColorDot,
                      {
                        backgroundColor:
                          TEE_COLORS[round.selectedTee.color.toLowerCase()] || colors.gray400,
                        borderColor:
                          round.selectedTee.color.toLowerCase() === 'white'
                            ? colors.gray300
                            : 'transparent',
                        borderWidth: round.selectedTee.color.toLowerCase() === 'white' ? 1 : 0,
                      },
                    ]}
                  />
                  <Text style={[styles.selectedTeeName, { color: colors.textPrimary }]}>
                    {round.selectedTee.name}
                  </Text>
                  {round.selectedTee.totalYardage && (
                    <Text style={[styles.selectedTeeYardage, { color: colors.textSecondary }]}>
                      ({round.selectedTee.totalYardage.toLocaleString()} yds)
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={[styles.teePlaceholder, { color: colors.textTertiary }]}>
                  Select tees (optional)
                </Text>
              )}
              <Icon source="chevron-down" size={20} color={colors.primary} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
            Select which tees players will use for handicap calculations
          </Text>
        </View>
      )}

      {/* Round Date */}
      <DatePicker
        value={round.date}
        onChange={(value) => onUpdate({ date: value })}
        mode="date"
        label="Round Date *"
        placeholder="Select a date"
        error={errors.date}
        hint={errors.date ? undefined : 'Tap to select the round date'}
        minimumDate={new Date()}
      />

      {/* Tee Time */}
      <DatePicker
        value={round.teeTime || ''}
        onChange={(value) => onUpdate({ teeTime: value })}
        mode="time"
        label="Tee Time (Optional)"
        placeholder="Select a time"
        hint="Tap to select the tee time"
        showClear={!!round.teeTime}
      />

      {/* Match Type Selection */}
      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Match Type</Text>
        <TouchableOpacity onPress={onOpenMatchTypeModal} activeOpacity={0.7}>
          <TextInput
            value={GAME_TYPE_LABELS[round.matchType || 'stableford']}
            mode="outlined"
            editable={false}
            pointerEvents="none"
            style={[styles.input, { backgroundColor: colors.surface }]}
            outlineColor={colors.gray300}
            activeOutlineColor={colors.primary}
            textColor={colors.textPrimary}
            right={
              <TextInput.Icon
                icon="chevron-down"
                onPress={onOpenMatchTypeModal}
                color={colors.primary}
              />
            }
          />
        </TouchableOpacity>
        <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
          Select the scoring format for this round
        </Text>
      </View>

      {/* Scoring Pairs Toggle */}
      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Scoring Pairs</Text>
        {isPremium ? (
          <TouchableOpacity
            onPress={() => onUpdate({ scoringPairsRequired: !round.scoringPairsRequired })}
            style={[
              styles.scoringPairsToggle,
              {
                backgroundColor: colors.surface,
                borderColor: round.scoringPairsRequired ? colors.primary : colors.gray300,
              },
            ]}
            activeOpacity={0.7}
          >
            <View style={styles.scoringPairsToggleContent}>
              <Icon
                source="swap-horizontal"
                size={20}
                color={round.scoringPairsRequired ? colors.primary : colors.gray400}
              />
              <View style={styles.scoringPairsToggleText}>
                <Text style={[styles.scoringPairsToggleLabel, { color: colors.textPrimary }]}>
                  Require Scoring Pairs
                </Text>
                <Text
                  style={[styles.scoringPairsToggleDescription, { color: colors.textSecondary }]}
                >
                  Assign designated markers for this round
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: round.scoringPairsRequired ? colors.primary : colors.surface,
                  borderColor: round.scoringPairsRequired ? colors.primary : colors.gray300,
                },
              ]}
            >
              {round.scoringPairsRequired && <Icon source="check" size={14} color={colors.white} />}
            </View>
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.scoringPairsToggle,
              styles.scoringPairsToggleLocked,
              { backgroundColor: colors.gray100, borderColor: colors.gray200 },
            ]}
          >
            <View style={styles.scoringPairsToggleContent}>
              <Icon source="lock" size={20} color={colors.gray500} />
              <View style={styles.scoringPairsToggleText}>
                <View style={styles.scoringPairsLabelRow}>
                  <Text style={[styles.scoringPairsToggleLabel, { color: colors.textSecondary }]}>
                    Require Scoring Pairs
                  </Text>
                  <View style={[styles.premiumBadge, { backgroundColor: colors.warning }]}>
                    <Text style={[styles.premiumBadgeText, { color: colors.textOnColored }]}>Premium</Text>
                  </View>
                </View>
                <Text
                  style={[styles.scoringPairsToggleDescription, { color: colors.textTertiary }]}
                >
                  Upgrade to Premium to use this feature
                </Text>
              </View>
            </View>
          </View>
        )}
        <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
          When enabled, you can configure who scores whom after creating the competition
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  roundCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  roundTitle: {
    ...typography.bodyBold,
  },
  removeButton: {
    margin: 0,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  input: {},
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  fieldHint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  teeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  selectedTeeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  teeColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  selectedTeeName: {
    ...typography.body,
  },
  selectedTeeYardage: {
    ...typography.small,
  },
  teePlaceholder: {
    ...typography.body,
  },
  scoringPairsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  scoringPairsToggleLocked: {
    opacity: 0.8,
  },
  scoringPairsToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  scoringPairsToggleText: {
    flex: 1,
  },
  scoringPairsToggleLabel: {
    ...typography.bodyBold,
  },
  scoringPairsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoringPairsToggleDescription: {
    ...typography.small,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  premiumBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
