/**
 * useScoreHandlers - Score entry, stats, and multi-ball handlers for scorecard entry
 */

import { useCallback } from 'react';
import { useScorecardStore } from '@/store/scorecardStore';
import { useUpdateCourseHoles, useProcessSkinsIfNeeded } from '@/hooks';
import { supabase } from '@/services/supabase/client';
import { resolveTeeYardageKey } from '@/utils/holeTransformers';
import { scoringLogger } from '@/utils/debugLogger';
import type { HoleScore, Hole } from '@/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

interface UseScoreHandlersParams {
  roundId: string;
  competitionId: string;
  currentHole: number;
  currentPlayers: { id: string; name?: string }[];
  holes: Hole[];
  courseId: string | null | undefined;
  isSuperAdmin: boolean;
  userId: string | undefined;
  navigation: NativeStackNavigationProp<RootStackParamList, 'Scorecard'>;
  // Store functions
  setPlayerScore: (playerId: string, holeNumber: number, strokes: number, scoredBy?: string) => Promise<void>;
  updatePlayerHoleScore: (playerId: string, holeNumber: number, updates: Partial<HoleScore>) => Promise<void>;
  setMultiBallScore: (playerId: string, holeNumber: number, ballIndex: number, strokes: number) => Promise<void>;
  updateMultiBallStats: (playerId: string, holeNumber: number, ballIndex: number, updates: Partial<HoleScore>) => Promise<void>;
  getHoleInfo: (holeNumber: number) => Hole | undefined;
  // Build-as-you-play
  buildAsYouPlay: {
    enabled: boolean;
    pendingHoleNumber: number | null;
    handleSaveHoleSetup: (hole: Hole) => Promise<void>;
  };
  setCurrentHole: (hole: number) => void;
}

export function useScoreHandlers({
  roundId,
  competitionId,
  currentHole,
  currentPlayers,
  holes,
  courseId,
  isSuperAdmin,
  userId,
  navigation,
  setPlayerScore,
  updatePlayerHoleScore,
  setMultiBallScore,
  updateMultiBallStats,
  getHoleInfo,
  buildAsYouPlay,
  setCurrentHole,
}: UseScoreHandlersParams) {
  const { processSkinsHole } = useProcessSkinsIfNeeded();
  const updateCourseHolesMutation = useUpdateCourseHoles();

  const handleScoreSelect = useCallback(
    async (playerId: string, strokes: number) => {
      const player = currentPlayers.find((p) => p.id === playerId);
      const holeData = getHoleInfo(currentHole);
      scoringLogger.info('SCORE ENTRY: Individual player score', {
        playerId: playerId.substring(0, 8),
        playerName: player?.name,
        hole: currentHole,
        strokes,
        holeInfo: holeData ? { par: holeData.par, si: holeData.strokeIndex } : null,
        scoredBy: userId?.substring(0, 8),
      });
      await setPlayerScore(playerId, currentHole, strokes, userId);

      if (holeData) {
        const scorecardsRecord: Record<string, { [holeNumber: string]: { strokes: number } | number }> = {};
        const latestScorecards = useScorecardStore.getState().groupScorecards;
        latestScorecards.forEach((scorecard, pId) => {
          scorecardsRecord[pId] = scorecard.scores as unknown as { [holeNumber: string]: { strokes: number } | number };
        });

        processSkinsHole({
          roundId,
          holeNumber: currentHole,
          scorecards: scorecardsRecord,
          hole: { par: holeData.par, strokeIndex: holeData.strokeIndex },
        }).then((result) => {
          if (result.processed) {
            if (result.hasWinner) {
              scoringLogger.info('SKINS: Hole winner', {
                hole: currentHole,
                winner: result.winnerName,
                amount: result.winningsAmount,
              });
            } else if (result.carryoverAmount) {
              scoringLogger.info('SKINS: Hole tied, carryover', {
                hole: currentHole,
                carryover: result.carryoverAmount,
              });
            }
          }
        }).catch((error) => {
          scoringLogger.warn('SKINS: Processing error (non-blocking)', { error });
        });
      }
    },
    [currentHole, setPlayerScore, currentPlayers, getHoleInfo, roundId, processSkinsHole, userId]
  );

  const handleStatsUpdate = useCallback(
    async (playerId: string, updates: Partial<HoleScore>) => {
      const player = currentPlayers.find((p) => p.id === playerId);
      scoringLogger.info('STATS UPDATE: Player stats', {
        playerId: playerId.substring(0, 8),
        playerName: player?.name,
        hole: currentHole,
        updates,
      });
      await updatePlayerHoleScore(playerId, currentHole, updates);
    },
    [currentHole, updatePlayerHoleScore, currentPlayers]
  );

  const handleMultiBallScoreChange = useCallback(
    async (playerId: string, ballIndex: number, strokes: number) => {
      const player = currentPlayers.find((p) => p.id === playerId);
      scoringLogger.info('MULTI-BALL SCORE: Ball score entry', {
        playerId: playerId.substring(0, 8),
        playerName: player?.name,
        hole: currentHole,
        ballIndex,
        strokes,
      });
      await setMultiBallScore(playerId, currentHole, ballIndex, strokes);
    },
    [currentHole, setMultiBallScore, currentPlayers]
  );

  const handleMultiBallStatsChange = useCallback(
    async (playerId: string, ballIndex: number, updates: Partial<HoleScore>) => {
      const player = currentPlayers.find((p) => p.id === playerId);
      scoringLogger.info('MULTI-BALL STATS: Ball stats update', {
        playerId: playerId.substring(0, 8),
        playerName: player?.name,
        hole: currentHole,
        ballIndex,
        updates: Object.keys(updates),
      });
      await updateMultiBallStats(playerId, currentHole, ballIndex, updates);
    },
    [currentHole, updateMultiBallStats, currentPlayers]
  );

  const handlePlayerPress = useCallback(
    (playerId: string) => {
      navigation.navigate('PlayerScorecard', { playerId, roundId });
    },
    [navigation, roundId]
  );

  const handleViewScorecard = useCallback(() => {
    navigation.navigate('ReviewScorecard', {
      roundId,
      competitionId,
      holes,
    });
  }, [navigation, roundId, competitionId, holes]);

  const handleBuildAsYouPlaySave = useCallback(
    async (updatedHole: Hole) => {
      await buildAsYouPlay.handleSaveHoleSetup(updatedHole);
      if (buildAsYouPlay.pendingHoleNumber) {
        setCurrentHole(buildAsYouPlay.pendingHoleNumber);
      }
    },
    [buildAsYouPlay, setCurrentHole]
  );

  const currentHoleData = getHoleInfo(currentHole);

  const handleEditHole = useCallback(() => {
    if (isSuperAdmin && currentHoleData) {
      return currentHoleData;
    }
    return null;
  }, [isSuperAdmin, currentHoleData]);

  const handleSaveHole = useCallback(
    async (updatedHole: Hole) => {
      if (!courseId) return;

      const updatedHoles = holes.map((h) =>
        h.number === updatedHole.number ? updatedHole : h
      );

      try {
        // Sync distances to the tees table FIRST (if tees exist for this course)
        // so that when the JSONB mutation triggers a refetch, hydrateHolesWithTeeYardages
        // picks up the new values instead of overwriting with stale tees data
        if (updatedHole.yardages && Object.keys(updatedHole.yardages).length > 0) {
          const lengthColumn = `length_hole_${updatedHole.number}`;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
          const { data: tees } = await (supabase.from('tees') as any)
            .select('id, color, name')
            .eq('course_id', courseId);

          const teesTyped = tees as { id: string; color: string | null; name: string }[] | null;

          if (teesTyped && teesTyped.length > 0) {
            for (const tee of teesTyped) {
              const teeKey = resolveTeeYardageKey(tee.color, tee.name);
              const newDistance = updatedHole.yardages[teeKey];
              if (newDistance !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
                await (supabase.from('tees') as any)
                  .update({ [lengthColumn]: newDistance })
                  .eq('id', tee.id);
              }
            }
          }
        }

        // Now save to courses.holes JSONB (triggers refetch via onSuccess)
        await updateCourseHolesMutation.mutateAsync({
          courseId,
          holes: updatedHoles,
        });
        useScorecardStore.getState().updateHoles(updatedHoles);
      } catch (error) {
        scoringLogger.error('Failed to save hole data', { error });
      }
    },
    [courseId, holes, updateCourseHolesMutation]
  );

  return {
    handleScoreSelect,
    handleStatsUpdate,
    handleMultiBallScoreChange,
    handleMultiBallStatsChange,
    handlePlayerPress,
    handleViewScorecard,
    handleBuildAsYouPlaySave,
    handleEditHole,
    handleSaveHole,
    isHoleSaving: updateCourseHolesMutation.isPending,
  };
}
