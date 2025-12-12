/**
 * PairingTypeBadge - Visual badge showing the pairing type with appropriate styling
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import {
  IconRotateClockwise,
  IconArrowsExchange,
  IconArrowsRight,
} from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, type ColorPalette } from '@/constants/theme';
import type { PairingType } from '../types';

interface PairingTypeBadgeProps {
  type: PairingType;
  colors: ColorPalette;
}

export const PairingTypeBadge = React.memo(function PairingTypeBadge({
  type,
  colors,
}: PairingTypeBadgeProps) {
  if (type === 'none') return null;

  const isCircular = type === 'circular';
  const badgeColor = isCircular ? colors.info : colors.primary;
  const badgeBackground = isCircular ? `${colors.info}15` : `${colors.primary}15`;

  const getLabel = () => {
    switch (type) {
      case 'circular':
        return 'Circular Chain';
      case 'reciprocal':
        return 'Reciprocal Pairs';
      case 'cross-team':
        return 'Cross-Team';
      case 'manual':
        return 'Manual';
      default:
        return null;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'circular':
        return <IconRotateClockwise size={12} color={badgeColor} />;
      case 'reciprocal':
        return <IconArrowsExchange size={12} color={badgeColor} />;
      case 'cross-team':
        return <IconArrowsRight size={12} color={badgeColor} />;
      default:
        return null;
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: badgeBackground, borderColor: badgeColor },
      ]}
    >
      {getIcon()}
      <Text style={[styles.label, { color: badgeColor }]}>{getLabel()}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});

export default PairingTypeBadge;
