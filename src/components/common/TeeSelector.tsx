/**
 * TeeSelector - Unified tee box selection component
 *
 * Provides three variants:
 * - pills: Horizontal scrollable chips (for CourseDetailScreen)
 * - cards: Grid layout with CR/Slope info (for EditRoundScreen)
 * - list: Full-screen FlatList with banner (for TeeSelectionStep in CreateRoundBottomSheet)
 */

import React, { memo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { IconGolf, IconCheck } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useFormattedDistance } from '@/store/settingsStore';
import type { TeeBox, Venue } from '@/types/database.types';

// ===========================================================================
// TYPES
// ===========================================================================

export type TeeSelectorVariant = 'pills' | 'cards' | 'list';

/**
 * Course info for list variant banner
 */
export interface TeeSelectorCourseInfo {
  courseName: string;
  venue?: Venue | null;
}

/**
 * TeeSelector Props
 */
export interface TeeSelectorProps {
  /** Available tee boxes */
  tees: TeeBox[];
  /** Currently selected tee (by name for pills, full object for cards/list) */
  selectedTee: TeeBox | string | null;
  /** Callback when a tee is selected */
  onSelectTee: (tee: TeeBox) => void;
  /** Visual variant */
  variant?: TeeSelectorVariant;
  /** Whether to show yardage in pills variant (default: false) */
  showYardage?: boolean;
  /** Whether to show course banner in list variant (default: true) */
  showBanner?: boolean;
  /** Course info for list variant banner */
  courseInfo?: TeeSelectorCourseInfo;
  /** Callback for skip button in list variant */
  onSkip?: () => void;
  /** Whether the selector is disabled (for cards variant) */
  disabled?: boolean;
  /** Label shown above pills variant */
  label?: string;
  /** Test ID for testing */
  testID?: string;
}

// ===========================================================================
// UTILITY FUNCTIONS
// ===========================================================================

/**
 * Map tee color names to actual colors
 */
export const getTeeColor = (color: string, fallbackColor: string): string => {
  const colorMap: Record<string, string> = {
    black: '#1a1a1a',
    blue: '#2563eb',
    white: '#f5f5f5',
    gold: '#eab308',
    yellow: '#facc15',
    red: '#dc2626',
    green: '#16a34a',
    silver: '#9ca3af',
    orange: '#ea580c',
  };
  return colorMap[color?.toLowerCase()] ?? fallbackColor;
};

/**
 * Check if a tee is selected
 */
const isTeeSelected = (
  tee: TeeBox,
  selectedTee: TeeBox | string | null
): boolean => {
  if (!selectedTee) return false;
  if (typeof selectedTee === 'string') {
    return tee.name === selectedTee;
  }
  return tee.name === selectedTee.name && tee.color === selectedTee.color;
};

// ===========================================================================
// PILLS VARIANT
// ===========================================================================

interface PillsVariantProps {
  tees: TeeBox[];
  selectedTee: TeeBox | string | null;
  onSelectTee: (tee: TeeBox) => void;
  showYardage?: boolean;
  label?: string;
  testID?: string;
}

const PillsVariant = memo(function PillsVariant({
  tees,
  selectedTee,
  onSelectTee,
  showYardage = false,
  label = 'Select Tee:',
  testID,
}: PillsVariantProps) {
  const colors = useThemeColors();
  const { formatDistance } = useFormattedDistance();

  if (tees.length === 0) return null;

  return (
    <View style={styles.pillsContainer} testID={testID}>
      <Text style={[styles.pillsLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsScrollContent}
      >
        {tees.map((tee, index) => {
          const isSelected = isTeeSelected(tee, selectedTee);
          return (
            <TouchableOpacity
              key={`${tee.name}-${index}`}
              style={[
                styles.pillChip,
                { borderColor: colors.border },
                isSelected && {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => onSelectTee(tee)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${tee.name} tee${
                showYardage && tee.totalYardage
                  ? `, ${formatDistance(tee.totalYardage)}`
                  : ''
              }`}
              testID={testID ? `${testID}-pill-${index}` : undefined}
            >
              <View
                style={[
                  styles.pillColorDot,
                  { backgroundColor: getTeeColor(tee.color, colors.gray400) },
                ]}
              />
              <Text
                style={[
                  styles.pillChipText,
                  { color: isSelected ? colors.white : colors.textPrimary },
                ]}
              >
                {tee.name}
              </Text>
              {showYardage && tee.totalYardage && (
                <Text
                  style={[
                    styles.pillYardageText,
                    { color: isSelected ? colors.white : colors.textSecondary },
                  ]}
                >
                  {formatDistance(tee.totalYardage)}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

// ===========================================================================
// CARDS VARIANT
// ===========================================================================

interface CardsVariantProps {
  tees: TeeBox[];
  selectedTee: TeeBox | string | null;
  onSelectTee: (tee: TeeBox) => void;
  disabled?: boolean;
  testID?: string;
}

const CardsVariant = memo(function CardsVariant({
  tees,
  selectedTee,
  onSelectTee,
  disabled,
  testID,
}: CardsVariantProps) {
  const colors = useThemeColors();

  if (tees.length === 0) {
    return (
      <View
        style={[styles.emptyTees, { backgroundColor: colors.gray100 }]}
        testID={testID}
      >
        <Icon source="golf-tee" size={24} color={colors.gray400} />
        <Text style={[styles.emptyTeesText, { color: colors.textSecondary }]}>
          No tees configured for this course
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.cardsGrid} testID={testID}>
      {tees.map((tee, index) => {
        const isSelected = isTeeSelected(tee, selectedTee);
        return (
          <TouchableOpacity
            key={`${tee.name}-${index}`}
            style={[
              styles.cardItem,
              {
                backgroundColor: isSelected
                  ? colors.primaryLighter
                  : colors.gray100,
                borderColor: isSelected ? colors.primary : colors.gray200,
              },
            ]}
            onPress={() => onSelectTee(tee)}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${tee.name} tee${
              tee.courseRating ? `, course rating ${tee.courseRating}` : ''
            }`}
            testID={testID ? `${testID}-card-${index}` : undefined}
          >
            <View
              style={[
                styles.cardColorIndicator,
                { backgroundColor: getTeeColor(tee.color, colors.gray400) },
              ]}
            />
            <Text
              style={[
                styles.cardTeeName,
                { color: isSelected ? colors.primary : colors.textPrimary },
              ]}
            >
              {tee.name}
            </Text>
            {tee.courseRating && (
              <Text style={[styles.cardTeeRating, { color: colors.textSecondary }]}>
                CR: {tee.courseRating}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

// ===========================================================================
// LIST VARIANT
// ===========================================================================

interface ListVariantProps {
  tees: TeeBox[];
  selectedTee: TeeBox | string | null;
  onSelectTee: (tee: TeeBox) => void;
  showBanner?: boolean;
  courseInfo?: TeeSelectorCourseInfo;
  onSkip?: () => void;
  testID?: string;
}

const ListVariant = memo(function ListVariant({
  tees,
  selectedTee,
  onSelectTee,
  showBanner = true,
  courseInfo,
  onSkip,
  testID,
}: ListVariantProps) {
  const colors = useThemeColors();
  const { formatDistance } = useFormattedDistance();

  const renderTeeItem = ({ item: tee, index }: { item: TeeBox; index: number }) => {
    const isSelected = isTeeSelected(tee, selectedTee);
    return (
      <TouchableOpacity
        style={[
          styles.listItem,
          { borderBottomColor: colors.borderLight },
          isSelected && {
            backgroundColor: colors.primaryLighter,
            borderBottomColor: 'transparent',
          },
        ]}
        onPress={() => onSelectTee(tee)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${tee.name} tee${
          tee.totalYardage ? `, ${formatDistance(tee.totalYardage)}` : ''
        }${tee.courseRating ? `, course rating ${tee.courseRating}` : ''}${
          tee.slopeRating ? `, slope ${tee.slopeRating}` : ''
        }`}
        testID={testID ? `${testID}-list-item-${index}` : undefined}
      >
        <View
          style={[
            styles.listColorIndicator,
            {
              backgroundColor: getTeeColor(tee.color, colors.gray400),
              borderColor: colors.borderLight,
            },
          ]}
        />
        <View style={styles.listTeeInfo}>
          <Text style={[styles.listTeeName, { color: colors.textPrimary }]}>
            {tee.name}
          </Text>
          <Text style={[styles.listTeeDetails, { color: colors.textSecondary }]}>
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
        {isSelected && (
          <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
            <IconCheck size={16} color={colors.white} strokeWidth={2.5} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.listContainer} testID={testID}>
      {/* Course Banner */}
      {showBanner && courseInfo && (
        <View
          style={[styles.courseBanner, { backgroundColor: colors.primaryLighter }]}
          testID={testID ? `${testID}-banner` : undefined}
        >
          <IconGolf size={20} color={colors.primary} />
          <View style={styles.courseBannerText}>
            <Text style={[styles.courseBannerName, { color: colors.primaryDark }]}>
              {courseInfo.courseName}
            </Text>
            {courseInfo.venue && (
              <Text style={[styles.courseBannerLocation, { color: colors.primary }]}>
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
        <Text style={[styles.listTitle, { color: colors.textSecondary }]}>
          Choose your tees
        </Text>
        <FlatList
          data={tees}
          keyExtractor={(item, index) => `${item.name}-${index}`}
          renderItem={renderTeeItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>

      {/* Skip Button */}
      {onSkip && (
        <View style={[styles.skipButtonContainer, { borderTopColor: colors.border }]}>
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
// MAIN COMPONENT
// ===========================================================================

export const TeeSelector = memo(function TeeSelector({
  tees,
  selectedTee,
  onSelectTee,
  variant = 'pills',
  showYardage = false,
  showBanner = true,
  courseInfo,
  onSkip,
  disabled = false,
  label,
  testID,
}: TeeSelectorProps) {
  switch (variant) {
    case 'pills':
      return (
        <PillsVariant
          tees={tees}
          selectedTee={selectedTee}
          onSelectTee={onSelectTee}
          showYardage={showYardage}
          label={label}
          testID={testID}
        />
      );
    case 'cards':
      return (
        <CardsVariant
          tees={tees}
          selectedTee={selectedTee}
          onSelectTee={onSelectTee}
          disabled={disabled}
          testID={testID}
        />
      );
    case 'list':
      return (
        <ListVariant
          tees={tees}
          selectedTee={selectedTee}
          onSelectTee={onSelectTee}
          showBanner={showBanner}
          courseInfo={courseInfo}
          onSkip={onSkip}
          testID={testID}
        />
      );
    default:
      return null;
  }
});

// ===========================================================================
// STYLES
// ===========================================================================

const styles = StyleSheet.create({
  // =========================================================================
  // PILLS VARIANT
  // =========================================================================
  pillsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  pillsLabel: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  pillsScrollContent: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  pillColorDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  pillChipText: {
    ...typography.small,
  },
  pillYardageText: {
    ...typography.caption,
  },

  // =========================================================================
  // CARDS VARIANT
  // =========================================================================
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  cardColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardTeeName: {
    ...typography.smallBold,
  },
  cardTeeRating: {
    ...typography.caption,
  },
  emptyTees: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  emptyTeesText: {
    ...typography.small,
    flex: 1,
  },

  // =========================================================================
  // LIST VARIANT
  // =========================================================================
  listContainer: {
    flex: 1,
  },
  courseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  courseBannerText: {
    flex: 1,
  },
  courseBannerName: {
    ...typography.bodyBold,
  },
  courseBannerLocation: {
    ...typography.caption,
  },
  listWrapper: {
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
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  listColorIndicator: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    marginRight: spacing.md,
    borderWidth: 2,
  },
  listTeeInfo: {
    flex: 1,
  },
  listTeeName: {
    ...typography.bodyBold,
    marginBottom: 2,
  },
  listTeeDetails: {
    ...typography.caption,
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonContainer: {
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

export default TeeSelector;
