/**
 * PlayerGroupCard - Display a single player group with tee time
 *
 * Shows:
 * - Group number and tee time header
 * - List of players with avatars and handicaps
 * - Add/remove player actions
 */

import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { PlayerAvatar } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { formatTeeTimeForDisplay } from '@/utils';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import type { PairingPlayer } from '@/types';
import type { TeeBox } from '@/types/database.types';

export interface PlayerGroupCardProps {
  /**
   * Group number (1-based for display)
   */
  groupNumber: number;
  /**
   * Tee time in HH:MM format
   */
  teeTime: string | null;
  /**
   * Players in this group
   */
  players: PairingPlayer[];
  /**
   * Maximum players allowed in group
   */
  maxPlayers?: number;
  /**
   * Selected tee box for daily handicap calculation
   */
  selectedTee?: TeeBox | null;
  /**
   * Course par for daily handicap calculation
   */
  coursePar?: number;
  /**
   * Callback when add player button is pressed
   */
  onAddPlayer?: () => void;
  /**
   * Callback when a player is removed
   */
  onRemovePlayer?: (playerId: string) => void;
  /**
   * Whether editing is enabled
   */
  editable?: boolean;
  /**
   * Whether the card is expanded
   */
  expanded?: boolean;
  /**
   * Callback when expand/collapse is toggled
   */
  onToggleExpand?: () => void;
  /**
   * Test ID for testing
   */
  testID?: string;
}

export const PlayerGroupCard = React.memo(function PlayerGroupCard({
  groupNumber,
  teeTime,
  players,
  maxPlayers = 4,
  selectedTee,
  coursePar,
  onAddPlayer,
  onRemovePlayer,
  editable = false,
  expanded = true,
  onToggleExpand,
  testID,
}: PlayerGroupCardProps) {
  const colors = useThemeColors();

  const canAddPlayer = players.length < maxPlayers && editable;
  const showWarning = players.length < 2;

  // Calculate daily handicaps for all players when tee info is available
  const playerDailyHandicaps = useMemo(() => {
    if (!selectedTee || !coursePar) return new Map<string, number | null>();

    const dailyHandicaps = new Map<string, number | null>();

    players.forEach((player) => {
      // Use handicapIndex (Social) with handicap (GA) as fallback
      const baseHandicap = player.handicapIndex ?? player.handicap;
      if (baseHandicap === null || baseHandicap === undefined) {
        dailyHandicaps.set(player.id, null);
        return;
      }

      const result = calculateGADailyHandicap({
        gaHandicap: baseHandicap,
        slopeRating: selectedTee.slopeRating ?? 113,
        courseRating: selectedTee.courseRating ?? coursePar,
        par: coursePar,
        gender: player.gender ?? 'male',
      });

      dailyHandicaps.set(player.id, result.dailyHandicap);
    });

    return dailyHandicaps;
  }, [players, selectedTee, coursePar]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: showWarning ? colors.warning : colors.border,
        },
      ]}
      testID={testID}
    >
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={onToggleExpand}
        disabled={!onToggleExpand}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Group ${groupNumber}, ${players.length} players, tee time ${formatTeeTimeForDisplay(teeTime)}`}
      >
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.groupBadge,
              { backgroundColor: colors.primaryBackground },
            ]}
          >
            <Text style={[styles.groupNumber, { color: colors.primary }]}>
              {groupNumber}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.groupTitle, { color: colors.textPrimary }]}>
              Group {groupNumber}
            </Text>
            <Text style={[styles.teeTimeText, { color: colors.textSecondary }]}>
              <Icon source="clock-outline" size={14} color={colors.textSecondary} />
              {' '}{formatTeeTimeForDisplay(teeTime)}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.playerCountBadge,
              {
                backgroundColor: showWarning
                  ? colors.warningBackground
                  : colors.successBackground,
              },
            ]}
          >
            <Icon
              source="account-group"
              size={14}
              color={showWarning ? colors.warning : colors.success}
            />
            <Text
              style={[
                styles.playerCountText,
                { color: showWarning ? colors.warning : colors.success },
              ]}
            >
              {players.length}/{maxPlayers}
            </Text>
          </View>
          {onToggleExpand && (
            <Icon
              source={expanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={colors.textSecondary}
            />
          )}
        </View>
      </TouchableOpacity>

      {/* Players List (when expanded) */}
      {expanded && (
        <View style={styles.playersContainer}>
          {players.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon
                source="account-plus-outline"
                size={32}
                color={colors.textSecondary}
              />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No players assigned
              </Text>
            </View>
          ) : (
            players.map((player) => {
              const dailyHandicap = playerDailyHandicaps.get(player.id);
              const hasHandicap = player.handicap != null || player.handicapIndex != null;

              return (
                <View
                  key={player.id}
                  style={[
                    styles.playerRow,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <PlayerAvatar
                    photoUrl={player.photoUrl}
                    name={player.name}
                    size={40}
                  />
                  <View style={styles.playerInfo}>
                    <Text
                      style={[styles.playerName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {player.name}
                    </Text>
                    {hasHandicap && (
                      <Text
                        style={[styles.handicapText, { color: colors.textSecondary }]}
                      >
                        {dailyHandicap != null
                          ? `DHC: ${dailyHandicap}`
                          : `HC: ${player.handicapIndex ?? player.handicap}`}
                      </Text>
                    )}
                  </View>
                  {editable && onRemovePlayer && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => onRemovePlayer(player.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${player.name} from group`}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon source="close" size={20} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}

          {/* Add Player Button */}
          {canAddPlayer && onAddPlayer && (
            <TouchableOpacity
              style={[
                styles.addPlayerButton,
                { borderColor: colors.primary },
              ]}
              onPress={onAddPlayer}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Add player to this group"
            >
              <Icon source="plus" size={20} color={colors.primary} />
              <Text style={[styles.addPlayerText, { color: colors.primary }]}>
                Add Player
              </Text>
            </TouchableOpacity>
          )}

          {/* Warning for small groups */}
          {showWarning && players.length > 0 && (
            <View
              style={[
                styles.warningBanner,
                { backgroundColor: colors.warningBackground },
              ]}
            >
              <Icon source="alert-circle-outline" size={16} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Groups need at least 2 players
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupBadge: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupNumber: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  headerInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  groupTitle: {
    ...typography.bodyBold,
  },
  teeTimeText: {
    ...typography.caption,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  playerCountText: {
    ...typography.caption,
    fontWeight: '600',
  },
  playersContainer: {
    padding: spacing.md,
    paddingTop: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    marginTop: spacing.sm,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  playerName: {
    ...typography.body,
    fontWeight: '500',
  },
  handicapText: {
    ...typography.caption,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  addPlayerText: {
    ...typography.body,
    fontWeight: '500',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  warningText: {
    ...typography.caption,
    flex: 1,
  },
});

export default PlayerGroupCard;
