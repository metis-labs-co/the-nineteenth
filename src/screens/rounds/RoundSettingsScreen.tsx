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
import { RoundGameSetupTab, EditTeesSheet } from '@/components/rounds/ViewRound';
import { PairingSourceSummary } from '@/components/rounds/PairingSourceSummary';
import { EditPairingConfigSheet } from '@/components/rounds/EditPairingConfigSheet';
import { useTeams } from '@/hooks/useTeams';
import { SkinsConfigBottomSheet } from '@/components/skins';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsSuperAdmin } from '@/context/SubscriptionContext';
import { useAuth } from '@/hooks/useAuth';
import { useRoundDetails, useRoundScorecards, useRoundPlayers } from '@/hooks/useRoundDetails';
import { useRoundPlayerTees } from '@/hooks/rounds';
import { useCompetitionInfo } from '@/hooks';
import { useDeleteRound } from '@/hooks/useDeleteRound';
import {
  useRecalculateRoundResults,
  useForceSyncRoundScorecards,
  useForceFinalizeRound,
  useReopenRound,
} from '@/hooks/rounds';
import ForceSubmitRoundDialog from '@/components/rounds/ForceSubmitRoundDialog';
import { NoCompletedScorecardsError } from '@/services/rounds/forceFinalizeRound';
import { useSkinsGamesByRound, useCreateSkinsGame } from '@/hooks/useSkins';
import { supabase } from '@/services/supabase/client';
import { roundKeys } from '@/hooks/queryKeys';
import { TEAM_ONLY_GAME_TYPES } from '@/services/rounds/resultsEngine';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { CourseSelectionModal } from '../admin/AddRoundScreen/components';
import { EditRoundNameSheet } from '@/components/rounds/EditRoundNameSheet';
import type { CourseWithFavoriteStatus } from '@/hooks/useClubs';
import type { Club } from '@/types/database.types';
import type { Player } from '@/types';
import type { SkinsConfig } from '@/types/database/skins.types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type SettingsRoute = RouteProp<RootStackParamList, 'RoundSettings'>;

export default function RoundSettingsScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SettingsRoute>();
  const { user } = useAuth();
  const isSuperAdmin = useIsSuperAdmin();
  const queryClient = useQueryClient();

  const { roundId, competitionId } = route.params;
  const isStandalone = !competitionId;

  // Data fetching
  const { data: round, isLoading: isLoadingRound, error: roundError, refetch: refetchRound } = useRoundDetails(roundId);
  const { data: scorecards } = useRoundScorecards(roundId);
  const { data: roundPlayers } = useRoundPlayers(roundId);
  const { data: roundPlayerTees } = useRoundPlayerTees(roundId);
  const { data: competitionInfo } = useCompetitionInfo(competitionId);
  const { data: skinsGames } = useSkinsGamesByRound(roundId);

  // Permissions
  // Super admins (and developer tier) bypass organizer checks so they can
  // intervene on any round — used as an emergency lever when sync has
  // failed and the actual organizer needs the recalc/edit affordances.
  const isOrganizer = useMemo(() => {
    if (!user?.id) return false;
    if (isSuperAdmin) return true;
    if (isStandalone && round?.user_id === user.id) return true;
    if (competitionInfo?.organizer_id === user.id) return true;
    return false;
  }, [user?.id, isSuperAdmin, isStandalone, round?.user_id, competitionInfo?.organizer_id]);

  const canDelete = useMemo(() => {
    if (!user?.id || !round) return false;
    if (isStandalone && round.user_id === user.id) return true;
    if (!isStandalone && competitionInfo?.organizer_id === user.id) {
      return round.status === 'upcoming';
    }
    return false;
  }, [user?.id, round, isStandalone, competitionInfo?.organizer_id]);

  // Course can only be changed by the competition organiser while the
  // round is still upcoming (no scorecards exist yet).
  const canChangeCourse = useMemo(() => {
    if (!user?.id || !round || isStandalone) return false;
    if (competitionInfo?.organizer_id !== user.id) return false;
    return round.status === 'upcoming';
  }, [user?.id, round, isStandalone, competitionInfo?.organizer_id]);

  // Pairing config edits — same lifecycle gate as canChangeCourse: organiser
  // only, only while the round is still upcoming. Standalone rounds don't
  // have a competition standings input so the edit affordance is hidden.
  const canEditPairings = useMemo(() => {
    if (!user?.id || !round || isStandalone) return false;
    if (competitionInfo?.organizer_id !== user.id) return false;
    return round.status === 'upcoming';
  }, [user?.id, round, isStandalone, competitionInfo?.organizer_id]);

  const isSplitRound = (round?.sub_match_size ?? 0) > 0;
  const canForceSubmit = isOrganizer && !isStandalone && round?.status === 'in-progress' && !isSplitRound;
  const canReopen = isOrganizer && !isStandalone && round?.status === 'completed';

  // Local state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSkinsConfigSheet, setShowSkinsConfigSheet] = useState(false);
  const [showEditTeesSheet, setShowEditTeesSheet] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [showEditNameSheet, setShowEditNameSheet] = useState(false);
  const [showEditPairingSheet, setShowEditPairingSheet] = useState(false);
  const [showAlert, setShowAlert] = useState<{ title: string; message: string } | null>(null);
  const [showForceSubmitDialog, setShowForceSubmitDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);

  // Teams for split-preset re-seed branch (ryder_cup_singles). Empty when
  // the round is standalone or the competition has no teams.
  const { data: teams = [] } = useTeams(competitionId ?? '');

  // The placeholder/fallback title shown when no custom name is set. Mirrors
  // the derivation in ViewRoundScreen so the user knows what the round will
  // be called if they leave it blank.
  const derivedRoundTitle = useMemo(() => {
    if (!round) return '';
    if (isStandalone) {
      const playerCount = (roundPlayers?.length ?? 0) || (scorecards?.length ?? 0);
      if (playerCount > 1) return 'Match';
      return round.handicap_source && round.handicap_source !== 'none'
        ? 'Handicap Round'
        : 'Practice Round';
    }
    return `Round ${round.round_number || ''}`.trim();
  }, [round, isStandalone, roundPlayers, scorecards]);

  // Mutations
  const { mutate: deleteRound, isPending: isDeleting } = useDeleteRound();
  const { mutate: recalculateResults, isPending: isRecalculating } =
    useRecalculateRoundResults();
  const { mutate: forceSyncScorecards, isPending: isForceSyncing } =
    useForceSyncRoundScorecards();
  const { mutate: forceFinalize, isPending: isForceSubmitting } = useForceFinalizeRound();
  const { mutate: reopen, isPending: isReopening } = useReopenRound();
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

  // Changing the course clears selected_tee — tees belong to the old
  // course so keeping them would leave a stale reference. Organiser
  // picks a tee again on the new course.
  const { mutate: updateCourse, isPending: isUpdatingCourse } = useMutation({
    mutationFn: async (courseId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('rounds') as any)
        .update({ course_id: courseId, selected_tee: null })
        .eq('id', roundId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
    },
    onError: (error) => {
      console.error('[RoundSettingsScreen] Failed to update course:', error);
      setShowAlert({ title: 'Error', message: 'Failed to change course. Please try again.' });
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

  // Recalculate results — re-runs round_results finalization against the
  // existing completed scorecards. Used when a scoring engine fix shipped
  // after the round was finalized, or rules changed post-completion. No
  // tee data required (unlike Edit Tees).
  const handleRecalculateResults = useCallback(() => {
    recalculateResults(
      { roundId, competitionId },
      {
        onSuccess: () => {
          setShowAlert({
            title: 'Recalculated',
            message:
              'Round results refreshed. The leaderboard should now reflect any recent rule or engine changes.',
          });
        },
        onError: (error) => {
          setShowAlert({
            title: 'Recalculation Failed',
            message: error instanceof Error ? error.message : 'Unknown error.',
          });
        },
      }
    );
  }, [recalculateResults, roundId, competitionId]);

  const handleForceSubmitConfirm = useCallback(() => {
    forceFinalize(
      { roundId, competitionId },
      {
        onSuccess: () => {
          setShowForceSubmitDialog(false);
          setShowAlert({
            title: 'Round Submitted',
            message: 'The round has been finalized. Unfinished players were marked Did Not Finish.',
          });
        },
        onError: (error) => {
          setShowForceSubmitDialog(false);
          setShowAlert({
            title: 'Could Not Submit',
            message:
              error instanceof NoCompletedScorecardsError
                ? error.message
                : error instanceof Error
                ? error.message
                : 'Unknown error.',
          });
        },
      }
    );
  }, [forceFinalize, roundId, competitionId]);

  const handleReopenConfirm = useCallback(() => {
    reopen(
      { roundId, competitionId },
      {
        onSuccess: () => {
          setShowReopenDialog(false);
          setShowAlert({
            title: 'Round Re-opened',
            message: 'Players can finish their scorecards. Re-submit or use Recalculate Results when done.',
          });
        },
        onError: (error) => {
          setShowReopenDialog(false);
          setShowAlert({
            title: 'Could Not Re-open',
            message: error instanceof Error ? error.message : 'Unknown error.',
          });
        },
      }
    );
  }, [reopen, roundId, competitionId]);

  // Force-push the local SQLite scorecards for this round up to Supabase.
  // Recovery lever for the case where background sync silently failed and
  // the View Round / leaderboard read empty from the server.
  const handleForceSyncScorecards = useCallback(() => {
    forceSyncScorecards(
      { roundId, competitionId },
      {
        onSuccess: (result) => {
          if (result.eligible === 0) {
            setShowAlert({
              title: 'Nothing to Sync',
              message:
                'No completed scorecards found in local storage for this round. If the round was scored on a different device, that device needs to sync from there.',
            });
            return;
          }
          if (result.failed > 0) {
            setShowAlert({
              title: result.pushed > 0 ? 'Partial Sync' : 'Sync Failed',
              message: `${result.pushed} of ${result.eligible} scorecard(s) pushed. ${result.failed} failed.${result.firstError ? `\n\nFirst error: ${result.firstError}` : ''}`,
            });
            return;
          }
          setShowAlert({
            title: 'Scorecards Synced',
            message: `Pushed ${result.pushed} scorecard(s) to the cloud and refreshed the leaderboard.`,
          });
        },
        onError: (error) => {
          setShowAlert({
            title: 'Sync Failed',
            message: error instanceof Error ? error.message : 'Unknown error.',
          });
        },
      }
    );
  }, [forceSyncScorecards, roundId, competitionId]);

  const getDeleteMessage = () => {
    if (isStandalone) {
      return 'Are you sure you want to delete this practice round? All scores and data will be permanently removed.';
    }
    return 'Are you sure you want to delete this round? All pairings, scores, and data will be permanently removed.';
  };

  // Scoring pairs — tapping the card routes to the dedicated
  // ScoringPairsScreen where organisers manage assignments. The
  // on/off toggle remains inline on the ScoringPairsSection itself.
  const handleScoringPairsEditPress = useCallback(() => {
    if (!competitionId) return;
    navigation.navigate('ScoringPairs', { roundId, competitionId });
  }, [navigation, roundId, competitionId]);

  // Skins handlers
  const handleSkinsEditPress = useCallback(() => setShowSkinsConfigSheet(true), []);
  const handleSkinsConfigClose = useCallback(() => setShowSkinsConfigSheet(false), []);

  // Edit tees handlers — tees are already fetched via useRoundPlayerTees
  const handleEditTeesPress = useCallback(() => setShowEditTeesSheet(true), []);
  const handleEditTeesClose = useCallback(() => setShowEditTeesSheet(false), []);

  // Round name handlers
  const handleEditNamePress = useCallback(() => setShowEditNameSheet(true), []);
  const handleEditNameClose = useCallback(() => setShowEditNameSheet(false), []);

  // Course change handlers
  const handleChangeCoursePress = useCallback(() => setShowCourseModal(true), []);
  const handleCourseModalClose = useCallback(() => {
    setShowCourseModal(false);
    setCourseSearchQuery('');
  }, []);
  const handleCourseSelect = useCallback(
    (course: CourseWithFavoriteStatus, _club: Club) => {
      updateCourse(course.id);
      setShowCourseModal(false);
      setCourseSearchQuery('');
    },
    [updateCourse]
  );

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

        const isTeamSkinsGame =
          round?.is_team_round &&
          round?.team_format &&
          (TEAM_ONLY_GAME_TYPES as string[]).includes(round.team_format);

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
        {/* Round Name Section — organiser only. Works for both standalone
            and competition rounds, any status. Empty saves NULL and falls
            back to the derived title. */}
        {isOrganizer && (
          <View style={styles.nameSection}>
            <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Round Name</Text>
            <TouchableOpacity
              style={[styles.nameButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={handleEditNamePress}
              activeOpacity={0.7}
              accessibilityLabel="Edit round name"
              accessibilityRole="button"
            >
              <Icon source="pencil-outline" size={20} color={colors.primary} />
              <View style={styles.nameButtonContent}>
                <Text
                  style={[
                    styles.nameButtonText,
                    { color: round.name ? colors.textPrimary : colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {round.name || derivedRoundTitle || 'Set a name'}
                </Text>
                {!round.name && derivedRoundTitle && (
                  <Text style={[styles.nameButtonSubtext, { color: colors.textSecondary }]}>
                    Using default title
                  </Text>
                )}
              </View>
              <Icon source="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Divider style={styles.divider} />
          </View>
        )}

        {/* Course Section — organiser can change the course while the
            round is still upcoming. Hidden once scoring has started. */}
        {canChangeCourse && (
          <View style={styles.courseSection}>
            <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Course</Text>
            <TouchableOpacity
              style={[styles.courseButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={handleChangeCoursePress}
              activeOpacity={0.7}
              disabled={isUpdatingCourse}
              accessibilityLabel="Change course"
              accessibilityRole="button"
            >
              <Icon source="golf" size={20} color={colors.primary} />
              <View style={styles.courseButtonContent}>
                <Text style={[styles.courseButtonText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {round.course?.name ?? 'Select a course'}
                </Text>
                {round.course?.club?.name && (
                  <Text style={[styles.courseButtonSubtext, { color: colors.textSecondary }]} numberOfLines={1}>
                    {round.course.club.name}
                  </Text>
                )}
              </View>
              <Icon source="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.courseHint, { color: colors.textSecondary }]}>
              Change the course for this round. This will reset the selected tee — you can pick a tee on the new course before play begins.
            </Text>
            <Divider style={styles.divider} />
          </View>
        )}

        {/* Game Setup Section */}
        <RoundGameSetupTab
          round={round}
          isOrganizer={isOrganizer}
          players={(roundPlayers || []) as Player[]}
          onScoringPairsEditPress={handleScoringPairsEditPress}
          onSkinsEditPress={handleSkinsEditPress}
        />

        {/* Pairing source — tap to edit when canEditPairings, otherwise
            read-only (manual + read-only collapses to nothing). */}
        {(round.pairing_source === 'current_standings' || canEditPairings) && (
          <View style={styles.pairingSummary}>
            <PairingSourceSummary
              pairingSource={round.pairing_source}
              pairingStyle={round.pairing_style}
              pairingMetric={round.pairing_metric}
              onPress={
                canEditPairings ? () => setShowEditPairingSheet(true) : undefined
              }
            />
          </View>
        )}

        {/* Submit Round — organiser force-submit while the round is in
            progress, even if some players haven't finished (they become DNF). */}
        {canForceSubmit && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.editTeesSection}>
              <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Submit Round</Text>
              <TouchableOpacity
                style={[
                  styles.editTeesButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  isForceSubmitting && { opacity: 0.6 },
                ]}
                onPress={() => setShowForceSubmitDialog(true)}
                disabled={isForceSubmitting}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Submit round now"
              >
                <Icon source="flag-checkered" size={20} color={colors.primary} />
                <Text style={[styles.editTeesButtonText, { color: colors.textPrimary }]}>
                  {isForceSubmitting ? 'Submitting…' : 'Submit Round Now'}
                </Text>
                <Icon source="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.editTeesHint, { color: colors.textSecondary }]}>
                Finalize this round now. Players who haven&apos;t finished will be marked Did Not Finish (no position or points). You can re-open the round later if needed.
              </Text>
            </View>
          </>
        )}

        {/* Scoring Section — organiser / super-admin only on a completed
            round. Gating on round.status (rather than scorecards.length)
            keeps the Recalculate lever available even when sync is still
            catching up and Supabase has zero scorecards for the round —
            exactly the failure mode this section exists to recover from.
            Edit Tees stays gated on scorecards existing because it edits
            per-scorecard tee data and would have nothing to operate on. */}
        {isOrganizer && round.status === 'completed' && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.editTeesSection}>
              <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Scoring</Text>

              {(scorecards?.length ?? 0) > 0 && (
                <>
                  <TouchableOpacity
                    style={[styles.editTeesButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    onPress={handleEditTeesPress}
                    activeOpacity={0.7}
                  >
                    <Icon source="golf-tee" size={20} color={colors.primary} />
                    <Text style={[styles.editTeesButtonText, { color: colors.textPrimary }]}>
                      Edit Tees & Recalculate
                    </Text>
                    <Icon source="chevron-right" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={[styles.editTeesHint, { color: colors.textSecondary }]}>
                    If the wrong tee was recorded at round start, change it here to recalculate daily handicap and stableford points.
                  </Text>
                </>
              )}

              {/* Recalculate Results — re-runs round_results finalization
                  against the existing scorecards. No tee data required.
                  Use after a rules change or engine fix when the team /
                  individual standings need a fresh pass. */}
              <TouchableOpacity
                style={[
                  styles.editTeesButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  (scorecards?.length ?? 0) > 0 && { marginTop: spacing.md },
                  isRecalculating && { opacity: 0.6 },
                ]}
                onPress={handleRecalculateResults}
                disabled={isRecalculating}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Recalculate round results"
              >
                <Icon source="refresh" size={20} color={colors.primary} />
                <Text style={[styles.editTeesButtonText, { color: colors.textPrimary }]}>
                  {isRecalculating ? 'Recalculating…' : 'Recalculate Results'}
                </Text>
                <Icon source="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.editTeesHint, { color: colors.textSecondary }]}>
                Re-runs the leaderboard calculation using the existing scorecards. Use after rule changes or if team / individual standings look wrong.
              </Text>

              {/* Force Sync Scorecards — manually push every locally-saved
                  completed scorecard for this round up to Supabase. Recovery
                  lever for cases where background sync silently failed and
                  the View Round screen / leaderboard read empty from the
                  server. */}
              <TouchableOpacity
                style={[
                  styles.editTeesButton,
                  { borderColor: colors.border, backgroundColor: colors.surface, marginTop: spacing.md },
                  isForceSyncing && { opacity: 0.6 },
                ]}
                onPress={handleForceSyncScorecards}
                disabled={isForceSyncing}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Force sync local scorecards to cloud"
              >
                <Icon source="cloud-upload" size={20} color={colors.primary} />
                <Text style={[styles.editTeesButtonText, { color: colors.textPrimary }]}>
                  {isForceSyncing ? 'Syncing…' : 'Force Sync Scorecards'}
                </Text>
                <Icon source="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.editTeesHint, { color: colors.textSecondary }]}>
                Pushes the locally-saved scorecards on this device up to the cloud. Use if scores entered on this phone aren&apos;t showing up on the leaderboard.
              </Text>

              {/* Re-open Round — flip back to in-progress so a DNF player can
                  finish. Competition status reverts automatically. */}
              {canReopen && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.editTeesButton,
                      { borderColor: colors.border, backgroundColor: colors.surface, marginTop: spacing.md },
                      isReopening && { opacity: 0.6 },
                    ]}
                    onPress={() => setShowReopenDialog(true)}
                    disabled={isReopening}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Re-open round"
                  >
                    <Icon source="lock-open-variant-outline" size={20} color={colors.primary} />
                    <Text style={[styles.editTeesButtonText, { color: colors.textPrimary }]}>
                      {isReopening ? 'Re-opening…' : 'Re-open Round'}
                    </Text>
                    <Icon source="chevron-right" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={[styles.editTeesHint, { color: colors.textSecondary }]}>
                    Sets the round back to in progress so players can finish. Re-submit or use Recalculate Results afterwards.
                  </Text>
                </>
              )}
            </View>
          </>
        )}

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

      {/* Force-submit confirmation (lists DNF players) */}
      <ForceSubmitRoundDialog
        visible={showForceSubmitDialog}
        roundId={roundId}
        loading={isForceSubmitting}
        onConfirm={handleForceSubmitConfirm}
        onCancel={() => setShowForceSubmitDialog(false)}
      />

      {/* Re-open confirmation */}
      <ConfirmationDialog
        visible={showReopenDialog}
        title="Re-open Round"
        message="This sets the round back to in progress so players can finish their scorecards. The competition status will update automatically."
        confirmLabel="Re-open"
        onConfirm={handleReopenConfirm}
        onCancel={() => setShowReopenDialog(false)}
        loading={isReopening}
        icon="lock-open-variant-outline"
      />

      {/* Edit Tees Sheet */}
      <EditTeesSheet
        visible={showEditTeesSheet}
        onClose={handleEditTeesClose}
        roundId={roundId}
        competitionId={competitionId}
        availableTees={round.course?.tees ?? []}
        scorecards={scorecards ?? []}
        roundPlayers={roundPlayers}
        currentTees={roundPlayerTees ?? new Map()}
        roundDefaultTee={round.selected_tee ?? null}
      />

      {/* Bottom Sheets */}
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

      {/* Course Selection Modal */}
      <CourseSelectionModal
        visible={showCourseModal}
        onClose={handleCourseModalClose}
        onSelect={handleCourseSelect}
        searchQuery={courseSearchQuery}
        onSearchQueryChange={setCourseSearchQuery}
      />

      {/* Edit Round Name Sheet */}
      <EditRoundNameSheet
        visible={showEditNameSheet}
        onDismiss={handleEditNameClose}
        roundId={roundId}
        currentName={round.name ?? null}
        derivedTitle={derivedRoundTitle || undefined}
      />

      {/* Edit Pairing Config Sheet — mounted only when there's a competition
          (standings-based pairing only makes sense for competition rounds). */}
      {competitionId && (
        <EditPairingConfigSheet
          visible={showEditPairingSheet}
          onDismiss={() => setShowEditPairingSheet(false)}
          roundId={roundId}
          competitionId={competitionId}
          roundNumber={round.round_number}
          presetConfig={{
            round_format: round.round_format,
            sub_match_size: round.sub_match_size,
          }}
          teeTime={round.tee_time}
          isTeamRound={round.is_team_round}
          teams={teams}
          players={(roundPlayers ?? []).map((p) => ({ id: p.id }))}
          initial={{
            source: round.pairing_source,
            style: round.pairing_style,
            metric: round.pairing_metric,
          }}
        />
      )}
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
  editTeesSection: {
    gap: spacing.sm,
  },
  sectionHeader: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  editTeesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    height: 52,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  editTeesButtonText: {
    ...typography.bodyBold,
    flex: 1,
  },
  editTeesHint: {
    ...typography.caption,
  },
  courseSection: {
    gap: spacing.sm,
  },
  courseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.sm,
  },
  courseButtonContent: {
    flex: 1,
  },
  courseButtonText: {
    ...typography.bodyBold,
  },
  courseButtonSubtext: {
    ...typography.caption,
    marginTop: 2,
  },
  courseHint: {
    ...typography.caption,
  },
  nameSection: {
    gap: spacing.sm,
  },
  nameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.sm,
  },
  nameButtonContent: {
    flex: 1,
  },
  nameButtonText: {
    ...typography.bodyBold,
  },
  nameButtonSubtext: {
    ...typography.caption,
    marginTop: 2,
  },
  pairingSummary: {
    marginTop: spacing.md,
  },
});
