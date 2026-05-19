import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet';
import { FormInput } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { WHATSAPP_INVITE_PATTERN, normalizeWhatsAppInvite } from '@/utils/whatsapp';

import { useUpdateCompetitionField } from './useUpdateCompetitionField';

export interface EditWhatsAppLinkSheetProps {
  visible: boolean;
  onDismiss: () => void;
  competitionId: string;
  currentUrl: string | null;
}

const HELP_TEXT =
  'In WhatsApp, create a group → tap the group name → Invite via Link → Copy. Paste the link below so members can join with one tap.';

export function EditWhatsAppLinkSheet({
  visible,
  onDismiss,
  competitionId,
  currentUrl,
}: EditWhatsAppLinkSheetProps) {
  const colors = useThemeColors();
  const [url, setUrl] = useState(currentUrl ?? '');

  useEffect(() => {
    if (visible) {
      setUrl(currentUrl ?? '');
    }
  }, [visible, currentUrl]);

  const { mutate, isPending } = useUpdateCompetitionField({
    competitionId,
    onSuccess: onDismiss,
  });

  const trimmed = url.trim();
  const isEmpty = trimmed === '';
  const isValid = useMemo(
    () => isEmpty || WHATSAPP_INVITE_PATTERN.test(trimmed),
    [trimmed, isEmpty]
  );
  const error =
    !isEmpty && !isValid
      ? 'Paste a WhatsApp group invite link (https://chat.whatsapp.com/...)'
      : undefined;

  const handleSave = useCallback(() => {
    if (!isValid) return;
    const next = isEmpty ? null : normalizeWhatsAppInvite(trimmed);
    if (next === (currentUrl ?? null)) {
      onDismiss();
      return;
    }
    mutate(
      { whatsapp_group_invite_url: next },
      {
        onError: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Please try again.';
          Alert.alert('Could not save link', message);
        },
      }
    );
  }, [isValid, isEmpty, trimmed, currentUrl, mutate, onDismiss]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="WhatsApp Group Link"
      height={0.7}
      useModal
      testID="edit-whatsapp-link-sheet"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.helpCard, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.helpText, { color: colors.textSecondary }]}>
            {HELP_TEXT}
          </Text>
        </View>

        <FormInput
          label="Group invite link"
          value={url}
          onChangeText={setUrl}
          placeholder="https://chat.whatsapp.com/..."
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="URL"
          autoFocus
          disabled={isPending}
          error={error}
          hint={isEmpty ? 'Leave blank to remove the link' : undefined}
          testID="edit-whatsapp-link-input"
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
          style={[
            styles.button,
            { backgroundColor: colors.primary },
            (!isValid || isPending) && styles.buttonDisabled,
          ]}
          activeOpacity={0.8}
          accessibilityRole="button"
          disabled={isPending || !isValid}
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
  helpCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  helpText: {
    ...typography.caption,
    lineHeight: 18,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    ...typography.bodyBold,
  },
});

export default EditWhatsAppLinkSheet;
