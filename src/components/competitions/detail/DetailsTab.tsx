/**
 * DetailsTab - Competition details
 *
 * Shows:
 * - Competition header card
 * - Mini-leaderboard standing (you ± 1, individual + team) for players
 * - Competition settings
 * - Prize pool section
 */

import React from 'react';
import { View } from 'react-native';
import type { Competition } from '@/types/database.types';
import type { CompetitionPrizePool, PrizePoolPlacement } from '@/types';
import type { MiniLeaderboardData } from '@/utils/miniLeaderboard';
import { type RoundWithCourse } from './types';
import {
  CompetitionInfoSection,
  MiniLeaderboardSection,
  SettingsSection,
  PrizePoolSection,
} from './sections';

export interface DetailsTabProps {
  competition: Competition;
  rounds: RoundWithCourse[];
  playerCount: number;
  /** True when the current user is a player in this competition */
  isPlayer: boolean;
  /** 3-row individual mini-leaderboard window, or null to hide */
  miniIndividual: MiniLeaderboardData | null;
  /** 3-row team mini-leaderboard window, or null to hide team sub-section */
  miniTeam: MiniLeaderboardData | null;
  /** Display name for the user's team */
  userTeamName?: string;
  /** Called when user taps a mini-leaderboard sub-section */
  onOpenLeaderboard?: (view: 'individual' | 'team') => void;
  isOrganizer: boolean;
  /**
   * True once any round has started scoring. Locks structural settings
   * (competition_type, team_mode, team_size) from inline edit.
   */
  hasStartedRound?: boolean;
  prizePool?: CompetitionPrizePool | null;
  prizePoolPlacements?: PrizePoolPlacement[];
  isPrizePoolLocked?: boolean;
  onUpdateCompetition?: (updates: Partial<Competition>) => Promise<void>;
  onAddPrizePool?: () => void;
  onEditPrizePool?: () => void;
  onViewPrizePoolTransactions?: () => void;
  /** Called when the Team Size row is pressed — switches to the Teams tab. */
  onViewTeams?: () => void;
}

export const DetailsTab = React.memo(function DetailsTab({
  competition,
  rounds: _rounds,
  playerCount: _playerCount,
  isPlayer,
  miniIndividual,
  miniTeam,
  userTeamName,
  onOpenLeaderboard,
  isOrganizer,
  hasStartedRound = false,
  prizePool,
  prizePoolPlacements,
  isPrizePoolLocked = false,
  onUpdateCompetition: _onUpdateCompetition,
  onAddPrizePool,
  onEditPrizePool,
  onViewPrizePoolTransactions,
  onViewTeams,
}: DetailsTabProps) {
  const showMiniLeaderboard =
    isPlayer &&
    competition.competition_type !== 'knockout' &&
    miniIndividual !== null;

  return (
    <View>
      <CompetitionInfoSection competition={competition} />

      {showMiniLeaderboard && (
        <MiniLeaderboardSection
          individual={miniIndividual}
          team={miniTeam}
          teamName={userTeamName}
          onOpenLeaderboard={onOpenLeaderboard ?? (() => {})}
        />
      )}

      <SettingsSection
        competition={competition}
        isOrganizer={isOrganizer}
        hasStartedRound={hasStartedRound}
        onViewTeams={onViewTeams}
      />

      <PrizePoolSection
        pool={prizePool ?? null}
        placements={prizePoolPlacements ?? []}
        isOrganizer={isOrganizer}
        isLocked={isPrizePoolLocked}
        onAddPress={onAddPrizePool}
        onEditPress={onEditPrizePool}
        onViewTransactionsPress={onViewPrizePoolTransactions}
      />
    </View>
  );
});

export default DetailsTab;
