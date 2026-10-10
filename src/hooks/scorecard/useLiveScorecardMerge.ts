/**
 * useLiveScorecardMerge — live per-hole merge for social rounds.
 *
 * Subscribes to scorecard changes for the round and merges each row into the
 * scorecard store (last edit wins per hole). A no-op outside social rounds.
 * Uses its own channel name so it coexists with useScorecardsRealtime.
 */
import { useEffect, useRef } from 'react';
import { storeLogger } from '@/utils/debugLogger';
import { supabase } from '@/services/supabase/client';
import { useScorecardStore } from '@/store/scorecardStore';
import type { RemoteScorecardRow } from '@/store/remoteScorecardMerge';

export function useLiveScorecardMerge(roundId: string | null | undefined): void {
  const isSocial = useScorecardStore((s) => s.scoringMode === 'social');
  const isReady = useScorecardStore(s => s.currentRoundId === roundId && !s.isLoading);
  // Score entry and Review are mounted at the same time; supabase-js reuses a
  // channel by name, so each mount needs its own name (and its own cleanup).
  const instanceId = useRef(Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    if (!roundId || !isSocial || !isReady) return;
    let active = true;
    const isCurrent = useScorecardStore.getState().captureRoundScoringOperation(roundId);
    const channel = supabase
      .channel(`scorecards-merge:round:${roundId}:${instanceId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase realtime generics don't infer from string literals.
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'scorecards', filter: `round_id=eq.${roundId}` },
        (payload: { new?: Partial<RemoteScorecardRow> }) => {
          if (!active || !isCurrent()) return;
          const row = payload.new;
          if (!row?.player_id || typeof row.revision !== 'number' || !row.status) return;
          // A payload without the scores column (e.g. a partial/TOAST-omitted
          // update) says nothing about holes; merging it could wipe a card.
          if (!('scores' in row)) return;
          void useScorecardStore.getState().mergeRemoteScorecard({
            round_id: roundId,
            player_id: row.player_id,
            scores: row.scores ?? null,
            revision: row.revision,
            status: row.status,
          }).catch(error => storeLogger.warn('Live scorecard merge could not be persisted', { roundId, error: String(error) }));
        },
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [roundId, isSocial, isReady, instanceId]);
}
