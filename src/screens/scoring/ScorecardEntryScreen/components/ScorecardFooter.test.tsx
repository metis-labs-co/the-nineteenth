import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ScorecardFooter, ScorecardFooterProps } from './ScorecardFooter';

const mockColors = {
  surface: '#ffffff',
  border: '#e5e7eb',
  textPrimary: '#111827',
  primary: '#3b82f6',
  success: '#22c55e',
  white: '#ffffff',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

jest.mock('react-native-paper', () => {
  const { Text, View } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
    Icon: ({ source, ...props }: any) => <View testID={`icon-${source}`} {...props} />,
  };
});

describe('ScorecardFooter', () => {
  const defaultProps: ScorecardFooterProps = {
    currentHole: 1,
    onPreviousHole: jest.fn(),
    onNextHole: jest.fn(),
    onViewScorecard: jest.fn(),
    canGoPrevious: true,
    canGoNext: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the camera button when onAddPhotos is provided', () => {
    render(<ScorecardFooter {...defaultProps} onAddPhotos={jest.fn()} />);
    expect(screen.getByLabelText('Add round photos')).toBeTruthy();
    expect(screen.getByTestId('icon-camera-plus-outline')).toBeTruthy();
  });

  it('calls onAddPhotos when the camera button is pressed', () => {
    const onAddPhotos = jest.fn();
    render(<ScorecardFooter {...defaultProps} onAddPhotos={onAddPhotos} />);
    fireEvent.press(screen.getByLabelText('Add round photos'));
    expect(onAddPhotos).toHaveBeenCalledTimes(1);
  });

  it('does not render the camera button when onAddPhotos is omitted', () => {
    render(<ScorecardFooter {...defaultProps} />);
    expect(screen.queryByLabelText('Add round photos')).toBeNull();
    expect(screen.queryByTestId('icon-camera-plus-outline')).toBeNull();
  });
});
