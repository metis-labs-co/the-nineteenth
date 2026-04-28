/**
 * BiometricEnrollSheet - Post-login bottom sheet that offers to enable
 * Face ID / Fingerprint unlock.
 *
 * Controlled component: parent owns visibility and the enable/dismiss
 * callbacks (typically via useBiometricEnrollPrompt).
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { BottomSheet } from '@/components/common/BottomSheet/BottomSheet';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import type { BiometricType } from '@/services/biometric';

interface BiometricEnrollSheetProps {
  visible: boolean;
  biometricType: BiometricType;
  /** Triggers the OS biometric prompt; resolves true when enabled. */
  onEnable: () => Promise<boolean>;
  onDismiss: () => void;
}

export function BiometricEnrollSheet({
  visible,
  biometricType,
  onEnable,
  onDismiss,
}: BiometricEnrollSheetProps) {
  const colors = useThemeColors();
  const [isEnabling, setIsEnabling] = useState(false);
  const [enabled, setEnabled] = useState(false);

  // Reset transient state when the sheet (re)opens.
  useEffect(() => {
    if (visible) {
      setIsEnabling(false);
      setEnabled(false);
    }
  }, [visible]);

  const isFaceId = biometricType === 'facial';
  const iconName = isFaceId ? 'face-recognition' : 'fingerprint';
  const label = isFaceId ? 'Face ID' : 'Fingerprint';
  const subjectWord = isFaceId ? 'face' : 'fingerprint';

  const handleEnable = async () => {
    if (isEnabling || enabled) return;
    setIsEnabling(true);
    try {
      const success = await onEnable();
      if (success) {
        setEnabled(true);
        // Brief success state, then dismiss.
        setTimeout(onDismiss, 900);
      }
    } finally {
      setIsEnabling(false);
    }
  };

  const primaryLabel = enabled
    ? `${label} enabled ✓`
    : `Enable ${label}`;

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      height={0.55}
      showHandle
      showCloseButton={false}
      enableSwipeToDismiss={!isEnabling}
      closeOnBackdropPress={!isEnabling}
      useModal
    >
      <View style={styles.container}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: colors.primaryBackground },
          ]}
        >
          <Icon source={iconName} size={40} color={colors.primary} />
        </View>

        <Text style={[styles.headline, { color: colors.textPrimary }]}>
          Sign in faster with {label}
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Skip the password next time. We&apos;ll unlock The Nineteenth using
          your {subjectWord}.
        </Text>

        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.surfaceVariant },
          ]}
        >
          <Icon
            source="shield-lock-outline"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Stored securely on your device. We never see your {subjectWord}{' '}
            data.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primary },
              (isEnabling || enabled) && styles.primaryButtonInactive,
            ]}
            onPress={handleEnable}
            disabled={isEnabling || enabled}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
          >
            {isEnabling ? (
              <ActivityIndicator color={colors.textOnColored} />
            ) : (
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: colors.textOnColored },
                ]}
              >
                {primaryLabel}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onDismiss}
            disabled={isEnabling}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Not now"
          >
            <Text
              style={[
                styles.secondaryButtonText,
                {
                  color: isEnabling
                    ? colors.textDisabled
                    : colors.textSecondary,
                },
              ]}
            >
              Not now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    alignItems: 'center',
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  headline: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 320,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    width: '100%',
    marginBottom: spacing.lg,
  },
  infoText: {
    ...typography.small,
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    marginTop: 'auto',
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonInactive: {
    opacity: 0.85,
  },
  primaryButtonText: {
    ...typography.bodyBold,
  },
  secondaryButton: {
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  secondaryButtonText: {
    ...typography.body,
  },
});

export default BiometricEnrollSheet;
