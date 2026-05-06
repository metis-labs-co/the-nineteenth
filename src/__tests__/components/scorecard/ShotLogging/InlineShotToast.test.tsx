import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InlineShotToast } from '@/components/scorecard/ShotLogging/InlineShotToast';
import { useShotLoggingUiStore } from '@/store/shotLoggingUiStore';

// Mock the mutation since the renderer instantiates it.
const mockMutate = jest.fn();
jest.mock('@/hooks/shots', () => {
  const actual = jest.requireActual('@/hooks/shots');
  return {
    ...actual,
    useSetShotBunker: () => ({ mutate: mockMutate }),
    useDeleteShot: () => ({ mutate: jest.fn() }),
  };
});

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('InlineShotToast — bunker prompt variant', () => {
  beforeEach(() => {
    mockMutate.mockReset();
    useShotLoggingUiStore.getState().clearToast();
    useShotLoggingUiStore.setState((s) => ({ ...s, bunkerPromptCooldown: new Set() }));
  });

  it('renders "Was that a bunker shot?" when variant is bunkerPrompt', () => {
    act(() => {
      useShotLoggingUiStore.getState().showBunkerPrompt({
        shotId: 'shot-1',
        sequence: 3,
        roundId: 'r1',
        holeNumber: 7,
      });
    });

    const { getByText } = render(<InlineShotToast />, { wrapper: makeWrapper() });
    expect(getByText('Was that a bunker shot?')).toBeTruthy();
    expect(getByText('Yes')).toBeTruthy();
    expect(getByText('No')).toBeTruthy();
  });

  it('Yes tap fires useSetShotBunker mutation and morphs to success', () => {
    act(() => {
      useShotLoggingUiStore.getState().showBunkerPrompt({
        shotId: 'shot-1',
        sequence: 3,
        roundId: 'r1',
        holeNumber: 7,
      });
    });

    const { getByTestId } = render(<InlineShotToast />, { wrapper: makeWrapper() });
    act(() => {
      fireEvent.press(getByTestId('inline-shot-toast-bunker-yes'));
    });

    expect(mockMutate).toHaveBeenCalledWith({ shotId: 'shot-1' });
    const state = useShotLoggingUiStore.getState();
    expect(state.variant).toBe('success');
    expect(state.lastFromBunker).toBe(true);
    expect(state.bunkerPromptCooldown.has('r1:7')).toBe(false);
  });

  it('No tap adds (round,hole) to cooldown and clears toast', () => {
    act(() => {
      useShotLoggingUiStore.getState().showBunkerPrompt({
        shotId: 'shot-1',
        sequence: 3,
        roundId: 'r1',
        holeNumber: 7,
      });
    });

    const { getByTestId } = render(<InlineShotToast />, { wrapper: makeWrapper() });
    act(() => {
      fireEvent.press(getByTestId('inline-shot-toast-bunker-no'));
    });

    expect(mockMutate).not.toHaveBeenCalled();
    const state = useShotLoggingUiStore.getState();
    expect(state.bunkerPromptCooldown.has('r1:7')).toBe(true);
    expect(state.dismissAt).toBeNull();
  });
});
