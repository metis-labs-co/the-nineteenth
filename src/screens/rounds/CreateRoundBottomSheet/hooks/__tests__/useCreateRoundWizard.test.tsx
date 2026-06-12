/**
 * useCreateRoundWizard — step-flow integration tests
 *
 * Covers the key branching behaviours of the format-first wizard:
 *   1. Fresh open → initial step 'gameFormat'
 *   2. handleSelectPreset → sets selectedPresetId / selectedMatchType + advances to 'course'
 *   3. handleSelectPreset when course already pre-filled → advances to 'nineType'
 *   4. initialCourse (no initialMatchType) → step stays on 'gameFormat', course pre-filled
 *   5. initialMatchType + initialCourse → step jumps to 'nineType', preset derived
 *   6. initialMatchType without course → step lands on 'course' (bug-fix case)
 *   7. handleSelectNineType (fresh flow) → advances to 'when' (not partners)
 *   8. handleSelectNineType (initialMatchType) → skips 'when', advances to 'partners'
 *   9. handlePlayNow → advances to 'partners', clears scheduled fields
 *  10. handleScheduleFor → advances to 'partners', sets scheduledDate + scheduledTeeTime
 *  11. handleClose (resetState) → returns to 'gameFormat', clears data
 */

import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateRoundWizard } from '../useCreateRoundWizard';
import type { InitialCourse } from '../../types';

// ============================================================================
// MODULE-LEVEL MOCKS
// ============================================================================

// useAuth — return a stable user/player so currentUserAsPartner is non-null
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    player: { id: 'player-1', name: 'Test Player', handicap: 10, handicap_index: 10.2, gender: 'male', home_club_id: null },
    isAuthenticated: true,
  }),
}));

// useHomeClub — no home club so it never auto-prefills a course
jest.mock('@/hooks/useHomeClub', () => ({
  useHomeClub: () => ({ data: null }),
}));

// subscriptionStore — treat user as non-social (free tier) to keep navigation simple
jest.mock('@/store/subscriptionStore', () => ({
  useIsSocial: () => false,
  useIsPremium: () => false,
  useIsSuperAdmin: () => false,
}));

// useRecentCourses — no recent courses, no-op addRecentCourse
jest.mock('@/hooks/courses', () => ({
  useRecentCourses: () => ({
    recentCourses: [],
    addRecentCourse: jest.fn(),
    clearRecentCourses: jest.fn(),
    isLoaded: true,
  }),
}));

// ============================================================================
// HELPERS
// ============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

/** Minimal InitialCourse stub satisfying the type */
const STUB_CLUB = {
  id: 'club-1',
  name: 'Test Club',
  city: 'Melbourne',
  state: 'VIC',
  country: 'Australia',
  latitude: -37.8,
  longitude: 144.9,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
} as InitialCourse['club'];

const STUB_INITIAL_COURSE: InitialCourse = {
  courseId: 'course-1',
  courseName: 'Test Course',
  club: STUB_CLUB,
  tees: [],
};

/** Base options shared by all render calls */
const BASE_OPTIONS = {
  visible: true,
  onStartRound: jest.fn(),
  onClose: jest.fn(),
};

// ============================================================================
// TESTS
// ============================================================================

describe('useCreateRoundWizard — step-flow', () => {
  // --------------------------------------------------------------------------
  // 1. Fresh open
  // --------------------------------------------------------------------------
  it('starts on gameFormat when opened without props', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateRoundWizard(BASE_OPTIONS), { wrapper });

    expect(result.current.currentStep).toBe('gameFormat');
    expect(result.current.data.selectedMatchType).toBeNull();
    expect(result.current.data.selectedCourse).toBeNull();
    expect(result.current.data.selectedPresetId).toBeNull();
  });

  // --------------------------------------------------------------------------
  // 2. handleSelectPreset without pre-filled course → advances to 'course'
  // --------------------------------------------------------------------------
  it('advances to course after handleSelectPreset when no course pre-filled', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateRoundWizard(BASE_OPTIONS), { wrapper });

    act(() => {
      result.current.handleSelectPreset('individual_stableford');
    });

    expect(result.current.currentStep).toBe('course');
    expect(result.current.data.selectedPresetId).toBe('individual_stableford');
    expect(result.current.data.selectedMatchType).toBe('stableford');
  });

  // --------------------------------------------------------------------------
  // 3. handleSelectPreset when course already set → skips to 'nineType'
  // --------------------------------------------------------------------------
  it('skips course step after handleSelectPreset when course already pre-filled', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useCreateRoundWizard({ ...BASE_OPTIONS, initialCourse: STUB_INITIAL_COURSE }),
      { wrapper }
    );

    // After mounting with initialCourse the course should be set in data.
    // We wait for the effect by checking data after the first render cycle.
    act(() => {
      result.current.handleSelectPreset('individual_stableford');
    });

    expect(result.current.currentStep).toBe('nineType');
    expect(result.current.data.selectedMatchType).toBe('stableford');
    expect(result.current.data.selectedPresetId).toBe('individual_stableford');
  });

  // --------------------------------------------------------------------------
  // 4. initialCourse only (no initialMatchType) → 'gameFormat', course pre-filled
  // --------------------------------------------------------------------------
  it('stays on gameFormat when only initialCourse is provided', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useCreateRoundWizard({ ...BASE_OPTIONS, initialCourse: STUB_INITIAL_COURSE }),
      { wrapper }
    );

    // Effect fires synchronously within renderHook's initial render in the
    // testing environment. Step should be 'gameFormat'.
    expect(result.current.currentStep).toBe('gameFormat');
    expect(result.current.data.selectedCourse?.courseId).toBe('course-1');
  });

  // --------------------------------------------------------------------------
  // 5. initialMatchType + initialCourse → jumps to 'nineType', preset derived
  // --------------------------------------------------------------------------
  it('jumps to nineType when both initialMatchType and initialCourse are provided', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useCreateRoundWizard({
          ...BASE_OPTIONS,
          initialCourse: STUB_INITIAL_COURSE,
          initialMatchType: 'stableford',
        }),
      { wrapper }
    );

    expect(result.current.currentStep).toBe('nineType');
    expect(result.current.data.selectedMatchType).toBe('stableford');
    expect(result.current.data.selectedPresetId).toBe('individual_stableford');
  });

  // --------------------------------------------------------------------------
  // 6. initialMatchType without initialCourse → lands on 'course' (bug-fix)
  // --------------------------------------------------------------------------
  it('lands on course (not gameFormat) when initialMatchType is set but no course', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useCreateRoundWizard({ ...BASE_OPTIONS, initialMatchType: 'stableford' }),
      { wrapper }
    );

    // Without a course, we must show the course step — not the locked format step.
    expect(result.current.currentStep).toBe('course');
    expect(result.current.data.selectedMatchType).toBe('stableford');
  });

  // --------------------------------------------------------------------------
  // 7. handleSelectNineType (fresh flow) → advances to 'when'
  // --------------------------------------------------------------------------
  it('advances to when after handleSelectNineType in a fresh flow', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useCreateRoundWizard({
          ...BASE_OPTIONS,
          initialCourse: STUB_INITIAL_COURSE,
          // No initialMatchType — normal path goes through 'when' step
        }),
      { wrapper }
    );

    // Select a preset to get to nineType
    act(() => {
      result.current.handleSelectPreset('individual_stableford');
    });
    expect(result.current.currentStep).toBe('nineType');

    act(() => {
      result.current.handleSelectNineType('full');
    });

    expect(result.current.currentStep).toBe('when');
    expect(result.current.data.nineType).toBe('full');
  });

  // --------------------------------------------------------------------------
  // 8. handleSelectNineType (initialMatchType) → skips 'when', goes to 'partners'
  // --------------------------------------------------------------------------
  it('skips when step and advances to partners after handleSelectNineType with initialMatchType', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useCreateRoundWizard({
          ...BASE_OPTIONS,
          initialCourse: STUB_INITIAL_COURSE,
          initialMatchType: 'stableford',
        }),
      { wrapper }
    );

    // Should be on nineType after mount (case 5).
    expect(result.current.currentStep).toBe('nineType');

    act(() => {
      result.current.handleSelectNineType('full');
    });

    expect(result.current.currentStep).toBe('partners');
    expect(result.current.data.nineType).toBe('full');
  });

  // --------------------------------------------------------------------------
  // 9. handlePlayNow → advances to 'partners', clears scheduled fields
  // --------------------------------------------------------------------------
  it('advances to partners with null scheduling on handlePlayNow', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useCreateRoundWizard({
          ...BASE_OPTIONS,
          initialCourse: STUB_INITIAL_COURSE,
        }),
      { wrapper }
    );

    // Navigate to the 'when' step
    act(() => result.current.handleSelectPreset('individual_stableford') );
    act(() => result.current.handleSelectNineType('full') );
    expect(result.current.currentStep).toBe('when');

    act(() => {
      result.current.handlePlayNow();
    });

    expect(result.current.currentStep).toBe('partners');
    expect(result.current.data.scheduledDate).toBeNull();
    expect(result.current.data.scheduledTeeTime).toBeNull();
  });

  // --------------------------------------------------------------------------
  // 10. handleScheduleFor → advances to 'partners', sets date + teeTime
  // --------------------------------------------------------------------------
  it('advances to partners with scheduled date/time on handleScheduleFor', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useCreateRoundWizard({
          ...BASE_OPTIONS,
          initialCourse: STUB_INITIAL_COURSE,
        }),
      { wrapper }
    );

    // Navigate to the 'when' step
    act(() => result.current.handleSelectPreset('individual_stableford') );
    act(() => result.current.handleSelectNineType('full') );
    expect(result.current.currentStep).toBe('when');

    act(() => {
      result.current.handleScheduleFor('2026-07-15', '08:00:00');
    });

    expect(result.current.currentStep).toBe('partners');
    expect(result.current.data.scheduledDate).toBe('2026-07-15');
    expect(result.current.data.scheduledTeeTime).toBe('08:00:00');
  });

  // --------------------------------------------------------------------------
  // 11. handleClose → resets to 'gameFormat' and clears data
  // --------------------------------------------------------------------------
  it('resets to gameFormat and clears data on handleClose', () => {
    const onClose = jest.fn();
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useCreateRoundWizard({ ...BASE_OPTIONS, onClose }),
      { wrapper }
    );

    // Move to a non-initial state first.
    act(() => {
      result.current.handleSelectPreset('individual_stroke');
    });
    expect(result.current.currentStep).toBe('course');
    expect(result.current.data.selectedMatchType).toBe('stroke');

    act(() => {
      result.current.handleClose();
    });

    expect(result.current.currentStep).toBe('gameFormat');
    expect(result.current.data.selectedMatchType).toBeNull();
    expect(result.current.data.selectedPresetId).toBeNull();
    expect(result.current.data.selectedCourse).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
