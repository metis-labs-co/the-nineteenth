import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HandicapUpsellRow } from './HandicapUpsellRow';

describe('HandicapUpsellRow', () => {
  it('renders the title, prompt and required tier pill', () => {
    const { getByText } = render(
      <HandicapUpsellRow
        requiredTier="social"
        onUpgradePress={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(getByText('Social Handicap')).toBeTruthy();
    expect(getByText('Your in-app handicap — upgrade to unlock')).toBeTruthy();
    expect(getByText('Social')).toBeTruthy();
  });

  it('falls back to a generic pill when no tier is known', () => {
    const { getByText } = render(
      <HandicapUpsellRow onUpgradePress={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(getByText('Upgrade')).toBeTruthy();
  });

  it('calls onUpgradePress when the row is tapped', () => {
    const onUpgradePress = jest.fn();
    const { getByTestId } = render(
      <HandicapUpsellRow
        requiredTier="social"
        onUpgradePress={onUpgradePress}
        onDismiss={jest.fn()}
        testID="handicap-upsell-row"
      />,
    );
    fireEvent.press(getByTestId('handicap-upsell-row'));
    expect(onUpgradePress).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss without triggering the row press', () => {
    const onUpgradePress = jest.fn();
    const onDismiss = jest.fn();
    const { getByLabelText } = render(
      <HandicapUpsellRow
        requiredTier="social"
        onUpgradePress={onUpgradePress}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.press(getByLabelText('Hide Social Handicap'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onUpgradePress).not.toHaveBeenCalled();
  });
});
