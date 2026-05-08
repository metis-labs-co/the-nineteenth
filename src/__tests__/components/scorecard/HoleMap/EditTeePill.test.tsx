import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { EditTeePill } from '@/components/scorecard/HoleMap';

describe('EditTeePill', () => {
  it('renders nothing when not visible', () => {
    const { queryByTestId } = render(
      <EditTeePill visible={false} swatch="#FBC02D" onPress={jest.fn()} />
    );
    expect(queryByTestId('edit-tee-pill')).toBeNull();
  });

  it('renders when visible', () => {
    const { getByTestId } = render(
      <EditTeePill visible swatch="#FBC02D" onPress={jest.fn()} />
    );
    expect(getByTestId('edit-tee-pill')).toBeTruthy();
  });

  it('renders without a swatch when null', () => {
    const { getByTestId } = render(
      <EditTeePill visible swatch={null} onPress={jest.fn()} />
    );
    // Component still renders — only the swatch dot is conditional.
    expect(getByTestId('edit-tee-pill')).toBeTruthy();
  });

  it('invokes onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <EditTeePill visible swatch="#212121" onPress={onPress} />
    );
    fireEvent.press(getByTestId('edit-tee-pill'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
