// src/components/moderation/ReportSheet.tsx
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Text } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet/BottomSheet';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import type { ReportReason } from '@/hooks/moderation';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'offensive', label: 'Offensive' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'nudity', label: 'Nudity' },
  { value: 'other', label: 'Other' },
];

export interface ReportSheetProps {
  visible: boolean;
  onSubmit: (reason: ReportReason, note?: string) => Promise<void>;
  onDismiss: () => void;
}

export function ReportSheet({ visible, onSubmit, onDismiss }: ReportSheetProps) {
  const colors = useThemeColors();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!reason) return;
    setIsBusy(true);
    try {
      // Blank or whitespace-only becomes undefined rather than an empty string,
      // so the column stores NULL and the operator email omits the line.
      await onSubmit(reason, note.trim() || undefined);
      onDismiss();
    } finally {
      setIsBusy(false);
    }
  }, [reason, note, onSubmit, onDismiss]);

  if (!visible) return null;

  return (
    <BottomSheet visible={visible} onClose={onDismiss} height={0.6} showHandle useModal>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Report content</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          It will be hidden from you straight away and reviewed within 24 hours.
        </Text>

        {REASONS.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[
              styles.reason,
              {
                borderColor: reason === r.value ? colors.primary : colors.border,
                backgroundColor: colors.surface,
              },
            ]}
            onPress={() => setReason(r.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: reason === r.value }}
          >
            <Text style={{ ...typography.body, color: colors.textPrimary }}>{r.label}</Text>
          </TouchableOpacity>
        ))}

        <TextInput
          style={[
            styles.note,
            { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surface },
          ]}
          value={note}
          onChangeText={setNote}
          placeholder="Add detail (optional)"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Add detail (optional)"
          multiline
          maxLength={500}
        />

        <TouchableOpacity
          style={[
            styles.submit,
            { backgroundColor: reason ? colors.error : colors.border },
          ]}
          onPress={handleSubmit}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Submit report"
        >
          <Text style={{ ...typography.bodyBold, color: colors.white }}>
            {isBusy ? 'Reporting…' : 'Report'}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.sm },
  title: { ...typography.h3 },
  body: { ...typography.body, marginBottom: spacing.sm },
  reason: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  note: {
    marginTop: spacing.sm,
    minHeight: 64,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    textAlignVertical: 'top',
  },
  submit: {
    marginTop: spacing.md,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
