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
  const rnwc = require('react-native-watch-connectivity'); // lazy: never loaded on Android/test
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
