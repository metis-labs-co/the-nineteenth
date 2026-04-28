/**
 * IndividualTeamLeaderboardTab — Toggleable leaderboard tab for the View
 * Round screen.
 *
 * Wraps the format-specific individual leaderboard with a Team / Individual
 * segmented control for team-stroke rounds (best-ball / aggregate). Defaults
 * to the Team view since the team result is the headline of these formats.
 *
 * Team standings are computed live from in-progress scorecards rather than
 * the server-side `round_results` (which only populates at finalization, so
 * an in-progress round would always read empty).
 */

import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@/constants/theme';
import { SegmentedButton } from '@/components/common/SegmentedButton';
import { TeamLeaderboardView } from '@/components/leaderboard/TeamLeaderboardView';
import { buildLiveTeamEntries } from '@/utils/teamScoring';
import type { Hole, HoleScore, MultiBallHoleScore, GameType, TeamFormat } from '@/types';
import type { TeamWithMembers } from '@/types/database/team.types';
import type { SubMatch } from '@/types/database/round.types';

type LeaderboardView = 'individual' | 'team';

interface IndividualTeamLeaderboardTabProps {
  teams: TeamWithMembers[];
  holes: Hole[];
  gameType: GameType;
  teamFormat: TeamFormat | null;
  getPlayerScore: (
    playerId: string,
    holeNumber: number
  ) => HoleScore | MultiBallHoleScore | undefined;
  /** Sub-matches for split rounds. Pass through so best-ball is computed
   *  per sub-match (and summed) instead of across the whole team. */
  subMatches?: SubMatch[];
  currentUserId?: string;
  /** Pre-rendered individual leaderboard. The wrapper just toggles its
   *  visibility against the team view — the parent picks the right
   *  format-specific component (StrokePlay / Stableford / Par). */
  individualView: React.ReactNode;
}

export function IndividualTeamLeaderboardTab({
  teams,
  holes,
  gameType,
  teamFormat,
  getPlayerScore,
  subMatches,
  currentUserId,
  individualView,
}: IndividualTeamLeaderboardTabProps) {
  const [view, setView] = useState<LeaderboardView>('team');

  const teamEntries = useMemo(() => {
    if (!teamFormat || teams.length === 0) return [];
    return buildLiveTeamEntries({
      teams,
      holes,
      gameType,
      teamFormat,
      getPlayerScore,
      subMatches,
    });
  }, [teams, holes, gameType, teamFormat, getPlayerScore, subMatches]);

  return (
    <View style={styles.container}>
      <View style={styles.toggleWrapper}>
        <SegmentedButton<LeaderboardView>
          value={view}
          onValueChange={setView}
          buttons={[
            { value: 'team', label: 'Team', icon: 'account-group' },
            { value: 'individual', label: 'Individual', icon: 'account' },
          ]}
          size="small"
        />
      </View>

      {view === 'team' ? (
        <TeamLeaderboardView
          teamEntries={teamEntries}
          teamFormat={teamFormat}
          currentUserId={currentUserId}
          isLoading={false}
        />
      ) : (
        individualView
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  toggleWrapper: {
    paddingHorizontal: spacing.md,
  },
});

export default IndividualTeamLeaderboardTab;
