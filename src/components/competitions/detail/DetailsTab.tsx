/**
 * DetailsTab - Competition details
 *
 * Shows:
 * - Competition header card
 * - Mini-leaderboard standing (you ± 1, individual + team) for players
 * - Competition settings
 * - Prize pool section
 */

import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { Competition, GameType, TeamWithMembers } from '@/types/database.types';
import type { CompetitionPrizePool, PrizePoolPlacement } from '@/types';
import type { MiniLeaderboardData } from '@/utils/miniLeaderboard';
import { type RoundWithCourse } from './types';
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
  /** Switches to the Ringer tab. Omitted when no qualifying rounds exist. */
  onViewRinger?: () => void;
  /** Open the scorecard for a round (used by the In Progress quick link). */
  onScoreRound?: (roundId: string, gameType: GameType, isTeamRound: boolean) => void;
  /** Open the round detail screen (used by the In Progress quick link). */
  onViewRound?: (roundId: string) => void;
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
  onViewRinger,
  onScoreRound,
  onViewRound,
}: DetailsTabProps) {
  const colors = useThemeColors();
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

      {onViewRinger && (
        <TouchableOpacity
          onPress={onViewRinger}
          style={[
            styles.ringerCta,
            shadows.sm,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          accessibilityRole="button"
          accessibilityLabel="View ringer board"
        >
          <Icon source="trophy-outline" size={22} color={colors.primary} />
          <View style={styles.ringerCtaText}>
            <Text style={[typography.body, styles.ringerCtaTitle, { color: colors.textPrimary }]}>
              Ringer Board
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Best score on each hole across the rounds
            </Text>
          </View>
          <Icon source="chevron-right" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

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

const styles = StyleSheet.create({
  ringerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 44,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  ringerCtaText: {
    flex: 1,
  },
  ringerCtaTitle: {
    fontWeight: '600',
  },
});

export default DetailsTab;
