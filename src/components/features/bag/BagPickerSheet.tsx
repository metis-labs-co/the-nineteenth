/**
 * Multi-select bag editor sheet. Shows the full canonical catalogue with
 * the user's current bag preselected; user toggles clubs to construct
 * their next bag (max 14, putter locked). On save, the parent diffs
 * against the current bag and persists the changes.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography, shadows } from '@/constants/theme';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CLUBS,
  MAX_BAG_SIZE,
  PUTTER_KEY,
  type ClubKey,
} from '@/constants/clubs';
import { ensurePutter, isBagFull, toggleClub } from '@/utils/bag';

interface BagPickerSheetProps {
  visible: boolean;
  /** Current bag — used as the initial selection. */
  current: readonly ClubKey[];
  onCancel: () => void;
  onSave: (next: ClubKey[]) => void;
  /** Disable the Save button while a parent mutation is in flight. */
  saving?: boolean;
}

export function BagPickerSheet({
  visible,
  current,
  onCancel,
  onSave,
  saving = false,
}: BagPickerSheetProps) {
  const colors = useThemeColors();
  const [selected, setSelected] = useState<ClubKey[]>(() =>
    ensurePutter(current)
  );

  // Reset local selection whenever the sheet (re-)opens or the underlying
  // bag changes — prevents stale state on next open.
  useEffect(() => {
    if (visible) {
      setSelected(ensurePutter(current));
    }
  }, [visible, current]);

  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      clubs: CLUBS.filter((c) => c.category === cat),
    }));
  }, []);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const full = isBagFull(selected);

  const handleToggle = (key: ClubKey) => {
    setSelected((prev) => toggleClub(prev, key));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
      transparent={false}
    >
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[styles.flex, { backgroundColor: colors.surfaceElevated }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={onCancel}
            hitSlop={12}
            style={styles.cancelHit}
          >
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[typography.h3, { color: colors.textPrimary }]}>
              What&apos;s in the Bag
            </Text>
            <Text
              style={[
                typography.caption,
                styles.counter,
                { color: full ? colors.error : colors.textSecondary },
              ]}
            >
              {selected.length} / {MAX_BAG_SIZE}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save bag"
            accessibilityState={{ disabled: saving }}
            disabled={saving}
            onPress={() => onSave(selected)}
            hitSlop={12}
            style={styles.saveHit}
          >
            <Text
              style={[
                typography.body,
                { color: saving ? colors.textTertiary : colors.primary, fontWeight: '600' },
              ]}
            >
              Save
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {grouped.map((group) => (
            <View key={group.category} style={styles.section}>
              <Text
                style={[
                  typography.caption,
                  styles.sectionHeader,
                  { color: colors.textSecondary },
                ]}
              >
                {CATEGORY_LABELS[group.category].toUpperCase()}
              </Text>
              <View style={[styles.sectionGroup, { backgroundColor: colors.surface }]}>
                {group.clubs.map((club, idx) => {
                  const isSelected = selectedSet.has(club.key);
                  const isPutter = club.key === PUTTER_KEY;
                  // Prevent adding (but not removing) when at the cap.
                  const blockedByCap = full && !isSelected;
                  const interactable = !isPutter && !blockedByCap;

                  return (
                    <Pressable
                      key={club.key}
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: isSelected,
                        disabled: !interactable,
                      }}
                      accessibilityLabel={
                        isPutter
                          ? `${club.label} (always in bag)`
                          : club.label
                      }
                      onPress={interactable ? () => handleToggle(club.key) : undefined}
                      style={[
                        styles.row,
                        idx > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: isSelected ? colors.primary : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && (
                          <Icon source="check" size={14} color={colors.white} />
                        )}
                      </View>
                      <Text
                        style={[
                          typography.body,
                          styles.label,
                          {
                            color: interactable
                              ? colors.textPrimary
                              : colors.textTertiary,
                          },
                        ]}
                      >
                        {club.label}
                        {isPutter && (
                          <Text
                            style={[
                              typography.caption,
                              { color: colors.textTertiary },
                            ]}
                          >
                            {'  · always in bag'}
                          </Text>
                        )}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {full && (
            <View
              style={[
                styles.capNotice,
                { backgroundColor: colors.errorLight ?? colors.gray100 },
              ]}
            >
              <Icon source="information" size={16} color={colors.error} />
              <Text style={[typography.caption, { color: colors.error }]}>
                Bag is full. Remove a club before adding another.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancelHit: {
    minWidth: 60,
  },
  saveHit: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  counter: {
    marginTop: 2,
    fontWeight: '600',
  },
  list: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    letterSpacing: 0.5,
    fontWeight: '700',
    paddingHorizontal: spacing.xs,
  },
  sectionGroup: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
  capNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
});
