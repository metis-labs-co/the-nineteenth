/**
 * usePlayer - Hook for fetching a player's profile data
 *
 * Fetches player information by ID including:
 * - Name, email, phone
 * - Handicap
 * - Photo URL
 * - Golf ID
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { playerKeys } from './queryKeys';
import type { Player } from '@/types/database.types';

interface UsePlayerOptions {
  enabled?: boolean;
}

export function usePlayer(playerId: string | undefined, options: UsePlayerOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: playerKeys.detail(playerId ?? ''),
    queryFn: async (): Promise<Player> => {
      if (!playerId) {
        throw new Error('Player ID is required');
      }

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (error) {
        console.error('Error fetching player:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Player not found');
      }

      return data;
    },
    enabled: enabled && !!playerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export default usePlayer;
