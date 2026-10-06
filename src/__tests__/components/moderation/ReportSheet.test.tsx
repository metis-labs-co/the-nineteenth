// src/__tests__/components/moderation/ReportSheet.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { ReportSheet } from '@/components/moderation/ReportSheet';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    textPrimary: '#000', textSecondary: '#666', primary: '#2563eb',
    surface: '#fff', border: '#ddd', background: '#fff', white: '#fff', error: '#f00',
  }),
}));

describe('ReportSheet', () => {
  it('renders nothing when hidden', () => {
    const { toJSON } = render(
      <ReportSheet visible={false} onSubmit={jest.fn()} onDismiss={jest.fn()} />
    );
    expect(toJSON()).toBeNull();
  });

  it('collects an optional note', () => {
    render(<ReportSheet visible onSubmit={jest.fn()} onDismiss={jest.fn()} />);
    expect(screen.getByLabelText('Add detail (optional)')).toBeTruthy();
  });

  it('offers every reason', () => {
    render(<ReportSheet visible onSubmit={jest.fn()} onDismiss={jest.fn()} />);
    ['Offensive', 'Harassment', 'Spam', 'Nudity', 'Other'].forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  it('submits the chosen reason', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<ReportSheet visible onSubmit={onSubmit} onDismiss={jest.fn()} />);
    fireEvent.press(screen.getByText('Harassment'));
    fireEvent.press(screen.getByText('Report'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('harassment', undefined));
  });

  it('passes an optional note through', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<ReportSheet visible onSubmit={onSubmit} onDismiss={jest.fn()} />);
    fireEvent.press(screen.getByText('Other'));
    fireEvent.changeText(screen.getByLabelText('Add detail (optional)'), 'targeted abuse');
    fireEvent.press(screen.getByText('Report'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('other', 'targeted abuse'));
  });

  it('sends undefined rather than an empty string when the note is blank', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<ReportSheet visible onSubmit={onSubmit} onDismiss={jest.fn()} />);
    fireEvent.press(screen.getByText('Spam'));
    fireEvent.changeText(screen.getByLabelText('Add detail (optional)'), '   ');
    fireEvent.press(screen.getByText('Report'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('spam', undefined));
  });

  it('does not submit until a reason is chosen', () => {
    const onSubmit = jest.fn();
    render(<ReportSheet visible onSubmit={onSubmit} onDismiss={jest.fn()} />);
    fireEvent.press(screen.getByText('Report'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
