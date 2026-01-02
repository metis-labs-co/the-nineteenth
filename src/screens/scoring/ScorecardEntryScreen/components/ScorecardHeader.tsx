/**
 * ScorecardHeader Component
 *
 * Renders the header section of the scorecard entry screen:
 * - PageHeader with title, subtitle, back button, and action buttons
 * - Offline status indicator
 * - Sync line animation when syncing
 * - Scoring pairs info header (when enabled)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { PageHeader, OfflineIndicator } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import type { Player, TeeBox } from '@/types';

export interface ScorecardHeaderProps {
  courseName?: string;
  selectedTee?: TeeBox | null;
  onBack: () => void;
  onDeletePress?: () => void;
  isStandaloneRound: boolean;
  // Offline/sync state
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  onSyncPress: () => void;
  // Scoring pairs
  scoringPairsEnabled: boolean;
  playersToScore: Player[];
}

export function ScorecardHeader({
  courseName,
  selectedTee,
  onBack,
  onDeletePress,
  isStandaloneRound,
  isOnline,
  isSyncing,
  pendingSyncCount,
  onSyncPress,
  scoringPairsEnabled,
  playersToScore,
}: ScorecardHeaderProps) {
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

  // Sync line animation
  const syncLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSyncing) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(syncLineAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(syncLineAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      syncLineAnim.setValue(0);
    }
  }, [isSyncing, syncLineAnim]);

  // Compute offline status for indicator
  const getOfflineStatus = (): 'online' | 'offline' | 'syncing' | 'error' => {
    if (!isOnline) return 'offline';
    return 'online';
  };

  // Build right action buttons
  const rightActions = [
    // Delete button for standalone rounds
    ...(isStandaloneRound && onDeletePress
      ? [
          {
            icon: 'delete-outline' as const,
            onPress: onDeletePress,
            accessibilityLabel: 'Delete round',
            color: colors.error,
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Score Entry"
        subtitle={getSubtitle()}
        showBack
        onBack={onBack}
        rightActions={rightActions}
      />

      {/* Offline Status Indicator - only show when offline, not during sync */}
      <OfflineIndicator
        status={getOfflineStatus()}
        pendingSyncs={pendingSyncCount}
        onSyncPress={onSyncPress}
      />

      {/* Sync Line Indicator */}
      {isSyncing && (
        <View style={[styles.syncLineContainer, { backgroundColor: colors.gray200 }]}>
          <Animated.View
            style={[
              styles.syncLine,
              {
                backgroundColor: colors.primary,
                transform: [
                  {
                    translateX: syncLineAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-200, 400],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      )}

      {/* Scoring Pairs Info Header */}
      {scoringPairsEnabled && playersToScore.length > 0 && (
        <View style={[styles.scoringPairsHeader, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.scoringPairsLabel, { color: colors.primary }]}>
            Scoring for:{' '}
            <Text style={styles.scoringPairsNames}>
              {playersToScore.map((p) => p.name).join(', ')}
            </Text>
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  syncLineContainer: {
    height: 2,
    overflow: 'hidden',
  },
  syncLine: {
    width: 200,
    height: 2,
  },
  scoringPairsHeader: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  scoringPairsLabel: {
    ...typography.small,
  },
  scoringPairsNames: {
    ...typography.smallBold,
  },
});
