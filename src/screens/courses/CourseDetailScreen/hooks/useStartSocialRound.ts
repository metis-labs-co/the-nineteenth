/**
 * useStartSocialRound - Handles creating and starting a social round from the course detail screen
 *
 * Encapsulates Supabase round creation, player building, round_players insertion,
 * scorecard store initialization, and navigation to the scoring screen.
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useScorecardStore } from '@/store/scorecardStore';
import { DEFAULT_HOLES } from '../utils';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { TeeBox, GameType, Hole } from '@/types/database.types';
import type { Player } from '@/types';
import type { PlayingPartner } from '../types';

interface UseStartSocialRoundOptions {
  courseId: string;
  holesWithYardages: Hole[];
  navigation: NativeStackNavigationProp<RootStackParamList, 'Course'>;
  onError: (title: string, message: string) => void;
}

export function useStartSocialRound({
  courseId,
  holesWithYardages,
  navigation,
  onError,
}: UseStartSocialRoundOptions) {
  const { user, player } = useAuth();
  const { initializeRound } = useScorecardStore();

  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [isStartingRound, setIsStartingRound] = useState(false);

  const openBottomSheet = useCallback(() => {
    setIsBottomSheetVisible(true);
  }, []);

  const closeBottomSheet = useCallback(() => {
    setIsBottomSheetVisible(false);
  }, []);

  const startRound = useCallback(
    async (
      _courseId: string,
      _courseName: string,
      partners: PlayingPartner[],
      roundSelectedTee?: TeeBox,
      gameType: GameType = 'stableford'
    ) => {
      if (isStartingRound) return;

      setIsStartingRound(true);
      setIsBottomSheetVisible(false);

      try {
        const holes: Hole[] =
          holesWithYardages && holesWithYardages.length > 0
            ? holesWithYardages
            : DEFAULT_HOLES;

        // Create the round in Supabase
        const { data: roundData, error: roundError } = await (supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
          .from('rounds') as any)
          .insert({
            course_id: courseId,
            user_id: user?.id,
            competition_id: null,
            round_number: 1,
            date: new Date().toISOString().split('T')[0],
            game_type: gameType,
            status: 'in-progress',
            selected_tee: roundSelectedTee ?? null,
          })
          .select('id')
          .single();

        if (roundError) {
          throw new Error(`Failed to create round: ${roundError.message}`);
        }

        const roundId = roundData.id;

        // Build player objects
        const players: Player[] = [];

        if (player) {
          players.push({
            id: player.id,
            name: player.name,
            email: player.email || '',
            phone: player.phone || undefined,
            handicap: player.handicap ?? 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else if (user) {
          players.push({
            id: user.id,
            name: user.email?.split('@')[0] || 'Player 1',
            email: user.email || '',
            handicap: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        for (const partner of partners) {
          players.push({
            id: partner.id,
            name: partner.name,
            email: '',
            handicap: partner.handicap ?? 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Create round_players records
        if (user?.id) {
          const roundPlayersToInsert = [
            { round_id: roundId, player_id: user.id, added_by: null },
            ...partners.map((partner) => ({
              round_id: roundId,
              player_id: partner.id,
              added_by: user.id,
            })),
          ];

          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
          await (supabase.from('round_players') as any).insert(roundPlayersToInsert);
        }

        // Initialize the scorecard store
        await initializeRound(roundId, players, holes, gameType, false);

        // Navigate to appropriate scoring screen
        if (gameType === 'match-play') {
          navigation.navigate('MatchPlayScoring', {
            roundId,
            player1Id: players[0]?.id,
            player2Id: players[1]?.id,
          });
        } else {
          navigation.navigate('Scorecard', {
            roundId,
            competitionId: 'standalone',
          });
        }
      } catch (err) {
        console.error('[useStartSocialRound] Error starting round:', err);
        onError('Error', 'Failed to start the round. Please try again.');
      } finally {
        setIsStartingRound(false);
      }
    },
    [courseId, holesWithYardages, user, player, initializeRound, navigation, isStartingRound, onError]
  );

  return {
    isBottomSheetVisible,
    isStartingRound,
    openBottomSheet,
    closeBottomSheet,
    startRound,
  };
}
