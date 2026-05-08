import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AddTeePill } from '@/components/scorecard/HoleMap';

describe('AddTeePill', () => {
  it('renders nothing when not visible', () => {
    const { queryByTestId } = render(
      <AddTeePill visible={false} onPress={jest.fn()} />
    );
    expect(queryByTestId('add-tee-pill')).toBeNull();
  });

  it('renders when visible', () => {
    const { getByTestId } = render(
      <AddTeePill visible onPress={jest.fn()} />
    );
    expect(getByTestId('add-tee-pill')).toBeTruthy();
  });

  it('invokes onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <AddTeePill visible onPress={onPress} />
    );
    fireEvent.press(getByTestId('add-tee-pill'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
