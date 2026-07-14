/**
 * RoundHeader Component
 *
 * Shared header for every score-entry screen (stroke play, match play,
 * team match play). Renders:
 *  - PageHeader with title (club / course / format fallback) and a
 *    course + tee-colour-circle subtitle
 *  - Right-aligned indicators: GPS distance-to-pin (opens HoleMap),
 *    SkinsIndicator, WolfIndicator. Each indicator self-hides when its
 *    game isn't active for the round.
 *  - OfflineIndicator + animated sync line when offline / syncing
 *  - Scoring-pairs banner (optional — stroke play only)
 *
 * Designed to replace the per-screen ScorecardHeader / MatchPlayHeader /
 * TeamMatchPlayHeader copies, all of which were ~95% the same code.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Pressable } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import {
  ConfirmationDialog,
  PageHeader,
  OfflineIndicator,
} from '@/components/common';
import { SkinsIndicator } from '@/components/skins';
import { WolfIndicator } from '@/components/wolf';
import { DistanceToPin } from '@/components/scorecard/HoleHeader/DistanceToPin';
import { getTeeColor } from '@/components/common/TeeSelector/hooks/useTeeSelector';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import type { Player, TeeBox } from '@/types';

export interface RoundHeaderProps {
  /** Title fallback when no club / course name is available. */
  titleFallback?: string;
  /** Club (venue) name — preferred title when available. */
  clubName?: string | null;
  /** Course name — preferred subtitle, also used as title when no club. */
  courseName?: string | null;
  selectedTee?: TeeBox | null;
  onBack: () => void;

  /** Round id — required, drives skins/wolf indicators and the map sheet. */
  roundId: string;
  /** Course id — required for the GPS distance-to-pin badge. Omit to hide. */
  courseId?: string;
  currentHole: number;

  /** Offline / sync state. */
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  failedSyncCount?: number;
  syncError?: string | null;
  onSyncPress: () => void;

  /** Scoring-pairs banner (stroke play only — leave default false otherwise). */
  scoringPairsEnabled?: boolean;
  playersToScore?: Player[];

  /** When true, show a "change tees" action in the header (owner/organizer). */
  canChangeTees?: boolean;
  /** Called when the change-tees action is tapped while online. */
  onChangeTeesPress?: () => void;
  /** Called when tapped while offline (e.g. to toast a hint). */
  onChangeTeesBlockedOffline?: () => void;
}

export function RoundHeader({
  titleFallback = 'Score Entry',
  clubName,
  courseName,
  selectedTee,
  onBack,
  roundId,
  courseId,
  currentHole,
  isOnline,
  isSyncing,
  pendingSyncCount,
  failedSyncCount = 0,
  syncError,
  onSyncPress,
  scoringPairsEnabled = false,
  playersToScore = [],
  canChangeTees = false,
  onChangeTeesPress,
  onChangeTeesBlockedOffline,
}: RoundHeaderProps) {
  const colors = useThemeColors();

  // Skins-indicator-info popover (placeholder until detailed view ships).
  const [showSkinsAlert, setShowSkinsAlert] = useState(false);
  const _handleSkinsPress = useCallback(() => {
    setShowSkinsAlert(true);
  }, []);

  const handleChangeTeesPress = () => {
    if (isOnline) {
      onChangeTeesPress?.();
    } else {
      onChangeTeesBlockedOffline?.();
    }
  };

  const renderSubtitle = (): React.ReactNode | undefined => {
    if (!courseName) return undefined;

    if (selectedTee?.name) {
      const teeColorHex = getTeeColor(selectedTee.color, colors.textDisabled);
      const teeContent = (
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
          {canChangeTees && (
            <Icon
              source="chevron-down"
              size={16}
              color={isOnline ? colors.textSecondary : colors.textDisabled}
            />
          )}
        </View>
      );

      if (!canChangeTees) return teeContent;

      return (
        <Pressable
          onPress={handleChangeTeesPress}
          accessibilityRole="button"
          accessibilityLabel="Change tees"
          accessibilityState={{ disabled: !isOnline }}
          hitSlop={8}
          testID="round-header-change-tees"
        >
          {teeContent}
        </Pressable>
      );
    }

    return courseName;
  };

  // Animated bar that scrolls during sync — mirrors the original
  // ScorecardHeader behaviour exactly (1s loop, 200→400px translate).
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
    }
    syncLineAnim.setValue(0);
    return undefined;
  }, [isSyncing, syncLineAnim]);

  const offlineStatus: 'online' | 'offline' | 'syncing' | 'error' = !isOnline
    ? 'offline'
    : isSyncing
      ? 'syncing'
      : failedSyncCount > 0 || syncError
        ? 'error'
        : 'online';

  const renderRightContent = () => (
    <View style={styles.rightContent}>
      {courseId && (
        <DistanceToPin courseId={courseId} holeNumber={currentHole} roundId={roundId} />
      )}
      <SkinsIndicator roundId={roundId} size="sm" variant="minimal" />
      <WolfIndicator roundId={roundId} currentHole={currentHole} size="sm" variant="minimal" />
    </View>
  );

  return (
    <>
      <PageHeader
        title={clubName || courseName || titleFallback}
        subtitle={renderSubtitle()}
        showBack
        onBack={onBack}
        rightContent={renderRightContent()}
      />

      <OfflineIndicator
        status={offlineStatus}
        pendingSyncs={pendingSyncCount + failedSyncCount}
        errorMessage={syncError || (failedSyncCount > 0
          ? `${failedSyncCount} score change${failedSyncCount === 1 ? '' : 's'} not uploaded`
          : undefined)}
        onSyncPress={onSyncPress}
        isSyncing={isSyncing}
      />

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

export default RoundHeader;
