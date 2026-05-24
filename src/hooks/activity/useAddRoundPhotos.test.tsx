import { Alert } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAddRoundPhotos } from './useAddRoundPhotos';

const mockMutateAsync = jest.fn();
jest.mock('./mutations', () => ({
  useUploadRoundPhoto: () => ({ mutateAsync: mockMutateAsync }),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

const asset = { uri: 'file://p.jpg', width: 10, height: 10, mimeType: 'image/jpeg', fileName: 'p.jpg' };

beforeEach(() => {
  jest.clearAllMocks();
  mockMutateAsync.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('useAddRoundPhotos', () => {
  it('opens and closes the menu', () => {
    const { result } = renderHook(() => useAddRoundPhotos('r1'));
    expect(result.current.menuVisible).toBe(false);
    act(() => result.current.openMenu());
    expect(result.current.menuVisible).toBe(true);
    act(() => result.current.closeMenu());
    expect(result.current.menuVisible).toBe(false);
  });

  it('takes a photo, uploads it, and calls onUploaded', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [asset] });
    const onUploaded = jest.fn();

    const { result } = renderHook(() => useAddRoundPhotos('r1', { onUploaded }));
    await act(async () => { await result.current.handleTakePhoto(); });

    expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ roundId: 'r1', uri: 'file://p.jpg' }));
    expect(onUploaded).toHaveBeenCalledWith(1);
  });

  it('does not launch the camera when permission is denied', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    const { result } = renderHook(() => useAddRoundPhotos('r1'));
    await act(async () => { await result.current.handleTakePhoto(); });

    expect(Alert.alert).toHaveBeenCalledWith(
      expect.stringContaining('Camera access'),
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ text: 'Open Settings' })])
    );
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('chooses from the library and uploads', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [asset] });

    const { result } = renderHook(() => useAddRoundPhotos('r1'));
    await act(async () => { await result.current.handleChooseFromLibrary(); });

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ roundId: 'r1', uri: 'file://p.jpg' }));
  });

  it('alerts and resets uploading when the upload fails', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Storage quota exceeded'));
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [asset] });

    const { result } = renderHook(() => useAddRoundPhotos('r1'));
    await act(async () => { await result.current.handleChooseFromLibrary(); });

    expect(Alert.alert).toHaveBeenCalledWith('Upload failed', 'Storage quota exceeded');
    expect(result.current.uploading).toBe(false);
  });
});
