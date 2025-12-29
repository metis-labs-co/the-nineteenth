/**
 * Hook for form validation logic in EditRoundScreen
 */

import { useMemo } from 'react';
import type { RoundFormData } from '../types';

interface ValidationError {
  field: keyof RoundFormData;
  message: string;
}

interface UseRoundValidationOptions {
  formData: RoundFormData;
}

interface UseRoundValidationReturn {
  errors: ValidationError[];
  isValid: boolean;
  getFieldError: (field: keyof RoundFormData) => string | undefined;
  validate: () => boolean;
}

/**
 * Validates round form data
 */
export function useRoundValidation({
  formData,
}: UseRoundValidationOptions): UseRoundValidationReturn {
  const errors = useMemo(() => {
    const validationErrors: ValidationError[] = [];

    // Date is required
    if (!formData.date) {
      validationErrors.push({
        field: 'date',
        message: 'Please select a date',
      });
    }

    // Game type is required (should always be set)
    if (!formData.gameType) {
      validationErrors.push({
        field: 'gameType',
        message: 'Please select a game format',
      });
    }

    return validationErrors;
  }, [formData]);

  const isValid = errors.length === 0;

  const getFieldError = (field: keyof RoundFormData): string | undefined => {
    return errors.find((e) => e.field === field)?.message;
  };

  const validate = (): boolean => {
    return isValid;
  };

  return {
    errors,
    isValid,
    getFieldError,
    validate,
  };
}
