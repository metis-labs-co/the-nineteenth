import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PerformanceRow } from './PerformanceRow';

describe('PerformanceRow', () => {
  it('is tappable when given onPress', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <PerformanceRow icon="trophy" iconColor="#000" label="Best Gross Score" value="72 strokes" onPress={onPress} />,
    );
    fireEvent.press(getByRole('button', { name: /Best Gross Score, 72 strokes/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is not a button without onPress', () => {
    const { queryByRole, getByText } = render(
      <PerformanceRow icon="bird" iconColor="#000" label="Birdie Rate" value="12%" />,
    );
    expect(getByText('12%')).toBeTruthy();
    expect(queryByRole('button')).toBeNull();
  });
});
