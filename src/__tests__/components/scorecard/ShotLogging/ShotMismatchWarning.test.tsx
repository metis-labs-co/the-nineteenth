import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ShotMismatchWarning } from '@/components/scorecard/ShotLogging/ShotMismatchWarning';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    textPrimary: '#111827',
    primary: '#16a34a',
  }),
}));

describe('ShotMismatchWarning', () => {
  it('renders nothing when score is null', () => {
    const { queryByTestId } = render(
      <ShotMismatchWarning shotsLogged={3} strokes={null} />
    );
    expect(queryByTestId('shot-mismatch-warning')).toBeNull();
  });

  it('renders nothing when shots equal strokes', () => {
    const { queryByTestId } = render(<ShotMismatchWarning shotsLogged={5} strokes={5} />);
    expect(queryByTestId('shot-mismatch-warning')).toBeNull();
  });

  it('renders when shots and strokes differ', () => {
    const { getByTestId, getByText } = render(
      <ShotMismatchWarning shotsLogged={4} strokes={5} />
    );
    expect(getByTestId('shot-mismatch-warning')).toBeTruthy();
    expect(getByText(/Logged 4 shots · entered 5 strokes/)).toBeTruthy();
  });

  it('uses singular form for 1', () => {
    const { getByText } = render(<ShotMismatchWarning shotsLogged={1} strokes={2} />);
    expect(getByText(/Logged 1 shot · entered 2 strokes/)).toBeTruthy();
  });

  it('does not render the open-map action when onAddShot is omitted', () => {
    const { queryByTestId } = render(<ShotMismatchWarning shotsLogged={4} strokes={5} />);
    expect(queryByTestId('shot-mismatch-add')).toBeNull();
  });

  it('invokes onAddShot when action pressed', () => {
    const onAddShot = jest.fn();
    const { getByTestId } = render(
      <ShotMismatchWarning shotsLogged={4} strokes={5} onAddShot={onAddShot} />
    );
    fireEvent.press(getByTestId('shot-mismatch-add'));
    expect(onAddShot).toHaveBeenCalledTimes(1);
  });
});
