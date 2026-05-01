import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MapHeader } from '@/components/scorecard/HoleMap/MapHeader';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#ffffff',
    border: '#e5e7eb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
  }),
}));

describe('MapHeader', () => {
  it('shows hole number', () => {
    const { getByText } = render(
      <MapHeader holeNumber={7} canReset={false} onClose={() => {}} onReset={() => {}} />
    );
    expect(getByText('Hole 7')).toBeTruthy();
  });

  it('does not invoke onReset when canReset=false', () => {
    const onReset = jest.fn();
    const { getByLabelText } = render(
      <MapHeader holeNumber={7} canReset={false} onClose={() => {}} onReset={onReset} />
    );
    fireEvent.press(getByLabelText(/reset marker/i));
    expect(onReset).not.toHaveBeenCalled();
  });

  it('invokes onReset when canReset=true', () => {
    const onReset = jest.fn();
    const { getByLabelText } = render(
      <MapHeader holeNumber={7} canReset={true} onClose={() => {}} onReset={onReset} />
    );
    fireEvent.press(getByLabelText(/reset marker/i));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('invokes onClose when close pressed', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <MapHeader holeNumber={7} canReset={false} onClose={onClose} onReset={() => {}} />
    );
    fireEvent.press(getByLabelText(/close map/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
