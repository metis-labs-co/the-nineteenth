import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PhotoSourceMenu } from './PhotoSourceMenu';

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
    ...overrides,
  };
  render(<PhotoSourceMenu {...props} />);
  return props;
}

describe('PhotoSourceMenu', () => {
  it('renders both photo source options', () => {
    setup();
    expect(screen.getByText('Take Photo')).toBeTruthy();
    expect(screen.getByText('Choose from Library')).toBeTruthy();
  });

  it('fires the matching callback when an option is pressed', () => {
    const props = setup();
    fireEvent.press(screen.getByText('Take Photo'));
    expect(props.onTakePhoto).toHaveBeenCalled();
    fireEvent.press(screen.getByText('Choose from Library'));
    expect(props.onChooseFromLibrary).toHaveBeenCalled();
  });

  it('renders nothing when not visible', () => {
    setup({ visible: false });
    expect(screen.queryByText('Take Photo')).toBeNull();
  });
});
