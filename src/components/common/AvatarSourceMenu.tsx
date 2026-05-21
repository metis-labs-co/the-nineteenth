/**
 * AvatarSourceMenu - action menu for choosing a profile photo source.
 *
 * Shown when the user taps their avatar in Edit Profile. Offers camera, library,
 * the preset-avatar grid, and (when a custom photo is set) removal. State is
 * owned by the parent; this component only emits callbacks.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { BottomSheet } from './BottomSheet';

export interface AvatarSourceMenuProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
  onChooseAvatar: () => void;
  onRemovePhoto: () => void;
  /** Whether a custom uploaded photo is currently set (controls Remove visibility). */
  canRemove: boolean;
}

interface Row {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
}

function AvatarSourceMenuComponent({
  visible,
  onClose,
  onTakePhoto,
  onChooseFromLibrary,
  onChooseAvatar,
  onRemovePhoto,
  canRemove,
}: AvatarSourceMenuProps) {
  const colors = useThemeColors();

  const rows: Row[] = [
    { key: 'camera', label: 'Take Photo', icon: 'camera', onPress: onTakePhoto },
    { key: 'library', label: 'Choose from Library', icon: 'image-multiple', onPress: onChooseFromLibrary },
    { key: 'avatar', label: 'Choose an Avatar', icon: 'emoticon-happy-outline', onPress: onChooseAvatar },
  ];
  if (canRemove) {
    rows.push({ key: 'remove', label: 'Remove Photo', icon: 'trash-can-outline', onPress: onRemovePhoto, destructive: true });
  }

  const renderRow = useCallback(
    (row: Row) => {
      const color = row.destructive ? colors.error : colors.textPrimary;
      return (
        <TouchableOpacity
          key={row.key}
          style={[styles.row, { borderBottomColor: colors.border }]}
          activeOpacity={0.7}
          onPress={row.onPress}
          accessibilityRole="button"
          accessibilityLabel={row.label}
          accessibilityHint={row.destructive ? 'Permanently removes your profile photo' : undefined}
        >
          <Icon source={row.icon} size={22} color={color} />
          <Text style={[styles.rowLabel, { color }]}>{row.label}</Text>
        </TouchableOpacity>
      );
    },
    [colors]
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={0.45}
      title="Profile Photo"
      showCloseButton
      testID="avatar-source-menu"
    >
      <View style={styles.container}>{rows.map(renderRow)}</View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  rowLabel: {
    ...typography.body,
  },
});

export const AvatarSourceMenu = React.memo(AvatarSourceMenuComponent);

export default AvatarSourceMenu;
