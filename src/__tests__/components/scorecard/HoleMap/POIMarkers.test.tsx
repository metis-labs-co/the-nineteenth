import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TeePOIMarker, GreenPOIMarker } from '@/components/scorecard/HoleMap';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    primary: '#16a34a',
    success: '#22c55e',
    textSecondary: '#6b7280',
    surface: '#ffffff',
    textPrimary: '#111827',
  }),
}));

const coord = { latitude: -37.81, longitude: 144.96 };

describe('TeePOIMarker', () => {
  it('renders with the correct testID variant per type', () => {
    const { getByTestId, rerender } = render(
      <TeePOIMarker type="tee_back" coordinate={coord} onPress={() => {}} />
    );
    expect(getByTestId('tee-poi-tee_back')).toBeTruthy();
    rerender(<TeePOIMarker type="tee_front" coordinate={coord} onPress={() => {}} />);
    expect(getByTestId('tee-poi-tee_front')).toBeTruthy();
  });

  it('invokes onPress with the type when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <TeePOIMarker type="tee_back" coordinate={coord} onPress={onPress} />
    );
    fireEvent.press(getByTestId('tee-poi-tee_back'));
    expect(onPress).toHaveBeenCalledWith('tee_back');
  });

  it('shows selected styling when selected=true', () => {
    const { getByTestId } = render(
      <TeePOIMarker type="tee_back" coordinate={coord} selected onPress={() => {}} />
    );
    expect(getByTestId('tee-poi-tee_back-selected')).toBeTruthy();
  });
});

describe('GreenPOIMarker', () => {
  it('renders with the correct testID variant per type', () => {
    const { getByTestId, rerender } = render(
      <GreenPOIMarker type="green_front" coordinate={coord} onPress={() => {}} />
    );
    expect(getByTestId('green-poi-green_front')).toBeTruthy();
    rerender(<GreenPOIMarker type="green_center" coordinate={coord} onPress={() => {}} />);
    expect(getByTestId('green-poi-green_center')).toBeTruthy();
    rerender(<GreenPOIMarker type="green_back" coordinate={coord} onPress={() => {}} />);
    expect(getByTestId('green-poi-green_back')).toBeTruthy();
  });

  it('invokes onPress with the type when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <GreenPOIMarker type="green_front" coordinate={coord} onPress={onPress} />
    );
    fireEvent.press(getByTestId('green-poi-green_front'));
    expect(onPress).toHaveBeenCalledWith('green_front');
  });

  it('shows selected styling when selected=true', () => {
    const { getByTestId } = render(
      <GreenPOIMarker type="green_center" coordinate={coord} selected onPress={() => {}} />
    );
    expect(getByTestId('green-poi-green_center-selected')).toBeTruthy();
  });
});
