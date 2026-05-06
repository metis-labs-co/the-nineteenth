import { Linking, Platform, Alert } from 'react-native';
import Purchases from 'react-native-purchases';

// iOS: Opens directly to subscription management
const IOS_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

// Android: Opens Play Store subscriptions (future support)
const ANDROID_SUBSCRIPTIONS_URL =
  'https://play.google.com/store/account/subscriptions';

/**
 * Opens the App Store (iOS) or Play Store (Android) subscription management screen.
 *
 * On iOS, prefers StoreKit's native manage-subscriptions sheet via RevenueCat.
 * That sheet is environment-aware (production / sandbox / TestFlight), which the
 * `apps.apple.com` URL is not — production-only URLs hide TestFlight/sandbox
 * subscriptions, so testers cannot find their plan to downgrade.
 *
 * Falls back to the App Store URL if StoreKit isn't available (RevenueCat not
 * initialized, iOS too old, etc.).
 *
 * @returns Promise<boolean> - true if the management UI was opened successfully
 */
export async function openAppStoreSubscriptionSettings(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    try {
      await Purchases.showManageSubscriptions();
      return true;
    } catch (error) {
      console.warn(
        '[openAppStoreSubscriptionSettings] StoreKit sheet unavailable, falling back to URL:',
        error
      );
    }
  }

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
