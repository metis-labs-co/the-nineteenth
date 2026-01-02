/**
 * ScoringPairsScreen - Manage scoring pairs for a round
 *
 * Allows organizers to create, edit, and auto-generate scoring pairs.
 * Uses ScoringPairFormationUI component for the main interface.
 *
 * Route params:
 * - roundId: UUID of the round
 * - competitionId: UUID of the competition
 */

import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { ScoringPairFormationUI } from '@/components/scoring';
import { PageHeader } from '@/components/common/PageHeader';
import { UpgradePrompt } from '@/components/subscription';
import { spacing, typography, borderRadius, shadows, layout } from '@/constants/theme';
import { useThemeColors, type ColorPalette } from '@/context/ThemeContext';
import { useIsPremium } from '@/context/SubscriptionContext';
import { supabase } from '@/services/supabase/client';
import { scoringPairsKeys } from '@/hooks/queryKeys';
import { useCreateScoringPairs } from '@/hooks/useScoringPairs';
import type {
  Player,
  Round,
  Competition,
  TeamWithMembers,
  ScoringPairWithPlayers,
} from '@/types/database.types';
import type { ScoringPairCreateInput } from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ScoringPairs'>;

// =====================================================
// DATA FETCHING
// =====================================================

interface ScoringPairsData {
  round: Round;
  competition: Competition;
  players: Player[];
  teams: TeamWithMembers[];
  existingPairs: ScoringPairWithPlayers[];
}

/**
 * Fetch round with players, teams, and existing scoring pairs
 */
async function fetchScoringPairsData(
  roundId: string,
  competitionId: string
): Promise<ScoringPairsData> {
  // Fetch round
  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', roundId)
    .single();

  if (roundError) {
    throw new Error(`Failed to fetch round: ${roundError.message}`);
  }

  // Fetch competition
  const { data: competitionData, error: competitionError } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (competitionError || !competitionData) {
    throw new Error(`Failed to fetch competition: ${competitionError?.message || 'Not found'}`);
  }

  const competition = competitionData as Competition;

  // Fetch accepted players from competition
  const { data: competitionPlayers, error: playersError } = await supabase
    .from('competition_players')
    .select(`
      player_id,
      players!player_id (*)
    `)
    .eq('competition_id', competitionId)
    .eq('status', 'accepted');

  if (playersError) {
    throw new Error(`Failed to fetch players: ${playersError.message}`);
  }

  // Transform players data
  const players: Player[] = (competitionPlayers || [])
    .map((cp: { player_id: string; players: Player | null }) => cp.players)
    .filter((p: Player | null): p is Player => p !== null);

  // Fetch existing teams if team competition
  let teams: TeamWithMembers[] = [];
  if (competition.team_mode !== 'none') {
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select(`
        *,
        team_members (
          team_id,
          player_id,
          joined_at,
          players!player_id (*)
        )
      `)
      .eq('competition_id', competitionId)
      .order('created_at', { ascending: true });

    if (teamsError) {
      console.warn(`Failed to fetch teams: ${teamsError.message}`);
    } else {
      interface TeamRow {
        id: string;
        competition_id: string;
        name: string;
        created_at: string;
        updated_at: string;
        team_members: {
          team_id: string;
          player_id: string;
          joined_at: string;
          players: Player | null;
        }[] | null;
      }
      teams = (teamsData || []).map((team: TeamRow) => ({
        id: team.id,
        competition_id: team.competition_id,
        name: team.name,
        created_at: team.created_at,
        updated_at: team.updated_at,
        members: (team.team_members || []).map((tm) => ({
          team_id: tm.team_id,
          player_id: tm.player_id,
          joined_at: tm.joined_at,
          player: tm.players || undefined,
        })),
      }));
    }
  }

  // Fetch existing scoring pairs for the round
  const { data: existingPairs, error: pairsError } = await supabase
    .from('scoring_pairs')
    .select(`
      *,
      scorer:players!scoring_pairs_scorer_id_fkey (*),
      player:players!scoring_pairs_player_id_fkey (*)
    `)
    .eq('round_id', roundId);

  if (pairsError) {
    console.warn(`Failed to fetch existing pairs: ${pairsError.message}`);
  }

  return {
    round: round as Round,
    competition: competition as Competition,
    players,
    teams,
    existingPairs: (existingPairs || []) as ScoringPairWithPlayers[],
  };
}

/**
 * Hook to fetch scoring pairs screen data
 */
function useScoringPairsData(roundId: string, competitionId: string) {
  return useQuery({
    queryKey: ['scoringPairsScreen', roundId, competitionId],
    queryFn: () => fetchScoringPairsData(roundId, competitionId),
    enabled: !!roundId && !!competitionId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// =====================================================
// COMPONENT
// =====================================================

export default function ScoringPairsScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { roundId, competitionId } = route.params;

  // Premium check for gating
  const isPremium = useIsPremium();

  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

  // Mutation for saving pairs
  const { mutate: createScoringPairs, isPending: isSaving } = useCreateScoringPairs();

  // Fetch data
  const { data, isLoading, error, refetch, isRefetching } = useScoringPairsData(
    roundId,
    competitionId
  );

  // Set header to hidden (we use custom PageHeader)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSavePairs = useCallback(
    (pairs: ScoringPairCreateInput[]) => {
      createScoringPairs(
        { roundId, pairs },
        {
          onSuccess: () => {
            // Invalidate queries
            queryClient.invalidateQueries({
              queryKey: scoringPairsKeys.list(roundId),
            });
            queryClient.invalidateQueries({
              queryKey: ['scoringPairsScreen', roundId, competitionId],
            });

            // Show success message
            setSnackbarMessage('Scoring pairs saved');
            setSnackbarType('success');
            setSnackbarVisible(true);

            // Navigate back after a short delay
            setTimeout(() => {
              navigation.goBack();
            }, 1200);
          },
          onError: (err) => {
            console.error('[ScoringPairsScreen] Failed to save pairs:', err);
            setSnackbarMessage('Failed to save pairs. Please try again.');
            setSnackbarType('error');
            setSnackbarVisible(true);
          },
        }
      );
    },
    [roundId, competitionId, createScoringPairs, navigation, queryClient]
  );

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleDismissSnackbar = useCallback(() => {
    setSnackbarVisible(false);
  }, []);

  const styles = createStyles(colors);

  // =====================================================
  // RENDER STATES
  // =====================================================

  // Premium gate - scoring pairs is a Premium-only feature
  if (!isPremium) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Scoring Pairs"
          variant="centered"
          showBack
          onBack={handleGoBack}
        />
        <UpgradePrompt
          config={{
            feature: 'scoring_pairs',
            title: 'Unlock Scoring Pairs',
            message: 'Get designated markers for your competitive rounds with the Premium plan',
            targetTier: 'premium',
            benefits: [
              'Designated scoring pairs for competitive rounds',
              'Official marker assignments',
              'Tournament-style score verification',
            ],
          }}
          onUpgrade={() => navigation.navigate('Subscription')}
          onDismiss={handleGoBack}
          visible={true}
        />
      </View>
    );
  }

  // Get round name for subtitle
  const getRoundName = (): string => {
    if (!data?.round) return 'Round';
    const roundDate = data.round.date
      ? new Date(data.round.date).toLocaleDateString('en-AU', {
          day: 'numeric',
          month: 'short',
        })
      : '';
    return `Round ${data.round.round_number}${roundDate ? ` - ${roundDate}` : ''}`;
  };

  // Determine if this is a team match play round
  const isTeamMatchPlay =
    data?.round?.is_team_round &&
    data?.round?.team_format === 'match-play-team';

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Scoring Pairs"
          subtitle="Loading..."
          variant="centered"
          showBack
          onBack={handleGoBack}
        />
        <View style={styles.centeredContainer}>
          <LoadingSpinner size="lg" message="Loading scoring pairs..." />
        </View>
      </View>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Scoring Pairs"
          variant="centered"
          showBack
          onBack={handleGoBack}
        />
        <View style={styles.centeredContainer}>
          <IconAlertCircle size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorMessage}>
            {error?.message || 'Unable to load scoring pairs data'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
            disabled={isRefetching}
            accessibilityRole="button"
            accessibilityLabel="Retry loading"
          >
            <IconRefresh size={18} color={colors.textInverse} />
            <Text style={styles.retryButtonText}>
              {isRefetching ? 'Retrying...' : 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <View style={styles.container}>
      <PageHeader
        title="Scoring Pairs"
        subtitle={getRoundName()}
        variant="centered"
        showBack
        onBack={handleGoBack}
      />

      {/* Scoring Pair Formation UI */}
      <ScoringPairFormationUI
        roundId={roundId}
        players={data.players}
        existingPairs={data.existingPairs}
        teams={isTeamMatchPlay ? data.teams : undefined}
        isTeamMatchPlay={isTeamMatchPlay}
        onSave={handleSavePairs}
        onCancel={handleCancel}
        testID="scoring-pair-formation-ui"
      />

      {/* Loading Overlay when saving */}
      {isSaving && (
        <View style={styles.savingOverlay}>
          <LoadingSpinner size="lg" message="Saving pairs..." />
        </View>
      )}

      {/* Snackbar for feedback */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={handleDismissSnackbar}
        duration={3000}
        style={[
          styles.snackbar,
          snackbarType === 'success' ? styles.snackbarSuccess : styles.snackbarError,
        ]}
        action={{
          label: 'Dismiss',
          onPress: handleDismissSnackbar,
          labelStyle: { color: colors.textInverse },
        }}
      >
        <Text style={styles.snackbarText}>{snackbarMessage}</Text>
      </Snackbar>
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centeredContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: layout.screenPadding,
      gap: spacing.md,
    },
    loadingText: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.md,
    },
    errorTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    errorMessage: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 300,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      marginTop: spacing.lg,
      gap: spacing.sm,
      minHeight: layout.buttonHeight,
      ...shadows.sm,
    },
    retryButtonText: {
      ...typography.bodyBold,
      color: colors.textInverse,
    },
    savingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `${colors.background}CC`,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
    },
    savingText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    snackbar: {
      marginBottom: spacing.xxl,
      marginHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
    },
    snackbarSuccess: {
      backgroundColor: colors.success,
    },
    snackbarError: {
      backgroundColor: colors.error,
    },
    snackbarText: {
      ...typography.body,
      color: colors.textInverse,
    },
  });
