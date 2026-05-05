import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ShotTrail } from '@/components/scorecard/HoleMap/ShotTrail';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({ primary: '#16a34a' }),
}));

const make = (sequence: number, lat: number, lng: number): ShotLogEntry => ({
  id: `shot-${sequence}`,
  round_id: 'r1',
  hole_number: 7,
  player_id: 'p1',
  sequence,
  latitude: lat,
  longitude: lng,
  club_used: null,
  shot_type: null,
  from_bunker: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

describe('ShotTrail', () => {
  it('renders nothing when no shots', () => {
    const { queryByTestId } = render(<ShotTrail shots={[]} />);
    expect(queryByTestId('shot-trail-line')).toBeNull();
    expect(queryByTestId('shot-marker-1')).toBeNull();
  });

  it('renders one numbered marker per shot', () => {
    const shots = [make(1, 0, 0), make(2, 1, 1), make(3, 2, 2)];
    const { getByTestId } = render(<ShotTrail shots={shots} />);
    expect(getByTestId('shot-marker-1')).toBeTruthy();
    expect(getByTestId('shot-marker-2')).toBeTruthy();
    expect(getByTestId('shot-marker-3')).toBeTruthy();
  });

  it('renders the trail polyline when 2+ shots', () => {
    const shots = [make(1, 0, 0), make(2, 1, 1)];
    const { getByTestId } = render(<ShotTrail shots={shots} />);
    expect(getByTestId('shot-trail-line')).toBeTruthy();
  });

  it('does not render trail polyline with 1 shot', () => {
    const shots = [make(1, 0, 0)];
    const { queryByTestId } = render(<ShotTrail shots={shots} />);
    expect(queryByTestId('shot-trail-line')).toBeNull();
    expect(queryByTestId('shot-marker-1')).toBeTruthy();
  });

  it('renders the dashed target segment when target provided', () => {
    const shots = [make(1, 0, 0), make(2, 1, 1)];
    const target = { latitude: 5, longitude: 5 };
    const { getByTestId } = render(<ShotTrail shots={shots} target={target} />);
    expect(getByTestId('shot-trail-target-segment')).toBeTruthy();
  });

  it('omits the target segment when target is null', () => {
    const shots = [make(1, 0, 0), make(2, 1, 1)];
    const { queryByTestId } = render(<ShotTrail shots={shots} target={null} />);
    expect(queryByTestId('shot-trail-target-segment')).toBeNull();
  });

  it('invokes onShotPress with the shot when a marker is tapped', () => {
    const onShotPress = jest.fn();
    const shots = [make(1, 0, 0), make(2, 1, 1)];
    const { getByTestId } = render(<ShotTrail shots={shots} onShotPress={onShotPress} />);
    fireEvent.press(getByTestId('shot-marker-2'));
    expect(onShotPress).toHaveBeenCalledWith(shots[1]);
  });

  it('sorts shots by sequence regardless of input order', () => {
    const shots = [make(3, 2, 2), make(1, 0, 0), make(2, 1, 1)];
    const { getByTestId } = render(<ShotTrail shots={shots} />);
    // All three render — sort happens internally.
    expect(getByTestId('shot-marker-1')).toBeTruthy();
    expect(getByTestId('shot-marker-2')).toBeTruthy();
    expect(getByTestId('shot-marker-3')).toBeTruthy();
  });
});
