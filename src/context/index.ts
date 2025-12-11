/**
 * Context Module
 *
 * Re-exports all context providers and hooks for app-wide state management.
 *
 * Usage:
 * ```tsx
 * import {
 *   ThemeProvider, useThemeColors, useIsDark,
 *   SubscriptionProvider, useSubscriptionContext, useTier,
 *   NotificationProvider, useNotificationContext,
 * } from '@/context';
 * ```
 */

// ============================================================================
// SUBSCRIPTION CONTEXT
// ============================================================================
// Provides subscription state and feature checks
export {
  SubscriptionProvider,
  useSubscriptionContext,
  useTier,
  useTierLimits,
  useIsPremium,
  useCheckFeature,
} from './SubscriptionContext';

// ============================================================================
// THEME CONTEXT
// ============================================================================
// Provides theme colors and dark mode state
export {
  ThemeProvider,
  useTheme,
  useThemeColors,
  useIsDark,
} from './ThemeContext';

// Re-export ColorPalette type for components that need to type color props
export type { ColorPalette } from './ThemeContext';

// ============================================================================
// NOTIFICATION CONTEXT
// ============================================================================
// Provides notification state and real-time subscription
export {
  NotificationProvider,
  useNotificationContext,
} from './NotificationContext';
