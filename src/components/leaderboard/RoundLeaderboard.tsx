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

  // Check if any entries have bypassed scores (must be before early returns)
  const hasBypassedEntries = useMemo(
    () => data?.entries.some((entry) => entry.bypassed) ?? false,
    [data?.entries]
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

  const { entries, metadata } = data;
  const effectiveGameType = metadata.gameType;

  // Format par score display (+3, -2, E)
  const formatParScore = (value: number): string => {
    if (value === 0) return 'E';
    return value > 0 ? `+${value}` : `${value}`;
  };

  // Select the appropriate leaderboard component based on game type
  const renderLeaderboardContent = () => {
    switch (effectiveGameType) {
      case 'match-play':
        return (
          <MatchPlayLeaderboard entries={entries} currentUserId={currentUserId} />
        );
      case 'stroke':
        return (
          <StrokePlayLeaderboard entries={entries} currentUserId={currentUserId} />
        );
      case 'par':
        return (
          <StablefordLeaderboard
            entries={entries}
            currentUserId={currentUserId}
            scoreColumnHeader="Score"
            scoreLabel="par score"
            formatScore={formatParScore}
          />
        );
      case 'stableford':
      case 'scramble':
      case 'shamble':
      case 'best-ball':
      default:
        return (
          <StablefordLeaderboard entries={entries} currentUserId={currentUserId} />
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
      />

      {/* Leaderboard Content */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {renderLeaderboardContent()}
      </View>

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

export default RoundLeaderboard;
