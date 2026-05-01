import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NoCoordinatesFallback } from '@/components/scorecard/HoleMap/NoCoordinatesFallback';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    surface: '#ffffff',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    primary: '#16a34a',
    onPrimary: '#ffffff',
  }),
}));

describe('NoCoordinatesFallback', () => {
  it('renders the missing-coordinates message', () => {
    const { getByText } = render(<NoCoordinatesFallback onRequestBackfill={() => {}} />);
    expect(getByText(/no map data/i)).toBeTruthy();
  });

  it('invokes onRequestBackfill when CTA pressed', () => {
    const onRequestBackfill = jest.fn();
    const { getByLabelText } = render(
      <NoCoordinatesFallback onRequestBackfill={onRequestBackfill} />
    );
    fireEvent.press(getByLabelText(/try fetching coordinates/i));
    expect(onRequestBackfill).toHaveBeenCalledTimes(1);
  });
});
