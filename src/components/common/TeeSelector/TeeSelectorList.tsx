/**
 * TeeSelectorList - Full-screen list variant with FlatList
 *
 * Used in TeeSelectionStep within CreateRoundBottomSheet.
 * Includes optional course banner and skip button.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { IconGolf, IconCheck } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTeeSelector } from './hooks/useTeeSelector';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import { getFirstName } from '@/utils/displayHelpers';
import type { TeeSelectorListProps, TeePreviewPlayer } from './types';
import type { TeeBox } from '@/types/database.types';

// ===========================================================================
// COMPONENT
// ===========================================================================

export const TeeSelectorList = memo(function TeeSelectorList({
  tees,
  selectedTee,
  onSelectTee,
  showBanner = true,
  courseInfo,
  onSkip,
  testID,
  players,
  coursePar,
}: TeeSelectorListProps) {
  const colors = useThemeColors();
  const {
    isSelected,
    handleSelect,
    formatDistance,
    getTeeColor,
    getListAccessibilityLabel,
  } = useTeeSelector({ selectedTee, onSelectTee });

  // Calculate daily handicap previews for all players when a tee is selected
  const handicapPreviews = useMemo(() => {
    if (!players || !coursePar || players.length === 0) return null;

    // Find the actual selected tee object
    const selectedTeeObj = typeof selectedTee === 'string'
      ? tees.find(t => t.name === selectedTee)
      : selectedTee;

    if (!selectedTeeObj?.slopeRating || !selectedTeeObj?.courseRating) return null;

    return players.map(player => {
      const baseHC = player.handicap ?? 0;
      const result = calculateGADailyHandicap({
        gaHandicap: baseHC,
        slopeRating: selectedTeeObj.slopeRating!,
        courseRating: selectedTeeObj.courseRating!,
        par: coursePar,
        gender: player.gender,
      });
      return {
        id: player.id,
        name: getFirstName(player.name),
        baseHC,
        dailyHC: result.dailyHandicap,
      };
    });
  }, [players, coursePar, selectedTee, tees]);

  // Render individual tee item
  const renderTeeItem = useCallback(
    ({ item: tee, index }: { item: TeeBox; index: number }) => {
      const selected = isSelected(tee);
      return (
        <TouchableOpacity
          style={[
            styles.listItem,
            { borderBottomColor: colors.borderLight },
            selected && {
              backgroundColor: colors.primaryLighter,
              borderBottomColor: 'transparent',
            },
          ]}
          onPress={() => handleSelect(tee)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={getListAccessibilityLabel(tee)}
          testID={testID ? `${testID}-list-item-${index}` : undefined}
        >
          <View
            style={[
              styles.colorIndicator,
              {
                backgroundColor: getTeeColor(tee.color, colors.textDisabled),
                borderColor: colors.borderLight,
              },
            ]}
          />
          <View style={styles.teeInfo}>
            <Text style={[styles.teeName, { color: colors.textPrimary }]}>
              {tee.name}
            </Text>
            <Text style={[styles.teeDetails, { color: colors.textSecondary }]}>
              {tee.totalYardage ? formatDistance(tee.totalYardage) : ''}
              {tee.courseRating && tee.slopeRating
                ? ` · CR ${tee.courseRating} / Slope ${tee.slopeRating}`
                : tee.courseRating
                  ? ` · CR ${tee.courseRating}`
                  : tee.slopeRating
                    ? ` · Slope ${tee.slopeRating}`
                    : ''}
            </Text>
          </View>
          {selected && (
            <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
              <IconCheck size={16} color={colors.white} strokeWidth={2.5} />
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [
      colors,
      isSelected,
      handleSelect,
      formatDistance,
      getTeeColor,
      getListAccessibilityLabel,
      testID,
    ]
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback(
    (item: TeeBox, index: number) => `${item.name}-${index}`,
    []
  );

  return (
    <View style={styles.container} testID={testID}>
      {/* Course Banner */}
      {showBanner && courseInfo && (
        <View
          style={[styles.banner, { backgroundColor: colors.primaryLighter }]}
          testID={testID ? `${testID}-banner` : undefined}
        >
          <IconGolf size={20} color={colors.primary} />
          <View style={styles.bannerText}>
            <Text style={[styles.bannerName, { color: colors.primaryDark }]}>
              {courseInfo.courseName}
            </Text>
            {courseInfo.venue && (
              <Text style={[styles.bannerLocation, { color: colors.primary }]}>
                {courseInfo.venue.name}
                {(courseInfo.venue.city || courseInfo.venue.state) &&
                  ` · ${[courseInfo.venue.city, courseInfo.venue.state]
                    .filter(Boolean)
                    .join(', ')}`}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Tee List */}
      <View style={styles.listWrapper}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          Choose your tees
        </Text>
        <FlatList
          data={tees}
          keyExtractor={keyExtractor}
          renderItem={renderTeeItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>

      {/* Daily Handicap Preview */}
      {handicapPreviews && handicapPreviews.length > 0 && (
        <View style={[styles.previewContainer, { backgroundColor: colors.surfaceVariant, borderTopColor: colors.border }]}>
          <View style={styles.previewHeader}>
            <Icon source="golf" size={16} color={colors.primary} />
            <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>
              Daily Handicaps
            </Text>
          </View>
          <View style={styles.previewList}>
            {handicapPreviews.slice(0, 6).map((preview) => (
              <View key={preview.id} style={styles.previewItem}>
                <Text style={[styles.previewName, { color: colors.textSecondary }]} numberOfLines={1}>
                  {preview.name}
                </Text>
                <Text style={[styles.previewValue, { color: colors.textPrimary }]}>
                  <Text style={{ color: colors.textTertiary }}>HC {preview.baseHC}</Text>
                  <Text style={{ color: colors.textTertiary }}> → </Text>
                  <Text style={[styles.previewDHC, { color: colors.primary }]}>DHC {preview.dailyHC}</Text>
                </Text>
              </View>
            ))}
            {handicapPreviews.length > 6 && (
              <Text style={[styles.previewMore, { color: colors.textTertiary }]}>
                +{handicapPreviews.length - 6} more players
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Skip Button */}
      {onSkip && (
        <View style={[styles.skipContainer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.skipButton, { borderColor: colors.border }]}
            onPress={onSkip}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Skip tee selection"
            testID={testID ? `${testID}-skip` : undefined}
          >
            <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
              Skip tee selection
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

// ===========================================================================
// STYLES
// ===========================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  bannerText: {
    flex: 1,
  },
  bannerName: {
    ...typography.bodyBold,
  },
  bannerLocation: {
    ...typography.caption,
  },
  // List
  listWrapper: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  colorIndicator: {
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
  // Preview
  previewContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderTopWidth: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  previewTitle: {
    ...typography.smallBold,
  },
  previewList: {
    gap: spacing.xs,
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewName: {
    ...typography.small,
    flex: 1,
    marginRight: spacing.sm,
  },
  previewValue: {
    ...typography.small,
  },
  previewDHC: {
    ...typography.smallBold,
  },
  previewMore: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  // Skip
  skipContainer: {
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

export default TeeSelectorList;
