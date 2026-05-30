/**
 * RoundPhotoBanner - full-width display of a round's photos.
 *
 * One photo → a single full-width banner. Multiple → a paged carousel with
 * dots and a count badge. Tapping any photo opens a full-screen, swipeable
 * viewer. Renders nothing when the round has no photos. Adding photos is
 * handled elsewhere (RoundCoverPhotoButton in the course card).
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { AppImage } from '@/components/common';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useRoundPhotos } from '@/hooks/activity';
import type { RoundPhoto } from '@/hooks/activity';
import { RoundPhotoViewer } from './RoundPhotoViewer';

const ASPECT = 16 / 9;

export interface RoundPhotoBannerProps {
  roundId: string;
  /**
   * Round its own corners. Set false when embedding inside a card that already
   * clips (e.g. the course header card), so the photo sits flush at the top.
   */
  rounded?: boolean;
  /**
   * When provided, tapping a photo calls this instead of opening the built-in
   * fullscreen viewer (e.g. to open the round's photo album). Omit to keep the
   * default lightbox.
   */
  onPress?: () => void;
}

export function RoundPhotoBanner({ roundId, rounded = true, onPress }: RoundPhotoBannerProps) {
  const colors = useThemeColors();
  const radius = rounded ? borderRadius.lg : 0;
  const { data: photos } = useRoundPhotos(roundId);
  const [bannerWidth, setBannerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const handlePhotoPress = useCallback(
    (index: number) => {
      if (onPress) onPress();
      else setViewerIndex(index);
    },
    [onPress]
  );

  const items = (photos ?? []).filter((p): p is RoundPhoto & { url: string } => !!p.url);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setBannerWidth(e.nativeEvent.layout.width);
  }, []);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (bannerWidth > 0) {
        setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / bannerWidth));
      }
    },
    [bannerWidth]
  );

  if (items.length === 0) return null;

  const single = items.length === 1;

  return (
    <View onLayout={onLayout}>
      {single || bannerWidth === 0 ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handlePhotoPress(0)}
          style={[styles.frame, { borderRadius: radius }]}
          accessibilityRole="imagebutton"
          accessibilityLabel="View round photo"
        >
          <AppImage uri={items[0].url} style={styles.image} contentFit="cover" />
        </TouchableOpacity>
      ) : (
        <View style={[styles.frame, { borderRadius: radius }]}>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            getItemLayout={(_, index) => ({
              length: bannerWidth,
              offset: bannerWidth * index,
              index,
            })}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handlePhotoPress(index)}
                style={{ width: bannerWidth, aspectRatio: ASPECT }}
                accessibilityRole="imagebutton"
                accessibilityLabel={`View photo ${index + 1} of ${items.length}`}
              >
                <AppImage uri={item.url} style={styles.image} contentFit="cover" />
              </TouchableOpacity>
            )}
          />
          <View style={styles.dots}>
            {items.map((item, i) => (
              <View
                key={item.id}
                style={[
                  styles.dot,
                  { backgroundColor: i === activeIndex ? colors.white : 'rgba(255,255,255,0.5)' },
                ]}
              />
            ))}
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {activeIndex + 1}/{items.length}
            </Text>
          </View>
        </View>
      )}

      <RoundPhotoViewer photos={items} index={viewerIndex} onClose={() => setViewerIndex(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: ASPECT,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dots: {
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  countBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  countText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#fff',
  },
});
