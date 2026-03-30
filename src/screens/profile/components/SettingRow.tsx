import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { ToggleSwitch } from '@/components/common';
import { spacing, typography } from '@/constants/theme';
import type { ColorPalette } from '@/constants/theme';

interface SettingRowProps {
  icon: string;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  colors: ColorPalette;
}

export const SettingRow = React.memo(function SettingRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  colors,
}: SettingRowProps) {
  return (
    <View style={[styles.settingRow, { borderBottomColor: colors.gray100 }]}>
      <View style={styles.settingRowLeft}>
        <Icon source={icon} size={20} color={colors.gray600} />
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{label}</Text>
          {description && (
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>{description}</Text>
          )}
        </View>
      </View>
      <ToggleSwitch
        value={value}
        onValueChange={onValueChange}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    minHeight: 64,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    marginRight: spacing.md,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    ...typography.body,
  },
  settingDescription: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
