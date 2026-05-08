import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ShotMarkerActionSheet } from '@/components/scorecard/HoleMap/ShotMarkerActionSheet';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#fff',
    border: '#e5e7eb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    error: '#ef4444',
  }),
}));

const shot: ShotLogEntry = {
  id: 'shot-1',
  round_id: 'r1',
  hole_number: 7,
  player_id: 'p1',
  sequence: 2,
  latitude: 0,
  longitude: 0,
  club_used: null,
  shot_type: null,
  from_bunker: false,
  accuracy_meters: null,
  tee_override: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('ShotMarkerActionSheet', () => {
  it('renders nothing when shot is null', () => {
    const { queryByText } = render(
      <ShotMarkerActionSheet
        visible
        shot={null}
        onClose={() => {}}
        onDelete={() => {}}
        onMoveOnMap={() => {}}
      />
    );
    expect(queryByText('Shot 2')).toBeNull();
  });

  it('shows the sequence number in the title', () => {
    const { getByText } = render(
      <ShotMarkerActionSheet
        visible
        shot={shot}
        onClose={() => {}}
        onDelete={() => {}}
        onMoveOnMap={() => {}}
      />
    );
    expect(getByText('Shot 2')).toBeTruthy();
  });

  it('invokes onMoveOnMap with the shot', () => {
    const onMoveOnMap = jest.fn();
    const { getByTestId } = render(
      <ShotMarkerActionSheet
        visible
        shot={shot}
        onClose={() => {}}
        onDelete={() => {}}
        onMoveOnMap={onMoveOnMap}
      />
    );
    fireEvent.press(getByTestId('shot-action-move'));
    expect(onMoveOnMap).toHaveBeenCalledWith(shot);
  });

  it('invokes onDelete with the shot', () => {
    const onDelete = jest.fn();
    const { getByTestId } = render(
      <ShotMarkerActionSheet
        visible
        shot={shot}
        onClose={() => {}}
        onDelete={onDelete}
        onMoveOnMap={() => {}}
      />
    );
    fireEvent.press(getByTestId('shot-action-delete'));
    expect(onDelete).toHaveBeenCalledWith(shot);
  });

  it('invokes onClose when cancel pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <ShotMarkerActionSheet
        visible
        shot={shot}
        onClose={onClose}
        onDelete={() => {}}
        onMoveOnMap={() => {}}
      />
    );
    fireEvent.press(getByTestId('shot-action-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
