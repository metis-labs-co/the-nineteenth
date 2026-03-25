import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  TouchableOpacity,
  AccessibilityInfo,
  Modal,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { ScreenWelcomeContent } from '@/constants/screenWelcomeContent';

export interface ScreenWelcomeModalProps {
  visible: boolean;
  content: ScreenWelcomeContent;
  onDismiss: () => void;
  testID?: string;
}

export function ScreenWelcomeModal({
  visible,
  content,
  onDismiss,
  testID,
}: ScreenWelcomeModalProps) {
  const colors = useThemeColors();

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 80,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      AccessibilityInfo.announceForAccessibility(
        `${content.title}. ${content.description}`
      );
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim, content.title, content.description]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        testID={testID}
      >
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
            shadows.xl,
          ]}
          accessibilityRole="alert"
          accessibilityLabel={content.title}
        >
          {/* Icon Header */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.primaryLight },
            ]}
          >
            <Icon source={content.icon} size={40} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {content.title}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {content.description}
          </Text>

          {/* Bullet Items */}
          <View style={styles.itemsContainer}>
            {content.items.map((item, index) => (
              <View
                key={index}
                style={styles.itemRow}
                accessibilityLabel={item.text}
              >
                <View
                  style={[
                    styles.bulletContainer,
                    { backgroundColor: `${colors.primary}15` },
                  ]}
                >
                  <Icon source={item.icon} size={16} color={colors.primary} />
                </View>
                <Text
                  style={[styles.itemText, { color: colors.textPrimary }]}
                  numberOfLines={2}
                >
                  {item.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Dismiss Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={onDismiss}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={content.buttonLabel}
          >
            <Text style={[styles.buttonText, { color: colors.white }]}>
              {content.buttonLabel}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
container: {
    width: '90%',
    maxWidth: 380,
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  itemsContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bulletContainer: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 1,
  },
  itemText: {
    ...typography.small,
    flex: 1,
    lineHeight: 22,
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  buttonText: {
    ...typography.bodyBold,
  },
});
