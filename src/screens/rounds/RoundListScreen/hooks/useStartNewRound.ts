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
import { getLocalDateString } from '@/utils/formatting';
import type { RootStackParamList } from '@/navigation/types';
import type { Player, Hole, TeeBox, GameType } from '@/types';
import type { BallCount } from '@/types/multiball.types';
import type { NineType, HandicapSource } from '@/types/database/enums';
import type { ScoringPairsConfig, StandaloneSkinsConfig, StandaloneWolfConfig, TeamConfig, PlayingPartner } from '../../CreateRoundBottomSheet';

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

function createPlaceholderHoles(count: number): Hole[] {
  return Array.from({ length: count }, (_, i) => ({
    number: (i + 1) as Hole['number'],
    par: 4 as Hole['par'],
    strokeIndex: i + 1,
  }));
}

function filterHolesByNineType(holes: Hole[], nineType: NineType): Hole[] {
  if (nineType === 'front9') return holes.filter((h) => h.number <= 9);
  if (nineType === 'back9') return holes.filter((h) => h.number >= 10);
  return holes;
}

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
    handicapSource?: HandicapSource,
    nineType?: NineType
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
      handicapSource?: HandicapSource,
      nineType: NineType = 'full'
    ) => {
      if (isStartingRound) return;

      setIsStartingRound(true);
      onStarted?.();

      try {
        // Fetch course data including holes and num_holes
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, name, holes, num_holes')
          .eq('id', courseId)
          .single();

        if (courseError) {
          console.error('Error fetching course:', courseError);
        }

        // Use course holes, placeholder holes (build-as-you-play), or default holes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raw JSONB data from database
        const rawHoles = (courseData as any)?.holes;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raw JSONB data from database
        const courseNumHoles: number = (courseData as any)?.num_holes ?? 18;
        const parsedHoles = parseAndTransformHoles(rawHoles);
        const holes: Hole[] = parsedHoles.length > 0
          ? parsedHoles
          : isBuildAsYouPlay
            ? createPlaceholderHoles(courseNumHoles)
            : DEFAULT_HOLES;

        // Auto-select front9 for 9-hole courses
        const effectiveNineType: NineType = courseNumHoles === 9 ? 'front9' : nineType;

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
            date: getLocalDateString(),
            game_type: gameType,
            status: 'in-progress',
            selected_tee: selectedTee ?? null,
            scoring_pairs_required: scoringPairsConfig?.enabled ?? false,
            ball_count: ballCount,
            team_config: teamConfig ?? null,
            // Set team round fields for team formats (scramble, shamble, best-ball, match-play with teams)
            is_team_round: isTeamFormat,
            team_format: isMatchPlayWithTeams ? 'match-play-team' : (isStandardTeamFormat ? gameType : null),
            nine_type: effectiveNineType,
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
            { round_id: roundId, player_id: user.id, added_by: null, selected_tee: selectedTee ?? null },
            ...partners.map(partner => ({
              round_id: roundId,
              player_id: partner.id,
              added_by: user.id,
              selected_tee: partner.selectedTee ?? selectedTee ?? null,
            })),
          ];

          const { error: roundPlayersError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('round_players') as any)
            .insert(roundPlayersToInsert);

          // round_players error is non-fatal
        }

        // Create scoring pairs if enabled
        if (scoringPairsConfig?.enabled && scoringPairsConfig.pairs.length > 0 && user?.id) {
          try {
            const pairsWithRealIds = scoringPairsConfig.pairs.map(pair => ({
              scorerId: pair.scorerId === 'current-user' ? user.id : pair.scorerId,
              playerId: pair.playerId === 'current-user' ? user.id : pair.playerId,
            }));

            await createScoringPairs(roundId, pairsWithRealIds);
          } catch {
            // Scoring pairs creation is non-blocking
          }
        }

        // Create skins game if enabled (non-blocking - don't fail round creation)
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
                status: 'active',
                disclaimer_accepted_at: new Date().toISOString(),
                disclaimer_accepted_by: user.id,
                created_by: user.id,
              });

            // Skins error is non-fatal
          } catch {
            // Skins is a side feature - don't fail round creation
          }
        }

        // Create Wolf game if enabled (non-blocking - don't fail round creation)
        // Wolf requires 3-4 players
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

            // Wolf error is non-fatal
          } catch {
            // Wolf is a side feature - don't fail round creation
          }
        }

        // Store pending league tag if starting from a league
        if (pendingLeagueId) {
          setPendingLeagueTag(roundId, pendingLeagueId);
        }

        // Build per-player tee map
        const playerTeeMap = new Map<string, TeeBox>();
        const currentUser = player ?? (user ? { id: user.id } : null);
        if (selectedTee && currentUser) {
          playerTeeMap.set(currentUser.id, selectedTee);
        }
        for (const partner of partners) {
          const tee = partner.selectedTee ?? selectedTee;
          if (tee) {
            playerTeeMap.set(partner.id, tee);
          }
        }

        // Filter holes to the selected nine
        const filteredHoles = filterHolesByNineType(holes, effectiveNineType);

        // Initialize the scorecard store
        await initializeRound(roundId, players, filteredHoles, gameType, false, [], selectedTee ?? null, handicapSource, playerTeeMap, effectiveNineType);

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
