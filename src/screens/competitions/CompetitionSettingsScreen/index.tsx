/**
 * CompetitionSettingsScreen - Admin-only utilities for a competition.
 *
 * Organizer-only editing of the competition name and description lives here,
 * alongside the two concerns this screen already owned:
 * - Sharing the invite code
 * - Deleting the competition
 *
 * Other per-field edits (dates, handicap system, team settings) still live
 * on the Details tab.
 */

import React, { useCallback, useState } from 'react';
import { ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Divider, Icon, Text } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import {
  ConfirmationDialog,
  LoadingSpinner,
  PageHeader,
  SectionHeader,
} from '@/components/common';
import {
  EditDescriptionSheet,
  EditNameSheet,
} from '@/components/competitions/detail/sections/sheets';
import { useThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useConfirmationDialog } from '@/hooks';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useDeleteCompetition } from '@/screens/competitions/CompetitionDetailScreen/hooks/useDeleteCompetition';

import { useCompetitionData } from './hooks';

type Props = NativeStackScreenProps<RootStackParamList, 'CompetitionSettings'>;

export default function CompetitionSettingsScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const { competitionId } = route.params;
  const { user } = useAuth();
  const {
    dialogConfig: alertDialogConfig,
    showAlert,
    dismissDialog: dismissAlertDialog,
  } = useConfirmationDialog();

  const { competition, isLoading, error } = useCompetitionData({ competitionId });

  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [isEditDescriptionOpen, setIsEditDescriptionOpen] = useState(false);

  const isOrganizer = !!user && !!competition && competition.organizer_id === user.id;

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Competition Settings"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        {/* Details - organizer only */}
        {isOrganizer && (
          <>
            <View style={styles.section}>
              <SectionHeader title="Details" />
              <TouchableOpacity
                onPress={() => setIsEditNameOpen(true)}
                style={[styles.editRow, { backgroundColor: colors.surface }]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Edit competition name"
              >
                <View style={styles.editRowText}>
                  <Text style={[styles.editLabel, { color: colors.textSecondary }]}>
                    Name
                  </Text>
                  <Text
                    style={[styles.editValue, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {competition.name}
                  </Text>
                </View>
                <Icon source="pencil-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsEditDescriptionOpen(true)}
                style={[styles.editRow, { backgroundColor: colors.surface, marginTop: spacing.sm }]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Edit competition description"
              >
                <View style={styles.editRowText}>
                  <Text style={[styles.editLabel, { color: colors.textSecondary }]}>
                    Description
                  </Text>
                  <Text
                    style={[
                      styles.editValue,
                      {
                        color: competition.description
                          ? colors.textPrimary
                          : colors.textSecondary,
                        fontStyle: competition.description ? 'normal' : 'italic',
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {competition.description || 'Add a description'}
                  </Text>
                </View>
                <Icon source="pencil-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
          </>
        )}

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

        <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Danger Zone */}
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

      {isOrganizer && (
        <>
          <EditNameSheet
            visible={isEditNameOpen}
            onDismiss={() => setIsEditNameOpen(false)}
            competitionId={competitionId}
            currentName={competition.name}
          />
          <EditDescriptionSheet
            visible={isEditDescriptionOpen}
            onDismiss={() => setIsEditDescriptionOpen(false)}
            competitionId={competitionId}
            currentDescription={competition.description}
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
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  editRowText: {
    flex: 1,
    gap: spacing.xs,
  },
  editLabel: {
    ...typography.caption,
  },
  editValue: {
    ...typography.body,
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
