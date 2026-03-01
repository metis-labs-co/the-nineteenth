/**
 * PlayersTab - List of league players with creator badge and leave button
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { EmptyState } from '@/components/common/EmptyState';
import { PlayerCard } from '@/components/social/PlayerCard';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { League } from '@/types/database';

interface Props {
  players: any[] | undefined;
  league: League;
  isCreator: boolean;
  onLeave: () => void;
}

export default React.memo(function PlayersTab({
  players,
  league,
  isCreator,
  onLeave,
}: Props) {
  const colors = useThemeColors();

  return (
    <View style={styles.section}>
      {players && players.length > 0 ? (
        players.map((lp: any) => (
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

            badge={
              lp.player_id === league.created_by
                ? { label: 'Creator', backgroundColor: colors.primaryBackground }
                : undefined
            }
          />
        ))
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
