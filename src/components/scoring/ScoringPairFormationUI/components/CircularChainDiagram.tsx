/**
 * CircularChainDiagram - Visual representation of the circular scoring chain
 *
 * Shows the flow: A → B → C → ... → A with player names/avatars
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { PlayerAvatar } from '@/components/common';
import {
  IconArrowRight,
  IconRotateClockwise,
  IconInfoCircle,
} from '@tabler/icons-react-native';
import {
  spacing,
  typography,
  borderRadius,
  layout,
  type ColorPalette,
} from '@/constants/theme';
import type { Player } from '@/types/database.types';
import type { ScoringPairCreateInput } from '@/types';
import { buildCircularChainOrder } from '../utils';

interface CircularChainDiagramProps {
  pairs: ScoringPairCreateInput[];
  players: Player[];
  colors: ColorPalette;
}

export const CircularChainDiagram = React.memo(function CircularChainDiagram({
  pairs,
  players,
  colors,
}: CircularChainDiagramProps) {
  const chainOrder = useMemo(
    () => buildCircularChainOrder(pairs, players),
    [pairs, players]
  );

  if (chainOrder.length === 0) return null;

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {/* Header with icon */}
      <View style={styles.header}>
        <View style={styles.iconWrapper}>
          <IconRotateClockwise size={18} color={colors.info} />
        </View>
        <Text style={styles.title}>Circular Chain Flow</Text>
      </View>

      {/* Chain visualization */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chainScroll}
      >
        {chainOrder.map((player, index) => (
          <View key={player.id} style={styles.chainItem}>
            {/* Player chip */}
            <View style={styles.playerChip}>
              <PlayerAvatar
                photoUrl={player.photo_url}
                name={player.name}
                size={28}
                style={styles.avatar}
              />
              <Text
                style={styles.playerName}
                numberOfLines={1}
              >
                {player.name.split(' ')[0]}
              </Text>
            </View>

            {/* Arrow to next (including wrap-around arrow for last item) */}
            <View style={styles.arrowWrapper}>
              <IconArrowRight
                size={16}
                color={index === chainOrder.length - 1 ? colors.info : colors.textTertiary}
              />
              {index === chainOrder.length - 1 && (
                <Text style={styles.wrapLabel}>
                  (back to {chainOrder[0]?.name.split(' ')[0]})
                </Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Help text */}
      <View style={styles.helpContainer}>
        <IconInfoCircle size={14} color={colors.textTertiary} />
        <Text style={styles.helpText}>
          With an odd number of players, each player scores one person and is scored by
          another, forming a continuous chain.
        </Text>
      </View>
    </View>
  );
});

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      marginHorizontal: layout.screenPadding,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: `${colors.info}10`,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: `${colors.info}30`,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    iconWrapper: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: `${colors.info}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...typography.smallBold,
      color: colors.info,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    chainScroll: {
      paddingVertical: spacing.sm,
    },
    chainItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    playerChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatar: {
      marginRight: 0,
    },
    playerName: {
      ...typography.caption,
      color: colors.textPrimary,
      fontWeight: '600',
      maxWidth: 60,
    },
    arrowWrapper: {
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
    },
    wrapLabel: {
      ...typography.caption,
      color: colors.info,
      fontSize: 9,
      marginTop: 2,
    },
    helpContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: `${colors.info}20`,
    },
    helpText: {
      ...typography.caption,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
  });

export default CircularChainDiagram;
