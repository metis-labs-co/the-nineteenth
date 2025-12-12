/**
 * useBottomSheet - State management helper hook
 *
 * Provides a simple API for controlling bottom sheet visibility.
 * Useful when the parent component needs to control open/close state.
 */

import { useState, useCallback } from 'react';
import type { UseBottomSheetReturn } from '../types';

export function useBottomSheet(initialOpen = false): UseBottomSheetReturn {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
