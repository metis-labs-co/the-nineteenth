import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { SectionHeader, ToggleSwitch } from '@/components/common';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { Competition } from '@/types/database.types';

type NotificationField = Pick<
  Competition,
  'round_reminders_enabled' | 'results_summary_enabled'
>;

interface Props extends NotificationField {
  onUpdate: <K extends keyof NotificationField>(
    field: K,
    value: NotificationField[K]
  ) => Promise<void>;
  onError: (message: string) => void;
}

interface NotificationToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  pending: boolean;
  onChange: (value: boolean) => void;
}

function NotificationToggleRow({
  label,
  description,
  value,
  pending,
  onChange,
}: NotificationToggleRowProps) {
  const colors = useThemeColors();
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <ToggleSwitch
        value={value}
        onValueChange={onChange}
        disabled={pending}
        accessibilityLabel={label}
        testID={`competition-notification-${label.toLowerCase().replaceAll(' ', '-')}`}
      />
    </View>
  );
}

export function CompetitionNotificationSettings({
  round_reminders_enabled,
  results_summary_enabled,
  onUpdate,
  onError,
}: Props) {
  const colors = useThemeColors();
  const [roundReminders, setRoundReminders] = useState(round_reminders_enabled);
  const [resultsSummary, setResultsSummary] = useState(results_summary_enabled);
  const [pendingField, setPendingField] = useState<keyof NotificationField | null>(null);
  const pendingFieldRef = useRef<keyof NotificationField | null>(null);

  useEffect(() => {
    setRoundReminders(round_reminders_enabled);
  }, [round_reminders_enabled]);

  useEffect(() => {
    setResultsSummary(results_summary_enabled);
  }, [results_summary_enabled]);

  const updateRoundReminders = async (value: boolean) => {
    if (pendingFieldRef.current) return;
    const previous = roundReminders;
    pendingFieldRef.current = 'round_reminders_enabled';
    setRoundReminders(value);
    setPendingField('round_reminders_enabled');
    try {
      await onUpdate('round_reminders_enabled', value);
    } catch {
      setRoundReminders(previous);
      onError('Could not update round reminders. Please try again.');
    } finally {
      pendingFieldRef.current = null;
      setPendingField(null);
    }
  };

  const updateResultsSummary = async (value: boolean) => {
    if (pendingFieldRef.current) return;
    const previous = resultsSummary;
    pendingFieldRef.current = 'results_summary_enabled';
    setResultsSummary(value);
    setPendingField('results_summary_enabled');
    try {
      await onUpdate('results_summary_enabled', value);
    } catch {
      setResultsSummary(previous);
      onError('Could not update results summary. Please try again.');
    } finally {
      pendingFieldRef.current = null;
      setPendingField(null);
    }
  };

  return (
    <View>
      <SectionHeader title="Notifications" />
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <NotificationToggleRow
          label="Round reminders"
          description="Notify players shortly before their tee time."
          value={roundReminders}
          pending={pendingField !== null}
          onChange={(value) => void updateRoundReminders(value)}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <NotificationToggleRow
          label="Results summary"
          description="Notify players when every scorecard for a round is complete."
          value={resultsSummary}
          pending={pendingField !== null}
          onChange={(value) => void updateResultsSummary(value)}
        />
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    ...typography.bodyBold,
  },
  description: {
    ...typography.caption,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
  },
});
