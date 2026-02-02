/**
 * Competition Info Hook
 *
 * Fetches minimal competition information (name, organizer) for display
 * in headers and permission checks without loading full competition data.
 *
 * @example
 * ```tsx
 * function RoundHeader({ competitionId }: { competitionId: string }) {
 *   const { data: competitionInfo } = useCompetitionInfo(competitionId);
 *
 *   return (
 *     <Header
 *       title="Round 1"
 *       subtitle={competitionInfo?.name}
 *     />
 *   );
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { competitionKeys } from '@/hooks/queryKeys';

/**
 * Minimal competition info for display and permission checks
 */
export interface CompetitionInfo {
  /** Competition name */
  name: string;
  /** ID of the competition organizer */
  organizer_id: string;
}

/**
 * Options for useCompetitionInfo hook
 */
export interface UseCompetitionInfoOptions {
  /**
   * Whether the query is enabled (default: true when id is provided)
   */
  enabled?: boolean;

  /**
   * How long the data is considered fresh (default: 5 minutes)
   */
  staleTime?: number;
}

/**
 * Default stale time for competition info (5 minutes)
 */
const DEFAULT_STALE_TIME = 5 * 60 * 1000;

/**
 * Fetch minimal competition info for display in header and organizer check
 *
 * @param competitionId - The competition UUID
 * @param options - Query options
 * @returns React Query result with competition info
 *
 * @example
 * ```tsx
 * function ViewRoundScreen({ competitionId }: { competitionId: string }) {
 *   const { user } = useAuth();
 *   const { data: competitionInfo } = useCompetitionInfo(competitionId);
 *
 *   // Check if user is organizer
 *   const isOrganizer = competitionInfo?.organizer_id === user?.id;
 *
 *   return (
 *     <PageHeader
 *       title="Round 1"
 *       subtitle={competitionInfo?.name}
 *     />
 *   );
 * }
 * ```
 */
export function useCompetitionInfo(
  competitionId: string | undefined | null,
  options?: UseCompetitionInfoOptions
) {
  const { staleTime = DEFAULT_STALE_TIME, enabled } = options ?? {};

  return useQuery({
    queryKey: [...competitionKeys.detail(competitionId || ''), 'info'],
    queryFn: async (): Promise<CompetitionInfo | null> => {
      if (!competitionId) return null;

      const { data, error } = await supabase
        .from('competitions')
        .select('name, organizer_id')
        .eq('id', competitionId)
        .single();

      if (error) throw error;
      return data as CompetitionInfo | null;
    },
    enabled: enabled ?? !!competitionId,
    staleTime,
  });
}
