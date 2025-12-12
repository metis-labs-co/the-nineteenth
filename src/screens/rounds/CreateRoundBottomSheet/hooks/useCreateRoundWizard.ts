/**
 * useCreateRoundWizard - State management for the create round wizard
 *
 * Manages:
 * - Current step
 * - Course/tee/match type selection
 * - Partner selection
 * - Scoring pairs configuration
 */

import { useState, useCallback, useEffect } from 'react';
import type { Friend, TeeBox, GameType } from '@/types/database.types';
import type { ScoringPairCreateInput } from '@/types';
import type { CourseWithFavoriteStatus } from '@/hooks/useVenues';
import type {
  WizardStep,
  WizardData,
  SelectedCourse,
  PlayingPartner,
  ScoringPairsConfig,
  InitialCourse,
} from '../types';
import { MAX_PARTNERS } from '../types';

interface UseCreateRoundWizardOptions {
  visible: boolean;
  initialCourse?: InitialCourse;
  onStartRound: (
    courseId: string,
    courseName: string,
    partners: PlayingPartner[],
    selectedTee?: TeeBox,
    gameType?: GameType,
    scoringPairs?: ScoringPairsConfig
  ) => void;
  onClose: () => void;
}

interface UseCreateRoundWizardReturn {
  // Current state
  currentStep: WizardStep;
  data: WizardData;

  // Course selection
  setSearchQuery: (query: string) => void;
  handleSelectCourse: (course: CourseWithFavoriteStatus, venue: SelectedCourse['venue']) => void;
  handleSelectFavoriteCourse: (course: CourseWithFavoriteStatus & { venue: SelectedCourse['venue'] }) => void;

  // Tee selection
  handleSelectTee: (tee: TeeBox) => void;
  handleSkipTeeSelection: () => void;

  // Match type selection
  handleSelectMatchType: (matchType: GameType) => void;

  // Partner selection
  setFriendSearchQuery: (query: string) => void;
  handleTogglePartner: (friend: Friend) => void;
  handleRemovePartner: (partnerId: string) => void;
  isPartnerSelected: (friendId: string) => boolean;

  // Scoring pairs
  setScoringPairsEnabled: (enabled: boolean) => void;
  handleScoringPairsChange: (pairs: ScoringPairCreateInput[], type: 'reciprocal' | 'circular') => void;

  // Navigation
  handleBackToCourse: () => void;
  handleBackToTee: () => void;
  handleBackToMatchType: () => void;
  handleBackToPartners: () => void;
  handleContinueToScoringSetup: () => void;

  // Actions
  handleStartScoring: () => void;
  handleClose: () => void;
}

const initialData: WizardData = {
  selectedCourse: null,
  selectedTee: null,
  selectedMatchType: null,
  selectedPartners: [],
  searchQuery: '',
  friendSearchQuery: '',
  scoringPairsEnabled: false,
  scoringPairs: [],
  scoringPairingType: 'reciprocal',
};

export function useCreateRoundWizard({
  visible,
  initialCourse,
  onStartRound,
  onClose,
}: UseCreateRoundWizardOptions): UseCreateRoundWizardReturn {
  const [currentStep, setCurrentStep] = useState<WizardStep>('course');
  const [data, setData] = useState<WizardData>(initialData);

  // Handle initial course when sheet opens
  useEffect(() => {
    if (visible && initialCourse) {
      const courseData: SelectedCourse = {
        courseId: initialCourse.courseId,
        courseName: initialCourse.courseName,
        venue: initialCourse.venue,
        tees: initialCourse.tees,
      };

      setData((prev) => ({
        ...prev,
        selectedCourse: courseData,
      }));

      // Go to tee selection if tees available, otherwise match type
      if (initialCourse.tees && initialCourse.tees.length > 0) {
        setCurrentStep('tee');
      } else {
        setCurrentStep('matchType');
      }
    }
  }, [visible, initialCourse]);

  // Reset state helper
  const resetState = useCallback(() => {
    setData(initialData);
    setCurrentStep('course');
  }, []);

  // Course selection handlers
  const setSearchQuery = useCallback((query: string) => {
    setData((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const handleSelectCourse = useCallback(
    (course: CourseWithFavoriteStatus, venue: SelectedCourse['venue']) => {
      const courseData: SelectedCourse = {
        courseId: course.id,
        courseName: course.name,
        venue,
        tees: course.tees,
      };

      setData((prev) => ({
        ...prev,
        selectedCourse: courseData,
        searchQuery: '',
      }));

      // If course has tees, go to tee selection; otherwise skip to match type
      if (course.tees && course.tees.length > 0) {
        setCurrentStep('tee');
      } else {
        setCurrentStep('matchType');
      }
    },
    []
  );

  const handleSelectFavoriteCourse = useCallback(
    (course: CourseWithFavoriteStatus & { venue: SelectedCourse['venue'] }) => {
      const courseData: SelectedCourse = {
        courseId: course.id,
        courseName: course.name,
        venue: course.venue,
        tees: course.tees,
      };

      setData((prev) => ({
        ...prev,
        selectedCourse: courseData,
        searchQuery: '',
      }));

      // If course has tees, go to tee selection; otherwise skip to match type
      if (course.tees && course.tees.length > 0) {
        setCurrentStep('tee');
      } else {
        setCurrentStep('matchType');
      }
    },
    []
  );

  // Tee selection handlers
  const handleSelectTee = useCallback((tee: TeeBox) => {
    setData((prev) => ({ ...prev, selectedTee: tee }));
    setCurrentStep('matchType');
  }, []);

  const handleSkipTeeSelection = useCallback(() => {
    setData((prev) => ({ ...prev, selectedTee: null }));
    setCurrentStep('matchType');
  }, []);

  // Match type selection
  const handleSelectMatchType = useCallback((matchType: GameType) => {
    setData((prev) => ({ ...prev, selectedMatchType: matchType }));
    setCurrentStep('partners');
  }, []);

  // Partner selection handlers
  const setFriendSearchQuery = useCallback((query: string) => {
    setData((prev) => ({ ...prev, friendSearchQuery: query }));
  }, []);

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
          },
        ],
      };
    });
  }, []);

  const handleRemovePartner = useCallback((partnerId: string) => {
    setData((prev) => ({
      ...prev,
      selectedPartners: prev.selectedPartners.filter((p) => p.id !== partnerId),
    }));
  }, []);

  const isPartnerSelected = useCallback(
    (friendId: string) => {
      return data.selectedPartners.some((p) => p.id === friendId);
    },
    [data.selectedPartners]
  );

  // Scoring pairs handlers
  const setScoringPairsEnabled = useCallback((enabled: boolean) => {
    setData((prev) => ({
      ...prev,
      scoringPairsEnabled: enabled,
      // Clear pairs when enabling so they get regenerated
      scoringPairs: enabled ? [] : prev.scoringPairs,
    }));
  }, []);

  const handleScoringPairsChange = useCallback(
    (pairs: ScoringPairCreateInput[], type: 'reciprocal' | 'circular') => {
      setData((prev) => ({
        ...prev,
        scoringPairs: pairs,
        scoringPairingType: type,
      }));
    },
    []
  );

  // Navigation handlers
  const handleBackToCourse = useCallback(() => {
    setCurrentStep('course');
    setData((prev) => ({
      ...prev,
      selectedTee: null,
      friendSearchQuery: '',
    }));
  }, []);

  const handleBackToTee = useCallback(() => {
    setCurrentStep('tee');
    setData((prev) => ({ ...prev, friendSearchQuery: '' }));
  }, []);

  const handleBackToMatchType = useCallback(() => {
    setCurrentStep('matchType');
    setData((prev) => ({ ...prev, friendSearchQuery: '' }));
  }, []);

  const handleBackToPartners = useCallback(() => {
    setCurrentStep('partners');
  }, []);

  const handleContinueToScoringSetup = useCallback(() => {
    setCurrentStep('scoringSetup');
  }, []);

  // Action handlers
  const handleStartScoring = useCallback(() => {
    if (data.selectedCourse) {
      // Build scoring pairs config if enabled
      const scoringPairsConfig: ScoringPairsConfig | undefined =
        data.scoringPairsEnabled && data.scoringPairs.length > 0
          ? {
              enabled: true,
              pairs: data.scoringPairs,
              pairingType: data.scoringPairingType,
            }
          : undefined;

      onStartRound(
        data.selectedCourse.courseId,
        data.selectedCourse.courseName,
        data.selectedPartners,
        data.selectedTee ?? undefined,
        data.selectedMatchType ?? undefined,
        scoringPairsConfig
      );

      resetState();
    }
  }, [data, onStartRound, resetState]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  return {
    currentStep,
    data,
    setSearchQuery,
    handleSelectCourse,
    handleSelectFavoriteCourse,
    handleSelectTee,
    handleSkipTeeSelection,
    handleSelectMatchType,
    setFriendSearchQuery,
    handleTogglePartner,
    handleRemovePartner,
    isPartnerSelected,
    setScoringPairsEnabled,
    handleScoringPairsChange,
    handleBackToCourse,
    handleBackToTee,
    handleBackToMatchType,
    handleBackToPartners,
    handleContinueToScoringSetup,
    handleStartScoring,
    handleClose,
  };
}
