import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CustomTeeActionSheet } from '@/components/scorecard/HoleMap';
import type { CustomHoleTee } from '@/types/database/customHoleTees.types';

const tee: CustomHoleTee = {
  id: 'tee-id-1',
  course_id: 'course-1',
  hole_number: 7,
  user_id: 'user-1',
  latitude: -37.8,
  longitude: 144.96,
  color: 'red',
  created_at: '2026-01-01T00:00:00Z',
};

describe('CustomTeeActionSheet', () => {
  it('renders nothing when tee is null', () => {
    const { queryByTestId } = render(
      <CustomTeeActionSheet
        visible
        tee={null}
        onClose={jest.fn()}
        onMoveOnMap={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(queryByTestId('custom-tee-action-move')).toBeNull();
  });

  it('renders Move + Delete + Cancel actions when visible', () => {
    const { getByTestId } = render(
      <CustomTeeActionSheet
        visible
        tee={tee}
        onClose={jest.fn()}
        onMoveOnMap={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(getByTestId('custom-tee-action-move')).toBeTruthy();
    expect(getByTestId('custom-tee-action-delete')).toBeTruthy();
    expect(getByTestId('custom-tee-action-cancel')).toBeTruthy();
  });

  it('invokes onMoveOnMap with the tee when Move is tapped', () => {
    const onMoveOnMap = jest.fn();
    const { getByTestId } = render(
      <CustomTeeActionSheet
        visible
        tee={tee}
        onClose={jest.fn()}
        onMoveOnMap={onMoveOnMap}
        onDelete={jest.fn()}
      />
    );
    fireEvent.press(getByTestId('custom-tee-action-move'));
    expect(onMoveOnMap).toHaveBeenCalledWith(tee);
  });

  it('invokes onDelete with the tee when Delete is tapped', () => {
    const onDelete = jest.fn();
    const { getByTestId } = render(
      <CustomTeeActionSheet
        visible
        tee={tee}
        onClose={jest.fn()}
        onMoveOnMap={jest.fn()}
        onDelete={onDelete}
      />
    );
    fireEvent.press(getByTestId('custom-tee-action-delete'));
    expect(onDelete).toHaveBeenCalledWith(tee);
  });

  it('invokes onClose when Cancel is tapped', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <CustomTeeActionSheet
        visible
        tee={tee}
        onClose={onClose}
        onMoveOnMap={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    fireEvent.press(getByTestId('custom-tee-action-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
