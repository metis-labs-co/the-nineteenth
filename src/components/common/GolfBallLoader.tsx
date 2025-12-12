// src/components/common/GolfBallLoader.tsx
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
  ClipPath,
  G,
} from 'react-native-svg';
import { useIsDark } from '@/context/ThemeContext';

type GolfBallSize = 'sm' | 'md' | 'lg';

interface GolfBallLoaderProps {
  /**
   * Size of the loader: 'sm' (24), 'md' (36), 'lg' (48)
   */
  size?: GolfBallSize;
}

const sizeMap: Record<GolfBallSize, number> = {
  sm: 24,
  md: 36,
  lg: 48,
};

/**
 * GolfBallLoader - Animated spinning golf ball loader
 *
 * A themed golf ball icon that rotates continuously.
 * Used as the primary loading indicator throughout the app.
 */
export const GolfBallLoader = React.memo(function GolfBallLoader({
  size = 'md',
}: GolfBallLoaderProps) {
  const dimension = sizeMap[size];
  const rotation = useRef(new Animated.Value(0)).current;
  const isDark = useIsDark();

  // Golf ball colors - slightly adjusted for better visibility in dark mode
  const ballHighlight = '#ffffff';
  const ballBase = isDark ? '#e8e8e8' : '#e0e0e0';
  const ballStroke = isDark ? '#d0d0d0' : '#c0c0c0';
  const dimpleColor = isDark ? '#d8d8d8' : '#c8c8c8';

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => animation.stop();
  }, [rotation]);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const center = 24;
  const ballRadius = 20;

  return (
    <View style={[styles.container, { width: dimension, height: dimension }]}>
      {/* Static ball background with gradient */}
      <Svg
        width={dimension}
        height={dimension}
        viewBox="0 0 48 48"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <RadialGradient
            id="ballGradient"
            cx="30%"
            cy="30%"
            rx="70%"
            ry="70%"
          >
            <Stop offset="0%" stopColor={ballHighlight} />
            <Stop offset="100%" stopColor={ballBase} />
          </RadialGradient>
        </Defs>

        {/* Main ball */}
        <Circle
          cx={center}
          cy={center}
          r={ballRadius}
          fill="url(#ballGradient)"
          stroke={ballStroke}
          strokeWidth={1}
        />

        {/* Static highlight */}
        <Circle cx={18} cy={18} r={4} fill={ballHighlight} opacity={0.5} />
      </Svg>

      {/* Rotating dimples */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ rotate: rotateInterpolate }] },
        ]}
      >
        <Svg width={dimension} height={dimension} viewBox="0 0 48 48">
          <Defs>
            <ClipPath id="dimpleClip">
              <Circle cx={center} cy={center} r={ballRadius} />
            </ClipPath>
          </Defs>

          <G clipPath="url(#dimpleClip)" fill={dimpleColor}>
            {/* Scattered dimples - organic placement */}
            <Circle cx={24} cy={9} r={2.2} />
            <Circle cx={17} cy={14} r={2.4} />
            <Circle cx={32} cy={12} r={2.0} />
            <Circle cx={10} cy={21} r={2.3} />
            <Circle cx={26} cy={19} r={2.6} />
            <Circle cx={38} cy={18} r={2.1} />
            <Circle cx={14} cy={28} r={2.5} />
            <Circle cx={24} cy={31} r={2.3} />
            <Circle cx={35} cy={27} r={2.4} />
            <Circle cx={19} cy={38} r={2.2} />
            <Circle cx={30} cy={36} r={2.0} />
            <Circle cx={8} cy={35} r={1.8} />
            <Circle cx={40} cy={33} r={1.9} />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
});

export type { GolfBallLoaderProps, GolfBallSize };

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
