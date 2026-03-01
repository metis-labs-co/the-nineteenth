/**
 * GenerateBracketSheet - Bottom sheet for configuring and generating the bracket
 *
 * Allows organizer to choose seeding method and generate the bracket.
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { SegmentedButton } from '@/components/common/SegmentedButton';
import { GolfBallLoader } from '@/components/common';
import type { SeedingMethod } from '@/types/database';

export interface GenerateBracketSheetProps {
  visible: boolean;
  onClose: () => void;
  playerCount: number;
  isValidCount: boolean;
  onGenerate: (seedingMethod: SeedingMethod) => void;
  isGenerating: boolean;
}

export function GenerateBracketSheet({
  visible,
  onClose,
  playerCount,
  isValidCount,
  onGenerate,
  isGenerating,
}: GenerateBracketSheetProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [seedingMethod, setSeedingMethod] = useState<SeedingMethod>('handicap');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + spacing.lg,
            },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Generate Bracket
          </Text>

          {/* Player count info */}
          <View style={[styles.infoRow, { backgroundColor: colors.surfaceVariant }]}>
            <Icon
              source={isValidCount ? 'check-circle' : 'alert-circle'}
              size={20}
              color={isValidCount ? colors.success : colors.warning}
            />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {isValidCount
                ? `${playerCount} players — ready to generate`
                : `${playerCount} players — need exactly 4, 8, 16, or 32 players`}
            </Text>
          </View>

          {/* Seeding method */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Seeding Method
          </Text>
          <SegmentedButton<SeedingMethod>
            value={seedingMethod}
            onValueChange={setSeedingMethod}
            buttons={[
              { value: 'handicap', label: 'By Handicap', icon: 'sort-ascending' },
              { value: 'random', label: 'Random', icon: 'shuffle-variant' },
            ]}
            style={styles.seedingToggle}
          />
          <Text style={[styles.seedingHint, { color: colors.textDisabled }]}>
            {seedingMethod === 'handicap'
              ? 'Lowest handicap = seed #1. Ensures top players don\'t meet until later rounds.'
              : 'Players are randomly seeded. Fair for casual competitions.'}
          </Text>

          {/* Generate button */}
          <TouchableOpacity
            style={[
              styles.generateButton,
              {
                backgroundColor: isValidCount ? colors.primary : colors.gray300,
              },
            ]}
            onPress={() => isValidCount && onGenerate(seedingMethod)}
            disabled={!isValidCount || isGenerating}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Generate bracket"
          >
            {isGenerating ? (
              <GolfBallLoader size="sm" />
            ) : (
              <>
                <Icon source="tournament" size={20} color={colors.white} />
                <Text style={[styles.generateButtonText, { color: colors.white }]}>
                  Generate Bracket
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Warning */}
          <Text style={[styles.warning, { color: colors.textDisabled }]}>
            This will create all rounds and match slots. Players cannot be added or removed after bracket generation.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    ...typography.body,
    flex: 1,
  },
  sectionLabel: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  seedingToggle: {
    marginBottom: spacing.sm,
  },
  seedingHint: {
    ...typography.caption,
    marginBottom: spacing.xl,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  generateButtonText: {
    ...typography.bodyBold,
  },
  warning: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
