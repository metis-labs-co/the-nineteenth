/**
 * useRoundList - Fetches and manages standalone rounds data
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import { roundListLogger } from '@/utils/debugLogger';
import { getHolesCompletedByRounds } from '@/services/offline/dao/ScorecardDAO';
import type { RoundItem, RoundListData, RoundPlayerInfo, UseRoundListReturn } from '../types';
import type { WinnerInfo } from '@/components/common';
import type { HoleScore, MultiBallHoleScore, Hole, TeeBox } from '@/types/database/base';
import type { HandicapSource } from '@/types/database/enums';
import { isSingleBallScore } from '@/types/database/base';
import { getStrokesReceived } from '@/utils/scoring';
import {
  calculatePlayerStats,
  type ScorecardPlayerData,
  type PlayerStats,
} from '@/utils/scorecardCalculations';

export function useRoundList(): UseRoundListReturn {
  const { user } = useAuth();
  const { limits } = useSubscriptionContext();

  // Get tier limit for rounds played
  const maxRoundsPlayed = limits?.maxRoundsPlayed ?? 20;
  const hasUnlimitedRounds = isUnlimited(maxRoundsPlayed) || isNoLimit(maxRoundsPlayed);

  // Fetch count of completed standalone rounds for the user (for limit tracking)
  // Only counts standalone/social rounds, NOT competition rounds
  const { data: roundsPlayedCount = 0 } = useQuery<number>({
    queryKey: ['standaloneRoundsPlayedCount', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      // Count completed/confirmed scorecards for standalone rounds only
      // Join with rounds table to filter where competition_id IS NULL
      const { count, error } = await supabase
        .from('scorecards')
        .select('round_id, rounds!inner(competition_id)', { count: 'exact', head: true })
        .eq('player_id', user.id)
        .in('status', ['completed', 'confirmed'])
        .is('rounds.competition_id', null);

      if (error) {
        console.error('Error fetching standalone rounds played count:', error);
        return 0;
      }

      return count ?? 0;
    },
    enabled: !!user?.id && !hasUnlimitedRounds,
  });

  // Fetch standalone/practice rounds for the user (both active and historical)
  // Competition rounds are accessed via the Competitions screen
  const {
    data: rounds,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<RoundListData>({
    queryKey: ['rounds', user?.id],
    queryFn: async () => {
      if (!user?.id) return { active: [], history: [] };

      const allRounds: RoundItem[] = [];
      // Metadata needed to re-run calculatePlayerStats for completed rounds
      // (keeps round list totals consistent with the scorecard view).
      const roundMetaByRound = new Map<
        string,
        {
          holes: Hole[];
          selectedTee: TeeBox | null;
          handicapSource: HandicapSource;
        }
      >();

      // Define types for query results
      interface StandaloneRoundRow {
        id: string;
        round_number: number;
        game_type: string;
        is_team_round: boolean;
        status: string;
        date: string | null;
        tee_time: string | null;
        nine_type: string | null;
        handicap_source: HandicapSource | null;
        selected_tee: TeeBox | null;
        courses: {
          id: string;
          name: string;
          holes: unknown[] | null;
          club: {
            name: string;
            city: string | null;
            state: string | null;
            latitude: number | null;
            longitude: number | null;
          } | null;
        } | null;
      }

      // 1. Fetch standalone rounds (user's own rounds without competition)
      const { data: standaloneRounds, error: standaloneError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
        .from('rounds') as any)
        .select(`
          id,
          round_number,
          game_type,
          is_team_round,
          status,
          date,
          tee_time,
          nine_type,
          handicap_source,
          selected_tee,
          courses!course_id(
            id,
            name,
            holes,
            club:clubs(
              name,
              city,
              state,
              latitude,
              longitude
            )
          )
        `)
        .eq('user_id', user.id)
        .is('competition_id', null)
        .order('date', { ascending: false });

      // Collect standalone round IDs to fetch their players
      const standaloneRoundIds: string[] = [];

      if (standaloneError) {
        roundListLogger.error('Error fetching standalone rounds', standaloneError, {
          userId: user.id.substring(0, 8) + '...',
        });
      } else {
        roundListLogger.info('Standalone rounds fetched', {
          count: standaloneRounds?.length ?? 0,
          statuses: (standaloneRounds || []).map((r: StandaloneRoundRow) => r.status),
        });
        for (const round of (standaloneRounds || []) as StandaloneRoundRow[]) {
          standaloneRoundIds.push(round.id);
          const holes = Array.isArray(round.courses?.holes)
            ? (round.courses!.holes as Hole[])
            : [];
          roundMetaByRound.set(round.id, {
            holes,
            selectedTee: round.selected_tee,
            handicapSource: round.handicap_source ?? 'profile',
          });
          allRounds.push({
            id: round.id,
            roundNumber: round.round_number,
            totalRounds: 1, // Standalone rounds don't have multiple rounds
            gameType: round.game_type,
            isTeamRound: round.is_team_round ?? false,
            status: round.status,
            date: round.date,
            teeTime: round.tee_time,
            isStandalone: true,
            competition: undefined,
            course: {
              id: round.courses?.id || '',
              name: round.courses?.name || 'Unknown Course',
              venueName: round.courses?.club?.name,
              city: round.courses?.club?.city ?? undefined,
              state: round.courses?.club?.state ?? undefined,
              clubs: round.courses?.club
                ? {
                    latitude: round.courses.club.latitude,
                    longitude: round.courses.club.longitude,
                    name: round.courses.club.name,
                  }
                : null,
            },
            holesCompleted: 0,
            totalHoles: holes.length || 18,
            players: [], // Will be populated below
            handicapSource: round.handicap_source,
            selectedTeeName: round.selected_tee?.name ?? null,
            nineType: round.nine_type ?? null,
          });
        }
      }

      // 2. Fetch standalone rounds where user is a participant (invited by friends)
      // This shows rounds synced from friends
      // Note: round_players table may not exist if migration hasn't been applied
      try {
        interface ParticipantRoundRow {
          round: StandaloneRoundRow & { user_id: string };
        }

        const { data: participantRounds, error: participantError } = await (supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
          .from('round_players') as any)
          .select(`
            round:rounds!inner(
              id,
              user_id,
              round_number,
              game_type,
              is_team_round,
              status,
              date,
              tee_time,
              nine_type,
              handicap_source,
              selected_tee,
              courses!course_id(
                id,
                name,
                holes,
                club:clubs(
                  name,
                  city,
                  state,
                  latitude,
                  longitude
                )
              )
            )
          `)
          .eq('player_id', user.id)
          .is('round.competition_id', null)
          .neq('round.user_id', user.id); // Exclude rounds user owns (already fetched above)

        if (participantError) {
          // Table might not exist yet - this is not a critical error
          if (participantError.code !== 'PGRST205') {
            console.error('Error fetching participant rounds:', participantError);
          }
        } else {
          for (const rp of (participantRounds || []) as ParticipantRoundRow[]) {
            const round = rp.round;
            if (!round) continue;

            // Check if this round is already in the list (shouldn't happen, but just in case)
            if (allRounds.some(r => r.id === round.id)) continue;

            const holes = Array.isArray(round.courses?.holes)
              ? (round.courses!.holes as Hole[])
              : [];
            roundMetaByRound.set(round.id, {
              holes,
              selectedTee: round.selected_tee,
              handicapSource: round.handicap_source ?? 'profile',
            });
            allRounds.push({
              id: round.id,
              roundNumber: round.round_number,
              totalRounds: 1,
              gameType: round.game_type,
              isTeamRound: round.is_team_round ?? false,
              status: round.status,
              date: round.date,
              teeTime: round.tee_time,
              isStandalone: true,
              competition: undefined,
              course: {
                id: round.courses?.id || '',
                name: round.courses?.name || 'Unknown Course',
                venueName: round.courses?.club?.name,
                city: round.courses?.club?.city ?? undefined,
                state: round.courses?.club?.state ?? undefined,
                clubs: round.courses?.club
                  ? {
                      latitude: round.courses.club.latitude,
                      longitude: round.courses.club.longitude,
                      name: round.courses.club.name,
                    }
                  : null,
              },
              holesCompleted: 0,
              totalHoles: holes.length || 18,
              players: [], // Will be populated below
              handicapSource: round.handicap_source,
              selectedTeeName: round.selected_tee?.name ?? null,
              nineType: round.nine_type ?? null,
            });
          }
        }
      } catch {
        // Silently ignore if round_players table doesn't exist yet
      }

      // 3. Fetch players for all standalone rounds
      // Collect all standalone round IDs
      const allStandaloneRoundIds = allRounds
        .filter(r => r.isStandalone)
        .map(r => r.id);

      if (allStandaloneRoundIds.length > 0) {
        try {
          interface RoundPlayerRow {
            round_id: string;
            player: { id: string; name: string } | null;
          }

          const { data: roundPlayersData, error: playersError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('round_players') as any)
            .select(`
              round_id,
              player:players!player_id(
                id,
                name
              )
            `)
            .in('round_id', allStandaloneRoundIds);

          if (playersError) {
            if (playersError.code !== 'PGRST205') {
              console.error('Error fetching round players:', playersError);
            }
          } else if (roundPlayersData) {
            // Group players by round_id
            const playersByRound = new Map<string, RoundPlayerInfo[]>();
            for (const rp of roundPlayersData as RoundPlayerRow[]) {
              if (!rp.player) continue;
              const roundId = rp.round_id;
              if (!playersByRound.has(roundId)) {
                playersByRound.set(roundId, []);
              }
              playersByRound.get(roundId)!.push({
                id: rp.player.id,
                name: rp.player.name,
              });
            }

            // Update allRounds with player info
            for (const round of allRounds) {
              if (round.isStandalone && playersByRound.has(round.id)) {
                round.players = playersByRound.get(round.id);
              }
            }
          }
        } catch {
          // round_players table may not exist yet
        }
      }

      // 4. Fetch progress for in-progress rounds (count scored holes)
      const inProgressRoundIds = allRounds
        .filter(r => r.status === 'in-progress')
        .map(r => r.id);

      if (inProgressRoundIds.length > 0) {
        try {
          interface ProgressScorecardRow {
            round_id: string;
            scores: Record<string, unknown> | null;
          }

          const { data: progressData, error: progressError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('scorecards') as any)
            .select('round_id, scores')
            .eq('player_id', user.id)
            .in('round_id', inProgressRoundIds);

          if (progressError) {
            console.error('Error fetching in-progress scorecards:', progressError);
          } else if (progressData) {
            // Map holes completed per round
            const progressByRound = new Map<string, number>();
            for (const sc of progressData as ProgressScorecardRow[]) {
              if (!sc.scores || typeof sc.scores !== 'object') continue;
              // Count holes with valid scores
              const holesScored = Object.values(sc.scores).filter(score => {
                if (!score || typeof score !== 'object') return false;
                const s = score as HoleScore | MultiBallHoleScore;
                if (isSingleBallScore(s)) {
                  return s.strokes != null && s.strokes > 0;
                }
                // MultiBallHoleScore - check if any ball has strokes
                const balls = (s as MultiBallHoleScore).balls;
                return Array.isArray(balls) && balls.some(b => b.strokes != null && b.strokes > 0);
              }).length;
              // Use the max holes scored across scorecards for this round
              const existing = progressByRound.get(sc.round_id) ?? 0;
              if (holesScored > existing) {
                progressByRound.set(sc.round_id, holesScored);
              }
            }

            // Update rounds with progress data
            for (const round of allRounds) {
              if (round.status === 'in-progress' && progressByRound.has(round.id)) {
                round.holesCompleted = progressByRound.get(round.id)!;
              }
            }
          }
        } catch {
          // Scorecard progress fetch may not be available
        }
      }

      // 4b. Merge offline progress data (SQLite may have scores not yet synced to Supabase)
      if (inProgressRoundIds.length > 0) {
        try {
          const offlineProgress = await getHolesCompletedByRounds(inProgressRoundIds, user.id);
          if (offlineProgress.size > 0) {
            for (const round of allRounds) {
              if (round.status === 'in-progress' && offlineProgress.has(round.id)) {
                const offlineCount = offlineProgress.get(round.id)!;
                // Use the max of remote and offline counts
                round.holesCompleted = Math.max(round.holesCompleted, offlineCount);
              }
            }
          }
        } catch (err) {
          // Non-critical: offline DB may not have data for these rounds
          roundListLogger.debug('Offline progress merge skipped', { error: err });
        }
      }

      const completedRoundIds = allRounds
        .filter(r => r.status === 'completed')
        .map(r => r.id);

      // 6. Fetch skins games for all rounds to set hasSkins flag
      const allRoundIds = allRounds.map(r => r.id);
      if (allRoundIds.length > 0) {
        try {
          interface SkinsGameRow {
            round_id: string;
          }

          const { data: skinsGamesData, error: skinsGamesError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('skins_games') as any)
            .select('round_id')
            .in('round_id', allRoundIds)
            .in('status', ['active', 'completed']);

          if (skinsGamesError) {
            if (skinsGamesError.code !== 'PGRST205') {
              console.error('Error fetching skins games:', skinsGamesError);
            }
          } else if (skinsGamesData) {
            // Create a set of round IDs that have skins games
            const roundsWithSkins = new Set(
              (skinsGamesData as SkinsGameRow[]).map(sg => sg.round_id)
            );

            // Update hasSkins flag on rounds
            for (const round of allRounds) {
              round.hasSkins = roundsWithSkins.has(round.id);
            }
          }
        } catch {
          // skins_games table may not exist yet
        }
      }

      // 7. Fetch wolf games for all rounds to set hasWolf flag
      if (allRoundIds.length > 0) {
        try {
          interface WolfGameRow {
            round_id: string;
          }

          const { data: wolfGamesData, error: wolfGamesError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('wolf_games') as any)
            .select('round_id')
            .in('round_id', allRoundIds)
            .in('status', ['active', 'completed']);

          if (wolfGamesError) {
            if (wolfGamesError.code !== 'PGRST205') {
              console.error('Error fetching wolf games:', wolfGamesError);
            }
          } else if (wolfGamesData) {
            // Create a set of round IDs that have wolf games
            const roundsWithWolf = new Set(
              (wolfGamesData as WolfGameRow[]).map(wg => wg.round_id)
            );

            // Update hasWolf flag on rounds
            for (const round of allRounds) {
              round.hasWolf = roundsWithWolf.has(round.id);
            }
          }
        } catch {
          // wolf_games table may not exist yet
        }
      }

      // 8. Fetch scorecards for completed rounds; compute userScore and winner
      // via calculatePlayerStats so totals match the scorecard view exactly.
      if (completedRoundIds.length > 0) {
        try {
          interface ScorecardRow {
            round_id: string;
            player_id: string;
            scores: Record<string, HoleScore | MultiBallHoleScore> | null;
            total_gross: number | null;
            total_net: number | null;
            total_points: number | null;
            daily_handicap_used: number | null;
            ga_handicap_used: number | null;
            status: string;
            player: {
              id: string;
              name: string;
              handicap: number | null;
              handicap_index: number | null;
              gender: 'male' | 'female' | null;
            } | null;
          }

          const { data: allScorecardsData, error: allScorecardsError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('scorecards') as any)
            .select(`
              round_id,
              player_id,
              scores,
              total_gross,
              total_net,
              total_points,
              daily_handicap_used,
              ga_handicap_used,
              status,
              player:players!player_id(
                id,
                name,
                handicap,
                handicap_index,
                gender
              )
            `)
            .in('round_id', completedRoundIds)
            .in('status', ['completed', 'confirmed']);

          if (allScorecardsError) {
            console.error('Error fetching scorecards for completed rounds:', allScorecardsError);
          } else if (allScorecardsData) {
            // Group scorecards by round_id
            const scorecardsByRound = new Map<string, ScorecardRow[]>();
            for (const sc of allScorecardsData as ScorecardRow[]) {
              if (!scorecardsByRound.has(sc.round_id)) {
                scorecardsByRound.set(sc.round_id, []);
              }
              scorecardsByRound.get(sc.round_id)!.push(sc);
            }

            for (const round of allRounds) {
              if (round.status !== 'completed') continue;

              const scorecards = scorecardsByRound.get(round.id);
              if (!scorecards || scorecards.length === 0) {
                round.userScore = { hasScorecard: false };
                continue;
              }

              const meta = roundMetaByRound.get(round.id);
              const holes = meta?.holes ?? [];
              const selectedTee = meta?.selectedTee ?? null;
              const handicapSource = meta?.handicapSource ?? 'profile';

              // Map DB scorecards into the shape calculatePlayerStats expects
              const playerData: ScorecardPlayerData[] = scorecards.map((sc) => ({
                id: sc.player_id,
                playerId: sc.player_id,
                player: sc.player
                  ? {
                      id: sc.player.id,
                      name: sc.player.name,
                      handicap: sc.player.handicap,
                      handicap_index: sc.player.handicap_index,
                      gender: sc.player.gender,
                    }
                  : null,
                scores: sc.scores,
                hasScorecard: sc.status === 'completed' || sc.status === 'confirmed',
                storedGaHandicap: sc.ga_handicap_used,
                storedDailyHandicap: sc.daily_handicap_used,
                storedTotalPoints: sc.total_points,
              }));

              const stats =
                holes.length > 0
                  ? calculatePlayerStats(playerData, holes, selectedTee, handicapSource)
                  : [];

              // --- User's score pill ---
              const userStat = stats.find((s) => s.playerId === user.id);
              const userScorecard = scorecards.find((sc) => sc.player_id === user.id);
              if (userStat && userStat.hasScores) {
                round.userScore = {
                  totalGross: userStat.totalGross,
                  totalNet: Math.ceil(userStat.totalNet),
                  totalPoints: userStat.totalStableford,
                  hasScorecard: true,
                  matchResult: null,
                };
              } else if (userScorecard) {
                // Fall back to stored totals when we can't compute stats
                // (e.g. missing holes data).
                round.userScore = {
                  totalGross: userScorecard.total_gross,
                  totalNet: userScorecard.total_net,
                  totalPoints: userScorecard.total_points,
                  hasScorecard:
                    userScorecard.status === 'completed' ||
                    userScorecard.status === 'confirmed',
                  matchResult: null,
                };
              } else {
                round.userScore = { hasScorecard: false };
              }

              // --- Winner row ---
              if (scorecards.length > 1) {
                if (round.gameType === 'match-play') {
                  // Match play still needs hole-by-hole walk to produce margin
                  const validScorecards = scorecards.filter((sc) => sc.player);
                  if (validScorecards.length === 2 && holes.length > 0) {
                    const result = computeMatchPlayResult(
                      validScorecards[0],
                      validScorecards[1],
                      holes
                    );
                    if (result) {
                      round.winner = {
                        name: result.winnerName,
                        points: 0,
                        isTeam: false,
                        margin: result.margin,
                      };
                    }
                    if (user?.id && round.userScore?.hasScorecard) {
                      const userResult = computeUserMatchResult(
                        validScorecards,
                        user.id,
                        holes
                      );
                      if (userResult) {
                        round.userScore = {
                          ...round.userScore,
                          matchResult: userResult,
                        };
                      }
                    }
                  }
                } else if (stats.length > 0) {
                  const w = determineWinnerFromStats(stats, round.gameType);
                  if (w) round.winner = w;
                }
              }
            }
          }
        } catch (err) {
          roundListLogger.debug('Completed rounds stats skipped', { error: err });
        }
      }

      // Separate into active and historical
      const active = allRounds
        .filter(r => r.status !== 'completed')
        .sort((a, b) => {
          // In-progress first
          if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
          if (b.status === 'in-progress' && a.status !== 'in-progress') return 1;
          // Then by date (most recent first)
          if (a.date && b.date) {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          }
          return 0;
        });

      const history = allRounds
        .filter(r => r.status === 'completed')
        .sort((a, b) => {
          // Most recent first
          if (a.date && b.date) {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          }
          return 0;
        });

      // Log unexpected statuses that would cause rounds to not appear in either tab
      const unexpectedRounds = allRounds.filter(
        r => r.status !== 'upcoming' && r.status !== 'in-progress' && r.status !== 'completed'
      );
      if (unexpectedRounds.length > 0) {
        roundListLogger.warn('Rounds with unexpected status values', {
          rounds: unexpectedRounds.map(r => ({
            id: r.id.substring(0, 8) + '...',
            status: r.status,
          })),
        });
      }

      roundListLogger.info('Round list split complete', {
        totalRounds: allRounds.length,
        activeCount: active.length,
        historyCount: history.length,
        activeStatuses: active.map(r => r.status),
        historyStatuses: history.map(r => r.status),
      });

      return { active, history };
    },
    enabled: !!user?.id,
  });

  return {
    rounds,
    isLoading,
    isRefetching,
    refetch,
    roundsPlayedCount,
  };
}

/**
 * Determine the winner from calculatePlayerStats output. Uses the same
 * per-hole daily-handicap math the scorecard view uses so the round list
 * and scorecard tab never disagree on gross / net / points totals.
 */
function determineWinnerFromStats(
  stats: PlayerStats[],
  gameType: string
): WinnerInfo | null {
  const playersWithScores = stats.filter((s) => s.hasScores);
  if (playersWithScores.length === 0) return null;

  let winner: PlayerStats | null = null;
  let winningScore = 0;

  switch (gameType) {
    case 'stableford':
    case 'fourball_bestball':
      // Highest Stableford points wins
      for (const s of playersWithScores) {
        if (!winner || s.totalStableford > winningScore) {
          winner = s;
          winningScore = s.totalStableford;
        }
      }
      break;

    case 'stroke':
    case 'scramble':
      // Lowest net score wins
      for (const s of playersWithScores) {
        const net = Math.ceil(s.totalNet);
        if (!winner || net < winningScore) {
          winner = s;
          winningScore = net;
        }
      }
      break;

    default:
      // Default to highest Stableford points
      for (const s of playersWithScores) {
        if (!winner || s.totalStableford > winningScore) {
          winner = s;
          winningScore = s.totalStableford;
        }
      }
  }

  if (!winner) return null;

  return {
    name: winner.playerName,
    points: winningScore,
    isTeam: false,
  };
}

/**
 * Minimal scorecard shape used by the match-play helpers below. Match
 * play computes the winner hole-by-hole rather than from totals, so it
 * keeps its own typed slice of the DB row.
 */
interface ScorecardForMatchPlay {
  player_id: string;
  scores: Record<string, HoleScore | MultiBallHoleScore> | null;
  daily_handicap_used: number | null;
  player: { id: string; name: string } | null;
}

/**
 * Compute a two-player match play result from raw scorecards and the
 * course's hole list. Uses each scorecard's `daily_handicap_used` to
 * determine strokes given (lower-DHC player gives the absolute difference
 * to the higher-DHC player on the receiver's lowest stroke-index holes),
 * then walks holes in order tracking holes-up. Stops early when one
 * player's lead exceeds the holes remaining (dormie+).
 *
 * Returns the winner info plus the formatted margin, or null when there
 * isn't enough data to make a call (no holes played, missing scores).
 *
 * Mirrors the math in `MatchPlayEngine.calculateMatch` but is self-
 * contained so the round list can run it without pulling the full
 * scoring engine + course/tee context.
 */
function computeMatchPlayResult(
  p1: ScorecardForMatchPlay,
  p2: ScorecardForMatchPlay,
  holes: Hole[]
): {
  winnerId: string | null;
  winnerName: string;
  margin: string;
} | null {
  const dhc1 = p1.daily_handicap_used ?? 0;
  const dhc2 = p2.daily_handicap_used ?? 0;
  const handicapDiff = Math.abs(dhc1 - dhc2);
  const player1GivesStrokes = dhc1 < dhc2;

  const sortedHoles = [...holes].sort((a, b) => a.number - b.number);
  const totalHoles = sortedHoles.length;

  let player1Up = 0;
  let holesPlayed = 0;

  for (const hole of sortedHoles) {
    const score1 = p1.scores?.[String(hole.number)];
    const score2 = p2.scores?.[String(hole.number)];
    const gross1 =
      score1 && isSingleBallScore(score1) && score1.strokes > 0
        ? score1.strokes
        : null;
    const gross2 =
      score2 && isSingleBallScore(score2) && score2.strokes > 0
        ? score2.strokes
        : null;
    if (gross1 == null || gross2 == null) continue;

    let strokes1 = 0;
    let strokes2 = 0;
    if (handicapDiff > 0) {
      const sr = getStrokesReceived(handicapDiff, hole.strokeIndex);
      if (player1GivesStrokes) strokes2 = sr;
      else strokes1 = sr;
    }

    const net1 = gross1 - strokes1;
    const net2 = gross2 - strokes2;

    holesPlayed++;
    if (net1 < net2) player1Up++;
    else if (net2 < net1) player1Up--;

    // Early finish — match is decided when lead > holes remaining
    const holesRemaining = totalHoles - holesPlayed;
    if (Math.abs(player1Up) > holesRemaining) {
      const winnerId = player1Up > 0 ? p1.player_id : p2.player_id;
      const winnerName =
        (player1Up > 0 ? p1.player?.name : p2.player?.name) ?? 'Unknown';
      return {
        winnerId,
        winnerName,
        margin: `${Math.abs(player1Up)}&${holesRemaining}`,
      };
    }
  }

  if (holesPlayed === 0) return null;

  if (player1Up === 0) {
    return { winnerId: null, winnerName: 'Halved', margin: 'A/S' };
  }

  const absLead = Math.abs(player1Up);
  const winnerId = player1Up > 0 ? p1.player_id : p2.player_id;
  const winnerName =
    (player1Up > 0 ? p1.player?.name : p2.player?.name) ?? 'Unknown';
  const margin =
    holesPlayed === totalHoles
      ? `${absLead}up`
      : `${absLead}&${totalHoles - holesPlayed}`;

  return { winnerId, winnerName, margin };
}

/**
 * Compute the match play outcome from the perspective of a single user,
 * for the "You: Won 4&3" pill on the round card. Returns null when the
 * user isn't one of the two match players or there isn't enough data.
 */
function computeUserMatchResult(
  scorecards: ScorecardForMatchPlay[],
  userId: string,
  holes: Hole[] | undefined
): { won: boolean; margin: string } | null {
  if (!holes || holes.length === 0 || scorecards.length !== 2) return null;
  const userIdx = scorecards.findIndex((s) => s.player_id === userId);
  if (userIdx === -1) return null;

  const result = computeMatchPlayResult(
    scorecards[0],
    scorecards[1],
    holes
  );
  if (!result || result.winnerId === null) return null;

  return {
    won: result.winnerId === userId,
    margin: result.margin,
  };
}
