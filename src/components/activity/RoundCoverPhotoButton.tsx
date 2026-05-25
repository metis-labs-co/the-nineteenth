/**
 * RoundCoverPhotoButton - the round's "add photo" affordance, sized to sit
 * where the course/round icon goes. For participants it's a tappable
 * camera button (opens the library picker); otherwise it shows a fallback
 * icon and lets taps fall through to the surrounding card.
 *
 * The photos themselves are displayed by RoundPhotoBanner, not here.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Icon } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius } from '@/constants/theme';
import { useUploadRoundPhoto } from '@/hooks/activity';

function extFromAsset(asset: ImagePicker.ImagePickerAsset): string {
  const fromName = asset.fileName?.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 4) return fromName;
  if (asset.mimeType?.includes('png')) return 'png';
  if (asset.mimeType?.includes('webp')) return 'webp';
  return 'jpg';
}

export interface RoundCoverPhotoButtonProps {
  roundId: string;
  /** Whether the current user may add photos (round participant). */
  canAdd: boolean;
  /** Tile size in px (square). Defaults to 64. */
  size?: number;
  /** Tile background (e.g. the course-card icon background). */
  backgroundColor?: string;
  /** Icon shown when the user can't add photos. */
  fallbackIcon?: string;
}

export function RoundCoverPhotoButton({
  roundId,
  canAdd,
  size = 64,
  backgroundColor,
  fallbackIcon = 'golf',
}: RoundCoverPhotoButtonProps) {
  const colors = useThemeColors();
  const uploadPhoto = useUploadRoundPhoto();
  const [uploading, setUploading] = useState(false);

  const handleAdd = useCallback(async () => {
    try {
      // The system photo picker (iOS PHPicker / Android Photo Picker) needs no
      // media-library permission, so launch it directly.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: true,
        quality: 0.6,
      });
      if (result.canceled) return;

      setUploading(true);
      for (const asset of result.assets) {
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
  }, [roundId, uploadPhoto]);

  const tileStyle = [
    styles.tile,
    {
      width: size,
      height: size,
      borderRadius: borderRadius.lg,
      backgroundColor: backgroundColor ?? colors.primaryLighter,
    },
  ];

  const content = uploading ? (
    <ActivityIndicator color={colors.primary} />
  ) : canAdd ? (
    <Icon source="camera-plus-outline" size={Math.round(size * 0.4)} color={colors.primary} />
  ) : (
    <Icon source={fallbackIcon} size={Math.round(size * 0.5)} color={colors.primary} />
  );

  if (!canAdd) {
    return <View style={tileStyle}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={tileStyle}
      onPress={handleAdd}
      disabled={uploading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Add a round photo"
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
