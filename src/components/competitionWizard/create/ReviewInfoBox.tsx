/**
 * ReviewInfoBox - "After creation" info box for the review step
 *
 * Shows contextual tips about what the user can do after competition creation.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export interface ReviewInfoBoxProps {
  hasPlayers: boolean;
  enableTeams: boolean;
  hasPrizePool: boolean;
}

export function ReviewInfoBox({ hasPlayers, enableTeams, hasPrizePool }: ReviewInfoBoxProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.infoBox, { backgroundColor: colors.infoLight }]}>
      <Icon source="information" size={20} color={colors.info} />
      <View style={styles.infoContent}>
        <Text style={[styles.infoTitle, { color: colors.info }]}>After creation:</Text>
        <View style={styles.infoList}>
          {!hasPlayers && (
            <Text style={[styles.infoText, { color: colors.info }]}>
              {'\u2022'} Add players from the competition details screen
            </Text>
          )}
          {hasPlayers && (
            <Text style={[styles.infoText, { color: colors.info }]}>
              {'\u2022'} Add more players from the competition details screen
            </Text>
          )}
          <Text style={[styles.infoText, { color: colors.info }]}>
            {'\u2022'} Configure any unconfigured rounds
          </Text>
          <Text style={[styles.infoText, { color: colors.info }]}>
            {'\u2022'} Share the invite code with players to join
          </Text>
          {enableTeams && (
            <Text style={[styles.infoText, { color: colors.info }]}>
              {'\u2022'} Set up team assignments and format
            </Text>
          )}
          {hasPrizePool && (
            <Text style={[styles.infoText, { color: colors.info }]}>
              {'\u2022'} Prize pool will be locked once first round starts
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  infoList: {
    gap: spacing.xs,
  },
  infoText: {
    ...typography.small,
  },
});
