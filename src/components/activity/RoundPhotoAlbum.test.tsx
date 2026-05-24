import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RoundPhotoAlbum } from './RoundPhotoAlbum';

const mockOpenMenu = jest.fn();
const mockDeleteMutate = jest.fn();

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
  useDeleteRoundPhoto: () => ({ mutate: mockDeleteMutate }),
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

jest.mock('@/components/common', () => {
  const { View } = require('react-native');
  return {
    SectionHeader: () => null,
    PhotoSourceMenu: () => <View testID="photo-source-menu" />,
  };
});

beforeEach(() => {
  jest.clearAllMocks();
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

  it('deletes a photo when the remove badge is confirmed', () => {
    render(<RoundPhotoAlbum roundId="r1" canAdd />);
    fireEvent.press(screen.getByLabelText('Remove photo'));
    const call = (Alert.alert as jest.Mock).mock.calls.find(([title]) => title === 'Delete photo');
    const del = call[2].find((b: { text: string }) => b.text === 'Delete');
    del.onPress();
    expect(mockDeleteMutate).toHaveBeenCalledWith({
      photoId: 'p1',
      roundId: 'r1',
      storagePath: 'rounds/r1/u1/p1.jpg',
    });
  });
});
