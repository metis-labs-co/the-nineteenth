/**
 * ScoringPairsPromptModal - Modal prompting to configure scoring pairs
 */

import React, { memo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

interface ScoringPairsPromptModalProps {
  visible: boolean;
  onConfigureNow: () => void;
  onConfigureLater: () => void;
}

export const ScoringPairsPromptModal = memo(function ScoringPairsPromptModal({
  visible,
  onConfigureNow,
  onConfigureLater,
}: ScoringPairsPromptModalProps) {
  const colors = useThemeColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onConfigureLater}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.container, { backgroundColor: colors.white }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLighter }]}>
            <Icon source="account-switch" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Round Created
          </Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Configure scoring pairs now?
          </Text>
          <Text style={[styles.subtext, { color: colors.textTertiary }]}>
            You can also configure scoring pairs later from the round settings.
          </Text>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.buttonSecondary, { borderColor: colors.gray300 }]}
              onPress={onConfigureLater}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonSecondaryText, { color: colors.textSecondary }]}>
                Later
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.buttonPrimary, { backgroundColor: colors.primary }]}
              onPress={onConfigureNow}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonPrimaryText, { color: colors.white }]}>
                Yes
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
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
  message: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtext: {
    ...typography.small,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  buttonSecondary: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSecondaryText: {
    ...typography.bodyBold,
  },
  buttonPrimary: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPrimaryText: {
    ...typography.bodyBold,
  },
});
