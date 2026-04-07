/**
 * ReviewPlayersSection - Displays players summary in the review step
 *
 * Shows player list with handicaps and guest badges, or
 * an "add later" message when no players have been added yet.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Divider, Chip, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { WizardPlayerData } from '@/store/competitionWizardStore';

export interface ReviewPlayersSectionProps {
  playersData?: WizardPlayerData[];
}

export function ReviewPlayersSection({ playersData }: ReviewPlayersSectionProps) {
  const colors = useThemeColors();
  const hasPlayers = playersData && playersData.length > 0;

  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Players ({hasPlayers ? playersData.length : 0})
        </Text>
        {!hasPlayers && (
          <View style={[styles.statusBadge, { backgroundColor: colors.gray100 }]}>
            <Icon source="clock-outline" size={12} color={colors.gray500} />
            <Text style={[styles.statusText, { color: colors.gray500 }]}>
              Add later
            </Text>
          </View>
        )}
      </View>
      <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

      <View style={styles.itemsContainer}>
        {hasPlayers ? (
          <View style={styles.playersContainer}>
            {playersData.map((player, index) => (
              <View key={player.id} style={styles.playerRow}>
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, { color: colors.textPrimary }]}>
                    {player.name}
                  </Text>
                  {player.handicap !== null && player.handicap !== undefined && (
                    <Text style={[styles.playerHandicap, { color: colors.textSecondary }]}>
                      HC {player.handicap}
                    </Text>
                  )}
                </View>
                {player.is_placeholder && (
                  <Chip
                    mode="flat"
                    style={[styles.guestBadge, { backgroundColor: colors.gray100 }]}
                    textStyle={[styles.guestBadgeText, { color: colors.gray600 }]}
                  >
                    Guest
                  </Chip>
                )}
                {index < playersData.length - 1 && (
                  <Divider
                    style={[styles.playerDivider, { backgroundColor: colors.gray100 }]}
                  />
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.notConfiguredBox, { backgroundColor: colors.gray50 }]}>
            <Icon source="account-plus-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.notConfiguredText, { color: colors.textSecondary }]}>
              Players will be added from the competition details screen after creation
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.bodyBold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '500',
  },
  divider: {
    marginVertical: spacing.md,
  },
  itemsContainer: {
    gap: spacing.md,
  },
  notConfiguredBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  notConfiguredText: {
    ...typography.small,
    flex: 1,
  },
  playersContainer: {
    gap: spacing.xs,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playerName: {
    ...typography.body,
  },
  playerHandicap: {
    ...typography.caption,
  },
  playerDivider: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  guestBadge: {
    height: 24,
  },
  guestBadgeText: {
    ...typography.caption,
  },
});
