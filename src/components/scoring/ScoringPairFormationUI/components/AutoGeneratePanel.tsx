/**
 * AutoGeneratePanel - Header section with title and auto-generate buttons
 *
 * Shows the pairing type badge, player count, and buttons for auto-generating
 * pairs (both standard and cross-team for team match play).
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { GolfBallLoader } from '@/components/common';
import { IconWand, IconArrowsExchange } from '@tabler/icons-react-native';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
  layout,
  type ColorPalette,
} from '@/constants/theme';
import { PairingTypeBadge } from './PairingTypeBadge';
import type { PairingType } from '../types';

interface AutoGeneratePanelProps {
  pairingType: PairingType;
  playersCount: number;
  pairsCount: number;
  isTeamMatchPlay: boolean;
  hasTeams: boolean;
  isGenerating: boolean;
  onAutoGenerate: () => void;
  onCrossTeamPair: () => void;
  colors: ColorPalette;
}

export const AutoGeneratePanel = React.memo(function AutoGeneratePanel({
  pairingType,
  playersCount,
  pairsCount,
  isTeamMatchPlay,
  hasTeams,
  isGenerating,
  onAutoGenerate,
  onCrossTeamPair,
  colors,
}: AutoGeneratePanelProps) {
  const showCrossTeamButton = isTeamMatchPlay && hasTeams;
  const autoGenerateHint =
    playersCount % 2 === 0
      ? 'Creates reciprocal pairs where players score each other'
      : 'Creates circular pairs where each player scores the next';

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Scoring Pairs
          </Text>
          <PairingTypeBadge type={pairingType} colors={colors} />
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {playersCount} player{playersCount !== 1 ? 's' : ''}
          {pairsCount > 0 && ` • ${pairsCount} pair${pairsCount !== 1 ? 's' : ''}`}
        </Text>
      </View>

      <View style={styles.buttons}>
        {/* Cross-Team Button (only for team match play) */}
        {showCrossTeamButton && (
          <TouchableOpacity
            style={[
              styles.crossTeamButton,
              { backgroundColor: colors.primaryDark },
              isGenerating && styles.buttonDisabled,
            ]}
            onPress={onCrossTeamPair}
            disabled={isGenerating}
            accessibilityRole="button"
            accessibilityLabel="Generate cross-team pairs"
            accessibilityHint="Players from opposing teams will score each other"
          >
            <IconArrowsExchange size={18} color={colors.textInverse} />
            <Text style={[styles.buttonText, { color: colors.textInverse }]}>
              Cross-Team
            </Text>
          </TouchableOpacity>
        )}

        {/* Auto-Generate Button */}
        <TouchableOpacity
          style={[
            styles.autoGenerateButton,
            { backgroundColor: colors.primary },
            isGenerating && styles.buttonDisabled,
          ]}
          onPress={onAutoGenerate}
          disabled={isGenerating}
          accessibilityRole="button"
          accessibilityLabel="Auto-generate scoring pairs"
          accessibilityHint={autoGenerateHint}
        >
          {isGenerating ? (
            <GolfBallLoader size="sm" />
          ) : (
            <IconWand size={20} color={colors.textInverse} />
          )}
          <Text style={[styles.buttonText, { color: colors.textInverse }]}>
            {isGenerating ? 'Generating...' : 'Auto-Generate'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.lg,
  },
  left: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  title: {
    ...typography.h3,
  },
  subtitle: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  autoGenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    minHeight: 40,
    ...shadows.sm,
  },
  crossTeamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    minHeight: 40,
    ...shadows.sm,
  },
  buttonText: {
    ...typography.smallBold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default AutoGeneratePanel;
