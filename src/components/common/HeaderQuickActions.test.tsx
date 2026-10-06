import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { HeaderQuickActions, HeaderIconButton } from './HeaderQuickActions';
import * as notificationHooks from '@/hooks/notifications';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/hooks/notifications', () => ({
  useUnreadNotificationCount: jest.fn(),
}));

// The cluster embeds HeaderWeatherChip. Stub it so this test stays unit-scoped.
jest.mock('@/components/weather', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    HeaderWeatherChip: () => <Text testID="weather-chip-stub">weather</Text>,
  };
});

/** Collect testIDs / accessibilityLabels in render (left-to-right) order. */
function renderOrder(tree: unknown): string[] {
  const found: string[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const el = node as { props?: Record<string, unknown>; children?: unknown };
    const marker = el.props?.testID ?? el.props?.accessibilityLabel;
    if (typeof marker === 'string') found.push(marker);
    walk(el.children);
  };
  walk(tree);
  return found;
}

function mockUnreadCount(count: number) {
  (notificationHooks.useUnreadNotificationCount as jest.Mock).mockReturnValue({
    data: count,
  });
}

describe('HeaderQuickActions', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUnreadCount(0);
  });

  it('renders the weather chip, rounds button, and notifications button', () => {
    const { getByTestId, getByLabelText } = render(<HeaderQuickActions />);
    expect(getByTestId('weather-chip-stub')).toBeTruthy();
    expect(getByLabelText('View all rounds')).toBeTruthy();
    expect(getByLabelText('Notifications')).toBeTruthy();
  });

  it('navigates to AllRounds when the rounds button is pressed', () => {
    const { getByLabelText } = render(<HeaderQuickActions />);
    fireEvent.press(getByLabelText('View all rounds'));
    expect(mockNavigate).toHaveBeenCalledWith('AllRounds');
  });

  it('navigates to Notifications when the bell is pressed', () => {
    const { getByLabelText } = render(<HeaderQuickActions />);
    fireEvent.press(getByLabelText('Notifications'));
    expect(mockNavigate).toHaveBeenCalledWith('Notifications');
  });

  it('shows the unread badge count and includes it in the bell label', () => {
    mockUnreadCount(5);
    const { getByText, getByLabelText } = render(<HeaderQuickActions />);
    expect(getByText('5')).toBeTruthy();
    expect(getByLabelText('Notifications, 5 unread')).toBeTruthy();
  });

  it('caps the badge at 99+', () => {
    mockUnreadCount(150);
    const { getByText } = render(<HeaderQuickActions />);
    expect(getByText('99+')).toBeTruthy();
  });

  it('hides the badge when there are no unread notifications', () => {
    const { queryByText } = render(<HeaderQuickActions />);
    expect(queryByText('0')).toBeNull();
  });

  it('hides the rounds button when showRounds is false', () => {
    const { queryByLabelText, getByLabelText } = render(
      <HeaderQuickActions showRounds={false} />
    );
    expect(queryByLabelText('View all rounds')).toBeNull();
    expect(getByLabelText('Notifications')).toBeTruthy();
  });

  it('renders extra actions passed as children before the trio', () => {
    const onInfoPress = jest.fn();
    const { getByLabelText } = render(
      <HeaderQuickActions>
        <HeaderIconButton
          icon="information-outline"
          onPress={onInfoPress}
          accessibilityLabel="Course info"
        />
      </HeaderQuickActions>
    );
    fireEvent.press(getByLabelText('Course info'));
    expect(onInfoPress).toHaveBeenCalled();
  });

  it('places children before the weather chip by default', () => {
    const { toJSON } = render(
      <HeaderQuickActions>
        <HeaderIconButton icon="flash" onPress={jest.fn()} accessibilityLabel="Extra" />
      </HeaderQuickActions>
    );
    const order = renderOrder(toJSON());
    expect(order.indexOf('Extra')).toBeLessThan(order.indexOf('weather-chip-stub'));
  });

  it('places children after the weather chip when childrenPlacement is after-weather', () => {
    const { toJSON } = render(
      <HeaderQuickActions childrenPlacement="after-weather">
        <HeaderIconButton icon="flash" onPress={jest.fn()} accessibilityLabel="Extra" />
      </HeaderQuickActions>
    );
    const order = renderOrder(toJSON());
    expect(order.indexOf('weather-chip-stub')).toBeLessThan(order.indexOf('Extra'));
    expect(order.indexOf('Extra')).toBeLessThan(order.indexOf('View all rounds'));
  });
});

describe('HeaderIconButton', () => {
  it('renders a labelled button that fires onPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <HeaderIconButton icon="golf" onPress={onPress} accessibilityLabel="Tap me" />
    );
    fireEvent.press(getByLabelText('Tap me'));
    expect(onPress).toHaveBeenCalled();
  });
});
