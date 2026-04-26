import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet';
import { FormInput } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';

import { useUpdateCompetitionField } from './useUpdateCompetitionField';

export interface EditDescriptionSheetProps {
  visible: boolean;
  onDismiss: () => void;
  competitionId: string;
  currentDescription: string | null;
}

const MAX_DESCRIPTION_LENGTH = 500;

export function EditDescriptionSheet({
  visible,
  onDismiss,
  competitionId,
  currentDescription,
}: EditDescriptionSheetProps) {
  const colors = useThemeColors();
  const [description, setDescription] = useState(currentDescription ?? '');

  useEffect(() => {
    if (visible) {
      setDescription(currentDescription ?? '');
    }
  }, [visible, currentDescription]);

  const { mutate, isPending } = useUpdateCompetitionField({
    competitionId,
    onSuccess: onDismiss,
  });

  const handleSave = useCallback(() => {
    const trimmed = description.trim();
    const next = trimmed === '' ? null : trimmed;
    if (next === (currentDescription ?? null)) {
      onDismiss();
      return;
    }
    mutate({ description: next });
  }, [description, currentDescription, mutate, onDismiss]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Description"
      height={0.85}
      useModal
      testID="edit-description-sheet"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FormInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Add some details about this competition"
          multiline
          numberOfLines={5}
          maxLength={MAX_DESCRIPTION_LENGTH}
          autoFocus
          disabled={isPending}
          hint={`${description.length}/${MAX_DESCRIPTION_LENGTH}`}
          testID="edit-description-input"
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

export default EditDescriptionSheet;
