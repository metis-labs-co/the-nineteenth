/**
 * PairsListSection - Main content area with player grid and pairs list
 *
 * Shows the player selection grid for manual pairing and the list of
 * existing pairs with remove functionality.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { IconUsers } from '@tabler/icons-react-native';
import {
  spacing,
  typography,
  layout,
  type ColorPalette,
} from '@/constants/theme';
import { ScoringPairCard } from '../../ScoringPairCard';
import { PlayerSelectionChip } from './PlayerSelectionChip';
import { getPlayerById, groupScoringPairs, getTeamColor } from '../utils';
import type { Player } from '@/types/database.types';
import type { ScoringPairCreateInput } from '@/types';
import type { PairingType } from '../types';

interface PairsListSectionProps {
  players: Player[];
  pairs: ScoringPairCreateInput[];
  pairingType: PairingType;
  selectedPlayer: string | null;
  onPlayerPress: (playerId: string) => void;
  onRemovePair: (scorerId: string, playerId: string) => void;
  /** Optional player-id → team-name map. Drives the small team label
   *  shown under each player's name in the chips and pair cards. */
  teamNameByPlayerId?: Map<string, string>;
  /** Optional player-id → team-slot-index map. Drives the chip/card
   *  tint so team A reads green, team B gold, etc. */
  teamIndexByPlayerId?: Map<string, number>;
  colors: ColorPalette;
}

export const PairsListSection = React.memo(function PairsListSection({
  players,
  pairs,
  pairingType,
  selectedPlayer,
  onPlayerPress,
  onRemovePair,
  teamNameByPlayerId,
  teamIndexByPlayerId,
  colors,
}: PairsListSectionProps) {
  const hasPairs = pairs.length > 0;

  // Collapse reciprocal rows (A→B + B→A) into single logical cards so
  // "8 players reciprocal" renders as 4 pairs, not 8.
  const groupedPairs = React.useMemo(() => groupScoringPairs(pairs), [pairs]);

  // Get header text based on pairing type. Counts match the number of
  // rendered cards — one per logical relationship.
  const getPairsSectionTitle = () => {
    const count = groupedPairs.length;
    switch (pairingType) {
      case 'circular':
        return `Chain Assignments (${count})`;
      case 'reciprocal':
        return `Reciprocal Pairs (${count})`;
      default:
        return `Current Pairs (${count})`;
    }
  };

  const getPairsSectionHint = () => {
    switch (pairingType) {
      case 'circular':
        return 'Each player scores → the next player in the chain';
      case 'reciprocal':
        return 'Each pair scores ↔ each other';
      default:
        return null;
    }
  };

  // Render empty state with full player grid
  if (!hasPairs) {
    return (
      <>
        {/* Player Selection Grid - Full size when no pairs */}
        <View style={styles.playerGridSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Tap to Select Players
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Tap a player to select as scorer, then tap another to assign
          </Text>
          <View style={styles.playerGrid}>
            {players.map((player) => (
              <PlayerSelectionChip
                key={player.id}
                player={player}
                isSelected={selectedPlayer === player.id}
                onPress={() => onPlayerPress(player.id)}
                teamName={teamNameByPlayerId?.get(player.id)}
                teamColor={
                  getTeamColor(teamIndexByPlayerId?.get(player.id), colors) ??
                  undefined
                }
                colors={colors}
              />
            ))}
          </View>
        </View>

        {/* Empty pairs list */}
        <ScrollView style={styles.pairsList} showsVerticalScrollIndicator={false}>
          <View style={styles.noPairsState}>
            <IconUsers size={32} color={colors.textTertiary} />
            <Text style={[styles.noPairsText, { color: colors.textTertiary }]}>
              Tap &quot;Auto-Generate&quot; or select players manually
            </Text>
          </View>
        </ScrollView>
      </>
    );
  }

  // Render pairs with compact player grid
  return (
    <ScrollView style={styles.pairsList} showsVerticalScrollIndicator={false}>
      {/* Compact Player Selection Grid */}
      <View style={styles.playerGridCompact}>
        <Text
          style={[
            styles.sectionTitleSmall,
            { color: colors.textSecondary, marginBottom: spacing.sm },
          ]}
        >
          Add More Pairs
        </Text>
        <View style={styles.playerGrid}>
          {players.map((player) => (
            <PlayerSelectionChip
              key={player.id}
              player={player}
              isSelected={selectedPlayer === player.id}
              isCompact
              onPress={() => onPlayerPress(player.id)}
              teamName={teamNameByPlayerId?.get(player.id)}
              teamColor={
                getTeamColor(teamIndexByPlayerId?.get(player.id), colors) ??
                undefined
              }
              colors={colors}
            />
          ))}
        </View>
      </View>

      <Divider style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

      {/* Current Pairs Header */}
      <View style={styles.pairsSectionHeader}>
        <Text style={[styles.sectionTitleSmall, { color: colors.textSecondary }]}>
          {getPairsSectionTitle()}
        </Text>
        {getPairsSectionHint() && (
          <Text style={[styles.pairsSectionHint, { color: colors.textTertiary }]}>
            {getPairsSectionHint()}
          </Text>
        )}
      </View>

      {/* Pairs List — one card per logical relationship. Reciprocal
          pairs collapse to a single card; circular chain links stay as
          individual directed cards. */}
      {groupedPairs.map((pair, index) => {
        const scorer = getPlayerById(players, pair.scorerId);
        const scoredPlayer = getPlayerById(players, pair.playerId);
        if (!scorer || !scoredPlayer) return null;

        return (
          <View key={`${pair.scorerId}-${pair.playerId}`} style={styles.pairCardWrapper}>
            <ScoringPairCard
              scorerPlayer={{
                id: scorer.id,
                name: scorer.name,
                email: scorer.email || '',
                handicap: scorer.handicap ?? undefined,
                photoUrl: scorer.photo_url ?? undefined,
                createdAt: new Date(scorer.created_at),
                updatedAt: new Date(scorer.updated_at),
              }}
              scoredPlayer={{
                id: scoredPlayer.id,
                name: scoredPlayer.name,
                email: scoredPlayer.email || '',
                handicap: scoredPlayer.handicap ?? undefined,
                photoUrl: scoredPlayer.photo_url ?? undefined,
                createdAt: new Date(scoredPlayer.created_at),
                updatedAt: new Date(scoredPlayer.updated_at),
              }}
              scorerTeamName={teamNameByPlayerId?.get(scorer.id)}
              scoredTeamName={teamNameByPlayerId?.get(scoredPlayer.id)}
              scorerTeamColor={
                getTeamColor(teamIndexByPlayerId?.get(scorer.id), colors) ??
                undefined
              }
              scoredTeamColor={
                getTeamColor(teamIndexByPlayerId?.get(scoredPlayer.id), colors) ??
                undefined
              }
              reciprocal={pair.reciprocal}
              showRemove
              onRemove={() => onRemovePair(pair.scorerId, pair.playerId)}
              testID={`pair-${index}`}
            />
          </View>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  playerGridSection: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.lg,
  },
  playerGridCompact: {
    paddingTop: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  sectionTitleSmall: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    ...typography.small,
    marginBottom: spacing.md,
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pairsList: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
  },
  noPairsState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  noPairsText: {
    ...typography.body,
    textAlign: 'center',
  },
  sectionDivider: {
    marginVertical: spacing.md,
  },
  pairsSectionHeader: {
    marginBottom: spacing.sm,
  },
  pairsSectionHint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  pairCardWrapper: {
    marginBottom: spacing.sm,
  },
});

export default PairsListSection;
