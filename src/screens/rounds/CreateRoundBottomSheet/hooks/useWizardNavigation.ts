/**
 * useWizardNavigation - Handles all back/continue/start/close navigation in the wizard.
 *
 * Responsibilities:
 * - Back navigation between steps (with match-type lock awareness)
 * - Continue to scoring setup (with solo round shortcut)
 * - Start scoring (group round) and start solo round actions
 * - Close and reset the wizard
 */

import { useCallback } from 'react';
import type { TeeBox, GameType } from '@/types/database.types';
import type { HandicapSource } from '@/types/database';
import type { NineType } from '@/types/database/enums';
import type { BallCount } from '@/types/multiball.types';
import type {
  WizardStep,
  WizardData,
  PlayingPartner,
  ScoringPairsConfig,
  StandaloneSkinsConfig,
  StandaloneWolfConfig,
  TeamConfig,
} from '../types';

interface UseWizardNavigationParams {
  data: WizardData;
  initialMatchType?: GameType;
  isSocialOrHigher: boolean;
  setCurrentStep: React.Dispatch<React.SetStateAction<WizardStep>>;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
  resetState: () => void;
  onStartRound: (
    courseId: string,
    courseName: string,
    partners: PlayingPartner[],
    selectedTee?: TeeBox,
    gameType?: GameType,
    scoringPairs?: ScoringPairsConfig,
    ballCount?: BallCount,
    skinsConfig?: StandaloneSkinsConfig,
    teamConfig?: TeamConfig,
    wolfConfig?: StandaloneWolfConfig,
    isBuildAsYouPlay?: boolean,
    handicapSource?: HandicapSource,
    nineType?: NineType,
    currentUserHandicapOverride?: number | null
  ) => void;
  onClose: () => void;
}

export function useWizardNavigation({
  data,
  initialMatchType,
  isSocialOrHigher,
  setCurrentStep,
  setData,
  resetState,
  onStartRound,
  onClose,
}: UseWizardNavigationParams) {
  const handleBackToCourse = useCallback(() => {
    setCurrentStep('course');
    setData((prev) => ({
      ...prev,
      selectedTee: null,
      friendSearchQuery: '',
    }));
  }, [setCurrentStep, setData]);

  const handleBackToNineType = useCallback(() => {
    setCurrentStep('nineType');
    setData((prev) => ({ ...prev, friendSearchQuery: '' }));
  }, [setCurrentStep, setData]);

  const handleBackToMatchType = useCallback(() => {
    if (initialMatchType) {
      // Match type is locked — go back to nineType (skipping the locked matchType step)
      setCurrentStep('nineType');
      setData((prev) => ({ ...prev, friendSearchQuery: '' }));
    } else {
      setCurrentStep('matchType');
      setData((prev) => ({ ...prev, friendSearchQuery: '' }));
    }
  }, [initialMatchType, setCurrentStep, setData]);

  const handleBackToPartners = useCallback(() => {
    setCurrentStep('partners');
  }, [setCurrentStep]);

  const handleContinueToScoringSetup = useCallback(() => {
    if (data.selectedPartners.length === 0) {
      // Solo round — go to yourSetup for tee + ball count selection
      if (isSocialOrHigher) {
        setCurrentStep('yourSetup');
      } else {
        // Free tier solo — check if there are tees to pick from
        const hasTees = data.selectedCourse?.tees && data.selectedCourse.tees.length > 0;
        if (hasTees) {
          // Show yourSetup step even for free tier when tees are available
          setCurrentStep('yourSetup');
        } else {
          // No tees and free tier — start round directly
          if (data.selectedCourse) {
            onStartRound(
              data.selectedCourse.courseId,
              data.selectedCourse.courseName,
              [],
              data.selectedTee ?? undefined,
              data.selectedMatchType ?? undefined,
              undefined,
              1,
              undefined,
              undefined,
              undefined,
              data.isBuildAsYouPlay || undefined,
              data.handicapSource,
              data.nineType,
              data.currentUserHandicapOverride
            );
            resetState();
          }
        }
      }
    } else {
      setCurrentStep('scoringSetup');
    }
  }, [data.selectedPartners.length, data.selectedCourse, data.selectedTee, data.selectedMatchType, data.isBuildAsYouPlay, data.handicapSource, data.nineType, data.currentUserHandicapOverride, onStartRound, resetState, isSocialOrHigher, setCurrentStep]);

  const handleStartSoloRound = useCallback(() => {
    if (data.selectedCourse) {
      onStartRound(
        data.selectedCourse.courseId,
        data.selectedCourse.courseName,
        [],
        data.selectedTee ?? undefined,
        data.selectedMatchType ?? undefined,
        undefined,
        data.ballCount,
        undefined,
        undefined,
        undefined,
        data.isBuildAsYouPlay || undefined,
        data.handicapSource,
        data.nineType,
        data.currentUserHandicapOverride
      );
      resetState();
    }
  }, [data.selectedCourse, data.selectedTee, data.selectedMatchType, data.ballCount, data.isBuildAsYouPlay, data.handicapSource, data.nineType, data.currentUserHandicapOverride, onStartRound, resetState]);

  const handleStartScoring = useCallback(() => {
    if (data.selectedCourse) {
      const scoringPairsConfig: ScoringPairsConfig | undefined =
        data.scoringPairsEnabled && data.scoringPairs.length > 0
          ? {
              enabled: true,
              pairs: data.scoringPairs,
              pairingType: data.scoringPairingType,
            }
          : undefined;

      const standaloneSkinsConfig: StandaloneSkinsConfig | undefined =
        data.skinsEnabled && data.skinsConfig
          ? {
              enabled: true,
              config: data.skinsConfig,
            }
          : undefined;

      const teamConfig: TeamConfig | undefined =
        data.teams.length > 0 && !data.teamsLocked
          ? {
              teams: data.teams.map((t) => ({
                id: t.id,
                name: t.name,
                memberIds: t.members.map((m) => m.id),
              })),
            }
          : undefined;

      const standaloneWolfConfig: StandaloneWolfConfig | undefined =
        data.wolfEnabled && data.wolfConfig
          ? {
              enabled: true,
              config: data.wolfConfig,
            }
          : undefined;

      onStartRound(
        data.selectedCourse.courseId,
        data.selectedCourse.courseName,
        data.selectedPartners,
        data.selectedTee ?? undefined,
        data.selectedMatchType ?? undefined,
        scoringPairsConfig,
        undefined,
        standaloneSkinsConfig,
        teamConfig,
        standaloneWolfConfig,
        data.isBuildAsYouPlay || undefined,
        data.handicapSource,
        data.nineType,
        data.currentUserHandicapOverride
      );

      resetState();
    }
  }, [data, onStartRound, resetState]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  return {
    handleBackToCourse,
    handleBackToNineType,
    handleBackToMatchType,
    handleBackToPartners,
    handleContinueToScoringSetup,
    handleStartSoloRound,
    handleStartScoring,
    handleClose,
  };
}
