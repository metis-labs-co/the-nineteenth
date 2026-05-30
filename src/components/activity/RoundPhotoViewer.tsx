/**
 * RoundPhotoViewer - full-screen, swipeable viewer for a round's photos.
 *
 * Opens at `index` (null = closed). Tapping a photo or the close button
 * dismisses it. Wrapped in SystemModalTheme so the system modal window keeps
 * the app's solid surfaces. Shared by RoundPhotoBanner and RoundPhotoAlbum.
 *
 * Full-resolution urls are signed on demand (current photo + immediate
 * neighbors) only once the viewer opens; the cached thumbnail shows as a
 * placeholder until the full-res image loads.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/constants/theme';
import { SystemModalTheme, AppImage } from '@/components/common';
import { signFullPhotos } from '@/hooks/activity';

export interface RoundPhotoViewerPhoto {
  id: string;
  /** Storage path used to sign the full-resolution url on demand. */
  storagePath: string;
  /** Cached thumbnail url, shown as a placeholder while full-res loads. */
  thumbUrl: string | null;
}

export interface RoundPhotoViewerProps {
  photos: RoundPhotoViewerPhoto[];
  /** Index to open at; null when the viewer is closed. */
  index: number | null;
  onClose: () => void;
}

export function RoundPhotoViewer({ photos, index, onClose }: RoundPhotoViewerProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const visible = index !== null;

  const [fullByPath, setFullByPath] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (index === null) return;
    const want = [index - 1, index, index + 1]
      .filter((i) => i >= 0 && i < photos.length)
      .map((i) => photos[i].storagePath)
      .filter((p) => !fullByPath.has(p));
    if (want.length === 0) return;
    let cancelled = false;
    signFullPhotos(want).then((signed) => {
      if (cancelled) return;
      setFullByPath((prev) => {
        const next = new Map(prev);
        for (const [k, v] of signed) next.set(k, v);
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [index, photos, fullByPath]);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {visible ? (
        <SystemModalTheme>
          <View style={styles.viewer}>
            <FlatList
              data={photos}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={index ?? 0}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={onClose}
                  style={{ width, height, alignItems: 'center', justifyContent: 'center' }}
                >
                  <AppImage
                    uri={fullByPath.get(item.storagePath) ?? item.thumbUrl}
                    placeholder={item.thumbUrl}
                    style={{ width, height }}
                    contentFit="contain"
                    accessibilityLabel="Round photo"
                  />
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={onClose}
              style={[styles.close, { top: insets.top + spacing.sm }]}
              accessibilityRole="button"
              accessibilityLabel="Close photo viewer"
              hitSlop={8}
            >
              <Icon source="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        </SystemModalTheme>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewer: {
    flex: 1,
    backgroundColor: '#000',
  },
  close: {
    position: 'absolute',
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});
