/**
 * ScheduledRoundScreen
 *
 * Detail screen for an upcoming (scheduled) standalone round.
 *
 * Capabilities:
 *  - Header card: course, date/time, format, nine type
 *  - Players list with invitation status pills
 *  - Invitee: Accept / Decline actions (decline requires confirmation)
 *  - Organiser: Edit date/time, Invite more friends, Cancel round
 *  - Start section: keep-or-drop pending players, optional scoring setup,
 *    then start the round
 *
 * RLS keep/drop policy:
 *   Organiser (user_id = auth.uid()): full keep/drop — may DELETE pending rows.
 *   Non-organiser accepted starter: keep-all forced — pending rows stay (RLS
 *   blocks DELETE and cross-row UPDATE on round_players for non-owners).
 *   See useStartScheduledRound.ts for the full analysis.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
} from 'react-native';
import { Text } from 'react-native-paper';
import { IconPencil, IconTrash } from '@tabler/icons-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { SystemModalTheme } from '@/components/common/SystemModalTheme';
import { DateTimeFieldGroup } from '@/components/common/DateTimeFieldGroup';
import { useConfirmationDialog } from '@/hooks';
import { BottomSheet } from '@/components/common/BottomSheet';
import { FriendSelector, type SelectedPlayer } from '@/components/common/FriendSelector';
import { useFriends } from '@/hooks/useFriends';
import { usePlaceholderPlayers } from '@/hooks/placeholderPlayers';
import type { RootStackParamList } from '@/navigation/types';
import { presetIdForGameType, type RoundPresetId } from '@/constants/roundPresets';
import { startBlockReason } from '@/utils';
import {
  useScheduledRound,
  useRespondToRoundInvitation,
  useInviteToScheduledRound,
  useUpdateScheduledRound,
  useCancelScheduledRound,
} from '@/hooks/rounds/scheduledRounds';
import type { ScoringPairsConfig, StandaloneSkinsConfig, StandaloneWolfConfig, TeamConfig, PlayingPartner } from '@/screens/rounds/CreateRoundBottomSheet';
import type { ScrambleTeam } from '@/screens/rounds/CreateRoundBottomSheet/types';
import type { SkinsConfig } from '@/types';
import type { WolfConfig } from '@/types/database/wolf.types';
import type { ScoringPairCreateInput } from '@/types';
import type { HandicapSource } from '@/types/database/enums';
import { ScoringSetupStep } from '@/screens/rounds/CreateRoundBottomSheet/steps/ScoringSetupStep';
import { RoundHeaderCard } from './components/RoundHeaderCard';
import { PlayersSection } from './components/PlayersSection';
import { KeepOrDropSheet } from './components/KeepOrDropSheet';
import { useStartScheduledRound } from './hooks/useStartScheduledRound';

type Props = NativeStackScreenProps<RootStackParamList, 'ScheduledRound'>;

// ---------------------------------------------------------------------------
// Minimal inline team generator (mirrors useWizardTeams.generateTeams logic)
// ---------------------------------------------------------------------------
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

function buildInitialTeams(allPlayers: PlayingPartner[]): ScrambleTeam[] {
  const teams: ScrambleTeam[] = [];
  for (let i = 0; i < allPlayers.length; i += 2) {
    const members = [allPlayers[i]];
    if (i + 1 < allPlayers.length) members.push(allPlayers[i + 1]);
    teams.push({ id: generateUUID(), name: `Team ${teams.length + 1}`, members });
  }
  return teams;
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ScheduledRoundScreen({ route, navigation }: Props) {
  const { roundId } = route.params;
  const colors = useThemeColors();
  const { user } = useAuth();

  const { data: round, isLoading, error, refetch } = useScheduledRound(roundId);
  const respondMutation = useRespondToRoundInvitation();
  const inviteMutation = useInviteToScheduledRound();
  const updateMutation = useUpdateScheduledRound();
  const cancelMutation = useCancelScheduledRound();

  const {
    dialogConfig: confirmDialog,
    showDialog,
    showAlert,
    dismissDialog,
  } = useConfirmationDialog();

  // -------------------------------------------------------------------------
  // Sheet / modal visibility
  // -------------------------------------------------------------------------
  const [showEditDateTime, setShowEditDateTime] = useState(false);
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [showKeepOrDrop, setShowKeepOrDrop] = useState(false);
  const [showScoringSetup, setShowScoringSetup] = useState(false);

  // -------------------------------------------------------------------------
  // Edit date/time state
  // -------------------------------------------------------------------------
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [editTime, setEditTime] = useState<Date | undefined>(undefined);

  // -------------------------------------------------------------------------
  // Invite friends state
  // -------------------------------------------------------------------------
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteSelected, setInviteSelected] = useState<SelectedPlayer[]>([]);
  const { data: friends = [], isLoading: friendsLoading } = useFriends();
  const { data: placeholders = [] } = usePlaceholderPlayers();

  // -------------------------------------------------------------------------
  // Scoring setup state (mirrors minimal wizard defaults)
  // -------------------------------------------------------------------------
  const [scoringPairsEnabled, setScoringPairsEnabled] = useState(false);
  const [scoringPairs, setScoringPairs] = useState<ScoringPairCreateInput[]>([]);
  const [skinsEnabled, setSkinsEnabled] = useState(false);
  const [skinsConfig, setSkinsConfig] = useState<SkinsConfig | null>(null);
  const [wolfEnabled, setWolfEnabled] = useState(false);
  const [wolfConfig, setWolfConfig] = useState<WolfConfig | null>(null);
  const [splitIntoTeams, setSplitIntoTeams] = useState(false);
  const [teams, setTeams] = useState<ScrambleTeam[]>([]);
  const [handicapSource, setHandicapSource] = useState<HandicapSource>('profile');

  // Pending keep/drop state (stored between KeepOrDropSheet and ScoringSetup)
  const [pendingDropIds, setPendingDropIds] = useState<Set<string>>(new Set());

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------
  const myId = user?.id ?? '';
  const isOrganiser = round?.user_id === myId;
  const myRow = round?.players.find((p) => p.player_id === myId);
  const isAccepted = myRow?.invitation_status === 'accepted';
  const isPending = myRow?.invitation_status === 'pending';

  // presetIdForGameType: best-effort inference from game_type. For team formats
  // this maps e.g. 'scramble' -> 'team_scramble' which has the correct shortTitle
  // and player-count bounds for standalone use.
  const presetId: RoundPresetId = useMemo(
    () => (round ? presetIdForGameType(round.game_type as Parameters<typeof presetIdForGameType>[0]) : 'individual_stableford'),
    [round]
  );

  const pendingPlayers = useMemo(
    () => (round?.players ?? []).filter((p) => p.invitation_status === 'pending'),
    [round]
  );

  const blockReason = useMemo(
    () => (round ? startBlockReason(presetId, round.players) : null),
    [round, presetId]
  );

  const isGroupRound = useMemo(
    () => (round?.players.filter((p) => p.invitation_status !== 'declined').length ?? 0) > 1,
    [round]
  );

  // Existing players (to filter out of invite list)
  const existingPlayerIds = useMemo(
    () => new Set((round?.players ?? []).map((p) => p.player_id)),
    [round]
  );

  // -------------------------------------------------------------------------
  // Start hook
  // -------------------------------------------------------------------------
  const { handleStart, isStarting, dialogConfig: startDialog, dismissDialog: dismissStartDialog } =
    useStartScheduledRound(round!); // round is non-null when this is used (guarded by isAccepted check)

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleAccept = () => {
    respondMutation.mutate({ roundId, response: 'accepted' });
  };

  const handleDeclinePress = () => {
    showDialog({
      title: 'Decline invitation?',
      message: "You'll be removed from this round and the organiser will be notified.",
      confirmLabel: 'Decline',
      confirmVariant: 'destructive',
      icon: 'close-circle-outline',
      onConfirm: () => {
        dismissDialog();
        respondMutation.mutate(
          { roundId, response: 'declined' },
          { onSuccess: () => navigation.goBack() }
        );
      },
    });
  };

  const handleEditDateTimeOpen = () => {
    if (!round) return;
    setEditDate(round.date ? parseISO(round.date) : new Date());
    setEditTime(round.tee_time ? parseISO(`1970-01-01T${round.tee_time}`) : undefined);
    setShowEditDateTime(true);
  };

  const handleSaveDateTime = () => {
    if (!editDate) return;
    updateMutation.mutate(
      {
        roundId,
        date: format(editDate, 'yyyy-MM-dd'),
        teeTime: editTime ? format(editTime, 'HH:mm:ss') : null,
      },
      {
        onSuccess: () => setShowEditDateTime(false),
        onError: (err) => {
          showAlert('Update failed', err instanceof Error ? err.message : 'Please try again.');
        },
      }
    );
  };

  const handleCancelRound = () => {
    showDialog({
      title: 'Cancel round?',
      message: 'All invited players will be notified. This cannot be undone.',
      confirmLabel: 'Cancel Round',
      confirmVariant: 'destructive',
      icon: 'trash-can-outline',
      onConfirm: () => {
        dismissDialog();
        cancelMutation.mutate(roundId, { onSuccess: () => navigation.goBack() });
      },
    });
  };

  const handleInviteConfirm = () => {
    if (inviteSelected.length === 0) {
      setShowInviteSheet(false);
      return;
    }
    inviteMutation.mutate(
      {
        roundId,
        partners: inviteSelected.map((p) => ({ id: p.id })),
      },
      {
        onSuccess: () => {
          setInviteSelected([]);
          setShowInviteSheet(false);
        },
        onError: (err) => {
          showAlert('Invite failed', err instanceof Error ? err.message : 'Please try again.');
        },
      }
    );
  };

  // Called when user taps "Start Round" on the screen
  const handleStartPress = useCallback(() => {
    if (!round) return;
    if (pendingPlayers.length > 0) {
      // Show keep/drop sheet first
      setShowKeepOrDrop(true);
    } else {
      // No pending players — proceed directly
      if (isGroupRound) {
        setShowScoringSetup(true);
      } else {
        // Solo round: skip setup
        handleStart({ droppedPendingIds: new Set(), handicapSource });
      }
    }
  }, [round, pendingPlayers.length, isGroupRound, handleStart, handicapSource]);

  // Called from KeepOrDropSheet.onConfirm
  const handleKeepDropConfirm = useCallback(
    (droppedIds: Set<string>) => {
      setPendingDropIds(droppedIds);
      setShowKeepOrDrop(false);
      if (isGroupRound) {
        setShowScoringSetup(true);
      } else {
        handleStart({ droppedPendingIds: droppedIds, handicapSource });
      }
    },
    [isGroupRound, handleStart, handicapSource]
  );

  // Called from ScoringSetupStep.onStartScoring
  const handleScoringSetupStart = useCallback(() => {
    if (!round) return;
    setShowScoringSetup(false);

    const scoringPairsConfig: ScoringPairsConfig | undefined = scoringPairsEnabled
      ? { enabled: true, pairs: scoringPairs, pairingType: 'reciprocal' }
      : undefined;

    const skinsConfigFinal: StandaloneSkinsConfig | undefined =
      skinsEnabled && skinsConfig ? { enabled: true, config: skinsConfig } : undefined;

    const wolfConfigFinal: StandaloneWolfConfig | undefined =
      wolfEnabled && wolfConfig ? { enabled: true, config: wolfConfig } : undefined;

    const teamConfigFinal: TeamConfig | undefined =
      splitIntoTeams && teams.length >= 2
        ? {
            teams: teams.map((t) => ({
              id: t.id,
              name: t.name,
              memberIds: t.members.map((m) => m.id),
            })),
          }
        : undefined;

    handleStart({
      droppedPendingIds: pendingDropIds,
      scoringPairsConfig,
      skinsConfig: skinsConfigFinal,
      wolfConfig: wolfConfigFinal,
      teamConfig: teamConfigFinal,
      handicapSource,
    });
  }, [
    round,
    scoringPairsEnabled,
    scoringPairs,
    skinsEnabled,
    skinsConfig,
    wolfEnabled,
    wolfConfig,
    splitIntoTeams,
    teams,
    pendingDropIds,
    handicapSource,
    handleStart,
  ]);

  // Shuffle teams helper for ScoringSetupStep
  const handleShuffleTeams = useCallback(() => {
    if (!round) return;
    const activePlayers = round.players.filter(
      (p) => p.invitation_status !== 'declined' && !pendingDropIds.has(p.player_id)
    );
    const partners: PlayingPartner[] = activePlayers.map((p) => ({
      id: p.player_id,
      name: p.player?.name ?? 'Guest',
      handicap: p.player?.handicap ?? undefined,
    }));
    const shuffled = [...partners];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setTeams(buildInitialTeams(shuffled));
  }, [round, pendingDropIds]);

  // -------------------------------------------------------------------------
  // Build ScoringSetupStep props
  // -------------------------------------------------------------------------
  const activeScoringPartners = useMemo((): PlayingPartner[] => {
    if (!round) return [];
    return round.players
      .filter(
        (p) => p.player_id !== myId &&
          p.invitation_status !== 'declined' &&
          !pendingDropIds.has(p.player_id)
      )
      .map((p) => ({
        id: p.player_id,
        name: p.player?.name ?? 'Guest',
        handicap: p.player?.handicap ?? undefined,
      }));
  }, [round, myId, pendingDropIds]);

  // -------------------------------------------------------------------------
  // Render guards
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <PageHeader title="Round" showBack onBack={() => navigation.goBack()} />
        <LoadingSpinner />
      </View>
    );
  }

  if (error || !round) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <PageHeader title="Round" showBack onBack={() => navigation.goBack()} />
        <ErrorState
          error={error?.message ?? 'Round not found'}
          onRetry={refetch}
        />
      </View>
    );
  }

  const startDisabled = !!blockReason;

  // -------------------------------------------------------------------------
  // Friends filtered to exclude existing round players (for invite sheet)
  // -------------------------------------------------------------------------
  const filteredFriends = friends.filter((f) => !existingPlayerIds.has(f.id));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Upcoming Round"
        showBack
        onBack={() => navigation.goBack()}
        rightActions={
          isOrganiser && round.status === 'upcoming'
            ? [
                {
                  icon: 'account-plus-outline',
                  onPress: () => setShowInviteSheet(true),
                  accessibilityLabel: 'Invite players',
                },
                {
                  icon: 'dots-horizontal',
                  onPress: handleCancelRound,
                  accessibilityLabel: 'More options',
                },
              ]
            : undefined
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <RoundHeaderCard
          courseName={round.course?.name ?? 'Unknown Course'}
          date={round.date}
          teeTime={round.tee_time}
          presetId={presetId}
          nineType={round.nine_type}
        />

        {/* Players section */}
        <PlayersSection players={round.players} myPlayerId={myId} />

        {/* Organiser actions: edit date/time */}
        {isOrganiser && round.status === 'upcoming' && (
          <TouchableOpacity
            style={[styles.actionRow, shadows.sm, { backgroundColor: colors.surface }]}
            onPress={handleEditDateTimeOpen}
            accessibilityLabel="Edit date and tee time"
          >
            <IconPencil size={18} color={colors.primary} />
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Edit date & tee time</Text>
          </TouchableOpacity>
        )}

        {/* Cancel action — only organiser, separate from invite/edit */}
        {isOrganiser && round.status === 'upcoming' && (
          <TouchableOpacity
            style={[styles.actionRow, shadows.sm, { backgroundColor: colors.surface }]}
            onPress={handleCancelRound}
            accessibilityLabel="Cancel round"
          >
            <IconTrash size={18} color={colors.error} />
            <Text style={[styles.actionLabel, { color: colors.error }]}>Cancel round</Text>
          </TouchableOpacity>
        )}

        {/* Invitee response actions */}
        {isPending && round.status === 'upcoming' && (
          <View style={[styles.inviteeActions, shadows.sm, { backgroundColor: colors.surface }]}>
            <Text style={[styles.inviteTitle, { color: colors.textPrimary }]}>
              {'You\'ve been invited'}
            </Text>
            <View style={styles.inviteeButtons}>
              <TouchableOpacity
                style={[styles.declineButton, { borderColor: colors.error }]}
                onPress={handleDeclinePress}
                disabled={respondMutation.isPending}
                accessibilityLabel="Decline invitation"
              >
                <Text style={[styles.declineText, { color: colors.error }]}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.acceptButton, { backgroundColor: colors.primary }]}
                onPress={handleAccept}
                disabled={respondMutation.isPending}
                accessibilityLabel="Accept invitation"
              >
                <Text style={[styles.acceptText, { color: colors.white }]}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Start section */}
        {isAccepted && round.status === 'upcoming' && (
          <View style={[styles.startSection, shadows.sm, { backgroundColor: colors.surface }]}>
            {startDisabled ? (
              <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                {blockReason}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[
                styles.startButton,
                { backgroundColor: startDisabled ? colors.surfaceVariant : colors.primary },
              ]}
              onPress={handleStartPress}
              disabled={startDisabled || isStarting}
              accessibilityLabel={startDisabled ? 'Cannot start round yet' : 'Start round'}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.startButtonText,
                  { color: startDisabled ? colors.textDisabled : colors.white },
                ]}
              >
                {isStarting ? 'Starting…' : 'Start Round'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* ------------------------------------------------------------------- */}
      {/* Edit date/time modal                                                  */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        visible={showEditDateTime}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditDateTime(false)}
      >
        <SystemModalTheme>
          <View style={[styles.editModalOverlay]}>
            <View style={[styles.editModalCard, shadows.lg, { backgroundColor: colors.surface }]}>
              <Text style={[styles.editModalTitle, { color: colors.textPrimary }]}>
                Edit Date & Tee Time
              </Text>
              <DateTimeFieldGroup
                date={editDate ?? new Date()}
                onDateChange={setEditDate}
                time={editTime}
                onTimeChange={setEditTime}
                showTime
                minimumDate={new Date()}
                showTimeClear
                onTimeClear={() => setEditTime(undefined)}
              />
              <View style={styles.editModalButtons}>
                <TouchableOpacity
                  style={[styles.editCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowEditDateTime(false)}
                >
                  <Text style={[styles.editCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editSaveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveDateTime}
                  disabled={updateMutation.isPending}
                >
                  <Text style={[styles.editSaveText, { color: colors.white }]}>
                    {updateMutation.isPending ? 'Saving…' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SystemModalTheme>
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* Invite friends sheet                                                  */}
      {/* ------------------------------------------------------------------- */}
      <BottomSheet
        visible={showInviteSheet}
        onClose={() => setShowInviteSheet(false)}
        height={0.85}
        title="Invite Players"
        useModal
      >
        <FriendSelector
          selectedPlayers={inviteSelected}
          onSelectionChange={setInviteSelected}
          friends={filteredFriends}
          friendsLoading={friendsLoading}
          searchQuery={inviteSearch}
          onSearchQueryChange={setInviteSearch}
          limits={{ max: 3, min: 0 }}
          limitIndicator={{ show: false }}
          selectedTitle={`Inviting (${inviteSelected.length})`}
          listTitle="Select players to invite"
          emptyMessage="No friends to invite — add friends from the Friends tab"
          placeholderPlayers={placeholders}
          onAddPlaceholderPress={() => {}}
          addPlaceholderLabel="Create Guest"
        />
        <View style={[styles.inviteFooter, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.inviteConfirmBtn, { backgroundColor: colors.primary }]}
            onPress={handleInviteConfirm}
            disabled={inviteMutation.isPending}
            activeOpacity={0.8}
          >
            <Text style={[styles.inviteConfirmText, { color: colors.white }]}>
              {inviteSelected.length > 0
                ? `Invite ${inviteSelected.length} player${inviteSelected.length !== 1 ? 's' : ''}`
                : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* ------------------------------------------------------------------- */}
      {/* Keep-or-drop sheet                                                    */}
      {/* ------------------------------------------------------------------- */}
      <KeepOrDropSheet
        visible={showKeepOrDrop}
        onClose={() => setShowKeepOrDrop(false)}
        allPlayers={round.players}
        pendingPlayers={pendingPlayers}
        presetId={presetId}
        isOwner={isOrganiser}
        onConfirm={handleKeepDropConfirm}
      />

      {/* ------------------------------------------------------------------- */}
      {/* Scoring setup full-screen modal                                       */}
      {/* (shown for group rounds; ScoringSetupStep is self-contained)          */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        visible={showScoringSetup}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowScoringSetup(false)}
      >
        <SystemModalTheme>
          <View style={[styles.scoringSetupModal, { backgroundColor: colors.background }]}>
            <PageHeader
              title="Scoring Setup"
              showBack
              onBack={() => setShowScoringSetup(false)}
            />
            <ScoringSetupStep
              selectedCourse={
                round.course
                  ? {
                      courseId: round.course_id,
                      courseName: round.course.name,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal club shape sufficient for RoundSummary display
                      club: { id: '', name: round.course.name } as any,
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tees are runtime JSONB
                      tees: (round.course.tees as any) ?? null,
                    }
                  : null
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TeeBox runtime shape from DB
              selectedTee={round.selected_tee as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- GameType string from DB
              selectedMatchType={round.game_type as any}
              selectedPartners={activeScoringPartners}
              scoringPairsEnabled={scoringPairsEnabled}
              scoringPairs={scoringPairs}
              onScoringPairsEnabledChange={setScoringPairsEnabled}
              onScoringPairsChange={(pairs) => setScoringPairs(pairs)}
              teams={teams}
              teamsLocked={false}
              splitIntoTeams={splitIntoTeams}
              onShuffleTeams={handleShuffleTeams}
              onSplitIntoTeamsChange={(enabled) => {
                setSplitIntoTeams(enabled);
                if (enabled) {
                  const me: PlayingPartner = {
                    id: myId,
                    name: user?.email?.split('@')[0] ?? 'You',
                  };
                  setTeams(buildInitialTeams([me, ...activeScoringPartners]));
                } else {
                  setTeams([]);
                }
              }}
              skinsEnabled={skinsEnabled}
              skinsConfig={skinsConfig}
              onSkinsEnabledChange={setSkinsEnabled}
              onSkinsConfigChange={setSkinsConfig}
              wolfEnabled={wolfEnabled}
              wolfConfig={wolfConfig}
              onWolfEnabledChange={setWolfEnabled}
              onWolfConfigChange={setWolfConfig}
              handicapSource={handicapSource}
              onHandicapSourceChange={setHandicapSource}
              onStartScoring={handleScoringSetupStart}
            />
          </View>
        </SystemModalTheme>
      </Modal>

      {/* Confirmation dialogs */}
      <ConfirmationDialog {...confirmDialog} onCancel={dismissDialog} />
      <ConfirmationDialog {...startDialog} onCancel={dismissStartDialog} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  actionLabel: {
    ...typography.body,
  },
  inviteeActions: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  inviteTitle: {
    ...typography.bodyBold,
    textAlign: 'center',
  },
  inviteeButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  declineButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  declineText: {
    ...typography.bodyBold,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  acceptText: {
    ...typography.bodyBold,
  },
  startSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  blockText: {
    ...typography.body,
    textAlign: 'center',
  },
  startButton: {
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  startButtonText: {
    ...typography.bodyBold,
  },
  bottomPad: {
    height: spacing.xl,
  },
  // Edit date/time modal
  editModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  editModalCard: {
    width: '100%',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  editModalTitle: {
    ...typography.h3,
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  editCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  editCancelText: {
    ...typography.bodyBold,
  },
  editSaveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  editSaveText: {
    ...typography.bodyBold,
  },
  // Invite sheet footer
  inviteFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  inviteConfirmBtn: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  inviteConfirmText: {
    ...typography.bodyBold,
  },
  // Scoring setup modal
  scoringSetupModal: {
    flex: 1,
  },
});
