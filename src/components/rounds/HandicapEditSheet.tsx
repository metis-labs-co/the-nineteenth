/**
 * HandicapEditSheet - Modal for editing a player's handicap
 *
 * A small modal used in the create-round wizard to let the user tweak their
 * own or an owned placeholder player's WHS Handicap Index at round setup
 * time. The value is held in wizard state until "Start Round" commits it to
 * the player profile.
 *
 * @example
 * ```tsx
 * <HandicapEditSheet
 *   visible={editingFor !== null}
 *   playerName={editingFor?.name ?? ''}
 *   initialHandicap={editingFor?.handicap ?? null}
 *   onSave={(value) => handleCurrentUserHandicapChange(value)}
 *   onClose={() => setEditingFor(null)}
 * />
 * ```
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TextInput,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { isHandicapInRange, HANDICAP_RANGE_ERROR } from '@/constants/scoring';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export interface HandicapEditSheetProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Player name shown in the title */
  playerName: string;
  /** Current handicap value pre-filled in the input */
  initialHandicap: number | null | undefined;
  /** Called with the parsed value (rounded to one decimal) on Save */
  onSave: (value: number) => void;
  /** Called on dismiss / Cancel */
  onClose: () => void;
}

/**
 * Parse and validate a handicap string. Returns the rounded numeric value
 * when valid (0.0–54.0, one decimal place). Returns null when invalid.
 */
function parseHandicap(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = parseFloat(trimmed);
  if (!isHandicapInRange(value)) return null;
  // Match DB column precision: NUMERIC(4,1)
  return Math.round(value * 10) / 10;
}

export function HandicapEditSheet({
  visible,
  playerName,
  initialHandicap,
  onSave,
  onClose,
}: HandicapEditSheetProps) {
  const colors = useThemeColors();

  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>();

  // Reset local state whenever the sheet is re-opened.
  useEffect(() => {
    if (visible) {
      setValue(
        initialHandicap != null && !Number.isNaN(initialHandicap)
          ? initialHandicap.toFixed(1)
          : ''
      );
      setError(undefined);
    }
  }, [visible, initialHandicap]);

  const handleChange = useCallback((next: string) => {
    // Strip non-numeric chars, allow a single decimal point.
    const sanitized = next.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    const formatted =
      parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;
    setValue(formatted);

    if (!formatted.trim()) {
      setError('Handicap is required');
      return;
    }
    const parsed = parseFloat(formatted);
    if (Number.isNaN(parsed)) {
      setError('Enter a valid number');
      return;
    }
    if (!isHandicapInRange(parsed)) {
      setError(HANDICAP_RANGE_ERROR);
      return;
    }
    setError(undefined);
  }, []);

  const handleSave = useCallback(() => {
    Keyboard.dismiss();
    const parsed = parseHandicap(value);
    if (parsed == null) {
      setError(error ?? 'Enter a valid handicap');
      return;
    }
    onSave(parsed);
    onClose();
  }, [value, error, onSave, onClose]);

  const isSaveDisabled = error != null || parseHandicap(value) == null;

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
                  { backgroundColor: colors.surfaceElevated },
                  shadows.lg,
                ]}
                accessibilityRole="none"
                accessibilityLabel="Edit handicap"
              >
                {/* Header */}
                <View style={styles.header}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Icon source="golf" size={28} color={colors.primary} />
                  </View>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>
                    {`${playerName}'s Handicap`}
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    WHS Handicap Index (0–54)
                  </Text>
                </View>

                {/* Input */}
                <View style={styles.form}>
                  <TextInput
                    value={value}
                    onChangeText={handleChange}
                    placeholder="e.g. 12.3"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    autoFocus
                    onSubmitEditing={handleSave}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: error ? colors.error : colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    accessibilityLabel="Handicap input"
                    accessibilityHint="Enter a handicap between 0 and 54"
                  />
                  {error && (
                    <Text
                      style={[styles.errorText, { color: colors.error }]}
                      accessibilityLiveRegion="polite"
                    >
                      {error}
                    </Text>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      { backgroundColor: colors.surfaceVariant },
                    ]}
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.button,
                      { backgroundColor: colors.primary },
                      isSaveDisabled && styles.buttonDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={isSaveDisabled}
                    accessibilityRole="button"
                    accessibilityLabel="Save handicap"
                    accessibilityState={{ disabled: isSaveDisabled }}
                  >
                    <Text style={[styles.buttonText, { color: colors.textOnColored }]}>
                      Save
                    </Text>
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
    marginBottom: spacing.lg,
  },
  input: {
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    ...typography.h4,
    textAlign: 'center',
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: 'center',
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.bodyBold,
  },
});

export default HandicapEditSheet;
