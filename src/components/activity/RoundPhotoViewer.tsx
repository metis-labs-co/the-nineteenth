/**
 * RoundPhotoViewer - full-screen, swipeable viewer for a round's photos.
 *
 * Opens at `index` (null = closed). Tapping a photo or the close button
 * dismisses it. Wrapped in SystemModalTheme so the system modal window keeps
 * the app's solid surfaces. Shared by RoundPhotoBanner and RoundPhotoAlbum.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/constants/theme';
import { SystemModalTheme } from '@/components/common';

export interface RoundPhotoViewerPhoto {
  id: string;
  url: string;
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
                  <Image source={{ uri: item.url }} style={{ width, height }} resizeMode="contain" />
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
