import { Platform } from 'react-native';
import { isExpoGo } from '@/utils/expoGo';
import type { WatchSnapshot, WatchScoreWrite, WatchAck, WatchNavigate, WatchSelectRound } from './types';

function warnUnavailable(module: string): void {
  if (__DEV__) {
    console.warn(
      `[watch] ${module} native module unavailable (expected in Expo Go) — ` +
        'watch bridge disabled. Use a dev client or native build to test the watch.',
    );
  }
}

export function isWatchNavigate(msg: unknown): msg is WatchNavigate {
  return (
    typeof msg === 'object' && msg !== null &&
    (msg as { type?: unknown }).type === 'navigate' &&
    Number.isInteger((msg as { hole?: unknown }).hole)
  );
}

export function isWatchSelectRound(msg: unknown): msg is WatchSelectRound {
  const m = msg as { type?: unknown; roundId?: unknown };
  return (
    typeof msg === 'object' && msg !== null &&
    m.type === 'selectRound' &&
    typeof m.roundId === 'string' && m.roundId.length > 0
  );
}

export interface WatchTransport {
  isSupported(): boolean;
  updateContext(snapshot: WatchSnapshot): void;          // applicationContext
  onMessage(handler: (msg: WatchScoreWrite) => void): () => void; // transferUserInfo + message
  onNavigate(handler: (nav: WatchNavigate) => void): () => void;
  onSelectRound(handler: (sel: WatchSelectRound) => void): () => void;
  sendAck(ack: WatchAck): void;                           // sendMessage when reachable
}

export function createNullTransport(): WatchTransport {
  return {
    isSupported: () => false,
    updateContext: () => {},
    onMessage: () => () => {},
    onNavigate: () => () => {},
    onSelectRound: () => () => {},
    sendAck: () => {},
  };
}

export function createWatchConnectivityTransport(): WatchTransport {
  if (Platform.OS !== 'ios') return createNullTransport();
  // Expo Go can't load custom native modules, and the failing lazy require is
  // NOT reliably catchable: the library reads its native module at import time
  // via TurboModuleRegistry.getEnforcing('WatchConnectivity'), and when that
  // throws outside the initial bundle load, Metro's guarded require reports it
  // through ErrorUtils (red LogBox error) and returns undefined instead of
  // rethrowing into our try/catch. So skip the require entirely in Expo Go;
  // the watch bridge only works in a dev client / native build.
  if (isExpoGo) {
    warnUnavailable('react-native-watch-connectivity');
    return createNullTransport();
  }
  let rnwc: any;
  try {
    rnwc = require('react-native-watch-connectivity');
  } catch {
    warnUnavailable('react-native-watch-connectivity');
    return createNullTransport();
  }
  // Metro's guarded require can swallow a module-eval error and hand back
  // undefined (see above) — treat that the same as a failed require.
  if (!rnwc?.watchEvents) {
    warnUnavailable('react-native-watch-connectivity');
    return createNullTransport();
  }
  const subscribe = (predicate: (m: any) => boolean, cb: (m: any) => void) => {
    const fwd = (m: any) => { if (predicate(m)) cb(m); };
    const a = rnwc.watchEvents.addListener('message', fwd);
    const b = rnwc.watchEvents.addListener('user-info', fwd);
    return () => { a(); b(); };
  };
  return {
    isSupported: () => true,
    updateContext: (snapshot) => rnwc.updateApplicationContext(snapshot as any),
    onMessage: (handler) =>
      subscribe((m) => !isWatchNavigate(m) && !isWatchSelectRound(m), (m) => handler(m as WatchScoreWrite)),
    onNavigate: (handler) => subscribe(isWatchNavigate, (m) => handler(m as WatchNavigate)),
    onSelectRound: (handler) => subscribe(isWatchSelectRound, (m) => handler(m as WatchSelectRound)),
    sendAck: (ack) => {
      if (rnwc.sendMessage) rnwc.sendMessage(ack as any, () => {}, () => {});
    },
  };
}

export function createWearTransport(): WatchTransport {
  if (Platform.OS !== 'android') return createNullTransport();
  // Lazy require of the local Expo module: only loaded on Android, and never
  // imported on iOS (where the native module is absent). Skipped in Expo Go
  // (same Metro guarded-require caveat as the iOS path above).
  if (isExpoGo) {
    warnUnavailable('wear-bridge');
    return createNullTransport();
  }
  let bridge: any;
  try {
    bridge = require('../../modules/wear-bridge').default;
  } catch {
    warnUnavailable('wear-bridge');
    return createNullTransport();
  }
  if (!bridge) {
    warnUnavailable('wear-bridge');
    return createNullTransport();
  }
  const subscribe = (predicate: (m: any) => boolean, cb: (m: any) => void) => {
    const sub = bridge.addListener('onMessage', (e: { json: string }) => {
      let msg: any;
      try { msg = JSON.parse(e.json); } catch { return; }
      if (predicate(msg)) cb(msg);
    });
    return () => sub.remove();
  };
  return {
    isSupported: () => {
      try { return bridge.isSupported(); } catch { return false; }
    },
    updateContext: (snapshot) => { bridge.updateData(JSON.stringify(snapshot)); },
    onMessage: (handler) =>
      subscribe((m) => !isWatchNavigate(m) && !isWatchSelectRound(m), (m) => handler(m as WatchScoreWrite)),
    onNavigate: (handler) => subscribe(isWatchNavigate, (m) => handler(m as WatchNavigate)),
    onSelectRound: (handler) => subscribe(isWatchSelectRound, (m) => handler(m as WatchSelectRound)),
    sendAck: (ack) => { bridge.sendMessage(JSON.stringify(ack)); },
  };
}

/**
 * Platform-selecting transport factory. iOS → WatchConnectivity, Android → Wear
 * Data Layer, anything else → no-op. The whole src/watch pipeline above this is
 * platform-agnostic; only this line differs per OS.
 */
export function createWatchTransport(): WatchTransport {
  if (Platform.OS === 'ios') return createWatchConnectivityTransport();
  if (Platform.OS === 'android') return createWearTransport();
  return createNullTransport();
}
