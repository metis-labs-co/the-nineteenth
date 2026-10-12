/**
 * RoundOptionsSheet — the score-entry ⋮ menu for a social round's owner.
 * Presentational: rows come from getRoundOptionsRows.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { BottomSheet } from '@/components/common/BottomSheet';
import { SystemModalTheme } from '@/components/common/SystemModalTheme';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import type { RoundOptionKey, RoundOptionRow } from './roundOptionsRows';

export interface RoundOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  rows: RoundOptionRow[];
  onSelect: (key: RoundOptionKey) => void;
}

function RoundOptionsRows({
  rows,
  onSelect,
}: Pick<RoundOptionsSheetProps, 'rows' | 'onSelect'>) {
  // Must run inside SystemModalTheme so surfaces resolve to solid colours.
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {rows.map((row) => {
        const tint = row.disabled
          ? colors.textTertiary
          : row.destructive
            ? colors.error
            : colors.textPrimary;
        return (
          <TouchableOpacity
            key={row.key}
            style={[styles.row, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
            disabled={row.disabled}
            onPress={() => onSelect(row.key)}
            accessibilityRole="button"
            accessibilityLabel={row.label}
            accessibilityState={{ disabled: row.disabled }}
            accessibilityHint={row.caption}
          >
            <Icon source={row.icon} size={22} color={tint} />
            <View style={styles.text}>
              <Text style={[styles.label, { color: tint }]}>{row.label}</Text>
              {row.caption ? (
                <Text style={[styles.caption, { color: colors.textSecondary }]}>
                  {row.caption}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function RoundOptionsSheet({ visible, onClose, rows, onSelect }: RoundOptionsSheetProps) {
  return (
    <SystemModalTheme>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        height={0.5}
        title="Round options"
        showCloseButton
        testID="round-options-sheet"
      >
        <RoundOptionsRows rows={rows} onSelect={onSelect} />
      </BottomSheet>
    </SystemModalTheme>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  text: { flex: 1, gap: 2 },
  label: { ...typography.body },
  caption: { ...typography.caption },
});
