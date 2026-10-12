/**
 * ShotLogList — click-throughs: shot row → ShotMap, hole heading → HoleMap
 * review, player header → PlayerDetail. Club edit / delete stay independent.
 */
import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import type { ShotLogEntry } from '@/types/database/shotLog.types';
import { ShotLogList } from './ShotLogList';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useNavigation: () => ({ navigate: mockNavigate }) };
});

const TEE = { latitude: -37.8, longitude: 144.9 };

const shot = (overrides: Partial<ShotLogEntry>): ShotLogEntry => ({
  id: 's1',
  round_id: 'round-1',
  hole_number: 1,
  player_id: 'p1',
  sequence: 1,
  latitude: -37.801,
  longitude: 144.901,
  club_used: 'driver',
  shot_type: null,
  from_bunker: false,
  accuracy_meters: null,
  tee_override: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  ...overrides,
});

let mockShots: ShotLogEntry[] = [];
jest.mock('@/hooks/shots', () => ({
  useShotLogByRound: () => ({ data: mockShots, isLoading: false }),
}));
jest.mock('@/hooks/useHoleCoordinates', () => ({
  useHoleCoordinates: () => ({
    coordinatesByHole: { 1: { tee_back: { ...TEE, poi_type: 'tee_back' } } },
    isLoading: false,
  }),
}));
jest.mock('@/hooks/customTees', () => ({
  useCustomHoleTeesByCourse: () => ({ data: {} }),
}));

describe('ShotLogList click-throughs', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockShots = [
      shot({ id: 's1', sequence: 1, latitude: -37.801, longitude: 144.901, club_used: 'driver' }),
      shot({ id: 's2', sequence: 2, latitude: -37.802, longitude: 144.902, club_used: '7-iron' }),
      shot({ id: 's3', player_id: 'p2', sequence: 1, club_used: null }),
    ];
  });

  const renderList = (props: Partial<React.ComponentProps<typeof ShotLogList>> = {}) =>
    render(
      <ShotLogList
        roundId="round-1"
        courseId="course-1"
        playerNameMap={{ p1: 'Ann', p2: 'Bob' }}
        courseName="Royal Melbourne"
        roundPlayedAt="2026-10-01"
        {...props}
      />
    );

  it('opens the shot on ShotMap with the prior shot as origin', () => {
    renderList();

    fireEvent.press(screen.getByLabelText('View shot 2, 7 Iron, on map'));

    expect(mockNavigate).toHaveBeenCalledWith('ShotMap', {
      shotId: 's2',
      roundId: 'round-1',
      courseId: 'course-1',
      sequence: 2,
      shotLatitude: -37.802,
      shotLongitude: 144.902,
      originLatitude: -37.801,
      originLongitude: 144.901,
      distanceMeters: expect.any(Number),
      clubKey: '7-iron',
      holeNumber: 1,
      courseName: 'Royal Melbourne',
      roundPlayedAt: '2026-10-01',
    });
  });

  it('uses the tee as origin for shot 1', () => {
    renderList();

    fireEvent.press(screen.getByLabelText('View shot 1, Driver, on map'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'ShotMap',
      expect.objectContaining({ originLatitude: TEE.latitude, originLongitude: TEE.longitude })
    );
  });

  it('leaves rows with no recognised club inert', () => {
    renderList();

    expect(screen.getByText('Unknown club')).toBeTruthy();
    expect(screen.queryByLabelText(/Unknown club, on map/)).toBeNull();
  });

  it('editing the club or deleting does not also open the shot', () => {
    const onChangeClubForShot = jest.fn();
    const onDeleteShot = jest.fn();
    renderList({ onChangeClubForShot, onDeleteShot, currentPlayerId: 'p1' });

    fireEvent.press(screen.getByLabelText('Edit club for shot 2'));
    fireEvent.press(screen.getByLabelText('Delete shot 2'));

    expect(onChangeClubForShot).toHaveBeenCalledWith(expect.objectContaining({ id: 's2' }));
    expect(onDeleteShot).toHaveBeenCalledWith(expect.objectContaining({ id: 's2' }));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens the hole map in review mode from the hole heading', () => {
    renderList();

    fireEvent.press(screen.getByLabelText('View hole 1 on map'));

    expect(mockNavigate).toHaveBeenCalledWith('HoleMap', {
      courseId: 'course-1',
      holeNumber: 1,
      roundId: 'round-1',
      mode: 'review',
    });
  });

  it('opens the player profile from the player header', () => {
    renderList();

    fireEvent.press(screen.getByLabelText('View profile of Bob'));

    expect(mockNavigate).toHaveBeenCalledWith('PlayerDetail', { id: 'p2' });
  });
});
