import React from 'react';
import { Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { clubLabel } from '@/constants/clubs';
import type { ShotLogEntry } from '@/types/database/shotLog.types';

interface ShotMarkerActionSheetProps {
  visible: boolean;
  shot: ShotLogEntry | null;
  onClose: () => void;
  onDelete: (shot: ShotLogEntry) => void;
  onMoveOnMap: (shot: ShotLogEntry) => void;
  onChangeClub?: (shot: ShotLogEntry) => void;
}

export function ShotMarkerActionSheet({
  visible,
  shot,
  onClose,
  onDelete,
  onMoveOnMap,
  onChangeClub,
}: ShotMarkerActionSheetProps) {
  const colors = useThemeColors();

  if (!shot) return null;

  const club = clubLabel(shot.club_used);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} testID="shot-action-sheet-overlay">
        <Pressable
          style={[styles.sheet, shadows.lg, { backgroundColor: colors.surfaceElevated }]}
          // Stop the inner press from bubbling to overlay-dismiss.
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Shot {shot.sequence}
            {shot.club_used && (
              <Text style={[styles.titleClub, { color: colors.textSecondary }]}>
                {'  · '}{club}
              </Text>
            )}
          </Text>

          {onChangeClub && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change club"
              onPress={() => onChangeClub(shot)}
              style={[styles.action, { borderColor: colors.border }]}
              testID="shot-action-change-club"
            >
              <Icon source="golf" size={22} color={colors.textPrimary} />
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>
                {shot.club_used ? 'Change club' : 'Set club'}
              </Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Move shot on map"
            onPress={() => onMoveOnMap(shot)}
            style={[styles.action, { borderColor: colors.border }]}
            testID="shot-action-move"
          >
            <Icon source="cursor-move" size={22} color={colors.textPrimary} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>
              Move on map
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete shot"
            onPress={() => onDelete(shot)}
            style={[styles.action, { borderColor: colors.border }]}
            testID="shot-action-delete"
          >
            <Icon source="trash-can-outline" size={22} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={onClose}
            style={styles.cancel}
            testID="shot-action-cancel"
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
  title: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  titleClub: {
    ...typography.body,
    fontWeight: '400',
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
