/**
 * SheetFooterActions component tests.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SheetFooterActions } from './SheetFooterActions';

const mockColors = {
  border: '#E5E7EB',
  gray300: '#D1D5DB',
  textSecondary: '#6B7280',
  primary: '#1E7F5E',
  white: '#FFFFFF',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

jest.mock('react-native-paper', () => {
  const { Text } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
  };
});

describe('SheetFooterActions', () => {
  it('renders Cancel and Save by default', () => {
    render(<SheetFooterActions onCancel={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('calls onCancel / onSave when the buttons are pressed', () => {
    const onCancel = jest.fn();
    const onSave = jest.fn();
    render(
      <SheetFooterActions onCancel={onCancel} onSave={onSave} testID="footer" />
    );

    fireEvent.press(screen.getByTestId('footer-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId('footer-save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('shows the saving label and disables both buttons while saving', () => {
    const onCancel = jest.fn();
    const onSave = jest.fn();
    render(
      <SheetFooterActions
        onCancel={onCancel}
        onSave={onSave}
        saving
        testID="footer"
      />
    );

    expect(screen.getByText('Saving…')).toBeTruthy();
    expect(screen.queryByText('Save')).toBeNull();

    // Disabled TouchableOpacity does not fire its handler.
    fireEvent.press(screen.getByTestId('footer-save'));
    fireEvent.press(screen.getByTestId('footer-cancel'));
    expect(onSave).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('supports custom labels', () => {
    render(
      <SheetFooterActions
        onCancel={jest.fn()}
        onSave={jest.fn()}
        cancelLabel="Discard"
        saveLabel="Apply"
      />
    );
    expect(screen.getByText('Discard')).toBeTruthy();
    expect(screen.getByText('Apply')).toBeTruthy();
  });
});
