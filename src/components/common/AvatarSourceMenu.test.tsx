import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AvatarSourceMenu } from './AvatarSourceMenu';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#FFF', textPrimary: '#111', textSecondary: '#666',
    primary: '#1E7F5E', error: '#D33', border: '#E0E0E0',
  }),
}));

// Render the BottomSheet as a passthrough so its children are queryable.
jest.mock('./BottomSheet', () => {
  const { View } = require('react-native');
  return { BottomSheet: ({ children, visible }: any) => (visible ? <View>{children}</View> : null) };
});

function setup(overrides = {}) {
  const props = {
    visible: true,
    onClose: jest.fn(),
    onTakePhoto: jest.fn(),
    onChooseFromLibrary: jest.fn(),
    onChooseAvatar: jest.fn(),
    onRemovePhoto: jest.fn(),
    canRemove: true,
    ...overrides,
  };
  render(<AvatarSourceMenu {...props} />);
  return props;
}

describe('AvatarSourceMenu', () => {
  it('renders the photo source options', () => {
    setup();
    expect(screen.getByText('Take Photo')).toBeTruthy();
    expect(screen.getByText('Choose from Library')).toBeTruthy();
    expect(screen.getByText('Choose an Avatar')).toBeTruthy();
  });

  it('fires the matching callback when an option is pressed', () => {
    const props = setup();
    fireEvent.press(screen.getByText('Take Photo'));
    expect(props.onTakePhoto).toHaveBeenCalled();
    fireEvent.press(screen.getByText('Choose from Library'));
    expect(props.onChooseFromLibrary).toHaveBeenCalled();
    fireEvent.press(screen.getByText('Choose an Avatar'));
    expect(props.onChooseAvatar).toHaveBeenCalled();
  });

  it('shows Remove Photo only when canRemove is true', () => {
    const props = setup({ canRemove: true });
    fireEvent.press(screen.getByText('Remove Photo'));
    expect(props.onRemovePhoto).toHaveBeenCalled();
  });

  it('hides Remove Photo when canRemove is false', () => {
    setup({ canRemove: false });
    expect(screen.queryByText('Remove Photo')).toBeNull();
  });
});
