/**
 * RoundListHeader - Page header with the Score Social Round feature button
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { IconPlus } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { PageHeader, FeatureButton } from '@/components/common';

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

  const rightActions = [];
  if (onQuickScore) {
    rightActions.push({ icon: 'flash', onPress: onQuickScore, accessibilityLabel: 'Quick score entry' });
  }
  if (showInfoIcon && onInfoPress) {
    rightActions.push({ icon: 'information-outline', onPress: onInfoPress, accessibilityLabel: 'Rounds info' });
  }

  return (
    <>
      <PageHeader
        title="Rounds"
        showBack={showBack}
        onBack={onBack}
        rightActions={rightActions}
      />

      <View style={styles.stickyHeader}>
        {/* Score New Round Button */}
        <FeatureButton
          title="Score Social Round"
          subtitle="Start scoring a round at any course"
          icon={<IconPlus size={24} color={colors.white} strokeWidth={2.5} />}
          onPress={onOpenNewRound}
          accessibilityLabel="Score new round"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    paddingTop: spacing.lg,
  },
});
