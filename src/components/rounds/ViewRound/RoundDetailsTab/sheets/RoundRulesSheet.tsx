/**
 * RoundRulesSheet — Read-only view of a round preset's rules.
 *
 * Surfaced from the Round Type row when the round is in-progress or
 * completed (i.e. the editor sheet is locked). Lets players read the
 * format's summary and long-form rules without giving them edit access.
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { BottomSheet } from '@/components/common/BottomSheet';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import type { RoundPreset } from '@/constants/roundPresets';

export interface RoundRulesSheetProps {
  visible: boolean;
  onDismiss: () => void;
  preset: RoundPreset | null;
}

export function RoundRulesSheet({
  visible,
  onDismiss,
  preset,
}: RoundRulesSheetProps) {
  const colors = useThemeColors();

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Round Rules"
      height={0.55}
      useModal
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {preset ? (
          <>
            <View style={styles.header}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.primaryLighter },
                ]}
              >
                <Icon source={preset.icon} size={28} color={colors.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {preset.title}
                </Text>
                <Text style={[styles.summary, { color: colors.textSecondary }]}>
                  {preset.summary}
                </Text>
              </View>
            </View>

            <Text style={[styles.body, { color: colors.textPrimary }]}>
              {preset.longDescription}
            </Text>
          </>
        ) : (
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            This round uses a custom format. Ask the organiser for the rules.
          </Text>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.h3,
  },
  summary: {
    ...typography.body,
  },
  body: {
    ...typography.body,
    lineHeight: 22,
  },
});
