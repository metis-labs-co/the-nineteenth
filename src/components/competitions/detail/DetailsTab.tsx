/**
 * DetailsTab - Competition details
 *
 * Shows:
 * - Status banner (countdown / live round / winner)
 * - Competition header card
 * - Organiser quick-action Manage grid
 * - Mini-leaderboard standing (you ± 1, individual + team) for players
 * - Scoring & format summary
 * - Prize pool section
 */

import React, { useMemo } from 'react';
import { View } from 'react-native';
import type { Competition, GameType, TeamWithMembers } from '@/types/database.types';
import type { CompetitionPrizePool, PrizePoolPlacement } from '@/types';
import type { MiniLeaderboardData } from '@/utils/miniLeaderboard';
import { type RoundWithCourse } from './types';
import { CompetitionStatusBanner } from './CompetitionStatusBanner';
import { ManageGrid } from './ManageGrid';
import {
  CompetitionInfoSection,
  InProgressRoundSection,
  MiniLeaderboardSection,
  SettingsSection,
  PrizePoolSection,
  WhatsAppGroupSection,
} from './sections';

export interface DetailsTabProps {
  competition: Competition;
  rounds: RoundWithCourse[];
  playerCount: number;
  /** Competition teams — used to show the actual team size on the settings card. */
  teams?: TeamWithMembers[];
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
  teamPrizePool?: CompetitionPrizePool | null;
  teamPrizePoolPlacements?: PrizePoolPlacement[];
  isPrizePoolLocked?: boolean;
  onUpdateCompetition?: (updates: Partial<Competition>) => Promise<void>;
  /** Open Competition Settings to manage prize pools (organizers only) */
  onManagePrizePools?: () => void;
  onViewPrizePoolTransactions?: () => void;
  /** Called when the Team Size row is pressed — switches to the Teams tab. */
  onViewTeams?: () => void;
  /** Open the scorecard for a round (used by the In Progress quick link). */
  onScoreRound?: (roundId: string, gameType: GameType, isTeamRound: boolean) => void;
  /** Open the round detail screen (used by the In Progress quick link). */
  onViewRound?: (roundId: string) => void;
  /** Open the add-round flow (organiser Manage grid). */
  onAddRound?: () => void;
  /** Navigate to the Competition Settings screen (organiser Manage grid). */
  onOpenSettings?: () => void;
}

export const DetailsTab = React.memo(function DetailsTab({
  competition,
  rounds,
  playerCount: _playerCount,
  teams,
  isPlayer,
  miniIndividual,
  miniTeam,
  userTeamName,
  onOpenLeaderboard,
  isOrganizer,
  hasStartedRound = false,
  prizePool,
  prizePoolPlacements,
  teamPrizePool,
  teamPrizePoolPlacements,
  isPrizePoolLocked = false,
  onUpdateCompetition: _onUpdateCompetition,
  onManagePrizePools,
  onViewPrizePoolTransactions,
  onViewTeams,
  onScoreRound,
  onViewRound,
  onAddRound,
  onOpenSettings,
}: DetailsTabProps) {
  const showMiniLeaderboard =
    isPlayer &&
    competition.competition_type !== 'knockout' &&
    miniIndividual !== null;

  const inProgressRounds = useMemo(
    () => rounds.filter((r) => r.status === 'in-progress'),
    [rounds]
  );
  // Once the competition is live, the page header already shows the name and
  // the standings/rounds tabs carry the context — the intro card just adds
  // scroll distance.
  const showCompetitionInfo =
    competition.status !== 'in-progress' && competition.status !== 'completed';
  const roundDisplayNumbers = useMemo(() => {
    const map: Record<string, number> = {};
    rounds.forEach((r, idx) => {
      map[r.id] = idx + 1;
    });
    return map;
  }, [rounds]);

  return (
    <View>
      <CompetitionStatusBanner
        competition={competition}
        rounds={rounds}
        miniIndividual={miniIndividual}
        miniTeam={miniTeam}
      />

      {showCompetitionInfo && <CompetitionInfoSection competition={competition} />}

      {inProgressRounds.length > 0 && onScoreRound && onViewRound && (
        <InProgressRoundSection
          rounds={inProgressRounds}
          onScoreRound={onScoreRound}
          onViewRound={onViewRound}
          roundDisplayNumbers={roundDisplayNumbers}
        />
      )}

      {isOrganizer && (
        <ManageGrid
          competition={competition}
          rounds={rounds}
          teams={teams}
          isOrganizer={isOrganizer}
          onAddRound={onAddRound}
          onViewTeams={onViewTeams}
          onOpenSettings={onOpenSettings}
        />
      )}

      <WhatsAppGroupSection
        whatsappUrl={competition.whatsapp_group_invite_url}
        isPlayer={isPlayer}
      />

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
        teams={teams}
        rounds={rounds}
        onViewTeams={onViewTeams}
      />

      <PrizePoolSection
        individualPool={prizePool ?? null}
        individualPlacements={prizePoolPlacements ?? []}
        teamPool={teamPrizePool ?? null}
        teamPlacements={teamPrizePoolPlacements ?? []}
        isOrganizer={isOrganizer}
        isLocked={isPrizePoolLocked}
        onManagePress={onManagePrizePools}
        onViewTransactionsPress={onViewPrizePoolTransactions}
      />
    </View>
  );
});

export default DetailsTab;
