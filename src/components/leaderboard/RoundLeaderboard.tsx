/**
 * RoundLeaderboard - Format-specific leaderboard display for individual rounds
 *
 * Renders different layouts based on gameType:
 * - Stableford/Ambrose/Best Ball: Table with Position, Name, Score columns
 * - Stroke: Table with Position, Name, Net, Gross columns
 * - Match Play: Card list showing matchups with results
 *
 * Features:
 * - Round info header with game type badge and date
 * - Handles team rounds by showing team names
 * - Loading and error states
 * - Auto-refresh support via useRoundLeaderboard hook
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { IconAlertTriangle } from '@tabler/icons-react-native';
import { LoadingSpinner, ScaledText } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { useRoundLeaderboard } from '@/hooks/useRoundLeaderboard';
import { spacing, typography } from '@/constants/theme';
import type { GameType } from '@/types';

// Sub-components
import { LeaderboardHeader } from './LeaderboardHeader';
import { StablefordLeaderboard } from './StablefordLeaderboard';
import { StrokePlayLeaderboard } from './StrokePlayLeaderboard';
import { MatchPlayLeaderboard } from './MatchPlayLeaderboard';
import type { PlayerTeamLookup } from './LeaderboardRow';
import { styles } from './RoundLeaderboard.styles';

// =====================================================
// TYPES
// =====================================================

export interface RoundLeaderboardProps {
  /** The round ID to fetch leaderboard data for */
  roundId: string;
  /** The game type for this round (stableford, stroke, match-play) */
  gameType: GameType;
  /** Whether this is a team round */
  isTeamRound: boolean;
  /** Current user ID for highlighting their row */
  currentUserId?: string;
  /** Enable auto-refresh (default: true) */
  autoRefresh?: boolean;
  /** Auto-refresh interval in ms (default: 30000) */
  refetchInterval?: number;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Test ID for testing */
  testID?: string;
  /**
   * Restrict the rendered subset to either team or individual rows. When set,
   * the split TEAMS/PLAYERS layout is bypassed and only the requested subset
   * is shown. The component renders nothing if the requested subset is empty
   * but other entries exist (e.g., team tab on an individual-only round).
   */
  filterView?: 'team' | 'individual';
  /**
   * Optional player_id -> team membership lookup. When provided, individual
   * player rows render a team chip beneath the name (matching the competition
   * individual standings). Pass only when the parent has team data available.
   */
  playerTeamLookup?: PlayerTeamLookup;
  /** Optional round name to display in the header (falls back to "Round N"). */
  roundName?: string | null;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export const RoundLeaderboard = React.memo(function RoundLeaderboard({
  roundId,
  gameType,
  isTeamRound,
  currentUserId,
  autoRefresh = true,
  refetchInterval = 30000,
  emptyMessage = 'Scores will appear here once players submit their scorecards.',
  testID,
  filterView,
  playerTeamLookup,
  roundName,
}: RoundLeaderboardProps) {
  const colors = useThemeColors();

  const { data, isLoading, isError, error, refetch } = useRoundLeaderboard(
    roundId,
    {
      autoRefresh,
      refetchInterval,
      enabled: !!roundId,
    }
  );

  // Subset to display based on filterView. When unfiltered, this is the full
  // sorted list; the renderer below picks the split layout when both subsets
  // are populated.
  const visibleEntries = useMemo(() => {
    if (!data) return [];
    if (filterView === 'team') return data.teamEntries;
    if (filterView === 'individual') return data.individualEntries;
    return data.entries;
  }, [data, filterView]);

  // Check if any visible entries have bypassed scores (must be before early returns)
  const hasBypassedEntries = useMemo(
    () => visibleEntries.some((entry) => entry.bypassed),
    [visibleEntries]
  );

  // Only use the TEAMS/PLAYERS split layout when no view filter is active.
  const hasSplit = useMemo(
    () =>
      !!data &&
      filterView === undefined &&
      data.teamEntries.length > 0 &&
      data.individualEntries.length > 0,
    [data, filterView]
  );

  // Loading state
  if (isLoading) {
    return (
      <View
        style={styles.loadingContainer}
        testID={testID ? `${testID}-loading` : undefined}
      >
        <LoadingSpinner size="lg" message="Loading leaderboard..." />
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View testID={testID ? `${testID}-error` : undefined}>
        <ErrorState
          title="Failed to load leaderboard"
          error={error?.message || 'An unexpected error occurred'}
          onRetry={refetch}
        />
      </View>
    );
  }

  // Empty state
  if (!data || data.entries.length === 0) {
    return (
      <View testID={testID ? `${testID}-empty` : undefined}>
        <LeaderboardHeader
          gameType={data?.metadata.gameType || gameType}
          isTeamRound={data?.metadata.isTeamRound ?? isTeamRound}
          date={data?.metadata.date}
          courseName={data?.metadata.courseName}
          roundNumber={data?.metadata.roundNumber || 1}
          teamFormat={data?.metadata.teamFormat}
          roundFormat={data?.metadata.roundFormat}
          subMatchSize={data?.metadata.subMatchSize}
          rulesOverride={data?.metadata.rulesOverride}
          roundName={roundName}
        />
        <EmptyState
          title="No scores yet"
          message={emptyMessage}
          icon="clipboard-list-outline"
          compact
        />
      </View>
    );
  }

  // When a view filter is active and the requested subset has no entries
  // (e.g., team tab on a round that only produced individual results), hide
  // this round entirely from the parent list.
  if (filterView !== undefined && visibleEntries.length === 0) {
    return null;
  }

  const { teamEntries, individualEntries, metadata } = data;
  const effectiveGameType = metadata.gameType;

  // Format par score display (+3, -2, E)
  const formatParScore = (value: number): string => {
    if (value === 0) return 'E';
    return value > 0 ? `+${value}` : `${value}`;
  };

  // Render the format-specific table for a given subset of entries.
  // The per-round view drops the CP column (CP belongs on the competition
  // standings, not the round-specific table) so callers can skip it via
  // `showCompetitionPoints={false}`.
  const renderTableFor = (subset: typeof visibleEntries) => {
    switch (effectiveGameType) {
      case 'match-play':
        // Match-play rendering already groups its own match cards; CP isn't
        // shown there today, so the prop is irrelevant.
        return (
          <MatchPlayLeaderboard
            entries={subset}
            currentUserId={currentUserId}
            isTeamRound={metadata.isTeamRound}
            roundStatus={metadata.status}
          />
        );
      case 'stroke':
        return (
          <StrokePlayLeaderboard
            entries={subset}
            currentUserId={currentUserId}
            showCompetitionPoints={false}
            playerTeamLookup={playerTeamLookup}
          />
        );
      case 'par':
        return (
          <StablefordLeaderboard
            entries={subset}
            currentUserId={currentUserId}
            scoreColumnHeader="Score"
            scoreLabel="par score"
            formatScore={formatParScore}
            showCompetitionPoints={false}
            playerTeamLookup={playerTeamLookup}
          />
        );
      case 'stableford':
      case 'scramble':
      case 'shamble':
      case 'best-ball':
      default:
        return (
          <StablefordLeaderboard
            entries={subset}
            currentUserId={currentUserId}
            showCompetitionPoints={false}
            playerTeamLookup={playerTeamLookup}
          />
        );
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Header */}
      <LeaderboardHeader
        gameType={effectiveGameType}
        isTeamRound={metadata.isTeamRound}
        date={metadata.date}
        courseName={metadata.courseName}
        roundNumber={metadata.roundNumber}
        teamFormat={metadata.teamFormat}
        roundFormat={metadata.roundFormat}
        subMatchSize={metadata.subMatchSize}
        rulesOverride={metadata.rulesOverride}
        roundName={roundName}
      />

      {/* Leaderboard Content. When a round has both team and individual
          results we render two stacked tables so each gets its own header,
          its own rank-1 trophy, and its own column labels. */}
      {hasSplit ? (
        <>
          <View
            style={[styles.card, { backgroundColor: colors.surface }, splitStyles.firstSection]}
            testID={testID ? `${testID}-teams` : undefined}
          >
            <ScaledText
              category="caption"
              style={[splitStyles.sectionLabel, { color: colors.textSecondary }]}
            >
              TEAMS
            </ScaledText>
            {renderTableFor(teamEntries)}
          </View>
          <View
            style={[styles.card, { backgroundColor: colors.surface }, splitStyles.secondSection]}
            testID={testID ? `${testID}-individuals` : undefined}
          >
            <ScaledText
              category="caption"
              style={[splitStyles.sectionLabel, { color: colors.textSecondary }]}
            >
              PLAYERS
            </ScaledText>
            {renderTableFor(individualEntries)}
          </View>
        </>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {renderTableFor(visibleEntries)}
        </View>
      )}

      {/* Legend for bypassed indicator */}
      {hasBypassedEntries && (
        <View style={legendStyles.container}>
          <IconAlertTriangle size={14} color={colors.warning} />
          <ScaledText category="caption" style={[legendStyles.text, { color: colors.textTertiary }]}>
            Submitted without partner verification
          </ScaledText>
        </View>
      )}
    </View>
  );
});

// =====================================================
// LOCAL STYLES
// =====================================================

const legendStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.caption,
  },
});

const splitStyles = StyleSheet.create({
  firstSection: {
    marginBottom: spacing.md,
  },
  secondSection: {
    marginBottom: 0,
  },
  sectionLabel: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
});

export default RoundLeaderboard;
