import { requireNativeModule } from 'expo';

/**
 * Android-only Wear OS Data Layer bridge (mirror of iOS react-native-watch-
 * connectivity for our purposes). Consumed lazily by
 * `src/watch/transport.ts` → `createWearTransport()`, which only loads it on
 * Android, so importing this on iOS (where the native module is absent) never
 * happens.
 *
 * Native surface:
 *   isSupported(): boolean
 *   updateData(json: string): Promise<void>   // DataClient "/snapshot"
 *   sendMessage(json: string): Promise<void>   // MessageClient "/ack"
 *   addListener('onMessage', cb: ({ json }) => void)  // "/score-write","/navigate"
 */
export interface WearBridgeModule {
  isSupported(): boolean;
  updateData(json: string): Promise<void>;
  sendMessage(json: string): Promise<void>;
  addListener(
    event: 'onMessage',
    listener: (payload: { json: string }) => void,
  ): { remove(): void };
}

export default requireNativeModule('WearBridge') as WearBridgeModule;
