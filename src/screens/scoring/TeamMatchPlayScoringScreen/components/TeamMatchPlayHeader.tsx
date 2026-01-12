/**
 * TeamMatchPlayHeader Component
 *
 * Renders the header section of the team match play scoring screen:
 * - PageHeader with title, subtitle (course/tee info), back button, and action buttons
 * - Skins game indicator (when skins is active) - uses built-in popover
 * - Delete button for super admins
 *
 * Matches the pattern used by MatchPlayHeader.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { PageHeader } from '@/components/common';
import { SkinsIndicator } from '@/components/skins';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import type { TeeBox } from '@/types';

export interface TeamMatchPlayHeaderProps {
  courseName?: string;
  selectedTee?: TeeBox | null;
  onBack: () => void;
  onDeletePress?: () => void;
  isSuperAdmin: boolean;
  roundId: string;
}

export function TeamMatchPlayHeader({
  courseName,
  selectedTee,
  onBack,
  onDeletePress,
  isSuperAdmin,
  roundId,
}: TeamMatchPlayHeaderProps) {
  const colors = useThemeColors();

  // Build subtitle with course name and tee info
  const getSubtitle = (): string | undefined => {
    if (!courseName) return undefined;

    if (selectedTee?.name) {
      const teeInfo = selectedTee.color
        ? `${selectedTee.name} (${selectedTee.color})`
        : selectedTee.name;
      return `${courseName} - ${teeInfo}`;
    }

    return courseName;
  };

  // Custom right content with skins indicator and delete button
  const renderRightContent = () => (
    <View style={styles.rightContent}>
      {/* Skins Indicator - shows when skins game is active, uses built-in popover */}
      <SkinsIndicator roundId={roundId} size="sm" />

      {/* Delete button for super admins */}
      {isSuperAdmin && onDeletePress && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onDeletePress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Delete match"
        >
          <Icon source="delete-outline" size={24} color={colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <PageHeader
      title="Team Match Play"
      subtitle={getSubtitle()}
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
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
});

export default TeamMatchPlayHeader;
