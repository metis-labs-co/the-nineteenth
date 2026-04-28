/**
 * MatchPlayHeader Component
 *
 * Renders the header section of the match play scoring screen:
 * - PageHeader with title, subtitle (course/tee info), back button, and action buttons
 * - Skins game indicator (when skins is active) - uses built-in popover
 * - Delete button for super admins
 *
 * Matches the pattern used by ScorecardHeader.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { PageHeader } from '@/components/common';
import { SkinsIndicator } from '@/components/skins';
import { getTeeColor } from '@/components/common/TeeSelector/hooks/useTeeSelector';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import type { TeeBox } from '@/types';

export interface MatchPlayHeaderProps {
  courseName?: string;
  selectedTee?: TeeBox | null;
  onBack: () => void;
  isSuperAdmin: boolean;
  roundId: string;
}

export function MatchPlayHeader({
  courseName,
  selectedTee,
  onBack,
  isSuperAdmin: _isSuperAdmin,
  roundId,
}: MatchPlayHeaderProps) {
  const colors = useThemeColors();

  // Build subtitle with course name, color circle, and tee name
  const renderSubtitle = (): React.ReactNode | undefined => {
    if (!courseName) return undefined;

    if (selectedTee?.name) {
      const teeColorHex = getTeeColor(selectedTee.color, colors.textDisabled);
      return (
        <View style={styles.subtitleContainer}>
          <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
            {courseName} -{' '}
          </Text>
          <View
            style={[styles.teeColorCircle, { backgroundColor: teeColorHex }]}
          />
          <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
            {' '}{selectedTee.name}
          </Text>
        </View>
      );
    }

    return courseName;
  };

  // Custom right content with skins indicator only — the delete action lived
  // here historically, dropped now that the action is exposed elsewhere.
  const renderRightContent = () => (
    <View style={styles.rightContent}>
      {/* Skins Indicator - shows when skins game is active, uses built-in popover */}
      <SkinsIndicator roundId={roundId} size="sm" />
    </View>
  );

  return (
    <PageHeader
      title="Match Play"
      subtitle={renderSubtitle()}
      showBack
      onBack={onBack}
      rightContent={renderRightContent()}
    />
  );
}

const styles = StyleSheet.create({
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitleText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 16,
  },
  teeColorCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default MatchPlayHeader;
