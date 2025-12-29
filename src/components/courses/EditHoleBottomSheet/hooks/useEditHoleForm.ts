/**
 * useEditHoleForm - Form state management for editing hole data
 *
 * Handles local form state, validation, and dirty checking
 * for the EditHoleBottomSheet component.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import type { Hole } from '@/types/database/base';
import type { EditHoleFormState, ValidationErrors } from '../types';

interface UseEditHoleFormProps {
  /** The hole being edited */
  hole: Hole;
  /** All holes in the course (for SI uniqueness validation) */
  allHoles: Hole[];
}

interface UseEditHoleFormReturn {
  /** Current form state */
  formState: EditHoleFormState;
  /** Validation errors */
  errors: ValidationErrors;
  /** Whether form has been modified */
  isDirty: boolean;
  /** Whether form is valid for submission */
  isValid: boolean;
  /** Update par value */
  setPar: (par: 3 | 4 | 5) => void;
  /** Increment stroke index */
  incrementSI: () => void;
  /** Decrement stroke index */
  decrementSI: () => void;
  /** Update yardage for a specific tee */
  setYardage: (teeName: string, value: string) => void;
  /** Get the updated hole object */
  getUpdatedHole: () => Hole;
  /** Reset form to initial values */
  reset: () => void;
}

/**
 * Normalize yardage keys to lowercase for consistent comparison
 * This ensures keys like "Blue" match "blue" used in the form
 */
function normalizeYardages(
  yardages: Record<string, number> | undefined
): Record<string, number | undefined> {
  if (!yardages) return {};
  const normalized: Record<string, number | undefined> = {};
  for (const [key, value] of Object.entries(yardages)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

export function useEditHoleForm({
  hole,
  allHoles,
}: UseEditHoleFormProps): UseEditHoleFormReturn {
  // Initialize form state from hole (with normalized keys)
  const [formState, setFormState] = useState<EditHoleFormState>(() => ({
    par: hole.par,
    strokeIndex: hole.strokeIndex,
    yardages: normalizeYardages(hole.yardages),
  }));

  // Track the original values at the time of reset (for accurate isDirty check)
  const originalValuesRef = useRef<EditHoleFormState>({
    par: hole.par,
    strokeIndex: hole.strokeIndex,
    yardages: normalizeYardages(hole.yardages),
  });

  // Validate form state
  const errors = useMemo(() => {
    const validationErrors: ValidationErrors = {};

    // Par validation
    if (![3, 4, 5].includes(formState.par)) {
      validationErrors.par = 'Par must be 3, 4, or 5';
    }

    // Stroke index range validation
    if (formState.strokeIndex < 1 || formState.strokeIndex > 18) {
      validationErrors.strokeIndex = 'Stroke index must be 1-18';
    }

    // Stroke index uniqueness validation (exclude current hole)
    const duplicate = allHoles.find(
      (h) => h.number !== hole.number && h.strokeIndex === formState.strokeIndex
    );
    if (duplicate) {
      validationErrors.strokeIndex = `SI ${formState.strokeIndex} is used by Hole ${duplicate.number}`;
    }

    // Yardage validation (optional, but must be positive if provided)
    const yardageErrors: Record<string, string> = {};
    Object.entries(formState.yardages).forEach(([tee, value]) => {
      if (value !== undefined && value !== null && value <= 0) {
        yardageErrors[tee] = 'Yardage must be positive';
      }
    });
    if (Object.keys(yardageErrors).length > 0) {
      validationErrors.yardages = yardageErrors;
    }

    return validationErrors;
  }, [formState, allHoles, hole.number]);

  // Check if form is dirty (modified from original values at reset time)
  const isDirty = useMemo(() => {
    const original = originalValuesRef.current;

    if (formState.par !== original.par) return true;
    if (formState.strokeIndex !== original.strokeIndex) return true;

    // Check yardages - compare actual values, handling undefined properly
    const originalYardages = original.yardages || {};
    const formYardages = formState.yardages || {};

    const allKeys = new Set([
      ...Object.keys(originalYardages),
      ...Object.keys(formYardages),
    ]);

    for (const key of allKeys) {
      const originalValue = originalYardages[key];
      const formValue = formYardages[key];

      // Treat undefined and missing key as equivalent
      const origIsEmpty = originalValue === undefined || originalValue === null;
      const formIsEmpty = formValue === undefined || formValue === null;

      if (origIsEmpty && formIsEmpty) continue;
      if (origIsEmpty !== formIsEmpty) return true;
      if (originalValue !== formValue) return true;
    }

    return false;
  }, [formState]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Update par
  const setPar = useCallback((par: 3 | 4 | 5) => {
    setFormState((prev) => ({ ...prev, par }));
  }, []);

  // Increment stroke index
  const incrementSI = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      strokeIndex: Math.min(18, prev.strokeIndex + 1),
    }));
  }, []);

  // Decrement stroke index
  const decrementSI = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      strokeIndex: Math.max(1, prev.strokeIndex - 1),
    }));
  }, []);

  // Update yardage for a specific tee
  const setYardage = useCallback((teeName: string, value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    setFormState((prev) => ({
      ...prev,
      yardages: {
        ...prev.yardages,
        ...(numValue !== undefined && !isNaN(numValue)
          ? { [teeName]: numValue }
          : { [teeName]: undefined }),
      },
    }));
  }, []);

  // Get the updated hole object
  const getUpdatedHole = useCallback((): Hole => {
    // Filter out undefined/empty yardages
    const cleanYardages: Record<string, number> = {};
    Object.entries(formState.yardages).forEach(([key, value]) => {
      if (value !== undefined && value !== null && !isNaN(value) && value > 0) {
        cleanYardages[key] = value;
      }
    });

    return {
      number: hole.number,
      par: formState.par,
      strokeIndex: formState.strokeIndex,
      yardages: Object.keys(cleanYardages).length > 0 ? cleanYardages : undefined,
    };
  }, [hole.number, formState]);

  // Reset form to initial values and update the original values ref
  const reset = useCallback(() => {
    const normalizedYardages = normalizeYardages(hole.yardages);
    const newState: EditHoleFormState = {
      par: hole.par,
      strokeIndex: hole.strokeIndex,
      yardages: normalizedYardages,
    };
    setFormState(newState);
    // Update the ref so isDirty compares against these new values
    originalValuesRef.current = { ...newState, yardages: { ...normalizedYardages } };
  }, [hole]);

  return {
    formState,
    errors,
    isDirty,
    isValid,
    setPar,
    incrementSI,
    decrementSI,
    setYardage,
    getUpdatedHole,
    reset,
  };
}
