import { Alert, Linking, Share } from 'react-native';

// WhatsApp group invite links look like https://chat.whatsapp.com/<code>.
// The code is URL-safe (letters, digits, underscore, hyphen). Newer links
// also append a query string like "?mode=gi_t" to flag group-invite mode.
// We accept an optional trailing slash and an optional query string. The
// trailing slash is stripped before saving; the query string is preserved
// because it can carry meaning to WhatsApp.
export const WHATSAPP_INVITE_PATTERN =
  /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{5,60}\/?(\?[A-Za-z0-9_=&%.-]+)?$/;

export function normalizeWhatsAppInvite(url: string): string {
  const trimmed = url.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function isValidWhatsAppInvite(url: string | null | undefined): boolean {
  if (!url) return false;
  return WHATSAPP_INVITE_PATTERN.test(url.trim());
}

export async function openWhatsAppGroup(url: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(
        'Unable to open link',
        'Make sure WhatsApp is installed, or try opening the link in your browser.'
      );
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      'Could not open WhatsApp',
      'Something went wrong opening the group invite. Please try again.'
    );
  }
}

export async function shareWhatsAppLink(
  url: string,
  competitionName: string
): Promise<void> {
  try {
    await Share.share({
      message: `Join the "${competitionName}" WhatsApp group: ${url}`,
    });
  } catch {
    // User cancelled the share sheet
  }
}
