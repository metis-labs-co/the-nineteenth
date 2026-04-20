/**
 * CompetitionSettingsScreen - Admin settings for a competition
 *
 * Single place to edit all configurable competition details:
 * - Name / description
 * - Competition type (Event / Knockout) — locked once scoring has started
 * - Format / team mode (Individual / Teams) — locked once scoring has started
 * - Start / end dates
 * - Per-player tee selection
 * - Invite code (share)
 * - Delete competition
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Divider, Icon, Text } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import {
  ConfirmationDialog,
  FormSection,
  LoadingSpinner,
  PageHeader,
  SectionHeader,
} from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { useConfirmationDialog } from '@/hooks';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import { useDeleteCompetition } from '@/screens/competitions/CompetitionDetailScreen/hooks/useDeleteCompetition';
import { supabase } from '@/services/supabase/client';
import { competitionPlayersService } from '@/services/competitionPlayers/competitionPlayersService';
import { getTeeColor } from '@/screens/rounds/CreateRoundBottomSheet/types';
import type { TeeBox } from '@/types/database.types';

import { CompetitionBasicInfo, CompetitionSettings } from './components';
import {
  useCompetitionData,
  useCompetitionSubmission,
  useEditCompetitionForm,
} from './hooks';

type Props = NativeStackScreenProps<RootStackParamList, 'CompetitionSettings'>;

export default function CompetitionSettingsScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const { competitionId } = route.params;
  const {
    dialogConfig: alertDialogConfig,
    showAlert,
    dismissDialog: dismissAlertDialog,
  } = useConfirmationDialog();

  const { competition, hasStartedRound, isLoading, error } = useCompetitionData({
    competitionId,
  });

  // Form state — react-hook-form backed
  const {
    control,
    handleSubmit,
    errors,
    isDirty,
    competitionType,
    teamMode,
    startDateParsed,
    handleCompetitionTypeChange,
    handleTeamModeChange,
    handleStartDateChange,
    handleEndDateChange,
  } = useEditCompetitionForm({ competition });

  // Per-player tee selection state (kept local, saves optimistically)
  const [players, setPlayers] = useState<
    {
      player_id: string;
      selected_tee: TeeBox | null;
      players: { id: string; name: string; handicap: number | null };
    }[]
  >([]);
  const [availableTees, setAvailableTees] = useState<TeeBox[]>([]);

  useEffect(() => {
    if (!competitionId) return;

    supabase
      .from('competition_players')
      .select('player_id, selected_tee, players!player_id(id, name, handicap)')
      .eq('competition_id', competitionId)
      .eq('status', 'accepted')
      .then(({ data }) => {
        if (data) {
          setPlayers(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (data as any[]).map((d) => ({
              player_id: d.player_id,
              selected_tee: d.selected_tee as TeeBox | null,
              players: d.players as { id: string; name: string; handicap: number | null },
            })),
          );
        }
      });

    supabase
      .from('rounds')
      .select('id, round_number, courses!course_id(id, name, tees)')
      .eq('competition_id', competitionId)
      .order('round_number')
      .then(({ data }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const firstRoundCourse = (data as any)?.[0]?.courses;
        if (firstRoundCourse?.tees) {
          setAvailableTees(firstRoundCourse.tees as TeeBox[]);
        }
      });
  }, [competitionId]);

  // Save competition detail changes
  const {
    handleSubmit: submitUpdate,
    isSubmitting,
    dialogConfig: submissionDialogConfig,
    dismissDialog: dismissSubmissionDialog,
  } = useCompetitionSubmission({
    competitionId,
    onSuccess: () => {
      Alert.alert('Saved', 'Competition settings updated.');
    },
  });

  // Delete
  const {
    showDeleteDialog,
    setShowDeleteDialog,
    isDeleting,
    handleDeleteCompetition,
  } = useDeleteCompetition({
    id: competitionId,
    onDeleted: () => navigation.popToTop(),
    showAlert,
  });

  const handleTeeChange = useCallback(
    async (playerId: string, tee: TeeBox) => {
      const previousPlayers = players;
      setPlayers((prev) =>
        prev.map((p) => (p.player_id === playerId ? { ...p, selected_tee: tee } : p)),
      );
      try {
        await competitionPlayersService.updateCompetitionPlayerTee(competitionId, playerId, tee);
      } catch {
        setPlayers(previousPlayers);
        Alert.alert('Error', 'Failed to update tee selection. Please try again.');
      }
    },
    [competitionId, players],
  );

  const handleShare = useCallback(async () => {
    if (!competition) return;
    try {
      await Share.share({
        message: `Join my competition "${competition.name}" on The Nineteenth! Use code: ${competition.invite_code}`,
      });
    } catch {
      // User cancelled
    }
  }, [competition]);

  // Loading
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Competition Settings" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContent}>
          <LoadingSpinner size="lg" />
        </View>
      </View>
    );
  }

  // Error
  if (error || !competition) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Competition Settings" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContent}>
          <Icon source="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error?.message || 'Competition not found'}
          </Text>
        </View>
      </View>
    );
  }

  const isArchived =
    competition.status === 'completed' || competition.status === 'cancelled';
  const structureLocked = hasStartedRound;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Competition Settings"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        {/* Details */}
        {!isArchived && (
          <View style={styles.section}>
            <SectionHeader title="Details" />
            <FormSection>
              <CompetitionBasicInfo control={control} errors={errors} />
              <CompetitionSettings
                control={control}
                errors={errors}
                competitionType={competitionType}
                teamMode={teamMode}
                startDateParsed={startDateParsed}
                onCompetitionTypeChange={handleCompetitionTypeChange}
                onTeamModeChange={handleTeamModeChange}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                structureLocked={structureLocked}
              />
            </FormSection>

            {structureLocked && (
              <View style={[styles.infoBox, { backgroundColor: colors.primaryLighter }]}>
                <Icon source="information-outline" size={16} color={colors.primaryDark} />
                <Text style={[styles.infoText, { color: colors.primaryDark }]}>
                  Competition type and format are locked once scoring has started.
                </Text>
              </View>
            )}

            {isDirty && (
              <TouchableOpacity
                onPress={handleSubmit(submitUpdate)}
                disabled={isSubmitting}
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                activeOpacity={0.7}
                accessibilityLabel="Save changes"
                accessibilityRole="button"
                accessibilityState={{ disabled: isSubmitting }}
              >
                <Text style={[styles.saveButtonText, { color: colors.white }]}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Invite Code */}
        <View style={styles.section}>
          <SectionHeader title="Invite Code" />
          <TouchableOpacity
            onPress={handleShare}
            style={[styles.inviteRow, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
            accessibilityLabel="Share invite code"
          >
            <Icon source="share-variant-outline" size={20} color={colors.primary} />
            <Text style={[styles.inviteCode, { color: colors.primary }]}>
              {competition.invite_code}
            </Text>
            <Text style={[styles.shareTap, { color: colors.textSecondary }]}>
              Tap to share
            </Text>
          </TouchableOpacity>
        </View>

        {/* Player Tees */}
        {players.length > 0 && (
          <>
            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.section}>
              <SectionHeader title="Player Tees" />
              {availableTees.length === 0 ? (
                <Text style={[styles.noTeesText, { color: colors.textSecondary }]}>
                  No tee data available for this course
                </Text>
              ) : (
                players.map((cp) => {
                  const player = cp.players;
                  if (!player) return null;

                  return (
                    <View
                      key={cp.player_id}
                      style={[styles.playerTeeRow, { backgroundColor: colors.surface }]}
                    >
                      <View style={styles.playerTeeInfo}>
                        <Text
                          style={[styles.playerTeeName, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {player.name}
                        </Text>
                        {player.handicap != null && (
                          <Text
                            style={[styles.playerTeeHandicap, { color: colors.textSecondary }]}
                          >
                            HC {player.handicap}
                          </Text>
                        )}
                      </View>

                      <View style={styles.teePillsRow}>
                        {availableTees.map((tee) => {
                          const isSelected =
                            cp.selected_tee?.name === tee.name &&
                            cp.selected_tee?.color === tee.color;
                          const dotColor = getTeeColor(tee.color, colors.textSecondary);

                          return (
                            <TouchableOpacity
                              key={`${tee.name}-${tee.color}`}
                              onPress={() => handleTeeChange(cp.player_id, tee)}
                              style={[
                                styles.teePill,
                                {
                                  borderWidth: 1,
                                  borderColor: isSelected ? colors.primary : colors.border,
                                  backgroundColor: isSelected
                                    ? `${colors.primary}26`
                                    : 'transparent',
                                },
                              ]}
                              activeOpacity={0.7}
                              accessibilityLabel={`Select ${tee.name} tee for ${player.name}`}
                            >
                              <View
                                style={[
                                  styles.teeDot,
                                  {
                                    backgroundColor: dotColor,
                                    borderWidth:
                                      tee.color.toLowerCase() === 'white' ? 1 : 0,
                                    borderColor: colors.border,
                                  },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.teePillText,
                                  {
                                    color: isSelected
                                      ? colors.primary
                                      : colors.textSecondary,
                                  },
                                ]}
                              >
                                {tee.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        {/* Delete */}
        <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.section}>
          <SectionHeader title="Danger Zone" />
          <TouchableOpacity
            onPress={() => setShowDeleteDialog(true)}
            style={[styles.deleteButton, { borderColor: colors.error }]}
            activeOpacity={0.7}
            accessibilityLabel="Delete this competition"
          >
            <Icon source="delete-outline" size={20} color={colors.error} />
            <Text style={[styles.deleteButtonText, { color: colors.error }]}>
              Delete Competition
            </Text>
          </TouchableOpacity>
          <Text style={[styles.deleteHint, { color: colors.textSecondary }]}>
            All rounds, scores, and player data will be permanently removed. This action
            cannot be undone.
          </Text>
        </View>
      </ScrollView>

      <ConfirmationDialog
        visible={showDeleteDialog}
        title="Delete Competition"
        message="Are you sure you want to delete this competition? All rounds, scores, and player data will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        icon="alert-circle-outline"
        onConfirm={handleDeleteCompetition}
        onCancel={() => setShowDeleteDialog(false)}
        loading={isDeleting}
      />

      <ConfirmationDialog {...alertDialogConfig} onCancel={dismissAlertDialog} />
      <ConfirmationDialog {...submissionDialogConfig} onCancel={dismissSubmissionDialog} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  divider: {
    marginHorizontal: spacing.lg,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },
  saveButton: {
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    ...shadows.sm,
  },
  saveButtonText: {
    ...typography.bodyBold,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  inviteCode: {
    ...typography.bodyBold,
    flex: 1,
  },
  shareTap: {
    ...typography.caption,
  },
  deleteButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  deleteButtonText: {
    ...typography.bodyBold,
  },
  deleteHint: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
  },
  noTeesText: {
    ...typography.body,
    fontStyle: 'italic',
  },
  playerTeeRow: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  playerTeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playerTeeName: {
    ...typography.bodyBold,
    flex: 1,
  },
  playerTeeHandicap: {
    ...typography.caption,
  },
  teePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  teePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  teeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  teePillText: {
    ...typography.caption,
  },
});
