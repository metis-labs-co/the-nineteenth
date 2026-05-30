import React from 'react';
import { StyleProp, ImageStyle } from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';

export interface AppImageProps {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  /** Low-res placeholder URI shown while the main image loads. */
  placeholder?: string | null;
  recyclingKey?: string;
  transition?: number;
  accessibilityLabel?: string;
  testID?: string;
}

/** Shared image renderer: disk+memory cache and fade-in via expo-image. */
export function AppImage({
  uri,
  style,
  contentFit = 'cover',
  placeholder,
  recyclingKey,
  transition = 200,
  accessibilityLabel,
  testID,
}: AppImageProps) {
  return (
    <Image
      source={uri ? { uri } : undefined}
      placeholder={placeholder ? { uri: placeholder } : undefined}
      style={style}
      contentFit={contentFit}
      transition={transition}
      recyclingKey={recyclingKey}
      cachePolicy="memory-disk"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    />
  );
}
