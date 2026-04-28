/**
 * ScorecardHeader Component
 *
 * Renders the header section of the scorecard entry screen:
 * - PageHeader with title, subtitle, back button, and action buttons
 * - Skins game indicator (when skins is active)
 * - Offline status indicator
 * - Sync line animation when syncing
 * - Scoring pairs info header (when enabled)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { ConfirmationDialog } from '@/components/common';
import { PageHeader, OfflineIndicator } from '@/components/common';
import { SkinsIndicator } from '@/components/skins';
import { WolfIndicator } from '@/components/wolf';
import { DistanceToPin } from '@/components/scorecard/HoleHeader/DistanceToPin';
import { getTeeColor } from '@/components/common/TeeSelector/hooks/useTeeSelector';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { Player, TeeBox } from '@/types';

export interface ScorecardHeaderProps {
  courseName?: string;
  selectedTee?: TeeBox | null;
  onBack: () => void;
  isStandaloneRound: boolean;
  // Round ID for skins indicator
  roundId: string;
  // GPS distance to pin
  courseId?: string;
  currentHole: number;
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
  isStandaloneRound: _isStandaloneRound,
  roundId,
  courseId,
  currentHole,
  isOnline,
  isSyncing,
  pendingSyncCount,
  onSyncPress,
  scoringPairsEnabled,
  playersToScore,
}: ScorecardHeaderProps) {
  const colors = useThemeColors();

  // Dialog state
  const [showSkinsAlert, setShowSkinsAlert] = useState(false);

  // Handle skins indicator press - show coming soon alert for now
  const _handleSkinsPress = useCallback(() => {
    setShowSkinsAlert(true);
  }, []);

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

  // Custom right content with GPS, skins indicator and delete button
  // All icons use consistent 32x32 containers with 18px icons
  const renderRightContent = () => (
    <View style={styles.rightContent}>
      {/* GPS Distance to Pin */}
      {courseId && (
        <DistanceToPin courseId={courseId} holeNumber={currentHole} />
      )}

      {/* Skins Indicator - shows when skins game is active (minimal variant = no background) */}
      <SkinsIndicator roundId={roundId} size="sm" variant="minimal" />

      {/* Wolf Indicator - shows when Wolf game is active */}
      <WolfIndicator roundId={roundId} currentHole={currentHole} size="sm" variant="minimal" />
    </View>
  );

  return (
    <>
      <PageHeader
        title="Score Entry"
        subtitle={renderSubtitle()}
        showBack
        onBack={onBack}
        rightContent={renderRightContent()}
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
        <View style={[styles.scoringPairsHeader, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.scoringPairsLabel, { color: colors.primary }]}>
            Scoring for:{' '}
            <Text style={styles.scoringPairsNames}>
              {playersToScore.map((p) => p.name).join(', ')}
            </Text>
          </Text>
        </View>
      )}

      {/* Skins Tracking Alert */}
      <ConfirmationDialog
        visible={showSkinsAlert}
        title="Skins Tracking"
        message="Detailed skins tracking view coming soon! Use the popover for quick summary."
        confirmLabel="OK"
        cancelLabel=""
        onConfirm={() => setShowSkinsAlert(false)}
        onCancel={() => setShowSkinsAlert(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerIconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
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
