/**
 * TeeSelectionStep - Second step in the create round wizard
 *
 * Features:
 * - Display selected course info
 * - List available tee boxes
 * - Option to skip tee selection
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { IconGolf, IconCheck } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { TeeBox } from '@/types/database.types';
import type { SelectedCourse } from '../types';
import { getTeeColor } from '../types';

interface TeeSelectionStepProps {
  selectedCourse: SelectedCourse;
  selectedTee: TeeBox | null;
  onSelectTee: (tee: TeeBox) => void;
  onSkipTeeSelection: () => void;
}

export const TeeSelectionStep = memo(function TeeSelectionStep({
  selectedCourse,
  selectedTee,
  onSelectTee,
  onSkipTeeSelection,
}: TeeSelectionStepProps) {
  const colors = useThemeColors();

  return (
    <>
      {/* Selected Course Banner */}
      <View style={[styles.selectedBanner, { backgroundColor: colors.primaryLighter }]}>
        <IconGolf size={20} color={colors.primary} />
        <View style={styles.selectedBannerText}>
          <Text style={[styles.selectedBannerName, { color: colors.primaryDark }]}>
            {selectedCourse.courseName}
          </Text>
          {selectedCourse.venue && (
            <Text style={[styles.selectedBannerLocation, { color: colors.primary }]}>
              {selectedCourse.venue.name}
              {(selectedCourse.venue.city || selectedCourse.venue.state) &&
                ` · ${[selectedCourse.venue.city, selectedCourse.venue.state]
                  .filter(Boolean)
                  .join(', ')}`}
            </Text>
          )}
        </View>
      </View>

      {/* Tee List */}
      <View style={styles.listContainer}>
        <Text style={[styles.listTitle, { color: colors.textSecondary }]}>
          Choose your tees
        </Text>
        <FlatList
          data={selectedCourse.tees ?? []}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          renderItem={({ item: tee }) => {
            const isSelected = selectedTee?.name === tee.name && selectedTee?.color === tee.color;
            return (
              <TouchableOpacity
                style={[
                  styles.teeItem,
                  { borderBottomColor: colors.borderLight },
                  isSelected && { backgroundColor: colors.primaryLighter, borderBottomColor: 'transparent' },
                ]}
                onPress={() => onSelectTee(tee)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.teeColorIndicator,
                    { backgroundColor: getTeeColor(tee.color, colors.gray400), borderColor: colors.borderLight },
                  ]}
                />
                <View style={styles.teeInfo}>
                  <Text style={[styles.teeName, { color: colors.textPrimary }]}>
                    {tee.name}
                  </Text>
                  <Text style={[styles.teeDetails, { color: colors.textSecondary }]}>
                    {tee.totalYardage ? `${tee.totalYardage.toLocaleString()} yards` : ''}
                    {tee.courseRating && tee.slopeRating
                      ? ` · CR ${tee.courseRating} / Slope ${tee.slopeRating}`
                      : tee.courseRating
                      ? ` · CR ${tee.courseRating}`
                      : tee.slopeRating
                      ? ` · Slope ${tee.slopeRating}`
                      : ''}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                    <IconCheck size={16} color={colors.white} strokeWidth={2.5} />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>

      {/* Skip Button */}
      <View style={[styles.buttonContainer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.skipButton, { borderColor: colors.border }]}
          onPress={onSkipTeeSelection}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
            Skip tee selection
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
  listContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  listTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  teeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  teeColorIndicator: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    marginRight: spacing.md,
    borderWidth: 2,
  },
  teeInfo: {
    flex: 1,
  },
  teeName: {
    ...typography.bodyBold,
    marginBottom: 2,
  },
  teeDetails: {
    ...typography.caption,
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  skipButtonText: {
    ...typography.body,
  },
});
