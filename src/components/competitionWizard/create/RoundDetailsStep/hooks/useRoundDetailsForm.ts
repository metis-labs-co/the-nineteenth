/**
 * useRoundDetailsForm - Hook for managing round details form state
 *
 * Handles:
 * - Rounds array state
 * - Course selection modal state
 * - Match type modal state
 * - Tee selection modal state
 * - Validation
 * - Course tees storage
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { parse, isValid } from 'date-fns';
import type { TeeBox, Club } from '@/types/database.types';
import type { CourseWithFavoriteStatus, ClubCourseDisplayItem } from '@/hooks/useClubs';
import {
  useClubsWithCourses,
  useSearchClubs,
  useFavoriteCoursesWithClubs,
  toClubCourseDisplayItem,
  sortHomeClubFirst,
} from '@/hooks/useClubs';
import { useHomeClub } from '@/hooks/useHomeClub';
import {
  type RoundDetailsFormData,
  type GameType,
  type FavoriteCourseWithClub,
  createEmptyRound,
  getFilteredGameTypes,
  type GameTypeOption,
} from '../types';

interface UseRoundDetailsFormProps {
  initialData?: RoundDetailsFormData[];
  allowedGameTypes?: GameType[];
  maxRoundsPerCompetition?: number;
  /** Competition start date (DD/MM/YYYY format) - used as default date for new rounds */
  competitionStartDate?: string;
  onComplete: (data: RoundDetailsFormData[]) => void;
}

interface UseRoundDetailsFormReturn {
  // Rounds state
  rounds: RoundDetailsFormData[];
  errors: Record<number, Record<string, string>>;
  effectiveMaxRounds: number;
  canAddRound: boolean;

  // Course data
  displayItems: ClubCourseDisplayItem[];
  favoriteCourses: FavoriteCourseWithClub[];
  isLoadingCourses: boolean;
  isSearching: boolean;
  courseSearchQuery: string;
  courseTees: Record<string, TeeBox[]>;

  // Game types
  availableGameTypes: GameTypeOption[];

  // Modal states
  showCourseModal: boolean;
  showMatchTypeModal: boolean;
  showTeeModal: boolean;
  editingCourseRoundIndex: number | null;
  editingMatchTypeRoundIndex: number | null;
  editingTeeRoundIndex: number | null;

  // Round handlers
  updateRound: (index: number, updates: Partial<RoundDetailsFormData>) => void;
  addRound: () => void;
  removeRound: (index: number) => void;
  getAvailableTeesForRound: (round: RoundDetailsFormData) => TeeBox[];

  // Course modal handlers
  openCourseModal: (index: number) => void;
  handleCourseSelect: (course: CourseWithFavoriteStatus, club: Club) => void;
  handleCloseCourseModal: () => void;
  setCourseSearchQuery: (query: string) => void;

  // Match type modal handlers
  openMatchTypeModal: (index: number) => void;
  handleMatchTypeSelect: (matchType: GameType) => void;
  handleCloseMatchTypeModal: () => void;

  // Tee modal handlers
  openTeeModal: (index: number) => void;
  handleTeeSelect: (tee: TeeBox) => void;
  handleCloseTeeModal: () => void;

  // Form submission
  handleSubmit: () => void;
}

const parseAustralianDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parsed = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsed) ? parsed : null;
};

export function useRoundDetailsForm({
  initialData,
  allowedGameTypes,
  maxRoundsPerCompetition,
  competitionStartDate,
  onComplete,
}: UseRoundDetailsFormProps): UseRoundDetailsFormReturn {
  // Effective max rounds (default to 10 for unlimited)
  const effectiveMaxRounds =
    !maxRoundsPerCompetition || maxRoundsPerCompetition < 0 ? 10 : maxRoundsPerCompetition;

  // Filter game types based on allowed types
  const availableGameTypes = getFilteredGameTypes(allowedGameTypes);

  // Fetch home club for pre-fill
  const { data: homeClub } = useHomeClub();

  // Create initial round with home club's course if single-course club
  const createInitialRound = useCallback((): RoundDetailsFormData => {
    const emptyRound = createEmptyRound(competitionStartDate);
    // Only pre-fill if home club has exactly 1 course
    if (homeClub && homeClub.courses && homeClub.courses.length === 1) {
      const singleCourse = homeClub.courses[0];
      return {
        ...emptyRound,
        courseId: singleCourse.id,
        courseName: singleCourse.name,
      };
    }
    return emptyRound;
  }, [competitionStartDate, homeClub]);

  // Rounds state - use competition start date as default for initial empty round
  const [rounds, setRounds] = useState<RoundDetailsFormData[]>(
    initialData && initialData.length > 0 ? initialData : [createEmptyRound(competitionStartDate)]
  );

  // Pre-fill first empty round with home club's course (if single-course club) when it becomes available
  useEffect(() => {
    // Only pre-fill if home club has exactly 1 course
    if (homeClub && homeClub.courses && homeClub.courses.length === 1 && rounds.length === 1 && !rounds[0].courseId) {
      const singleCourse = homeClub.courses[0];
      setRounds([{
        ...rounds[0],
        courseId: singleCourse.id,
        courseName: singleCourse.name,
      }]);
      // Store tees if available
      if (singleCourse.tees && singleCourse.tees.length > 0) {
        setCourseTees((prev) => ({
          ...prev,
          [singleCourse.id]: singleCourse.tees as TeeBox[],
        }));
      }
    }
  }, [homeClub, rounds]);

  // Validation errors
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});

  // Course selection state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [editingCourseRoundIndex, setEditingCourseRoundIndex] = useState<number | null>(null);

  // Match type selection state
  const [showMatchTypeModal, setShowMatchTypeModal] = useState(false);
  const [editingMatchTypeRoundIndex, setEditingMatchTypeRoundIndex] = useState<number | null>(null);

  // Tee selection state
  const [showTeeModal, setShowTeeModal] = useState(false);
  const [editingTeeRoundIndex, setEditingTeeRoundIndex] = useState<number | null>(null);

  // Store available tees for each round (keyed by course ID)
  const [courseTees, setCourseTees] = useState<Record<string, TeeBox[]>>({});

  // Club/Course data hooks
  const { data: allClubs = [], isLoading: isLoadingCourses } = useClubsWithCourses();
  const { data: favoriteCourses = [] } = useFavoriteCoursesWithClubs();
  const { data: searchResults = [], isLoading: isSearching } = useSearchClubs(
    courseSearchQuery,
    undefined
  );

  // Transform clubs to display items, home club first
  const displayItems: ClubCourseDisplayItem[] = useMemo(() => {
    const clubs = courseSearchQuery.length >= 2 ? searchResults : allClubs;
    return sortHomeClubFirst((clubs ?? []).map(toClubCourseDisplayItem));
  }, [courseSearchQuery, searchResults, allClubs]);

  const canAddRound = rounds.length < effectiveMaxRounds;

  // =====================================================
  // ROUND HANDLERS
  // =====================================================

  const updateRound = useCallback((index: number, updates: Partial<RoundDetailsFormData>) => {
    setRounds((prev) => {
      const newRounds = [...prev];
      newRounds[index] = { ...newRounds[index], ...updates };
      return newRounds;
    });
    // Clear errors for updated fields
    setErrors((prev) => {
      if (!prev[index]) return prev;
      const fieldKeys = Object.keys(updates);
      const newErrors = { ...prev };
      fieldKeys.forEach((key) => {
        delete newErrors[index]?.[key];
      });
      return newErrors;
    });
  }, []);

  const addRound = useCallback(() => {
    if (rounds.length < effectiveMaxRounds) {
      setRounds((prev) => [...prev, createInitialRound()]);
    }
  }, [rounds.length, effectiveMaxRounds, createInitialRound]);

  const removeRound = useCallback((index: number) => {
    setRounds((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }, []);

  const getAvailableTeesForRound = useCallback(
    (round: RoundDetailsFormData): TeeBox[] => {
      if (!round.courseId) return [];
      return courseTees[round.courseId] || [];
    },
    [courseTees]
  );

  // =====================================================
  // COURSE MODAL HANDLERS
  // =====================================================

  const openCourseModal = useCallback((index: number) => {
    setEditingCourseRoundIndex(index);
    setShowCourseModal(true);
  }, []);

  const handleCourseSelect = useCallback(
    (course: CourseWithFavoriteStatus, club: Club) => {
      if (editingCourseRoundIndex !== null) {
        const displayName =
          course.name === club.name ? club.name : `${course.name} @ ${club.name}`;

        if (course.tees && course.tees.length > 0) {
          setCourseTees((prev) => ({
            ...prev,
            [course.id]: course.tees as TeeBox[],
          }));
        }

        updateRound(editingCourseRoundIndex, {
          courseId: course.id,
          courseName: displayName,
          selectedTee: undefined,
        });
      }
      setShowCourseModal(false);
      setCourseSearchQuery('');
      setEditingCourseRoundIndex(null);
    },
    [editingCourseRoundIndex, updateRound]
  );

  const handleCloseCourseModal = useCallback(() => {
    setShowCourseModal(false);
    setCourseSearchQuery('');
    setEditingCourseRoundIndex(null);
  }, []);

  // =====================================================
  // MATCH TYPE MODAL HANDLERS
  // =====================================================

  const openMatchTypeModal = useCallback((index: number) => {
    setEditingMatchTypeRoundIndex(index);
    setShowMatchTypeModal(true);
  }, []);

  const handleMatchTypeSelect = useCallback(
    (matchType: GameType) => {
      if (editingMatchTypeRoundIndex !== null) {
        updateRound(editingMatchTypeRoundIndex, { matchType });
      }
      setShowMatchTypeModal(false);
      setEditingMatchTypeRoundIndex(null);
    },
    [editingMatchTypeRoundIndex, updateRound]
  );

  const handleCloseMatchTypeModal = useCallback(() => {
    setShowMatchTypeModal(false);
    setEditingMatchTypeRoundIndex(null);
  }, []);

  // =====================================================
  // TEE MODAL HANDLERS
  // =====================================================

  const openTeeModal = useCallback((index: number) => {
    setEditingTeeRoundIndex(index);
    setShowTeeModal(true);
  }, []);

  const handleTeeSelect = useCallback(
    (tee: TeeBox) => {
      if (editingTeeRoundIndex !== null) {
        updateRound(editingTeeRoundIndex, {
          selectedTee: {
            name: tee.name,
            color: tee.color,
            totalYardage: tee.totalYardage ?? undefined,
            courseRating: tee.courseRating,
            slopeRating: tee.slopeRating,
          },
        });
      }
      setShowTeeModal(false);
      setEditingTeeRoundIndex(null);
    },
    [editingTeeRoundIndex, updateRound]
  );

  const handleCloseTeeModal = useCallback(() => {
    setShowTeeModal(false);
    setEditingTeeRoundIndex(null);
  }, []);

  // =====================================================
  // VALIDATION
  // =====================================================

  const validateRounds = useCallback((): boolean => {
    const newErrors: Record<number, Record<string, string>> = {};
    let allValid = true;

    rounds.forEach((round, index) => {
      const roundErrors: Record<string, string> = {};

      if (!round.courseId || !round.courseName) {
        roundErrors.course = 'Please select a course';
        allValid = false;
      }

      if (!round.date) {
        roundErrors.date = 'Please select a date';
        allValid = false;
      } else {
        const parsedDate = parseAustralianDate(round.date);
        if (!parsedDate) {
          roundErrors.date = 'Invalid date format';
          allValid = false;
        }
      }

      if (Object.keys(roundErrors).length > 0) {
        newErrors[index] = roundErrors;
      }
    });

    setErrors(newErrors);
    return allValid;
  }, [rounds]);

  const handleSubmit = useCallback(() => {
    if (validateRounds()) {
      onComplete(rounds);
    }
  }, [validateRounds, onComplete, rounds]);

  return {
    // Rounds state
    rounds,
    errors,
    effectiveMaxRounds,
    canAddRound,

    // Course data
    displayItems,
    favoriteCourses,
    isLoadingCourses,
    isSearching,
    courseSearchQuery,
    courseTees,

    // Game types
    availableGameTypes,

    // Modal states
    showCourseModal,
    showMatchTypeModal,
    showTeeModal,
    editingCourseRoundIndex,
    editingMatchTypeRoundIndex,
    editingTeeRoundIndex,

    // Round handlers
    updateRound,
    addRound,
    removeRound,
    getAvailableTeesForRound,

    // Course modal handlers
    openCourseModal,
    handleCourseSelect,
    handleCloseCourseModal,
    setCourseSearchQuery,

    // Match type modal handlers
    openMatchTypeModal,
    handleMatchTypeSelect,
    handleCloseMatchTypeModal,

    // Tee modal handlers
    openTeeModal,
    handleTeeSelect,
    handleCloseTeeModal,

    // Form submission
    handleSubmit,
  };
}
