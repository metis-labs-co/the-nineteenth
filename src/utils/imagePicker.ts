/**
 * imagePicker - shared helpers for picking/capturing a square profile image.
 *
 * Both helpers request the relevant permission (alerting on denial), launch the
 * picker with a 1:1 crop and light compression, and return the picked image's
 * uri/ext/mimeType, or null if denied or cancelled.
 */

import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface PickedImage {
  uri: string;
  ext: string;
  mimeType?: string;
}

/** Derive a file extension from a picker asset (name, then mime, then jpg). */
export function extFromAsset(asset: ImagePicker.ImagePickerAsset): string {
  // Trust the filename's tail only when it looks like a real extension
  // (<= 4 chars); a name with no dot yields the whole name and is rejected.
  const fromName = asset.fileName?.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 4) return fromName;
  if (asset.mimeType?.includes('jpeg')) return 'jpg';
  if (asset.mimeType?.includes('png')) return 'png';
  if (asset.mimeType?.includes('webp')) return 'webp';
  return 'jpg';
}

const PICK_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.6,
};

function toPickedImage(result: ImagePicker.ImagePickerResult): PickedImage | null {
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, ext: extFromAsset(asset), mimeType: asset.mimeType ?? undefined };
}

/** Pick an existing image from the photo library. */
export async function pickImageFromLibrary(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission needed', 'Allow photo library access to choose a profile photo.');
    return null;
  }
  return toPickedImage(await ImagePicker.launchImageLibraryAsync(PICK_OPTIONS));
}

/** Capture a new image with the camera. */
export async function takePhotoWithCamera(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission needed', 'Allow camera access to take a profile photo.');
    return null;
  }
  return toPickedImage(await ImagePicker.launchCameraAsync(PICK_OPTIONS));
}
