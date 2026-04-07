/**
 * SkinsGameSection - Displays skins game info on round details
 *
 * For scheduled/in-progress rounds:
 * - Shows pot configuration (per hole/total value)
 * - Shows scoring type (gross/net)
 * - Shows number of participants
 *
 * For completed rounds:
 * - Shows player winnings summary
 * - Winner with most winnings at top
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { GolfBallLoader } from '@/components/common';
import { useSkinsGameState } from './useSkinsGameState';
import { SkinsUnconfiguredState } from './SkinsUnconfiguredState';
import { SkinsCompletedView } from './SkinsCompletedView';
import { SkinsConfigView } from './SkinsConfigView';
import type { RoundStatus } from '@/types/database/enums';

// ============================================================================
// TYPES
// ============================================================================

export interface SkinsGameSectionProps {
  /** Round ID to fetch skins data for */
  roundId: string;
  /** Current status of the round */
  roundStatus: RoundStatus;
  /** Background color for cards */
  cardBackground: string;
  /** Callback when edit is pressed (only works when round is upcoming) */
  onEditPress?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SkinsGameSection({
  roundId,
  roundStatus,
  cardBackground,
  onEditPress,
}: SkinsGameSectionProps) {
  const colors = useThemeColors();

  // Card is only editable when round is upcoming (scheduled)
  const isEditable = roundStatus === 'upcoming' && !!onEditPress;

  const {
    skinsGame,
    skinsResults,
    sortedPayouts,
    isLoading,
    showPayoutsView,
    perHoleValue,
    totalPot,
    scoringTypeLabel,
    potTypeLabel,
  } = useSkinsGameState({ roundId, roundStatus });

  // Check if we should show unconfigured state
  const showUnconfiguredState = !isLoading && !skinsGame && roundStatus === 'upcoming' && !!onEditPress;

  // No skins game for this round and not showing unconfigured
  if (!isLoading && !skinsGame && !showUnconfiguredState) {
    return null;
  }

  // Wrap in TouchableOpacity if editable or unconfigured (both should be tappable)
  const isTappable = isEditable || showUnconfiguredState;
  const CardWrapper = isTappable ? TouchableOpacity : View;
  const cardWrapperProps = isTappable
    ? {
        onPress: onEditPress,
        activeOpacity: 0.7,
        accessibilityLabel: showUnconfiguredState ? 'Configure skins game' : 'Edit skins game',
        accessibilityRole: 'button' as const,
      }
    : {};

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Skins Game
        </Text>
        {isEditable && (
          <Icon source="pencil" size={18} color={colors.textSecondary} />
        )}
      </View>

      <CardWrapper
        style={[styles.card, { backgroundColor: cardBackground, borderColor: colors.border }]}
        {...cardWrapperProps}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <GolfBallLoader size="sm" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading skins data...
            </Text>
          </View>
        ) : showUnconfiguredState ? (
          <SkinsUnconfiguredState />
        ) : showPayoutsView ? (
          <SkinsCompletedView
            perHoleValue={perHoleValue}
            totalPot={totalPot}
            scoringTypeLabel={scoringTypeLabel}
            sortedPayouts={sortedPayouts}
            skinsResults={skinsResults}
          />
        ) : skinsGame ? (
          <SkinsConfigView
            skinsGame={skinsGame}
            roundStatus={roundStatus}
            potTypeLabel={potTypeLabel}
            scoringTypeLabel={scoringTypeLabel}
            totalPot={totalPot}
          />
        ) : null}
      </CardWrapper>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.small,
  },
});

export default SkinsGameSection;
