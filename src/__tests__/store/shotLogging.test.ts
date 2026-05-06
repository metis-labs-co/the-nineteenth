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
    useShotLoggingUiStore.setState((s) => ({ ...s, bunkerPromptCooldown: new Set<string>() }));
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

  it('showBunkerPrompt sets variant to bunkerPrompt with shot context', () => {
    useShotLoggingUiStore.getState().showBunkerPrompt({
      shotId: 'shot-x',
      sequence: 4,
      roundId: 'r1',
      holeNumber: 7,
    });
    const state = useShotLoggingUiStore.getState();
    expect(state.variant).toBe('bunkerPrompt');
    expect(state.lastShotId).toBe('shot-x');
    expect(state.lastSequence).toBe(4);
    expect(state.lastShotContext).toEqual({ roundId: 'r1', holeNumber: 7 });
    expect(state.dismissAt).not.toBeNull();
  });

  it('dismissBunkerPrompt({ confirmed: false }) adds (round,hole) to cooldown', () => {
    useShotLoggingUiStore.getState().showBunkerPrompt({
      shotId: 'shot-x',
      sequence: 1,
      roundId: 'r1',
      holeNumber: 7,
    });
    useShotLoggingUiStore.getState().dismissBunkerPrompt({ confirmed: false });
    const state = useShotLoggingUiStore.getState();
    expect(state.bunkerPromptCooldown.has('r1:7')).toBe(true);
    expect(state.variant).toBe('success'); // reset to default
    expect(state.dismissAt).toBeNull();
  });

  it('dismissBunkerPrompt({ confirmed: true }) does NOT add to cooldown and morphs to success', () => {
    useShotLoggingUiStore.getState().showBunkerPrompt({
      shotId: 'shot-x',
      sequence: 1,
      roundId: 'r1',
      holeNumber: 7,
    });
    useShotLoggingUiStore.getState().dismissBunkerPrompt({ confirmed: true });
    const state = useShotLoggingUiStore.getState();
    expect(state.bunkerPromptCooldown.has('r1:7')).toBe(false);
    expect(state.variant).toBe('success');
    expect(state.lastFromBunker).toBe(true);
    expect(state.dismissAt).not.toBeNull(); // morphs to success toast
  });

  it('clearBunkerCooldownForRound removes only that round entries', () => {
    useShotLoggingUiStore.setState((s) => ({
      ...s,
      bunkerPromptCooldown: new Set(['r1:5', 'r1:7', 'r2:3']),
    }));
    useShotLoggingUiStore.getState().clearBunkerCooldownForRound('r1');
    const set = useShotLoggingUiStore.getState().bunkerPromptCooldown;
    expect(set.has('r1:5')).toBe(false);
    expect(set.has('r1:7')).toBe(false);
    expect(set.has('r2:3')).toBe(true);
  });
});
