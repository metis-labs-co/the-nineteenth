import { useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSkinsGamesByRound, useSkinsResults, useSkinsGame } from '@/hooks/useSkins';
import { useWolfGameByRound, useWolfSummary } from '@/hooks/wolf';
import type { RoundWithCourse, ScorecardWithPlayer } from '@/hooks/useRoundDetails';
import type { StandaloneTeamConfig } from '@/types/supabase/roundQueries';
import { TEAM_ONLY_GAME_TYPES } from '@/services/rounds/resultsEngine';

interface UseViewRoundSideGamesParams {
  roundId: string;
  round: RoundWithCourse | undefined;
  scorecards: ScorecardWithPlayer[] | undefined;
}

export function useViewRoundSideGames({ roundId, round, scorecards }: UseViewRoundSideGamesParams) {
  // Skins queries
  const { data: skinsGames } = useSkinsGamesByRound(roundId);

  const hasSkinsGame = useMemo(() => {
    if (!skinsGames || skinsGames.length === 0) return false;
    return skinsGames.some((g) => g.status === 'active' || g.status === 'completed');
  }, [skinsGames]);

  const activeSkinsGame = useMemo(() => {
    if (!skinsGames || skinsGames.length === 0) return null;
    return skinsGames.find((g) => g.status === 'active' || g.status === 'completed') || null;
  }, [skinsGames]);

  const { data: skinsResults, refetch: refetchSkinsResults, isRefetching: isRefetchingSkinsResults } = useSkinsResults(activeSkinsGame?.id);
  const { data: skinsGameWithParticipants, refetch: refetchSkinsGame } = useSkinsGame(activeSkinsGame?.id);

  // Wolf queries
  const { data: wolfGame } = useWolfGameByRound(roundId);

  const hasWolfGame = useMemo(() => {
    if (!wolfGame) return false;
    return wolfGame.status === 'active' || wolfGame.status === 'completed';
  }, [wolfGame]);

  const { data: wolfSummary, refetch: refetchWolfSummary } = useWolfSummary(hasWolfGame ? wolfGame?.id : undefined);

  // Team skins detection
  const isTeamSkins = useMemo(() => {
    if (skinsGameWithParticipants?.is_team_skins) return true;

    if (
      round?.is_team_round &&
      round?.team_format &&
      (TEAM_ONLY_GAME_TYPES as string[]).includes(round.team_format)
    ) {
      return true;
    }

    if (skinsResults && skinsResults.some((r) => (r as { team_winner_id?: string }).team_winner_id)) {
      return true;
    }

    return false;
  }, [skinsGameWithParticipants?.is_team_skins, round?.is_team_round, round?.team_format, skinsResults]);

  const skinsTeams = useMemo((): { id: string; name: string; members: { id: string; name: string; handicap: number | null }[] }[] | undefined => {
    if (!isTeamSkins) return undefined;

    const gameTeams = (skinsGameWithParticipants as { teams?: { id: string; name: string; members?: { id: string; name: string; handicap: number | null }[] }[] })?.teams;
    if (gameTeams && gameTeams.length > 0) {
      return gameTeams
        .filter((t): t is { id: string; name: string; members: { id: string; name: string; handicap: number | null }[] } =>
          t.members !== undefined && t.members.length > 0
        );
    }

    const teamConfig = (round as unknown as { team_config?: StandaloneTeamConfig })?.team_config;
    if (teamConfig?.teams && teamConfig.teams.length > 0) {
      const playerMap = new Map<string, string>();
      scorecards?.forEach((sc) => {
        if (sc.player?.name) {
          playerMap.set(sc.player_id, sc.player.name);
        }
      });

      return teamConfig.teams.map((t) => ({
        id: t.id,
        name: t.name,
        members: t.memberIds.map((memberId) => ({
          id: memberId,
          name: playerMap.get(memberId) ?? 'Player',
          handicap: null,
        })),
      }));
    }

    return undefined;
  }, [isTeamSkins, skinsGameWithParticipants, round, scorecards]);

  // Payouts tab logic
  const hasSkinsWithPot = useMemo(() => {
    if (!hasSkinsGame || isTeamSkins) return false;
    if (!activeSkinsGame || activeSkinsGame.pot_value <= 0) return false;
    return true;
  }, [hasSkinsGame, isTeamSkins, activeSkinsGame]);

  const hasWolfWithPot = useMemo(() => {
    if (!hasWolfGame) return false;
    if (!wolfGame?.pot_enabled || !wolfGame?.pot_value_per_point || wolfGame.pot_value_per_point <= 0) return false;
    return true;
  }, [hasWolfGame, wolfGame]);

  const hasPayoutsTab = hasSkinsWithPot || hasWolfWithPot;
  const payoutsMode = hasSkinsWithPot && hasWolfWithPot
    ? 'combined' as const
    : hasSkinsWithPot
      ? 'skins-only' as const
      : hasWolfWithPot
        ? 'wolf-only' as const
        : null;

  // Player name map from all side game sources
  const playerNameMap = useMemo((): Record<string, string> => {
    const map: Record<string, string> = {};

    scorecards?.forEach((sc) => {
      if (sc.player?.name) {
        map[sc.player_id] = sc.player.name;
      }
    });

    wolfSummary?.game.participants?.forEach((p) => {
      if (p.name && !map[p.id]) {
        map[p.id] = p.name;
      }
    });

    activeSkinsGame?.participants?.forEach((p) => {
      if (p.name && !map[p.id]) {
        map[p.id] = p.name;
      }
    });

    return map;
  }, [scorecards, wolfSummary, activeSkinsGame]);

  // Refetch skins data on focus
  useFocusEffect(
    useCallback(() => {
      if (hasSkinsGame && activeSkinsGame?.id) {
        refetchSkinsResults();
        refetchSkinsGame();
      }
    }, [hasSkinsGame, activeSkinsGame?.id, refetchSkinsResults, refetchSkinsGame])
  );

  return {
    // Skins data
    skinsGames,
    skinsResults,
    activeSkinsGame,
    skinsGameWithParticipants,
    hasSkinsGame,
    isTeamSkins,
    skinsTeams,
    isRefetchingSkinsResults,
    refetchSkinsResults,
    refetchSkinsGame,

    // Wolf data
    wolfGame,
    wolfSummary,
    hasWolfGame,
    refetchWolfSummary,

    // Payouts
    hasPayoutsTab,
    payoutsMode,

    // Shared
    playerNameMap,
  };
}
