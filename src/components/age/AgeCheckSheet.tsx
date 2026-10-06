/**
 * AgeCheckSheet - one-time age confirmation for users with no age on file.
 *
 * Shown to existing accounts after the gated build lands. Dismissible: nothing
 * else in the app is blocked, so someone standing on the first tee can still
 * score their round. Social features stay off until this is answered.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet/BottomSheet';
import { DatePicker } from '@/components/common/DatePicker';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { parseDateInput } from '@/utils/formatting';

interface AgeCheckSheetProps {
  visible: boolean;
  onConfirm: (dob: Date) => Promise<void>;
  onDismiss: () => void;
}

export function AgeCheckSheet({ visible, onConfirm, onDismiss }: AgeCheckSheetProps) {
  const colors = useThemeColors();
  const [dob, setDob] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleConfirm = useCallback(async () => {
    const parsed = parseDateInput(dob);
    if (!parsed) {
      setError('Enter your date of birth as DD/MM/YYYY.');
      return;
    }
    setError(null);
    setIsBusy(true);
    try {
      await onConfirm(parsed);
    } catch {
      setError('Could not save that just now. You can try again from Settings.');
    } finally {
      setIsBusy(false);
    }
  }, [dob, onConfirm]);

  // Render nothing at all when hidden. The sheet is mounted app-wide via
  // AgeCheckPrompt, so without this its body (including the native-backed
  // DatePicker) is constructed on every screen for every user, whether or not
  // the prompt is due.
  if (!visible) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      height={0.55}
      showHandle
      showCloseButton={false}
      enableSwipeToDismiss={!isBusy}
      closeOnBackdropPress={!isBusy}
      useModal
    >
      <View style={styles.container}>
        <Icon source="shield-account" size={48} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Confirm your age
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          We ask so social features stay age-appropriate. We only store whether
          you&apos;re over 13 — never your date of birth.
        </Text>

        <View style={styles.field}>
          <DatePicker
            value={dob}
            onChange={setDob}
            mode="date"
            label="Date of birth"
            placeholder="DD/MM/YYYY"
            maximumDate={new Date()}
            error={error ?? undefined}
          />
        </View>

        <TouchableOpacity
          style={[styles.primary, { backgroundColor: colors.primary }]}
          onPress={handleConfirm}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Confirm your age"
        >
          <Text style={{ ...typography.bodyBold, color: colors.white }}>
            {isBusy ? 'Saving…' : 'Confirm'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDismiss}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Not now"
        >
          <Text style={[styles.secondary, { color: colors.textSecondary }]}>Not now</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h3, textAlign: 'center' },
  body: { ...typography.body, textAlign: 'center' },
  field: { width: '100%' },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    height: 48,
    width: '100%',
  },
  secondary: { ...typography.body, paddingVertical: spacing.sm },
});
