/**
 * useAddRoundPhotos - shared "add photos to a round" behavior.
 *
 * Owns the source-menu visibility plus camera/library capture, permission
 * handling, and upload. Used by RoundPhotoAlbum's Add tile and by the
 * score-entry footer. Render <PhotoSourceMenu> with the returned handlers and
 * trigger it with openMenu().
 *
 * Imports useUploadRoundPhoto from './mutations' (not the barrel) to avoid a
 * circular import, since this hook is itself re-exported from the barrel.
 */

import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { extFromAsset } from '@/utils/imagePicker';
import { useUploadRoundPhoto } from './mutations';

export interface UseAddRoundPhotosOptions {
  /** Called with the number of photos after a successful upload batch. */
  onUploaded?: (count: number) => void;
}

export interface UseAddRoundPhotosResult {
  menuVisible: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  handleTakePhoto: () => Promise<void>;
  handleChooseFromLibrary: () => Promise<void>;
  uploading: boolean;
}

export function useAddRoundPhotos(
  roundId: string,
  options?: UseAddRoundPhotosOptions
): UseAddRoundPhotosResult {
  const uploadPhoto = useUploadRoundPhoto();
  const [uploading, setUploading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const onUploaded = options?.onUploaded;

  const openMenu = useCallback(() => setMenuVisible(true), []);
  const closeMenu = useCallback(() => setMenuVisible(false), []);

  const uploadAssets = useCallback(
    async (assets: ImagePicker.ImagePickerAsset[]) => {
      try {
        setUploading(true);
        for (const asset of assets) {
          await uploadPhoto.mutateAsync({
            roundId,
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            ext: extFromAsset(asset),
            mimeType: asset.mimeType ?? undefined,
          });
        }
        onUploaded?.(assets.length);
      } catch (err) {
        Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not add photos.');
      } finally {
        setUploading(false);
      }
    },
    [roundId, uploadPhoto, onUploaded]
  );

  const handleChooseFromLibrary = useCallback(async () => {
    setMenuVisible(false);
    // The system photo picker (iOS PHPicker / Android Photo Picker) needs no
    // media-library permission, so launch it directly.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 0.6,
    });
    if (result.canceled) return;
    await uploadAssets(result.assets);
  }, [uploadAssets]);

  const handleTakePhoto = useCallback(async () => {
    setMenuVisible(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to take photos.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    // Full-frame capture (no square crop) — round photos are not avatars.
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (result.canceled) return;
    await uploadAssets(result.assets);
  }, [uploadAssets]);

  return { menuVisible, openMenu, closeMenu, handleTakePhoto, handleChooseFromLibrary, uploading };
}
