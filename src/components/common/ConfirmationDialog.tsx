/**
 * ConfirmationDialog - Reusable confirmation modal component
 *
 * @description
 * A modal dialog for confirming destructive or important actions.
 * Follows the app's styling patterns with theme support.
 *
 * @example
 * ```tsx
 * <ConfirmationDialog
 *   visible={showDeleteDialog}
 *   title="Delete Competition"
 *   message="Are you sure you want to delete this competition? This action cannot be undone."
 *   confirmLabel="Delete"
 *   confirmVariant="destructive"
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowDeleteDialog(false)}
 *   loading={isDeleting}
 * />
 * ```
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { GolfBallLoader } from './GolfBallLoader';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export interface ConfirmationDialogProps {
  /** Whether the dialog is visible */
  visible: boolean;
  /** Dialog title */
  title: string;
  /** Dialog message/description */
  message: string;
  /** Label for the confirm button */
  confirmLabel?: string;
  /** Label for the cancel button. Pass empty string to hide cancel button. */
  cancelLabel?: string;
  /** Variant for the confirm button styling */
  confirmVariant?: 'primary' | 'destructive';
  /** Callback when confirm is pressed */
  onConfirm: () => void;
  /** Callback when cancel is pressed or dialog is dismissed */
  onCancel: () => void;
  /** Show loading state on confirm button */
  loading?: boolean;
  /** Optional icon to display (from react-native-paper icons) */
  icon?: string;
  /** Icon color (defaults based on confirmVariant) */
  iconColor?: string;
  /** Optional secondary action (shows as third button between cancel and confirm) */
  showSecondaryAction?: boolean;
  /** Label for the secondary action button */
  secondaryActionLabel?: string;
  /** Callback when secondary action is pressed */
  onSecondaryAction?: () => void;
}

export function ConfirmationDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  loading = false,
  icon,
  iconColor,
  showSecondaryAction = false,
  secondaryActionLabel,
  onSecondaryAction,
}: ConfirmationDialogProps) {
  const colors = useThemeColors();

  const confirmButtonColor =
    confirmVariant === 'destructive' ? colors.error : colors.primary;
  const defaultIconColor =
    confirmVariant === 'destructive' ? colors.error : colors.primary;

  // Hide cancel button if cancelLabel is empty
  const showCancelButton = !!cancelLabel;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.dialogContainer,
                { backgroundColor: colors.surfaceElevated },
                shadows.lg,
              ]}
            >
              {/* Icon */}
              {icon && (
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor:
                        confirmVariant === 'destructive'
                          ? colors.errorLight
                          : colors.primaryLight,
                    },
                  ]}
                >
                  <Icon
                    source={icon}
                    size={32}
                    color={iconColor ?? defaultIconColor}
                  />
                </View>
              )}

              {/* Title */}
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {title}
              </Text>

              {/* Message */}
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                {message}
              </Text>

              {/* Actions */}
              <View style={[styles.actions, (showSecondaryAction || !showCancelButton) && styles.actionsVertical]}>
                {showCancelButton && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.cancelButton,
                      {
                        backgroundColor: colors.surfaceVariant,
                        borderWidth: 1,
                        borderColor: colors.borderStrong,
                      },
                      showSecondaryAction && styles.buttonFullWidth,
                    ]}
                    onPress={onCancel}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel={cancelLabel}
                  >
                    <Text
                      style={[styles.buttonText, { color: colors.textPrimary }]}
                    >
                      {cancelLabel}
                    </Text>
                  </TouchableOpacity>
                )}

                {showSecondaryAction && secondaryActionLabel && onSecondaryAction && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.secondaryButton,
                      styles.buttonFullWidth,
                      { borderColor: colors.primary },
                    ]}
                    onPress={onSecondaryAction}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel={secondaryActionLabel}
                  >
                    <Text
                      style={[styles.buttonText, { color: colors.primary }]}
                    >
                      {secondaryActionLabel}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.confirmButton,
                    { backgroundColor: confirmButtonColor },
                    loading && styles.buttonDisabled,
                    (showSecondaryAction || !showCancelButton) && styles.buttonFullWidth,
                  ]}
                  onPress={onConfirm}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={confirmLabel}
                >
                  {loading ? (
                    <GolfBallLoader size="sm" />
                  ) : (
                    <Text style={[styles.buttonText, { color: colors.textOnColored }]}>
                      {confirmLabel}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  actionsVertical: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFullWidth: {
    flex: 0,
    width: '100%',
  },
  cancelButton: {},
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  confirmButton: {},
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...typography.bodyBold,
  },
});

export default ConfirmationDialog;
