import { computeShotDistances, pickTeeCoord, recomputeAfterMove } from '../shotDistances';
import type { HoleCoordinate } from '@/types/database/course.types';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

const makeShot = (
  sequence: number,
  latitude: number,
  longitude: number,
  overrides: Partial<ShotLogEntry> = {}
): ShotLogEntry => ({
  id: `shot-${sequence}`,
  round_id: 'round-1',
  hole_number: 1,
  player_id: 'player-1',
  sequence,
  latitude,
  longitude,
  club_used: null,
  shot_type: null,
  from_bunker: false,
  accuracy_meters: null,
  created_at: '2026-05-04T00:00:00Z',
  updated_at: '2026-05-04T00:00:00Z',
  ...overrides,
});

const makeCoord = (
  poi_type: HoleCoordinate['poi_type'],
  latitude: number,
  longitude: number
): HoleCoordinate => ({
  id: `coord-${poi_type}`,
  course_id: 'course-1',
  hole_number: 1,
  poi_type,
  latitude,
  longitude,
  side_of_fairway: null,
  created_at: '2026-05-04T00:00:00Z',
});

describe('pickTeeCoord', () => {
  it('prefers tee_back', () => {
    const coords = [
      makeCoord('tee_front', -37.8, 144.9),
      makeCoord('tee_back', -37.81, 144.91),
    ];
    expect(pickTeeCoord(coords)?.poi_type).toBe('tee_back');
  });

  it('falls back to tee_front when tee_back is missing', () => {
    const coords = [makeCoord('tee_front', -37.8, 144.9)];
    expect(pickTeeCoord(coords)?.poi_type).toBe('tee_front');
  });

  it('returns null when no tee coord exists', () => {
    expect(pickTeeCoord([makeCoord('green_center', -37.8, 144.9)])).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(pickTeeCoord([])).toBeNull();
  });
});

describe('computeShotDistances', () => {
  // Roughly ~111m per 0.001 degree latitude near Melbourne.
  const tee = makeCoord('tee_back', -37.8000, 144.9000);
  const shot1 = makeShot(1, -37.8010, 144.9000); // ~111m from tee
  const shot2 = makeShot(2, -37.8015, 144.9000); // ~55m from shot1
  const shot3 = makeShot(3, -37.8016, 144.9000); // ~11m from shot2

  it('uses tee coord for shot 1 and prior shot for subsequent shots', () => {
    const result = computeShotDistances([shot1, shot2, shot3], tee);
    expect(result).toHaveLength(3);
    // Shot 1: ~111m
    expect(result[0].distanceMeters).toBeGreaterThan(100);
    expect(result[0].distanceMeters).toBeLessThan(120);
    // Shot 2: ~55m
    expect(result[1].distanceMeters).toBeGreaterThan(50);
    expect(result[1].distanceMeters).toBeLessThan(60);
    // Shot 3: ~11m
    expect(result[2].distanceMeters).toBeGreaterThan(8);
    expect(result[2].distanceMeters).toBeLessThan(15);
  });

  it('returns null distance for shot 1 when tee coord is missing', () => {
    const result = computeShotDistances([shot1, shot2], null);
    expect(result[0].distanceMeters).toBeNull();
    // Shot 2 still computes from shot 1 → not null.
    expect(result[1].distanceMeters).not.toBeNull();
  });

  it('returns an empty array for empty input', () => {
    expect(computeShotDistances([], tee)).toEqual([]);
  });

  it('preserves all shot fields alongside the computed distance', () => {
    const result = computeShotDistances([shot1], tee);
    expect(result[0].id).toBe('shot-1');
    expect(result[0].sequence).toBe(1);
    expect(result[0].player_id).toBe('player-1');
    expect(typeof result[0].distanceMeters).toBe('number');
  });
});

describe('recomputeAfterMove', () => {
  // Same Melbourne fixture as above — ~111m per 0.001 degree latitude.
  const teeAnchor = { latitude: -37.8, longitude: 144.9 };
  const shot1 = makeShot(1, -37.8010, 144.9000); // ~111m from tee
  const shot2 = makeShot(2, -37.8015, 144.9000); // ~55m from shot1
  const shot3 = makeShot(3, -37.8016, 144.9000); // ~11m from shot2

  it('recomputes both the moved shot and the next shot', () => {
    // Move shot 2 closer to the tee — its distance from shot1 shrinks,
    // and shot3's distance from shot2 grows.
    const newCoord = { latitude: -37.8011, longitude: 144.9 };
    const result = recomputeAfterMove([shot1, shot2, shot3], 1, newCoord, teeAnchor);

    expect(result.movedOriginal).not.toBeNull();
    expect(result.movedNew).not.toBeNull();
    // Original distance shot1 → shot2 was ~55m. New distance is ~11m.
    expect(result.movedNew!).toBeLessThan(result.movedOriginal!);

    expect(result.nextOriginal).not.toBeNull();
    expect(result.nextNew).not.toBeNull();
    // Shot3 was ~11m from old shot2; now ~55m from new shot2 position.
    expect(result.nextNew!).toBeGreaterThan(result.nextOriginal!);
  });

  it('uses the tee anchor as the prior point when moving shot index 0', () => {
    const newCoord = { latitude: -37.8005, longitude: 144.9 };
    const result = recomputeAfterMove([shot1, shot2], 0, newCoord, teeAnchor);

    // movedOriginal = ~111m (tee → original shot1)
    // movedNew = ~55m (tee → newCoord)
    expect(result.movedOriginal).toBeGreaterThan(100);
    expect(result.movedNew).toBeGreaterThan(40);
    expect(result.movedNew).toBeLessThan(70);
    // shot2 still measured from the moved shot1 — original was ~55m, now further.
    expect(result.nextOriginal).not.toBeNull();
    expect(result.nextNew).not.toBeNull();
  });

  it('returns null movedNew/movedOriginal for shot 0 when no tee anchor', () => {
    const newCoord = { latitude: -37.8005, longitude: 144.9 };
    const result = recomputeAfterMove([shot1, shot2], 0, newCoord, null);
    expect(result.movedOriginal).toBeNull();
    expect(result.movedNew).toBeNull();
    // Shot 2's distance still recomputable.
    expect(result.nextOriginal).not.toBeNull();
    expect(result.nextNew).not.toBeNull();
  });

  it('returns null nextNew/nextOriginal when moved shot is the last shot', () => {
    const newCoord = { latitude: -37.8017, longitude: 144.9 };
    const result = recomputeAfterMove([shot1, shot2, shot3], 2, newCoord, teeAnchor);
    expect(result.movedOriginal).not.toBeNull();
    expect(result.movedNew).not.toBeNull();
    expect(result.nextOriginal).toBeNull();
    expect(result.nextNew).toBeNull();
  });

  it('returns null for both rows when only one shot exists and it has no tee', () => {
    const newCoord = { latitude: -37.8005, longitude: 144.9 };
    const result = recomputeAfterMove([shot1], 0, newCoord, null);
    expect(result.movedOriginal).toBeNull();
    expect(result.movedNew).toBeNull();
    expect(result.nextOriginal).toBeNull();
    expect(result.nextNew).toBeNull();
  });

  it('returns all-null when movedIndex is out of range', () => {
    const newCoord = { latitude: -37.8, longitude: 144.9 };
    const result = recomputeAfterMove([shot1], 5, newCoord, teeAnchor);
    expect(result.movedNew).toBeNull();
    expect(result.movedOriginal).toBeNull();
    expect(result.nextNew).toBeNull();
    expect(result.nextOriginal).toBeNull();
  });
});
