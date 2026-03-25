/**
 * RoundSettingsScreen - Settings for a round (organizers only)
 *
 * Contains:
 * - Game Setup (pairings, scoring pairs, skins, wolf config)
 * - Delete Round (danger zone)
 *
 * Accessible via cog icon in ViewRoundScreen header.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RootStackParamList } from '@/navigation/types';
import { PageHeader, ConfirmationDialog } from '@/components/common';
import { RoundGameSetupTab } from '@/components/rounds/ViewRound';
import { ScoringPairsConfigBottomSheet } from '@/components/rounds/ViewRound/RoundDetailsTab/components';
import { SkinsConfigBottomSheet } from '@/components/skins';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { useThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useRoundDetails, useRoundScorecards, useRoundPlayers } from '@/hooks/useRoundDetails';
import { useCompetitionInfo } from '@/hooks';
import { useDeleteRound } from '@/hooks/useDeleteRound';
import { useSkinsGamesByRound, useCreateSkinsGame } from '@/hooks/useSkins';
import { supabase } from '@/services/supabase/client';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { Player } from '@/types';
import type { SkinsConfig } from '@/types/database/skins.types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type SettingsRoute = RouteProp<RootStackParamList, 'RoundSettings'>;

export default function RoundSettingsScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SettingsRoute>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { roundId, competitionId } = route.params;
  const isStandalone = !competitionId;

  // Data fetching
  const { data: round, isLoading: isLoadingRound, error: roundError, refetch: refetchRound } = useRoundDetails(roundId);
  const { data: scorecards } = useRoundScorecards(roundId);
  const { data: roundPlayers } = useRoundPlayers(roundId);
  const { data: competitionInfo } = useCompetitionInfo(competitionId);
  const { data: skinsGames } = useSkinsGamesByRound(roundId);

  // Permissions
  const isOrganizer = useMemo(() => {
    if (!user?.id) return false;
    if (isStandalone && round?.user_id === user.id) return true;
    if (competitionInfo?.organizer_id === user.id) return true;
    return false;
  }, [user?.id, isStandalone, round?.user_id, competitionInfo?.organizer_id]);

  const canDelete = useMemo(() => {
    if (!user?.id || !round) return false;
    if (isStandalone && round.user_id === user.id) return true;
    if (!isStandalone && competitionInfo?.organizer_id === user.id) {
      return round.status === 'upcoming';
    }
    return false;
  }, [user?.id, round, isStandalone, competitionInfo?.organizer_id]);

  // Local state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showScoringPairsSheet, setShowScoringPairsSheet] = useState(false);
  const [showSkinsConfigSheet, setShowSkinsConfigSheet] = useState(false);
  const [showAlert, setShowAlert] = useState<{ title: string; message: string } | null>(null);

  // Mutations
  const { mutate: deleteRound, isPending: isDeleting } = useDeleteRound();
  const { mutate: createSkinsGame } = useCreateSkinsGame();
  const { mutate: updateSkinsGame } = useMutation({
    mutationFn: async ({ gameId, updates }: { gameId: string; updates: Partial<SkinsConfig> }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('skins_games') as any)
        .update(updates)
        .eq('id', gameId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skinsGames', roundId] });
    },
  });

  // Delete handlers
  const handleDeletePress = useCallback(() => setShowDeleteDialog(true), []);
  const handleDeleteCancel = useCallback(() => setShowDeleteDialog(false), []);
  const handleDeleteConfirm = useCallback(() => {
    deleteRound(
      { roundId, competitionId },
      {
        onSuccess: () => {
          setShowDeleteDialog(false);
          // Go back twice — past RoundSettings and ViewRound
          navigation.goBack();
          navigation.goBack();
        },
        onError: (error) => {
          setShowDeleteDialog(false);
          console.error('[RoundSettingsScreen] Delete failed:', error);
        },
      }
    );
  }, [deleteRound, roundId, competitionId, navigation]);

  const getDeleteMessage = () => {
    if (isStandalone) {
      return 'Are you sure you want to delete this practice round? All scores and data will be permanently removed.';
    }
    return 'Are you sure you want to delete this round? All pairings, scores, and data will be permanently removed.';
  };

  // Scoring pairs handlers
  const handleScoringPairsEditPress = useCallback(() => setShowScoringPairsSheet(true), []);
  const handleScoringPairsSheetClose = useCallback(() => setShowScoringPairsSheet(false), []);

  // Skins handlers
  const handleSkinsEditPress = useCallback(() => setShowSkinsConfigSheet(true), []);
  const handleSkinsConfigClose = useCallback(() => setShowSkinsConfigSheet(false), []);

  const handleSkinsConfigSave = useCallback(
    async (config: SkinsConfig) => {
      const currentSkinsGame = skinsGames?.[0];

      if (currentSkinsGame) {
        updateSkinsGame(
          {
            gameId: currentSkinsGame.id,
            updates: {
              pot_type: config.pot_type,
              pot_value: config.pot_value,
              scoring_type: config.scoring_type,
              currency: config.currency,
            },
          },
          {
            onSuccess: () => setShowSkinsConfigSheet(false),
          }
        );
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.id) return;

        const playerIdsFromRoundPlayers = roundPlayers?.map((p) => p.id) ?? [];
        const playerIdsFromScorecards = scorecards?.map((sc) => sc.player_id) ?? [];
        const allPlayerIds = new Set([...playerIdsFromRoundPlayers, ...playerIdsFromScorecards]);

        if (allPlayerIds.size < 2 && competitionId) {
          const { data: compPlayers } = await supabase
            .from('competition_players')
            .select('player_id')
            .eq('competition_id', competitionId) as { data: { player_id: string }[] | null };

          if (compPlayers && compPlayers.length > 0) {
            compPlayers.forEach((cp) => allPlayerIds.add(cp.player_id));
          }
        }

        allPlayerIds.add(authUser.id);
        const participantIds = Array.from(allPlayerIds);

        if (participantIds.length < 2) {
          setShowAlert({
            title: 'Not Enough Players',
            message: competitionId
              ? 'Skins games require at least 2 players. Make sure the competition has players added.'
              : 'Skins games require at least 2 players. Add more players to the round first.',
          });
          return;
        }

        const TEAM_GAME_TYPES = ['best-ball', 'scramble', 'shamble'];
        const isTeamSkinsGame = round?.is_team_round && round?.team_format && TEAM_GAME_TYPES.includes(round.team_format);

        let teamIds: string[] = [];
        if (isTeamSkinsGame) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const teamConfig = (round as any)?.team_config;
          if (teamConfig?.teams && teamConfig.teams.length > 0) {
            teamIds = teamConfig.teams
              .filter((t: { id: string }) => t.id !== 'default-team')
              .map((t: { id: string }) => t.id);
          }

          if (teamIds.length === 0 && competitionId) {
            const { data: dbTeams } = await supabase
              .from('teams')
              .select('id')
              .eq('round_id', roundId) as unknown as { data: { id: string }[] | null };

            if (dbTeams && dbTeams.length > 0) {
              teamIds = dbTeams.map((t) => t.id);
            }
          }
        }

        createSkinsGame(
          {
            round_id: roundId,
            participant_ids: participantIds,
            pot_type: config.pot_type,
            pot_value: config.pot_value,
            scoring_type: config.scoring_type,
            currency: config.currency,
            disclaimerAcceptedBy: authUser.id,
            is_team_skins: !!isTeamSkinsGame,
            participant_team_ids: teamIds.length > 0 ? teamIds : undefined,
          },
          {
            onSuccess: () => setShowSkinsConfigSheet(false),
            onError: (error) => {
              console.error('[RoundSettingsScreen] Failed to create skins game:', error);
              setShowAlert({ title: 'Error', message: 'Failed to create skins game. Please try again.' });
            },
          }
        );
      }
    },
    [skinsGames, updateSkinsGame, createSkinsGame, roundId, roundPlayers, scorecards, competitionId, round]
  );

  // Loading state
  if (isLoadingRound) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Round Settings" variant="centered" showBack onBack={() => navigation.goBack()} />
        <LoadingSpinner size="lg" message="Loading..." />
      </View>
    );
  }

  // Error state
  if (roundError || !round) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Round Settings" variant="centered" showBack onBack={() => navigation.goBack()} />
        <ErrorState
          title="Unable to load round"
          error={roundError?.message || 'Round not found'}
          onRetry={refetchRound}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Round Settings"
        variant="centered"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Game Setup Section */}
        <RoundGameSetupTab
          round={round}
          isOrganizer={isOrganizer}
          players={(roundPlayers || []) as Player[]}
          onScoringPairsEditPress={handleScoringPairsEditPress}
          onSkinsEditPress={handleSkinsEditPress}
        />

        {/* Danger Zone */}
        {canDelete && (
          <>
            <Divider style={styles.divider} />

            <View style={styles.dangerSection}>
              <Text style={[styles.dangerHeader, { color: colors.error }]}>
                Danger Zone
              </Text>

              <TouchableOpacity
                style={[styles.deleteButton, { borderColor: colors.error }]}
                onPress={handleDeletePress}
                activeOpacity={0.7}
              >
                <Icon source="delete-outline" size={20} color={colors.error} />
                <Text style={[styles.deleteButtonText, { color: colors.error }]}>
                  Delete Round
                </Text>
              </TouchableOpacity>

              <Text style={[styles.dangerHint, { color: colors.textSecondary }]}>
                This will permanently remove the round, all scores, and associated data.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        visible={showDeleteDialog}
        title="Delete Round"
        message={getDeleteMessage()}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={isDeleting}
        icon="delete-outline"
      />

      {/* Alert Dialog */}
      <ConfirmationDialog
        visible={!!showAlert}
        title={showAlert?.title || ''}
        message={showAlert?.message || ''}
        confirmLabel="OK"
        onConfirm={() => setShowAlert(null)}
        onCancel={() => setShowAlert(null)}
      />

      {/* Bottom Sheets */}
      <ScoringPairsConfigBottomSheet
        visible={showScoringPairsSheet}
        onDismiss={handleScoringPairsSheetClose}
        roundId={roundId}
        competitionId={competitionId}
        scoringPairsRequired={round?.scoring_pairs_required ?? false}
      />

      <SkinsConfigBottomSheet
        visible={showSkinsConfigSheet}
        onDismiss={handleSkinsConfigClose}
        initialConfig={
          skinsGames?.[0]
            ? {
                pot_type: skinsGames[0].pot_type,
                pot_value: skinsGames[0].pot_value,
                scoring_type: skinsGames[0].scoring_type,
                currency: skinsGames[0].currency,
              }
            : null
        }
        onSave={handleSkinsConfigSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  divider: {
    marginVertical: spacing.xl,
  },
  dangerSection: {
    gap: spacing.md,
  },
  dangerHeader: {
    ...typography.bodyBold,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    height: 48,
    ...shadows.sm,
  },
  deleteButtonText: {
    ...typography.bodyBold,
  },
  dangerHint: {
    ...typography.caption,
    textAlign: 'center',
  },
});
