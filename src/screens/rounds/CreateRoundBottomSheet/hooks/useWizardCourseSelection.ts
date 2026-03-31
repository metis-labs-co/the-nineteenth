/**
 * useWizardCourseSelection - Handles course search and selection in the wizard.
 *
 * Responsibilities:
 * - Search query state management
 * - Course selection (from search results and favorites)
 * - Step routing after course is selected (tee > matchType > partners)
 * - Auto-start round when both match type and partners are pre-set
 */

import { useCallback } from 'react';
import type { TeeBox, GameType } from '@/types/database.types';
import type { CourseWithFavoriteStatus } from '@/hooks/useClubs';
import type {
  WizardStep,
  WizardData,
  SelectedCourse,
  PlayingPartner,
} from '../types';

interface UseWizardCourseSelectionParams {
  initialMatchType?: GameType;
  initialPartners?: PlayingPartner[];
  skipPartnerStep?: boolean;
  setCurrentStep: React.Dispatch<React.SetStateAction<WizardStep>>;
  setData: React.Dispatch<React.SetStateAction<WizardData>>;
  startRoundWithCurrentState: (
    course: SelectedCourse,
    tee: TeeBox | null,
    partners: PlayingPartner[],
    matchType: GameType | null,
  ) => void;
}

export function useWizardCourseSelection({
  initialMatchType,
  initialPartners,
  skipPartnerStep,
  setCurrentStep,
  setData,
  startRoundWithCurrentState,
}: UseWizardCourseSelectionParams) {
  const setSearchQuery = useCallback((query: string) => {
    setData((prev) => ({ ...prev, searchQuery: query }));
  }, [setData]);

  const handleSelectCourse = useCallback(
    (course: CourseWithFavoriteStatus, club: SelectedCourse['club']) => {
      const courseData: SelectedCourse = {
        courseId: course.id,
        courseName: course.name,
        club,
        venue: club,
        tees: course.tees,
        holes: course.holes,
      };

      setData((prev) => ({
        ...prev,
        selectedCourse: courseData,
        searchQuery: '',
      }));

      // Auto-select default tee if available
      if (course.tees && course.tees.length > 0) {
        setData((prev) => ({ ...prev, selectedTee: course.tees![0] }));
      }

      // Auto-skip nineType for 9-hole courses (or fewer)
      const holeCount = course.holes?.length ?? 18;
      if (holeCount <= 9) {
        setData((prev) => ({ ...prev, nineType: 'front9' as import('@/types/database/enums').NineType }));
        if (initialMatchType && skipPartnerStep) {
          startRoundWithCurrentState(courseData, course.tees?.[0] ?? null, initialPartners ?? [], initialMatchType);
        } else {
          setCurrentStep(initialMatchType ? 'partners' : 'matchType');
        }
      } else if (initialMatchType && skipPartnerStep) {
        startRoundWithCurrentState(courseData, course.tees?.[0] ?? null, initialPartners ?? [], initialMatchType);
      } else {
        setData((prev) => ({ ...prev, nineType: 'full' as import('@/types/database/enums').NineType }));
        setCurrentStep('nineType');
      }
    },
    [initialMatchType, skipPartnerStep, initialPartners, startRoundWithCurrentState, setCurrentStep, setData]
  );

  const handleSelectFavoriteCourse = useCallback(
    (course: CourseWithFavoriteStatus & { club: SelectedCourse['club'] }) => {
      const courseData: SelectedCourse = {
        courseId: course.id,
        courseName: course.name,
        club: course.club,
        venue: course.club,
        tees: course.tees,
        holes: course.holes,
      };

      setData((prev) => ({
        ...prev,
        selectedCourse: courseData,
        searchQuery: '',
      }));

      // Auto-select default tee if available
      if (course.tees && course.tees.length > 0) {
        setData((prev) => ({ ...prev, selectedTee: course.tees![0] }));
      }

      // Auto-skip nineType for 9-hole courses (or fewer)
      const holeCount = course.holes?.length ?? 18;
      if (holeCount <= 9) {
        setData((prev) => ({ ...prev, nineType: 'front9' as import('@/types/database/enums').NineType }));
        if (initialMatchType && skipPartnerStep) {
          startRoundWithCurrentState(courseData, course.tees?.[0] ?? null, initialPartners ?? [], initialMatchType);
        } else {
          setCurrentStep(initialMatchType ? 'partners' : 'matchType');
        }
      } else if (initialMatchType && skipPartnerStep) {
        startRoundWithCurrentState(courseData, course.tees?.[0] ?? null, initialPartners ?? [], initialMatchType);
      } else {
        setData((prev) => ({ ...prev, nineType: 'full' as import('@/types/database/enums').NineType }));
        setCurrentStep('nineType');
      }
    },
    [initialMatchType, skipPartnerStep, initialPartners, startRoundWithCurrentState, setCurrentStep, setData]
  );

  return {
    setSearchQuery,
    handleSelectCourse,
    handleSelectFavoriteCourse,
  };
}
