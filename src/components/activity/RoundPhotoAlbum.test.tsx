import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { RoundPhotoAlbum } from './RoundPhotoAlbum';

const mockOpenMenu = jest.fn();
const mockDeleteMutateAsync = jest.fn();
const mockShowSuccessToast = jest.fn();
const mockShowErrorToast = jest.fn();

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#FFF', surfaceVariant: '#EEE', textPrimary: '#111',
    textSecondary: '#666', primary: '#1E7F5E', border: '#E0E0E0', white: '#FFF',
  }),
}));

jest.mock('@/hooks/activity', () => ({
  useRoundPhotos: () => ({
    data: [
      { id: 'p1', uploader_id: 'u1', storage_path: 'rounds/r1/u1/p1.jpg', url: 'http://x/p1.jpg' },
      { id: 'p2', uploader_id: 'u2', storage_path: 'rounds/r1/u2/p2.jpg', url: 'http://x/p2.jpg' },
    ],
    isLoading: false,
  }),
  useDeleteRoundPhoto: () => ({ mutateAsync: mockDeleteMutateAsync }),
  useAddRoundPhotos: () => ({
    menuVisible: false,
    openMenu: mockOpenMenu,
    closeMenu: jest.fn(),
    handleTakePhoto: jest.fn(),
    handleChooseFromLibrary: jest.fn(),
    uploading: false,
  }),
}));

jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({ showSuccessToast: mockShowSuccessToast, showErrorToast: mockShowErrorToast }),
}));

jest.mock('@/components/common', () => {
  const { View } = require('react-native');
  return {
    SectionHeader: () => null,
    PhotoSourceMenu: () => <View testID="photo-source-menu" />,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockDeleteMutateAsync.mockResolvedValue(1);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('RoundPhotoAlbum', () => {
  it('opens the source menu when Add is pressed', () => {
    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    fireEvent.press(screen.getByLabelText('Add photos'));
    expect(mockOpenMenu).toHaveBeenCalled();
  });

  it('shows a remove badge only on the user’s own photos', () => {
    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    expect(screen.getAllByLabelText('Remove photo')).toHaveLength(1);
  });

  function pressDelete() {
    fireEvent.press(screen.getByLabelText('Remove photo'));
    const call = (Alert.alert as jest.Mock).mock.calls.find(([title]) => title === 'Delete photo');
    const del = call[2].find((b: { text: string }) => b.text === 'Delete');
    return del.onPress();
  }

  it('deletes a photo and shows a success toast when confirmed', async () => {
    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    await pressDelete();
    expect(mockDeleteMutateAsync).toHaveBeenCalledWith({
      photoId: 'p1',
      roundId: 'r1',
      storagePath: 'rounds/r1/u1/p1.jpg',
    });
    expect(mockShowSuccessToast).toHaveBeenCalledWith('Photo removed');
  });

  it('shows an error toast when the delete affects no rows', async () => {
    mockDeleteMutateAsync.mockResolvedValue(0);
    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    await pressDelete();
    expect(mockShowErrorToast).toHaveBeenCalledWith('Could not remove photo', expect.any(String));
    expect(mockShowSuccessToast).not.toHaveBeenCalled();
  });

  it('shows an error toast when the delete throws', async () => {
    mockDeleteMutateAsync.mockRejectedValue(new Error('permission denied'));
    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    await pressDelete();
    expect(mockShowErrorToast).toHaveBeenCalledWith('Could not remove photo', 'permission denied');
  });

  it('shows a deleting overlay while the delete is in flight, then clears it', async () => {
    let resolveDelete: (v: number) => void = () => {};
    mockDeleteMutateAsync.mockReturnValue(
      new Promise<number>((res) => {
        resolveDelete = res;
      })
    );

    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    expect(screen.queryByLabelText('Deleting photo')).toBeNull();

    // Press delete but leave the mutation pending.
    pressDelete();
    await waitFor(() => expect(screen.getByLabelText('Deleting photo')).toBeTruthy());

    // Resolving the delete clears the overlay.
    resolveDelete(1);
    await waitFor(() => expect(screen.queryByLabelText('Deleting photo')).toBeNull());
  });
});
