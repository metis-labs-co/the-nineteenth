/**
 * usePairingState - State management hook for scoring pair formation
 *
 * Manages pairing assignments state, handlers, and computed values.
 * Extracted from ScoringPairFormationUI for better separation of concerns.
 */

import { useState, useCallback, useMemo } from 'react';
import { LayoutAnimation } from 'react-native';
import {
  autoGenerateScoringPairs,
  generateCrossTeamPairs,
  generateGroupAwareScoringPairs,
  validateScoringPairsCoverage,
  type UnevenTeamMetadata,
} from '@/utils/scoringPairs';
import { pairsToInputFormat, getCoverageQuality } from '../utils';
import type { Player, ScoringPairWithPlayers, TeamWithMembers } from '@/types/database.types';
import type { ScoringPairCreateInput } from '@/types';
import type { PairingType, CoverageQuality } from '../types';

interface UsePairingStateOptions {
  players: Player[];
  existingPairs?: ScoringPairWithPlayers[];
  teams?: TeamWithMembers[];
  /** Tee groups for the round — enables the group-aware auto-generator. */
  groupPlayerIds?: string[][];
  /** Player-id → team-name lookup — enables cross-team preference within
   *  each tee group during auto-generation. */
  teamNameByPlayerId?: Map<string, string>;
  onSave: (pairs: ScoringPairCreateInput[]) => void;
}

interface UsePairingStateReturn {
  // State
  pairs: ScoringPairCreateInput[];
  pairingType: PairingType;
  selectedPlayer: string | null;
  hasChanges: boolean;
  isGenerating: boolean;
  unevenTeamMetadata: UnevenTeamMetadata | null;

  // Computed values
  playerIds: string[];
  coverage: ReturnType<typeof validateScoringPairsCoverage>;
  coveredPlayersCount: number;
  coverageQuality: CoverageQuality;
  canSave: boolean;
  showCircularChainDiagram: boolean;

  // Handlers
  handleAutoGenerate: () => void;
  handleCrossTeamPair: () => void;
  handlePlayerPress: (playerId: string) => void;
  handleRemovePair: (scorerId: string, playerId: string) => void;
  handleReset: () => void;
  handleSave: () => void;
}

/**
 * Hook for managing scoring pair formation state
 */
export function usePairingState({
  players,
  existingPairs = [],
  teams,
  groupPlayerIds,
  teamNameByPlayerId,
  onSave,
}: UsePairingStateOptions): UsePairingStateReturn {
  // State
  const [pairs, setPairs] = useState<ScoringPairCreateInput[]>(
    existingPairs.length > 0 ? pairsToInputFormat(existingPairs) : []
  );
  const [pairingType, setPairingType] = useState<PairingType>(
    existingPairs.length > 0 ? 'manual' : 'none'
  );
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [unevenTeamMetadata, setUnevenTeamMetadata] = useState<UnevenTeamMetadata | null>(null);

  // Computed values
  const playerIds = useMemo(() => players.map((p) => p.id), [players]);

  const coverage = useMemo(
    () => validateScoringPairsCoverage(pairs, playerIds),
    [pairs, playerIds]
  );

  const coveredPlayersCount = useMemo(() => {
    const scoredPlayers = new Set(pairs.map((p) => p.playerId));
    return scoredPlayers.size;
  }, [pairs]);

  const coverageQuality = useMemo(
    () => getCoverageQuality(coveredPlayersCount, players.length),
    [coveredPlayersCount, players.length]
  );

  const canSave = coverage.isValid && pairs.length > 0;
  const showCircularChainDiagram = pairingType === 'circular' && pairs.length > 0;

  // Handlers
  const handleAutoGenerate = useCallback(() => {
    if (players.length < 2) return;

    setIsGenerating(true);
    try {
      // Prefer the group-aware generator when the round has tee groups
      // AND every player has a team. This is the only path that can
      // honour "scorer must be in the same tee group" and "prefer cross-
      // team reciprocal pairs" simultaneously.
      const hasGroups = !!groupPlayerIds && groupPlayerIds.length > 0;
      const teamMap = teamNameByPlayerId;
      const everyPlayerHasTeam =
        !!teamMap &&
        teamMap.size > 0 &&
        players.every((p) => teamMap.has(p.id));

      if (hasGroups && everyPlayerHasTeam) {
        const result = generateGroupAwareScoringPairs(
          groupPlayerIds!.map((playerIds) => ({ playerIds })),
          teamMap!
        );
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setPairs(result.pairs);
        // Group-aware output is reciprocal-shaped, so the existing
        // reciprocal badge best describes it. The "same-team fallback"
        // warning is logged rather than surfaced — the UI still shows
        // coverage + cross-team status via the UnevenTeamWarning panel
        // when applicable.
        setPairingType('reciprocal');
        if (result.warnings.length > 0) {
          console.info('[usePairingState] Group-aware warnings', result.warnings);
        }
      } else {
        const result = autoGenerateScoringPairs(players);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setPairs(result.pairs);
        setPairingType(result.type);
      }
      setHasChanges(true);
      setSelectedPlayer(null);
      setUnevenTeamMetadata(null);
    } catch (error) {
      console.error('[usePairingState] Failed to generate pairs:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [players, groupPlayerIds, teamNameByPlayerId]);

  const handleCrossTeamPair = useCallback(() => {
    if (!teams || teams.length < 2) return;

    // Get players from first two teams
    const team1Players = teams[0].members
      .map((m) => m.player)
      .filter((p): p is Player => !!p);
    const team2Players = teams[1].members
      .map((m) => m.player)
      .filter((p): p is Player => !!p);

    if (team1Players.length === 0 || team2Players.length === 0) return;

    setIsGenerating(true);
    try {
      const result = generateCrossTeamPairs(team1Players, team2Players, 'wrap');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPairs(result.pairs);
      setPairingType('cross-team');
      setUnevenTeamMetadata(result.metadata.hasUnevenTeams ? result.metadata : null);
      setHasChanges(true);
      setSelectedPlayer(null);
    } catch (error) {
      console.error('[usePairingState] Failed to generate cross-team pairs:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [teams]);

  const handlePlayerPress = useCallback(
    (playerId: string) => {
      if (!selectedPlayer) {
        // First selection — select this player. Allowed even when the
        // player is already in a pair, so the user can tap again to
        // deselect or tap a paired partner to form a new bond (the
        // duplicate check below enforces uniqueness on the second tap).
        setSelectedPlayer(playerId);
        return;
      }

      if (selectedPlayer === playerId) {
        // Same player - deselect
        setSelectedPlayer(null);
        return;
      }

      // Different player — try to create a reciprocal pair (A↔B) so
      // each manual tap-pair yields exactly one logical relationship.
      // Existing state can contain at most 2 rows per player (one as
      // scorer, one as being-scored). A player already appearing in any
      // existing pair is considered "taken" — block the new pair to
      // keep the "each player in exactly one pair" invariant.
      const isTaken = (id: string) =>
        pairs.some((p) => p.scorerId === id || p.playerId === id);

      if (isTaken(selectedPlayer) || isTaken(playerId)) {
        // Quietly block; the user can remove the existing pair first
        // if they want to re-bond.
        setSelectedPlayer(null);
        return;
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPairs((prev) => [
        ...prev,
        { scorerId: selectedPlayer, playerId },
        { scorerId: playerId, playerId: selectedPlayer },
      ]);
      setPairingType('manual');
      setHasChanges(true);
      setSelectedPlayer(null);
    },
    [selectedPlayer, pairs]
  );

  const handleRemovePair = useCallback((scorerId: string, playerId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPairs((prev) =>
      // Drop both directions so removing a reciprocal card clears the
      // full relationship in one tap. For circular chain rows only the
      // matching direction is removed (the reverse direction doesn't
      // exist in that mode), so this also works for circular cards.
      prev.filter(
        (p) =>
          !(
            (p.scorerId === scorerId && p.playerId === playerId) ||
            (p.scorerId === playerId && p.playerId === scorerId)
          )
      )
    );
    setPairingType('manual');
    setHasChanges(true);
  }, []);

  const handleReset = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPairs(existingPairs.length > 0 ? pairsToInputFormat(existingPairs) : []);
    setPairingType(existingPairs.length > 0 ? 'manual' : 'none');
    setUnevenTeamMetadata(null);
    setHasChanges(false);
    setSelectedPlayer(null);
  }, [existingPairs]);

  const handleSave = useCallback(() => {
    onSave(pairs);
  }, [pairs, onSave]);

  return {
    // State
    pairs,
    pairingType,
    selectedPlayer,
    hasChanges,
    isGenerating,
    unevenTeamMetadata,

    // Computed values
    playerIds,
    coverage,
    coveredPlayersCount,
    coverageQuality,
    canSave,
    showCircularChainDiagram,

    // Handlers
    handleAutoGenerate,
    handleCrossTeamPair,
    handlePlayerPress,
    handleRemovePair,
    handleReset,
    handleSave,
  };
}

export default usePairingState;
