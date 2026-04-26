import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet';
import { FormInput } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';

import { useUpdateCompetitionField } from './useUpdateCompetitionField';

export interface EditNameSheetProps {
  visible: boolean;
  onDismiss: () => void;
  competitionId: string;
  currentName: string;
}

const MAX_NAME_LENGTH = 80;

export function EditNameSheet({
  visible,
  onDismiss,
  competitionId,
  currentName,
}: EditNameSheetProps) {
  const colors = useThemeColors();
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setError(null);
    }
  }, [visible, currentName]);

  const { mutate, isPending } = useUpdateCompetitionField({
    competitionId,
    onSuccess: onDismiss,
  });

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Competition name is required');
      return;
    }
    if (trimmed === currentName) {
      onDismiss();
      return;
    }
    mutate({ name: trimmed });
  }, [name, currentName, mutate, onDismiss]);

  const handleChange = useCallback((value: string) => {
    setName(value);
    if (error) setError(null);
  }, [error]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Competition Name"
      height={0.85}
      useModal
      testID="edit-name-sheet"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FormInput
          label="Name"
          value={name}
          onChangeText={handleChange}
          placeholder="Enter competition name"
          maxLength={MAX_NAME_LENGTH}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSave}
          error={error ?? undefined}
          disabled={isPending}
          testID="edit-name-input"
        />
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={onDismiss}
          style={[styles.button, styles.cancelButton, { borderColor: colors.gray300 }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          disabled={isPending}
        >
          <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.button, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          accessibilityRole="button"
          disabled={isPending}
        >
          <Text style={[styles.buttonLabel, { color: colors.white }]}>
            {isPending ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  buttonLabel: {
    ...typography.bodyBold,
  },
});

export default EditNameSheet;
