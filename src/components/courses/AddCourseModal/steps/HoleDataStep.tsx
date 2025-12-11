/**
 * HoleDataStep - Step 3 of AddCourseModal wizard
 *
 * Collects hole-by-hole data:
 * - Par (3, 4, or 5)
 * - Stroke Index (1-18, unique)
 * - Yardages per tee box
 */

import React from 'react';
import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PAR_OPTIONS, getTeeColorHex, type HoleFormData, type TeeFormData } from '../types';

interface HoleDataStepProps {
  holes: HoleFormData[];
  currentHoleIndex: number;
  tees: TeeFormData[];
  duplicateSiValues: number[];
  onHoleChange: (holeIndex: number, updates: Partial<HoleFormData>) => void;
  onHoleYardageChange: (holeIndex: number, teeId: string, yardage: string) => void;
  onNextHole: () => void;
  onPrevHole: () => void;
  onJumpToHole: (index: number) => void;
}

export const HoleDataStep = React.memo(function HoleDataStep({
  holes,
  currentHoleIndex,
  tees,
  duplicateSiValues,
  onHoleChange,
  onHoleYardageChange,
  onNextHole,
  onPrevHole,
  onJumpToHole,
}: HoleDataStepProps) {
  const colors = useThemeColors();
  const currentHole = holes[currentHoleIndex];
  const isCurrentHoleSiDuplicate = duplicateSiValues.includes(currentHole?.strokeIndex);

  return (
    <View style={styles.step3Container}>
      {/* Hole Progress Dots */}
      <View style={styles.holeDotsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.holeDots}>
            {holes.map((hole, index) => {
              const isActive = index === currentHoleIndex;
              const hasData = hole.par && hole.strokeIndex;
              const hasSiError = duplicateSiValues.includes(hole.strokeIndex);
              return (
                <TouchableOpacity
                  key={hole.number}
                  onPress={() => onJumpToHole(index)}
                  style={[
                    styles.holeDot,
                    { backgroundColor: colors.gray200 },
                    hasData && !hasSiError ? { backgroundColor: colors.success } : null,
                    hasSiError ? { backgroundColor: colors.error } : null,
                    isActive ? { borderWidth: 2, borderColor: colors.primary } : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.holeDotText,
                      { color: hasData ? colors.white : colors.textSecondary },
                    ]}
                  >
                    {hole.number}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Current Hole Display */}
      <ScrollView
        style={styles.holeContentScroll}
        contentContainerStyle={styles.holeContentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hole Number */}
        <View style={styles.holeNumberContainer}>
          <TouchableOpacity
            onPress={onPrevHole}
            disabled={currentHoleIndex === 0}
            style={[styles.holeNavButton, { opacity: currentHoleIndex === 0 ? 0.3 : 1 }]}
          >
            <Icon source="chevron-left" size={32} color={colors.primary} />
          </TouchableOpacity>
          <View style={[styles.holeNumberCircle, { backgroundColor: colors.primary }]}>
            <Text style={[styles.holeNumberText, { color: colors.white }]}>
              {currentHole.number}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onNextHole}
            disabled={currentHoleIndex === 17}
            style={[styles.holeNavButton, { opacity: currentHoleIndex === 17 ? 0.3 : 1 }]}
          >
            <Icon source="chevron-right" size={32} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.holeLabel, { color: colors.textSecondary }]}>
          Hole {currentHole.number} of 18
        </Text>

        {/* Par Selection */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Par *</Text>
          <View style={styles.segmentedControl}>
            {PAR_OPTIONS.map((par) => (
              <TouchableOpacity
                key={par}
                onPress={() => onHoleChange(currentHoleIndex, { par })}
                style={[
                  styles.segmentedButton,
                  { backgroundColor: colors.gray100, borderColor: colors.gray200 },
                  currentHole.par === par && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.segmentedButtonText,
                    { color: colors.textPrimary },
                    currentHole.par === par && { color: colors.white },
                  ]}
                >
                  {par}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stroke Index */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
            Stroke Index (SI) *
          </Text>
          <View style={styles.siContainer}>
            <TouchableOpacity
              onPress={() =>
                onHoleChange(currentHoleIndex, {
                  strokeIndex: Math.max(1, currentHole.strokeIndex - 1),
                })
              }
              style={[styles.siButton, { backgroundColor: colors.gray100 }]}
            >
              <Icon source="minus" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <View
              style={[
                styles.siValueContainer,
                { backgroundColor: colors.gray50 },
                isCurrentHoleSiDuplicate && { borderWidth: 2, borderColor: colors.error },
              ]}
            >
              <Text style={[styles.siValue, { color: colors.textPrimary }]}>
                {currentHole.strokeIndex}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                onHoleChange(currentHoleIndex, {
                  strokeIndex: Math.min(18, currentHole.strokeIndex + 1),
                })
              }
              style={[styles.siButton, { backgroundColor: colors.gray100 }]}
            >
              <Icon source="plus" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          {isCurrentHoleSiDuplicate && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              SI {currentHole.strokeIndex} is used on multiple holes
            </Text>
          )}
        </View>

        {/* Yardages per Tee */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Distance (yards)</Text>
          {tees.map((tee) => (
            <View key={tee.id} style={styles.yardageRow}>
              <View style={styles.yardageTeeInfo}>
                <View
                  style={[styles.teeColorDotSmall, { backgroundColor: getTeeColorHex(tee.color) }]}
                />
                <Text style={[styles.yardageTeeName, { color: colors.textPrimary }]}>
                  {tee.name}
                </Text>
              </View>
              <View style={[styles.yardageInputWrapper, { backgroundColor: colors.gray50 }]}>
                <TextInput
                  style={[styles.yardageInput, { color: colors.textPrimary }]}
                  placeholder="0"
                  placeholderTextColor={colors.gray400}
                  value={currentHole.yardages[tee.id]?.toString() || ''}
                  onChangeText={(text) => onHoleYardageChange(currentHoleIndex, tee.id, text)}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  step3Container: {
    flex: 1,
  },
  holeDotsContainer: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  holeDots: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  holeDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holeDotText: {
    ...typography.smallBold,
  },
  holeContentScroll: {
    flex: 1,
  },
  holeContentContainer: {
    padding: spacing.lg,
  },
  holeNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  holeNavButton: {
    padding: spacing.sm,
  },
  holeNumberCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
  },
  holeNumberText: {
    ...typography.h1,
  },
  holeLabel: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  segmentedButtonText: {
    ...typography.bodyBold,
  },
  siContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  siButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  siValueContainer: {
    flex: 1,
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  siValue: {
    ...typography.h2,
  },
  errorText: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  yardageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  yardageTeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  teeColorDotSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  yardageTeeName: {
    ...typography.body,
  },
  yardageInputWrapper: {
    width: 80,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  yardageInput: {
    ...typography.body,
    textAlign: 'center',
  },
});
