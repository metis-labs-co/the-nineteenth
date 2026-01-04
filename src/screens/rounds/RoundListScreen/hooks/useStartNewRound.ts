/**
 * useStartNewRound - Handles creating a new standalone round
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useScorecardStore } from '@/store/scorecardStore';
import { createScoringPairs } from '@/services/scoringPairs/scoringPairsService';
import { transformHolesIfNeeded } from '@/utils/holeTransformers';
import { getDisplayName } from '@/utils/displayHelpers';
import type { RootStackParamList } from '@/navigation/types';
import type { Player, Hole, TeeBox, GameType } from '@/types';
import type { BallCount } from '@/types/multiball.types';
import type { ScoringPairsConfig } from '../../CreateRoundBottomSheet';
import type { PlayingPartner } from '../types';

// Default holes (used when course has no hole data)
const DEFAULT_HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: ([4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4][i] || 4) as Hole['par'],
  strokeIndex: [7, 15, 1, 11, 5, 17, 9, 3, 13, 8, 16, 2, 12, 6, 18, 10, 4, 14][i] || i + 1,
  yardages: { white: 350 + i * 15 },
}));

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface UseStartNewRoundReturn {
  handleStartNewRound: (
    courseId: string,
    courseName: string,
    partners: PlayingPartner[],
    selectedTee?: TeeBox,
    gameType?: GameType,
    scoringPairsConfig?: ScoringPairsConfig,
    ballCount?: BallCount
  ) => Promise<void>;
  isStartingRound: boolean;
}

export function useStartNewRound(onStarted?: () => void): UseStartNewRoundReturn {
  const navigation = useNavigation<NavigationProp>();
  const { user, player } = useAuth();
  const { initializeRound } = useScorecardStore();

  const [isStartingRound, setIsStartingRound] = useState(false);

  const handleStartNewRound = useCallback(
    async (
      courseId: string,
      courseName: string,
      partners: PlayingPartner[],
      selectedTee?: TeeBox,
      gameType: GameType = 'stableford',
      scoringPairsConfig?: ScoringPairsConfig,
      ballCount: BallCount = 1
    ) => {
      if (isStartingRound) return;

      setIsStartingRound(true);
      onStarted?.();

      try {
        // Fetch course data including holes
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, name, holes')
          .eq('id', courseId)
          .single();

        if (courseError) {
          console.error('Error fetching course:', courseError);
        }

        // Use course holes or default holes (fallback if empty array)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raw JSONB data from database
        const rawHoles = (courseData as any)?.holes as unknown[] | null;
        const holes: Hole[] = rawHoles && rawHoles.length > 0 ? transformHolesIfNeeded(rawHoles) : DEFAULT_HOLES;

        // Create the round in Supabase (standalone round - no competition)
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
            selected_tee: selectedTee ?? null,
            scoring_pairs_required: scoringPairsConfig?.enabled ?? false,
            ball_count: ballCount,
          })
          .select('id')
          .single();

        if (roundError) {
          console.error('Error creating round in Supabase:', roundError);
          throw new Error(`Failed to create round: ${roundError.message}`);
        }

        const roundId = roundData.id;

        // Create player objects for all participants
        const players: Player[] = [];

        // Add current user as the first player
        // Use getDisplayName to handle cases where name might contain an email
        if (player) {
          players.push({
            id: player.id,
            name: getDisplayName(player.name, user?.email?.split('@')[0] || 'Player 1'),
            email: player.email || '',
            phone: player.phone ?? undefined,
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

        // Add selected partners
        for (const partner of partners) {
          players.push({
            id: partner.id,
            name: getDisplayName(partner.name, 'Guest'),
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
            ...partners.map(partner => ({
              round_id: roundId,
              player_id: partner.id,
              added_by: user.id,
            })),
          ];

          const { error: roundPlayersError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('round_players') as any)
            .insert(roundPlayersToInsert);

          if (roundPlayersError) {
            console.error('[RoundsScreen] Error creating round_players:', roundPlayersError);
          } else {
            console.log('[RoundsScreen] Created round_players records for', roundPlayersToInsert.length, 'players');
          }
        }

        // Create scoring pairs if enabled
        if (scoringPairsConfig?.enabled && scoringPairsConfig.pairs.length > 0 && user?.id) {
          try {
            const pairsWithRealIds = scoringPairsConfig.pairs.map(pair => ({
              scorerId: pair.scorerId === 'current-user' ? user.id : pair.scorerId,
              playerId: pair.playerId === 'current-user' ? user.id : pair.playerId,
            }));

            await createScoringPairs(roundId, pairsWithRealIds);
            console.log('[RoundsScreen] Created scoring pairs for round:', pairsWithRealIds.length, 'pairs');
          } catch (scoringPairsError) {
            console.error('[RoundsScreen] Error creating scoring pairs:', scoringPairsError);
          }
        }

        console.log('[RoundsScreen] Starting round:', {
          roundId,
          course: courseName,
          selectedTee: selectedTee?.name ?? 'None',
          gameType,
          ballCount,
          players: players.map(p => p.name),
          holes: holes.length,
        });

        // Initialize the scorecard store
        await initializeRound(roundId, players, holes, gameType, false);

        // Navigate to scorecard entry screen
        navigation.navigate('Scorecard', {
          roundId,
          competitionId: 'standalone',
        });
      } catch (error) {
        console.error('[RoundsScreen] Error starting round:', error);
        Alert.alert(
          'Error',
          'Failed to start the round. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsStartingRound(false);
      }
    },
    [navigation, player, user, initializeRound, isStartingRound, onStarted]
  );

  return {
    handleStartNewRound,
    isStartingRound,
  };
}
