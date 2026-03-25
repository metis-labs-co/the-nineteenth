/**
 * useStartNewRound - Handles creating a new standalone round
 */

import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useConfirmationDialog, type DialogConfig } from '@/hooks';
import { useScorecardStore } from '@/store/scorecardStore';
import { useSettingsStore } from '@/store/settingsStore';
import { createScoringPairs } from '@/services/scoringPairs/scoringPairsService';
import { parseAndTransformHoles } from '@/utils/holeTransformers';
import { getDisplayName } from '@/utils/displayHelpers';
import type { RootStackParamList } from '@/navigation/types';
import type { Player, Hole, TeeBox, GameType } from '@/types';
import type { BallCount } from '@/types/multiball.types';
import type { ScoringPairsConfig, StandaloneSkinsConfig, StandaloneWolfConfig, TeamConfig } from '../../CreateRoundBottomSheet';
import type { PlayingPartner } from '../types';

// Default holes (used when course has no hole data)
const DEFAULT_HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: ([4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4][i] || 4) as Hole['par'],
  strokeIndex: [7, 15, 1, 11, 5, 17, 9, 3, 13, 8, 16, 2, 12, 6, 18, 10, 4, 14][i] || i + 1,
  yardages: { white: 350 + i * 15 },
}));

// Placeholder holes for build-as-you-play mode
// Intentionally generic: par 4, SI = hole number, no yardages
// These are detected as "unconfigured" by the useBuildAsYouPlay hook
const PLACEHOLDER_HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: 4 as Hole['par'],
  strokeIndex: i + 1,
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
    ballCount?: BallCount,
    skinsConfig?: StandaloneSkinsConfig,
    teamConfig?: TeamConfig,
    wolfConfig?: StandaloneWolfConfig,
    isBuildAsYouPlay?: boolean,
    handicapSource?: string
  ) => Promise<void>;
  isStartingRound: boolean;
  dialogConfig: DialogConfig;
  dismissDialog: () => void;
}

export function useStartNewRound(onStarted?: () => void, pendingLeagueId?: string): UseStartNewRoundReturn {
  const navigation = useNavigation<NavigationProp>();
  const { user, player } = useAuth();
  const { initializeRound } = useScorecardStore();
  const setPendingLeagueTag = useSettingsStore((s) => s.setPendingLeagueTag);

  // Dialog state for error alerts
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();

  const [isStartingRound, setIsStartingRound] = useState(false);

  const handleStartNewRound = useCallback(
    async (
      courseId: string,
      courseName: string,
      partners: PlayingPartner[],
      selectedTee?: TeeBox,
      gameType: GameType = 'stableford',
      scoringPairsConfig?: ScoringPairsConfig,
      ballCount: BallCount = 1,
      skinsConfig?: StandaloneSkinsConfig,
      teamConfig?: TeamConfig,
      wolfConfig?: StandaloneWolfConfig,
      isBuildAsYouPlay?: boolean,
      handicapSource?: string
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

        // Use course holes, placeholder holes (build-as-you-play), or default holes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raw JSONB data from database
        const rawHoles = (courseData as any)?.holes;
        const parsedHoles = parseAndTransformHoles(rawHoles);
        const holes: Hole[] = parsedHoles.length > 0
          ? parsedHoles
          : isBuildAsYouPlay
            ? PLACEHOLDER_HOLES
            : DEFAULT_HOLES;

        // Determine if this is a team format (scramble, shamble, best-ball, or match-play with teams)
        const isStandardTeamFormat = ['scramble', 'shamble', 'best-ball'].includes(gameType);
        const isMatchPlayWithTeams = gameType === 'match-play' && !!teamConfig;
        const isTeamFormat = isStandardTeamFormat || isMatchPlayWithTeams;

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
            team_config: teamConfig ?? null,
            // Set team round fields for team formats (scramble, shamble, best-ball, match-play with teams)
            is_team_round: isTeamFormat,
            team_format: isMatchPlayWithTeams ? 'match-play-team' : (isStandardTeamFormat ? gameType : null),
            ...(handicapSource ? { handicap_source: handicapSource } : {}),
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

        // Create skins game if enabled (non-blocking - don't fail round creation)
        // DEBUG: Log skins creation conditions
        console.log('[useStartNewRound] Skins creation check:', {
          skinsConfigReceived: !!skinsConfig,
          skinsEnabled: skinsConfig?.enabled,
          hasConfig: !!skinsConfig?.config,
          partnersCount: partners.length,
          hasUserId: !!user?.id,
          willCreateSkins: !!(skinsConfig?.enabled && skinsConfig.config && partners.length >= 1 && user?.id),
          skinsConfig: skinsConfig,
        });

        if (skinsConfig?.enabled && skinsConfig.config && partners.length >= 1 && user?.id) {
          try {
            // Build participant IDs array (current user + partners)
            const participantIds = [user.id, ...partners.map(p => p.id)];

            const { error: skinsError } = await (supabase
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
              .from('skins_games') as any)
              .insert({
                round_id: roundId,
                pairing_id: null, // Standalone rounds don't have pairings
                participant_ids: participantIds,
                pot_type: skinsConfig.config.pot_type,
                pot_value: skinsConfig.config.pot_value,
                currency: skinsConfig.config.currency ?? 'AUD',
                scoring_type: skinsConfig.config.scoring_type,
                pool_source: 'direct',
                status: 'active',
                disclaimer_accepted_at: new Date().toISOString(),
                disclaimer_accepted_by: user.id,
                created_by: user.id,
              });

            if (skinsError) {
              console.error('[RoundsScreen] Error creating skins game:', skinsError);
            } else {
              console.log('[RoundsScreen] Created skins game for round:', {
                roundId,
                participantCount: participantIds.length,
                potType: skinsConfig.config.pot_type,
                potValue: skinsConfig.config.pot_value,
                scoringType: skinsConfig.config.scoring_type,
              });
            }
          } catch (skinsGameError) {
            // Log but don't fail - skins is a side feature
            console.error('[RoundsScreen] Error creating skins game:', skinsGameError);
          }
        }

        // Create Wolf game if enabled (non-blocking - don't fail round creation)
        // Wolf requires 3-4 players
        console.log('[useStartNewRound] Wolf creation check:', {
          wolfConfigReceived: !!wolfConfig,
          wolfEnabled: wolfConfig?.enabled,
          hasConfig: !!wolfConfig?.config,
          partnersCount: partners.length,
          totalPlayers: partners.length + 1,
          hasUserId: !!user?.id,
          willCreateWolf: !!(wolfConfig?.enabled && wolfConfig.config && partners.length >= 2 && partners.length <= 3 && user?.id),
          wolfConfig: wolfConfig,
        });

        if (wolfConfig?.enabled && wolfConfig.config && partners.length >= 2 && partners.length <= 3 && user?.id) {
          try {
            // Build participant IDs array (current user + partners)
            const participantIds = [user.id, ...partners.map(p => p.id)];

            // Use wolf_order from config if provided, otherwise use participant order
            const wolfOrder = wolfConfig.config.wolf_order?.length === participantIds.length
              ? wolfConfig.config.wolf_order
              : participantIds;

            const { error: wolfError } = await (supabase
              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
              .from('wolf_games') as any)
              .insert({
                round_id: roundId,
                participant_ids: participantIds,
                wolf_order: wolfOrder,
                scoring_type: wolfConfig.config.scoring_type,
                blind_wolf_enabled: wolfConfig.config.blind_wolf_enabled ?? true,
                pot_enabled: wolfConfig.config.pot_enabled ?? false,
                // Database column is 'pot_value', TypeScript type uses 'pot_value_per_point'
                pot_value: wolfConfig.config.pot_enabled ? wolfConfig.config.pot_value_per_point : null,
                currency: wolfConfig.config.currency ?? 'AUD',
                status: 'active',
                disclaimer_accepted_at: wolfConfig.config.pot_enabled ? new Date().toISOString() : null,
                disclaimer_accepted_by: wolfConfig.config.pot_enabled ? user.id : null,
                created_by: user.id,
              });

            if (wolfError) {
              console.error('[RoundsScreen] Error creating wolf game:', wolfError);
            } else {
              console.log('[RoundsScreen] Created wolf game for round:', {
                roundId,
                participantCount: participantIds.length,
                wolfOrder,
                scoringType: wolfConfig.config.scoring_type,
                blindWolfEnabled: wolfConfig.config.blind_wolf_enabled,
                potEnabled: wolfConfig.config.pot_enabled,
                potValuePerPoint: wolfConfig.config.pot_value_per_point,
              });
            }
          } catch (wolfGameError) {
            // Log but don't fail - wolf is a side feature
            console.error('[RoundsScreen] Error creating wolf game:', wolfGameError);
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

        // Store pending league tag if starting from a league
        if (pendingLeagueId) {
          setPendingLeagueTag(roundId, pendingLeagueId);
          console.log('[useStartNewRound] Stored pending league tag:', { roundId, leagueId: pendingLeagueId });
        }

        // Initialize the scorecard store
        await initializeRound(roundId, players, holes, gameType, false);

        // Navigate to appropriate scoring screen based on game type
        // Individual match play (2 players) goes to dedicated MatchPlayScoring screen
        // Team match play (3+ players with teams) goes to regular Scorecard
        if (gameType === 'match-play' && !isMatchPlayWithTeams) {
          navigation.navigate('MatchPlayScoring', {
            roundId,
            player1Id: players[0]?.id,
            player2Id: players[1]?.id,
          });
        } else {
          navigation.navigate('Scorecard', {
            roundId,
            competitionId: 'standalone',
            isBuildAsYouPlay: isBuildAsYouPlay || undefined,
          });
        }
      } catch (error) {
        console.error('[RoundsScreen] Error starting round:', error);
        showAlert('Error', 'Failed to start the round. Please try again.');
      } finally {
        setIsStartingRound(false);
      }
    },
    [navigation, player, user, initializeRound, isStartingRound, onStarted, showAlert, pendingLeagueId, setPendingLeagueTag]
  );

  return {
    handleStartNewRound,
    isStartingRound,
    dialogConfig,
    dismissDialog,
  };
}
