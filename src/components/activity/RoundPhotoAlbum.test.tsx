import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { RoundPhotoAlbum } from './RoundPhotoAlbum';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#FFF', surfaceVariant: '#EEE', textPrimary: '#111',
    textSecondary: '#666', primary: '#1E7F5E', border: '#E0E0E0',
  }),
}));

const mockMutateAsync = jest.fn();
jest.mock('@/hooks/activity', () => ({
  useRoundPhotos: () => ({ data: [], isLoading: false }),
  useUploadRoundPhoto: () => ({ mutateAsync: mockMutateAsync }),
  useDeleteRoundPhoto: () => ({ mutate: jest.fn() }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

// SectionHeader is irrelevant here; PhotoSourceMenu is covered by its own test,
// so stub it to expose its two actions as press targets.
jest.mock('@/components/common', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    SectionHeader: () => null,
    PhotoSourceMenu: ({ visible, onTakePhoto, onChooseFromLibrary }: any) =>
      visible ? (
        <View>
          <TouchableOpacity testID="take-photo" onPress={onTakePhoto}>
            <Text>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="choose-library" onPress={onChooseFromLibrary}>
            <Text>Choose from Library</Text>
          </TouchableOpacity>
        </View>
      ) : null,
  };
});

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

const asset = {
  uri: 'file://p.jpg', width: 100, height: 100,
  mimeType: 'image/jpeg', fileName: 'p.jpg',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMutateAsync.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('RoundPhotoAlbum camera + library', () => {
  it('opens the source menu when Add is pressed', () => {
    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    expect(screen.queryByTestId('take-photo')).toBeNull();
    fireEvent.press(screen.getByLabelText('Add photos'));
    expect(screen.getByTestId('take-photo')).toBeTruthy();
    expect(screen.getByTestId('choose-library')).toBeTruthy();
  });

  it('takes a photo with the camera and uploads it', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [asset] });

    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    fireEvent.press(screen.getByLabelText('Add photos'));
    fireEvent.press(screen.getByTestId('take-photo'));

    await waitFor(() => expect(ImagePicker.launchCameraAsync).toHaveBeenCalled());
    expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ roundId: 'r1', uri: 'file://p.jpg' })
      )
    );
  });

  it('does not launch the camera when permission is denied', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    fireEvent.press(screen.getByLabelText('Add photos'));
    fireEvent.press(screen.getByTestId('take-photo'));

    await waitFor(() => expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled());
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      expect.stringContaining('Camera access'),
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ text: 'Open Settings' })])
    );
  });

  it('chooses from the library and uploads', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [asset] });

    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    fireEvent.press(screen.getByLabelText('Add photos'));
    fireEvent.press(screen.getByTestId('choose-library'));

    await waitFor(() => expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ roundId: 'r1', uri: 'file://p.jpg' })
      )
    );
  });

  it('alerts when an upload fails', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [asset] });
    mockMutateAsync.mockRejectedValue(new Error('network'));

    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    fireEvent.press(screen.getByLabelText('Add photos'));
    fireEvent.press(screen.getByTestId('choose-library'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Upload failed', expect.any(String))
    );
  });
});
