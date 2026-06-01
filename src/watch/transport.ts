import { Platform } from 'react-native';
import type { WatchSnapshot, WatchScoreWrite, WatchAck } from './types';

export interface WatchTransport {
  isSupported(): boolean;
  updateContext(snapshot: WatchSnapshot): void;          // applicationContext
  onMessage(handler: (msg: WatchScoreWrite) => void): () => void; // transferUserInfo + message
  sendAck(ack: WatchAck): void;                           // sendMessage when reachable
}

export function createNullTransport(): WatchTransport {
  return {
    isSupported: () => false,
    updateContext: () => {},
    onMessage: () => () => {},
    sendAck: () => {},
  };
}

export function createWatchConnectivityTransport(): WatchTransport {
  if (Platform.OS !== 'ios') return createNullTransport();
  const rnwc = require('react-native-watch-connectivity'); // lazy: never loaded on Android/test
  return {
    isSupported: () => true,
    updateContext: (snapshot) => rnwc.updateApplicationContext(snapshot as any),
    onMessage: (handler) => {
      const a = rnwc.watchEvents.addListener('message', (m: any) => handler(m as WatchScoreWrite));
      const b = rnwc.watchEvents.addListener('user-info', (m: any) => handler(m as WatchScoreWrite));
      return () => { a(); b(); };
    },
    sendAck: (ack) => {
      if (rnwc.sendMessage) rnwc.sendMessage(ack as any, () => {}, () => {});
    },
  };
}
