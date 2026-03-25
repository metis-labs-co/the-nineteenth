/**
 * useWizardPartners - Handles partner search, selection, and removal in the wizard.
 *
 * Responsibilities:
 * - Friend search query management
 * - Toggle partner on/off (respecting MAX_PARTNERS limit)
 * - Remove partner by ID
 * - Check if a friend is currently selected
 */

import { useCallback } from 'react';
import type { Friend, GameType } from '@/types/database.types';
import type { WizardData } from '../types';
import { MAX_PARTNERS } from '../types';

interface UseWizardPartnersParams {
  data: WizardData;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<import('../types').WizardStep>>;
  skipPartnerStep?: boolean;
}

export function useWizardPartners({
  data,
  setData,
  setCurrentStep,
  skipPartnerStep,
}: UseWizardPartnersParams) {
  const setFriendSearchQuery = useCallback((query: string) => {
    setData((prev) => ({ ...prev, friendSearchQuery: query }));
  }, [setData]);

  const handleTogglePartner = useCallback((friend: Friend) => {
    setData((prev) => {
      const isSelected = prev.selectedPartners.some((p) => p.id === friend.id);

      if (isSelected) {
        return {
          ...prev,
          selectedPartners: prev.selectedPartners.filter((p) => p.id !== friend.id),
        };
      }

      if (prev.selectedPartners.length >= MAX_PARTNERS) {
        return prev;
      }

      return {
        ...prev,
        selectedPartners: [
          ...prev.selectedPartners,
          {
            id: friend.id,
            name: friend.name,
            handicap: friend.handicap ?? undefined,
            handicapIndex: friend.handicap_index ?? undefined,
            gender: friend.gender ?? undefined,
          },
        ],
      };
    });
  }, [setData]);

  const handleRemovePartner = useCallback((partnerId: string) => {
    setData((prev) => ({
      ...prev,
      selectedPartners: prev.selectedPartners.filter((p) => p.id !== partnerId),
    }));
  }, [setData]);

  const isPartnerSelected = useCallback(
    (friendId: string) => {
      return data.selectedPartners.some((p) => p.id === friendId);
    },
    [data.selectedPartners]
  );

  // Match type selection — update data and advance to partners step
  const handleSelectMatchType = useCallback((matchType: GameType) => {
    setData((prev) => ({ ...prev, selectedMatchType: matchType }));
    if (skipPartnerStep) {
      // Skip directly — the navigation hook handles starting the round
      return;
    }
    setCurrentStep('partners');
  }, [setData, setCurrentStep, skipPartnerStep]);

  return {
    setFriendSearchQuery,
    handleTogglePartner,
    handleRemovePartner,
    isPartnerSelected,
    handleSelectMatchType,
  };
}
