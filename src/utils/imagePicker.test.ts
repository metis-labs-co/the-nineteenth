import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { extFromAsset, pickImageFromLibrary, takePhotoWithCamera } from './imagePicker';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

const mockPicker = ImagePicker as jest.Mocked<typeof ImagePicker>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('extFromAsset', () => {
  it('prefers the file extension from the file name', () => {
    expect(extFromAsset({ fileName: 'IMG_001.PNG' } as ImagePicker.ImagePickerAsset)).toBe('png');
  });

  it('falls back to mime type then jpg', () => {
    expect(extFromAsset({ mimeType: 'image/jpeg' } as ImagePicker.ImagePickerAsset)).toBe('jpg');
    expect(extFromAsset({ mimeType: 'image/png' } as ImagePicker.ImagePickerAsset)).toBe('png');
    expect(extFromAsset({ mimeType: 'image/webp' } as ImagePicker.ImagePickerAsset)).toBe('webp');
    expect(extFromAsset({} as ImagePicker.ImagePickerAsset)).toBe('jpg');
  });
});

describe('pickImageFromLibrary', () => {
  it('returns null and alerts when permission denied', async () => {
    mockPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false } as never);
    expect(await pickImageFromLibrary()).toBeNull();
    expect(Alert.alert).toHaveBeenCalled();
    expect(mockPicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('returns null when the user cancels', async () => {
    mockPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
    mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] } as never);
    expect(await pickImageFromLibrary()).toBeNull();
  });

  it('returns the picked image meta on success', async () => {
    mockPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
    mockPicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg', fileName: 'a.jpg', mimeType: 'image/jpeg' }],
    } as never);
    expect(await pickImageFromLibrary()).toEqual({ uri: 'file:///a.jpg', ext: 'jpg', mimeType: 'image/jpeg' });
  });
});

describe('takePhotoWithCamera', () => {
  it('returns null and alerts when camera permission denied', async () => {
    mockPicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false } as never);
    expect(await takePhotoWithCamera()).toBeNull();
    expect(Alert.alert).toHaveBeenCalled();
    expect(mockPicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('returns the captured image meta on success', async () => {
    mockPicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    mockPicker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cam.jpg', mimeType: 'image/jpeg' }],
    } as never);
    expect(await takePhotoWithCamera()).toEqual({ uri: 'file:///cam.jpg', ext: 'jpg', mimeType: 'image/jpeg' });
  });
});
