import { renderHook } from '@testing-library/react-native';
import { useShouldPromptBunker } from '@/hooks/shots/useShouldPromptBunker';
import { useShotLoggingUiStore } from '@/store/shotLoggingUiStore';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

// Mock the dependent hooks
const mockUseHoleHazards = jest.fn();
const mockUseHoleCoordinatesByHole = jest.fn();
jest.mock('@/hooks/hazards', () => ({
  useHoleHazards: (...args: unknown[]) => mockUseHoleHazards(...args),
}));
jest.mock('@/hooks/coordinates', () => ({
  useHoleCoordinatesByHole: (...args: unknown[]) => mockUseHoleCoordinatesByHole(...args),
}));

// Helper: build a ShotLogEntry with sane defaults
function shot(overrides: Partial<ShotLogEntry>): ShotLogEntry {
  return {
    id: 'shot-1',
    round_id: 'r1',
    hole_number: 7,
    player_id: 'p1',
    sequence: 1,
    latitude: -37.95,
    longitude: 144.95,
    club_used: null,
    shot_type: null,
    from_bunker: false,
    accuracy_meters: null,
    tee_override: null,
    created_at: new Date('2026-05-06T10:00:00Z').toISOString(),
    updated_at: new Date('2026-05-06T10:00:00Z').toISOString(),
    ...overrides,
  };
}

const greenCenter = { latitude: -37.95, longitude: 144.95 };

beforeEach(() => {
  mockUseHoleHazards.mockReset();
  mockUseHoleCoordinatesByHole.mockReset();
  // Default: no polygons, has green_center coord
  mockUseHoleHazards.mockReturnValue({ data: [], isLoading: false });
  mockUseHoleCoordinatesByHole.mockReturnValue({
    data: { green_center: { latitude: greenCenter.latitude, longitude: greenCenter.longitude } },
    isLoading: false,
  });
  useShotLoggingUiStore.setState((s) => ({ ...s, bunkerPromptCooldown: new Set() }));
});

describe('useShouldPromptBunker', () => {
  it('returns false when shot is null', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(null, shot({}), 'course-1', 7)
    );
    expect(result.current).toBe(false);
  });

  it('returns false when priorShot is null', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(shot({}), null, 'course-1', 7)
    );
    expect(result.current).toBe(false);
  });

  it('returns false when shot.from_bunker is already true', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        shot({ id: 'shot-2', sequence: 2, from_bunker: true }),
        shot({ id: 'shot-1', sequence: 1, latitude: -37.96, longitude: 144.96 }), // far
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns false when bunker polygons exist for the hole', () => {
    mockUseHoleHazards.mockReturnValue({
      data: [{ type: 'bunker', source: 'osm', externalId: null, polygon: [] }],
      isLoading: false,
    });
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        shot({ id: 'shot-2', sequence: 2 }), // on green center
        shot({ id: 'shot-1', sequence: 1, latitude: -37.96, longitude: 144.96 }), // far
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns false when useHoleHazards is loading', () => {
    mockUseHoleHazards.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        shot({ id: 'shot-2', sequence: 2 }),
        shot({ id: 'shot-1', sequence: 1, latitude: -37.96, longitude: 144.96 }),
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns false when no green_center available', () => {
    mockUseHoleCoordinatesByHole.mockReturnValue({ data: undefined, isLoading: false });
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        shot({ id: 'shot-2', sequence: 2 }),
        shot({ id: 'shot-1', sequence: 1, latitude: -37.96, longitude: 144.96 }),
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns false when shot is too far from green (>= 50m)', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        // Shot at (-37.951, 144.951): ~144m from green_center (-37.95, 144.95) → too far
        shot({ id: 'shot-2', sequence: 2, latitude: -37.951, longitude: 144.951 }),
        shot({ id: 'shot-1', sequence: 1, latitude: -37.96, longitude: 144.96 }),
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns false when prior shot was already near green (<= 50m)', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        // Shot on green center
        shot({ id: 'shot-2', sequence: 2 }),
        // Prior shot also on/near green (approx 22m away)
        shot({ id: 'shot-1', sequence: 1, latitude: -37.9502, longitude: 144.9502 }),
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns false when elapsed time > 5 minutes', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        shot({
          id: 'shot-2',
          sequence: 2,
          created_at: new Date('2026-05-06T10:10:00Z').toISOString(), // +10 min
        }),
        shot({
          id: 'shot-1',
          sequence: 1,
          latitude: -37.96,
          longitude: 144.96,
          created_at: new Date('2026-05-06T10:00:00Z').toISOString(),
        }),
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns false when (round,hole) is in cooldown', () => {
    useShotLoggingUiStore.setState((s) => ({
      ...s,
      bunkerPromptCooldown: new Set(['r1:7']),
    }));
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        shot({ id: 'shot-2', sequence: 2 }),
        shot({ id: 'shot-1', sequence: 1, latitude: -37.96, longitude: 144.96 }),
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns true when all conditions are met', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        // Shot on green center
        shot({ id: 'shot-2', sequence: 2 }),
        // Prior shot ~144m from green
        shot({ id: 'shot-1', sequence: 1, latitude: -37.96, longitude: 144.96 }),
        'course-1',
        7
      )
    );
    expect(result.current).toBe(true);
  });

  it('returns false when courseId is undefined', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        shot({ id: 'shot-2', sequence: 2 }),
        shot({ id: 'shot-1', sequence: 1, latitude: -37.96, longitude: 144.96 }),
        undefined,
        7
      )
    );
    expect(result.current).toBe(false);
  });

  it('returns false at the 5-minute gap boundary (strict <)', () => {
    const { result } = renderHook(() =>
      useShouldPromptBunker(
        shot({
          id: 'shot-2',
          sequence: 2,
          created_at: new Date('2026-05-06T10:05:00Z').toISOString(), // exactly +5 min
        }),
        shot({
          id: 'shot-1',
          sequence: 1,
          latitude: -37.96,
          longitude: 144.96,
          created_at: new Date('2026-05-06T10:00:00Z').toISOString(),
        }),
        'course-1',
        7
      )
    );
    expect(result.current).toBe(false);
  });
});
