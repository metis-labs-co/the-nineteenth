/**
 * useRoundFinalization - Async functions for updating round status and finalizing results
 */

import { useCallback } from 'react';
import { refinalizeRoundResults } from '@/services/rounds/refinalizeRoundResults';
import { finalizeRoundStatus } from '@/services/rounds/finalizeRoundStatus';

export function useRoundFinalization() {
  // Completion logic lives in the shared finalizeRoundStatus service so the
  // Review-submit flow and the sub-match result/forfeit flow agree on exactly
  // when a round is done (see finalizeRoundStatus for the split vs non-split rules).
  const updateRoundStatus = useCallback(
    (roundId: string): Promise<void> => finalizeRoundStatus(roundId),
    []
  );

  const finalizeRoundResults = useCallback(
    (roundId: string): Promise<void> => refinalizeRoundResults(roundId),
    []
  );

  return { updateRoundStatus, finalizeRoundResults };
}
