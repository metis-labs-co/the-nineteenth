/**
 * SystemModalTheme - Pins surfaces to solid+none inside iOS system modals.
 *
 * iOS-rendered Modals (`presentationStyle="pageSheet"`/`fullScreen`, or any
 * `<Modal>` without `transparent`) render in their own UIWindow above the
 * React Native tree. The app-level photographic backdrop (rendered in
 * App.tsx) is therefore NOT visible behind them — instead the system's
 * default white shows.
 *
 * The translucent surface treatment in light + image-backdrop mode tints
 * white over the photograph for a frosted-glass look. Without the photo
 * underneath (i.e. inside a system modal), 55% white over white reads as
 * pure white and the cards disappear.
 *
 * Wrap modal content with this provider so the subtree resolves theme
 * colors as if the user had `surfaceStyle: 'solid'` and
 * `backdropStyle: 'none'` — preserving their light/dark preference but
 * giving the modal solid, legible surfaces.
 *
 * @example
 * ```tsx
 * <Modal presentationStyle="pageSheet" ...>
 *   <SystemModalTheme>
 *     <View>{...}</View>
 *   </SystemModalTheme>
 * </Modal>
 * ```
 */

import React, { ReactNode } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';

interface SystemModalThemeProps {
  children: ReactNode;
}

export function SystemModalTheme({ children }: SystemModalThemeProps) {
  return (
    <ThemeProvider forceSurfaceStyle="solid" forceBackdropStyle="none">
      {children}
    </ThemeProvider>
  );
}
