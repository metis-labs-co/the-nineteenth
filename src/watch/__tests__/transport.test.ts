import { createNullTransport, isWatchNavigate } from '../transport';

describe('createNullTransport', () => {
  it('reports unsupported and no-ops without throwing', () => {
    const t = createNullTransport();
    expect(t.isSupported()).toBe(false);
    expect(() => t.updateContext({} as any)).not.toThrow();
    const off = t.onMessage(() => {});
    expect(typeof off).toBe('function');
    off();
  });
});

describe('isWatchNavigate', () => {
  it('returns true for a navigate message', () => {
    expect(isWatchNavigate({ type: 'navigate', hole: 5 })).toBe(true);
  });
  it('returns false for a score write (no type field)', () => {
    expect(isWatchNavigate({ clientWriteId: 'w1', hole: 5, playerId: 'p', strokes: 4 })).toBe(false);
  });
  it('returns false for junk / wrong shape', () => {
    expect(isWatchNavigate(null)).toBe(false);
    expect(isWatchNavigate({ type: 'navigate' })).toBe(false); // missing hole
    expect(isWatchNavigate({ type: 'other', hole: 1 })).toBe(false);
  });
});
