import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * True when running inside the Expo Go sandbox (rather than a dev client or
 * native build). Expo Go cannot load custom native modules, so native-backed
 * features (watch bridge, RevenueCat IAP, etc.) must be gated behind this.
 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
