import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 26;
const THUMB_SIZE = 20;
const TRACK_PADDING = (TRACK_HEIGHT - THUMB_SIZE) / 2;
const TRANSLATE_X = TRACK_WIDTH - THUMB_SIZE - TRACK_PADDING * 2;

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

export function ToggleSwitch({ value, onValueChange, disabled = false, accessibilityLabel, testID }: ToggleSwitchProps) {
  const colors = useThemeColors();
  const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, animValue]);

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [TRACK_PADDING, TRACK_PADDING + TRANSLATE_X],
  });

  const trackColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.gray300, colors.primary],
  });

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      testID={testID}
      hitSlop={4}
    >
      <Animated.View
        style={[
          styles.track,
          { backgroundColor: trackColor },
          disabled && styles.disabled,
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            { transform: [{ translateX }] },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  disabled: {
    opacity: 0.5,
  },
});
