import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import DeveloperScreen from '@/screens/profile/DeveloperScreen';
import type { PendingSync } from '@/types';

const mockListFailedSyncs = jest.fn();
jest.mock('@/services/offline/sync', () => ({
  listFailedSyncs: () => mockListFailedSyncs(),
  clearSyncQueue: jest.fn(),
  manualSync: jest.fn(),
  discardFailedSync: jest.fn(),
  retryFailedSyncs: jest.fn(),
}));
jest.mock('@/services/offline/database', () => ({ markAllForResync: jest.fn() }));
jest.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => jest.fn(),
}));
jest.mock('@/hooks', () => ({
  useConfirmationDialog: () => ({
    dialogConfig: {}, showDialog: jest.fn(), showAlert: jest.fn(), dismissDialog: jest.fn(),
  }),
}));
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    textPrimary: '#000', textSecondary: '#666', primary: '#2563eb',
    surface: '#fff', border: '#ddd', background: '#fff', white: '#fff', error: '#f00',
  }),
}));
jest.mock('@/components/common', () => {
  const { Text } = require('react-native');
  return { GolfBallLoader: () => null, ConfirmationDialog: () => null,
    SectionHeader: ({ title }: { title: string }) => <Text>{title}</Text> };
});
jest.mock('@/components/common/PageHeader', () => ({ PageHeader: () => null }));

describe('DeveloperScreen retained end uploads', () => {
  it('keeps malformed end rows visible without reading corrupt scorecard identity', async () => {
    const base = { action: 'update' as const, status: 'failed' as const, retryCount: 0,
      timestamp: new Date(), lastError: 'Malformed end_early round item' };
    mockListFailedSyncs.mockResolvedValue([
      { ...base, id: 1, type: 'scorecard', entityKey: 'round:round-123:end_early',
        data: { roundId: 42 }, endIntentRead: { rawData: '{"roundId":42}', decode: 'decoded' } },
      { ...base, id: 2, type: 'scorecard', data: { roundId: {} },
        endIntentRead: { rawData: '{"action":"end_early"}', decode: 'decoded' } },
      { ...base, id: 3, type: 'scorecard', data: { roundId: 'ordinary-round', player: { name: 'Alex' } } },
    ] satisfies PendingSync[]);

    render(<DeveloperScreen />);
    await waitFor(() => expect(screen.getByText('End round · round-12…')).toBeTruthy());
    expect(screen.getByText('End round · unknown round')).toBeTruthy();
    expect(screen.getByText('Alex · round ordinary…')).toBeTruthy();
    expect(screen.getByLabelText('Discard upload for End round · round-12…')).toBeTruthy();
  });
});
