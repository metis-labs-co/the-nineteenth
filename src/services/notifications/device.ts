/**
 * Device Detection
 *
 * Physical device detection and device info for push token registration.
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';

// =====================================================
// DEVICE DETECTION
// =====================================================

/**
 * Check if running on a physical device
 *
 * Push notifications only work on physical devices.
 * Simulators/emulators will fail to get a push token.
 *
 * @returns true if running on a physical device
 */
export function isPhysicalDevice(): boolean {
  return Device.isDevice;
}

/**
 * Get device information for token registration
 */
export function getDeviceInfo(): { deviceId: string | null; deviceName: string | null; platform: 'ios' | 'android' | null } {
  return {
    deviceId: Device.osBuildId ?? Device.modelId ?? null,
    deviceName: Device.deviceName ?? Device.modelName ?? null,
    platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : null,
  };
}
