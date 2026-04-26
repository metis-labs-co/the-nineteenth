/**
 * useTeamScoreControls Hook
 *
 * Manages team handicap calculation, strokes on hole, stableford points,
 * and all score/shot contribution handlers for the TeamScoreCard.
 */

import { useCallback, useMemo } from 'react';
import { Animated, Dimensions } from 'react-native';
import { getStrokesOnHole, calculateStablefordPoints } from '@/utils/scoring';
import { isSingleBallScore } from '@/types/database';
import { PICKUP_SCORE } from '@/constants/scoring';
import type { Hole, HoleScore, MultiBallHoleScore, ShotContributions } from '@/types';
import type { TeamWithMembers } from '@/types/database.types';
import type { ShotSlot } from '@/utils/teamScoring';

const SCREEN_HEIGHT = Dimensions.get('window').height;
export const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

const MIN_SCORE = 1;
const MAX_SCORE = 12;

/**
 * Calculate combined team handicap for Scramble format
 * Common formula: (lowest handicap + highest handicap) / 2 * 0.35
 * Or simplified: Average of all handicaps * team factor
 */
export function calculateTeamHandicap(members: TeamWithMembers['members']): number {
  if (!members || members.length === 0) return 0;

  const handicaps = members
    .map((m) => m.player?.handicap ?? 0)
    .filter((h): h is number => typeof h === 'number')
    .sort((a, b) => a - b);

  if (handicaps.length === 0) return 0;

  // For 2-person Scramble: 35% of low + 15% of high
  // For 4-person Scramble: 20% of low + 15% of 2nd + 10% of 3rd + 5% of high
  // Simplified: Use 25% of the sum of all handicaps
  const sum = handicaps.reduce((acc, h) => acc + h, 0);
  return Math.round((sum * 0.25) * 10) / 10;
}

interface UseTeamScoreControlsParams {
  team: TeamWithMembers;
  currentHole: Hole;
  currentScore: HoleScore | MultiBallHoleScore | undefined;
  onScoreSelect: (strokes: number) => void;
  onContributorSelect?: (playerId: string) => void;
  selectedContributor?: string;
  shotContributions?: ShotContributions;
  onShotContributionsChange?: (contributions: ShotContributions) => void;
  disabled: boolean;
  activeShotType: ShotSlot | null;
  setActiveShotType: (type: ShotSlot | null) => void;
  slideAnim: Animated.Value;
}

export function useTeamScoreControls({
  team,
  currentHole,
  currentScore,
  onScoreSelect,
  onContributorSelect,
  selectedContributor,
  shotContributions,
  onShotContributionsChange,
  disabled,
  activeShotType,
  setActiveShotType,
  slideAnim,
}: UseTeamScoreControlsParams) {
  // Determine if we should use the new shot contributions UI or the legacy contributor UI
  const usesShotContributions = !!onShotContributionsChange;

  // Calculate team handicap
  const teamHandicap = useMemo(
    () => calculateTeamHandicap(team.members),
    [team.members]
  );

  // Calculate strokes received on this hole
  const strokesOnHole = useMemo(
    () => getStrokesOnHole(teamHandicap, currentHole),
    [teamHandicap, currentHole]
  );

  // Narrow to single-ball score for accessing strokes
  const singleBallScore = currentScore && isSingleBallScore(currentScore) ? currentScore : undefined;
  const selectedScore = singleBallScore?.strokes;
  const isPickedUp = selectedScore === PICKUP_SCORE;

  // Max score before pickup is par + 2 (double bogey)
  const maxScoreBeforePickup = currentHole.par + 2;

  // Calculate Stableford points for current score
  const stablefordPoints = useMemo(() => {
    if (!selectedScore || isPickedUp) return 0;
    return calculateStablefordPoints(selectedScore, teamHandicap, currentHole);
  }, [selectedScore, teamHandicap, currentHole, isPickedUp]);

  // Get selected contributor name
  const contributorName = useMemo(() => {
    if (!selectedContributor) return 'Select who made the shot';
    const member = team.members?.find((m) => m.player_id === selectedContributor);
    return member?.player?.name ?? 'Unknown';
  }, [selectedContributor, team.members]);

  // Get team member names for display
  const teamMemberNames = useMemo(() => {
    if (!team.members || team.members.length === 0) return '';
    return team.members
      .map((m) => m.player?.name ?? 'Unknown')
      .join(' \u2022 ');
  }, [team.members]);

  const handlePickUp = useCallback(() => {
    if (!disabled) {
      onScoreSelect(PICKUP_SCORE);
    }
  }, [disabled, onScoreSelect]);

  const handleDecrement = useCallback(() => {
    if (!disabled) {
      if (isPickedUp) {
        onScoreSelect(maxScoreBeforePickup);
      } else {
        const newScore = selectedScore ? Math.max(MIN_SCORE, selectedScore - 1) : currentHole.par;
        onScoreSelect(newScore);
      }
    }
  }, [disabled, selectedScore, currentHole.par, onScoreSelect, isPickedUp, maxScoreBeforePickup]);

  const handleIncrement = useCallback(() => {
    if (!disabled && !isPickedUp) {
      const newScore = selectedScore ? Math.min(MAX_SCORE, selectedScore + 1) : currentHole.par;
      onScoreSelect(newScore);
    }
  }, [disabled, selectedScore, currentHole.par, onScoreSelect, isPickedUp]);

  const handleParSelect = useCallback(() => {
    if (!disabled) {
      onScoreSelect(currentHole.par);
    }
  }, [disabled, currentHole.par, onScoreSelect]);

  const handleContributorSelect = useCallback((playerId: string) => {
    onContributorSelect?.(playerId);
  }, [onContributorSelect]);

  // Shot contribution handlers
  const handleShotSelect = useCallback((shotType: ShotSlot, playerId: string | undefined) => {
    if (!onShotContributionsChange) return;
    onShotContributionsChange({
      ...shotContributions,
      [shotType]: playerId,
    });
    // Animate the close
    Animated.timing(slideAnim, {
      toValue: SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setActiveShotType(null);
    });
  }, [onShotContributionsChange, shotContributions, slideAnim, setActiveShotType]);

  const handlePlayerSelectForShot = useCallback((playerId: string) => {
    if (activeShotType) {
      handleShotSelect(activeShotType, playerId);
    }
  }, [activeShotType, handleShotSelect]);

  const handleClearShot = useCallback(() => {
    if (activeShotType) {
      handleShotSelect(activeShotType, undefined);
    }
  }, [activeShotType, handleShotSelect]);

  // Get player name for shot type
  const getShotPlayerName = useCallback((playerId: string | undefined): string => {
    if (!playerId) return 'Select player';
    const member = team.members?.find((m) => m.player_id === playerId);
    return member?.player?.name ?? 'Unknown';
  }, [team.members]);

  // Close modal with animation
  const handleCloseModal = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setActiveShotType(null);
    });
  }, [slideAnim, setActiveShotType]);

  return {
    usesShotContributions,
    teamHandicap,
    strokesOnHole,
    selectedScore,
    isPickedUp,
    stablefordPoints,
    contributorName,
    teamMemberNames,
    handlePickUp,
    handleDecrement,
    handleIncrement,
    handleParSelect,
    handleContributorSelect,
    handlePlayerSelectForShot,
    handleClearShot,
    getShotPlayerName,
    handleCloseModal,
  };
}
