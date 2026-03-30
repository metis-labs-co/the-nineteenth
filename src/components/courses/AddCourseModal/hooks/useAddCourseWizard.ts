/**
 * useAddCourseWizard - Custom hook for managing AddCourseModal wizard state
 *
 * Handles:
 * - Multi-step navigation
 * - Form data for all steps
 * - Validation logic
 * - Submission to API
 */

import { useState, useCallback, useMemo } from 'react';
import { useCreateClubWithCourse } from '@/hooks/useClubs';
import type { Course, Club, Hole, TeeBox } from '@/types/database.types';
import type { RegionFilter } from '@/types/database.types';
import {
  type WizardState,
  type HoleFormData,
  type TeeFormData,
  type TeeColor,
  getDefaultWizardState,
  createDefaultHoles,
  generateId,
} from '../types';

interface UseAddCourseWizardProps {
  onClose: () => void;
  onClubCreated: (club: Club, course: Course) => void;
}

interface UseAddCourseWizardReturn {
  // State
  currentStep: number;
  wizardData: WizardState;
  isPending: boolean;

  // Validation
  isStep1Valid: boolean;
  isStep2Valid: boolean;
  isStep3Valid: boolean;
  canProceed: boolean;
  progress: number;
  duplicateSiValues: number[];

  // Navigation
  handleNext: () => void;
  handleBack: () => void;
  handleClose: () => void;

  // Step 1 handlers
  handleClubNameChange: (text: string) => void;
  handleCityChange: (text: string) => void;
  handleStateChange: (state: RegionFilter | null) => void;

  // Step 2 handlers
  handleCourseNameChange: (text: string) => void;
  handleNumHolesChange: (numHoles: 9 | 18) => void;
  handleAddTee: () => string;
  handleUpdateTee: (teeId: string, updates: Partial<TeeFormData>) => void;
  handleDeleteTee: (teeId: string) => void;

  // Step 3 handlers
  handleHoleChange: (holeIndex: number, updates: Partial<HoleFormData>) => void;
  handleHoleYardageChange: (holeIndex: number, teeId: string, yardage: string) => void;
  handleNextHole: () => void;
  handlePrevHole: () => void;
  handleJumpToHole: (index: number) => void;

  // Submission
  handleCreate: () => Promise<void>;
}

export function useAddCourseWizard({
  onClose,
  onClubCreated,
}: UseAddCourseWizardProps): UseAddCourseWizardReturn {
  const createClubWithCourse = useCreateClubWithCourse();

  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardState>(getDefaultWizardState);

  // =====================================================
  // VALIDATION
  // =====================================================

  const isStep1Valid = useMemo(() => {
    return wizardData.step1.clubName.trim().length >= 2;
  }, [wizardData.step1.clubName]);

  const isStep2Valid = useMemo(() => {
    const hasCourseName = wizardData.step2.courseName.trim().length >= 2;
    const hasAtLeastOneTee = wizardData.step2.tees.length > 0;
    const allTeesHaveNames = wizardData.step2.tees.every((t) => t.name.trim().length > 0);
    return hasCourseName && hasAtLeastOneTee && allTeesHaveNames;
  }, [wizardData.step2]);

  const numHoles = wizardData.step2.numHoles;

  const isStep3Valid = useMemo(() => {
    const holesSlice = wizardData.step3.holes.slice(0, numHoles);
    const allHolesComplete = holesSlice.every(
      (h) => h.par && h.strokeIndex >= 1 && h.strokeIndex <= numHoles
    );
    const siValues = holesSlice.map((h) => h.strokeIndex);
    const uniqueSiValues = new Set(siValues);
    const siUnique = uniqueSiValues.size === numHoles;
    return allHolesComplete && siUnique;
  }, [wizardData.step3.holes, numHoles]);

  const duplicateSiValues = useMemo(() => {
    const siCount: Record<number, number[]> = {};
    const holesSlice = wizardData.step3.holes.slice(0, numHoles);
    holesSlice.forEach((h) => {
      if (!siCount[h.strokeIndex]) {
        siCount[h.strokeIndex] = [];
      }
      siCount[h.strokeIndex].push(h.number);
    });
    return Object.entries(siCount)
      .filter(([_, holes]) => holes.length > 1)
      .map(([si]) => parseInt(si, 10));
  }, [wizardData.step3.holes, numHoles]);

  const progress = useMemo(() => {
    return (currentStep / 3) * 100;
  }, [currentStep]);

  const canProceed =
    (currentStep === 1 && isStep1Valid) ||
    (currentStep === 2 && isStep2Valid) ||
    (currentStep === 3 && isStep3Valid);

  // =====================================================
  // NAVIGATION HANDLERS
  // =====================================================

  const handleClose = useCallback(() => {
    setWizardData(getDefaultWizardState());
    setCurrentStep(1);
    onClose();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (currentStep < 3) {
      if (currentStep === 1 && !wizardData.step2.courseName) {
        setWizardData((prev) => ({
          ...prev,
          step2: {
            ...prev.step2,
            courseName: prev.step1.clubName,
          },
        }));
      }
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, wizardData.step2.courseName]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  // =====================================================
  // STEP 1 HANDLERS
  // =====================================================

  const handleClubNameChange = useCallback((text: string) => {
    setWizardData((prev) => ({
      ...prev,
      step1: { ...prev.step1, clubName: text },
    }));
  }, []);

  const handleCityChange = useCallback((text: string) => {
    setWizardData((prev) => ({
      ...prev,
      step1: { ...prev.step1, city: text },
    }));
  }, []);

  const handleStateChange = useCallback((state: RegionFilter | null) => {
    setWizardData((prev) => ({
      ...prev,
      step1: { ...prev.step1, state },
    }));
  }, []);

  // =====================================================
  // STEP 2 HANDLERS
  // =====================================================

  const handleCourseNameChange = useCallback((text: string) => {
    setWizardData((prev) => ({
      ...prev,
      step2: { ...prev.step2, courseName: text },
    }));
  }, []);

  const handleNumHolesChange = useCallback((newNumHoles: 9 | 18) => {
    setWizardData((prev) => ({
      ...prev,
      step2: { ...prev.step2, numHoles: newNumHoles },
      step3: {
        ...prev.step3,
        holes: createDefaultHoles(newNumHoles),
        currentHoleIndex: 0,
      },
    }));
  }, []);

  const handleAddTee = useCallback(() => {
    const newTee: TeeFormData = {
      id: generateId(),
      name: '',
      color: 'white' as TeeColor,
    };
    setWizardData((prev) => ({
      ...prev,
      step2: { ...prev.step2, tees: [...prev.step2.tees, newTee] },
    }));
    return newTee.id;
  }, []);

  const handleUpdateTee = useCallback((teeId: string, updates: Partial<TeeFormData>) => {
    setWizardData((prev) => ({
      ...prev,
      step2: {
        ...prev.step2,
        tees: prev.step2.tees.map((t) => (t.id === teeId ? { ...t, ...updates } : t)),
      },
    }));
  }, []);

  const handleDeleteTee = useCallback((teeId: string) => {
    setWizardData((prev) => ({
      ...prev,
      step2: {
        ...prev.step2,
        tees: prev.step2.tees.filter((t) => t.id !== teeId),
      },
      step3: {
        ...prev.step3,
        holes: prev.step3.holes.map((h) => {
          const { [teeId]: _, ...remainingYardages } = h.yardages;
          return { ...h, yardages: remainingYardages };
        }),
      },
    }));
  }, []);

  // =====================================================
  // STEP 3 HANDLERS
  // =====================================================

  const handleHoleChange = useCallback((holeIndex: number, updates: Partial<HoleFormData>) => {
    setWizardData((prev) => ({
      ...prev,
      step3: {
        ...prev.step3,
        holes: prev.step3.holes.map((h, i) => (i === holeIndex ? { ...h, ...updates } : h)),
      },
    }));
  }, []);

  const handleHoleYardageChange = useCallback(
    (holeIndex: number, teeId: string, yardage: string) => {
      const numericYardage = parseInt(yardage, 10) || 0;
      setWizardData((prev) => ({
        ...prev,
        step3: {
          ...prev.step3,
          holes: prev.step3.holes.map((h, i) =>
            i === holeIndex ? { ...h, yardages: { ...h.yardages, [teeId]: numericYardage } } : h
          ),
        },
      }));
    },
    []
  );

  const handleNextHole = useCallback(() => {
    setWizardData((prev) => ({
      ...prev,
      step3: {
        ...prev.step3,
        currentHoleIndex: Math.min(prev.step3.currentHoleIndex + 1, prev.step2.numHoles - 1),
      },
    }));
  }, []);

  const handlePrevHole = useCallback(() => {
    setWizardData((prev) => ({
      ...prev,
      step3: {
        ...prev.step3,
        currentHoleIndex: Math.max(prev.step3.currentHoleIndex - 1, 0),
      },
    }));
  }, []);

  const handleJumpToHole = useCallback((index: number) => {
    setWizardData((prev) => ({
      ...prev,
      step3: {
        ...prev.step3,
        currentHoleIndex: index,
      },
    }));
  }, []);

  // =====================================================
  // SUBMISSION
  // =====================================================

  const handleCreate = useCallback(async () => {
    if (!isStep1Valid || !isStep2Valid || !isStep3Valid) return;

    const effectiveNumHoles = wizardData.step2.numHoles;
    const holesSlice = wizardData.step3.holes.slice(0, effectiveNumHoles);

    try {
      const tees: TeeBox[] = wizardData.step2.tees.map((t) => {
        const totalYardage = holesSlice.reduce((sum, h) => {
          return sum + (h.yardages[t.id] || 0);
        }, 0);
        return {
          name: t.name,
          color: t.color,
          totalYardage,
        };
      });

      const holes: Hole[] = holesSlice.map((h) => {
        const yardages: Record<string, number> = {};
        wizardData.step2.tees.forEach((t) => {
          if (h.yardages[t.id]) {
            yardages[t.color] = h.yardages[t.id];
          }
        });
        return {
          number: h.number as Hole['number'],
          par: h.par,
          strokeIndex: h.strokeIndex,
          yardages,
        };
      });

      const { club, course } = await createClubWithCourse.mutateAsync({
        club: {
          name: wizardData.step1.clubName.trim(),
          city: wizardData.step1.city.trim() || null,
          state: wizardData.step1.state,
          total_holes: effectiveNumHoles,
        },
        course: {
          name: wizardData.step2.courseName.trim(),
          holes,
          tees,
          num_holes: effectiveNumHoles,
        },
      });

      onClubCreated(club, course);
      handleClose();
    } catch (error) {
      console.error('Failed to create club/course:', error);
    }
  }, [
    wizardData,
    isStep1Valid,
    isStep2Valid,
    isStep3Valid,
    createClubWithCourse,
    onClubCreated,
    handleClose,
  ]);

  return {
    // State
    currentStep,
    wizardData,
    isPending: createClubWithCourse.isPending,

    // Validation
    isStep1Valid,
    isStep2Valid,
    isStep3Valid,
    canProceed,
    progress,
    duplicateSiValues,

    // Navigation
    handleNext,
    handleBack,
    handleClose,

    // Step 1 handlers
    handleClubNameChange,
    handleCityChange,
    handleStateChange,

    // Step 2 handlers
    handleCourseNameChange,
    handleNumHolesChange,
    handleAddTee,
    handleUpdateTee,
    handleDeleteTee,

    // Step 3 handlers
    handleHoleChange,
    handleHoleYardageChange,
    handleNextHole,
    handlePrevHole,
    handleJumpToHole,

    // Submission
    handleCreate,
  };
}
