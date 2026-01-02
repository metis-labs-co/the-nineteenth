/**
 * ValidationWarning - Shows validation warnings when pairs are incomplete
 *
 * Displays a warning banner when some players are not covered by scoring pairs.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { IconAlertCircle } from '@tabler/icons-react-native';
import { spacing, typography, type ColorPalette } from '@/constants/theme';

interface ValidationWarningProps {
  missingPlayersCount: number;
  colors: ColorPalette;
}

export const ValidationWarning = React.memo(function ValidationWarning({
  missingPlayersCount,
  colors,
}: ValidationWarningProps) {
  if (missingPlayersCount === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: `${colors.warning}15` }]}>
      <IconAlertCircle size={16} color={colors.warning} />
      <Text style={[styles.text, { color: colors.warning }]}>
        {missingPlayersCount} player{missingPlayersCount !== 1 ? 's' : ''} not being scored
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  text: {
    ...typography.small,
  },
});

export default ValidationWarning;
