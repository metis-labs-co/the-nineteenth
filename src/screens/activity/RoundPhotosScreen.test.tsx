import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import RoundPhotosScreen from './RoundPhotosScreen';
import { createMockNavigation, createMockRoute } from '@/__tests__/utils/renderHelpers';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({ background: '#ffffff' }),
}));

jest.mock('@/components/common', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    PageHeader: ({ title, onBack }: any) => (
      <TouchableOpacity testID="page-header-back" onPress={onBack}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('@/components/activity', () => {
  const { View, Text } = require('react-native');
  return {
    RoundPhotoAlbum: ({ roundId, canAdd }: any) => (
      <View testID="round-photo-album">
        <Text>{`album:${roundId}:${String(canAdd)}`}</Text>
      </View>
    ),
  };
});

describe('RoundPhotosScreen', () => {
  it('renders the photo album for the route round with canAdd enabled', () => {
    const navigation = createMockNavigation();
    const route = createMockRoute({ roundId: 'round-123' });
    render(
      <RoundPhotosScreen navigation={navigation as any} route={route as any} />
    );
    expect(screen.getByTestId('round-photo-album')).toBeTruthy();
    expect(screen.getByText('album:round-123:true')).toBeTruthy();
  });

  it('goes back when the header back button is pressed', () => {
    const navigation = createMockNavigation();
    const route = createMockRoute({ roundId: 'round-123' });
    render(
      <RoundPhotosScreen navigation={navigation as any} route={route as any} />
    );
    fireEvent.press(screen.getByTestId('page-header-back'));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});
