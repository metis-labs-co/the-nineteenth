/**
 * CompetitionSettingsScreen - Admin-only utilities for a competition.
 *
 * All inline editing of competition metadata now happens on the Details tab
 * via per-field bottom sheets, so this screen exists only for the two
 * concerns that didn't have a natural home there:
 * - Sharing the invite code
 * - Deleting the competition
 */

import React, { useCallback } from 'react';
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
import { useThemeColors } from '@/context/ThemeContext';
import { useConfirmationDialog } from '@/hooks';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useDeleteCompetition } from '@/screens/competitions/CompetitionDetailScreen/hooks/useDeleteCompetition';

import { useCompetitionData } from './hooks';

type Props = NativeStackScreenProps<RootStackParamList, 'CompetitionSettings'>;

export default function CompetitionSettingsScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const { competitionId } = route.params;
  const {
    dialogConfig: alertDialogConfig,
    showAlert,
    dismissDialog: dismissAlertDialog,
  } = useConfirmationDialog();

  const { competition, isLoading, error } = useCompetitionData({ competitionId });

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
