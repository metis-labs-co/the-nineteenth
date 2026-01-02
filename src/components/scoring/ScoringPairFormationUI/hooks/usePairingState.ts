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
      const result = autoGenerateScoringPairs(players);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPairs(result.pairs);
      setPairingType(result.type);
      setHasChanges(true);
      setSelectedPlayer(null);
      setUnevenTeamMetadata(null);
    } catch (error) {
      console.error('[usePairingState] Failed to generate pairs:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [players]);

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
        // First selection - select this player as scorer
        setSelectedPlayer(playerId);
      } else if (selectedPlayer === playerId) {
        // Same player - deselect
        setSelectedPlayer(null);
      } else {
        // Different player - create pair (selected scores pressed)
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        // Check if this pair already exists
        const existingPairIndex = pairs.findIndex(
          (p) => p.scorerId === selectedPlayer && p.playerId === playerId
        );

        if (existingPairIndex === -1) {
          // Add new pair
          setPairs((prev) => [
            ...prev,
            { scorerId: selectedPlayer, playerId },
          ]);
          setPairingType('manual');
          setHasChanges(true);
        }

        setSelectedPlayer(null);
      }
    },
    [selectedPlayer, pairs]
  );

  const handleRemovePair = useCallback((scorerId: string, playerId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPairs((prev) =>
      prev.filter((p) => !(p.scorerId === scorerId && p.playerId === playerId))
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
