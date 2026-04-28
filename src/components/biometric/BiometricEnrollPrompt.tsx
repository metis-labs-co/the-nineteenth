/**
 * BiometricEnrollPrompt - Wires useBiometricEnrollPrompt to BiometricEnrollSheet.
 *
 * Render this once near the top of the app tree (inside NavigationContainer);
 * it self-decides whether to appear after a fresh login.
 */

import React from 'react';
import { useBiometricEnrollPrompt } from '@/hooks/auth/useBiometricEnrollPrompt';
import { BiometricEnrollSheet } from './BiometricEnrollSheet';

export function BiometricEnrollPrompt() {
  const { shouldShow, biometricType, enable, dismiss } =
    useBiometricEnrollPrompt();

  return (
    <BiometricEnrollSheet
      visible={shouldShow}
      biometricType={biometricType}
      onEnable={enable}
      onDismiss={dismiss}
    />
  );
}

export default BiometricEnrollPrompt;
