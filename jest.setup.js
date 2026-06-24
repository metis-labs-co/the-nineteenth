/**
 * Jest Setup File
 *
 * This file runs before each test file. It configures:
 * - Global test timeout
 * - Console warning suppression for known React Native warnings
 * - Mocks for React Native modules that don't work in Node environment
 */

// ============================================================================
// GLOBAL CONFIGURATION
// ============================================================================

// Global test timeout (10 seconds)
jest.setTimeout(10000);

// ============================================================================
// CONSOLE OUTPUT SUPPRESSION
// ============================================================================

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

// Suppress verbose debug logs during tests
console.log = (...args) => {
  const message = typeof args[0] === 'string' ? args[0] : '';

  // Suppress auth hook debug logs and other verbose output
  const suppressedLogs = [
    '[useAuthSession]',
    '[useAuthUser]',
    '[useAuthMutations]',
    '[useAuth]',
    '[AuthProvider]',
  ];

  if (suppressedLogs.some((log) => message.includes(log))) {
    return;
  }

  originalLog.apply(console, args);
};

console.warn = (...args) => {
  const message = typeof args[0] === 'string' ? args[0] : '';

  // Suppress known warnings that don't affect test validity
  const suppressedWarnings = [
    'Animated',
    'componentWillReceiveProps',
    'componentWillMount',
    'act(...)',
    'ReactDOM.render is no longer supported',
    'Please update the following components',
  ];

  if (suppressedWarnings.some((warning) => message.includes(warning))) {
    return;
  }

  originalWarn.apply(console, args);
};

console.error = (...args) => {
  const message = typeof args[0] === 'string' ? args[0] : '';

  // Suppress certain React warnings and expected test errors
  const suppressedErrors = [
    'Warning: An update to',
    'Warning: Cannot update a component',
    'Warning: Each child in a list',
    'was not wrapped in act',
    // Expected auth error logs during error scenario tests
    'Login error:',
    'Signup error:',
    'Verify OTP error:',
    'Magic link error:',
    'Send OTP error:',
  ];

  if (suppressedErrors.some((error) => message.includes(error))) {
    return;
  }

  originalError.apply(console, args);
};

// ============================================================================
// REACT NATIVE REANIMATED MOCK
// ============================================================================

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');

  // The mock does not include call
  Reanimated.default.call = () => {};

  // Mock shared values
  Reanimated.useSharedValue = jest.fn((init) => ({ value: init }));
  Reanimated.useAnimatedStyle = jest.fn((fn) => fn());
  Reanimated.withTiming = jest.fn((value) => value);
  Reanimated.withSpring = jest.fn((value) => value);
  Reanimated.withDelay = jest.fn((_, animation) => animation);
  Reanimated.withSequence = jest.fn((...args) => args[args.length - 1]);
  Reanimated.runOnJS = jest.fn((fn) => fn);
  Reanimated.runOnUI = jest.fn((fn) => fn);

  return Reanimated;
});

// ============================================================================
// SAFE AREA CONTEXT MOCK
// ============================================================================

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const insets = { top: 47, right: 0, bottom: 34, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const metrics = { insets, frame };

  // Create a proper context with Provider and Consumer
  const SafeAreaContext = React.createContext(metrics);

  return {
    SafeAreaContext,
    SafeAreaProvider: ({ children, initialMetrics }) => {
      return React.createElement(
        SafeAreaContext.Provider,
        { value: initialMetrics || metrics },
        children
      );
    },
    SafeAreaView: ({ children, style }) => {
      const View = require('react-native').View;
      return React.createElement(View, { style }, children);
    },
    SafeAreaInsetsContext: SafeAreaContext,
    SafeAreaFrameContext: React.createContext(frame),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: metrics,
    withSafeAreaInsets: (Component) => Component,
  };
});

// ============================================================================
// REACT NAVIGATION MOCK
// ============================================================================

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');

  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      reset: jest.fn(),
      dispatch: jest.fn(),
      isFocused: jest.fn(() => true),
      canGoBack: jest.fn(() => true),
      addListener: jest.fn(() => () => {}),
    }),
    useRoute: () => ({
      key: 'test-key',
      name: 'TestScreen',
      params: {},
    }),
    useFocusEffect: jest.fn((callback) => {
      callback();
    }),
    useIsFocused: jest.fn(() => true),
    NavigationContainer: ({ children }) => children,
    createNavigationContainerRef: () => ({
      isReady: jest.fn(() => true),
      navigate: jest.fn(),
      dispatch: jest.fn(),
      reset: jest.fn(),
      goBack: jest.fn(),
      getCurrentRoute: jest.fn(() => ({ name: 'TestScreen', key: 'test-key' })),
      current: null,
    }),
  };
});

// ============================================================================
// GESTURE HANDLER MOCK
// ============================================================================

// Helper to create mock gesture handler components
const createGestureHandlerMocks = () => {
  const React = require('react');
  const View = require('react-native/Libraries/Components/View/View');
  const { TouchableOpacity } = require('react-native');

  // Mock Swipeable component that renders children and exposes close method via ref
  const Swipeable = React.forwardRef(({ children, testID }, ref) => {
    React.useImperativeHandle(ref, () => ({
      close: jest.fn(),
      openLeft: jest.fn(),
      openRight: jest.fn(),
    }));
    return React.createElement(View, { testID }, children);
  });

  // Mock RectButton as a TouchableOpacity for press handling
  const RectButton = ({ children, onPress, testID, style }) => {
    return React.createElement(TouchableOpacity, { onPress, testID, style }, children);
  };

  return { Swipeable, RectButton, View };
};

jest.mock('react-native-gesture-handler', () => {
  const { Swipeable, RectButton, View } = createGestureHandlerMocks();

  return {
    GestureHandlerRootView: View,
    PanGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler: View,
    FlingGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    Swipeable,
    DrawerLayout: View,
    ScrollView: View,
    FlatList: View,
    State: {},
    Directions: {},
    gestureHandlerRootHOC: (component) => component,
    NativeViewGestureHandler: View,
    RectButton,
    BaseButton: View,
    BorderlessButton: View,
  };
});

// Mock the Swipeable subpath import
jest.mock('react-native-gesture-handler/Swipeable', () => {
  const { Swipeable } = createGestureHandlerMocks();
  return Swipeable;
});

// ============================================================================
// ASYNC STORAGE MOCK
// ============================================================================

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// ============================================================================
// NETINFO MOCK
// ============================================================================

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: {},
  }),
  fetch: jest.fn(() =>
    Promise.resolve({
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
    })
  ),
  addEventListener: jest.fn(() => jest.fn()),
}));

// ============================================================================
// EXPO MODULES MOCKS
// ============================================================================

// Expo SQLite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      execAsync: jest.fn(() => Promise.resolve()),
      runAsync: jest.fn(() => Promise.resolve({ lastInsertRowId: 1, changes: 1 })),
      getFirstAsync: jest.fn(() => Promise.resolve(null)),
      getAllAsync: jest.fn(() => Promise.resolve([])),
      closeAsync: jest.fn(() => Promise.resolve()),
    })
  ),
  SQLiteDatabase: jest.fn(),
}));

// Expo Image Picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({ canceled: true, assets: null })
  ),
  launchCameraAsync: jest.fn(() =>
    Promise.resolve({ canceled: true, assets: null })
  ),
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true, status: 'granted' })
  ),
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true, status: 'granted' })
  ),
  MediaTypeOptions: { Images: 'Images' },
}));

// Expo Clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve(true)),
  getStringAsync: jest.fn(() => Promise.resolve('')),
  hasStringAsync: jest.fn(() => Promise.resolve(false)),
}));

// Expo Location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true, status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: { latitude: -37.8136, longitude: 144.9631, accuracy: 10 },
    })
  ),
  watchPositionAsync: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
}));

// ============================================================================
// SUPABASE CLIENT MOCK
// ============================================================================

jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
      then: jest.fn((resolve) => resolve({ data: [], error: null })),
    })),
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
      getUser: jest.fn(() =>
        Promise.resolve({ data: { user: null }, error: null })
      ),
      signIn: jest.fn(() =>
        Promise.resolve({ data: { session: null, user: null }, error: null })
      ),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/image.jpg' } })),
        remove: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    },
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

// ============================================================================
// REACT NATIVE PAPER ICON MOCK
// ============================================================================

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// ============================================================================
// REACT NATIVE PAPER MOCK
// ============================================================================

jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text: RNText, Image } = require('react-native');

  // Mock theme colors
  const mockThemeColors = {
    primary: '#6200ee',
    onPrimary: '#ffffff',
    secondary: '#03dac6',
    onSecondary: '#000000',
    background: '#ffffff',
    surface: '#ffffff',
    surfaceVariant: '#f5f5f5',
    onSurface: '#000000',
    error: '#b00020',
    onError: '#ffffff',
    elevation: {
      level0: 'transparent',
      level1: '#f5f5f5',
      level2: '#eeeeee',
      level3: '#e0e0e0',
      level4: '#d6d6d6',
      level5: '#cccccc',
    },
  };

  const mockTheme = {
    dark: false,
    roundness: 4,
    animation: { scale: 1 },
    colors: mockThemeColors,
    fonts: {},
    isV3: true,
  };

  const mockDarkTheme = {
    ...mockTheme,
    dark: true,
    colors: {
      ...mockThemeColors,
      primary: '#bb86fc',
      background: '#121212',
      surface: '#121212',
      onSurface: '#ffffff',
    },
  };

  // Avatar component mock
  const Avatar = {
    Image: ({ size, source, style, testID, ...props }) =>
      React.createElement(View, {
        testID: testID || 'avatar-image',
        style: [{ width: size, height: size, borderRadius: size / 2 }, style],
        ...props,
      }, source?.uri ? React.createElement(Image, { source, style: { width: size, height: size } }) : null),
    Text: ({ label, size, style, labelStyle, ...props }) =>
      React.createElement(View, {
        testID: 'avatar-text',
        style: [{ width: size, height: size, borderRadius: size / 2 }, style],
        ...props,
      }, React.createElement(RNText, { style: labelStyle }, label)),
    Icon: ({ icon, size, style, ...props }) =>
      React.createElement(View, {
        testID: `avatar-icon-${icon}`,
        style: [{ width: size, height: size, borderRadius: size / 2 }, style],
        ...props,
      }),
  };

  // TextInput with Icon sub-component
  const TextInputComponent = ({ label, value, onChangeText, placeholder, mode, style, left, right, outlineStyle, editable, ...props }) => {
    const { TextInput: RNTextInput } = require('react-native');
    // For editable inputs, use RNTextInput; for display-only, show value as Text
    return React.createElement(View, { style },
      left,
      editable === false
        ? React.createElement(RNText, null, value || placeholder)
        : React.createElement(RNTextInput, {
            value,
            onChangeText,
            placeholder,
            ...props
          }),
      right
    );
  };
  TextInputComponent.Icon = ({ icon, onPress, ...props }) =>
    React.createElement(View, { testID: `textinput-icon-${icon}`, onPress, ...props });

  // Chip component
  const Chip = ({ children, selected, onPress, style, textStyle, showSelectedCheck, ...props }) => {
    const { TouchableOpacity } = require('react-native');
    return React.createElement(
      TouchableOpacity,
      { onPress, style, ...props },
      React.createElement(RNText, { style: textStyle }, children)
    );
  };

  return {
    MD3LightTheme: mockTheme,
    MD3DarkTheme: mockDarkTheme,
    Provider: ({ children }) => children,
    PaperProvider: ({ children }) => children,
    Text: ({ children, style, variant, numberOfLines, ...props }) =>
      React.createElement(RNText, { style, numberOfLines, ...props }, children),
    TextInput: TextInputComponent,
    Button: ({ children, onPress, mode, style, loading, disabled, labelStyle, compact, ...props }) => {
      const { TouchableOpacity } = require('react-native');
      return React.createElement(
        TouchableOpacity,
        { ...props, onPress: disabled ? undefined : onPress, disabled },
        loading && React.createElement(View, { testID: 'button-loading-indicator' }),
        React.createElement(RNText, { style: labelStyle }, children)
      );
    },
    Chip,
    IconButton: ({ icon, onPress, ...props }) =>
      React.createElement(View, { testID: `icon-button-${icon}`, onPress, ...props }),
    Icon: ({ source, size, color }) =>
      React.createElement(View, { testID: `icon-${source}`, style: { width: size, height: size } }),
    ActivityIndicator: ({ animating, color, size, ...props }) =>
      React.createElement(View, { testID: 'activity-indicator', ...props }),
    Surface: ({ children, style, ...props }) =>
      React.createElement(View, { style, ...props }, children),
    Card: ({ children, style, ...props }) =>
      React.createElement(View, { style, ...props }, children),
    Divider: ({ style, ...props }) =>
      React.createElement(View, { style: [{ height: 1, backgroundColor: '#ccc' }, style], ...props }),
    Avatar,
    useTheme: () => mockTheme,
    withTheme: (Component) => (props) => React.createElement(Component, { ...props, theme: mockTheme }),
    configureFonts: jest.fn(() => ({})),
    Portal: ({ children }) => children,
  };
});

// ============================================================================
// DATE-TIME PICKER MOCK
// ============================================================================

jest.mock('@react-native-community/datetimepicker', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return View;
});

// ============================================================================
// THEME CONTEXT MOCK
// ============================================================================

jest.mock('@/context/ThemeContext', () => {
  const lightColors = {
    primary: '#2E7D32',
    primaryLight: '#60AD5E',
    primaryDark: '#1B5E20',
    primaryLighter: '#E8F5E9',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    textPrimary: '#1A1A1A',
    textSecondary: '#6B6B6B',
    textDisabled: '#9E9E9E',
    border: '#E0E0E0',
    borderLight: '#F0F0F0',
    error: '#D32F2F',
    errorLight: '#FFCDD2',
    errorDark: '#B71C1C',
    success: '#388E3C',
    successLight: '#C8E6C9',
    successDark: '#1B5E20',
    warning: '#F57C00',
    warningLight: '#FFE0B2',
    warningDark: '#E65100',
    info: '#1976D2',
    infoLight: '#BBDEFB',
    infoDark: '#0D47A1',
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#FAFAFA',
    gray100: '#F5F5F5',
    gray200: '#EEEEEE',
    gray300: '#E0E0E0',
    gray400: '#BDBDBD',
    gray500: '#9E9E9E',
    gray600: '#757575',
    gray700: '#616161',
    gray800: '#424242',
    gray900: '#212121',
    overlay: 'rgba(0, 0, 0, 0.5)',
    scrim: 'rgba(0, 0, 0, 0.32)',
    birdie: '#1976D2',
    par: '#388E3C',
    bogey: '#F57C00',
    doubleBogey: '#D32F2F',
    eagle: '#6A1B9A',
    eagleBackground: '#F3E5F5',
    birdieBackground: '#dbeafe',
    parBackground: '#dcfce7',
    bogeyBackground: '#fef3c7',
    doubleBogeyBackground: '#fee2e2',
    surfaceElevated: '#FFFFFF',
    textTertiary: '#9E9E9E',
    textOnColored: '#FFFFFF',
    textInverse: '#FFFFFF',
    accent: '#FF9800',
  };

  return {
    ThemeProvider: ({ children }) => children,
    useTheme: () => ({
      colors: lightColors,
      isDark: false,
      themeMode: 'light',
      setThemeMode: jest.fn(),
      toggleTheme: jest.fn(),
    }),
    useThemeColors: () => lightColors,
    useIsDark: () => false,
  };
});

// ============================================================================
// REVENUECAT MOCK
// ============================================================================

jest.mock('react-native-purchases', () => ({
  Purchases: {
    configure: jest.fn(),
    getCustomerInfo: jest.fn(() => Promise.resolve({
      entitlements: { active: {} },
      activeSubscriptions: [],
    })),
    getOfferings: jest.fn(() => Promise.resolve({ current: null, all: {} })),
    purchasePackage: jest.fn(() => Promise.resolve({ customerInfo: {} })),
    restorePurchases: jest.fn(() => Promise.resolve({ customerInfo: {} })),
    addCustomerInfoUpdateListener: jest.fn(() => jest.fn()),
    logIn: jest.fn(() => Promise.resolve({ customerInfo: {} })),
    logOut: jest.fn(() => Promise.resolve({ customerInfo: {} })),
    setEmail: jest.fn(),
    setDisplayName: jest.fn(),
    setAttributes: jest.fn(),
    isConfigured: jest.fn().mockReturnValue(true),
    isAnonymous: jest.fn().mockReturnValue(false),
  },
  LOG_LEVEL: { VERBOSE: 0, DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4 },
}));

// ============================================================================
// react-native-maps
// ============================================================================

jest.mock('react-native-maps', () => require('./__mocks__/react-native-maps'));

// ============================================================================
// TESTING LIBRARY MATCHERS
// ============================================================================

import '@testing-library/jest-native/extend-expect';

// ============================================================================
// CLEANUP AFTER EACH TEST
// ============================================================================

afterEach(() => {
  jest.clearAllMocks();
});
