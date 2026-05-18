/**
 * SystemModalTheme - Pins surfaces to solid+none inside iOS system modals.
 *
 * iOS-rendered modals render in their own UIWindow above the React Native
 * tree. This includes:
 *  - `<Modal presentationStyle="pageSheet">` / `"fullScreen"`
 *  - any `<Modal>` without `transparent`
 *  - React Navigation native-stack screens with `presentation: 'modal'`
 *    (and `'pageSheet'` / `'formSheet'` / `'fullScreenModal'`)
 *
 * The app-level photographic backdrop (rendered in App.tsx) is NOT visible
 * behind any of these — the system's default white shows instead.
 *
 * The translucent surface treatment composites surfaces over the photo for
 * a frosted-glass look, and `colors.background` is transparent in
 * image-backdrop mode so the photo shows through. Without the photo
 * underneath (i.e. inside a system modal) translucent surfaces wash to white
 * and a transparent background reveals the system white — making the modal
 * look unstyled regardless of the user's light/dark preference.
 *
 * Wrap modal content with this provider so the subtree resolves theme
 * colors as if the user had `surfaceStyle: 'solid'` and
 * `backdropStyle: 'none'` — preserving their light/dark preference but
 * giving the modal solid, legible surfaces.
 *
 * RULE: every screen presented as a system modal — and every sheet-like
 * footer/component rendered inside one — MUST be wrapped in
 * `SystemModalTheme`. This is the only way to guarantee a solid background
 * regardless of the user's appearance settings. See
 * `docs/guides/STYLING_GUIDE.md` ("Modals & Sheets — Solid Surfaces").
 *
 * ⚠️ CRITICAL: `useThemeColors()` MUST be called INSIDE the wrap, not
 * above it. `SystemModalTheme` works by rendering a new ThemeProvider, and
 * `useThemeColors()` reads from the nearest provider via React context.
 * If the component that owns `<SystemModalTheme>` also calls
 * `useThemeColors()`, those colors are captured against the OUTER provider
 * (translucent + image-backdrop) and the wrap has no effect — surfaces
 * still wash to white. The bug is silent: the file looks correct but the
 * surfaces are wrong.
 *
 * Always split into outer wrapper (no theme reads) + inner content (reads
 * colors). See the @example blocks below.
 *
 * @example RN <Modal> — outer/inner split
 * ```tsx
 * export function MySheet(props: Props) {
 *   // NO useThemeColors() here.
 *   return (
 *     <Modal presentationStyle="pageSheet" ...>
 *       <SystemModalTheme>
 *         <MySheetContent {...props} />
 *       </SystemModalTheme>
 *     </Modal>
 *   );
 * }
 *
 * function MySheetContent(props: ContentProps) {
 *   const colors = useThemeColors(); // ← inside the wrap, correct
 *   return <SafeAreaView style={{ backgroundColor: colors.background }}>...</SafeAreaView>;
 * }
 * ```
 *
 * @example React Navigation modal screen
 * ```tsx
 * // In RootNavigator: <Stack.Screen ... options={{ presentation: 'modal' }} />
 * export default function MyModalScreen(props: Props) {
 *   // NO useThemeColors() here.
 *   return (
 *     <SystemModalTheme>
 *       <MyModalScreenContent {...props} />
 *     </SystemModalTheme>
 *   );
 * }
 *
 * function MyModalScreenContent(props: Props) {
 *   const colors = useThemeColors(); // ← inside the wrap, correct
 *   ...
 * }
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
