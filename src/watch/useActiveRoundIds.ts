/**
 * useActiveRoundIds — resolve the active round's course/competition ids.
 *
 * The watch bridge is mounted at the app root (App.tsx) where it only knows the
 * active `currentRoundId` from the scorecard store — not the course or
 * competition the round belongs to. Those ids are needed to populate the watch
 * snapshot's distance-to-green coordinates (course) and leaderboard
 * (competition). This focused query resolves them from the round record so the
 * bridge stays root-mounted and works for every scoring screen.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';

export interface ActiveRoundIds {
  /** Course the round is played on (used for green coordinates). */
  courseId: string | null;
  /** Competition the round belongs to, or null for a standalone round. */
  competitionId: string | null;
}

const EMPTY: ActiveRoundIds = { courseId: null, competitionId: null };

export function useActiveRoundIds(roundId: string | null | undefined): ActiveRoundIds {
  const { data } = useQuery({
    queryKey: ['watch', 'round-ids', roundId],
    enabled: !!roundId,
    // Round course/competition never change once started; cache aggressively.
    staleTime: Infinity,
    queryFn: async (): Promise<ActiveRoundIds> => {
      const { data, error } = await supabase
        .from('rounds')
        .select('course_id, competition_id')
        .eq('id', roundId as string)
        .single();
      if (error) throw error;
      return {
        courseId: (data?.course_id as string | null) ?? null,
        competitionId: (data?.competition_id as string | null) ?? null,
      };
    },
  });

  return data ?? EMPTY;
}
