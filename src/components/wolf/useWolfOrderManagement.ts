/**
 * useWolfOrderManagement - Custom hook for Wolf rotation order management
 *
 * Extracts wolf order state and manipulation logic:
 * - Order state initialization from config or participants
 * - Move up/down for reordering
 * - Fisher-Yates shuffle for randomization
 * - Participant name lookup
 * - Reset on visibility/config changes
 */

import { useState, useCallback, useEffect } from 'react';
// ============================================================================
// TYPES
// ============================================================================

/**
 * Participant info for Wolf order display
 */
export interface WolfOrderParticipant {
  id: string;
  name: string;
}

// ============================================================================
// HOOK
// ============================================================================

interface UseWolfOrderManagementOptions {
  /** Whether the parent sheet/modal is visible */
  visible: boolean;
  /** Initial wolf order from existing config */
  initialWolfOrder?: string[] | null;
  /** Available participants */
  participants: WolfOrderParticipant[];
}

export function useWolfOrderManagement({
  visible,
  initialWolfOrder,
  participants,
}: UseWolfOrderManagementOptions) {
  // Wolf order state
  const [wolfOrder, setWolfOrder] = useState<string[]>(() => {
    if (initialWolfOrder?.length) {
      return initialWolfOrder;
    }
    return participants.map((p) => p.id);
  });

  // Reset wolf order when sheet opens with new initial values
  useEffect(() => {
    if (visible) {
      setWolfOrder(
        initialWolfOrder?.length
          ? initialWolfOrder
          : participants.map((p) => p.id)
      );
    }
  }, [visible, initialWolfOrder, participants]);

  // Get participant name by ID
  const getParticipantName = useCallback(
    (id: string): string => {
      const participant = participants.find((p) => p.id === id);
      return participant?.name ?? 'Unknown';
    },
    [participants]
  );

  // Move participant up in wolf order
  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setWolfOrder((prev) => {
      const newOrder = [...prev];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      return newOrder;
    });
  }, []);

  // Move participant down in wolf order
  const moveDown = useCallback((index: number) => {
    setWolfOrder((prev) => {
      if (index >= prev.length - 1) return prev;
      const newOrder = [...prev];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      return newOrder;
    });
  }, []);

  // Shuffle wolf order randomly (Fisher-Yates)
  const shuffleOrder = useCallback(() => {
    setWolfOrder((prev) => {
      const newOrder = [...prev];
      for (let i = newOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
      }
      return newOrder;
    });
  }, []);

  return {
    wolfOrder,
    getParticipantName,
    moveUp,
    moveDown,
    shuffleOrder,
  };
}
