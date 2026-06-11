import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CompeteScreen from '../CompeteScreen';

// Mock ThemeContext (same pattern as RoundPhotosScreen.test.tsx)
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    background: '#ffffff',
    surface: '#f5f5f5',
    surfaceVariant: '#eeeeee',
    textPrimary: '#000000',
    textSecondary: '#666666',
    primary: '#00aa00',
    border: '#cccccc',
  }),
}));

// Mock child content components
jest.mock('../components', () => ({
  CompsContent: () => {
    const { Text } = require('react-native');
    return <Text>COMPS_CONTENT</Text>;
  },
  LeaguesContent: () => {
    const { Text } = require('react-native');
    return <Text>LEAGUES_CONTENT</Text>;
  },
}));

// Mock PageHeader to avoid safe-area and other dependencies
jest.mock('@/components/common/PageHeader', () => {
  const { Text } = require('react-native');
  return {
    PageHeader: ({ title }: any) => <Text>{title}</Text>,
  };
});

// Mock SegmentedButton to render simple touchable buttons by label
jest.mock('@/components/common/SegmentedButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    SegmentedButton: ({ buttons, onValueChange }: any) =>
      buttons.map((b: any) => (
        <TouchableOpacity key={b.value} onPress={() => onValueChange(b.value)}>
          <Text>{b.label}</Text>
        </TouchableOpacity>
      )),
  };
});

// Mock ScreenWelcomeModal to a no-op
jest.mock('@/components/common/ScreenWelcomeModal', () => ({
  ScreenWelcomeModal: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@/hooks/useScreenWelcome', () => ({
  useScreenWelcome: () => ({
    isModalVisible: false,
    dismissModal: jest.fn(),
    showModal: jest.fn(),
    isFirstVisit: false,
    content: { title: 'x', sections: [] },
  }),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('CompeteScreen', () => {
  it('shows Comps content by default', () => {
    const { getByText, queryByText } = renderWithQueryClient(<CompeteScreen />);
    expect(getByText('COMPS_CONTENT')).toBeTruthy();
    expect(queryByText('LEAGUES_CONTENT')).toBeNull();
  });

  it('switches to Leagues content when the Leagues segment is pressed', () => {
    const { getByText, queryByText } = renderWithQueryClient(<CompeteScreen />);
    fireEvent.press(getByText('Leagues'));
    expect(getByText('LEAGUES_CONTENT')).toBeTruthy();
    expect(queryByText('COMPS_CONTENT')).toBeNull();
  });

  it('switches back to Comps content', () => {
    const { getByText } = renderWithQueryClient(<CompeteScreen />);
    fireEvent.press(getByText('Leagues'));
    fireEvent.press(getByText('Comps'));
    expect(getByText('COMPS_CONTENT')).toBeTruthy();
  });
});
