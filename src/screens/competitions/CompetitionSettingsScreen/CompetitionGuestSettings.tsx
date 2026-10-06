import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { SectionHeader, ToggleSwitch } from '@/components/common';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export function CompetitionGuestSettings({
  allowGuests,
  onUpdate,
  onError,
}: {
  allowGuests: boolean;
  onUpdate: (value: boolean) => Promise<void>;
  onError: (message: string) => void;
}) {
  const colors = useThemeColors();
  const [value, setValue] = useState(allowGuests);
  const [isPending, setIsPending] = useState(false);
  const pending = useRef(false);

  useEffect(() => setValue(allowGuests), [allowGuests]);

  const update = async (next: boolean) => {
    if (pending.current) return;
    const previous = value;
    pending.current = true;
    setIsPending(true);
    setValue(next);
    try {
      await onUpdate(next);
    } catch {
      setValue(previous);
      onError('Could not update guest access. Please try again.');
    } finally {
      pending.current = false;
      setIsPending(false);
    }
  };

  return (
    <View>
      <SectionHeader title="Players" />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Allow guests</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Allow placeholder players without an account. Existing guests are never removed.
            </Text>
          </View>
          <ToggleSwitch
            value={value}
            onValueChange={(next) => void update(next)}
            disabled={isPending}
            accessibilityLabel="Allow guests"
            testID="competition-allow-guests"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    minHeight: 72,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  copy: { flex: 1, gap: spacing.xs },
  label: { ...typography.bodyBold },
  description: { ...typography.caption },
});
