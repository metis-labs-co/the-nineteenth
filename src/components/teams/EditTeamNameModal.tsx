/**
 * EditTeamNameModal - Modal dialog for editing a team's name
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { GolfBallLoader } from '@/components/common';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export interface EditTeamNameModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Current team name */
  currentName: string;
  /** Callback when save is pressed with new name */
  onSave: (newName: string) => void;
  /** Callback when modal is dismissed */
  onCancel: () => void;
  /** Show loading state on save button */
  loading?: boolean;
}

export function EditTeamNameModal({
  visible,
  currentName,
  onSave,
  onCancel,
  loading = false,
}: EditTeamNameModalProps) {
  const colors = useThemeColors();
  const [name, setName] = useState(currentName);
  const inputRef = useRef<TextInput>(null);

  // Reset name when modal opens with new current name
  useEffect(() => {
    if (visible) {
      setName(currentName);
      // Focus input after modal animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible, currentName]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (trimmedName && trimmedName !== currentName) {
      onSave(trimmedName);
    } else {
      onCancel();
    }
  };

  const canSave = name.trim().length > 0 && name.trim() !== currentName;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.dialogContainer,
                  { backgroundColor: colors.surface },
                  shadows.lg,
                ]}
              >
                {/* Icon */}
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Icon source="pencil" size={28} color={colors.primary} />
                </View>

                {/* Title */}
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Edit Team Name
                </Text>

                {/* Input */}
                <TextInput
                  ref={inputRef}
                  style={[
                    styles.input,
                    {
                      color: colors.textPrimary,
                      backgroundColor: colors.gray100,
                      borderColor: colors.border,
                    },
                  ]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter team name"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={50}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  selectTextOnFocus
                  autoCapitalize="words"
                  accessibilityLabel="Team name input"
                />

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.cancelButton,
                      { backgroundColor: colors.gray100 },
                    ]}
                    onPress={onCancel}
                    disabled={loading}
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
                      styles.saveButton,
                      { backgroundColor: colors.primary },
                      (!canSave || loading) && styles.buttonDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={!canSave || loading}
                    accessibilityRole="button"
                    accessibilityLabel="Save"
                  >
                    {loading ? (
                      <GolfBallLoader size="sm" />
                    ) : (
                      <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                        Save
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  input: {
    width: '100%',
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
    ...typography.body,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {},
  saveButton: {},
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.bodyBold,
  },
});

export default EditTeamNameModal;
