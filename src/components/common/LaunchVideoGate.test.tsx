import React from 'react';
import { Animated, Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';

// --- Mock expo-video so we can drive player events from the test ---
const listeners: Record<string, Array<(payload?: any) => void>> = {};
const mockPlayer = {
  loop: false,
  muted: false,
  play: jest.fn(),
  addListener: jest.fn((event: string, cb: (payload?: any) => void) => {
    listeners[event] = listeners[event] ?? [];
    listeners[event].push(cb);
    return { remove: jest.fn() };
  }),
};

jest.mock('expo-video', () => ({
  useVideoPlayer: (_source: unknown, setup?: (p: typeof mockPlayer) => void) => {
    if (setup) setup(mockPlayer);
    return mockPlayer;
  },
  VideoView: () => null,
}));

import {
  LaunchVideoGate,
  __resetLaunchVideoGateForTests,
} from './LaunchVideoGate';

function emit(event: string, payload?: any) {
  act(() => {
    (listeners[event] ?? []).forEach((cb) => cb(payload));
  });
}

beforeEach(() => {
  __resetLaunchVideoGateForTests();
  Object.keys(listeners).forEach((k) => delete listeners[k]);
  jest.clearAllMocks();
  // Make the fade-out animation resolve synchronously in tests.
  jest
    .spyOn(Animated, 'timing')
    .mockReturnValue({
      start: (cb?: (result: { finished: boolean }) => void) =>
        cb && cb({ finished: true }),
    } as unknown as Animated.CompositeAnimation);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const Child = () => <Text>app-content</Text>;

it('renders children underneath the overlay', () => {
  const { getByText } = render(
    <LaunchVideoGate>
      <Child />
    </LaunchVideoGate>
  );
  expect(getByText('app-content')).toBeTruthy();
});

it('shows the skip control on first (cold-start) mount', () => {
  const { getByLabelText } = render(
    <LaunchVideoGate>
      <Child />
    </LaunchVideoGate>
  );
  expect(getByLabelText('Skip intro')).toBeTruthy();
});

it('plays once per process: a second mount shows no overlay', () => {
  const first = render(
    <LaunchVideoGate>
      <Child />
    </LaunchVideoGate>
  );
  first.unmount();

  const second = render(
    <LaunchVideoGate>
      <Child />
    </LaunchVideoGate>
  );
  expect(second.queryByLabelText('Skip intro')).toBeNull();
});

it('dismisses the overlay when tapped (skip)', () => {
  const { getByLabelText, queryByLabelText } = render(
    <LaunchVideoGate>
      <Child />
    </LaunchVideoGate>
  );
  fireEvent.press(getByLabelText('Skip intro'));
  expect(queryByLabelText('Skip intro')).toBeNull();
});

it('dismisses the overlay when the video finishes', () => {
  const { queryByLabelText } = render(
    <LaunchVideoGate>
      <Child />
    </LaunchVideoGate>
  );
  emit('playToEnd');
  expect(queryByLabelText('Skip intro')).toBeNull();
});

it('dismisses the overlay if the player errors', () => {
  const { queryByLabelText } = render(
    <LaunchVideoGate>
      <Child />
    </LaunchVideoGate>
  );
  emit('statusChange', { status: 'error', error: { message: 'boom' } });
  expect(queryByLabelText('Skip intro')).toBeNull();
});
