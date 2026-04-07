/**
 * WolfOrderList - Reorderable player list for Wolf rotation order
 *
 * Displays the wolf rotation order with:
 * - Numbered hole indicators (first wolf highlighted)
 * - Player names with "First Wolf" badge
 * - Up/down reorder buttons per player
 * - Shuffle button in header
 */

import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, wolfColor } from '@/constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface WolfOrderListProps {
  /** Ordered array of player IDs */
  wolfOrder: string[];
  /** Function to resolve player ID to display name */
  getParticipantName: (id: string) => string;
  /** Move player up in order */
  onMoveUp: (index: number) => void;
  /** Move player down in order */
  onMoveDown: (index: number) => void;
  /** Shuffle the entire order */
  onShuffle: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const WolfOrderList = memo(function WolfOrderList({
  wolfOrder,
  getParticipantName,
  onMoveUp,
  onMoveDown,
  onShuffle,
}: WolfOrderListProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          WOLF ROTATION ORDER
        </Text>
        <TouchableOpacity
          onPress={onShuffle}
          style={[styles.shuffleButton, { backgroundColor: `${wolfColor}15` }]}
          activeOpacity={0.7}
          testID="wolf-shuffle-button"
        >
          <Icon source="shuffle-variant" size={16} color={wolfColor} />
          <Text style={[styles.shuffleText, { color: wolfColor }]}>Shuffle</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.orderDescription, { color: colors.textSecondary }]}>
        The Wolf rotates each hole. Hole 1 Wolf is shown first.
      </Text>

      <View style={[styles.orderList, { borderColor: colors.border }]}>
        {wolfOrder.map((playerId, index) => (
          <View
            key={playerId}
            style={[
              styles.orderItem,
              index < wolfOrder.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
            ]}
          >
            {/* Hole indicator */}
            <View
              style={[
                styles.holeIndicator,
                { backgroundColor: index === 0 ? wolfColor : colors.surfaceVariant },
              ]}
            >
              <Text
                style={[
                  styles.holeNumber,
                  { color: index === 0 ? colors.white : colors.textSecondary },
                ]}
              >
                {index + 1}
              </Text>
            </View>

            {/* Player name */}
            <View style={styles.playerInfo}>
              <Text style={[styles.playerName, { color: colors.textPrimary }]}>
                {getParticipantName(playerId)}
              </Text>
              {index === 0 && (
                <Text style={[styles.firstWolfBadge, { color: wolfColor }]}>
                  First Wolf
                </Text>
              )}
            </View>

            {/* Up/Down buttons */}
            <View style={styles.orderButtons}>
              <TouchableOpacity
                onPress={() => onMoveUp(index)}
                disabled={index === 0}
                style={[
                  styles.orderButton,
                  { backgroundColor: colors.surfaceVariant },
                  index === 0 && styles.orderButtonDisabled,
                ]}
                activeOpacity={0.7}
                testID={`wolf-order-up-${index}`}
              >
                <Icon
                  source="chevron-up"
                  size={20}
                  color={index === 0 ? colors.textDisabled : colors.textPrimary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onMoveDown(index)}
                disabled={index === wolfOrder.length - 1}
                style={[
                  styles.orderButton,
                  { backgroundColor: colors.surfaceVariant },
                  index === wolfOrder.length - 1 && styles.orderButtonDisabled,
                ]}
                activeOpacity={0.7}
                testID={`wolf-order-down-${index}`}
              >
                <Icon
                  source="chevron-down"
                  size={20}
                  color={index === wolfOrder.length - 1 ? colors.textDisabled : colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  shuffleText: {
    ...typography.caption,
  },
  orderDescription: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  orderList: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  holeIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  holeNumber: {
    ...typography.smallBold,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    ...typography.body,
  },
  firstWolfBadge: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  orderButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  orderButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderButtonDisabled: {
    opacity: 0.4,
  },
});
