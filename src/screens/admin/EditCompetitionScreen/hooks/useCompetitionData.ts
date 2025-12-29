/**
 * Hook for fetching competition data
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import type { Competition } from '@/types/database.types';

/**
 * Fetch competition by ID
 */
async function fetchCompetition(competitionId: string): Promise<Competition> {
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch competition: ${error.message}`);
  }

  return data as Competition;
}

interface UseCompetitionDataOptions {
  competitionId: string;
}

interface UseCompetitionDataReturn {
  competition: Competition | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetches competition data for editing
 */
export function useCompetitionData({
  competitionId,
}: UseCompetitionDataOptions): UseCompetitionDataReturn {
  const {
    data: competition,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['competition', competitionId],
    queryFn: () => fetchCompetition(competitionId),
    enabled: !!competitionId,
  });

  return {
    competition,
    isLoading,
    error: error as Error | null,
  };
}
