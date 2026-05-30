import { render, screen, fireEvent } from '@testing-library/react-native';
import { RoundPhotoBanner } from './RoundPhotoBanner';

jest.mock('@/context/ThemeContext', () => ({ useThemeColors: () => ({ white: '#fff' }) }));
jest.mock('@/hooks/activity', () => ({
  useRoundPhotos: () => ({
    data: [{ id: 'p1', storage_path: 'rounds/r1/u1/p1.jpg', url: 'http://x/p1.jpg' }],
  }),
  signFullPhotos: jest.fn(() => Promise.resolve(new Map())),
}));
jest.mock('@/components/common', () => ({
  SystemModalTheme: ({ children }: { children: React.ReactNode }) => children,
  AppImage: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('RoundPhotoBanner', () => {
  it('calls onPress instead of opening the viewer when onPress is provided', () => {
    const onPress = jest.fn();
    render(<RoundPhotoBanner roundId="r1" onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('View round photo'));
    expect(onPress).toHaveBeenCalled();
    expect(screen.queryByLabelText('Close photo viewer')).toBeNull();
  });

  it('opens the viewer when onPress is not provided', () => {
    render(<RoundPhotoBanner roundId="r1" />);
    fireEvent.press(screen.getByLabelText('View round photo'));
    expect(screen.getByLabelText('Close photo viewer')).toBeTruthy();
  });
});
