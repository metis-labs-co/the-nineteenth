/**
 * DetailsTab - Competition details
 *
 * Shows:
 * - Competition header card
 * - Mini-leaderboard standing (you ± 1, individual + team) for players
 * - Prize pool section
 */

import React, { useMemo } from 'react';
import { View } from 'react-native';
import type { Competition, GameType } from '@/types/database.types';
import type { CompetitionPrizePool, PrizePoolPlacement } from '@/types';
import type { MiniLeaderboardData } from '@/utils/miniLeaderboard';
import { type RoundWithCourse } from './types';
import {
  CompetitionInfoSection,
  InProgressRoundSection,
  ManageActionsSection,
  type ManageAction,
  MiniLeaderboardSection,
  PrizePoolSection,
  WhatsAppGroupSection,
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
  prizePool?: CompetitionPrizePool | null;
  prizePoolPlacements?: PrizePoolPlacement[];
  teamPrizePool?: CompetitionPrizePool | null;
  teamPrizePoolPlacements?: PrizePoolPlacement[];
  isPrizePoolLocked?: boolean;
  /** Open Competition Settings to manage prize pools (organizers only) */
  onManagePrizePools?: () => void;
  onViewPrizePoolTransactions?: () => void;
  /** Open the scorecard for a round (used by the In Progress quick link). */
  onScoreRound?: (roundId: string, gameType: GameType, isTeamRound: boolean) => void;
  /** Open the round detail screen (used by the In Progress quick link). */
  onViewRound?: (roundId: string) => void;
  // Organiser "Manage" quick-action grid. Each handler is optional; a tile
  // renders only when its handler is provided (so capability gating — e.g.
  // teams — is expressed by omitting the callback). The grid is organiser-only.
  onAddRound?: () => void;
  onFormatsPoints?: () => void;
  onManageTeams?: () => void;
  onPairings?: () => void;
  onOpenSettings?: () => void;
  onShareInvite?: () => void;
}

export const DetailsTab = React.memo(function DetailsTab({
  competition,
  rounds,
  playerCount: _playerCount,
  isPlayer,
  miniIndividual,
  miniTeam,
  userTeamName,
  onOpenLeaderboard,
  isOrganizer,
  prizePool,
  prizePoolPlacements,
  teamPrizePool,
  teamPrizePoolPlacements,
  isPrizePoolLocked = false,
  onManagePrizePools,
  onViewPrizePoolTransactions,
  onScoreRound,
  onViewRound,
  onAddRound,
  onFormatsPoints,
  onManageTeams,
  onPairings,
  onOpenSettings,
  onShareInvite,
}: DetailsTabProps) {
  // Organiser quick-action grid (mock's "Manage" section). Built from the
  // handlers the screen supplies; a tile appears only when its handler exists,
  // so gating (e.g. teams only for team competitions) is done by the screen.
  const manageActions = useMemo<ManageAction[]>(() => {
    if (!isOrganizer) return [];
    const candidates: (ManageAction | null)[] = [
      onAddRound ? { key: 'add-round', label: 'Add round', icon: 'plus', onPress: onAddRound } : null,
      onFormatsPoints
        ? { key: 'formats', label: 'Formats & points', icon: 'trophy-outline', onPress: onFormatsPoints }
        : null,
      onManageTeams
        ? { key: 'teams', label: 'Manage teams', icon: 'account-group-outline', onPress: onManageTeams }
        : null,
      onPairings ? { key: 'pairings', label: 'Pairings', icon: 'tournament', onPress: onPairings } : null,
      onOpenSettings ? { key: 'settings', label: 'Settings', icon: 'cog-outline', onPress: onOpenSettings } : null,
      onShareInvite
        ? { key: 'share', label: 'Share invite', icon: 'share-variant', onPress: onShareInvite }
        : null,
    ];
    return candidates.filter((a): a is ManageAction => a !== null);
  }, [isOrganizer, onAddRound, onFormatsPoints, onManageTeams, onPairings, onOpenSettings, onShareInvite]);

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
      <ManageActionsSection actions={manageActions} />

      {showCompetitionInfo && <CompetitionInfoSection competition={competition} />}

      {inProgressRounds.length > 0 && onScoreRound && onViewRound && (
        <InProgressRoundSection
          rounds={inProgressRounds}
          onScoreRound={onScoreRound}
          onViewRound={onViewRound}
          roundDisplayNumbers={roundDisplayNumbers}
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
