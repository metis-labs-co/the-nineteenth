import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ThemeProvider, useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const welcomeVideoSource = require('../../../../assets/videos/welcome.mp4');

type Props = NativeStackScreenProps<RootStackParamList, 'WelcomeVideo'>;

function WelcomeVideoContent({ navigation }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const goToCarousel = useCallback(() => {
    navigation.replace('WelcomeCarousel');
  }, [navigation]);

  const player = useVideoPlayer(welcomeVideoSource, (instance) => {
    instance.loop = false;
    instance.muted = false;
    instance.play();
  });

  // Advance to the carousel when the video finishes, or if the source errors —
  // never strand a first-time user on a black screen.
  useEffect(() => {
    const endSub = player.addListener('playToEnd', () => {
      goToCarousel();
    });
    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') {
        goToCarousel();
      }
    });
    return () => {
      endSub.remove();
      statusSub.remove();
    };
  }, [player, goToCarousel]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        nativeControls={false}
        contentFit="cover"
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />

      <TouchableOpacity
        style={[styles.skipButton, { top: insets.top + spacing.md }]}
        onPress={goToCarousel}
        accessibilityLabel="Skip welcome video"
        accessibilityRole="button"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={[styles.skipLabel, { color: colors.textSecondary }]}>
          Skip
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function WelcomeVideoScreen(props: Props) {
  return (
    <ThemeProvider forceMode="dark">
      <StatusBar style="light" />
      <WelcomeVideoContent {...props} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  skipButton: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 10,
    padding: spacing.sm,
  },
  skipLabel: {
    ...typography.bodyBold,
  },
});
