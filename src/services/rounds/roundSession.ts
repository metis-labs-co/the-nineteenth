/**
 * roundSession — shared round session helpers
 *
 * These functions are extracted from useStartNewRound so they can be reused
 * by useStartScheduledRound (which UPDATEs an existing round row rather than
 * INSERTing one) and any future callers.
 *
 * All logic is verbatim from useStartNewRound; only the call-site closure
 * variables have been turned into explicit parameters.
 */

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/services/supabase/client';
import { createScoringPairs } from '@/services/scoringPairs/scoringPairsService';
import { parseAndTransformHoles } from '@/utils/holeTransformers';
import type { RootStackParamList } from '@/navigation/types';
import type { Player, Hole, TeeBox, GameType } from '@/types';
import type { NineType } from '@/types/database/enums';
import type {
  ScoringPairsConfig,
  StandaloneSkinsConfig,
  StandaloneWolfConfig,
  TeamConfig,
  PlayingPartner,
} from '@/screens/rounds/CreateRoundBottomSheet';

// ---------------------------------------------------------------------------
// Default / placeholder holes
// ---------------------------------------------------------------------------

// Default holes (used when course has no hole data)
export const DEFAULT_HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: ([4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4][i] || 4) as Hole['par'],
  strokeIndex: [7, 15, 1, 11, 5, 17, 9, 3, 13, 8, 16, 2, 12, 6, 18, 10, 4, 14][i] || i + 1,
  yardages: { white: 350 + i * 15 },
}));

export function createPlaceholderHoles(count: number): Hole[] {
  return Array.from({ length: count }, (_, i) => ({
    number: (i + 1) as Hole['number'],
    par: 4 as Hole['par'],
    strokeIndex: i + 1,
  }));
}

// ---------------------------------------------------------------------------
// fetchRoundHoles
// ---------------------------------------------------------------------------

export interface FetchRoundHolesResult {
  holes: Hole[];
  effectiveNineType: NineType;
  courseNumHoles: number;
}

/**
 * Fetches course holes and resolves the effective nine type (9-hole courses force front9).
 */
export async function fetchRoundHoles(
  courseId: string,
  isBuildAsYouPlay: boolean | undefined,
  nineType: NineType
): Promise<FetchRoundHolesResult> {
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
  const holes: Hole[] =
    parsedHoles.length > 0
      ? parsedHoles
      : isBuildAsYouPlay
        ? createPlaceholderHoles(courseNumHoles)
        : DEFAULT_HOLES;

  // Auto-select front9 for 9-hole courses
  const effectiveNineType: NineType = courseNumHoles === 9 ? 'front9' : nineType;

  return { holes, effectiveNineType, courseNumHoles };
}

// ---------------------------------------------------------------------------
// createRoundSideGames
// ---------------------------------------------------------------------------

export interface CreateRoundSideGamesArgs {
  roundId: string;
  userId: string;
  partners: PlayingPartner[];
  scoringPairsConfig?: ScoringPairsConfig;
  skinsConfig?: StandaloneSkinsConfig;
  wolfConfig?: StandaloneWolfConfig;
}

/**
 * Creates scoring pairs / skins / wolf rows for a round. All side games are non-blocking.
 */
export async function createRoundSideGames(args: CreateRoundSideGamesArgs): Promise<void> {
  const { roundId, userId, partners, scoringPairsConfig, skinsConfig, wolfConfig } = args;

  // Create scoring pairs if enabled
  if (scoringPairsConfig?.enabled && scoringPairsConfig.pairs.length > 0) {
    try {
      const pairsWithRealIds = scoringPairsConfig.pairs.map((pair) => ({
        scorerId: pair.scorerId === 'current-user' ? userId : pair.scorerId,
        playerId: pair.playerId === 'current-user' ? userId : pair.playerId,
      }));

      await createScoringPairs(roundId, pairsWithRealIds);
    } catch {
      // Scoring pairs creation is non-blocking
    }
  }

  // Create skins game if enabled (non-blocking - don't fail round creation)
  if (skinsConfig?.enabled && skinsConfig.config && partners.length >= 1) {
    try {
      // Build participant IDs array (current user + partners)
      const participantIds = [userId, ...partners.map((p) => p.id)];

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
          disclaimer_accepted_by: userId,
          created_by: userId,
        });

      // Skins error is non-fatal
      void skinsError;
    } catch {
      // Skins is a side feature - don't fail round creation
    }
  }

  // Create Wolf game if enabled (non-blocking - don't fail round creation)
  // Wolf requires 3-4 players
  if (wolfConfig?.enabled && wolfConfig.config && partners.length >= 2 && partners.length <= 3) {
    try {
      // Build participant IDs array (current user + partners)
      const participantIds = [userId, ...partners.map((p) => p.id)];

      // Use wolf_order from config if provided, otherwise use participant order
      const wolfOrder =
        wolfConfig.config.wolf_order?.length === participantIds.length
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
          disclaimer_accepted_by: wolfConfig.config.pot_enabled ? userId : null,
          created_by: userId,
        });

      // Wolf error is non-fatal
      void wolfError;
    } catch {
      // Wolf is a side feature - don't fail round creation
    }
  }
}

// ---------------------------------------------------------------------------
// buildPlayerTeeMap
// ---------------------------------------------------------------------------

export interface BuildPlayerTeeMapArgs {
  currentUserId: string | null;
  selectedTee: TeeBox | undefined;
  partners: PlayingPartner[];
}

/**
 * Builds the per-player tee map (current user + partners, partner override wins).
 */
export function buildPlayerTeeMap(args: BuildPlayerTeeMapArgs): Map<string, TeeBox> {
  const { currentUserId, selectedTee, partners } = args;

  const playerTeeMap = new Map<string, TeeBox>();

  if (selectedTee && currentUserId) {
    playerTeeMap.set(currentUserId, selectedTee);
  }
  for (const partner of partners) {
    const tee = partner.selectedTee ?? selectedTee;
    if (tee) {
      playerTeeMap.set(partner.id, tee);
    }
  }

  return playerTeeMap;
}

// ---------------------------------------------------------------------------
// navigateToScoring
// ---------------------------------------------------------------------------

export interface NavigateToScoringArgs {
  roundId: string;
  gameType: GameType;
  teamConfig?: TeamConfig;
  players: Player[];
  isBuildAsYouPlay?: boolean;
}

/**
 * Routes to the correct scoring screen for the game type / team config.
 *
 * Individual match play (2 players) → dedicated MatchPlayScoring screen
 * Team match play (split into teams) → dedicated TeamMatchPlayScoring screen
 * Everything else → generic Scorecard
 */
export function navigateToScoring(
  navigation: NativeStackNavigationProp<RootStackParamList>,
  args: NavigateToScoringArgs
): void {
  const { roundId, gameType, teamConfig, players, isBuildAsYouPlay } = args;

  const isMatchPlayWithTeams = gameType === 'match-play' && !!teamConfig;

  if (
    gameType === 'match-play' &&
    isMatchPlayWithTeams &&
    teamConfig &&
    teamConfig.teams.length >= 2
  ) {
    navigation.navigate('TeamMatchPlayScoring', {
      roundId,
      team1Id: teamConfig.teams[0].id,
      team2Id: teamConfig.teams[1].id,
    });
  } else if (gameType === 'match-play' && !isMatchPlayWithTeams && players.length >= 2) {
    navigation.navigate('MatchPlayScoring', {
      roundId,
      player1Id: players[0].id,
      player2Id: players[1].id,
    });
  } else {
    navigation.navigate('Scorecard', {
      roundId,
      competitionId: 'standalone',
      isBuildAsYouPlay: isBuildAsYouPlay || undefined,
    });
  }
}
