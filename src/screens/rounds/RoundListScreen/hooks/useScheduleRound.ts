/**
 * useScheduleRound - Creates an 'upcoming' standalone round with pending
 * friend invitations. No scorecards are created; that happens at start time.
 * The round_players INSERT fires the existing notify_round_player_invited
 * trigger, which delivers the invite pushes automatically.
 *
 * Tier limits for maxRoundsPlayed are count-based on completed scorecards
 * (see useRoundList's standaloneRoundsPlayedCount query). An 'upcoming' row
 * does NOT increment that count — it only increments when a round is actually
 * completed and the scorecard is submitted. No pre-creation limit check is
 * required here.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useConfirmationDialog, type DialogConfig } from '@/hooks';
import { usePlaceholderPlayers } from '@/hooks/usePlaceholderPlayers';
import { useQueryClient } from '@tanstack/react-query';
import type { ScheduleRoundArgs } from '../../CreateRoundBottomSheet';

export interface UseScheduleRoundReturn {
  handleScheduleRound: (args: ScheduleRoundArgs) => Promise<void>;
  isScheduling: boolean;
  dialogConfig: DialogConfig;
  dismissDialog: () => void;
}

export function useScheduleRound(onScheduled?: () => void): UseScheduleRoundReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: ownedPlaceholders } = usePlaceholderPlayers();
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();
  const [isScheduling, setIsScheduling] = useState(false);

  const handleScheduleRound = useCallback(
    async (args: ScheduleRoundArgs) => {
      if (isScheduling || !user?.id) return;

      setIsScheduling(true);
      onScheduled?.();

      try {
        // Determine team format flags — mirrors useStartNewRound's derivation.
        // isMatchPlayWithTeams requires a teamConfig which is not available at
        // schedule time (teams are formed when the round starts), so only the
        // standard team formats (scramble, shamble, best-ball) set is_team_round.
        const isStandardTeamFormat = ['scramble', 'shamble', 'best-ball'].includes(args.gameType);

        // Create the round row with 'upcoming' status
        const { data: roundData, error: roundError } = await (supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
          .from('rounds') as any)
          .insert({
            course_id: args.courseId,
            user_id: user.id,
            competition_id: null,
            round_number: 1,
            date: args.date,
            tee_time: args.teeTime,
            game_type: args.gameType,
            status: 'upcoming',
            selected_tee: args.selectedTee ?? null,
            // handicap_source, ball_count — deferred to start time
            is_team_round: isStandardTeamFormat,
            team_format: isStandardTeamFormat ? args.gameType : null,
            nine_type: args.nineType,
          })
          .select('id')
          .single();

        if (roundError) {
          console.error('[useScheduleRound] Error creating round:', roundError);
          throw new Error(`Failed to schedule round: ${roundError.message}`);
        }

        const roundId = roundData.id;

        // Build the round_players rows.
        //
        // Placeholder/guest partners cannot respond to invite notifications
        // (they have no device or account). Players whose id is in the
        // owned-placeholders list are inserted as 'accepted' with responded_at
        // set so they don't appear as pending in invitation UIs.
        const ownedPlaceholderIds = new Set((ownedPlaceholders ?? []).map((p) => p.id));

        const roundPlayersToInsert = [
          // Organiser: always accepted, no added_by
          {
            round_id: roundId,
            player_id: user.id,
            added_by: null,
            selected_tee: args.selectedTee ?? null,
            invitation_status: 'accepted',
            responded_at: new Date().toISOString(),
          },
          // Partners
          ...args.partners.map((partner) => {
            // Placeholder/guest players can't respond to invites — treat as accepted.
            const isPlaceholder = ownedPlaceholderIds.has(partner.id);
            return {
              round_id: roundId,
              player_id: partner.id,
              added_by: user.id,
              selected_tee: partner.selectedTee ?? args.selectedTee ?? null,
              invitation_status: isPlaceholder ? 'accepted' : 'pending',
              responded_at: isPlaceholder ? new Date().toISOString() : null,
            };
          }),
        ];

        const { error: roundPlayersError } = await (supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
          .from('round_players') as any)
          .insert(roundPlayersToInsert);

        if (roundPlayersError) {
          console.error('[useScheduleRound] Error inserting round_players:', roundPlayersError);
          // Roll back the orphan rounds row so the user isn't left with
          // an unusable round in their list.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
          await (supabase.from('rounds') as any).delete().eq('id', roundId);
          throw new Error(
            `Couldn't add players to the round: ${roundPlayersError.message}. Please try again.`
          );
        }

        // Invalidate the standalone rounds list so the new upcoming round
        // appears immediately. The query key is ['rounds', user.id] as used
        // by useRoundList in RoundListScreen.
        await queryClient.invalidateQueries({ queryKey: ['rounds', user.id] });
      } catch (error) {
        console.error('[useScheduleRound] Error:', error);
        showAlert('Error', 'Failed to schedule the round. Please try again.');
      } finally {
        setIsScheduling(false);
      }
    },
    [isScheduling, user, ownedPlaceholders, queryClient, onScheduled, showAlert]
  );

  return {
    handleScheduleRound,
    isScheduling,
    dialogConfig,
    dismissDialog,
  };
}
