/**
 * LeaderboardTab - Competition leaderboard display with individual/team toggle
 *
 * Features:
 * - Sub-tabs for Individual vs Team standings (when team_mode !== 'none')
 * - Uses useCompetitionLeaderboard hook for team-aware data
 * - Round-specific leaderboard section with RoundLeaderboard
 * - Proper empty states for each view
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { ErrorState, LoadingSpinner, SectionHeader } from '@/components/common';
import { IconUsers, IconUser, IconCalendar } from '@tabler/icons-react-native';
import { LeaderboardTable } from './LeaderboardTable';
import { TeamLeaderboardTable, type TeamLeaderboardEntry } from './TeamLeaderboardTable';
import { RoundLeaderboard } from './RoundLeaderboard';
import { useCompetitionLeaderboard, type LeaderboardFilter, type CompetitionLeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { TeamMode, GameType } from '@/types/database.types';
import type { RoundWithCourse } from '@/components/competitions/detail/types';

// =====================================================
// TYPES
// =====================================================

export type LeaderboardView = 'individual' | 'team';

export interface LeaderboardScrollTarget {
  kind: 'player' | 'team';
  id: string;
}

export interface LeaderboardTabProps {
  /** Competition ID */
  competitionId: string;
  /** Competition team mode */
  teamMode: TeamMode;
  /** Rounds data for round-specific leaderboards */
  rounds: RoundWithCourse[];
  /** Current user ID for highlighting */
  currentUserId?: string;
  /** Enable auto-refresh */
  autoRefresh?: boolean;
  /** Callback when a leaderboard entry is pressed (for showing points breakdown) */
  onEntryPress?: (entry: CompetitionLeaderboardEntry) => void;
  /** Optional controlled view. When provided, parent owns the state. */
  selectedView?: LeaderboardView;
  /** Called when the view changes (only meaningful when controlled). */
  onViewChange?: (view: LeaderboardView) => void;
  /**
   * Optional row to scroll into focus on next render. The component clears
   * the target by calling `onScrollHandled` after acting on it.
   */
  scrollTarget?: LeaderboardScrollTarget | null;
  /** Called after the component has acted on `scrollTarget`. */
  onScrollHandled?: () => void;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface ViewToggleProps {
  selectedView: LeaderboardView;
  onViewChange: (view: LeaderboardView) => void;
  showTeamOption: boolean;
  /** Hide individual option (e.g., for scramble-only competitions where individual standings don't apply) */
  hideIndividualOption?: boolean;
}

const ViewToggle = React.memo(function ViewToggle({
  selectedView,
  onViewChange,
  showTeamOption,
  hideIndividualOption = false,
}: ViewToggleProps) {
  const colors = useThemeColors();

  // Hide toggle if no team option OR if individual is hidden (only team remains)
  if (!showTeamOption || hideIndividualOption) {
    return null;
  }

  return (
    <View style={[styles.toggleContainer, { backgroundColor: colors.gray100 }]}>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          selectedView === 'individual' && [
            styles.toggleButtonActive,
            { backgroundColor: colors.surface },
          ],
        ]}
        onPress={() => onViewChange('individual')}
        accessibilityRole="tab"
        accessibilityState={{ selected: selectedView === 'individual' }}
        accessibilityLabel="Individual standings"
      >
        <IconUser
          size={16}
          color={selectedView === 'individual' ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[
            styles.toggleButtonText,
            { color: selectedView === 'individual' ? colors.primary : colors.textSecondary },
            selectedView === 'individual' && styles.toggleButtonTextActive,
          ]}
        >
          Individual
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.toggleButton,
          selectedView === 'team' && [
            styles.toggleButtonActive,
            { backgroundColor: colors.surface },
          ],
        ]}
        onPress={() => onViewChange('team')}
        accessibilityRole="tab"
        accessibilityState={{ selected: selectedView === 'team' }}
        accessibilityLabel="Team standings"
      >
        <IconUsers
          size={16}
          color={selectedView === 'team' ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[
            styles.toggleButtonText,
            { color: selectedView === 'team' ? colors.primary : colors.textSecondary },
            selectedView === 'team' && styles.toggleButtonTextActive,
          ]}
        >
          Team
        </Text>
      </TouchableOpacity>
    </View>
  );
});

interface EmptyLeaderboardStateProps {
  type: 'individual' | 'team' | 'rounds';
  message?: string;
}

const EmptyLeaderboardState = React.memo(function EmptyLeaderboardState({
  type,
  message,
}: EmptyLeaderboardStateProps) {
  const colors = useThemeColors();

  const defaultMessages = {
    individual: 'Individual standings will appear once players submit their scorecards.',
    team: 'Team standings will appear once team scores are submitted.',
    rounds: 'Round leaderboards will appear once rounds are completed.',
  };

  const icons = {
    individual: <IconUser size={48} color={colors.gray400} />,
    team: <IconUsers size={48} color={colors.gray400} />,
    rounds: <IconCalendar size={48} color={colors.gray400} />,
  };

  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
      <View style={styles.emptyState}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.gray200 }]}>
          {icons[type]}
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No standings yet</Text>
        <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
          {message || defaultMessages[type]}
        </Text>
      </View>
    </View>
  );
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Convert CompetitionLeaderboardEntry to LeaderboardEntry format for LeaderboardTable
 */
function toLeaderboardTableEntries(entries: CompetitionLeaderboardEntry[]) {
  return entries.map((entry) => ({
    playerId: entry.participantId,
    playerName: entry.participantName,
    handicap: entry.handicap ?? 0,
    totalPoints: entry.totalPoints,
    roundsPlayed: entry.roundsPlayed,
  }));
}

/**
 * Convert CompetitionLeaderboardEntry to TeamLeaderboardEntry format for TeamLeaderboardTable
 */
function toTeamLeaderboardEntries(entries: CompetitionLeaderboardEntry[]): TeamLeaderboardEntry[] {
  return entries.map((entry) => {
    // Calculate average handicap from team members
    const avgHandicap =
      entry.teamMembers.length > 0
        ? entry.teamMembers.reduce((sum, m) => sum + m.handicap, 0) / entry.teamMembers.length
        : 0;

    return {
      teamId: entry.participantId,
      teamName: entry.participantName,
      avgHandicap,
      totalPoints: entry.totalPoints,
      members: entry.teamMembers.map((member) => ({
        playerId: member.playerId,
        playerName: member.playerName,
        handicap: member.handicap,
        points: 0, // Individual points not tracked at competition level
        roundsPlayed: entry.roundsPlayed,
      })),
    };
  });
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export const LeaderboardTab = React.memo(function LeaderboardTab({
  competitionId,
  teamMode,
  rounds,
  currentUserId,
  autoRefresh = true,
  onEntryPress,
  selectedView,
  onViewChange,
  scrollTarget,
  onScrollHandled,
}: LeaderboardTabProps) {
  const _colors = useThemeColors();
  const hasTeams = teamMode !== 'none';

  // Get completed rounds for round-specific leaderboards
  const completedRounds = useMemo(
    () => rounds.filter((round) => round.status === 'completed'),
    [rounds]
  );

  // Get in-progress rounds
  const inProgressRounds = useMemo(
    () => rounds.filter((round) => round.status === 'in-progress'),
    [rounds]
  );

  // Check if ALL rounds are scramble format (individual standings become irrelevant)
  const isAllScrambleFormat = useMemo(
    () => rounds.length > 0 && rounds.every((round) => round.team_format === 'scramble'),
    [rounds]
  );

  // Controlled-with-fallback selectedView. Parent passes selectedView+onViewChange
  // when it wants to drive the toggle (e.g., from a deep-link). Otherwise we fall
  // back to internal state so standalone usage (stories/tests) stays unchanged.
  const [internalView, setInternalView] = useState<LeaderboardView>(
    hasTeams ? 'team' : 'individual'
  );
  const isControlled = selectedView !== undefined;
  const view: LeaderboardView = isControlled ? selectedView! : internalView;

  // Effective view (forced to 'team' for scramble-only competitions)
  const effectiveView = isAllScrambleFormat ? 'team' : view;

  // Determine filter based on selected view
  // For scramble-only competitions, always use 'teams' filter
  const filter: LeaderboardFilter = useMemo(() => {
    if (!hasTeams) return 'individuals';
    if (isAllScrambleFormat) return 'teams'; // Scramble competitions only show team standings
    return view === 'team' ? 'teams' : 'individuals';
  }, [hasTeams, view, isAllScrambleFormat]);

  // Fetch leaderboard data using the new hook
  const {
    data: leaderboard,
    isLoading,
    error,
    refetch,
  } = useCompetitionLeaderboard(competitionId, {
    filter,
    autoRefresh,
  });

  // Handle view change (forwards to parent when controlled, else updates local state)
  const handleViewChange = useCallback(
    (next: LeaderboardView) => {
      if (isControlled) {
        onViewChange?.(next);
      } else {
        setInternalView(next);
      }
    },
    [isControlled, onViewChange]
  );

  // Best-effort scrollTarget acknowledgement. Once data is available, signal back
  // to the parent so it can clear the transient state. The visible currentUserId
  // row highlight provides the immediate visual cue; imperative scroll-into-view
  // across all four list variants is deferred.
  React.useEffect(() => {
    if (scrollTarget && leaderboard && !isLoading) {
      onScrollHandled?.();
    }
  }, [scrollTarget, leaderboard, isLoading, onScrollHandled]);

  // Handle entry press to show points breakdown modal
  const handleEntryPress = useCallback((participantId: string) => {
    if (!onEntryPress || !leaderboard) return;
    const entry = leaderboard.find((e) => e.participantId === participantId);
    if (entry) {
      onEntryPress(entry);
    }
  }, [onEntryPress, leaderboard]);

  // Convert to appropriate format based on view
  const individualEntries = useMemo(() => {
    if (!leaderboard || effectiveView !== 'individual') return [];
    return toLeaderboardTableEntries(leaderboard);
  }, [leaderboard, effectiveView]);

  const teamEntries = useMemo(() => {
    if (!leaderboard || effectiveView !== 'team') return [];
    return toTeamLeaderboardEntries(leaderboard);
  }, [leaderboard, effectiveView]);

  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="lg" message="Loading leaderboard..." />
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <ErrorState
        error={error.message || 'An unexpected error occurred'}
        onRetry={() => refetch()}
        title="Failed to load leaderboard"
      />
    );
  }

  const isEmpty = !leaderboard || leaderboard.length === 0;

  return (
    <View style={styles.container} testID="leaderboard-tab">
      {/* View Toggle (Individual / Team) - hidden for scramble-only competitions */}
      <ViewToggle
        selectedView={view}
        onViewChange={handleViewChange}
        showTeamOption={hasTeams}
        hideIndividualOption={isAllScrambleFormat}
      />

      {/* Overall Standings Section */}
      <SectionHeader
        title={effectiveView === 'team' ? 'Team Standings' : 'Individual Standings'}
        icon={effectiveView === 'team' ? 'account-group-outline' : 'account-outline'}
      />

      {/* Standings Content */}
      {isEmpty ? (
        <EmptyLeaderboardState type={effectiveView} />
      ) : effectiveView === 'team' ? (
        <TeamLeaderboardTable
          leaderboard={teamEntries}
          currentUserId={currentUserId}
          isLoading={false}
          showTiedIndicator
          hideMemberPoints={isAllScrambleFormat}
          testID="competition-team-leaderboard"
        />
      ) : (
        <LeaderboardTable
          leaderboard={individualEntries}
          currentUserId={currentUserId}
          isLoading={false}
          showRoundsPlayed
          showTiedIndicator={false}
          onEntryPress={onEntryPress ? handleEntryPress : undefined}
          testID="competition-individual-leaderboard"
        />
      )}

      {/* Round-Specific Leaderboards Section */}
      {(completedRounds.length > 0 || inProgressRounds.length > 0) && (
        <View style={styles.roundsSection}>
          <SectionHeader
            title="Round Results"
            icon="calendar-outline"
          />

          {/* In-Progress Rounds */}
          {inProgressRounds.map((round) => (
            <View key={round.id} style={styles.roundLeaderboardContainer}>
              <RoundLeaderboard
                roundId={round.id}
                gameType={round.game_type as GameType}
                isTeamRound={round.is_team_round || false}
                currentUserId={currentUserId}
                autoRefresh={autoRefresh}
                testID={`round-leaderboard-${round.round_number}`}
              />
            </View>
          ))}

          {/* Completed Rounds */}
          {completedRounds.map((round) => (
            <View key={round.id} style={styles.roundLeaderboardContainer}>
              <RoundLeaderboard
                roundId={round.id}
                gameType={round.game_type as GameType}
                isTeamRound={round.is_team_round || false}
                currentUserId={currentUserId}
                autoRefresh={false}
                testID={`round-leaderboard-${round.round_number}`}
              />
            </View>
          ))}
        </View>
      )}

      {/* Empty state for rounds section when no rounds */}
      {rounds.length === 0 && (
        <View style={styles.roundsSection}>
          <SectionHeader
            title="Round Results"
            icon="calendar-outline"
          />
          <EmptyLeaderboardState
            type="rounds"
            message="No rounds have been created yet. Add rounds to see per-round results."
          />
        </View>
      )}

      {/* Empty state for rounds section when rounds exist but none completed */}
      {rounds.length > 0 && completedRounds.length === 0 && inProgressRounds.length === 0 && (
        <View style={styles.roundsSection}>
          <SectionHeader
            title="Round Results"
            icon="calendar-outline"
          />
          <EmptyLeaderboardState
            type="rounds"
            message="Round results will appear once scoring begins."
          />
        </View>
      )}
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Loading
  loadingContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  // View Toggle
  toggleContainer: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  toggleButtonActive: {
    ...shadows.sm,
  },
  toggleButtonText: {
    ...typography.small,
  },
  toggleButtonTextActive: {
    fontWeight: '600',
  },

  // Empty State
  emptyCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
  },

  // Rounds Section
  roundsSection: {
    marginTop: spacing.xl,
  },
  roundLeaderboardContainer: {
    marginBottom: spacing.lg,
  },
});

export default LeaderboardTab;
