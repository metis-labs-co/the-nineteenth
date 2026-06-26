import { requireOptionalNativeModule } from 'expo';

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
 *
 * Resolved via `requireOptionalNativeModule` (not `requireNativeModule`) so a
 * binary without the WearBridge native module — e.g. a stale dev build, or an
 * OTA-updated JS bundle that references it ahead of the native rebuild —
 * yields `null` rather than throwing. The throw is NOT catchable by callers:
 * Metro's guarded require reports a module-eval throw through the global error
 * handler instead of rethrowing, so it crashes the app on load (with no
 * LogBox in release). `createWearTransport()` already null-checks the default
 * export and degrades to a no-op transport.
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

export default requireOptionalNativeModule<WearBridgeModule>('WearBridge');
