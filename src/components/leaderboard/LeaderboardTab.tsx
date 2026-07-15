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
import { indexById } from '@/utils/collections';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import {
  ErrorState,
  LoadingSpinner,
  SectionHeader,
  ScopeChips,
  type ScopeChipItem,
} from '@/components/common';
import { SegmentedButton } from '@/components/common/SegmentedButton';
import { IconUsers, IconUser, IconCalendar } from '@tabler/icons-react-native';
import { LeaderboardTable } from './LeaderboardTable';
import { TeamLeaderboardTable, type TeamLeaderboardEntry } from './TeamLeaderboardTable';
import { CupBoard } from './CupBoard';
import { RoundByRoundList, type RoundByRoundRow } from './RoundByRoundList';
import { mergeHeadToHeadRounds } from './teamHeadToHead';
import { TeamPointsToWinBanner } from './TeamPointsToWinBanner';
import { ROUND_PRESETS, inferPresetIdFromRound } from '@/constants/roundPresets';
import { getTeamColorHex } from '@/utils/teamColor';
import { summarizeCompetition, summarizeRoundPoints } from '@/utils/competitionPoints/roundPointsSummary';
import { RoundLeaderboard } from './RoundLeaderboard';
import {
  InProgressRoundLeaderboard,
  IN_PROGRESS_SUPPORTED_GAME_TYPES,
} from './InProgressRoundLeaderboard';
import { isSplitAltShotRound, isSplitMatchPlayRound, isTeamMatchPlayRound } from '@/utils/roundFormat';
import { RoundSubMatchLeaderboard } from './RoundSubMatchLeaderboard';
import { LeaderboardHeader } from './LeaderboardHeader';
import { buildPositionalRoundNumbers } from './roundNumbering';
import { useCompetitionLeaderboard, type LeaderboardFilter, type CompetitionLeaderboardEntry } from '@/hooks/useCompetitionLeaderboard';
import { useTeams } from '@/hooks/rounds';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { TeamMode, GameType, TeamWithMembers } from '@/types/database.types';
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
  /** True when the competition uses per-round rules — gates the team points-to-win banner. */
  perRoundRulesEnabled: boolean;
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
  /**
   * Render the Individual/Team toggle inside this component. Set to false when
   * the parent renders the toggle externally (e.g., to keep it pinned above a
   * scrolling tab body). Defaults to true.
   */
  renderInlineToggle?: boolean;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

export interface LeaderboardViewToggleProps {
  selectedView: LeaderboardView;
  onViewChange: (view: LeaderboardView) => void;
  showTeamOption: boolean;
  /** Hide individual option (e.g., for scramble-only competitions where individual standings don't apply) */
  hideIndividualOption?: boolean;
  /** Optional style override (e.g., to remove the default bottom margin when pinned) */
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
}

export const LeaderboardViewToggle = React.memo(function LeaderboardViewToggle({
  selectedView,
  onViewChange,
  showTeamOption,
  hideIndividualOption = false,
  style,
}: LeaderboardViewToggleProps) {
  // Hide toggle if no team option OR if individual is hidden (only team remains)
  if (!showTeamOption || hideIndividualOption) {
    return null;
  }

  return (
    <SegmentedButton<LeaderboardView>
      value={selectedView}
      onValueChange={onViewChange}
      buttons={[
        { value: 'individual', label: 'Individual', icon: 'account' },
        { value: 'team', label: 'Team', icon: 'account-group' },
      ]}
      size="small"
      style={[styles.viewToggle, style]}
    />
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

/** Short format label for a round — used by scope chips + round-by-round badges. */
function roundShortFormatLabel(round: RoundWithCourse): string {
  const presetId = inferPresetIdFromRound(round);
  if (presetId) return ROUND_PRESETS[presetId].shortTitle;
  const gt = (round.game_type ?? '').replace(/-/g, ' ');
  return gt ? gt.charAt(0).toUpperCase() + gt.slice(1) : 'Round';
}

/** Full format title for a round. */
function roundFormatTitle(round: RoundWithCourse): string {
  const presetId = inferPresetIdFromRound(round);
  if (presetId) return ROUND_PRESETS[presetId].title;
  return roundShortFormatLabel(round);
}

/** Points formatted with ½ for halves (cup scores). */
function formatHalfPoints(points: number): string {
  const whole = Math.floor(points);
  const hasHalf = points - whole >= 0.5;
  if (hasHalf) return whole > 0 ? `${whole}½` : '½';
  return `${points}`;
}

/**
 * Build a player_id -> { teamName, teamColor } lookup from competition teams.
 * Used to display each player's team membership on the individual leaderboard.
 */
function buildPlayerTeamLookup(
  teams: TeamWithMembers[] | undefined
): Map<string, { teamName: string; teamColor: string | null }> {
  const lookup = new Map<string, { teamName: string; teamColor: string | null }>();
  if (!teams) return lookup;
  for (const team of teams) {
    for (const member of team.members) {
      lookup.set(member.player_id, { teamName: team.name, teamColor: team.color });
    }
  }
  return lookup;
}

/**
 * Convert CompetitionLeaderboardEntry to LeaderboardEntry format for LeaderboardTable.
 * When a player-team lookup is provided, attaches each player's team name/colour so
 * the individual standings can show team membership in team competitions.
 */
function toLeaderboardTableEntries(
  entries: CompetitionLeaderboardEntry[],
  playerTeamLookup?: Map<string, { teamName: string; teamColor: string | null }>
) {
  return entries.map((entry) => {
    const team = playerTeamLookup?.get(entry.participantId);
    return {
      playerId: entry.participantId,
      playerName: entry.participantName,
      handicap: entry.handicap ?? 0,
      totalPoints: entry.totalPoints,
      roundsPlayed: entry.roundsPlayed,
      teamName: team?.teamName ?? null,
      teamColor: team?.teamColor ?? null,
    };
  });
}

/**
 * Convert CompetitionLeaderboardEntry to TeamLeaderboardEntry format for TeamLeaderboardTable.
 *
 * The expanded row shows a per-round points breakdown (rather than per-player
 * points, which aren't tracked at the competition level for teams). Round
 * labels are looked up from the competition's rounds list.
 */
function toTeamLeaderboardEntries(
  entries: CompetitionLeaderboardEntry[],
  rounds: RoundWithCourse[]
): TeamLeaderboardEntry[] {
  // Build a lookup for round metadata so the breakdown can show round number + course
  const roundsById = indexById(rounds);
  const positionalByRoundId = buildPositionalRoundNumbers(rounds);

  return entries.map((entry) => {
    // Calculate average handicap from team members
    const avgHandicap =
      entry.teamMembers.length > 0
        ? entry.teamMembers.reduce((sum, m) => sum + m.handicap, 0) / entry.teamMembers.length
        : 0;

    // Build per-round breakdown, ordered by positional round number
    const roundBreakdown = entry.roundPoints
      .map((rp) => {
        const round = roundsById.get(rp.roundId);
        const positional = positionalByRoundId.get(rp.roundId);
        return {
          roundId: rp.roundId,
          roundLabel: positional ? `R${positional}` : 'R?',
          courseName: round?.course?.name ?? undefined,
          position: rp.position,
          points: rp.points,
          _sortKey: positional ?? Number.MAX_SAFE_INTEGER,
        };
      })
      .sort((a, b) => a._sortKey - b._sortKey)
      .map(({ _sortKey: _omit, ...keep }) => keep);

    return {
      teamId: entry.participantId,
      teamName: entry.participantName,
      avgHandicap,
      totalPoints: entry.totalPoints,
      members: entry.teamMembers.map((member) => ({
        playerId: member.playerId,
        playerName: member.playerName,
        handicap: member.handicap,
      })),
      roundBreakdown,
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
  perRoundRulesEnabled,
  currentUserId,
  autoRefresh = true,
  onEntryPress,
  selectedView,
  onViewChange,
  scrollTarget,
  onScrollHandled,
  renderInlineToggle = true,
}: LeaderboardTabProps) {
  const _colors = useThemeColors();
  const hasTeams = teamMode !== 'none';

  // User-facing round numbers: 1-based position within the display_order-sorted
  // list, so gaps left by deleted/reordered rounds don't surface (matches the
  // Rounds tab). `round.round_number` is a stable id with gaps — display only.
  const positionalRoundNumbers = useMemo(
    () => buildPositionalRoundNumbers(rounds),
    [rounds]
  );

  // Check if ALL rounds are single-ball team format (scramble/alt-shot — individual standings become irrelevant)
  const isAllScrambleFormat = useMemo(
    () => rounds.length > 0 && rounds.every((round) => round.team_format === 'scramble' || round.team_format === 'alt-shot'),
    [rounds]
  );

  // Standings scope: 'overall' or a round id. Driven by the ScopeChips row —
  // 'overall' shows the competition board + round-by-round list; a round id
  // shows just that round's board (redesign).
  const [scope, setScope] = useState<string>('overall');

  // If the selected round disappears (deleted/reordered away), fall back.
  React.useEffect(() => {
    if (scope !== 'overall' && !rounds.some((r) => r.id === scope)) {
      setScope('overall');
    }
  }, [scope, rounds]);

  // All rounds in display order, regardless of status (scope chips include
  // upcoming rounds, which render a "not played yet" board).
  const allRoundsOrdered = useMemo(
    () => [...rounds].sort((a, b) => a.display_order - b.display_order),
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

  // Fetch teams (only for team competitions) so individual standings can show
  // each player's team under their name.
  const { data: teams } = useTeams(hasTeams ? competitionId : '');

  const playerTeamLookup = useMemo(() => buildPlayerTeamLookup(teams), [teams]);

  // teamId -> hex colour lookup, shared by TeamHeadToHeadCard so the two-team
  // scoreboard uses each team's stored avatar colour (falling back to the
  // legacy index-based theme cycle for teams without one).
  const teamColorById = useMemo(() => {
    const map = new Map<string, string>();
    (teams ?? []).forEach((team, index) => {
      map.set(team.id, getTeamColorHex(team.color, index, _colors));
    });
    return map;
  }, [teams, _colors]);

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
    return toLeaderboardTableEntries(leaderboard, hasTeams ? playerTeamLookup : undefined);
  }, [leaderboard, effectiveView, hasTeams, playerTeamLookup]);

  const teamEntries = useMemo(() => {
    if (!leaderboard || effectiveView !== 'team') return [];
    return toTeamLeaderboardEntries(leaderboard, rounds);
  }, [leaderboard, effectiveView, rounds]);

  // Members per team, derived from loaded team rosters (mirrors
  // PointsConfigSection's derivation). Shared by teamPointsToWin and the
  // per-round points badge below. 0 when teams haven't loaded yet.
  const membersPerTeam = useMemo(() => {
    const counts = (teams ?? []).map((t) => t.members.length).filter((n) => n > 0);
    return counts.length > 0 ? Math.max(...counts) : 0;
  }, [teams]);

  // Points target for the team standings overview. Only meaningful for per-round
  // team competitions.
  const teamPointsToWin = useMemo(() => {
    if (effectiveView !== 'team' || !hasTeams || !perRoundRulesEnabled) return null;
    if (membersPerTeam === 0) return null; // teams not loaded yet — avoid a wrong banner
    const { total, toWin } = summarizeCompetition(rounds, { membersPerTeam });
    return { total, toWin };
  }, [effectiveView, hasTeams, perRoundRulesEnabled, membersPerTeam, rounds]);

  // Per-round points/status badge (e.g. "Dinner bet · 0 points") shown on a
  // round's leaderboard header. Only meaningful for per-round team
  // competitions where the round has an explicit points override configured.
  const roundPointsBadge = useCallback(
    (round: RoundWithCourse): string | undefined =>
      hasTeams &&
      perRoundRulesEnabled &&
      membersPerTeam > 0 &&
      (round.rules_override?.pair_points || round.rules_override?.team_points)
        ? summarizeRoundPoints(round, { membersPerTeam }).detail
        : undefined,
    [hasTeams, perRoundRulesEnabled, membersPerTeam]
  );

  // Scope chips: Overall + one per round (short format label).
  const scopeChips: ScopeChipItem[] = useMemo(
    () => [
      {
        key: 'overall',
        eyebrow: 'Overall',
        label: hasTeams && (teams?.length ?? 0) === 2 ? 'The cup' : 'Standings',
      },
      ...allRoundsOrdered.map((round) => ({
        key: round.id,
        eyebrow: `Round ${positionalRoundNumbers.get(round.id) ?? round.round_number}`,
        label: roundShortFormatLabel(round),
      })),
    ],
    [allRoundsOrdered, hasTeams, teams, positionalRoundNumbers]
  );

  // Two-team head-to-head per-round scores (team view only) — feeds the
  // round-by-round rows' "2 – 0" scores and winner dots.
  const headToHeadRoundRows = useMemo(() => {
    if (effectiveView !== 'team' || teamEntries.length !== 2) return null;
    return mergeHeadToHeadRounds(
      teamEntries[0].roundBreakdown,
      teamEntries[1].roundBreakdown,
      positionalRoundNumbers
    );
  }, [effectiveView, teamEntries, positionalRoundNumbers]);

  const allRoundsCompleted =
    rounds.length > 0 && rounds.every((round) => round.status === 'completed');

  // Rows for the "Round by round" list under the overall board.
  const roundByRoundRows: RoundByRoundRow[] = useMemo(() => {
    const h2hByRoundId = new Map(
      (headToHeadRoundRows ?? []).map((row) => [row.roundId, row])
    );
    return allRoundsOrdered.map((round) => {
      const n = positionalRoundNumbers.get(round.id) ?? round.round_number;
      const badge = roundShortFormatLabel(round);
      const statusSub =
        round.status === 'completed'
          ? undefined
          : round.status === 'in-progress'
            ? 'In progress'
            : 'Not played yet';
      const sub =
        [round.course?.name, statusSub].filter(Boolean).join(' · ') || undefined;

      let score: string | undefined;
      let scoreColor: string | undefined;
      let dotColor: string | undefined;
      const h2h = h2hByRoundId.get(round.id);
      if (h2h && round.status !== 'upcoming') {
        score = `${formatHalfPoints(h2h.pointsLeft)} – ${formatHalfPoints(h2h.pointsRight)}`;
        if (h2h.pointsLeft > h2h.pointsRight) {
          const c = teamColorById.get(teamEntries[0]?.teamId ?? '');
          scoreColor = c;
          dotColor = c;
        } else if (h2h.pointsRight > h2h.pointsLeft) {
          const c = teamColorById.get(teamEntries[1]?.teamId ?? '');
          scoreColor = c;
          dotColor = c;
        } else {
          dotColor = _colors.borderStrong;
        }
      }

      return {
        key: round.id,
        badge,
        name: `Round ${n} · ${roundFormatTitle(round)}`,
        sub,
        score,
        scoreColor,
        dotColor,
        onPress: () => setScope(round.id),
      };
    });
  }, [
    allRoundsOrdered,
    headToHeadRoundRows,
    positionalRoundNumbers,
    teamColorById,
    teamEntries,
    _colors,
  ]);

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

  // Renders one round's board — shared by the per-round scope. JSX preserved
  // from the pre-redesign stacked list; only the surrounding structure changed.
  const renderRoundBoard = (round: RoundWithCourse, inProgress: boolean) => {
    const gameType = round.game_type as GameType;

    if (
      isSplitAltShotRound(round) ||
      isSplitMatchPlayRound(round) ||
      isTeamMatchPlayRound(round)
    ) {
      // Split alt-shot, split (1v1 singles) match-play, and team match-play
      // are all team formats — the sub-match board only makes sense in the
      // Team view. Team match-play with no sub-matches renders as a single
      // team-vs-team row (handled inside SubMatchLeaderboardTab).
      if (effectiveView !== 'team') {
        return (
          <EmptyLeaderboardState
            type="team"
            message="Switch to the Team view to see this round's matches."
          />
        );
      }
      return (
        <View style={styles.roundLeaderboardContainer}>
          <LeaderboardHeader
            roundNumber={positionalRoundNumbers.get(round.id) ?? round.round_number}
            gameType={gameType}
            isTeamRound={round.is_team_round}
            roundFormat={round.round_format}
            teamFormat={round.team_format}
            subMatchSize={round.sub_match_size}
            rulesOverride={round.rules_override}
            date={round.date ?? undefined}
            courseName={round.course?.name ?? undefined}
            roundName={round.name}
            pointsBadge={roundPointsBadge(round)}
          />
          <RoundSubMatchLeaderboard
            roundId={round.id}
            competitionId={competitionId}
            currentUserId={currentUserId}
          />
        </View>
      );
    }

    if (inProgress) {
      const canRenderLive =
        !round.is_team_round && IN_PROGRESS_SUPPORTED_GAME_TYPES.has(gameType);
      return (
        <View style={styles.roundLeaderboardContainer}>
          {canRenderLive ? (
            <InProgressRoundLeaderboard
              roundId={round.id}
              gameType={gameType}
              roundNumber={positionalRoundNumbers.get(round.id) ?? round.round_number}
              roundName={round.name}
              courseName={round.course?.name ?? undefined}
              currentUserId={currentUserId}
              testID={`round-leaderboard-${round.round_number}-live`}
            />
          ) : (
            <RoundLeaderboard
              roundId={round.id}
              gameType={gameType}
              isTeamRound={round.is_team_round || false}
              currentUserId={currentUserId}
              autoRefresh={autoRefresh}
              filterView={effectiveView}
              playerTeamLookup={
                effectiveView === 'individual' && hasTeams ? playerTeamLookup : undefined
              }
              roundName={round.name}
              roundNumber={positionalRoundNumbers.get(round.id) ?? round.round_number}
              pointsBadge={roundPointsBadge(round)}
              testID={`round-leaderboard-${round.round_number}`}
            />
          )}
        </View>
      );
    }

    return (
      <View style={styles.roundLeaderboardContainer}>
        <RoundLeaderboard
          roundId={round.id}
          gameType={gameType}
          isTeamRound={round.is_team_round || false}
          currentUserId={currentUserId}
          autoRefresh={false}
          filterView={effectiveView}
          playerTeamLookup={
            effectiveView === 'individual' && hasTeams ? playerTeamLookup : undefined
          }
          roundName={round.name}
          roundNumber={positionalRoundNumbers.get(round.id) ?? round.round_number}
          pointsBadge={roundPointsBadge(round)}
          testID={`round-leaderboard-${round.round_number}`}
        />
      </View>
    );
  };

  // "Not played yet" board for upcoming rounds selected via the scope chips.
  const renderNotPlayedBoard = (round: RoundWithCourse) => {
    const presetId = inferPresetIdFromRound(round);
    const summary = presetId ? ROUND_PRESETS[presetId].summary : undefined;
    return (
      <View
        style={[
          styles.notPlayedCard,
          { backgroundColor: _colors.surface, borderColor: _colors.border },
        ]}
        testID={`round-not-played-${round.id}`}
      >
        <Text style={[styles.notPlayedTitle, { color: _colors.textPrimary }]}>
          {roundFormatTitle(round)}
        </Text>
        {summary ? (
          <Text style={[styles.notPlayedSummary, { color: _colors.textSecondary }]}>
            {summary}
          </Text>
        ) : null}
        <View
          style={[styles.notPlayedPill, { backgroundColor: _colors.surfaceVariant }]}
        >
          <Text style={[styles.notPlayedPillText, { color: _colors.textSecondary }]}>
            Not played yet
          </Text>
        </View>
      </View>
    );
  };

  const scopedRound =
    scope === 'overall' ? null : allRoundsOrdered.find((r) => r.id === scope) ?? null;

  return (
    <View style={styles.container} testID="leaderboard-tab">
      {/* View Toggle (Individual / Team) - hidden for scramble-only competitions.
          Skipped when the parent renders the toggle externally to keep it pinned. */}
      {renderInlineToggle && (
        <LeaderboardViewToggle
          selectedView={view}
          onViewChange={handleViewChange}
          showTeamOption={hasTeams}
          hideIndividualOption={isAllScrambleFormat}
        />
      )}

      {/* Scope switcher: Overall vs a specific round */}
      {rounds.length > 0 && (
        <ScopeChips
          chips={scopeChips}
          selected={scope}
          onChange={setScope}
          style={styles.scopeChips}
          testID="standings-scope-chips"
        />
      )}

      {scope === 'overall' || !scopedRound ? (
        <>
          {/* Overall Standings Section */}
          <SectionHeader
            title={effectiveView === 'team' ? 'Team Standings' : 'Individual Standings'}
            icon={effectiveView === 'team' ? 'account-group-outline' : 'account-outline'}
          />

          {/* Standings Content */}
          {isEmpty ? (
            <EmptyLeaderboardState type={effectiveView} />
          ) : effectiveView === 'team' ? (
            <>
              {teamPointsToWin && (
                <TeamPointsToWinBanner
                  total={teamPointsToWin.total}
                  toWin={teamPointsToWin.toWin}
                />
              )}
              {teams?.length === 2 && teamEntries.length === 2 ? (
                <CupBoard
                  entries={[teamEntries[0], teamEntries[1]]}
                  teamColors={teamColorById}
                  pointsToWin={teamPointsToWin}
                  allRoundsCompleted={allRoundsCompleted}
                  testID="competition-team-headtohead"
                />
              ) : (
                <TeamLeaderboardTable
                  leaderboard={teamEntries}
                  currentUserId={currentUserId}
                  isLoading={false}
                  showTiedIndicator
                  testID="competition-team-leaderboard"
                />
              )}
            </>
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

          {/* Round by round: tappable rows that jump to a round's board */}
          {rounds.length > 0 ? (
            <View style={styles.roundsSection}>
              <SectionHeader title="Round by round" icon="calendar-outline" />
              <RoundByRoundList rows={roundByRoundRows} testID="round-by-round" />
            </View>
          ) : (
            <View style={styles.roundsSection}>
              <SectionHeader title="Round Results" icon="calendar-outline" />
              <EmptyLeaderboardState
                type="rounds"
                message="No rounds have been created yet. Add rounds to see per-round results."
              />
            </View>
          )}
        </>
      ) : (
        /* Single-round scope */
        <View testID={`standings-scope-${scopedRound.id}`}>
          {scopedRound.status === 'upcoming'
            ? renderNotPlayedBoard(scopedRound)
            : renderRoundBoard(scopedRound, scopedRound.status === 'in-progress')}
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
  viewToggle: {
    marginBottom: spacing.lg,
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

  // Scope switcher (redesign)
  scopeChips: {
    marginBottom: spacing.lg,
  },

  // Upcoming-round board
  notPlayedCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
  },
  notPlayedTitle: {
    ...typography.bodyBold,
  },
  notPlayedSummary: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  notPlayedPill: {
    marginTop: spacing.md,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  notPlayedPillText: {
    ...typography.captionBold,
  },
});

export default LeaderboardTab;
