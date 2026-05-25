import { render, screen, fireEvent } from '@testing-library/react-native';
import { RoundPhotoViewer } from './RoundPhotoViewer';

jest.mock('@/components/common', () => ({
  SystemModalTheme: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const photos = [
  { id: 'p1', url: 'http://x/p1.jpg' },
  { id: 'p2', url: 'http://x/p2.jpg' },
];

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
});
