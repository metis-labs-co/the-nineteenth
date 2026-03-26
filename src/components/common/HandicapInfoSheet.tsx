/**
 * HandicapInfoSheet - Bottom sheet explaining handicap terminology
 *
 * Displays clear explanations for:
 * - Handicap (HC) - Player's handicap from profile
 * - Social Handicap Index - Calculated from app rounds
 * - Daily Handicap (DHC) - Strokes received for a specific round
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { BottomSheet } from './BottomSheet';

export interface HandicapInfoSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface InfoSectionProps {
  icon: string;
  title: string;
  abbreviation: string;
  description: string;
  formula?: string;
}

function InfoSection({ icon, title, abbreviation, description, formula }: InfoSectionProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.section, { backgroundColor: colors.surfaceVariant }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
          <Icon source={icon} size={20} color={colors.primary} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
          <View style={[styles.abbreviationBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.abbreviationText, { color: colors.white }]}>{abbreviation}</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
        {description}
      </Text>
      {formula && (
        <View style={[styles.formulaContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.formulaLabel, { color: colors.textTertiary }]}>Formula:</Text>
          <Text style={[styles.formulaText, { color: colors.textSecondary }]}>{formula}</Text>
        </View>
      )}
    </View>
  );
}

export function HandicapInfoSheet({ visible, onClose }: HandicapInfoSheetProps) {
  const colors = useThemeColors();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={0.7}
      title="Handicap Explained"
      showCloseButton
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Understanding the different handicap values used in The Nineteenth.
        </Text>

        <InfoSection
          icon="card-account-details"
          title="Handicap"
          abbreviation="HC"
          description="Your handicap as entered in your profile. This is the handicap you set manually and represents your verified playing ability."
        />

        <InfoSection
          icon="calculator"
          title="Social Handicap Index"
          abbreviation="Social"
          description="Automatically calculated from your last 20 rounds played in The Nineteenth. Uses the World Handicap System (WHS) formula to determine your playing ability based on your scores in the app."
          formula="Average of best 8 differentials × 0.96"
        />

        <InfoSection
          icon="golf"
          title="Daily Handicap"
          abbreviation="DHC"
          description="The number of strokes you receive for a specific round. This is calculated using your profile or Social handicap combined with the course and slope ratings of the tees you're playing. A harder course gives you more strokes."
          formula="(HC × Slope ÷ 113) + (CR - Par) × 0.93"
        />

        <View style={[styles.tipContainer, { backgroundColor: colors.infoLight }]}>
          <Icon source="lightbulb-outline" size={20} color={colors.infoDark} />
          <Text style={[styles.tipText, { color: colors.infoDark }]}>
            Competition organizers can choose whether to use your profile Handicap or Social Handicap Index for daily handicap calculations.
          </Text>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  intro: {
    ...typography.body,
    marginBottom: spacing.sm,
  },
  section: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyBold,
  },
  abbreviationBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  abbreviationText: {
    ...typography.caption,
    fontWeight: '600',
  },
  sectionDescription: {
    ...typography.small,
    lineHeight: 20,
  },
  formulaContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  formulaLabel: {
    ...typography.caption,
    marginBottom: 2,
  },
  formulaText: {
    ...typography.small,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  tipText: {
    ...typography.small,
    flex: 1,
    lineHeight: 20,
  },
});
