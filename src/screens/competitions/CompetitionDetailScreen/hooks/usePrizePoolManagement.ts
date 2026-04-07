/**
 * usePrizePoolManagement
 *
 * Manages prize pool bottom sheet state and handlers.
 */

import { useCallback, useState } from 'react';

interface UsePrizePoolManagementParams {
  refetchPrizePool: () => void;
}

export function usePrizePoolManagement({ refetchPrizePool }: UsePrizePoolManagementParams) {
  const [showPrizePoolSheet, setShowPrizePoolSheet] = useState(false);

  const handleAddPrizePool = useCallback(() => {
    setShowPrizePoolSheet(true);
  }, []);

  const handleEditPrizePool = useCallback(() => {
    setShowPrizePoolSheet(true);
  }, []);

  const handlePrizePoolSuccess = useCallback(() => {
    refetchPrizePool();
  }, [refetchPrizePool]);

  const handleViewPrizePoolTransactions = useCallback(() => {
    // TODO: Navigate to prize pool transactions screen
  }, []);

  return {
    showPrizePoolSheet,
    setShowPrizePoolSheet,
    handleAddPrizePool,
    handleEditPrizePool,
    handlePrizePoolSuccess,
    handleViewPrizePoolTransactions,
  };
}
