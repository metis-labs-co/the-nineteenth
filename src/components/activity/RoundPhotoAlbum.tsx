/**
 * RoundPhotoAlbum - shared per-round photo album.
 *
 * Displays signed photo thumbnails and (for round participants) an "Add" tile
 * that opens the photo source menu. Uploaders can remove their own photos via
 * the ✕ badge or long-press.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { SectionHeader, PhotoSourceMenu } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { useRoundPhotos, useDeleteRoundPhoto, useAddRoundPhotos } from '@/hooks/activity';
import { RoundPhotoViewer } from './RoundPhotoViewer';

const THUMB_SIZE = 100;

export interface RoundPhotoAlbumProps {
  roundId: string;
  /** Whether the current user may add photos (round participant). */
  canAdd: boolean;
}

export function RoundPhotoAlbum({ roundId, canAdd }: RoundPhotoAlbumProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const { data: photos, isLoading } = useRoundPhotos(roundId);
  const deletePhoto = useDeleteRoundPhoto();
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const {
    menuVisible,
    openMenu,
    closeMenu,
    handleTakePhoto,
    handleChooseFromLibrary,
    uploading,
  } = useAddRoundPhotos(roundId);

  const handleDelete = useCallback(
    async (photoId: string, storagePath: string) => {
      setDeletingIds((prev) => new Set(prev).add(photoId));
      try {
        const removed = await deletePhoto.mutateAsync({ photoId, roundId, storagePath });
        if (removed > 0) {
          showSuccessToast('Photo removed');
        } else {
          // Update succeeded with no error but changed nothing — RLS/ownership.
          showErrorToast('Could not remove photo', 'No matching photo — you may not be the uploader.');
        }
      } catch (err) {
        showErrorToast('Could not remove photo', err instanceof Error ? err.message : undefined);
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(photoId);
          return next;
        });
      }
    },
    [deletePhoto, roundId, showSuccessToast, showErrorToast]
  );

  const confirmDelete = useCallback(
    (photoId: string, storagePath: string) => {
      Alert.alert('Delete photo', 'Remove this photo from the round?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(photoId, storagePath),
        },
      ]);
    },
    [handleDelete]
  );

  const items = photos ?? [];
  // Photos resolved to a signed URL, in display order — the set the full-screen
  // viewer can page through. Thumbnails without a URL aren't viewable.
  const viewable = items
    .filter((p) => !!p.url)
    .map((p) => ({ id: p.id, url: p.url as string }));

  if (!canAdd && items.length === 0 && !isLoading) return null;

  return (
    <View style={styles.container}>
      <SectionHeader title="Photos" icon="image-multiple" />
      <View style={styles.grid}>
        {items.map((photo) => {
          const isOwn = photo.uploader_id === user?.id;
          const isDeleting = deletingIds.has(photo.id);
          return (
            <View key={photo.id} style={styles.thumbWrap}>
              <TouchableOpacity
                activeOpacity={photo.url ? 0.7 : 1}
                onPress={
                  photo.url
                    ? () => setViewerIndex(viewable.findIndex((v) => v.id === photo.id))
                    : undefined
                }
                onLongPress={
                  isOwn && !isDeleting ? () => confirmDelete(photo.id, photo.storage_path) : undefined
                }
                disabled={isDeleting}
                accessibilityRole="imagebutton"
                accessibilityLabel="Round photo"
                accessibilityHint={
                  isOwn
                    ? 'Tap to view full screen; long press or use the remove button to delete'
                    : 'Tap to view full screen'
                }
                style={[styles.thumb, { backgroundColor: colors.surfaceVariant }]}
              >
                {photo.url ? (
                  <Image source={{ uri: photo.url }} style={styles.thumbImage} />
                ) : (
                  <Icon source="image-off-outline" size={24} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
              {isDeleting ? (
                <View style={styles.deletingOverlay} accessible accessibilityLabel="Deleting photo">
                  <ActivityIndicator color={colors.white} />
                </View>
              ) : isOwn ? (
                <TouchableOpacity
                  onPress={() => confirmDelete(photo.id, photo.storage_path)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  hitSlop={12}
                  style={styles.removeBadge}
                >
                  <Icon source="close" size={14} color={colors.white} />
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}

        {canAdd ? (
          <TouchableOpacity
            onPress={openMenu}
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
        onClose={closeMenu}
        onTakePhoto={handleTakePhoto}
        onChooseFromLibrary={handleChooseFromLibrary}
      />
      <RoundPhotoViewer
        photos={viewable}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
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
  thumbWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
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
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    // Red scrim so the spinner reads as a destructive in-progress action.
    backgroundColor: 'rgba(220,38,38,0.55)',
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
