/**
 * Settings Store Tests
 *
 * Tests the Zustand store for user settings including:
 * - Distance unit preferences
 * - Scoring entry toggles (putts, FIR, GIR)
 * - useStatsVisibilityWithTier hook for subscription-gated features
 */

import { renderHook, act } from '@testing-library/react-native';
import {
  useSettingsStore,
  useStatsVisibility,
  useStatsVisibilityWithTier,
  useFormattedDistance,
  useDebugMode,
} from '@/store/settingsStore';

// Mock SubscriptionContext's useIsPremium
const mockIsPremium = jest.fn();
jest.mock('@/context/SubscriptionContext', () => ({
  useIsPremium: () => mockIsPremium(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('SettingsStore', () => {
  // Reset store before each test
  beforeEach(() => {
    useSettingsStore.getState().resetToDefaults();
    jest.clearAllMocks();
    mockIsPremium.mockReturnValue(false);
  });

  // ==========================================================================
  // BASIC STORE FUNCTIONALITY
  // ==========================================================================

  describe('Distance Unit Settings', () => {
    it('defaults to metres for Australian market', () => {
      const store = useSettingsStore.getState();
      expect(store.distanceUnit).toBe('metres');
    });

    it('can be changed to yards', () => {
      const store = useSettingsStore.getState();
      store.setDistanceUnit('yards');
      expect(useSettingsStore.getState().distanceUnit).toBe('yards');
    });

    it('can be changed back to metres', () => {
      const store = useSettingsStore.getState();
      store.setDistanceUnit('yards');
      store.setDistanceUnit('metres');
      expect(useSettingsStore.getState().distanceUnit).toBe('metres');
    });
  });

  describe('Scoring Entry Toggles', () => {
    it('showPutts defaults to true', () => {
      expect(useSettingsStore.getState().showPutts).toBe(true);
    });

    it('showFairwayHit defaults to true', () => {
      expect(useSettingsStore.getState().showFairwayHit).toBe(true);
    });

    it('showGreenInRegulation defaults to true', () => {
      expect(useSettingsStore.getState().showGreenInRegulation).toBe(true);
    });

    it('can toggle showPutts', () => {
      const store = useSettingsStore.getState();
      store.setShowPutts(false);
      expect(useSettingsStore.getState().showPutts).toBe(false);
      store.setShowPutts(true);
      expect(useSettingsStore.getState().showPutts).toBe(true);
    });

    it('can toggle showFairwayHit', () => {
      const store = useSettingsStore.getState();
      store.setShowFairwayHit(false);
      expect(useSettingsStore.getState().showFairwayHit).toBe(false);
      store.setShowFairwayHit(true);
      expect(useSettingsStore.getState().showFairwayHit).toBe(true);
    });

    it('can toggle showGreenInRegulation', () => {
      const store = useSettingsStore.getState();
      store.setShowGreenInRegulation(false);
      expect(useSettingsStore.getState().showGreenInRegulation).toBe(false);
      store.setShowGreenInRegulation(true);
      expect(useSettingsStore.getState().showGreenInRegulation).toBe(true);
    });
  });

  describe('Debug Mode Settings', () => {
    it('debugModeEnabled defaults to false', () => {
      expect(useSettingsStore.getState().debugModeEnabled).toBe(false);
    });

    it('can toggle debug mode', () => {
      const store = useSettingsStore.getState();
      store.setDebugModeEnabled(true);
      expect(useSettingsStore.getState().debugModeEnabled).toBe(true);
      store.setDebugModeEnabled(false);
      expect(useSettingsStore.getState().debugModeEnabled).toBe(false);
    });
  });

  describe('Reset to Defaults', () => {
    it('resets all settings to default values', () => {
      const store = useSettingsStore.getState();

      // Change all settings
      store.setDistanceUnit('yards');
      store.setShowPutts(false);
      store.setShowFairwayHit(true);
      store.setShowGreenInRegulation(true);
      store.setDebugModeEnabled(true);

      // Reset
      store.resetToDefaults();

      // Verify defaults
      const newState = useSettingsStore.getState();
      expect(newState.distanceUnit).toBe('metres');
      expect(newState.showPutts).toBe(true);
      expect(newState.showFairwayHit).toBe(true);
      expect(newState.showGreenInRegulation).toBe(true);
      expect(newState.debugModeEnabled).toBe(false);
    });
  });

  // ==========================================================================
  // useFormattedDistance HOOK
  // ==========================================================================

  describe('useFormattedDistance', () => {
    it('formats distance in metres correctly', () => {
      useSettingsStore.getState().setDistanceUnit('metres');

      const { result } = renderHook(() => useFormattedDistance());

      expect(result.current.unit).toBe('metres');
      expect(result.current.unitLabel).toBe('m');
      expect(result.current.formatDistance(100)).toBe('91m');
    });

    it('formats distance in yards correctly', () => {
      useSettingsStore.getState().setDistanceUnit('yards');

      const { result } = renderHook(() => useFormattedDistance());

      expect(result.current.unit).toBe('yards');
      expect(result.current.unitLabel).toBe('yd');
      expect(result.current.formatDistance(100)).toBe('100yd');
    });
  });

  // ==========================================================================
  // useStatsVisibility HOOK
  // ==========================================================================

  describe('useStatsVisibility', () => {
    it('returns current visibility settings', () => {
      const store = useSettingsStore.getState();
      store.setShowPutts(true);
      store.setShowFairwayHit(true);
      store.setShowGreenInRegulation(false);

      const { result } = renderHook(() => useStatsVisibility());

      expect(result.current.showPutts).toBe(true);
      expect(result.current.showFairwayHit).toBe(true);
      expect(result.current.showGreenInRegulation).toBe(false);
    });

    it('updates when settings change', () => {
      const { result } = renderHook(() => useStatsVisibility());

      act(() => {
        useSettingsStore.getState().setShowPutts(false);
      });

      expect(result.current.showPutts).toBe(false);
    });
  });

  // ==========================================================================
  // useStatsVisibilityWithTier HOOK - FIR/GIR Premium Gating
  // ==========================================================================

  describe('useStatsVisibilityWithTier', () => {
    it('should return showPutts regardless of subscription tier', () => {
      mockIsPremium.mockReturnValue(false);
      useSettingsStore.getState().setShowPutts(true);

      const { result } = renderHook(() => useStatsVisibilityWithTier());

      expect(result.current.showPutts).toBe(true);
    });

    it('should return showFairwayHit=false for non-Premium users even if setting is true', () => {
      mockIsPremium.mockReturnValue(false);
      useSettingsStore.getState().setShowFairwayHit(true);

      const { result } = renderHook(() => useStatsVisibilityWithTier());

      expect(result.current.showFairwayHit).toBe(false);
    });

    it('should return showGreenInRegulation=false for non-Premium users even if setting is true', () => {
      mockIsPremium.mockReturnValue(false);
      useSettingsStore.getState().setShowGreenInRegulation(true);

      const { result } = renderHook(() => useStatsVisibilityWithTier());

      expect(result.current.showGreenInRegulation).toBe(false);
    });

    it('should return showFairwayHit=true for Premium users when setting is true', () => {
      mockIsPremium.mockReturnValue(true);
      useSettingsStore.getState().setShowFairwayHit(true);

      const { result } = renderHook(() => useStatsVisibilityWithTier());

      expect(result.current.showFairwayHit).toBe(true);
    });

    it('should return showGreenInRegulation=true for Premium users when setting is true', () => {
      mockIsPremium.mockReturnValue(true);
      useSettingsStore.getState().setShowGreenInRegulation(true);

      const { result } = renderHook(() => useStatsVisibilityWithTier());

      expect(result.current.showGreenInRegulation).toBe(true);
    });

    it('should return false for Premium users when settings are false', () => {
      mockIsPremium.mockReturnValue(true);
      useSettingsStore.getState().setShowFairwayHit(false);
      useSettingsStore.getState().setShowGreenInRegulation(false);

      const { result } = renderHook(() => useStatsVisibilityWithTier());

      expect(result.current.showFairwayHit).toBe(false);
      expect(result.current.showGreenInRegulation).toBe(false);
    });

    it('gracefully degrades FIR/GIR for free tier users', () => {
      mockIsPremium.mockReturnValue(false);

      // User has enabled both in settings
      useSettingsStore.getState().setShowFairwayHit(true);
      useSettingsStore.getState().setShowGreenInRegulation(true);

      const { result } = renderHook(() => useStatsVisibilityWithTier());

      // But they shouldn't see them because they're not premium
      expect(result.current.showFairwayHit).toBe(false);
      expect(result.current.showGreenInRegulation).toBe(false);
      // Putts should still work
      expect(result.current.showPutts).toBe(true);
    });
  });

  // ==========================================================================
  // useDebugMode HOOK
  // ==========================================================================

  describe('useDebugMode', () => {
    it('returns debug mode state', () => {
      const { result } = renderHook(() => useDebugMode());

      expect(result.current.debugModeEnabled).toBe(false);
    });

    it('can set debug mode', () => {
      const { result } = renderHook(() => useDebugMode());

      act(() => {
        result.current.setDebugModeEnabled(true);
      });

      expect(result.current.debugModeEnabled).toBe(true);
    });

    it('can toggle debug mode', () => {
      const { result } = renderHook(() => useDebugMode());

      act(() => {
        result.current.toggleDebugMode();
      });

      expect(result.current.debugModeEnabled).toBe(true);

      act(() => {
        result.current.toggleDebugMode();
      });

      expect(result.current.debugModeEnabled).toBe(false);
    });
  });
});
