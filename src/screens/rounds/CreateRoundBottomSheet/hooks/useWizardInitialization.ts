/**
 * useWizardInitialization - Handles initial state setup when the wizard opens.
 *
 * Responsibilities:
 * - Pre-populate course from initialCourse or home club single course
 * - Pre-populate partners from initialPartners
 * - Pre-populate match type from initialMatchType
 * - Build currentUserAsPartner memo from auth state
 * - Provide resetState and startRoundWithCurrentState helpers
 */

import { useCallback, useEffect, useMemo } from 'react';
import type { TeeBox, GameType } from '@/types/database.types';
import type { BallCount } from '@/types/multiball.types';
import { useHomeClub } from '@/hooks/useHomeClub';
import { useAuth } from '@/hooks/useAuth';
import type {
  WizardStep,
  WizardData,
  SelectedCourse,
  PlayingPartner,
  ScoringPairsConfig,
  StandaloneSkinsConfig,
  StandaloneWolfConfig,
  TeamConfig,
  InitialCourse,
} from '../types';

interface UseWizardInitializationParams {
  visible: boolean;
  initialCourse?: InitialCourse;
  initialPartners?: PlayingPartner[];
  initialMatchType?: GameType;
  skipPartnerStep?: boolean;
  initialData: WizardData;
  setCurrentStep: React.Dispatch<React.SetStateAction<WizardStep>>;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
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
    handicapSource?: import('@/types/database').HandicapSource
  ) => void;
}

export function useWizardInitialization({
  visible,
  initialCourse,
  initialPartners,
  initialMatchType,
  skipPartnerStep,
  initialData,
  setCurrentStep,
  setData,
  onStartRound,
}: UseWizardInitializationParams) {
  const { data: homeClub } = useHomeClub();
  const { user, player } = useAuth();

  // Build current user as PlayingPartner for team generation
  const currentUserAsPartner = useMemo((): PlayingPartner | null => {
    if (player) {
      return {
        id: player.id,
        name: player.name || user?.email?.split('@')[0] || 'You',
        handicap: player.handicap ?? undefined,
        handicapIndex: player.handicap_index ?? undefined,
        gender: player.gender ?? undefined,
      };
    }
    if (user) {
      return {
        id: user.id,
        name: user.email?.split('@')[0] || 'You',
        handicap: undefined,
        handicapIndex: undefined,
        gender: undefined,
      };
    }
    return null;
  }, [player, user]);

  // Reset state helper
  const resetState = useCallback(() => {
    setData(initialData);
    setCurrentStep('course');
  }, [initialData, setCurrentStep, setData]);

  // Start round immediately with current state (used when partner step is skipped)
  const startRoundWithCurrentState = useCallback((
    course: SelectedCourse,
    tee: TeeBox | null,
    partners: PlayingPartner[],
    matchType: GameType | null,
  ) => {
    onStartRound(
      course.courseId,
      course.courseName,
      partners,
      tee ?? undefined,
      matchType ?? undefined,
    );
    resetState();
  }, [onStartRound, resetState]);

  // Handle initial course when sheet opens (priority: initialCourse > homeClub single course)
  useEffect(() => {
    if (visible) {
      let courseToUse: {
        courseId: string;
        courseName: string;
        club: SelectedCourse['club'];
        tees: TeeBox[] | null | undefined;
      } | null = null;

      if (initialCourse) {
        courseToUse = {
          courseId: initialCourse.courseId,
          courseName: initialCourse.courseName,
          club: initialCourse.club ?? initialCourse.venue,
          tees: initialCourse.tees,
        };
      } else if (homeClub && homeClub.courses && homeClub.courses.length === 1) {
        const singleCourse = homeClub.courses[0];
        courseToUse = {
          courseId: singleCourse.id,
          courseName: singleCourse.name,
          club: homeClub,
          tees: singleCourse.tees,
        };
      }

      if (courseToUse) {
        const courseData: SelectedCourse = {
          courseId: courseToUse.courseId,
          courseName: courseToUse.courseName,
          club: courseToUse.club,
          venue: courseToUse.club,
          tees: courseToUse.tees,
        };

        setData((prev) => ({
          ...prev,
          selectedCourse: courseData,
          // Auto-select default tee if available
          selectedTee: courseToUse.tees?.[0] ?? null,
        }));

        if (initialMatchType && skipPartnerStep) {
          // Skip everything - start round immediately (handled by course selection)
          setCurrentStep('nineType');
        } else {
          setCurrentStep('nineType');
        }
      }
    }
  }, [visible, initialCourse, homeClub, initialMatchType, skipPartnerStep, setCurrentStep, setData]);

  // Pre-populate partners when sheet opens
  useEffect(() => {
    if (visible && initialPartners && initialPartners.length > 0) {
      setData((prev) => ({
        ...prev,
        selectedPartners: initialPartners,
      }));
    }
  }, [visible, initialPartners, setData]);

  // Pre-populate match type when sheet opens
  useEffect(() => {
    if (visible && initialMatchType) {
      setData((prev) => ({
        ...prev,
        selectedMatchType: initialMatchType,
      }));
    }
  }, [visible, initialMatchType, setData]);

  return {
    currentUserAsPartner,
    resetState,
    startRoundWithCurrentState,
  };
}
