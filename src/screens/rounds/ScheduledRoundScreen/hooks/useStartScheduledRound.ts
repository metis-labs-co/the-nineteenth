/**
 * useStartScheduledRound
 *
 * Start-day hook for a scheduled (upcoming) round. Mirrors useStartNewRound but
 * UPDATEs the existing round row rather than INSERTing one.
 *
 * RLS keep/drop analysis (migration 20260612000000_scheduled_rounds.sql):
 *
 *   round_players DELETE — "Users can remove players from their rounds"
 *     USING: EXISTS (SELECT 1 FROM rounds WHERE id = round_players.round_id
 *                    AND user_id = auth.uid())
 *     → OWNER ONLY. A non-owner accepted starter cannot delete pending rows.
 *
 *   round_players UPDATE — "Players can respond to their round invitation"
 *     USING: player_id = auth.uid()
 *     → A player may only update their OWN row. Flipping another player's
 *       invitation_status to 'accepted' is blocked for non-owners.
 *
 *   rounds UPDATE — "Users can update rounds" OR "Accepted players can update
 *     standalone rounds"
 *     → Any accepted player can UPDATE the rounds row (status, team_config, etc.)
 *
 * Decision:
 *   - If starter IS the owner   → full keep/drop: DELETE dropped pending rows.
 *   - If starter is NOT owner   → keep-all forced: no DELETE or UPDATE of others'
 *     rows; pending players participate as-is (their scorecard is still created).
 *     The UI shows a note explaining this.
 *
 * The 'pending' rows that are kept participate in the round as accepted-equivalent
 * for scoring purposes (they have scorecards, they're in the player list).
 * Their invitation_status DB column stays 'pending' — we don't flip it because
 * RLS blocks cross-row UPDATE for non-owners and it is not worth a separate migration
 * to allow that. The scoring screen treats all round_players rows as participants
 * regardless of invitation_status.
 */

import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useConfirmationDialog, type DialogConfig } from '@/hooks';
import { useScorecardStore } from '@/store/scorecardStore';
import { filterHolesByNineType } from '@/utils/holeTransformers';
import { getDisplayName } from '@/utils/displayHelpers';
import {
  fetchRoundHoles,
  createRoundSideGames,
  buildPlayerTeeMap,
  navigateToScoring,
} from '@/services/rounds/roundSession';
import { scheduledRoundKeys } from '@/hooks/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import type { RootStackParamList } from '@/navigation/types';
import type { Player, TeeBox, GameType } from '@/types';
import type { ScoringPairsConfig, StandaloneSkinsConfig, StandaloneWolfConfig, TeamConfig, PlayingPartner } from '@/screens/rounds/CreateRoundBottomSheet';
import type { HandicapSource } from '@/types/database/enums';
import type { ScheduledRoundDetail, ScheduledRoundPlayer } from '@/hooks/rounds/scheduledRounds';
import { resolveKeepDrop } from './resolveKeepDrop';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface StartScheduledRoundArgs {
  /** IDs of pending players the owner has decided to DROP (ignored for non-owners). */
  droppedPendingIds: Set<string>;
  /** Scoring setup from ScoringSetupStep (optional for solo/unsupported formats). */
  scoringPairsConfig?: ScoringPairsConfig;
  skinsConfig?: StandaloneSkinsConfig;
  teamConfig?: TeamConfig;
  wolfConfig?: StandaloneWolfConfig;
  handicapSource?: HandicapSource;
}

export interface UseStartScheduledRoundReturn {
  handleStart: (args: StartScheduledRoundArgs) => Promise<void>;
  isStarting: boolean;
  dialogConfig: DialogConfig;
  dismissDialog: () => void;
}

export function useStartScheduledRound(
  round: ScheduledRoundDetail
): UseStartScheduledRoundReturn {
  const navigation = useNavigation<NavigationProp>();
  const { user, player } = useAuth();
  const { initializeRound } = useScorecardStore();
  const queryClient = useQueryClient();
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = useCallback(
    async ({
      droppedPendingIds,
      scoringPairsConfig,
      skinsConfig,
      teamConfig,
      wolfConfig,
      handicapSource,
    }: StartScheduledRoundArgs) => {
      if (!user?.id) {
        showAlert('Not signed in', 'Please sign in to start the round.');
        return;
      }
      if (isStarting) return;
      setIsStarting(true);

      try {
        const isOwner = round.user_id === user.id;

        // -----------------------------------------------------------------------
        // 1. Resolve keep/drop — compute which players participate
        // -----------------------------------------------------------------------
        const { activeRows, toDrop } = resolveKeepDrop(
          round.players,
          droppedPendingIds,
          isOwner
        );

        // -----------------------------------------------------------------------
        // 2. Fetch course holes FIRST — validates course data before any DB writes.
        //    Doing this before the status UPDATE prevents stranding the round in
        //    'in-progress' if the course data is missing or malformed.
        // -----------------------------------------------------------------------
        const nineType = (round.nine_type as Parameters<typeof fetchRoundHoles>[2]) ?? 'full';
        const { holes, effectiveNineType } = await fetchRoundHoles(
          round.course_id,
          false,          // scheduled rounds don't use build-as-you-play
          nineType
        );

        // -----------------------------------------------------------------------
        // 3. Execute keep/drop DB changes (owner only — see RLS analysis above).
        //    Drops are irreversible — if the subsequent UPDATE fails we revert the
        //    status but cannot restore the deleted rows (acceptable: the player was
        //    pending and the organiser explicitly chose to remove them).
        // -----------------------------------------------------------------------
        if (toDrop.length > 0 && isOwner) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed client workaround
          const { error: dropError } = await (supabase.from('round_players') as any)
            .delete()
            .eq('round_id', round.id)
            .in('player_id', toDrop);

          if (dropError) {
            throw new Error(`Failed to remove dropped players: ${dropError.message}`);
          }
        }

        // -----------------------------------------------------------------------
        // 4. UPDATE round: status → in-progress + any setup fields
        // -----------------------------------------------------------------------
        const isStandardTeamFormat = ['scramble', 'shamble', 'best-ball'].includes(round.game_type);
        const isMatchPlayWithTeams = round.game_type === 'match-play' && !!teamConfig;
        const isTeamFormat = isStandardTeamFormat || isMatchPlayWithTeams;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed client workaround
        const { error: updateError } = await (supabase.from('rounds') as any)
          .update({
            status: 'in-progress',
            nine_type: effectiveNineType,
            scoring_pairs_required: scoringPairsConfig?.enabled ?? false,
            team_config: teamConfig ?? null,
            is_team_round: isTeamFormat,
            team_format: isMatchPlayWithTeams
              ? 'match-play-team'
              : isStandardTeamFormat
                ? round.game_type
                : null,
            ...(handicapSource ? { handicap_source: handicapSource } : {}),
          })
          .eq('id', round.id);

        if (updateError) {
          throw new Error(`Failed to start round: ${updateError.message}`);
        }

        // Post-UPDATE work is wrapped in try/catch so that if anything after the
        // status flip fails, we attempt to revert the round back to 'upcoming'.
        // (Mirrors the rollback pattern in useStartNewRound.)
        try {

        // -----------------------------------------------------------------------
        // 5. Build Player[] from active round_players rows
        // -----------------------------------------------------------------------
        const myId = player?.id ?? user.id;

        // Build full-data map from round.players (activeRows only carry player_id + status)
        const fullRowMap = new Map<string, ScheduledRoundPlayer>(
          round.players.map((r) => [r.player_id, r])
        );
        // Active IDs after keep/drop
        const activeIds = new Set(activeRows.map((r) => r.player_id));

        const players: Player[] = [];

        // Current user first
        const myFullRow = fullRowMap.get(myId);
        if (myFullRow || player) {
          players.push({
            id: myId,
            name: getDisplayName(
              player?.name ?? myFullRow?.player?.name ?? '',
              user.email?.split('@')[0] ?? 'Player 1'
            ),
            email: player?.email ?? user.email ?? '',
            handicap: player?.handicap ?? myFullRow?.player?.handicap ?? 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // Partners (everyone else in activeIds, excluding self)
        for (const [pid, fullRow] of fullRowMap) {
          if (pid === myId || !activeIds.has(pid)) continue;
          players.push({
            id: pid,
            name: getDisplayName(fullRow.player?.name ?? '', 'Guest'),
            email: '',
            handicap: fullRow.player?.handicap ?? 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        // -----------------------------------------------------------------------
        // 6. Build PlayingPartner[] for createRoundSideGames
        // -----------------------------------------------------------------------
        // Partners from fullRowMap (active, excluding self)
        const partners: PlayingPartner[] = [];
        for (const [pid, fullRow] of fullRowMap) {
          if (pid === myId || !activeIds.has(pid)) continue;
          partners.push({
            id: pid,
            name: getDisplayName(fullRow.player?.name ?? '', 'Guest'),
            handicap: fullRow.player?.handicap ?? undefined,
            selectedTee: (fullRow.selected_tee as TeeBox | undefined) ?? undefined,
          });
        }

        // -----------------------------------------------------------------------
        // 7. Create side games (scoring pairs / skins / wolf) — non-blocking
        // -----------------------------------------------------------------------
        await createRoundSideGames({
          roundId: round.id,
          userId: user.id,
          partners,
          scoringPairsConfig,
          skinsConfig,
          wolfConfig,
        });

        // -----------------------------------------------------------------------
        // 8. Build per-player tee map
        // -----------------------------------------------------------------------
        const mySelectedTee = (myFullRow?.selected_tee as TeeBox | null) ?? round.selected_tee ?? undefined;

        const playerTeeMap = buildPlayerTeeMap({
          currentUserId: myId,
          selectedTee: mySelectedTee,
          partners,
        });

        // -----------------------------------------------------------------------
        // 9. Filter holes + initialise scorecard store
        // -----------------------------------------------------------------------
        const filteredHoles = filterHolesByNineType(holes, effectiveNineType);

        await initializeRound(
          round.id,
          players,
          filteredHoles,
          round.game_type as GameType,
          false,
          [],
          mySelectedTee ?? null,
          handicapSource,
          playerTeeMap,
          effectiveNineType
        );

        // -----------------------------------------------------------------------
        // 10. Invalidate caches
        // -----------------------------------------------------------------------
        queryClient.invalidateQueries({ queryKey: scheduledRoundKeys.all });
        queryClient.invalidateQueries({ queryKey: ['rounds', user.id] });

        // -----------------------------------------------------------------------
        // 11. Navigate to scoring
        // -----------------------------------------------------------------------
        navigateToScoring(navigation, {
          roundId: round.id,
          gameType: round.game_type as GameType,
          teamConfig,
          players,
        });

        } catch (postUpdateError) {
          // Post-UPDATE tail failed — attempt best-effort revert of status to
          // 'upcoming' so the start UI remains accessible. If the revert itself
          // fails, we still surface the original error to the user.
          // Note: any dropped round_players rows are NOT restored (drops are
          // irreversible and acceptable — the organiser explicitly chose to remove
          // those pending players).
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase typed client workaround
            await (supabase.from('rounds') as any)
              .update({ status: 'upcoming' })
              .eq('id', round.id);
          } catch {
            // Revert failed — surface the original error below; round may remain
            // in-progress but at least we don't silently swallow the failure.
          }
          throw postUpdateError;
        }

      } catch (error) {
        console.error('[useStartScheduledRound] Error starting round:', error);
        showAlert(
          'Error starting round',
          error instanceof Error ? error.message : 'Please try again.'
        );
      } finally {
        setIsStarting(false);
      }
    },
    [
      user,
      player,
      round,
      isStarting,
      initializeRound,
      navigation,
      queryClient,
      showAlert,
    ]
  );

  return { handleStart, isStarting, dialogConfig, dismissDialog };
}
