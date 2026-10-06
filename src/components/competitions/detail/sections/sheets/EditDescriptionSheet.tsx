import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { BottomSheet } from '@/components/common/BottomSheet';
import { FormInput, SheetFooterActions } from '@/components/common';
import { spacing } from '@/constants/theme';

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

export default EditDescriptionSheet;
