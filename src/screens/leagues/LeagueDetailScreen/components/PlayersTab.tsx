/**
 * PlayersTab - List of league players with creator badge, expandable stats, and leave button
 */

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { EmptyState } from '@/components/common/EmptyState';
import { PlayerCard } from '@/components/social/PlayerCard';
import { ExpandablePlayerCard, type ExpandablePlayerCardStats } from '@/components/social/ExpandablePlayerCard';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { League, LeagueLeaderboardEntry } from '@/types/database';

interface LeaguePlayer {
  player_id: string;
  player?: { name: string; photo_url: string | null } | null;
}

interface Props {
  players: LeaguePlayer[] | undefined;
  league: League;
  isCreator: boolean;
  currentUserId?: string;
  leaderboard?: { entry: LeagueLeaderboardEntry; isTied: boolean }[];
  onLeave: () => void;
}

export default React.memo(function PlayersTab({
  players,
  league,
  isCreator,
  currentUserId,
  leaderboard,
  onLeave,
}: Props) {
  const colors = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Build a map from player_id to leaderboard stats for quick lookup
  const statsMap = useMemo(() => {
    if (!leaderboard) return new Map<string, ExpandablePlayerCardStats>();
    const map = new Map<string, ExpandablePlayerCardStats>();
    for (const { entry } of leaderboard) {
      map.set(entry.player_id, {
        roundsPlayed: entry.rounds_played,
        avgScore: entry.avg_differential,
        bestScore: entry.best_differential,
        avgDifferential: entry.avg_differential,
      });
    }
    return map;
  }, [leaderboard]);

  const handleCompare = useCallback(
    (playerId: string) => {
      if (!currentUserId) return;
      navigation.navigate('CompareStats', {
        playerId1: currentUserId,
        playerId2: playerId,
        leagueId: league.id,
        filterLabel: league.name,
      });
    },
    [navigation, currentUserId, league.id, league.name]
  );

  return (
    <View style={styles.section}>
      {players && players.length > 0 ? (
        players.map((lp) => {
          const isMe = lp.player_id === currentUserId;
          const isPlayerCreator = lp.player_id === league.created_by;

          const badge = isMe
            ? { label: 'You', backgroundColor: colors.primaryBackground }
            : isPlayerCreator
              ? { label: 'Creator', backgroundColor: colors.primaryBackground }
              : undefined;

          if (isMe) {
            return (
              <PlayerCard
                key={lp.player_id}
                player={{
                  id: lp.player_id,
                  name: lp.player?.name ?? 'Unknown',
                  photo_url: lp.player?.photo_url ?? null,
                }}
                variant="list-item"
                showEmail={false}
                showHandicap={false}
                badge={badge}
              />
            );
          }

          return (
            <ExpandablePlayerCard
              key={lp.player_id}
              player={{
                id: lp.player_id,
                name: lp.player?.name ?? 'Unknown',
                photo_url: lp.player?.photo_url ?? null,
              }}
              variant="list-item"
              badge={badge}
              stats={statsMap.get(lp.player_id)}
              onCompare={() => handleCompare(lp.player_id)}
            />
          );
        })
      ) : (
        <EmptyState
          icon="account-group-outline"
          title="No players yet"
          message="Share the invite code to get friends to join."
          compact
        />
      )}

      {!isCreator && (
        <TouchableOpacity
          onPress={onLeave}
          style={[styles.leaveButton, { borderColor: colors.error }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.leaveButtonText, { color: colors.error }]}>Leave League</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  leaveButton: {
    height: 44,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  leaveButtonText: {
    ...typography.bodyBold,
  },
});
