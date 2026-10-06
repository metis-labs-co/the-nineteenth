/**
 * GameIndicatorBadge component tests.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { GameIndicatorBadge } from './GameIndicatorBadge';

jest.mock('react-native-paper', () => {
  const { View, Text } = require('react-native');
  return {
    Text: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
    Icon: ({ source, ...props }: any) => (
      <View testID={`icon-${source}`} accessibilityLabel={source} {...props} />
    ),
    ActivityIndicator: (props: any) => <View testID="spinner" {...props} />,
  };
});

const baseProps = {
  isLoading: false,
  color: '#123456',
  icon: 'dice-multiple',
  size: 'md' as const,
  variant: 'default' as const,
  onPress: jest.fn(),
  accessibilityLabel: 'Skins game active',
  accessibilityHint: 'Tap to view skins game summary',
};

describe('GameIndicatorBadge', () => {
  it('renders the icon and fires onPress', () => {
    const onPress = jest.fn();
    render(<GameIndicatorBadge {...baseProps} onPress={onPress} testID="badge" />);
    expect(screen.getByTestId('icon-dice-multiple')).toBeTruthy();
    fireEvent.press(screen.getByTestId('badge'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner (not the icon) while loading', () => {
    render(<GameIndicatorBadge {...baseProps} isLoading testID="badge" />);
    expect(screen.getByTestId('spinner')).toBeTruthy();
    expect(screen.queryByTestId('icon-dice-multiple')).toBeNull();
  });

  it('renders nothing when hidden and not loading', () => {
    render(<GameIndicatorBadge {...baseProps} hidden testID="badge" />);
    expect(screen.queryByTestId('badge')).toBeNull();
  });

  it('still shows the spinner when hidden but loading', () => {
    render(<GameIndicatorBadge {...baseProps} hidden isLoading testID="badge" />);
    expect(screen.getByTestId('spinner')).toBeTruthy();
  });

  it('renders the corner badge content when provided', () => {
    render(
      <GameIndicatorBadge
        {...baseProps}
        badge={{ backgroundColor: '#FF0000', content: 3 }}
      />
    );
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('renders no badge when badge is null', () => {
    render(<GameIndicatorBadge {...baseProps} badge={null} />);
    expect(screen.queryByText('3')).toBeNull();
  });
});
