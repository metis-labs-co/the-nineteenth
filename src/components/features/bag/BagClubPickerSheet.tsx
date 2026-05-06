/**
 * Single-select bottom-sheet picker. Used when logging a shot — the user
 * picks ONE club from their current bag, and we close + return the choice.
 *
 * Shows only the user's current bag (not the full canonical catalogue).
 * If the bag is empty, the sheet renders a CTA pointing to the Bag editor.
 */

import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { SystemModalTheme } from '@/components/common';
import { borderRadius, spacing, typography, shadows } from '@/constants/theme';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CLUBS_BY_KEY,
  type ClubKey,
} from '@/constants/clubs';

interface BagClubPickerSheetProps {
  visible: boolean;
  /** Current bag — only these clubs are shown as pickable. */
  bag: readonly ClubKey[];
  /** Title above the list — e.g. "Which club did you hit?" */
  title?: string;
  onPick: (clubKey: ClubKey) => void;
  onCancel: () => void;
  /** Called when the user taps "Set up your bag" on the empty state. */
  onSetupBag?: () => void;
}

export function BagClubPickerSheet({
  visible,
  bag,
  title = 'Which club did you hit?',
  onPick,
  onCancel,
  onSetupBag,
}: BagClubPickerSheetProps) {
  const colors = useThemeColors();

  // Group bag clubs by canonical category so the picker reads naturally.
  const grouped = useMemo(() => {
    const byCategory = new Map<(typeof CATEGORY_ORDER)[number], ClubKey[]>();
    for (const key of bag) {
      const club = CLUBS_BY_KEY[key];
      if (!club) continue;
      const list = byCategory.get(club.category) ?? [];
      list.push(key);
      byCategory.set(club.category, list);
    }
    return CATEGORY_ORDER
      .map((cat) => ({ category: cat, keys: byCategory.get(cat) ?? [] }))
      .filter((g) => g.keys.length > 0);
  }, [bag]);

  const isEmpty = bag.length === 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
      transparent={false}
    >
      <SystemModalTheme>
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[styles.flex, { backgroundColor: colors.surfaceElevated }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>{title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={onCancel}
            style={styles.closeButton}
            hitSlop={12}
          >
            <Icon source="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        {isEmpty ? (
          <View style={styles.emptyState}>
            <Icon source="golf" size={48} color={colors.textTertiary} />
            <Text
              style={[
                typography.body,
                styles.emptyTitle,
                { color: colors.textPrimary },
              ]}
            >
              Your bag is empty
            </Text>
            <Text
              style={[
                typography.small,
                styles.emptyMessage,
                { color: colors.textSecondary },
              ]}
            >
              Pick the clubs in your bag before you can log a shot.
            </Text>
            {onSetupBag && (
              <Pressable
                accessibilityRole="button"
                onPress={onSetupBag}
                style={[styles.cta, { backgroundColor: colors.primary }]}
              >
                <Text style={[typography.body, { color: colors.white, fontWeight: '600' }]}>
                  Set up your bag
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
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
                  {group.keys.map((key, idx) => (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={`Pick ${CLUBS_BY_KEY[key].label}`}
                      onPress={() => onPick(key)}
                      style={[
                        styles.row,
                        idx > 0 && {
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[typography.body, { color: colors.textPrimary }]}>
                        {CLUBS_BY_KEY[key].label}
                      </Text>
                      <Icon source="chevron-right" size={20} color={colors.textTertiary} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
      </SystemModalTheme>
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
  closeButton: {
    padding: spacing.xs,
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
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontWeight: '600',
    marginTop: spacing.md,
  },
  emptyMessage: {
    textAlign: 'center',
  },
  cta: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
