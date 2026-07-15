/**
 * RoundListHeader - Page header with the Score Social Round feature button
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { IconChevronRight, IconPlus } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import {
  PageHeader,
  HeaderQuickActions,
  HeaderIconButton,
} from '@/components/common';

/** Design-spec gradient for the primary "Score a round" CTA (matches the
 * Add-players CTA / HeroCard convention — fixed greens in both themes). */
const SCORE_CTA_GRADIENT = ['#7cbd57', '#5f9a3f'] as const;

interface RoundListHeaderProps {
  onOpenNewRound: () => void;
  showInfoIcon?: boolean;
  onInfoPress?: () => void;
  onQuickScore?: () => void;
  showBack?: boolean;
  onBack?: () => void;
}

export function RoundListHeader({
  onOpenNewRound,
  showInfoIcon,
  onInfoPress,
  onQuickScore,
  showBack,
  onBack,
}: RoundListHeaderProps) {
  const colors = useThemeColors();

  return (
    <>
      <PageHeader
        title="Rounds"
        showBack={showBack}
        onBack={onBack}
        infoAction={
          showInfoIcon && onInfoPress
            ? { onPress: onInfoPress, accessibilityLabel: 'Rounds info' }
            : undefined
        }
        rightContent={
          // This IS the rounds screen, so hide the cluster's golf button.
          <HeaderQuickActions showRounds={false}>
            {onQuickScore ? (
              <HeaderIconButton
                icon="flash"
                onPress={onQuickScore}
                accessibilityLabel="Quick score entry"
              />
            ) : null}
          </HeaderQuickActions>
        }
      />

      <View style={styles.stickyHeader}>
        {/* Score New Round Button */}
        <TouchableOpacity
          style={styles.ctaShadow}
          onPress={onOpenNewRound}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Score new round"
        >
          <LinearGradient
            colors={[...SCORE_CTA_GRADIENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <View style={styles.ctaIconTile}>
              <IconPlus size={24} color={colors.textOnColored} strokeWidth={2.5} />
            </View>
            <View style={styles.ctaTextBlock}>
              <Text style={[styles.ctaTitle, { color: colors.textOnColored }]} numberOfLines={1}>
                Score Social Round
              </Text>
              <Text style={styles.ctaSubtitle} numberOfLines={1}>
                Start scoring a round at any course
              </Text>
            </View>
            <IconChevronRight size={20} color={colors.textOnColored} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    paddingTop: spacing.lg,
  },
  ctaShadow: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 18,
    shadowColor: '#5f9a3f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 13,
    elevation: 6,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: spacing.lg,
    borderRadius: 18,
    overflow: 'hidden',
  },
  ctaIconTile: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTextBlock: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  ctaSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
    // Fixed light text on the fixed green gradient (both themes).
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
