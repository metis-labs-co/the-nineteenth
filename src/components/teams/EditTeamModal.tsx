/**
 * EditTeamModal - Modal dialog for editing a team's name and colour.
 *
 * The 12 colour swatches mirror the avatar palette (`src/constants/avatars.ts`).
 * Swatches that are already used by *another* team in the same competition
 * render disabled (translucent + non-interactive). The team's own current
 * colour is always selectable so the organiser can re-confirm or just edit
 * the name.
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
import { AVATARS } from '@/constants/avatars';

export interface EditTeamModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Current team name */
  currentName: string;
  /** Current avatar palette id (e.g. 'avatar-green'); null for legacy teams */
  currentColor: string | null;
  /** Avatar ids already taken by other teams in the same competition.
   *  Excludes the team being edited. */
  takenColorIds: readonly string[];
  /** Callback when save is pressed */
  onSave: (input: { name: string; color: string }) => void;
  /** Callback when modal is dismissed */
  onCancel: () => void;
  /** Show loading state on save button */
  loading?: boolean;
}

const SWATCH_SIZE = 44;

export function EditTeamModal({
  visible,
  currentName,
  currentColor,
  takenColorIds,
  onSave,
  onCancel,
  loading = false,
}: EditTeamModalProps) {
  const colors = useThemeColors();
  const [name, setName] = useState(currentName);
  const [selectedColor, setSelectedColor] = useState<string>(
    currentColor ?? AVATARS[0].id
  );
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setSelectedColor(currentColor ?? AVATARS[0].id);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible, currentName, currentColor]);

  const trimmedName = name.trim();
  const nameChanged = trimmedName.length > 0 && trimmedName !== currentName;
  const colorChanged = selectedColor !== currentColor;
  const canSave = trimmedName.length > 0 && (nameChanged || colorChanged);

  const handleSave = () => {
    if (!canSave) {
      onCancel();
      return;
    }
    onSave({ name: trimmedName, color: selectedColor });
  };

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
                  { backgroundColor: colors.surfaceElevated },
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
                  Edit Team
                </Text>

                {/* Name input */}
                <Text
                  style={[styles.fieldLabel, { color: colors.textSecondary }]}
                >
                  Name
                </Text>
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

                {/* Colour picker */}
                <Text
                  style={[
                    styles.fieldLabel,
                    styles.colorLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Colour
                </Text>
                <View
                  style={styles.swatchGrid}
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Team colour"
                >
                  {AVATARS.map((avatar) => {
                    const isSelected = avatar.id === selectedColor;
                    const isTaken =
                      !isSelected && takenColorIds.includes(avatar.id);
                    return (
                      <TouchableOpacity
                        key={avatar.id}
                        style={[
                          styles.swatch,
                          {
                            backgroundColor: avatar.colorPalette.dark,
                            opacity: isTaken ? 0.35 : 1,
                            borderColor: isSelected
                              ? colors.textPrimary
                              : 'transparent',
                          },
                        ]}
                        onPress={() => setSelectedColor(avatar.id)}
                        disabled={isTaken || loading}
                        accessibilityRole="radio"
                        accessibilityState={{
                          selected: isSelected,
                          disabled: isTaken,
                        }}
                        accessibilityLabel={`${avatar.name}${isTaken ? ', taken' : ''}`}
                      >
                        {isSelected && (
                          <Icon source="check" size={22} color="#ffffff" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

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
                      <Text
                        style={[
                          styles.buttonText,
                          { color: colors.textInverse },
                        ]}
                      >
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
    maxWidth: 360,
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
  fieldLabel: {
    ...typography.captionBold,
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  colorLabel: {
    marginTop: spacing.lg,
  },
  input: {
    width: '100%',
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  swatchGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-start',
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.xl,
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

export default EditTeamModal;
