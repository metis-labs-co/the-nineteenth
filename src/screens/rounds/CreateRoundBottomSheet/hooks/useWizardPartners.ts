/**
 * useWizardPartners - Handles partner search, selection, and removal in the wizard.
 *
 * Responsibilities:
 * - Friend search query management
 * - Toggle partner on/off (respecting MAX_PARTNERS limit)
 * - Remove partner by ID
 * - Check if a friend is currently selected
 * - Preset selection (advances to course step)
 */

import { useCallback } from 'react';
import type { Friend, GameType } from '@/types/database.types';
import type { WizardData } from '../types';
import { MAX_PARTNERS } from '../types';
import { ROUND_PRESETS, type RoundPresetId } from '@/constants/roundPresets';

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
  skipPartnerStep: _skipPartnerStep,
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
            selectedTee: prev.selectedTee ?? undefined,
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

  // Match type selection — update data only; step advancement is now owned
  // by handleSelectPreset. Kept for backward compat with any call sites that
  // set the match type without going through the preset catalog.
  const handleSelectMatchType = useCallback((matchType: GameType) => {
    setData((prev) => ({ ...prev, selectedMatchType: matchType }));
  }, [setData]);

  // Preset selection — resolves both the preset and its game_type, then
  // advances to the course step (or nineType if a course is already pre-filled).
  const handleSelectPreset = useCallback(
    (presetId: RoundPresetId) => {
      const preset = ROUND_PRESETS[presetId];
      setData((prev) => ({
        ...prev,
        selectedPresetId: presetId,
        selectedMatchType: preset.config.game_type,
      }));
      // Course may already be pre-filled (initialCourse / single-course home
      // club) — skip the course step in that case.
      setCurrentStep(data.selectedCourse ? 'nineType' : 'course');
    },
    [data.selectedCourse, setData, setCurrentStep]
  );

  return {
    setFriendSearchQuery,
    handleTogglePartner,
    handleRemovePartner,
    isPartnerSelected,
    handleSelectMatchType,
    handleSelectPreset,
  };
}
