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
  EditWhatsAppLinkSheet,
} from '@/components/competitions/detail/sections/sheets';
import { useThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useConfirmationDialog } from '@/hooks';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useDeleteCompetition } from '@/screens/competitions/CompetitionDetailScreen/hooks/useDeleteCompetition';
import { openWhatsAppGroup, shareWhatsAppLink } from '@/utils/whatsapp';

import { useCompetitionData } from './hooks';
import { useCompetitionPrizePools } from '@/hooks/prizePool';
import { useCheckFeature } from '@/context/SubscriptionContext';
import { EditPrizePoolBottomSheet, type PoolTabKey } from '@/components/prizePool';
import { useTeams } from '@/hooks/rounds/teams';

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

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

  const {
    competition,
    isLoading,
    error,
    playerCount,
    roundCount,
    hasStartedRound,
  } = useCompetitionData({ competitionId });

  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [isEditDescriptionOpen, setIsEditDescriptionOpen] = useState(false);
  const [isEditWhatsAppOpen, setIsEditWhatsAppOpen] = useState(false);

  // Prize pool section state
  const { data: pools } = useCompetitionPrizePools(competitionId);
  const { data: teams } = useTeams(competitionId);
  const teamCount = teams?.length ?? 0;
  const checkFeature = useCheckFeature();
  const isPremium = checkFeature('prize_pool').allowed;
  const teamModeAllowed = competition?.team_mode === 'fixed';
  const [poolSheetTab, setPoolSheetTab] = useState<PoolTabKey | null>(null);

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

  const whatsappUrl = competition?.whatsapp_group_invite_url ?? null;

  const handleOpenWhatsApp = useCallback(() => {
    if (whatsappUrl) {
      void openWhatsAppGroup(whatsappUrl);
    }
  }, [whatsappUrl]);

  const handleShareWhatsApp = useCallback(() => {
    if (whatsappUrl && competition) {
      void shareWhatsAppLink(whatsappUrl, competition.name);
    }
  }, [whatsappUrl, competition]);

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

        {/* WhatsApp Group */}
        {(isOrganizer || !!whatsappUrl) && (
          <>
            <View style={styles.section}>
              <SectionHeader title="WhatsApp Group" />

              {isOrganizer && !whatsappUrl && (
                <TouchableOpacity
                  onPress={() => setIsEditWhatsAppOpen(true)}
                  style={[styles.whatsappRow, { backgroundColor: colors.surface }]}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Add WhatsApp group invite link"
                >
                  <Icon source="whatsapp" size={22} color={colors.primary} />
                  <View style={styles.whatsappRowText}>
                    <Text style={[styles.whatsappLabel, { color: colors.textPrimary }]}>
                      Add WhatsApp Group
                    </Text>
                    <Text
                      style={[styles.whatsappSubtitle, { color: colors.textSecondary }]}
                    >
                      Let members join your group chat with one tap
                    </Text>
                  </View>
                  <Icon source="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}

              {isOrganizer && whatsappUrl && (
                <>
                  <TouchableOpacity
                    onPress={() => setIsEditWhatsAppOpen(true)}
                    style={[styles.whatsappRow, { backgroundColor: colors.surface }]}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Edit WhatsApp group invite link"
                  >
                    <Icon source="whatsapp" size={22} color={colors.primary} />
                    <View style={styles.whatsappRowText}>
                      <Text
                        style={[styles.whatsappLabel, { color: colors.textPrimary }]}
                      >
                        Group invite link
                      </Text>
                      <Text
                        style={[styles.whatsappSubtitle, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {whatsappUrl}
                      </Text>
                    </View>
                    <Icon source="pencil-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleOpenWhatsApp}
                    style={[
                      styles.whatsappRow,
                      { backgroundColor: colors.surface, marginTop: spacing.sm },
                    ]}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Open WhatsApp group"
                  >
                    <Icon source="open-in-new" size={20} color={colors.primary} />
                    <Text style={[styles.whatsappLabel, { color: colors.primary, flex: 1 }]}>
                      Open in WhatsApp
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleShareWhatsApp}
                    style={[
                      styles.whatsappRow,
                      { backgroundColor: colors.surface, marginTop: spacing.sm },
                    ]}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Share WhatsApp group link with members"
                  >
                    <Icon source="share-variant-outline" size={20} color={colors.primary} />
                    <Text style={[styles.whatsappLabel, { color: colors.primary, flex: 1 }]}>
                      Share with members
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {!isOrganizer && !!whatsappUrl && (
                <TouchableOpacity
                  onPress={handleOpenWhatsApp}
                  style={[styles.whatsappRow, { backgroundColor: colors.surface }]}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Join WhatsApp group"
                >
                  <Icon source="whatsapp" size={22} color={colors.primary} />
                  <View style={styles.whatsappRowText}>
                    <Text style={[styles.whatsappLabel, { color: colors.textPrimary }]}>
                      Join WhatsApp Group
                    </Text>
                    <Text
                      style={[styles.whatsappSubtitle, { color: colors.textSecondary }]}
                    >
                      Tap to open the group in WhatsApp
                    </Text>
                  </View>
                  <Icon source="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
          </>
        )}

        {/* Prize Pools — organizer only */}
        {isOrganizer && (
          <>
            <View style={styles.section}>
              <SectionHeader title="Prize Pools" />

              {!isPremium ? (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Subscription' as never)}
                  style={[styles.poolRow, { backgroundColor: colors.surface }]}
                  activeOpacity={0.7}
                  accessibilityLabel="Upgrade to Premium for prize pools"
                >
                  <View style={styles.poolRowText}>
                    <Text style={[styles.poolLabel, { color: colors.textPrimary }]}>
                      Prize Pools
                    </Text>
                    <Text style={[styles.poolSubtitle, { color: colors.textSecondary }]}>
                      Upgrade to Premium to fund pools and reward top finishers
                    </Text>
                  </View>
                  <Icon source="lock-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => setPoolSheetTab('individual')}
                    style={[styles.poolRow, { backgroundColor: colors.surface }]}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Edit individual prize pool"
                  >
                    <View style={styles.poolRowText}>
                      <Text style={[styles.poolLabel, { color: colors.textPrimary }]}>
                        Individual Prize Pool
                      </Text>
                      <Text
                        style={[styles.poolSubtitle, { color: colors.textSecondary }]}
                      >
                        {pools?.individual
                          ? `${formatMoney(
                              pools.individual.total_pool_amount,
                              pools.individual.currency
                            )}${pools.individual.is_locked ? ' · locked' : ''}`
                          : 'Not configured'}
                      </Text>
                    </View>
                    <Icon source="chevron-right" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {teamModeAllowed && (
                    <TouchableOpacity
                      onPress={() => setPoolSheetTab('team')}
                      style={[
                        styles.poolRow,
                        { backgroundColor: colors.surface, marginTop: spacing.sm },
                      ]}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Edit team prize pool"
                    >
                      <View style={styles.poolRowText}>
                        <Text style={[styles.poolLabel, { color: colors.textPrimary }]}>
                          Team Prize Pool
                        </Text>
                        <Text
                          style={[styles.poolSubtitle, { color: colors.textSecondary }]}
                        >
                          {pools?.team
                            ? `${formatMoney(
                                pools.team.total_pool_amount,
                                pools.team.currency
                              )}${pools.team.is_locked ? ' · locked' : ''}`
                            : 'Not configured'}
                        </Text>
                      </View>
                      <Icon source="chevron-right" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
          </>
        )}

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
            The competition is hidden immediately and permanently removed after 90 days. You can undo right after deleting.
          </Text>
        </View>
      </ScrollView>

      <ConfirmationDialog
        visible={showDeleteDialog}
        title="Delete Competition"
        message="Delete this competition? It's hidden right away and permanently removed after 90 days — you can undo immediately after."
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
          <EditWhatsAppLinkSheet
            visible={isEditWhatsAppOpen}
            onDismiss={() => setIsEditWhatsAppOpen(false)}
            competitionId={competitionId}
            currentUrl={competition.whatsapp_group_invite_url}
          />
          <EditPrizePoolBottomSheet
            visible={poolSheetTab !== null}
            onClose={() => setPoolSheetTab(null)}
            competitionId={competitionId}
            playerCount={playerCount}
            teamCount={teamCount}
            roundCount={roundCount}
            hasStartedRound={hasStartedRound}
            teamModeAllowed={teamModeAllowed}
            initialTab={poolSheetTab ?? 'individual'}
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
  poolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  poolRowText: {
    flex: 1,
    gap: spacing.xs,
  },
  poolLabel: {
    ...typography.body,
    fontWeight: '600',
  },
  poolSubtitle: {
    ...typography.caption,
  },
  whatsappRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  whatsappRowText: {
    flex: 1,
    gap: spacing.xs,
  },
  whatsappLabel: {
    ...typography.body,
    fontWeight: '600',
  },
  whatsappSubtitle: {
    ...typography.caption,
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
