import { createNullTransport } from '../transport';

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
