/**
 * AIErrorState - Error state display for AI generation
 *
 * Shows error message and retry button
 */

import React from 'react';
import { ErrorState } from '@/components/common';

interface AIErrorStateProps {
  errorMessage: string;
  onRetry: () => void;
}

export function AIErrorState({ errorMessage, onRetry }: AIErrorStateProps) {
  return <ErrorState error={errorMessage} onRetry={onRetry} title="Generation Failed" />;
}
