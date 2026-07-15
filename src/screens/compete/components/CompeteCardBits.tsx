/**
 * CompeteCardBits - Presentational sub-pieces for the Compete hub cards
 *
 * Pure display components for the polished Compete cards (design L431-523):
 * dot + uppercase status pill, role pill, and the gradient create CTA.
 * No data logic lives here.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows } from '@/constants/theme';
import type { ColorPalette } from '@/context/ThemeContext';

/**
 * Status pill palette per design: live/active = green tint, upcoming = info
 * tint, completed/draft = muted, cancelled = error tint. Labels match the
 * StatusBadge defaults the previous cards rendered.
 */
export const getCompeteStatusStyle = (
  status: string,
  colors: ColorPalette
): { label: string; bg: string; dot: string; text: string } => {
  switch (status?.toLowerCase()) {
    case 'active':
      return {
        label: 'Active',
        bg: colors.primaryBackground,
        dot: colors.primary,
        text: colors.primaryDark,
      };
    case 'in-progress':
      return {
        label: 'In Progress',
        bg: colors.primaryBackground,
        dot: colors.primary,
        text: colors.primaryDark,
      };
    case 'upcoming':
      return {
        label: 'Upcoming',
        bg: colors.infoLight,
        dot: colors.info,
        text: colors.infoDark,
      };
    case 'completed':
      return {
        label: 'Completed',
        bg: colors.surfaceVariant,
        dot: colors.textTertiary,
        text: colors.textSecondary,
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        bg: colors.errorLight,
        dot: colors.error,
        text: colors.errorDark,
      };
    case 'draft':
    default:
      return {
        label: 'Draft',
        bg: colors.surfaceVariant,
        dot: colors.textTertiary,
        text: colors.textSecondary,
      };
  }
};

/** Dot + uppercase label status pill (design L443-446). */
export function CompeteStatusPill({
  status,
  label,
}: {
  status: string;
  /** Optional label override (e.g. leagues show "Archived" for completed styling). */
  label?: string;
}) {
  const colors = useThemeColors();
  const s = getCompeteStatusStyle(status, colors);
  return (
    <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
      <Text style={[styles.statusPillText, { color: s.text }]}>{label ?? s.label}</Text>
    </View>
  );
}

/** Organiser (green tint) / Player (muted) role pill (design L469). */
export function CompeteRolePill({ isOrganizer }: { isOrganizer: boolean }) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.rolePill,
        { backgroundColor: isOrganizer ? colors.primaryBackground : colors.surfaceVariant },
      ]}
    >
      <Text
        style={[
          styles.rolePillText,
          { color: isOrganizer ? colors.primaryDark : colors.textSecondary },
        ]}
      >
        {isOrganizer ? 'Organiser' : 'Player'}
      </Text>
    </View>
  );
}

export interface GradientCreateCtaProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
}

/**
 * Gradient create CTA (design L417-420): compact FeatureButton layout on a
 * primary gradient. Same strings/handler contract as the button it restyles.
 */
export function GradientCreateCta({
  title,
  subtitle,
  icon,
  onPress,
  accessibilityLabel,
  testID,
}: GradientCreateCtaProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={styles.ctaContainer}
    >
      <LinearGradient
        colors={[colors.primaryLight, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ctaGradient}
      >
        <View style={styles.ctaIconContainer}>{icon}</View>
        <View style={styles.ctaTextContainer}>
          <Text style={[styles.ctaTitle, { color: colors.white }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.ctaSubtitle, { color: colors.white }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  rolePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ctaContainer: {
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: 64,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  ctaIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  ctaSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
