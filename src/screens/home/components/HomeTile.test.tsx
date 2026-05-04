import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HomeTile } from './HomeTile';

describe('HomeTile', () => {
  it('renders title, headline, subtext', () => {
    const { getByText } = render(
      <HomeTile
        testID="t"
        icon="chart-line"
        title="Stats"
        headline="12.4"
        subtext="avg 84"
        onPress={jest.fn()}
      />,
    );
    expect(getByText('Stats')).toBeTruthy();
    expect(getByText('12.4')).toBeTruthy();
    expect(getByText('avg 84')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <HomeTile testID="t" icon="chart-line" title="Stats" headline="12.4" subtext="avg 84" onPress={onPress} />,
    );
    fireEvent.press(getByTestId('t'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders empty headline placeholder when headline is null', () => {
    const { getByText } = render(
      <HomeTile
        testID="t"
        icon="chart-line"
        title="Stats"
        headline={null}
        subtext="Play 3 rounds to unlock"
        onPress={jest.fn()}
      />,
    );
    expect(getByText('—')).toBeTruthy();
  });
});
