import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import JoinLeagueScreen from '../JoinLeagueScreen';

// Mock ThemeContext (mirrors CompeteScreen.test.tsx pattern)
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    background: '#ffffff',
    surface: '#f5f5f5',
    surfaceVariant: '#eeeeee',
    textPrimary: '#000000',
    textSecondary: '#666666',
    primary: '#00aa00',
    border: '#cccccc',
    white: '#ffffff',
    gray200: '#e5e7eb',
  }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    replace: jest.fn(),
  }),
}));

const mockPublicLeagues = [
  { id: 'lg-1', name: 'Sunday Swingers', player_count: 8 },
];

jest.mock('@/hooks/useLeagues', () => ({
  useJoinLeague: () => ({ mutateAsync: jest.fn(), isPending: false }),
  usePublicLeagues: () => ({
    data: mockPublicLeagues,
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/components/leagues', () => ({
  LeagueCard: ({ league, onPress }: any) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress}>
        <Text>{league.name}</Text>
      </TouchableOpacity>
    );
  },
}));

// Mock PageHeader to avoid safe-area and other dependencies (mirrors CompeteScreen.test.tsx)
jest.mock('@/components/common/PageHeader', () => {
  const { Text } = require('react-native');
  return {
    PageHeader: ({ title }: any) => <Text>{title}</Text>,
  };
});

// Mock SegmentedButton to render simple touchable buttons by label (mirrors CompeteScreen.test.tsx)
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

// Mock SearchBar to a real TextInput so getByPlaceholderText works
jest.mock('@/components/common/SearchBar', () => {
  const { TextInput, View } = require('react-native');
  return {
    SearchBar: ({ value, onChangeText, placeholder, accessibilityLabel }: any) => (
      <View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    ),
  };
});

// Mock FormInput from common barrel (PageHeader already mocked above, FormInput is named export)
jest.mock('@/components/common', () => ({
  PageHeader: ({ title }: any) => {
    const { Text } = require('react-native');
    return <Text>{title}</Text>;
  },
  FormInput: ({ value, onChangeText, placeholder, autoFocus }: any) => {
    const { TextInput } = require('react-native');
    return (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    );
  },
}));

// Mock EmptyState to a no-op
jest.mock('@/components/common/EmptyState', () => ({
  EmptyState: () => null,
}));

// Mock useDebouncedValue to pass through immediately
jest.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: unknown) => value,
}));

describe('JoinLeagueScreen', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('defaults to Public mode showing search and results', () => {
    const { getByText, getByPlaceholderText } = render(<JoinLeagueScreen />);
    expect(getByPlaceholderText('Search public leagues...')).toBeTruthy();
    expect(getByText('Sunday Swingers')).toBeTruthy();
  });

  it('navigates to LeagueDetail when a public league is tapped', () => {
    const { getByText } = render(<JoinLeagueScreen />);
    fireEvent.press(getByText('Sunday Swingers'));
    expect(mockNavigate).toHaveBeenCalledWith('LeagueDetail', { id: 'lg-1' });
  });

  it('shows the invite code form in Private mode', () => {
    const { getByText, queryByPlaceholderText } = render(<JoinLeagueScreen />);
    fireEvent.press(getByText('Private'));
    expect(queryByPlaceholderText('Search public leagues...')).toBeNull();
    expect(queryByPlaceholderText('Enter invite code (e.g. LGE-12345)')).toBeTruthy();
  });
});
