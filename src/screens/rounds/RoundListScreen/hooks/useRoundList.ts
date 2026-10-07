/**
 * useRoundList - Fetches the rounds shown on the Rounds tab.
 *
 * Scope: standalone rounds the user owns or was invited to, PLUS rounds in
 * competitions the user has accepted. Competition rounds are included so a
 * player added to a competition by a friend can find and score the round from
 * the Rounds tab; the screen's scope filter can narrow back to social rounds.
 *
 * Note the social-round tier limit (`roundsPlayedCount`) still counts only
 * standalone rounds — competition rounds do not consume that allowance.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { fetchRoundIdsWithSideGame } from '@/services/api/rounds';
import { fetchAcceptedCompetitionIds } from '@/hooks/home/roundScope';
import { splitActiveAndHistory } from './notPlayedRounds';
import { parseClubLocation } from '@/utils/gpsCalculations';
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
import {
  computeStandaloneMatchResult,
  standaloneMatchHoles,
  type ScorecardForMatchPlay,
} from '@/utils/matchPlayResult';
import {
  calculatePlayerStats,
  type ScorecardPlayerData,
  type PlayerStats,
} from '@/utils/scorecardCalculations';

/**
 * Parse a PostGIS GEOGRAPHY(POINT) value (returned as GeoJSON) into
 * `{ latitude, longitude }`. Returns nulls when the location is missing
 * or malformed. Coordinates in the GeoJSON are [longitude, latitude].
 */
/**
 * Count the holes with a valid score in a scorecard's scores JSON.
 * Handles both single-ball and multi-ball (team) hole scores.
 */
function countScoredHoles(scores: Record<string, unknown> | null | undefined): number {
  if (!scores || typeof scores !== 'object') return 0;
  return Object.values(scores).filter((score) => {
    if (!score || typeof score !== 'object') return false;
    const s = score as HoleScore | MultiBallHoleScore;
    if (isSingleBallScore(s)) {
      return s.strokes != null && s.strokes > 0;
    }
    // MultiBallHoleScore - check if any ball has strokes
    const balls = (s as MultiBallHoleScore).balls;
    return Array.isArray(balls) && balls.some((b) => b.strokes != null && b.strokes > 0);
  }).length;
}

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
        .is('rounds.competition_id', null)
        .is('rounds.deleted_at', null);

      if (error) {
        console.error('Error fetching standalone rounds played count:', error);
        return 0;
      }

      return count ?? 0;
    },
    enabled: !!user?.id && !hasUnlimitedRounds,
  });

  // Fetch the user's rounds — standalone plus accepted-competition rounds —
  // in both active and historical states.
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
            location: { type: 'Point'; coordinates: [number, number] } | null;
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
              location
            )
          )
        `)
        .eq('user_id', user.id)
        .is('competition_id', null)
        .is('deleted_at', null)
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
                    ...parseClubLocation(round.courses.club.location),
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
                  location
                )
              )
            )
          `)
          .eq('player_id', user.id)
          .neq('invitation_status', 'declined') // Exclude rounds the user has declined
          .is('round.competition_id', null)
          .is('round.deleted_at', null)
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
                      ...parseClubLocation(round.courses.club.location),
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

      // 2b. Fetch rounds from competitions the user has accepted. These use the
      // same card shape as standalone rounds — `isStandalone: false` plus a
      // `competition` label is what the card and the scope filter key off.
      const competitionIds = await fetchAcceptedCompetitionIds(user.id, 'useRoundList');

      if (competitionIds.length > 0) {
        try {
          interface CompetitionRoundRow extends StandaloneRoundRow {
            competition_id: string;
            competition: { id: string; name: string } | null;
          }

          const { data: competitionRounds, error: competitionError } = await (supabase
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
              competition_id,
              competition:competitions(id, name),
              courses!course_id(
                id,
                name,
                holes,
                club:clubs(
                  name,
                  city,
                  state,
                  location
                )
              )
            `)
            .in('competition_id', competitionIds)
            .is('deleted_at', null)
            .order('date', { ascending: false });

          if (competitionError) {
            roundListLogger.error('Error fetching competition rounds', competitionError, {
              userId: user.id.substring(0, 8) + '...',
            });
          } else {
            const competitionRows = (competitionRounds || []) as CompetitionRoundRow[];
            roundListLogger.info('Competition rounds fetched', {
              count: competitionRows.length,
              competitions: competitionIds.length,
            });

            // "Round 2 of 5" needs the competition's total round count, which
            // this query already holds in full for every accepted competition.
            const roundsPerCompetition = new Map<string, number>();
            for (const round of competitionRows) {
              roundsPerCompetition.set(
                round.competition_id,
                (roundsPerCompetition.get(round.competition_id) ?? 0) + 1
              );
            }

            for (const round of competitionRows) {
              if (allRounds.some((r) => r.id === round.id)) continue;

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
                totalRounds: roundsPerCompetition.get(round.competition_id) ?? 1,
                gameType: round.game_type,
                isTeamRound: round.is_team_round ?? false,
                status: round.status,
                date: round.date,
                teeTime: round.tee_time,
                isStandalone: false,
                competition: round.competition
                  ? { id: round.competition.id, name: round.competition.name }
                  : undefined,
                course: {
                  id: round.courses?.id || '',
                  name: round.courses?.name || 'Unknown Course',
                  venueName: round.courses?.club?.name,
                  city: round.courses?.club?.city ?? undefined,
                  state: round.courses?.club?.state ?? undefined,
                  clubs: round.courses?.club
                    ? {
                        ...parseClubLocation(round.courses.club.location),
                        name: round.courses.club.name,
                      }
                    : null,
                },
                holesCompleted: 0,
                totalHoles: holes.length || 18,
                players: [], // Populated from scorecards in step 8
                handicapSource: round.handicap_source,
                selectedTeeName: round.selected_tee?.name ?? null,
                nineType: round.nine_type ?? null,
              });
            }
          }
        } catch (err) {
          roundListLogger.debug('Competition rounds fetch skipped', { error: err });
        }
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
            player: { id: string; name: string; photo_url: string | null } | null;
          }

          const { data: roundPlayersData, error: playersError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('round_players') as any)
            .select(`
              round_id,
              player:players!player_id(
                id,
                name,
                photo_url
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
                photo_url: rp.player.photo_url,
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
              const holesScored = countScoredHoles(sc.scores);
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

      // 6-7. Fetch skins/wolf games for all rounds to set hasSkins/hasWolf flags
      const allRoundIds = allRounds.map(r => r.id);
      const roundsWithSkins = await fetchRoundIdsWithSideGame('skins_games', allRoundIds);
      const roundsWithWolf = await fetchRoundIdsWithSideGame('wolf_games', allRoundIds);
      for (const round of allRounds) {
        round.hasSkins = roundsWithSkins.has(round.id);
        round.hasWolf = roundsWithWolf.has(round.id);
      }

      // 8. Fetch scorecards for completed rounds; compute userScore and winner
      // via calculatePlayerStats so totals match the scorecard view exactly.
      if (completedRoundIds.length > 0) {
        try {
          interface ScorecardRow {
            id: string;
            round_id: string;
            player_id: string;
            scores: Record<string, HoleScore | MultiBallHoleScore> | null;
            total_gross: number | null;
            total_net: number | null;
            total_points: number | null;
            daily_handicap_used: number | null;
            ga_handicap_used: number | null;
            handicap_differential: number | null;
            status: string;
            player: {
              id: string;
              name: string;
              photo_url: string | null;
              handicap: number | null;
              handicap_index: number | null;
              gender: 'male' | 'female' | null;
            } | null;
          }

          const { data: allScorecardsData, error: allScorecardsError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('scorecards') as any)
            .select(`
              id,
              round_id,
              player_id,
              scores,
              total_gross,
              total_net,
              total_points,
              daily_handicap_used,
              ga_handicap_used,
              handicap_differential,
              status,
              player:players!player_id(
                id,
                name,
                photo_url,
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

              // Competition rounds have no `round_players` rows (step 3 only
              // covers standalone rounds), so the card's avatar stack and
              // winner row come from whoever actually submitted a scorecard.
              if (!round.isStandalone && (round.players?.length ?? 0) === 0) {
                round.players = scorecards.reduce<RoundPlayerInfo[]>((acc, sc) => {
                  if (sc.player) {
                    acc.push({
                      id: sc.player.id,
                      name: sc.player.name,
                      photo_url: sc.player.photo_url,
                    });
                  }
                  return acc;
                }, []);
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
                  dailyHandicap: userScorecard?.daily_handicap_used ?? null,
                  differential: userScorecard?.handicap_differential ?? null,
                  scorecardId: userScorecard?.id ?? null,
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
                  dailyHandicap: userScorecard.daily_handicap_used,
                  differential: userScorecard.handicap_differential,
                  scorecardId: userScorecard.id,
                };
              } else {
                round.userScore = { hasScorecard: false };
              }

              // --- Winner row ---
              if (scorecards.length > 1) {
                if (round.gameType === 'match-play') {
                  // Match play still needs hole-by-hole walk to produce margin.
                  // Walk the round's own nine: the meta holes are the course's
                  // full card, so a front-9 match judged against 18 read "1&9".
                  const matchHoles = standaloneMatchHoles(holes, round.nineType);
                  const validScorecards = scorecards.filter((sc) => sc.player);
                  if (validScorecards.length === 2 && matchHoles.length > 0) {
                    const result = computeStandaloneMatchResult(
                      validScorecards[0],
                      validScorecards[1],
                      matchHoles
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
                        matchHoles
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

      // 9. For completed rounds the user never submitted, count how many holes
      // they actually scored (any scorecard status) so the card can show how
      // far they got. Checks Supabase first, then merges offline-only scores.
      const unsubmittedRoundIds = allRounds
        .filter((r) => r.status === 'completed' && r.userScore?.hasScorecard === false)
        .map((r) => r.id);

      if (unsubmittedRoundIds.length > 0) {
        try {
          const { data: unsubmittedData, error: unsubmittedError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('scorecards') as any)
            .select('round_id, scores')
            .eq('player_id', user.id)
            .in('round_id', unsubmittedRoundIds);

          const holesByRound = new Map<string, number>();
          if (!unsubmittedError && unsubmittedData) {
            for (const sc of unsubmittedData as { round_id: string; scores: Record<string, unknown> | null }[]) {
              const holesScored = countScoredHoles(sc.scores);
              if (holesScored > (holesByRound.get(sc.round_id) ?? 0)) {
                holesByRound.set(sc.round_id, holesScored);
              }
            }
          }

          // Scores entered offline may not have synced yet
          const offlineProgress = await getHolesCompletedByRounds(unsubmittedRoundIds, user.id);
          for (const [roundId, count] of offlineProgress) {
            if (count > (holesByRound.get(roundId) ?? 0)) {
              holesByRound.set(roundId, count);
            }
          }

          for (const round of allRounds) {
            if (holesByRound.has(round.id)) {
              round.holesCompleted = Math.max(round.holesCompleted, holesByRound.get(round.id)!);
            }
          }
        } catch (err) {
          // Progress is decorative — the card falls back to "Round not submitted"
          roundListLogger.debug('Unsubmitted progress fetch skipped', { error: err });
        }
      }

      // Active feeds the upcoming section, history feeds Recent Rounds;
      // "not played" competition rounds are routed into history there.
      const { active, history } = splitActiveAndHistory(allRounds);

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

  const result = computeStandaloneMatchResult(
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
