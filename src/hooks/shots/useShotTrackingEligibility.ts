import { useMapTier } from '@/hooks/useMapTier';
import { useRoundPlayers } from '@/hooks/rounds';
import { useAuth } from '@/hooks/useAuth';

export type ShotTrackingIneligibilityReason =
  | 'not-premium'
  | 'multi-player'
  | 'not-current-user'
  | 'loading';

export interface ShotTrackingEligibility {
  eligible: boolean;
  reason?: ShotTrackingIneligibilityReason;
}

export function useShotTrackingEligibility(roundId: string): ShotTrackingEligibility {
  const tier = useMapTier();
  const { data: players, isLoading } = useRoundPlayers(roundId);
  const { player } = useAuth();

  if (tier !== 'premium') {
    return { eligible: false, reason: 'not-premium' };
  }

  if (isLoading || !players) {
    return { eligible: false, reason: 'loading' };
  }

  if (players.length > 1) {
    return { eligible: false, reason: 'multi-player' };
  }

  if (!player || players.length !== 1 || players[0].id !== player.id) {
    return { eligible: false, reason: 'not-current-user' };
  }

  return { eligible: true };
}
