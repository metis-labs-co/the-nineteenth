/**
 * Custom render helpers for testing React Native components
 *
 * Provides a renderWithProviders function that wraps components with
 * all necessary providers and contexts.
 *
 * @example
 * import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
 *
 * it('renders correctly', () => {
 *   render(<MyComponent />);
 *   expect(screen.getByText('Hello')).toBeTruthy();
 * });
 *
 * // With options
 * render(<MyComponent />, { isDarkMode: true });
 */

import React, { ReactElement } from 'react';
import {
  render as rtlRender,
  RenderOptions,
  RenderResult,
} from '@testing-library/react-native';
import {
  TestProviders,
  TestProvidersOptions,
  createTestQueryClient,
} from '../setup/mockProviders';
import type { QueryClient } from '@tanstack/react-query';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomRenderOptions
  extends Omit<RenderOptions, 'wrapper'>,
    TestProvidersOptions {
  /**
   * Custom QueryClient for testing specific states
   */
  queryClient?: QueryClient;
}

// ============================================================================
// CUSTOM RENDER FUNCTION
// ============================================================================

/**
 * Custom render function that wraps components with test providers
 *
 * @param ui - The React element to render
 * @param options - Render options including provider configuration
 * @returns Render result with additional utilities
 */
function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { queryClient: QueryClient } {
  const {
    isDarkMode = false,
    queryClient = createTestQueryClient(),
    initialRoute,
    ...renderOptions
  } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders
      isDarkMode={isDarkMode}
      queryClient={queryClient}
      initialRoute={initialRoute}
    >
      {children}
    </TestProviders>
  );

  const renderResult = rtlRender(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  });

  return {
    ...renderResult,
    queryClient,
  };
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

// Re-export everything from React Testing Library
export * from '@testing-library/react-native';

// Export our custom render as the default render
export { renderWithProviders as render };

// Export for cases where you need the original render
export { rtlRender as originalRender };

// Export query client factory
export { createTestQueryClient };

// ============================================================================
// ADDITIONAL TEST UTILITIES
// ============================================================================

/**
 * Wait for async operations to complete
 * Useful when testing components that have useEffect hooks
 */
export async function waitForAsync(ms = 0): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Flush all pending promises
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

/**
 * Create a mock navigation object for testing screens
 */
export function createMockNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    reset: jest.fn(),
    dispatch: jest.fn(),
    isFocused: jest.fn().mockReturnValue(true),
    canGoBack: jest.fn().mockReturnValue(true),
    getParent: jest.fn(),
    getState: jest.fn().mockReturnValue({ routes: [], index: 0 }),
    addListener: jest.fn().mockReturnValue(() => {}),
    removeListener: jest.fn(),
  };
}

/**
 * Create a mock route object for testing screens
 */
export function createMockRoute<T extends object = object>(params: T = {} as T) {
  return {
    key: 'test-route-key',
    name: 'TestScreen',
    params,
  };
}
