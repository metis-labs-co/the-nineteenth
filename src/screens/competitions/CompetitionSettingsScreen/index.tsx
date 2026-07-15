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
 *
 * Redesign (P9): grouped list sections — uppercase SectionLabel headings over
 * surface list-cards (radius 16, rows separated by surfaceVariant hairlines),
 * with a danger card at the bottom. Visibility/Notifications/Archive groups
 * from the design are intentionally omitted: no backing settings exist.
 */

import React, { useCallback, useState } from 'react';
import { ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import {
  ConfirmationDialog,
  LoadingSpinner,
  PageHeader,
  SectionLabel,
} from '@/components/common';
import {
  EditDescriptionSheet,
  EditNameSheet,
  EditWhatsAppLinkSheet,
} from '@/components/competitions/detail/sections/sheets';
import { useThemeColors } from '@/context/ThemeContext';
import type { ColorPalette } from '@/constants/theme';
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

/** Surface list-card: radius 16, hairline border, children are rows. */
function SettingsCard({
  colors,
  children,
}: {
  colors: ColorPalette;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

interface SettingsRowProps {
  colors: ColorPalette;
  /** Muted label (value rows) or bold title (when `sub` / `bold` is set). */
  label: string;
  /** Bold value shown on the right. */
  value?: string;
  /** Render value muted + italic (e.g. "Not set"). */
  valueMuted?: boolean;
  /** Muted 12px sub-line under a bold label. */
  sub?: string;
  /** Render the label bold even without a sub-line (action rows). */
  bold?: boolean;
  /** Leading icon name (Material Community). */
  leadingIcon?: string;
  leadingIconColor?: string;
  /** Trailing icon; defaults to chevron-right. Pass null to hide. */
  trailingIcon?: string | null;
  trailingIconColor?: string;
  /** Tint for bold label text (e.g. colors.error for danger rows). */
  labelColor?: string;
  isLast?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

/**
 * List-card row: muted 14.5 label left + bold 14.5 value right + chevron,
 * or bold label + 12px muted sub-line for action rows.
 */
function SettingsRow({
  colors,
  label,
  value,
  valueMuted,
  sub,
  bold,
  leadingIcon,
  leadingIconColor,
  trailingIcon = 'chevron-right',
  trailingIconColor,
  labelColor,
  isLast,
  onPress,
  accessibilityLabel,
}: SettingsRowProps) {
  const isTitleRow = bold || !!sub;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.row,
        !isLast && [styles.rowBorder, { borderBottomColor: colors.surfaceVariant }],
      ]}
    >
      {leadingIcon && (
        <Icon
          source={leadingIcon}
          size={19}
          color={leadingIconColor ?? colors.textSecondary}
        />
      )}

      {isTitleRow ? (
        <View style={styles.rowText}>
          <Text
            style={[styles.rowTitle, { color: labelColor ?? colors.textPrimary }]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {!!sub && (
            <Text
              style={[styles.rowSub, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {sub}
            </Text>
          )}
        </View>
      ) : (
        <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      )}

      {value !== undefined && (
        <Text
          style={[
            styles.rowValue,
            valueMuted
              ? { color: colors.textSecondary, fontStyle: 'italic', fontWeight: '500' }
              : { color: colors.textPrimary },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      )}

      {trailingIcon !== null && (
        <Icon
          source={trailingIcon}
          size={18}
          color={trailingIconColor ?? colors.textTertiary}
        />
      )}
    </TouchableOpacity>
  );
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

  const individualPoolValue = pools?.individual
    ? `${formatMoney(
        pools.individual.total_pool_amount,
        pools.individual.currency
      )}${pools.individual.is_locked ? ' · Locked' : ''}`
    : undefined;
  const teamPoolValue = pools?.team
    ? `${formatMoney(pools.team.total_pool_amount, pools.team.currency)}${
        pools.team.is_locked ? ' · Locked' : ''
      }`
    : undefined;

  const showWhatsAppSection = isOrganizer || !!whatsappUrl;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Competition Settings"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        {/* Competition — organizer only */}
        {isOrganizer && (
          <View style={styles.section}>
            <SectionLabel>Competition</SectionLabel>
            <SettingsCard colors={colors}>
              <SettingsRow
                colors={colors}
                label="Name"
                value={competition.name}
                onPress={() => setIsEditNameOpen(true)}
                accessibilityLabel="Edit competition name"
              />
              <SettingsRow
                colors={colors}
                label="Description"
                value={competition.description || 'Add a description'}
                valueMuted={!competition.description}
                onPress={() => setIsEditDescriptionOpen(true)}
                accessibilityLabel="Edit competition description"
                isLast
              />
            </SettingsCard>
          </View>
        )}

        {/* Prize Pools — organizer only */}
        {isOrganizer && (
          <View style={styles.section}>
            <SectionLabel>Prize pools</SectionLabel>
            <SettingsCard colors={colors}>
              {!isPremium ? (
                <SettingsRow
                  colors={colors}
                  label="Prize pools"
                  sub="Upgrade to Premium to fund pools and reward top finishers"
                  trailingIcon="lock-outline"
                  trailingIconColor={colors.textSecondary}
                  onPress={() => navigation.navigate('Subscription' as never)}
                  accessibilityLabel="Upgrade to Premium for prize pools"
                  isLast
                />
              ) : (
                <>
                  <SettingsRow
                    colors={colors}
                    label="Individual pool"
                    value={individualPoolValue ?? 'Not configured'}
                    valueMuted={!individualPoolValue}
                    onPress={() => setPoolSheetTab('individual')}
                    accessibilityLabel="Edit individual prize pool"
                    isLast={!teamModeAllowed}
                  />
                  {teamModeAllowed && (
                    <SettingsRow
                      colors={colors}
                      label="Team pool"
                      value={teamPoolValue ?? 'Not configured'}
                      valueMuted={!teamPoolValue}
                      onPress={() => setPoolSheetTab('team')}
                      accessibilityLabel="Edit team prize pool"
                      isLast
                    />
                  )}
                </>
              )}
            </SettingsCard>
          </View>
        )}

        {/* Sharing — invite code + WhatsApp group */}
        <View style={styles.section}>
          <SectionLabel>Sharing</SectionLabel>
          <SettingsCard colors={colors}>
            <SettingsRow
              colors={colors}
              label="Invite code"
              value={competition.invite_code}
              trailingIcon="share-variant-outline"
              trailingIconColor={colors.primary}
              onPress={handleShare}
              accessibilityLabel="Share invite code"
              isLast={!showWhatsAppSection}
            />

            {isOrganizer && !whatsappUrl && (
              <SettingsRow
                colors={colors}
                label="Add WhatsApp group"
                sub="Let members join your group chat with one tap"
                leadingIcon="whatsapp"
                leadingIconColor={colors.primary}
                onPress={() => setIsEditWhatsAppOpen(true)}
                accessibilityLabel="Add WhatsApp group invite link"
                isLast
              />
            )}

            {isOrganizer && whatsappUrl && (
              <>
                <SettingsRow
                  colors={colors}
                  label="WhatsApp group link"
                  sub={whatsappUrl}
                  leadingIcon="whatsapp"
                  leadingIconColor={colors.primary}
                  trailingIcon="pencil-outline"
                  trailingIconColor={colors.textSecondary}
                  onPress={() => setIsEditWhatsAppOpen(true)}
                  accessibilityLabel="Edit WhatsApp group invite link"
                />
                <SettingsRow
                  colors={colors}
                  label="Open in WhatsApp"
                  bold
                  labelColor={colors.primary}
                  leadingIcon="open-in-new"
                  leadingIconColor={colors.primary}
                  onPress={handleOpenWhatsApp}
                  accessibilityLabel="Open WhatsApp group"
                />
                <SettingsRow
                  colors={colors}
                  label="Share with members"
                  bold
                  labelColor={colors.primary}
                  leadingIcon="share-variant-outline"
                  leadingIconColor={colors.primary}
                  onPress={handleShareWhatsApp}
                  accessibilityLabel="Share WhatsApp group link with members"
                  isLast
                />
              </>
            )}

            {!isOrganizer && !!whatsappUrl && (
              <SettingsRow
                colors={colors}
                label="Join WhatsApp group"
                sub="Tap to open the group in WhatsApp"
                leadingIcon="whatsapp"
                leadingIconColor={colors.primary}
                onPress={handleOpenWhatsApp}
                accessibilityLabel="Join WhatsApp group"
                isLast
              />
            )}
          </SettingsCard>
        </View>

        {/* Danger card — ungrouped, bottom of screen */}
        <View style={styles.section}>
          <SettingsCard colors={colors}>
            <SettingsRow
              colors={colors}
              label="Delete competition"
              bold
              labelColor={colors.error}
              leadingIcon="trash-can-outline"
              leadingIconColor={colors.error}
              trailingIcon={null}
              onPress={() => setShowDeleteDialog(true)}
              accessibilityLabel="Delete this competition"
              isLast
            />
          </SettingsCard>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: 15,
    minHeight: 44,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 20,
  },
  rowValue: {
    flexShrink: 1,
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'right',
  },
  rowTitle: {
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
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
