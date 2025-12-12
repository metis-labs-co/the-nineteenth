/**
 * BottomSheet - Unified slide-from-bottom component
 *
 * Supports both full-screen and partial-screen modes with:
 * - Consistent spring animations
 * - Swipe-to-dismiss gesture
 * - Backdrop with press-to-dismiss
 * - Keyboard avoidance
 * - Safe area handling
 * - Theme support (dark/light mode)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { shadows } from '@/constants/theme';
import { useBottomSheetAnimation } from './hooks/useBottomSheetAnimation';
import { useBottomSheetGestures } from './hooks/useBottomSheetGestures';
import { BottomSheetHeader } from './BottomSheetHeader';
import {
  SCREEN_HEIGHT,
  DEFAULT_SHEET_HEIGHT_RATIO,
  DEFAULT_SWIPE_THRESHOLD,
  BACKDROP_OPACITY,
  SHEET_BORDER_RADIUS,
} from './constants';
import type { BottomSheetProps } from './types';

export function BottomSheet({
  visible,
  onClose,
  children,
  height = DEFAULT_SHEET_HEIGHT_RATIO,
  showHandle,
  title,
  showCloseButton = true,
  headerLeft,
  headerRight,
  customHeader,
  showBackdrop = true,
  closeOnBackdropPress = true,
  enableSwipeToDismiss = true,
  swipeThreshold = DEFAULT_SWIPE_THRESHOLD,
  keyboardBehavior,
  safeAreaBottom = true,
  safeAreaTop,
  animationConfig,
  containerStyle,
  contentStyle,
  testID,
}: BottomSheetProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [isRendered, setIsRendered] = useState(visible);

  // Calculate sheet height
  const isFullScreen = height === 'full';
  const sheetHeight = isFullScreen ? SCREEN_HEIGHT : SCREEN_HEIGHT * (height as number);

  // Default values based on full-screen mode
  const effectiveShowHandle = showHandle ?? !isFullScreen;
  const effectiveSafeAreaTop = safeAreaTop ?? isFullScreen;
  const effectiveKeyboardBehavior = keyboardBehavior ?? (Platform.OS === 'ios' ? 'padding' : 'height');

  // Animation hook
  const { translateY, backdropOpacity, animateClose, resetAnimation } =
    useBottomSheetAnimation({
      visible,
      sheetHeight,
      animationConfig,
      onCloseComplete: () => {
        setIsRendered(false);
      },
    });

  // Handle close with animation
  // Call onClose immediately to start navigation transition in parallel
  // with the sheet animation for smoother UX
  const handleClose = useCallback(() => {
    onClose();
    animateClose();
  }, [animateClose, onClose]);

  // Gesture hook
  const { panHandlers } = useBottomSheetGestures({
    translateY,
    sheetHeight,
    enabled: enableSwipeToDismiss,
    swipeThreshold,
    onDismiss: handleClose,
    animationConfig,
  });

  // Handle Android back button
  useEffect(() => {
    if (!visible) return;

    const handleBackPress = () => {
      handleClose();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [visible, handleClose]);

  // Manage render state
  useEffect(() => {
    if (visible) {
      setIsRendered(true);
    }
  }, [visible]);

  // Reset animation when unmounting or closing
  useEffect(() => {
    if (!visible && !isRendered) {
      resetAnimation();
    }
  }, [visible, isRendered, resetAnimation]);

  // Don't render if not visible and animation complete
  if (!isRendered && !visible) {
    return null;
  }

  // Backdrop press handler
  const handleBackdropPress = closeOnBackdropPress ? handleClose : undefined;

  // Calculate safe area padding
  const topPadding = effectiveSafeAreaTop ? insets.top : 0;
  const bottomPadding = safeAreaBottom ? insets.bottom : 0;

  // Interpolate backdrop opacity
  const animatedBackdropOpacity = backdropOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BACKDROP_OPACITY],
  });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      testID={testID}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Backdrop */}
      {showBackdrop && (
        <Animated.View
          style={[
            styles.backdrop,
            {
              backgroundColor: colors.overlay || 'rgba(0, 0, 0, 1)',
              opacity: animatedBackdropOpacity,
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleBackdropPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Close sheet"
          />
        </Animated.View>
      )}

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetHeight,
            paddingTop: topPadding,
            backgroundColor: colors.surface,
            borderTopLeftRadius: isFullScreen ? 0 : SHEET_BORDER_RADIUS,
            borderTopRightRadius: isFullScreen ? 0 : SHEET_BORDER_RADIUS,
            transform: [{ translateY }],
          },
          !isFullScreen && shadows.xl,
          containerStyle,
        ]}
        {...panHandlers}
      >
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={effectiveKeyboardBehavior === 'none' ? undefined : effectiveKeyboardBehavior}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Header */}
          {customHeader ?? (
            <BottomSheetHeader
              title={title}
              showCloseButton={showCloseButton}
              onClose={handleClose}
              headerLeft={headerLeft}
              headerRight={headerRight}
              showHandle={effectiveShowHandle}
            />
          )}

          {/* Content */}
          <View
            style={[
              styles.content,
              { paddingBottom: bottomPadding },
              contentStyle,
            ]}
          >
            {children}
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
