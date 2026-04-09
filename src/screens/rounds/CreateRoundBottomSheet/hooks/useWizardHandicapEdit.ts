/**
 * useWizardHandicapEdit - Handles in-wizard handicap edits.
 *
 * Lets the current user tweak their own handicap (held as a local override)
 * or an owned placeholder partner's handicap (written back into the wizard's
 * `selectedPartners` state). Nothing persists to `players.handicap` until the
 * round is actually started — see `useStartNewRound` for the commit path.
 */

import { useCallback } from 'react';
import type { WizardData } from '../types';

interface UseWizardHandicapEditParams {
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
}

export function useWizardHandicapEdit({ setData }: UseWizardHandicapEditParams) {
  /** Update the current user's handicap override (null = use profile value). */
  const handleCurrentUserHandicapChange = useCallback(
    (value: number) => {
      setData((prev) => ({ ...prev, currentUserHandicapOverride: value }));
    },
    [setData]
  );

  /** Update a specific partner's in-wizard handicap. */
  const handlePartnerHandicapChange = useCallback(
    (partnerId: string, value: number) => {
      setData((prev) => ({
        ...prev,
        selectedPartners: prev.selectedPartners.map((p) =>
          p.id === partnerId ? { ...p, handicap: value } : p
        ),
      }));
    },
    [setData]
  );

  return {
    handleCurrentUserHandicapChange,
    handlePartnerHandicapChange,
  };
}
