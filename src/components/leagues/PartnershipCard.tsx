/**
 * PartnershipCard - Displays two player avatars, names, and partnership status
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';

interface PartnershipCardProps {
  player1Name: string;
  player1PhotoUrl: string | null;
  player2Name: string;
  player2PhotoUrl: string | null;
  partnershipName: string | null;
  status?: 'active' | 'dissolved';
}

export const PartnershipCard = React.memo(function PartnershipCard({
  player1Name,
  player1PhotoUrl,
  player2Name,
  player2PhotoUrl,
  partnershipName,
  status = 'active',
}: PartnershipCardProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: status === 'active' ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={styles.avatarsRow}>
        <PlayerAvatar
          name={player1Name}
          photoUrl={player1PhotoUrl}
          size={40}
        />
        <View style={[styles.linkIcon, { backgroundColor: colors.primaryBackground }]}>
          <Icon source="handshake" size={16} color={colors.primary} />
        </View>
        <PlayerAvatar
          name={player2Name}
          photoUrl={player2PhotoUrl}
          size={40}
        />
      </View>

      <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
        {partnershipName ?? `${player1Name} & ${player2Name}`}
      </Text>

      {status === 'dissolved' && (
        <Text style={[styles.dissolved, { color: colors.textSecondary }]}>
          Dissolved
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -6,
    zIndex: 1,
  },
  name: {
    ...typography.bodyBold,
    textAlign: 'center',
  },
  dissolved: {
    ...typography.small,
  },
});

export default PartnershipCard;
