/**
 * CustomTeeActionSheet — bottom sheet shown when the user wants to edit
 * a custom tee. Mirrors `ShotMarkerActionSheet`'s pattern. System tees
 * (back/front from GolfAPI) are read-only course data and never open
 * this sheet; it's only used for user-created custom tees.
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import {
  CUSTOM_TEE_COLORS,
  type CustomHoleTee,
} from '@/types/database/customHoleTees.types';

interface CustomTeeActionSheetProps {
  visible: boolean;
  tee: CustomHoleTee | null;
  onClose: () => void;
  onMoveOnMap: (tee: CustomHoleTee) => void;
  onDelete: (tee: CustomHoleTee) => void;
}

export function CustomTeeActionSheet({
  visible,
  tee,
  onClose,
  onMoveOnMap,
  onDelete,
}: CustomTeeActionSheetProps) {
  const colors = useThemeColors();

  if (!tee) return null;

  const meta = CUSTOM_TEE_COLORS.find((c) => c.key === tee.color);
  const colourLabel = meta?.label ?? tee.color;
  const swatch = meta?.swatch ?? colors.textSecondary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        testID="custom-tee-action-sheet-overlay"
      >
        <Pressable
          style={[styles.sheet, shadows.lg, { backgroundColor: colors.surfaceElevated }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.titleRow}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: swatch, borderColor: colors.borderLight },
              ]}
            />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {colourLabel} tee
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Move tee on map"
            onPress={() => onMoveOnMap(tee)}
            style={[styles.action, { borderColor: colors.border }]}
            testID="custom-tee-action-move"
          >
            <Icon source="cursor-move" size={22} color={colors.textPrimary} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>
              Move on map
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete tee"
            onPress={() => onDelete(tee)}
            style={[styles.action, { borderColor: colors.border }]}
            testID="custom-tee-action-delete"
          >
            <Icon source="trash-can-outline" size={22} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={onClose}
            style={styles.cancel}
            testID="custom-tee-action-cancel"
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
  },
  title: {
    ...typography.h4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    ...typography.body,
    fontWeight: '500',
  },
  cancel: {
    marginTop: spacing.md,
    alignItems: 'center',
    padding: spacing.md,
  },
  cancelText: {
    ...typography.body,
  },
});
