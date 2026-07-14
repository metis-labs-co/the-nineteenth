import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { BottomSheet } from '@/components/common/BottomSheet';
import { FormInput, SheetFooterActions } from '@/components/common';
import { spacing } from '@/constants/theme';

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

      <SheetFooterActions onCancel={onDismiss} onSave={handleSave} saving={isPending} />
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
});

export default EditNameSheet;
