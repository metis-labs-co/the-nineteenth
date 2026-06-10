import { Platform } from 'react-native';
import {
  createNullTransport,
  createWearTransport,
  createWatchTransport,
  isWatchNavigate,
} from '../transport';

const mockBridge = {
  isSupported: jest.fn(() => true),
  updateData: jest.fn(),
  sendMessage: jest.fn(),
  addListener: jest.fn() as jest.Mock,
};
// Path resolves to the same module transport.ts requires ('../../modules/wear-bridge').
jest.mock('../../../modules/wear-bridge', () => ({ __esModule: true, default: mockBridge }));

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
  it('returns false for a non-integer hole', () => {
    expect(isWatchNavigate({ type: 'navigate', hole: 1.5 })).toBe(false);
    expect(isWatchNavigate({ type: 'navigate', hole: NaN })).toBe(false);
  });
});

describe('Wear transport (Android)', () => {
  const originalOS = Platform.OS;
  beforeAll(() => {
    (Platform as { OS: string }).OS = 'android';
  });
  afterAll(() => {
    (Platform as { OS: string }).OS = originalOS;
  });
  // Native delivers one onMessage event to every registered listener; the mock
  // fans out the same way so a transport's onMessage + onNavigate both see it.
  let listeners: Array<(e: { json: string }) => void> = [];
  const emit = (e: { json: string }) => listeners.forEach((l) => l(e));
  beforeEach(() => {
    jest.clearAllMocks();
    listeners = [];
    mockBridge.addListener.mockImplementation((_evt: string, cb: (e: { json: string }) => void) => {
      listeners.push(cb);
      return { remove: jest.fn() };
    });
  });

  it('createWatchTransport selects the Wear bridge on Android', () => {
    const t = createWatchTransport();
    expect(t.isSupported()).toBe(true);
    expect(mockBridge.isSupported).toHaveBeenCalled();
  });

  it('updateContext serializes the snapshot to the bridge', () => {
    const snap = { rev: 2, currentHole: 7 } as never;
    createWearTransport().updateContext(snap);
    expect(mockBridge.updateData).toHaveBeenCalledWith(JSON.stringify(snap));
  });

  it('sendAck serializes the ack to the bridge', () => {
    const ack = { clientWriteId: 'w1', status: 'applied', rev: 3 } as never;
    createWearTransport().sendAck(ack);
    expect(mockBridge.sendMessage).toHaveBeenCalledWith(JSON.stringify(ack));
  });

  it('routes inbound messages: score-writes to onMessage, navigates to onNavigate', () => {
    const t = createWearTransport();
    const onMsg = jest.fn();
    const onNav = jest.fn();
    t.onMessage(onMsg);
    t.onNavigate(onNav);

    emit({ json: JSON.stringify({ clientWriteId: 'w', hole: 3, playerId: 'p', strokes: 4 }) });
    emit({ json: JSON.stringify({ type: 'navigate', hole: 5 }) });

    expect(onMsg).toHaveBeenCalledTimes(1);
    expect(onMsg).toHaveBeenCalledWith(expect.objectContaining({ clientWriteId: 'w' }));
    expect(onNav).toHaveBeenCalledTimes(1);
    expect(onNav).toHaveBeenCalledWith(expect.objectContaining({ type: 'navigate', hole: 5 }));
  });

  it('ignores malformed inbound JSON without throwing', () => {
    const onMsg = jest.fn();
    createWearTransport().onMessage(onMsg);
    expect(() => emit({ json: 'not json' })).not.toThrow();
    expect(onMsg).not.toHaveBeenCalled();
  });
});
