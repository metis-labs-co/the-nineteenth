/**
 * SelectedPlayersSection - Displays selected players as chips with limit indicators
 *
 * Shows:
 * - Section header with optional "Ready" badge
 * - Optional limit indicator with progress bar
 * - Warning boxes for approaching/at limit
 * - Horizontal scroll of selected player chips
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { LimitIndicator } from '@/components/subscription/LimitIndicator';
import { SelectedPlayerChip } from './SelectedPlayerChip';
import type { SelectedPlayer, LimitIndicatorConfig } from './FriendSelector.types';

// ============================================================================
// TYPES
// ============================================================================

export interface SelectedPlayersSectionProps {
  /** Currently selected players */
  selectedPlayers: SelectedPlayer[];
  /** Title shown above selected players */
  selectedTitle: string;
  /** Whether to show the "Ready" badge */
  showReadyBadge: boolean;
  /** Whether minimum requirement is met */
  meetsMinimum: boolean;
  /** Whether selection is at limit */
  isAtLimit: boolean;
  /** Whether selection is approaching limit */
  isApproachingLimit: boolean;
  /** Effective maximum number of players */
  effectiveMax: number;
  /** Limit indicator configuration */
  limitIndicator?: LimitIndicatorConfig;
  /** Current user info */
  currentUser?: { id: string; name: string; photo_url?: string | null };
  /** Called when a player chip is removed */
  onRemove: (playerId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const SelectedPlayersSection = React.memo(function SelectedPlayersSection({
  selectedPlayers,
  selectedTitle,
  showReadyBadge,
  meetsMinimum,
  isAtLimit,
  isApproachingLimit,
  effectiveMax,
  limitIndicator,
  currentUser,
  onRemove,
}: SelectedPlayersSectionProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {selectedTitle}
        </Text>
        {showReadyBadge && meetsMinimum && !isAtLimit && (
          <View style={[styles.readyBadge, { backgroundColor: colors.successLight }]}>
            <Icon source="check-circle" size={16} color={colors.success} />
            <Text style={[styles.readyText, { color: colors.success }]}>Ready</Text>
          </View>
        )}
      </View>

      {/* Limit Indicator */}
      {limitIndicator?.show && effectiveMax !== Infinity && (
        <View style={styles.limitIndicatorContainer}>
          <LimitIndicator
            current={selectedPlayers.length}
            max={effectiveMax}
            label={limitIndicator.label || 'Selected'}
            showBar={limitIndicator.showBar}
          />
        </View>
      )}

      {/* Warning when approaching limit */}
      {isApproachingLimit && (
        <View style={[styles.warningBox, { backgroundColor: colors.warningLight }]}>
          <Icon source="alert-circle-outline" size={18} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warning }]}>
            Approaching limit ({selectedPlayers.length}/{effectiveMax})
          </Text>
        </View>
      )}

      {/* Warning at limit */}
      {isAtLimit && effectiveMax !== Infinity && (
        <View style={[styles.warningBox, { backgroundColor: colors.errorLight }]}>
          <Icon source="alert-circle" size={18} color={colors.error} />
          <Text style={[styles.warningText, { color: colors.error }]}>
            Limit reached. Upgrade to add more.
          </Text>
        </View>
      )}

      {/* Selected Players Chips */}
      <View style={[styles.selectedContainer, { backgroundColor: colors.surface }]}>
        {selectedPlayers.length === 0 ? (
          <Text style={[styles.emptySelection, { color: colors.textSecondary }]}>
            No players selected yet
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedScroll}
          >
            {selectedPlayers.map((player) => (
              <SelectedPlayerChip
                key={player.id}
                player={player}
                isCurrentUser={currentUser?.id === player.id}
                onRemove={() => onRemove(player.id)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.lg,
  },
  readyText: {
    ...typography.captionBold,
  },
  limitIndicatorContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  warningText: {
    ...typography.small,
    flex: 1,
  },
  selectedContainer: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    minHeight: 56,
    justifyContent: 'center',
  },
  emptySelection: {
    ...typography.body,
    textAlign: 'center',
  },
  selectedScroll: {
    gap: spacing.sm,
  },
});
