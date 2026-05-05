import { useShotLoggingPrefStore } from '@/store/shotLoggingPrefStore';
import { useShotLoggingUiStore } from '@/store/shotLoggingUiStore';

describe('shotLoggingPrefStore', () => {
  beforeEach(() => {
    useShotLoggingPrefStore.setState({ byRound: {} });
  });

  it('isTracking defaults to false', () => {
    expect(useShotLoggingPrefStore.getState().isTracking('r1')).toBe(false);
  });

  it('setTrackShots flips the flag', () => {
    useShotLoggingPrefStore.getState().setTrackShots('r1', true);
    expect(useShotLoggingPrefStore.getState().isTracking('r1')).toBe(true);
    useShotLoggingPrefStore.getState().setTrackShots('r1', false);
    expect(useShotLoggingPrefStore.getState().isTracking('r1')).toBe(false);
  });

  it('clear removes the round entry', () => {
    useShotLoggingPrefStore.getState().setTrackShots('r1', true);
    useShotLoggingPrefStore.getState().clear('r1');
    expect(useShotLoggingPrefStore.getState().isTracking('r1')).toBe(false);
    expect('r1' in useShotLoggingPrefStore.getState().byRound).toBe(false);
  });

  it('per-round isolation', () => {
    useShotLoggingPrefStore.getState().setTrackShots('r1', true);
    expect(useShotLoggingPrefStore.getState().isTracking('r1')).toBe(true);
    expect(useShotLoggingPrefStore.getState().isTracking('r2')).toBe(false);
  });
});

describe('shotLoggingUiStore', () => {
  beforeEach(() => {
    useShotLoggingUiStore.getState().clearToast();
  });

  it('starts empty', () => {
    expect(useShotLoggingUiStore.getState().lastShotId).toBeNull();
    expect(useShotLoggingUiStore.getState().dismissAt).toBeNull();
  });

  it('showToast populates id, sequence, context, and dismiss deadline', () => {
    const before = Date.now();
    useShotLoggingUiStore.getState().showToast({
      shotId: 'shot-1',
      sequence: 3,
      roundId: 'r1',
      holeNumber: 7,
      durationMs: 1000,
    });
    const state = useShotLoggingUiStore.getState();
    expect(state.lastShotId).toBe('shot-1');
    expect(state.lastSequence).toBe(3);
    expect(state.lastShotContext).toEqual({ roundId: 'r1', holeNumber: 7 });
    expect(state.dismissAt).not.toBeNull();
    expect(state.dismissAt!).toBeGreaterThanOrEqual(before + 1000);
  });

  it('clearToast resets all fields', () => {
    useShotLoggingUiStore.getState().showToast({
      shotId: 'shot-1',
      sequence: 1,
      roundId: 'r1',
      holeNumber: 7,
    });
    useShotLoggingUiStore.getState().clearToast();
    const state = useShotLoggingUiStore.getState();
    expect(state.lastShotId).toBeNull();
    expect(state.lastShotContext).toBeNull();
    expect(state.lastSequence).toBeNull();
    expect(state.dismissAt).toBeNull();
  });

  it('showToast records lastFromBunker when fromBunker=true', () => {
    useShotLoggingUiStore.getState().showToast({
      shotId: 'shot-1',
      sequence: 1,
      roundId: 'r1',
      holeNumber: 7,
      fromBunker: true,
    });
    expect(useShotLoggingUiStore.getState().lastFromBunker).toBe(true);
  });

  it('lastFromBunker defaults to false when fromBunker not provided', () => {
    useShotLoggingUiStore.getState().showToast({
      shotId: 'shot-2',
      sequence: 2,
      roundId: 'r1',
      holeNumber: 7,
    });
    expect(useShotLoggingUiStore.getState().lastFromBunker).toBe(false);
  });
});
