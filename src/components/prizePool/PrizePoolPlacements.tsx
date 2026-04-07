/**
 * PrizePoolPlacements - Prize distribution configuration UI
 *
 * Displays:
 * - Distribution header with percentage badge
 * - Placement rows with position, amount, and percent input
 * - Add placement button
 * - Validation messages for allocation errors
 */

import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import {
  IconInfoCircle,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, featureColors } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import {
  getOrdinal,
  type PlacementEntry,
  type PrizePoolCalculations,
} from './usePrizePoolConfig';

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIZE_POOL_COLOR = featureColors.prizePool;

// ============================================================================
// TYPES
// ============================================================================

export interface PrizePoolPlacementsProps {
  /** Current placement entries */
  placements: PlacementEntry[];
  /** Calculated values */
  calculations: PrizePoolCalculations;
  /** Maximum number of placements allowed */
  maxPlacements: number;
  /** Whether inputs are disabled */
  isDisabled: boolean;
  /** Handler for placement percent changes */
  onPlacementPercentChange: (index: number) => (text: string) => void;
  /** Handler for adding a placement */
  onAddPlacement: () => void;
  /** Handler for removing a placement */
  onRemovePlacement: (index: number) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const PrizePoolPlacements = memo(function PrizePoolPlacements({
  placements,
  calculations,
  maxPlacements,
  isDisabled,
  onPlacementPercentChange,
  onAddPlacement,
  onRemovePlacement,
}: PrizePoolPlacementsProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.configSection}>
      <View style={styles.distributionHeader}>
        <Text style={[styles.configSectionTitle, { color: colors.textPrimary }]}>
          Prize Distribution
        </Text>
        <View
          style={[
            styles.percentBadge,
            {
              backgroundColor: calculations.isValidAllocation
                ? `${PRIZE_POOL_COLOR}20`
                : `${colors.error}20`,
            },
          ]}
        >
          <Text
            style={[
              styles.percentBadgeText,
              {
                color: calculations.isValidAllocation
                  ? PRIZE_POOL_COLOR
                  : colors.error,
              },
            ]}
          >
            {calculations.totalPercent}%
          </Text>
        </View>
      </View>
      <Text style={[styles.configSectionDescription, { color: colors.textSecondary }]}>
        How the prize pool will be split among top finishers
      </Text>

      {/* Placement Rows */}
      {placements.map((placement, index) => (
        <PlacementRow
          key={placement.position}
          position={placement.position}
          percent={placement.percent}
          amount={(calculations.totalPool * placement.percent) / 100}
          onPercentChange={onPlacementPercentChange(index)}
          onRemove={() => onRemovePlacement(index)}
          canRemove={placements.length > 1}
          disabled={isDisabled}
          colors={colors}
        />
      ))}

      {/* Add Placement Button */}
      {placements.length < maxPlacements && !isDisabled && (
        <TouchableOpacity
          style={[styles.addPlacementButton, { borderColor: `${PRIZE_POOL_COLOR}40` }]}
          onPress={onAddPlacement}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add placement"
        >
          <IconPlus size={16} color={PRIZE_POOL_COLOR} />
          <Text style={[styles.addPlacementText, { color: PRIZE_POOL_COLOR }]}>
            Add Placement
          </Text>
        </TouchableOpacity>
      )}

      {/* Validation Message */}
      {!calculations.isValidAllocation && (
        <View style={[styles.errorBox, { backgroundColor: colors.errorLight }]}>
          <IconInfoCircle size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {calculations.totalPercent > 100
              ? 'Percentages cannot exceed 100%'
              : 'Percentages must add up to exactly 100%'}
          </Text>
        </View>
      )}
    </View>
  );
});

// ============================================================================
// PLACEMENT ROW SUB-COMPONENT
// ============================================================================

interface PlacementRowProps {
  position: number;
  percent: number;
  amount: number;
  onPercentChange: (text: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled: boolean;
  colors: ReturnType<typeof useThemeColors>;
}

const PlacementRow = memo(function PlacementRow({
  position,
  percent,
  amount,
  onPercentChange,
  onRemove,
  canRemove,
  disabled,
  colors,
}: PlacementRowProps) {
  return (
    <View style={styles.placementRow}>
      <View style={styles.placementInfo}>
        <View style={[styles.positionBadge, { backgroundColor: `${PRIZE_POOL_COLOR}15` }]}>
          <Text style={[styles.positionText, { color: PRIZE_POOL_COLOR }]}>
            {getOrdinal(position)}
          </Text>
        </View>
        <Text style={[styles.placementAmount, { color: colors.textSecondary }]}>
          ${amount.toFixed(2)}
        </Text>
      </View>
      <View style={styles.placementActions}>
        <View style={styles.placementInputContainer}>
          <TextInput
            mode="outlined"
            value={percent.toString()}
            onChangeText={onPercentChange}
            keyboardType="number-pad"
            disabled={disabled}
            right={<TextInput.Affix text="%" />}
            style={[styles.placementInput, { backgroundColor: colors.surface }]}
            outlineColor={colors.border}
            activeOutlineColor={PRIZE_POOL_COLOR}
            dense
          />
        </View>
        {canRemove && !disabled && (
          <TouchableOpacity
            onPress={onRemove}
            style={styles.removeButton}
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${getOrdinal(position)} place`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconTrash size={18} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  configSection: {
    gap: spacing.sm,
  },
  configSectionTitle: {
    ...typography.smallBold,
  },
  configSectionDescription: {
    ...typography.caption,
  },
  distributionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  percentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  percentBadgeText: {
    ...typography.captionBold,
  },
  placementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  placementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  positionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 40,
    alignItems: 'center',
  },
  positionText: {
    ...typography.smallBold,
  },
  placementAmount: {
    ...typography.caption,
  },
  placementActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  placementInputContainer: {
    width: 80,
  },
  placementInput: {
    height: 40,
    fontSize: 14,
  },
  removeButton: {
    padding: spacing.xs,
  },
  addPlacementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  addPlacementText: {
    ...typography.small,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.small,
    flex: 1,
  },
});
