/**
 * useEditTeeForm - Form state management for editing tee data
 *
 * Handles local form state, validation, and dirty checking
 * for the EditTeeBottomSheet component.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import type { Tee } from '@/types/database.types';

export interface EditTeeFormState {
  name: string;
  color: string;
  slope: string;
  course_rating: string;
  slope_women: string;
  course_rating_women: string;
}

export interface EditTeeUpdates {
  name?: string;
  color?: string | null;
  slope?: number | null;
  course_rating?: number | null;
  slope_women?: number | null;
  course_rating_women?: number | null;
}

export interface EditTeeValidationErrors {
  name?: string;
  slope?: string;
  course_rating?: string;
  slope_women?: string;
  course_rating_women?: string;
}

interface UseEditTeeFormProps {
  tee: Tee;
}

interface UseEditTeeFormReturn {
  formState: EditTeeFormState;
  errors: EditTeeValidationErrors;
  isDirty: boolean;
  isValid: boolean;
  setField: (field: keyof EditTeeFormState, value: string) => void;
  getUpdates: () => EditTeeUpdates;
  reset: () => void;
}

function buildInitialState(tee: Tee): EditTeeFormState {
  return {
    name: tee.name,
    color: tee.color ?? '',
    slope: tee.slope != null ? String(tee.slope) : '',
    course_rating: tee.course_rating != null ? String(tee.course_rating) : '',
    slope_women: tee.slope_women != null ? String(tee.slope_women) : '',
    course_rating_women: tee.course_rating_women != null ? String(tee.course_rating_women) : '',
  };
}

function validateRating(value: string, label: string, min: number, max: number): string | undefined {
  if (value === '') return undefined;
  const val = parseFloat(value);
  if (isNaN(val) || val < min || val > max) {
    return `${label} must be ${min}–${max}`;
  }
  return undefined;
}

export function useEditTeeForm({ tee }: UseEditTeeFormProps): UseEditTeeFormReturn {
  const [formState, setFormState] = useState<EditTeeFormState>(() => buildInitialState(tee));
  const originalRef = useRef<EditTeeFormState>(buildInitialState(tee));

  const errors = useMemo(() => {
    const errs: EditTeeValidationErrors = {};

    if (!formState.name.trim()) {
      errs.name = 'Name is required';
    }

    const slopeErr = validateRating(formState.slope, 'Slope', 55, 155);
    if (slopeErr) errs.slope = slopeErr;

    const crErr = validateRating(formState.course_rating, 'Course rating', 50, 90);
    if (crErr) errs.course_rating = crErr;

    const slopeWErr = validateRating(formState.slope_women, 'Slope', 55, 155);
    if (slopeWErr) errs.slope_women = slopeWErr;

    const crWErr = validateRating(formState.course_rating_women, 'Course rating', 50, 90);
    if (crWErr) errs.course_rating_women = crWErr;

    return errs;
  }, [formState]);

  const isDirty = useMemo(() => {
    const orig = originalRef.current;
    return (
      formState.name !== orig.name ||
      formState.color !== orig.color ||
      formState.slope !== orig.slope ||
      formState.course_rating !== orig.course_rating ||
      formState.slope_women !== orig.slope_women ||
      formState.course_rating_women !== orig.course_rating_women
    );
  }, [formState]);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const setField = useCallback((field: keyof EditTeeFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const getUpdates = useCallback((): EditTeeUpdates => {
    return {
      name: formState.name.trim(),
      color: formState.color || null,
      slope: formState.slope !== '' ? parseInt(formState.slope, 10) : null,
      course_rating: formState.course_rating !== '' ? parseFloat(formState.course_rating) : null,
      slope_women: formState.slope_women !== '' ? parseInt(formState.slope_women, 10) : null,
      course_rating_women: formState.course_rating_women !== '' ? parseFloat(formState.course_rating_women) : null,
    };
  }, [formState]);

  const reset = useCallback(() => {
    const state = buildInitialState(tee);
    setFormState(state);
    originalRef.current = { ...state };
  }, [tee]);

  return { formState, errors, isDirty, isValid, setField, getUpdates, reset };
}
