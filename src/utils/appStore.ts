import { Linking, Platform, Alert } from 'react-native';

// iOS: Opens directly to subscription management
const IOS_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

// Android: Opens Play Store subscriptions (future support)
const ANDROID_SUBSCRIPTIONS_URL =
  'https://play.google.com/store/account/subscriptions';

/**
 * Opens the App Store (iOS) or Play Store (Android) subscription management screen.
 *
 * @returns Promise<boolean> - true if URL was opened successfully, false otherwise
 *
 * @example
 * ```tsx
 * import { openAppStoreSubscriptionSettings } from '@/utils';
 *
 * const handleManageSubscription = async () => {
 *   const success = await openAppStoreSubscriptionSettings();
 *   if (success) {
 *     console.log('Opened subscription settings');
 *   }
 * };
 * ```
 *
 * @remarks
 * - iOS Simulator: URL will open but may not show subscriptions (no App Store account)
 * - Real device: Opens App Store subscription management
 * - Android: Opens Play Store subscription page
 */
export async function openAppStoreSubscriptionSettings(): Promise<boolean> {
  const url = Platform.select({
    ios: IOS_SUBSCRIPTIONS_URL,
    android: ANDROID_SUBSCRIPTIONS_URL,
    default: IOS_SUBSCRIPTIONS_URL,
  });

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    } else {
      Alert.alert(
        'Unable to Open Settings',
        'Please go to Settings > Apple ID > Subscriptions to manage your subscription.',
        [{ text: 'OK' }]
      );
      return false;
    }
  } catch (error) {
    console.error('[openAppStoreSubscriptionSettings] Error:', error);
    Alert.alert(
      'Error',
      'Could not open subscription settings. Please try again.',
      [{ text: 'OK' }]
    );
    return false;
  }
}
