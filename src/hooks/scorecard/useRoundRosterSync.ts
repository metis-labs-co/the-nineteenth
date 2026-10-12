/**
 * Keeps this device's roster in step with the server for a social round.
 * Re-reads on a Broadcast ping, on focus while online, and when an upload for
 * this round loses access. A confirmed read with this user still in the round
 * is the only thing allowed to discard a removed player's local writes.
 * @see docs/superpowers/specs/2026-10-12-round-options-menu-design.md §4
 */

import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/services/supabase/client';
import { fetchRoundRoster } from '@/services/rounds/roundRoster';
import { reconcileRoster } from '@/services/rounds/reconcileRoster';
import { registerRoundChannel, roundChannelName } from '@/services/rounds/roundRosterChannel';
import { onRoundAccessLost } from '@/services/rounds/roundAccessEvents';
import { withRoundScoringWrite } from '@/services/rounds/roundScoringCoordinator';
import { deleteRoundIntents, deleteScorecardsByRound, removePendingSyncByEntityKey } from '@/services/offline/database';
import { activeRoundSession } from '@/services/activeRoundSession';
import { useScorecardStore } from '@/store/scorecardStore';
import { cancelPendingScorecardSync } from '@/store/scorecardSyncDebounce';
import { useToast } from '@/context/ToastContext';
import { syncLogger } from '@/utils/debugLogger';

const EXIT_MESSAGES = {
  exit_removed: 'You were removed from this round',
  exit_deleted: 'This round was deleted',
  exit_unavailable: 'This round is no longer available',
} as const;

interface Args {
  roundId: string;
  enabled: boolean;
  isOnline: boolean;
  currentUserId: string | undefined;
  onExit: (message: string) => void;
}

export function useRoundRosterSync({ roundId, enabled, isOnline, currentUserId, onExit }: Args) {
  const { showToast } = useToast();
  const editSeq = useRef(0);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  const markLocalEdit = useCallback(() => {
    editSeq.current += 1;
  }, []);

  const exited = useRef(false);
  const inFlight = useRef<Promise<void> | null>(null);
  const rerun = useRef(false);

  const runOnce = useCallback(async () => {
    if (!enabled || !currentUserId || exited.current) return;
    const startedAt = editSeq.current;
    let snapshot;
    try {
      snapshot = await fetchRoundRoster(roundId);
    } catch {
      return; // never act on a failed read
    }
    if (editSeq.current !== startedAt) return; // a local edit happened meanwhile

    const store = useScorecardStore.getState();
    if (store.currentRoundId !== roundId) return;
    const decision = reconcileRoster(snapshot, store.currentPlayers, currentUserId);

    if (decision.kind === 'ignore') return;

    if (decision.kind !== 'apply') {
      // A null round is also what a lost session reads as under RLS: confirm identity first.
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.id !== currentUserId) return;
      } catch {
        return;
      }
      if (editSeq.current !== startedAt) return;
    }

    const stillValid = () =>
      !exited.current &&
      editSeq.current === startedAt &&
      useScorecardStore.getState().currentRoundId === roundId;

    if (decision.kind === 'apply') {
      if (!decision.added.length && !decision.removed.length) return;
      await withRoundScoringWrite(roundId, async () => {
        if (!stillValid()) return;
        for (const removed of decision.removed) {
          const card = useScorecardStore.getState().groupScorecards.get(removed.id);
          if (card) cancelPendingScorecardSync(card.id);
          await removePendingSyncByEntityKey(`scorecard:${roundId}:${removed.id}`);
          await useScorecardStore.getState().removePlayerFromRound(removed.id);
          showToast({ variant: 'info', title: `${removed.name} was removed from the round` });
        }
        if (decision.added.length) {
          await useScorecardStore.getState().ensureTeamMemberScorecards(decision.added);
        }
      });
      return;
    }

    let proceed = false;
    await withRoundScoringWrite(roundId, async () => {
      if (!stillValid()) return;
      proceed = true;
      exited.current = true;
      // Leaving must not depend on local cleanup succeeding.
      try {
        for (const card of useScorecardStore.getState().groupScorecards.values()) {
          cancelPendingScorecardSync(card.id);
        }
        await deleteScorecardsByRound(roundId);
        await deleteRoundIntents(roundId);
      } catch (error) {
        syncLogger.error('Round exit: local cleanup failed', error, { roundId });
      }
    });
    if (!proceed) return;
    await activeRoundSession.clear();
    useScorecardStore.getState().resetRound();
    onExitRef.current(EXIT_MESSAGES[decision.kind]);
  }, [enabled, currentUserId, roundId, showToast]);

  const refresh = useCallback((): Promise<void> => {
    if (inFlight.current) {
      rerun.current = true;
      return inFlight.current;
    }
    const run = (async () => {
      try {
        do {
          rerun.current = false;
          await runOnce();
        } while (rerun.current && !exited.current);
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = run;
    return run;
  }, [runOnce]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  // Broadcast pings from the owner's device.
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(roundChannelName(roundId))
      .on('broadcast', { event: 'roster_changed' }, () => void refreshRef.current())
      .on('broadcast', { event: 'round_deleted' }, () => void refreshRef.current())
      .subscribe();
    const unregister = registerRoundChannel(roundId, channel);
    return () => {
      unregister();
      void supabase.removeChannel(channel);
    };
  }, [enabled, roundId]);

  // Uploads that lost access.
  useEffect(() => {
    if (!enabled) return;
    return onRoundAccessLost((lostRoundId) => {
      if (lostRoundId === roundId) void refreshRef.current();
    });
  }, [enabled, roundId]);

  // Open / focus while online.
  useFocusEffect(
    useCallback(() => {
      if (enabled && isOnline) void refreshRef.current();
    }, [enabled, isOnline])
  );

  return { refresh, markLocalEdit };
}
