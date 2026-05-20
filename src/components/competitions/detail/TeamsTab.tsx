/**
 * TeamsTab
 *
 * Inline team management for organizers, read-only display for everyone else.
 *
 * Organizer view:
 *   - Stepper to pick team count (clamped to produce team sizes in [2, 4])
 *   - Regenerate button (non-destructive when count unchanged; confirm-then-
 *     destructive when count changed)
 *   - Handicap balance banner (green/amber/red + spread)
 *   - Editable team cards (rename) with tap-to-move on member chips
 *
 * Non-organizer view:
 *   - Teams list only, no controls, no banner
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner, EmptyState, ConfirmationDialog } from '@/components/common';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { ColorPalette } from '@/context/ThemeContext';
import { TeamCard } from '@/components/teams/TeamCard';
import { EditTeamModal } from '@/components/teams/EditTeamModal';
import { MoveToTeamSheet } from '@/components/teams/MoveToTeamSheet';
import { TeamBalanceIndicator } from '@/components/teams/TeamBalanceIndicator';
import {
  calculateHandicapSpread,
  getBalanceQuality,
} from '@/components/teams/teamAlgorithms';
import { useAutoGenerateTeams } from '@/hooks/rounds/teams';
import type { Competition, Player, TeamWithMembers } from '@/types/database.types';

// Minimum players per team so derived sizes stay in [2, 4]
const MIN_TEAM_SIZE = 2;
const MAX_TEAM_SIZE = 4;

export interface TeamsTabProps {
  competitionId: string;
  teams: TeamWithMembers[];
  teamMode: Competition['team_mode'];
  /** Accepted player count — used to clamp the team-count stepper. */
  playerCount: number;
  isLoading: boolean;
  isOrganizer: boolean;
  /** Whether the organizer can edit team names (requires premium+ subscription) */
  canEditTeamNames?: boolean;
  /**
   * True once any round has started scoring. Locks team mutations (shuffle,
   * team-count stepper, manual tap-to-move) for organisers because changing
   * teams mid-competition would invalidate in-flight results and payouts.
   */
  hasStartedRound?: boolean;
  onUpdateTeam?: (
    teamId: string,
    updates: { name?: string; color?: string }
  ) => void;
  colors: ColorPalette;
  /**
   * The currently logged-in user's player ID. When provided, their team
   * card gets a primary-colour border and their member row shows a "You"
   * pill so the user can spot their own team at a glance.
   */
  currentUserId?: string;
}

/**
 * Clamp a desired team count to the range that produces valid team sizes (2-4).
 */
function teamCountRange(playerCount: number): { min: number; max: number } {
  if (playerCount < MIN_TEAM_SIZE * 2) {
    // Fewer than 4 players → can't form at least 2 balanced teams
    return { min: 0, max: 0 };
  }
  const min = Math.ceil(playerCount / MAX_TEAM_SIZE);
  const max = Math.floor(playerCount / MIN_TEAM_SIZE);
  return { min, max };
}

/**
 * Describe the distribution of a given player count across N teams as
 * "4, 4, 3, 3" — mirrors how the snake draft distributes the remainder.
 */
function describeSizes(playerCount: number, numTeams: number): string {
  if (numTeams <= 0) return '';
  const base = Math.floor(playerCount / numTeams);
  const remainder = playerCount % numTeams;
  const sizes = Array.from({ length: numTeams }, (_, i) => (i < remainder ? base + 1 : base));
  return sizes.join(', ');
}

/**
 * Detect whether ANY team currently has a size outside the 2-4 bounds. Used
 * to show an "uneven sizes" warning after a manual move.
 */
function hasUnevenTeamSizes(teams: TeamWithMembers[]): boolean {
  if (teams.length === 0) return false;
  return teams.some(
    (t) => t.members.length < MIN_TEAM_SIZE || t.members.length > MAX_TEAM_SIZE
  );
}

export const TeamsTab = React.memo(function TeamsTab({
  competitionId,
  teams,
  teamMode,
  playerCount,
  isLoading,
  isOrganizer,
  canEditTeamNames = false,
  hasStartedRound = false,
  onUpdateTeam,
  colors,
  currentUserId,
}: TeamsTabProps) {
  // Lock all team mutations for organisers once scoring has started — mirrors
  // the `structureLocked` pattern used by SettingsSection.
  const teamsLocked = isOrganizer && hasStartedRound;

  const { min: minTeams, max: maxTeams } = useMemo(
    () => teamCountRange(playerCount),
    [playerCount]
  );

  // Stepper value — defaults to current team count if any, otherwise to a
  // reasonable middle (teams of ~3). Reclamped whenever player count changes.
  const defaultCount = useMemo(() => {
    if (teams.length > 0) return teams.length;
    if (minTeams === 0) return 0;
    return Math.max(minTeams, Math.min(maxTeams, Math.ceil(playerCount / 3)));
  }, [teams.length, playerCount, minTeams, maxTeams]);

  const [desiredCount, setDesiredCount] = useState<number>(defaultCount);

  // Keep stepper in sync when teams/playerCount change from outside
  useEffect(() => {
    setDesiredCount(defaultCount);
  }, [defaultCount]);

  const clampedCount = Math.max(minTeams, Math.min(maxTeams, desiredCount));

  const { mutate: generateTeams, isPending: isGenerating } = useAutoGenerateTeams();

  // Edit team modal (name + colour)
  const [editingTeam, setEditingTeam] = useState<TeamWithMembers | null>(null);
  const [isSavingTeam, setIsSavingTeam] = useState(false);

  // Move player sheet
  const [movingPlayer, setMovingPlayer] = useState<{ player: Player; currentTeamId: string } | null>(null);

  // Destructive-regenerate confirm dialog
  const [showRebuildConfirm, setShowRebuildConfirm] = useState(false);

  // Balance metrics (organizer view only)
  const handicapSpread = useMemo(() => calculateHandicapSpread(teams), [teams]);
  const balanceQuality = useMemo(() => getBalanceQuality(handicapSpread), [handicapSpread]);

  const unevenSizes = useMemo(() => hasUnevenTeamSizes(teams), [teams]);

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------

  const handleDecrement = useCallback(() => {
    setDesiredCount((n) => Math.max(minTeams, n - 1));
  }, [minTeams]);

  const handleIncrement = useCallback(() => {
    setDesiredCount((n) => Math.min(maxTeams, n + 1));
  }, [maxTeams]);

  const runGenerate = useCallback(
    (preserveNames: boolean) => {
      generateTeams({
        competitionId,
        numTeams: clampedCount,
        preserveNames,
      });
    },
    [generateTeams, competitionId, clampedCount]
  );

  const handleRegeneratePress = useCallback(() => {
    if (teams.length === 0) {
      // First-time generation — destructive path, no confirmation needed
      runGenerate(false);
      return;
    }
    if (clampedCount === teams.length) {
      // Same count → non-destructive reshuffle
      runGenerate(true);
    } else {
      setShowRebuildConfirm(true);
    }
  }, [teams.length, clampedCount, runGenerate]);

  const handleConfirmRebuild = useCallback(() => {
    setShowRebuildConfirm(false);
    runGenerate(false);
  }, [runGenerate]);

  const handleEditTeam = useCallback((team: TeamWithMembers) => {
    setEditingTeam(team);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditingTeam(null);
    setIsSavingTeam(false);
  }, []);

  const handleSaveTeam = useCallback(
    ({ name, color }: { name: string; color: string }) => {
      if (editingTeam && onUpdateTeam) {
        setIsSavingTeam(true);
        const updates: { name?: string; color?: string } = {};
        if (name !== editingTeam.name) updates.name = name;
        if (color !== editingTeam.color) updates.color = color;
        if (Object.keys(updates).length > 0) {
          onUpdateTeam(editingTeam.id, updates);
        }
        setTimeout(() => {
          handleCloseEditModal();
        }, 300);
      }
    },
    [editingTeam, onUpdateTeam, handleCloseEditModal]
  );

  // Avatar ids already taken by other teams (excluding the team being
  // edited) — passed to the picker so those swatches render disabled.
  const takenColorIds = useMemo(() => {
    if (!editingTeam) return [];
    return teams
      .filter((t) => t.id !== editingTeam.id && t.color)
      .map((t) => t.color as string);
  }, [teams, editingTeam]);

  const handleMemberPress = useCallback(
    (team: TeamWithMembers, player: Player) => {
      if (!isOrganizer) return;
      setMovingPlayer({ player, currentTeamId: team.id });
    },
    [isOrganizer]
  );

  const handleCloseMoveSheet = useCallback(() => {
    setMovingPlayer(null);
  }, []);

  // -------------------------------------------------------------------------
  // RENDER GATES
  // -------------------------------------------------------------------------

  if (teamMode === 'none') {
    return (
      <EmptyState
        title="No Team Mode"
        message="This competition doesn't use teams."
        icon="account-group-outline"
        compact
      />
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="lg" message="Loading teams..." />
      </View>
    );
  }

  // Not enough players to form teams at all
  const cannotGenerate = minTeams === 0;

  // -------------------------------------------------------------------------
  // MAIN RENDER
  // -------------------------------------------------------------------------

  return (
    <View>
      {/* Locked notice — shown in place of the organiser controls once any
          round has started scoring. */}
      {teamsLocked && (
        <View
          style={[
            styles.lockedNotice,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Icon source="lock-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.lockedNoticeText, { color: colors.textSecondary }]}>
            Teams are locked once scoring has started.
          </Text>
        </View>
      )}

      {/* Organizer controls */}
      {isOrganizer && !teamsLocked && (
        <View style={[styles.controlsCard, shadows.sm, { backgroundColor: colors.surface }]}>
          <View style={styles.controlsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.controlsLabel, { color: colors.textSecondary }]}>
                Number of teams
              </Text>
              <Text style={[styles.controlsHint, { color: colors.textTertiary }]}>
                {cannotGenerate
                  ? `Need at least ${MIN_TEAM_SIZE * 2} players`
                  : `${playerCount} players • range ${minTeams}–${maxTeams}`}
              </Text>
            </View>

            <View style={styles.stepper}>
              <StepperButton
                icon="minus"
                onPress={handleDecrement}
                disabled={cannotGenerate || clampedCount <= minTeams}
                colors={colors}
                accessibilityLabel="Decrease team count"
              />
              <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>
                {cannotGenerate ? '—' : clampedCount}
              </Text>
              <StepperButton
                icon="plus"
                onPress={handleIncrement}
                disabled={cannotGenerate || clampedCount >= maxTeams}
                colors={colors}
                accessibilityLabel="Increase team count"
              />
            </View>
          </View>

          {!cannotGenerate && (
            <Text style={[styles.distributionText, { color: colors.textTertiary }]}>
              {playerCount} players → {clampedCount} teams of {describeSizes(playerCount, clampedCount)}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.regenerateButton,
              {
                backgroundColor: cannotGenerate || isGenerating ? colors.gray300 : colors.primary,
              },
            ]}
            onPress={handleRegeneratePress}
            disabled={cannotGenerate || isGenerating}
            accessibilityRole="button"
            accessibilityLabel="Regenerate balanced teams"
          >
            <Icon source="shuffle-variant" size={20} color={colors.white} />
            <Text style={[styles.regenerateButtonText, { color: colors.white }]}>
              {isGenerating
                ? 'Generating…'
                : teams.length === 0
                  ? 'Generate balanced teams'
                  : 'Regenerate balanced teams'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Balance banner (organizer only, when teams exist) */}
      {isOrganizer && !teamsLocked && teams.length > 1 && (
        <TeamBalanceIndicator
          balanceQuality={balanceQuality}
          handicapSpread={handicapSpread}
        />
      )}

      {/* Uneven sizes warning after manual move */}
      {isOrganizer && !teamsLocked && unevenSizes && teams.length > 0 && (
        <View
          style={[
            styles.warningBanner,
            { backgroundColor: colors.warningLight, borderColor: colors.warning },
          ]}
        >
          <Icon source="alert-circle-outline" size={18} color={colors.warningDark} />
          <Text style={[styles.warningText, { color: colors.warningDark }]}>
            Team sizes are uneven. Tap Regenerate to rebalance.
          </Text>
        </View>
      )}

      {/* Teams list */}
      {teams.length === 0 ? (
        <EmptyState
          title="No teams yet"
          message={
            isOrganizer
              ? cannotGenerate
                ? 'Add more players to generate teams.'
                : 'Pick a team count and tap Generate.'
              : "Teams haven't been created yet."
          }
          icon="account-group-outline"
          compact
        />
      ) : (
        <View style={styles.teamsList}>
          <Text style={[styles.teamsSectionTitle, { color: colors.textSecondary }]}>
            {teams.length} {teams.length === 1 ? 'Team' : 'Teams'}
          </Text>
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              isEditable={canEditTeamNames}
              onEdit={handleEditTeam}
              onMemberPress={
                isOrganizer && !teamsLocked
                  ? (player) => handleMemberPress(team, player)
                  : undefined
              }
              currentUserId={currentUserId}
              testID={`team-card-${team.id}`}
            />
          ))}
        </View>
      )}

      {/* Edit team modal — name + colour */}
      <EditTeamModal
        visible={!!editingTeam}
        currentName={editingTeam?.name ?? ''}
        currentColor={editingTeam?.color ?? null}
        takenColorIds={takenColorIds}
        onSave={handleSaveTeam}
        onCancel={handleCloseEditModal}
        loading={isSavingTeam}
      />

      {/* Move-to-team bottom sheet */}
      <MoveToTeamSheet
        visible={!!movingPlayer}
        onClose={handleCloseMoveSheet}
        player={movingPlayer?.player ?? null}
        currentTeamId={movingPlayer?.currentTeamId ?? null}
        teams={teams}
        competitionId={competitionId}
      />

      {/* Destructive rebuild confirmation */}
      <ConfirmationDialog
        visible={showRebuildConfirm}
        title="Rebuild all teams?"
        message="Changing the number of teams will rebuild every team from scratch. Any custom team names will be lost."
        confirmLabel="Rebuild"
        confirmVariant="destructive"
        icon="alert"
        onConfirm={handleConfirmRebuild}
        onCancel={() => setShowRebuildConfirm(false)}
        loading={isGenerating}
      />
    </View>
  );
});

// ---------------------------------------------------------------------------
// StepperButton — small subcomponent so disabled styling stays readable
// ---------------------------------------------------------------------------

interface StepperButtonProps {
  icon: 'plus' | 'minus';
  onPress: () => void;
  disabled: boolean;
  colors: ColorPalette;
  accessibilityLabel: string;
}

function StepperButton({ icon, onPress, disabled, colors, accessibilityLabel }: StepperButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.stepperButton,
        {
          backgroundColor: disabled ? colors.gray200 : colors.primaryLighter,
          borderColor: disabled ? colors.gray300 : colors.primary,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <Icon
        source={icon === 'plus' ? 'plus' : 'minus'}
        size={20}
        color={disabled ? colors.gray500 : colors.primary}
      />
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },

  controlsCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  controlsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  controlsLabel: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  controlsHint: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    ...typography.h3,
    minWidth: 28,
    textAlign: 'center',
  },
  distributionText: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    minHeight: 48,
    ...shadows.sm,
  },
  regenerateButtonText: {
    ...typography.bodyBold,
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  warningText: {
    ...typography.small,
    flex: 1,
  },

  lockedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  lockedNoticeText: {
    ...typography.caption,
    flex: 1,
  },

  teamsList: {
    marginTop: spacing.sm,
  },
  teamsSectionTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
});

export default TeamsTab;
