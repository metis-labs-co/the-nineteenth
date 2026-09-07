/**
 * AgeCheckPrompt - wires useAgeCheckPrompt to AgeCheckSheet.
 *
 * Render once near the top of the app tree, alongside BiometricEnrollPrompt;
 * it self-decides whether to appear.
 */

import React from 'react';

import { useAgeCheckPrompt } from '@/hooks/useAgeCheckPrompt';
import { AgeCheckSheet } from './AgeCheckSheet';

export function AgeCheckPrompt() {
  const { shouldShow, dismiss, confirm } = useAgeCheckPrompt();

  return (
    <AgeCheckSheet visible={shouldShow} onConfirm={confirm} onDismiss={dismiss} />
  );
}

export default AgeCheckPrompt;
