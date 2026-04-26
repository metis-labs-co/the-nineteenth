import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { BottomSheet } from '@/components/common/BottomSheet';
import { FormInput } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { supabase } from '@/services/supabase/client';
import { roundKeys } from '@/hooks/queryKeys';

export interface EditRoundNameSheetProps {
  visible: boolean;
  onDismiss: () => void;
  roundId: string;
  currentName: string | null;
  /** Shown as placeholder/helper so the user sees the derived fallback */
  derivedTitle?: string;
}

const MAX_NAME_LENGTH = 80;

export function EditRoundNameSheet({
  visible,
  onDismiss,
  roundId,
  currentName,
  derivedTitle,
}: EditRoundNameSheetProps) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const [name, setName] = useState(currentName ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(currentName ?? '');
      setError(null);
    }
  }, [visible, currentName]);

  const { mutate, isPending } = useMutation({
    mutationFn: async (nextName: string | null) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase.from('rounds') as any)
        .update({ name: nextName })
        .eq('id', roundId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roundKeys.detail(roundId) });
      onDismiss();
    },
    onError: (err) => {
      console.error('[EditRoundNameSheet] Failed to update round name:', err);
      setError('Could not save the round name. Please try again.');
    },
  });

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    const nextValue = trimmed.length === 0 ? null : trimmed;
    if (nextValue === (currentName ?? null)) {
      onDismiss();
      return;
    }
    mutate(nextValue);
  }, [name, currentName, mutate, onDismiss]);

  const handleChange = useCallback((value: string) => {
    setName(value);
    if (error) setError(null);
  }, [error]);

  const placeholder = derivedTitle
    ? `Defaults to "${derivedTitle}"`
    : 'Enter round name';

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Round Name"
      height={0.85}
      useModal
      testID="edit-round-name-sheet"
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
          placeholder={placeholder}
          maxLength={MAX_NAME_LENGTH}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSave}
          error={error ?? undefined}
          disabled={isPending}
          testID="edit-round-name-input"
        />
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          Leave blank to use the default title.
        </Text>
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

export default EditRoundNameSheet;

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  helperText: {
    ...typography.caption,
    marginTop: spacing.sm,
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
