/**
 * PhotoSourceMenu - action menu for choosing a photo source.
 *
 * Offers "Take Photo" (camera) and "Choose from Library". State is owned by the
 * parent; this component only emits callbacks. Generic — not tied to profiles
 * (cf. AvatarSourceMenu, which is profile-specific).
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { BottomSheet } from './BottomSheet';

export interface PhotoSourceMenuProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
}

interface Row {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
}

function PhotoSourceMenuComponent({
  visible,
  onClose,
  onTakePhoto,
  onChooseFromLibrary,
}: PhotoSourceMenuProps) {
  const colors = useThemeColors();

  const rows: Row[] = [
    { key: 'camera', label: 'Take Photo', icon: 'camera', onPress: onTakePhoto },
    { key: 'library', label: 'Choose from Library', icon: 'image-multiple', onPress: onChooseFromLibrary },
  ];

  const renderRow = useCallback(
    (row: Row) => (
      <TouchableOpacity
        key={row.key}
        style={[styles.row, { borderBottomColor: colors.border }]}
        activeOpacity={0.7}
        onPress={row.onPress}
        accessibilityRole="button"
        accessibilityLabel={row.label}
      >
        <Icon source={row.icon} size={22} color={colors.textPrimary} />
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{row.label}</Text>
      </TouchableOpacity>
    ),
    [colors]
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={0.3}
      title="Add Photo"
      showCloseButton
      testID="photo-source-menu"
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

export const PhotoSourceMenu = React.memo(PhotoSourceMenuComponent);

export default PhotoSourceMenu;
