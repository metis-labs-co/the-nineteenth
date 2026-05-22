/**
 * RoundPhotoAlbum - shared per-round photo album.
 *
 * Displays signed photo thumbnails and (for round participants) an "Add"
 * tile that opens the image picker. Uploaders can remove their own photos
 * via long-press.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, Linking } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { SectionHeader, PhotoSourceMenu } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import {
  useRoundPhotos,
  useUploadRoundPhoto,
  useDeleteRoundPhoto,
} from '@/hooks/activity';

const THUMB_SIZE = 100;

function extFromAsset(asset: ImagePicker.ImagePickerAsset): string {
  const fromName = asset.fileName?.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 4) return fromName;
  if (asset.mimeType?.includes('png')) return 'png';
  if (asset.mimeType?.includes('webp')) return 'webp';
  return 'jpg';
}

export interface RoundPhotoAlbumProps {
  roundId: string;
  /** Whether the current user may add photos (round participant). */
  canAdd: boolean;
}

export function RoundPhotoAlbum({ roundId, canAdd }: RoundPhotoAlbumProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { data: photos, isLoading } = useRoundPhotos(roundId);
  const uploadPhoto = useUploadRoundPhoto();
  const deletePhoto = useDeleteRoundPhoto();
  const [uploading, setUploading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

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
      } catch (err) {
        Alert.alert('Upload failed', err instanceof Error ? err.message : 'Could not add photos.');
      } finally {
        setUploading(false);
      }
    },
    [roundId, uploadPhoto]
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

  const confirmDelete = useCallback(
    (photoId: string, storagePath: string) => {
      Alert.alert('Delete photo', 'Remove this photo from the round?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePhoto.mutate({ photoId, roundId, storagePath }),
        },
      ]);
    },
    [deletePhoto, roundId]
  );

  const items = photos ?? [];
  if (!canAdd && items.length === 0 && !isLoading) return null;

  return (
    <View style={styles.container}>
      <SectionHeader title="Photos" icon="image-multiple" />
      <View style={styles.grid}>
        {items.map((photo) => {
          const isOwn = photo.uploader_id === user?.id;
          return (
            <TouchableOpacity
              key={photo.id}
              activeOpacity={isOwn ? 0.7 : 1}
              onLongPress={isOwn ? () => confirmDelete(photo.id, photo.storage_path) : undefined}
              accessibilityRole="image"
              accessibilityLabel="Round photo"
              accessibilityHint={isOwn ? 'Long press to delete' : undefined}
              style={[styles.thumb, { backgroundColor: colors.surfaceVariant }]}
            >
              {photo.url ? (
                <Image source={{ uri: photo.url }} style={styles.thumbImage} />
              ) : (
                <Icon source="image-off-outline" size={24} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          );
        })}

        {canAdd ? (
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Add photos"
            style={[
              styles.addTile,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            {uploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Icon source="camera-plus-outline" size={24} color={colors.primary} />
                <Text style={[styles.addLabel, { color: colors.textSecondary }]}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
      <PhotoSourceMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onTakePhoto={handleTakePhoto}
        onChooseFromLibrary={handleChooseFromLibrary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  addTile: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addLabel: {
    ...typography.caption,
  },
});
