/**
 * TeamManagementScreen - Manage competition teams
 *
 * Allows organizers to create, edit, and auto-generate teams for a competition.
 * Uses TeamFormationUI component for the main interface.
 */

import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { TeamFormationUI } from '@/components/teams';
import { PageHeader } from '@/components/common/PageHeader';
import { spacing, typography, borderRadius, shadows, layout } from '@/constants/theme';
import { useThemeColors, type ColorPalette } from '@/context/ThemeContext';
import { supabase } from '@/services/supabase/client';
import { teamKeys } from '@/hooks/queryKeys';
import type { Player, TeamWithMembers, Competition } from '@/types/database.types';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamManagement'>;

// =====================================================
// DATA FETCHING
// =====================================================

interface TeamManagementData {
  competition: Competition;
  players: Player[];
  teams: TeamWithMembers[];
}

/**
 * Fetch competition with players and teams
 */
async function fetchTeamManagementData(competitionId: string): Promise<TeamManagementData> {
  // Fetch competition
  const { data: competition, error: competitionError } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (competitionError) {
    throw new Error(`Failed to fetch competition: ${competitionError.message}`);
  }

  // Fetch accepted players
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

  // Fetch existing teams with members
  const { data: teams, error: teamsError } = await supabase
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
    throw new Error(`Failed to fetch teams: ${teamsError.message}`);
  }

  // Transform players data
  const players: Player[] = (competitionPlayers || [])
    .map((cp: any) => cp.players)
    .filter((p: Player | null): p is Player => p !== null);

  // Transform teams data
  const transformedTeams: TeamWithMembers[] = (teams || []).map((team: any) => ({
    id: team.id,
    competition_id: team.competition_id,
    name: team.name,
    created_at: team.created_at,
    updated_at: team.updated_at,
    members: (team.team_members || []).map((tm: any) => ({
      team_id: tm.team_id,
      player_id: tm.player_id,
      joined_at: tm.joined_at,
      player: tm.players || undefined,
    })),
  }));

  return {
    competition: competition as Competition,
    players,
    teams: transformedTeams,
  };
}

/**
 * Hook to fetch team management data
 */
function useTeamManagementData(competitionId: string) {
  return useQuery({
    queryKey: ['teamManagement', competitionId],
    queryFn: () => fetchTeamManagementData(competitionId),
    enabled: !!competitionId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// =====================================================
// COMPONENT
// =====================================================

export default function TeamManagementScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { competitionId } = route.params;

  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');

  // Fetch data
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useTeamManagementData(competitionId);

  // Set header title
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Manage Teams',
      headerShown: false,
    });
  }, [navigation]);

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSaveTeams = useCallback(
    async (teams: TeamWithMembers[]) => {
      try {
        // Note: The actual saving is handled by the useAutoGenerateTeams hook
        // or could be extended with a custom save mutation here

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({
          queryKey: teamKeys.list(competitionId),
        });
        queryClient.invalidateQueries({
          queryKey: ['teamManagement', competitionId],
        });

        // Show success message
        setSnackbarMessage(`Successfully saved ${teams.length} teams`);
        setSnackbarType('success');
        setSnackbarVisible(true);

        // Navigate back after a short delay
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      } catch (err) {
        console.error('[TeamManagementScreen] Failed to save teams:', err);
        setSnackbarMessage('Failed to save teams. Please try again.');
        setSnackbarType('error');
        setSnackbarVisible(true);
      }
    },
    [competitionId, navigation, queryClient]
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

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Manage Teams"
          variant="centered"
          showBack
          onBack={handleGoBack}
        />
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading teams...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <View style={styles.container}>
        <PageHeader
          title="Manage Teams"
          variant="centered"
          showBack
          onBack={handleGoBack}
        />
        <View style={styles.centeredContainer}>
          <IconAlertCircle size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorMessage}>
            {error?.message || 'Unable to load team data'}
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

  // Determine team size from competition settings
  const teamSize = (data.competition.team_size as 2 | 3 | 4) || 4;

  // =====================================================
  // MAIN RENDER
  // =====================================================

  return (
    <View style={styles.container}>
      <PageHeader
        title="Manage Teams"
        variant="centered"
        showBack
        onBack={handleGoBack}
      />

      {/* Team Formation UI */}
      <TeamFormationUI
        competitionId={competitionId}
        players={data.players}
        existingTeams={data.teams}
        teamSize={teamSize}
        onSave={handleSaveTeams}
        onCancel={handleCancel}
        testID="team-formation-ui"
      />

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

