// src/components/teams/useTeamFormation.ts
import { useState, useCallback, useMemo } from 'react';
import { LayoutAnimation } from 'react-native';
import { useAutoGenerateTeams } from '@/hooks/useTeams';
import type { TeamWithMembers } from '@/types/database.types';
import {
  calculateHandicapSpread,
  getBalanceQuality,
  areAllPlayersAssigned,
  swapPlayers,
  type BalanceQuality,
} from './teamAlgorithms';

/**
 * Selected player state for swap operations
 */
export interface SelectedPlayerState {
  teamIndex: number;
  memberIndex: number;
  playerId: string;
}

/**
 * Props for the useTeamFormation hook
 */
interface UseTeamFormationProps {
  competitionId: string;
  teamSize: 2 | 3 | 4;
  existingTeams: TeamWithMembers[];
  totalPlayers: number;
}

/**
 * Return type for the useTeamFormation hook
 */
interface UseTeamFormationReturn {
  // State
  teams: TeamWithMembers[];
  selectedPlayer: SelectedPlayerState | null;
  hasChanges: boolean;
  isGenerating: boolean;

  // Computed values
  handicapSpread: number;
  balanceQuality: BalanceQuality;
  allPlayersAssigned: boolean;
  canSave: boolean;

  // Actions
  handleAutoGenerate: () => void;
  handlePlayerPress: (teamIndex: number, memberIndex: number, playerId: string) => void;
  handleReset: () => void;
}

/**
 * Custom hook for team formation state and logic
 *
 * Manages:
 * - Team state and changes
 * - Player selection for swapping
 * - Auto-generation of balanced teams
 * - Balance quality calculations
 * - Validation
 */
export function useTeamFormation({
  competitionId,
  teamSize,
  existingTeams,
  totalPlayers,
}: UseTeamFormationProps): UseTeamFormationReturn {
  // State
  const [teams, setTeams] = useState<TeamWithMembers[]>(existingTeams);
  const [selectedPlayer, setSelectedPlayer] = useState<SelectedPlayerState | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Mutations
  const { mutate: generateTeams, isPending: isGenerating } = useAutoGenerateTeams();

  // Computed values
  const handicapSpread = useMemo(() => calculateHandicapSpread(teams), [teams]);
  const balanceQuality = useMemo(() => getBalanceQuality(handicapSpread), [handicapSpread]);
  const allPlayersAssigned = useMemo(
    () => areAllPlayersAssigned(teams, totalPlayers),
    [teams, totalPlayers]
  );

  // Validation
  const canSave = teams.length > 0 && allPlayersAssigned;

  /**
   * Handle auto-generate teams
   */
  const handleAutoGenerate = useCallback(() => {
    generateTeams(
      { competitionId, teamSize },
      {
        onSuccess: (generatedTeams) => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setTeams(generatedTeams);
          setHasChanges(true);
          setSelectedPlayer(null);
        },
        onError: (error) => {
          console.error('[useTeamFormation] Failed to generate teams:', error);
        },
      }
    );
  }, [competitionId, teamSize, generateTeams]);

  /**
   * Handle player selection for swapping
   */
  const handlePlayerPress = useCallback(
    (teamIndex: number, memberIndex: number, playerId: string) => {
      if (!selectedPlayer) {
        // First selection - select this player
        setSelectedPlayer({ teamIndex, memberIndex, playerId });
      } else if (selectedPlayer.teamIndex === teamIndex && selectedPlayer.memberIndex === memberIndex) {
        // Same player - deselect
        setSelectedPlayer(null);
      } else {
        // Different player - swap them
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        setTeams((prevTeams) =>
          swapPlayers(
            prevTeams,
            selectedPlayer.teamIndex,
            selectedPlayer.memberIndex,
            teamIndex,
            memberIndex
          )
        );

        setHasChanges(true);
        setSelectedPlayer(null);
      }
    },
    [selectedPlayer]
  );

  /**
   * Handle reset to original teams
   */
  const handleReset = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTeams(existingTeams);
    setHasChanges(false);
    setSelectedPlayer(null);
  }, [existingTeams]);

  return {
    // State
    teams,
    selectedPlayer,
    hasChanges,
    isGenerating,

    // Computed values
    handicapSpread,
    balanceQuality,
    allPlayersAssigned,
    canSave,

    // Actions
    handleAutoGenerate,
    handlePlayerPress,
    handleReset,
  };
}
