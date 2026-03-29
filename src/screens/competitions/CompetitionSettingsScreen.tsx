/**
 * CompetitionSettingsScreen - Admin settings for a competition
 *
 * - Edit name/description
 * - Share invite code
 * - Delete competition
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { PageHeader, FormInput, ConfirmationDialog, SectionHeader } from '@/components/common';
import { LoadingSpinner } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { useConfirmationDialog } from '@/hooks';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useCompetitionData } from '@/screens/admin/EditCompetitionScreen/hooks/useCompetitionData';
import { useCompetitionSubmission } from '@/screens/admin/EditCompetitionScreen/hooks/useCompetitionSubmission';
import { useDeleteCompetition } from '@/screens/competitions/CompetitionDetailScreen/hooks/useDeleteCompetition';
import type { EditCompetitionFormData } from '@/screens/admin/EditCompetitionScreen/hooks/useCompetitionValidation';

type Props = NativeStackScreenProps<RootStackParamList, 'CompetitionSettings'>;

export default function CompetitionSettingsScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const { competitionId } = route.params;
  const { dialogConfig: alertDialogConfig, showAlert, dismissDialog: dismissAlertDialog } = useConfirmationDialog();

  const { competition, isLoading, error } = useCompetitionData({ competitionId });

  // Local form state (following LeagueSettingsScreen pattern)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync form state when competition data loads
  useEffect(() => {
    if (competition) {
      setName(competition.name);
      setDescription(competition.description || '');
    }
  }, [competition]);

  // Submission hook
  const {
    handleSubmit: submitUpdate,
    isSubmitting,
    dialogConfig: submissionDialogConfig,
    dismissDialog: dismissSubmissionDialog,
  } = useCompetitionSubmission({
    competitionId,
    onSuccess: () => {
      setHasChanges(false);
      Alert.alert('Saved', 'Competition settings updated.');
    },
  });

  // Delete hook
  const {
    showDeleteDialog,
    setShowDeleteDialog,
    isDeleting,
    handleDeleteCompetition,
  } = useDeleteCompetition({
    id: competitionId,
    onDeleted: () => {
      // Go back to the competitions list (pop past CompetitionDetail)
      navigation.popToTop();
    },
    showAlert,
  });

  const handleNameChange = useCallback((text: string) => {
    setName(text);
    setHasChanges(true);
  }, []);

  const handleDescriptionChange = useCallback((text: string) => {
    setDescription(text);
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!hasChanges || name.trim().length < 3) return;
    if (!competition) return;

    const formData: EditCompetitionFormData = {
      name: name.trim(),
      description: description.trim() || undefined,
      competitionType: competition.competition_type,
      teamMode: competition.team_mode,
      startDate: competition.start_date,
      endDate: competition.end_date || undefined,
    };

    submitUpdate(formData);
  }, [hasChanges, name, description, competition, submitUpdate]);

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

  // Loading state
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

  // Error state
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

  const isArchived = competition.status === 'completed' || competition.status === 'cancelled';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Competition Settings"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Edit Details */}
        {!isArchived && (
          <View style={styles.section}>
            <SectionHeader title="Details" />

            <FormInput
              label="Competition Name"
              floatingLabel
              placeholder="Competition name"
              value={name}
              onChangeText={handleNameChange}
              maxLength={50}
              accessibilityHint="Edit competition name"
            />

            <FormInput
              label="Description"
              floatingLabel
              placeholder="Optional description"
              value={description}
              onChangeText={handleDescriptionChange}
              maxLength={500}
              multiline
              numberOfLines={3}
              accessibilityHint="Edit competition description"
            />

            <View style={[styles.infoBox, { backgroundColor: colors.primaryLighter }]}>
              <Icon source="information-outline" size={16} color={colors.primaryDark} />
              <Text style={[styles.infoText, { color: colors.primaryDark }]}>
                Competition type, handicap system, and dates can be changed from the Edit Competition screen.
              </Text>
            </View>

            {hasChanges && (
              <TouchableOpacity
                onPress={handleSave}
                disabled={name.trim().length < 3 || isSubmitting}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor:
                      name.trim().length >= 3 ? colors.primary : colors.gray200,
                  },
                ]}
                activeOpacity={0.7}
                accessibilityLabel="Save changes"
              >
                <Text
                  style={[
                    styles.saveButtonText,
                    {
                      color:
                        name.trim().length >= 3 ? colors.white : colors.textSecondary,
                    },
                  ]}
                >
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
        {/* TODO: Add per-player tee assignment UI here.
            Use updateCompetitionPlayerTee() and upsertRoundPlayerTee() from competitionPlayersService
            to allow organisers to set default tees per-player and per-round overrides. */}

        {/* Delete Competition */}
        {!isArchived && (
          <>
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
                All rounds, scores, and player data will be permanently removed. This action cannot be undone.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Delete Confirmation Dialog */}
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

      {/* Alert Dialog */}
      <ConfirmationDialog {...alertDialogConfig} onCancel={dismissAlertDialog} />

      {/* Submission Error Dialog */}
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
});
