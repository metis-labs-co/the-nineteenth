/**
 * useStartNewRound - Handles creating a new standalone round
 */

import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useConfirmationDialog, type DialogConfig } from '@/hooks';
import {
  usePlaceholderPlayers,
  useUpdatePlaceholderPlayer,
} from '@/hooks/placeholderPlayers';
import { useScorecardStore } from '@/store/scorecardStore';
import { useSettingsStore } from '@/store/settingsStore';
import { filterHolesByNineType } from '@/utils/holeTransformers';
import { getDisplayName } from '@/utils/displayHelpers';
import { getLocalDateString } from '@/utils/formatting';
import {
  fetchRoundHoles,
  createRoundSideGames,
  buildPlayerTeeMap,
  navigateToScoring,
} from '@/services/rounds/roundSession';
import type { RootStackParamList } from '@/navigation/types';
import type { Player, TeeBox, GameType } from '@/types';
import type { BallCount } from '@/types/multiball.types';
import type { NineType, HandicapSource } from '@/types/database/enums';
import type { ScoringPairsConfig, StandaloneSkinsConfig, StandaloneWolfConfig, TeamConfig, PlayingPartner } from '../../CreateRoundBottomSheet';

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
    nineType?: NineType,
    currentUserHandicapOverride?: number | null
  ) => Promise<void>;
  isStartingRound: boolean;
  dialogConfig: DialogConfig;
  dismissDialog: () => void;
}

export function useStartNewRound(onStarted?: () => void, pendingLeagueId?: string): UseStartNewRoundReturn {
  const navigation = useNavigation<NavigationProp>();
  const { user, player, updateProfile } = useAuth();
  const { initializeRound } = useScorecardStore();
  const setPendingLeagueTag = useSettingsStore((s) => s.setPendingLeagueTag);

  // Handicap-edit mutations. Both are idempotent and cheap — we only call
  // them when wizard state contains an actual edit for the current user or
  // an owned placeholder.
  const updatePlaceholderPlayer = useUpdatePlaceholderPlayer();
  const { data: ownedPlaceholders } = usePlaceholderPlayers();

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
      nineType: NineType = 'full',
      currentUserHandicapOverride?: number | null
    ) => {
      if (isStartingRound) return;

      setIsStartingRound(true);
      onStarted?.();

      // Commit any in-wizard handicap edits to the player profiles BEFORE
      // creating the round. Doing this first ensures the scorecard snapshot
      // (captured in the local `players` array below) uses the edited values
      // and that the profile reflects the new HC for subsequent rounds.
      //
      // Transactional feel: if any profile update fails, abort round creation.
      const effectiveCurrentUserHC =
        currentUserHandicapOverride ?? player?.handicap ?? 0;

      const profileUpdatePromises: Promise<unknown>[] = [];

      if (
        currentUserHandicapOverride != null &&
        currentUserHandicapOverride !== player?.handicap
      ) {
        profileUpdatePromises.push(
          updateProfile({ handicap: currentUserHandicapOverride })
        );
      }

      for (const partner of partners) {
        // Only attempt to update placeholders the current user owns.
        // `ownedPlaceholders` is already filtered to created_by = user.id
        // inside usePlaceholderPlayers, so membership here is sufficient.
        const placeholder = ownedPlaceholders?.find((p) => p.id === partner.id);
        if (
          placeholder &&
          partner.handicap != null &&
          partner.handicap !== placeholder.handicap
        ) {
          profileUpdatePromises.push(
            updatePlaceholderPlayer.mutateAsync({
              id: partner.id,
              handicap: partner.handicap,
            })
          );
        }
      }

      if (profileUpdatePromises.length > 0) {
        try {
          await Promise.all(profileUpdatePromises);
        } catch (err) {
          showAlert(
            'Could not save handicap changes',
            err instanceof Error ? err.message : 'Please try again.'
          );
          setIsStartingRound(false);
          return;
        }
      }

      try {
        // Fetch course holes and resolve effective nine type.
        // IMPORTANT: this happens BEFORE the round INSERT because effectiveNineType
        // is written to the rounds row as nine_type.
        const { holes, effectiveNineType } = await fetchRoundHoles(
          courseId,
          isBuildAsYouPlay,
          nineType
        );

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
            // Use the effective HC (override ?? profile) so the scorecard
            // snapshot captures the edited value even before the profile
            // update completes its cache refresh.
            handicap: effectiveCurrentUserHC,
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

        // Create round_players records.
        //
        // This insert MUST succeed for the round to be usable. If it fails,
        // the round_players join is empty server-side, which means:
        //   - useRoundPlayers returns 0 players
        //   - On any cold-start resume, useRoundData silently bails
        //   - The score-entry screen wedges on "Loading scorecard…" forever
        // Previously this error was swallowed ("non-fatal") and produced
        // exactly that wedged state on TestFlight.
        // Now: surface the error and roll back the orphan rounds row so the
        // user can retry cleanly.
        if (user?.id) {
          const roundPlayersToInsert = [
            {
              round_id: roundId,
              player_id: user.id,
              added_by: null,
              selected_tee: selectedTee ?? null,
              invitation_status: 'accepted',
            },
            ...partners.map((partner) => ({
              round_id: roundId,
              player_id: partner.id,
              added_by: user.id,
              selected_tee: partner.selectedTee ?? selectedTee ?? null,
              invitation_status: 'accepted',
            })),
          ];

          const { error: roundPlayersError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            .from('round_players') as any)
            .insert(roundPlayersToInsert);

          if (roundPlayersError) {
            console.error('Error inserting round_players:', roundPlayersError);
            // Roll back the orphan rounds row so the user isn't left with
            // an unusable round in their list. Best-effort — if delete
            // fails we still throw the original error.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
            await (supabase.from('rounds') as any).delete().eq('id', roundId);
            throw new Error(
              `Couldn't add players to the round: ${roundPlayersError.message}. Please try again.`
            );
          }
        }

        // Create scoring pairs / skins / wolf (all non-blocking)
        if (user?.id) {
          await createRoundSideGames({
            roundId,
            userId: user.id,
            partners,
            scoringPairsConfig,
            skinsConfig,
            wolfConfig,
          });
        }

        // Store pending league tag if starting from a league
        if (pendingLeagueId) {
          setPendingLeagueTag(roundId, pendingLeagueId);
        }

        // Build per-player tee map
        const playerTeeMap = buildPlayerTeeMap({
          currentUserId: player?.id ?? user?.id ?? null,
          selectedTee,
          partners,
        });

        // Filter holes to the selected nine
        const filteredHoles = filterHolesByNineType(holes, effectiveNineType);

        // Initialize the scorecard store
        await initializeRound(roundId, players, filteredHoles, gameType, false, [], selectedTee ?? null, handicapSource, playerTeeMap, effectiveNineType);

        // Navigate to appropriate scoring screen
        navigateToScoring(navigation, {
          roundId,
          gameType,
          teamConfig,
          players,
          isBuildAsYouPlay,
        });
      } catch (error) {
        console.error('[RoundsScreen] Error starting round:', error);
        showAlert('Error', 'Failed to start the round. Please try again.');
      } finally {
        setIsStartingRound(false);
      }
    },
    [navigation, player, user, updateProfile, ownedPlaceholders, updatePlaceholderPlayer, initializeRound, isStartingRound, onStarted, showAlert, pendingLeagueId, setPendingLeagueTag]
  );

  return {
    handleStartNewRound,
    isStartingRound,
    dialogConfig,
    dismissDialog,
  };
}
