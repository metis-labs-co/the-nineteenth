/**
 * AddPlaceholderModal - Modal for creating placeholder (guest) players
 *
 * A modal dialog for adding guest players to competitions/rounds.
 * Guest players don't have app accounts but can be scored and later
 * linked to real accounts when those people sign up.
 *
 * @example
 * ```tsx
 * <AddPlaceholderModal
 *   visible={showAddGuestModal}
 *   onClose={() => setShowAddGuestModal(false)}
 *   onPlayerCreated={(player) => {
 *     addToSelectedPlayers(player);
 *   }}
 * />
 * ```
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useCreatePlaceholderPlayer } from '@/hooks/usePlaceholderPlayers';
import { FormInput } from './FormInput';
import { GolfBallLoader } from './GolfBallLoader';
import type { Player } from '@/types/database.types';

export interface AddPlaceholderModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal is dismissed */
  onClose: () => void;
  /** Callback with the created placeholder player on success */
  onPlayerCreated: (player: Player) => void;
}

export function AddPlaceholderModal({
  visible,
  onClose,
  onPlayerCreated,
}: AddPlaceholderModalProps) {
  const colors = useThemeColors();
  const createPlaceholder = useCreatePlaceholderPlayer();

  // Form state
  const [name, setName] = useState('');
  const [handicap, setHandicap] = useState('');

  // Validation state
  const [nameError, setNameError] = useState<string | undefined>();
  const [handicapError, setHandicapError] = useState<string | undefined>();

  // API error state
  const [apiError, setApiError] = useState<string | undefined>();

  // Clear form when modal closes
  useEffect(() => {
    if (!visible) {
      setName('');
      setHandicap('');
      setNameError(undefined);
      setHandicapError(undefined);
      setApiError(undefined);
      createPlaceholder.reset();
    }
  }, [visible]);

  // Validate name
  const validateName = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setNameError('Name is required');
      return false;
    }
    if (value.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    setNameError(undefined);
    return true;
  }, []);

  // Validate handicap
  const validateHandicap = useCallback((value: string): boolean => {
    if (!value.trim()) {
      // Handicap is optional
      setHandicapError(undefined);
      return true;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setHandicapError('Handicap must be a number');
      return false;
    }
    if (numValue < 0 || numValue > 54) {
      setHandicapError('Handicap must be between 0 and 54');
      return false;
    }
    setHandicapError(undefined);
    return true;
  }, []);

  // Handle name change
  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      setApiError(undefined);
      if (nameError) {
        validateName(value);
      }
    },
    [nameError, validateName]
  );

  // Handle handicap change - allow decimal input
  const handleHandicapChange = useCallback(
    (value: string) => {
      // Only allow numbers and decimal point
      const sanitized = value.replace(/[^0-9.]/g, '');
      // Prevent multiple decimal points
      const parts = sanitized.split('.');
      const formatted =
        parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
      setHandicap(formatted);
      setApiError(undefined);
      if (handicapError) {
        validateHandicap(formatted);
      }
    },
    [handicapError, validateHandicap]
  );

  // Handle form submission
  const handleSubmit = useCallback(() => {
    Keyboard.dismiss();

    // Validate all fields
    const isNameValid = validateName(name);
    const isHandicapValid = validateHandicap(handicap);

    if (!isNameValid || !isHandicapValid) {
      return;
    }

    // Parse handicap value
    const handicapValue = handicap.trim()
      ? parseFloat(handicap)
      : null;

    // Create placeholder player
    createPlaceholder.mutate(
      {
        name: name.trim(),
        handicap: handicapValue,
      },
      {
        onSuccess: (player) => {
          onPlayerCreated(player);
          onClose();
        },
        onError: (error) => {
          setApiError(error instanceof Error ? error.message : 'Failed to create guest player');
        },
      }
    );
  }, [name, handicap, validateName, validateHandicap, createPlaceholder, onPlayerCreated, onClose]);

  const isLoading = createPlaceholder.isPending;
  const hasErrors = !!nameError || !!handicapError;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View
                style={[
                  styles.modalContainer,
                  { backgroundColor: colors.surface },
                  shadows.lg,
                ]}
                accessibilityRole="none"
                accessibilityLabel="Add guest player form"
              >
                {/* Header */}
                <View style={styles.header}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Icon source="account-plus" size={28} color={colors.primary} />
                  </View>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>
                    Add Guest Player
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Create a placeholder for someone without an account
                  </Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                  <FormInput
                    label="Name"
                    value={name}
                    onChangeText={handleNameChange}
                    placeholder="Enter player name"
                    error={nameError}
                    required
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoFocus
                    returnKeyType="next"
                    accessibilityLabel="Player name"
                    accessibilityHint="Required. Enter the guest player's name"
                  />

                  <FormInput
                    label="Handicap"
                    value={handicap}
                    onChangeText={handleHandicapChange}
                    placeholder="e.g., 18"
                    hint="Optional, between 0 and 54"
                    error={handicapError}
                    keyboardType="decimal"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    accessibilityLabel="Handicap"
                    accessibilityHint="Optional. Enter handicap between 0 and 54"
                  />
                </View>

                {/* API Error */}
                {apiError && (
                  <View
                    style={[
                      styles.errorContainer,
                      { backgroundColor: colors.errorLight },
                    ]}
                  >
                    <Icon source="alert-circle" size={16} color={colors.error} />
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {apiError}
                    </Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.cancelButton,
                      { backgroundColor: colors.gray100 },
                    ]}
                    onPress={onClose}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Text
                      style={[styles.buttonText, { color: colors.textPrimary }]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.submitButton,
                      { backgroundColor: colors.primary },
                      (isLoading || hasErrors) && styles.buttonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={isLoading || hasErrors}
                    accessibilityRole="button"
                    accessibilityLabel="Add Guest"
                    accessibilityState={{ disabled: isLoading || hasErrors }}
                  >
                    {isLoading ? (
                      <GolfBallLoader size="sm" />
                    ) : (
                      <View style={styles.submitContent}>
                        <Icon source="account-plus" size={20} color={colors.textInverse} />
                        <Text
                          style={[styles.buttonText, { color: colors.textInverse }]}
                        >
                          Add Guest
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
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
  keyboardAvoid: {
    width: '100%',
    maxWidth: 400,
  },
  modalContainer: {
    width: '100%',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.small,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    marginBottom: spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.small,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {},
  submitButton: {},
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.bodyBold,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

export default AddPlaceholderModal;
