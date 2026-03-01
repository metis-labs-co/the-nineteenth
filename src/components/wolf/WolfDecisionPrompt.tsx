/**
 * WolfDecisionPrompt - Prompt card for Wolf partner selection
 *
 * Displayed in the scorecard content area when Wolf game is active.
 * Shows who is Wolf for the current hole and prompts for decision.
 *
 * States:
 * - Pending: Wolf hasn't made a decision yet - shows "Choose Partner" button
 * - Decided: Wolf has chosen - shows decision summary (partner name or Lone/Blind Wolf)
 * - Calculated: Hole result is in - shows winner with points
 *
 * @example
 * ```tsx
 * <WolfDecisionPrompt
 *   wolfGame={wolfGame}
 *   currentHole={5}
 *   currentDecision={decision}
 *   onChoosePartner={() => setShowWolfModal(true)}
 *   isProcessing={isProcessing}
 * />
 * ```
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows, wolfColor } from '@/constants/theme';
import { determineWolfForHole } from '@/utils/wolfCalculations';
import type { WolfGameWithParticipants, WolfHoleDecision } from '@/types/database/wolf.types';

// ============================================================================
// TYPES
// ============================================================================

export interface WolfDecisionPromptProps {
  /** Wolf game with participant details */
  wolfGame: WolfGameWithParticipants;
  /** Current hole number (1-18) */
  currentHole: number;
  /** Current hole's decision (if any) */
  currentDecision: WolfHoleDecision | null | undefined;
  /** Callback when "Choose Partner" is pressed */
  onChoosePartner: () => void;
  /** Whether a Wolf action is currently processing */
  isProcessing?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WolfDecisionPrompt({
  wolfGame,
  currentHole,
  currentDecision,
  onChoosePartner,
  isProcessing = false,
  testID,
}: WolfDecisionPromptProps) {
  const colors = useThemeColors();

  // Determine who is Wolf for this hole
  const wolfPlayer = useMemo(() => {
    if (!wolfGame?.wolf_order) return null;
    const wolfId = determineWolfForHole(wolfGame.wolf_order, currentHole);
    return wolfGame.participants.find((p) => p.id === wolfId) ?? null;
  }, [wolfGame, currentHole]);

  // Get partner name if one was selected
  const partnerName = useMemo(() => {
    if (!currentDecision?.partner_id) return null;
    const partner = wolfGame.participants.find((p) => p.id === currentDecision.partner_id);
    return partner?.name ?? 'Unknown';
  }, [currentDecision, wolfGame.participants]);

  // Determine the decision status
  const hasDecision = !!currentDecision?.decided_at;
  const hasResult = !!currentDecision?.calculated_at;
  const isBlindWolf = currentDecision?.is_blind_wolf ?? false;
  const isLoneWolf = hasDecision && !currentDecision?.partner_id && !isBlindWolf;

  // Get result description
  const getResultText = (): string | null => {
    if (!hasResult || !currentDecision) return null;
    if (currentDecision.is_tie) return 'Hole pushed (tie)';
    if (currentDecision.wolf_team_won) return 'Wolf wins!';
    return 'Pack wins!';
  };

  // Get result color
  const getResultColor = (): string => {
    if (!hasResult || !currentDecision) return colors.textSecondary;
    if (currentDecision.is_tie) return colors.gray500;
    if (currentDecision.wolf_team_won) return colors.success;
    return colors.error;
  };

  // Get decision description
  const getDecisionText = (): string => {
    if (isBlindWolf) return 'Blind Wolf 🔥';
    if (isLoneWolf) return 'Lone Wolf';
    if (partnerName) return `+ ${partnerName}`;
    return '';
  };

  // Points display for pot games
  const getPointsDisplay = (): string | null => {
    if (!hasResult || !currentDecision?.points_awarded) return null;
    if (!wolfPlayer) return null;

    const wolfPoints = currentDecision.points_awarded[wolfPlayer.id];
    if (wolfPoints === undefined || wolfPoints === 0) return null;

    if (wolfGame.pot_enabled && wolfGame.pot_value_per_point) {
      const value = wolfPoints * wolfGame.pot_value_per_point;
      return `+${wolfPoints}pts ($${value.toFixed(2)})`;
    }
    return `+${wolfPoints}pts`;
  };

  if (!wolfPlayer) {
    return null;
  }

  // Render based on state
  if (hasResult) {
    // Result state - show outcome
    const resultText = getResultText();
    const pointsDisplay = getPointsDisplay();
    return (
      <View
        style={[
          styles.container,
          styles.resultContainer,
          {
            backgroundColor: `${getResultColor()}10`,
            borderColor: getResultColor(),
          },
        ]}
        testID={testID}
      >
        <View style={styles.row}>
          <View style={[styles.iconContainer, { backgroundColor: `${wolfColor}15` }]}>
            <Icon source="dog-side" size={20} color={wolfColor} />
          </View>
          <View style={styles.textContent}>
            <Text style={[styles.wolfName, { color: colors.textPrimary }]}>
              {wolfPlayer.name}
              <Text style={[styles.decisionText, { color: colors.textSecondary }]}>
                {' '}{getDecisionText()}
              </Text>
            </Text>
            <View style={styles.resultRow}>
              <Text style={[styles.resultText, { color: getResultColor() }]}>
                {resultText}
              </Text>
              {pointsDisplay && (
                <Text style={[styles.pointsText, { color: colors.success }]}>
                  {pointsDisplay}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (hasDecision) {
    // Decision made but not yet calculated - show decision summary
    return (
      <TouchableOpacity
        style={[
          styles.container,
          styles.decidedContainer,
          {
            backgroundColor: `${wolfColor}10`,
            borderColor: `${wolfColor}40`,
          },
        ]}
        onPress={onChoosePartner}
        activeOpacity={0.7}
        disabled={isProcessing}
        accessibilityRole="button"
        accessibilityLabel={`${wolfPlayer.name} is Wolf - ${getDecisionText()}. Tap to change.`}
        testID={testID}
      >
        <View style={styles.row}>
          <View style={[styles.iconContainer, { backgroundColor: `${wolfColor}20` }]}>
            <Icon source="dog-side" size={20} color={wolfColor} />
          </View>
          <View style={styles.textContent}>
            <Text style={[styles.wolfName, { color: wolfColor }]}>
              {wolfPlayer.name} is Wolf
            </Text>
            <Text style={[styles.decisionSummary, { color: colors.textSecondary }]}>
              {getDecisionText()}
              <Text style={styles.tapToChange}> • Tap to change</Text>
            </Text>
          </View>
          {isBlindWolf && (
            <View style={[styles.blindBadge, { backgroundColor: colors.warning }]}>
              <Text style={styles.blindBadgeText}>🔥</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Pending state - show choose partner prompt
  return (
    <TouchableOpacity
      style={[
        styles.container,
        styles.pendingContainer,
        {
          backgroundColor: colors.surface,
          borderColor: wolfColor,
        },
        shadows.sm,
      ]}
      onPress={onChoosePartner}
      activeOpacity={0.7}
      disabled={isProcessing}
      accessibilityRole="button"
      accessibilityLabel={`${wolfPlayer.name} is Wolf. Tap to choose a partner.`}
      testID={testID}
    >
      <View style={styles.row}>
        <View style={[styles.iconContainer, styles.pendingIcon, { backgroundColor: `${wolfColor}15` }]}>
          <Icon source="dog-side" size={24} color={wolfColor} />
        </View>
        <View style={styles.textContent}>
          <Text style={[styles.wolfName, styles.pendingName, { color: colors.textPrimary }]}>
            {wolfPlayer.name} is Wolf
          </Text>
          <Text style={[styles.promptText, { color: wolfColor }]}>
            Tap to choose a partner
          </Text>
        </View>
        <View style={[styles.arrowContainer, { backgroundColor: wolfColor }]}>
          <Icon source="chevron-right" size={20} color={colors.white} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  pendingContainer: {
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  decidedContainer: {
    borderWidth: 1,
  },
  resultContainer: {
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingIcon: {
    width: 48,
    height: 48,
  },
  textContent: {
    flex: 1,
  },
  wolfName: {
    ...typography.bodyBold,
  },
  pendingName: {
    ...typography.h4,
  },
  decisionText: {
    ...typography.body,
    fontWeight: '400',
  },
  decisionSummary: {
    ...typography.small,
    marginTop: 2,
  },
  tapToChange: {
    fontStyle: 'italic',
  },
  promptText: {
    ...typography.smallBold,
    marginTop: 2,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  resultText: {
    ...typography.smallBold,
  },
  pointsText: {
    ...typography.small,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blindBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blindBadgeText: {
    fontSize: 14,
  },
});

export default WolfDecisionPrompt;
