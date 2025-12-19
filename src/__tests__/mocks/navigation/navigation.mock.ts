/**
 * React Navigation Mock
 *
 * Provides mock implementations of React Navigation hooks and utilities
 * for testing screens and components that use navigation.
 */

// ============================================================================
// MOCK NAVIGATION OBJECT
// ============================================================================

/**
 * Create a mock navigation object
 *
 * @example
 * const navigation = createMockNavigation();
 * render(<MyScreen navigation={navigation} route={createMockRoute()} />);
 * expect(navigation.navigate).toHaveBeenCalledWith('Details');
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
    getParent: jest.fn().mockReturnValue(null),
    getState: jest.fn().mockReturnValue({
      routes: [],
      index: 0,
      key: 'root',
      routeNames: [],
      type: 'stack',
      stale: false,
    }),
    addListener: jest.fn().mockReturnValue(() => {}),
    removeListener: jest.fn(),
    setParams: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
    pop: jest.fn(),
    popToTop: jest.fn(),
  };
}

// ============================================================================
// MOCK ROUTE OBJECT
// ============================================================================

/**
 * Create a mock route object
 *
 * @example
 * const route = createMockRoute({ competitionId: 'comp-1' });
 * render(<CompetitionDetail route={route} navigation={createMockNavigation()} />);
 */
export function createMockRoute<T extends object = object>(
  params: T = {} as T,
  options: { name?: string; key?: string } = {}
) {
  return {
    key: options.key || `test-route-${Date.now()}`,
    name: options.name || 'TestScreen',
    params,
    path: undefined,
  };
}

// ============================================================================
// JEST MOCK FACTORY
// ============================================================================

/**
 * Create jest.mock factory for @react-navigation/native
 *
 * @example
 * jest.mock('@react-navigation/native', () => createNavigationMock());
 */
export function createNavigationMock(options: {
  params?: object;
  isFocused?: boolean;
  canGoBack?: boolean;
} = {}) {
  const mockNavigation = createMockNavigation();
  const mockRoute = createMockRoute(options.params || {});

  if (options.isFocused !== undefined) {
    mockNavigation.isFocused.mockReturnValue(options.isFocused);
  }
  if (options.canGoBack !== undefined) {
    mockNavigation.canGoBack.mockReturnValue(options.canGoBack);
  }

  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => mockNavigation,
    useRoute: () => mockRoute,
    useFocusEffect: (callback: () => void | (() => void)) => {
      // Call the callback immediately in tests
      const cleanup = callback();
      // Return cleanup function if provided
      return cleanup;
    },
    useIsFocused: () => options.isFocused ?? true,
    NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
    createNavigationContainerRef: () => ({
      current: mockNavigation,
      isReady: () => true,
      getRootState: () => ({ routes: [], index: 0 }),
    }),
  };
}

// ============================================================================
// NAVIGATION STACK MOCK
// ============================================================================

/**
 * Create a mock for @react-navigation/native-stack
 */
export function createNativeStackMock() {
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }: { children: React.ReactNode }) => children,
      Screen: ({ children }: { children?: React.ReactNode }) => children || null,
      Group: ({ children }: { children: React.ReactNode }) => children,
    }),
  };
}

/**
 * Create a mock for @react-navigation/bottom-tabs
 */
export function createBottomTabsMock() {
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }: { children: React.ReactNode }) => children,
      Screen: ({ children }: { children?: React.ReactNode }) => children || null,
      Group: ({ children }: { children: React.ReactNode }) => children,
    }),
  };
}

// ============================================================================
// DEFAULT EXPORTS
// ============================================================================

export const defaultMockNavigation = createMockNavigation();
export const defaultMockRoute = createMockRoute();
