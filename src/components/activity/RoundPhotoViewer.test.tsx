import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { RoundPhotoViewer } from './RoundPhotoViewer';

const mockSignFullPhotos = jest.fn((_paths: string[]) =>
  Promise.resolve(new Map<string, string>())
);

jest.mock('@/components/common', () => ({
  SystemModalTheme: ({ children }: { children: React.ReactNode }) => children,
  AppImage: () => null,
}));
jest.mock('@/hooks/activity', () => ({
  signFullPhotos: (paths: string[]) => mockSignFullPhotos(paths),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const photos = [
  { id: 'p1', storagePath: 'rounds/r1/u1/p1.jpg', thumbUrl: 'http://x/p1-thumb.jpg' },
  { id: 'p2', storagePath: 'rounds/r1/u1/p2.jpg', thumbUrl: 'http://x/p2-thumb.jpg' },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RoundPhotoViewer', () => {
  it('shows the viewer (close button) when open', () => {
    render(<RoundPhotoViewer photos={photos} index={0} onClose={jest.fn()} />);
    expect(screen.getByLabelText('Close photo viewer')).toBeTruthy();
  });

  it('renders nothing when closed (index null)', () => {
    render(<RoundPhotoViewer photos={photos} index={null} onClose={jest.fn()} />);
    expect(screen.queryByLabelText('Close photo viewer')).toBeNull();
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    render(<RoundPhotoViewer photos={photos} index={0} onClose={onClose} />);
    fireEvent.press(screen.getByLabelText('Close photo viewer'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not sign full-res photos while closed', () => {
    render(<RoundPhotoViewer photos={photos} index={null} onClose={jest.fn()} />);
    expect(mockSignFullPhotos).not.toHaveBeenCalled();
  });

  it('signs full-res for the opened photo and its neighbors when opened', async () => {
    render(<RoundPhotoViewer photos={photos} index={0} onClose={jest.fn()} />);
    await waitFor(() => expect(mockSignFullPhotos).toHaveBeenCalled());
    // index 0 → wants paths for index 0 and 1 (no -1).
    expect(mockSignFullPhotos).toHaveBeenCalledWith([
      'rounds/r1/u1/p1.jpg',
      'rounds/r1/u1/p2.jpg',
    ]);
  });
});
