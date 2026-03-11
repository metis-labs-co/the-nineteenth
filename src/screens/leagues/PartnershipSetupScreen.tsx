/**
 * PartnershipSetupScreen - Form a partnership with another league member
 *
 * Shows league members who don't have active partnerships.
 * "Partner with [player]" action with confirmation.
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { PageHeader, LoadingSpinner } from '@/components/common';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useLeaguePlayers } from '@/hooks/useLeagues';
import { usePartnerships, useCreatePartnership } from '@/hooks/usePartnershipLeague';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'PartnershipSetup'>;

export default function PartnershipSetupScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();
  const { leagueId } = route.params;

  const { data: players, isLoading: isLoadingPlayers } = useLeaguePlayers(leagueId);
  const { data: partnerships, isLoading: isLoadingPartnerships } = usePartnerships(leagueId);
  const createPartnership = useCreatePartnership(leagueId);

  // Get player IDs that already have active partnerships
  const partneredPlayerIds = useMemo(() => {
    if (!partnerships) return new Set<string>();
    const ids = new Set<string>();
    for (const p of partnerships) {
      if (p.status === 'active') {
        ids.add(p.player_1_id);
        ids.add(p.player_2_id);
      }
    }
    return ids;
  }, [partnerships]);

  // Available players: league members without active partnerships, excluding current user
  const availablePlayers = useMemo(() => {
    if (!players || !user) return [];
    return players.filter(
      (p) =>
        p.player_id !== user.id &&
        !partneredPlayerIds.has(p.player_id)
    );
  }, [players, user, partneredPlayerIds]);

  const handlePartner = useCallback(
    (playerId: string, playerName: string) => {
      Alert.alert(
        'Form Partnership',
        `Partner with ${playerName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Partner Up',
            onPress: async () => {
              try {
                await createPartnership.mutateAsync(playerId);
                navigation.goBack();
              } catch (error: unknown) {
                Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create partnership');
              }
            },
          },
        ]
      );
    },
    [createPartnership, navigation]
  );

  const isLoading = isLoadingPlayers || isLoadingPartnerships;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Choose Partner"
        showBack
        onBack={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="lg" />
        </View>
      ) : (
        <>
          <View style={[styles.infoBox, { backgroundColor: colors.primaryBackground }]}>
            <Icon source="information-outline" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Choose a league member to form a partnership with. You can only have one active partnership per league.
            </Text>
          </View>

          <FlatList
            data={availablePlayers}
            keyExtractor={(item) => item.player_id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handlePartner(item.player_id, item.player.name)}
                style={[styles.playerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.7}
                accessibilityLabel={`Partner with ${item.player.name}`}
              >
                <PlayerAvatar
                  name={item.player.name}
                  photoUrl={item.player.photo_url}
                  size={44}
                />
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, { color: colors.textPrimary }]}>
                    {item.player.name}
                  </Text>
                </View>
                <View style={[styles.partnerButton, { backgroundColor: colors.primary }]}>
                  <Icon source="handshake" size={16} color={colors.white} />
                  <Text style={[styles.partnerButtonText, { color: colors.white }]}>
                    Partner
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon source="account-group" size={48} color={colors.gray300} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No Available Members
                </Text>
                <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                  All league members already have partnerships, or you need to invite more members.
                </Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.small,
    flex: 1,
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
    ...shadows.sm,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    ...typography.bodyBold,
  },
  partnerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  partnerButtonText: {
    ...typography.smallBold,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.h4,
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
