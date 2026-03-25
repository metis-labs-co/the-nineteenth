/**
 * useWizardSideGames - Manages side-game configuration and ancillary scoring options.
 *
 * Responsibilities:
 * - Scoring pairs enable/disable and pair data
 * - Skins game enable/disable and config
 * - Wolf game enable/disable and config
 * - Build-as-you-play toggle
 * - Ball count selection (solo rounds)
 */

import { useCallback } from 'react';
import type { ScoringPairCreateInput, SkinsConfig } from '@/types';
import type { WolfConfig } from '@/types/database/wolf.types';
import type { HandicapSource } from '@/types/database';
import type { BallCount } from '@/types/multiball.types';
import type { WizardData } from '../types';

interface UseWizardSideGamesParams {
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
}

export function useWizardSideGames({
  setData,
}: UseWizardSideGamesParams) {
  // Scoring pairs handlers
  const setScoringPairsEnabled = useCallback((enabled: boolean) => {
    setData((prev) => ({
      ...prev,
      scoringPairsEnabled: enabled,
      scoringPairs: enabled ? [] : prev.scoringPairs,
    }));
  }, [setData]);

  const handleScoringPairsChange = useCallback(
    (pairs: ScoringPairCreateInput[], type: 'reciprocal' | 'circular') => {
      setData((prev) => ({
        ...prev,
        scoringPairs: pairs,
        scoringPairingType: type,
      }));
    },
    [setData]
  );

  // Skins game handlers
  const setSkinsEnabled = useCallback((enabled: boolean) => {
    setData((prev) => ({
      ...prev,
      skinsEnabled: enabled,
      skinsConfig: enabled ? prev.skinsConfig : null,
    }));
  }, [setData]);

  const handleSkinsConfigChange = useCallback((config: SkinsConfig) => {
    setData((prev) => ({
      ...prev,
      skinsConfig: config,
    }));
  }, [setData]);

  // Wolf game handlers
  const setWolfEnabled = useCallback((enabled: boolean) => {
    setData((prev) => ({
      ...prev,
      wolfEnabled: enabled,
      wolfConfig: enabled ? prev.wolfConfig : null,
    }));
  }, [setData]);

  const handleWolfConfigChange = useCallback((config: WolfConfig) => {
    setData((prev) => ({
      ...prev,
      wolfConfig: config,
    }));
  }, [setData]);

  // Build as you play
  const setBuildAsYouPlay = useCallback((enabled: boolean) => {
    setData((prev) => ({ ...prev, isBuildAsYouPlay: enabled }));
  }, [setData]);

  // Ball count (solo rounds only)
  const handleSelectBallCount = useCallback((ballCount: BallCount) => {
    setData((prev) => ({ ...prev, ballCount }));
  }, [setData]);

  // Handicap source (Premium feature)
  const setHandicapSource = useCallback((handicapSource: HandicapSource) => {
    setData((prev) => ({ ...prev, handicapSource }));
  }, [setData]);

  return {
    setScoringPairsEnabled,
    handleScoringPairsChange,
    setSkinsEnabled,
    handleSkinsConfigChange,
    setWolfEnabled,
    handleWolfConfigChange,
    setBuildAsYouPlay,
    handleSelectBallCount,
    setHandicapSource,
  };
}
