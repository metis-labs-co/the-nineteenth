import { Platform } from 'react-native';
import type { WatchSnapshot, WatchScoreWrite, WatchAck, WatchNavigate } from './types';

export function isWatchNavigate(msg: unknown): msg is WatchNavigate {
  return (
    typeof msg === 'object' && msg !== null &&
    (msg as { type?: unknown }).type === 'navigate' &&
    Number.isInteger((msg as { hole?: unknown }).hole)
  );
}

export interface WatchTransport {
  isSupported(): boolean;
  updateContext(snapshot: WatchSnapshot): void;          // applicationContext
  onMessage(handler: (msg: WatchScoreWrite) => void): () => void; // transferUserInfo + message
  onNavigate(handler: (nav: WatchNavigate) => void): () => void;
  sendAck(ack: WatchAck): void;                           // sendMessage when reachable
}

export function createNullTransport(): WatchTransport {
  return {
    isSupported: () => false,
    updateContext: () => {},
    onMessage: () => () => {},
    onNavigate: () => () => {},
    sendAck: () => {},
  };
}

export function createWatchConnectivityTransport(): WatchTransport {
  if (Platform.OS !== 'ios') return createNullTransport();
  // Lazy require: never loaded on Android/test. The library reads its native
  // module at import time via TurboModuleRegistry.getEnforcing('WatchConnectivity'),
  // which throws when that module isn't in the binary — notably Expo Go, which
  // can't load custom native modules. Catch it and fall back to the no-op
  // transport so the app runs in Expo Go; the watch bridge only works in a dev
  // client / native build.
  let rnwc: any;
  try {
    rnwc = require('react-native-watch-connectivity');
  } catch {
    if (__DEV__) {
      console.warn(
        '[watch] react-native-watch-connectivity native module unavailable ' +
          '(expected in Expo Go) — watch bridge disabled. Use a dev client or ' +
          'native build to test the Apple Watch companion.',
      );
    }
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
    onMessage: (handler) => subscribe((m) => !isWatchNavigate(m), (m) => handler(m as WatchScoreWrite)),
    onNavigate: (handler) => subscribe(isWatchNavigate, (m) => handler(m as WatchNavigate)),
    sendAck: (ack) => {
      if (rnwc.sendMessage) rnwc.sendMessage(ack as any, () => {}, () => {});
    },
  };
}
