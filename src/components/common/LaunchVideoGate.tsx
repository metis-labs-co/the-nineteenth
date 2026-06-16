import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const launchVideoSource = require('../../../assets/videos/the-nineteenth-logo.mp4');

// Matches `app.json` splash `backgroundColor` so the first JS paint is seamless
// with the native splash and the portrait video letterboxes onto the same color.
const SPLASH_BACKGROUND = '#2f3428';
const FADE_OUT_MS = 250;
// Only show the first few seconds of the launch video before dismissing.
const MAX_PLAY_MS = 3000;

// Module-level guard: the launch video plays once per process (cold start only).
// It survives warm resume (the module stays loaded) and resets on process kill.
let hasLaunchVideoPlayed = false;

/** Test-only: reset the cold-start guard between test cases. */
export function __resetLaunchVideoGateForTests() {
  hasLaunchVideoPlayed = false;
}

interface LaunchVideoGateProps {
  children: React.ReactNode;
}

export function LaunchVideoGate({ children }: LaunchVideoGateProps) {
  // Claim the cold-start guard exactly once per mounted instance. Using a ref
  // (not a useState initializer) keeps this correct under React StrictMode,
  // which double-invokes useState initializers in development.
  const isColdStart = useRef<boolean | null>(null);
  if (isColdStart.current === null) {
    isColdStart.current = !hasLaunchVideoPlayed;
    if (isColdStart.current) hasLaunchVideoPlayed = true;
  }
  const [overlayVisible, setOverlayVisible] = useState(isColdStart.current);

  const opacity = useRef(new Animated.Value(1)).current;

  const player = useVideoPlayer(
    overlayVisible ? launchVideoSource : null,
    (instance) => {
      if (!overlayVisible) return; // nothing to play on a warm-resume mount
      instance.loop = false;
      instance.muted = false; // play with sound
      instance.play();
    }
  );

  const dismiss = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      useNativeDriver: true,
    }).start(() => setOverlayVisible(false));
  }, [opacity]);

  useEffect(() => {
    if (!overlayVisible) return;
    const endSub = player.addListener('playToEnd', () => dismiss());
    const statusSub = player.addListener('statusChange', (payload) => {
      if (payload?.status === 'error' || payload?.error) dismiss();
    });
    // Cap playback at the first few seconds even if the clip is longer.
    const timer = setTimeout(() => dismiss(), MAX_PLAY_MS);
    return () => {
      endSub.remove();
      statusSub.remove();
      clearTimeout(timer);
    };
  }, [overlayVisible, player, dismiss]);

  return (
    <View style={styles.root}>
      {children}
      {overlayVisible && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.overlay, { opacity }]}
        >
          <VideoView
            style={StyleSheet.absoluteFill}
            player={player}
            nativeControls={false}
            contentFit="cover"
            allowsFullscreen={false}
            allowsPictureInPicture={false}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel="Skip intro"
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    backgroundColor: SPLASH_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
