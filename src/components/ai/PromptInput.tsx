/**
 * PromptInput - Multi-line text input for AI competition prompts
 *
 * Provides a styled text area for entering natural language
 * descriptions of desired competitions.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';

interface PromptInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  placeholder?: string;
  minLength?: number;
}

export function PromptInput({
  value,
  onChangeText,
  onSubmit,
  isLoading = false,
  placeholder = 'Describe your competition...\n\nExample: Create a 4-round competition with 2 teams of 4, mixing Stableford and Best Ball formats.',
  minLength = 10,
}: PromptInputProps) {
  const colors = useThemeColors();
  const canSubmit = value.trim().length >= minLength && !isLoading;
  const charCount = value.trim().length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inputWrapper}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          Describe your competition
        </Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Include details like number of rounds, game types, teams, and players
        </Text>

        <View
          style={[
            styles.textAreaContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <TextInput
            style={[
              styles.textArea,
              { color: colors.textPrimary },
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            editable={!isLoading}
            maxLength={2000}
          />

          {/* Character count */}
          <View style={styles.charCountContainer}>
            <Text
              style={[
                styles.charCount,
                { color: charCount < minLength ? colors.textDisabled : colors.textSecondary },
              ]}
            >
              {charCount} / 2000
            </Text>
          </View>
        </View>

        {/* Generate button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            { backgroundColor: canSubmit ? colors.primary : colors.gray300 },
            isLoading && styles.generateButtonLoading,
          ]}
          onPress={onSubmit}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={[styles.generateButtonText, { color: colors.white }]}>
                Generating...
              </Text>
            </>
          ) : (
            <>
              <Icon source="auto-fix" size={20} color={colors.white} />
              <Text style={[styles.generateButtonText, { color: colors.white }]}>
                Generate Competition
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputWrapper: {
    gap: spacing.md,
  },
  label: {
    ...typography.h4,
  },
  hint: {
    ...typography.small,
    marginTop: -spacing.xs,
  },
  textAreaContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  textArea: {
    ...typography.body,
    minHeight: 150,
    maxHeight: 250,
    padding: spacing.md,
  },
  charCountContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  charCount: {
    ...typography.caption,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  generateButtonLoading: {
    opacity: 0.9,
  },
  generateButtonText: {
    ...typography.bodyBold,
  },
});

export default PromptInput;
