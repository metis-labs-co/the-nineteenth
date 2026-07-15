import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { ToggleSwitch } from '@/components/common';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { ColorPalette } from '@/constants/theme';

interface SettingRowProps {
  icon: string | React.ReactNode;
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
    <View style={[styles.settingRow, { borderBottomColor: colors.borderLight }]}>
      <View style={styles.settingRowLeft}>
        <View style={[styles.iconSquare, { backgroundColor: colors.primaryBackground }]}>
          {typeof icon === 'string' ? (
            <Icon source={icon} size={18} color={colors.primary} />
          ) : (
            icon
          )}
        </View>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 64,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    marginRight: spacing.md,
  },
  iconSquare: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
  },
  settingDescription: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
