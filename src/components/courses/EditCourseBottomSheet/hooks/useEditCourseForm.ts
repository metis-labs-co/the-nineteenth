/**
 * useEditCourseForm - Form state management for editing course metadata
 *
 * Handles local form state, validation, and dirty checking
 * for the EditCourseBottomSheet component.
 */

import { useState, useCallback, useMemo, useRef } from 'react';

export interface EditCourseFormState {
  name: string;
  description: string;
  slope_rating: string;
  course_rating: string;
}

export interface EditCourseValidationErrors {
  name?: string;
  slope_rating?: string;
  course_rating?: string;
}

interface UseEditCourseFormProps {
  course: {
    name: string;
    description: string | null;
    slope_rating: number | null;
    course_rating: number | null;
  };
}

interface UseEditCourseFormReturn {
  formState: EditCourseFormState;
  errors: EditCourseValidationErrors;
  isDirty: boolean;
  isValid: boolean;
  setField: (field: keyof EditCourseFormState, value: string) => void;
  reset: () => void;
}

function buildInitialState(course: UseEditCourseFormProps['course']): EditCourseFormState {
  return {
    name: course.name,
    description: course.description ?? '',
    slope_rating: course.slope_rating != null ? String(course.slope_rating) : '',
    course_rating: course.course_rating != null ? String(course.course_rating) : '',
  };
}

export function useEditCourseForm({ course }: UseEditCourseFormProps): UseEditCourseFormReturn {
  const [formState, setFormState] = useState<EditCourseFormState>(() => buildInitialState(course));
  const originalRef = useRef<EditCourseFormState>(buildInitialState(course));

  const errors = useMemo(() => {
    const errs: EditCourseValidationErrors = {};

    if (!formState.name.trim()) {
      errs.name = 'Name is required';
    }

    if (formState.slope_rating !== '') {
      const val = parseFloat(formState.slope_rating);
      if (isNaN(val) || val < 55 || val > 155) {
        errs.slope_rating = 'Slope must be 55–155';
      }
    }

    if (formState.course_rating !== '') {
      const val = parseFloat(formState.course_rating);
      if (isNaN(val) || val < 50 || val > 90) {
        errs.course_rating = 'Course rating must be 50.0–90.0';
      }
    }

    return errs;
  }, [formState]);

  const isDirty = useMemo(() => {
    const orig = originalRef.current;
    return (
      formState.name !== orig.name ||
      formState.description !== orig.description ||
      formState.slope_rating !== orig.slope_rating ||
      formState.course_rating !== orig.course_rating
    );
  }, [formState]);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const setField = useCallback((field: keyof EditCourseFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    const state = buildInitialState(course);
    setFormState(state);
    originalRef.current = { ...state };
  }, [course]);

  return { formState, errors, isDirty, isValid, setField, reset };
}
