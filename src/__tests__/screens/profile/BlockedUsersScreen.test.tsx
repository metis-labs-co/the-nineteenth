// src/__tests__/screens/profile/BlockedUsersScreen.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import BlockedUsersScreen from '@/screens/profile/BlockedUsersScreen';

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    textPrimary: '#000', textSecondary: '#666', primary: '#2563eb',
    surface: '#fff', border: '#ddd', background: '#fff', white: '#fff', error: '#f00',
  }),
}));

const mockUnblock = jest.fn().mockResolvedValue(undefined);
let mockBlocked: unknown[] = [];
jest.mock('@/hooks/moderation', () => ({
  useBlockedUsers: () => ({ data: mockBlocked, isLoading: false }),
  useBlockUser: () => ({ block: jest.fn(), unblock: mockUnblock, isBusy: false }),
}));

const navigation = { goBack: jest.fn() } as never;

describe('BlockedUsersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBlocked = [];
  });

  it('explains the empty state', () => {
    render(<BlockedUsersScreen navigation={navigation} />);
    expect(screen.getByText(/haven't blocked anyone/i)).toBeTruthy();
  });

  it('lists blocked players', () => {
    mockBlocked = [
      { blocked_id: 'p2', created_at: '2026-09-01T00:00:00Z', player: { id: 'p2', name: 'Alex', photo_url: null } },
    ];
    render(<BlockedUsersScreen navigation={navigation} />);
    expect(screen.getByText('Alex')).toBeTruthy();
  });

  it('unblocks on press', async () => {
    mockBlocked = [
      { blocked_id: 'p2', created_at: '2026-09-01T00:00:00Z', player: { id: 'p2', name: 'Alex', photo_url: null } },
    ];
    render(<BlockedUsersScreen navigation={navigation} />);
    fireEvent.press(screen.getByLabelText('Unblock Alex'));
    await waitFor(() => expect(mockUnblock).toHaveBeenCalledWith('p2'));
  });
});
