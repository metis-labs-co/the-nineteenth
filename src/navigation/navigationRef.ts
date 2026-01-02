/**
 * Navigation Ref - Root navigation reference for accessing navigation outside NavigationContainer
 *
 * This allows contexts and services that render outside the NavigationContainer
 * to still perform navigation actions.
 *
 * Usage:
 * - Pass `navigationRef` to NavigationContainer's `ref` prop
 * - Use `navigate()` or `navigationRef.current` to navigate from anywhere
 */

import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * Global navigation ref that can be used outside of React components
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navigate to a screen from outside a React component or NavigationContainer
 *
 * @param name - Screen name from RootStackParamList
 * @param params - Optional params for the screen
 */
export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    // Use type assertion to handle the complex overload signature
    (navigationRef.navigate as unknown as (name: RouteName, params?: RootStackParamList[RouteName]) => void)(name, params);
  } else {
    // Navigation not ready yet, queue the navigation
    console.warn('[navigationRef] Navigation not ready, queuing navigation to:', name);
    // Could implement a queue here if needed
  }
}

/**
 * Check if navigation is ready
 */
export function isNavigationReady(): boolean {
  return navigationRef.isReady();
}
