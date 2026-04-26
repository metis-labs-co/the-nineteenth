/**
 * PlayersSection - Displays players participating in a round
 *
 * Shows a list of players with their handicaps and scorecard status.
 * Useful for visualizing who's in the round and debugging player data issues.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { Badge, GolfBallLoader } from '@/components/common';
import { useRoundPlayers } from '@/hooks/useRoundDetails';
import type { PlayersSectionProps } from '../types';

export function PlayersSection({ roundId, cardBackground, currentUserId }: PlayersSectionProps) {
  const colors = useThemeColors();
  const { data: players, isLoading } = useRoundPlayers(roundId);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Players
        </Text>
        {players && players.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: colors.primaryLighter }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>
              {players.length}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: cardBackground, borderColor: colors.border }]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <GolfBallLoader size="sm" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading players...
            </Text>
          </View>
        ) : !players || players.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon source="account-group-outline" size={32} color={colors.gray400} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No players in this round yet
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
              Players are added when pairings are created or when scoring begins
            </Text>
          </View>
        ) : (
          <View style={styles.playersList}>
            {players.map((player, index) => (
              <View
                key={player.id}
                style={[
                  styles.playerRow,
                  { borderBottomColor: colors.border },
                  index === players.length - 1 && styles.lastRow,
                ]}
              >
                <View style={[styles.playerAvatar, { backgroundColor: colors.primaryLighter }]}>
                  <Text style={[styles.playerInitial, { color: colors.primary }]}>
                    {player.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.playerInfo}>
                  <View style={styles.playerNameRow}>
                    <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {player.name}
                    </Text>
                    {player.id === currentUserId && (
                      <Badge label="You" variant="primary" size="sm" />
                    )}
                  </View>
                  {player.handicap !== null && player.handicap !== undefined && (
                    <Text style={[styles.playerHandicap, { color: colors.textSecondary }]}>
                      HCP {player.handicap}
                    </Text>
                  )}
                </View>
                {player.has_scorecard && (
                  <View style={[styles.scorecardBadge, { backgroundColor: colors.successLight }]}>
                    <Icon source="check" size={14} color={colors.success} />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  countText: {
    ...typography.captionBold,
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

  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
  emptyHint: {
    ...typography.small,
    textAlign: 'center',
  },

  playersList: {},
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInitial: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  playerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  playerName: {
    ...typography.bodyBold,
    flexShrink: 1,
  },
  playerHandicap: {
    ...typography.small,
    marginTop: 2,
  },
  scorecardBadge: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PlayersSection;
