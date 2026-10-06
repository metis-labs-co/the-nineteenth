/**
 * HandicapSourceSection - Handicap mode selector for round creation
 *
 * Allows Premium users to choose between profile Handicap and Social Handicap Index
 * for daily handicap calculations.
 *
 * When tee and course data is provided, also displays:
 * - The selected handicap value (profile or Social Index)
 * - The calculated Daily Handicap based on the selected course/tee
 */

import React, { memo, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsPremium } from '@/context/SubscriptionContext';
import { SegmentedButton } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { calculateNineAwareDailyHandicap } from '@/utils/dailyHandicap';
import { filterHolesByNineType } from '@/utils/holeTransformers';
import type { TeeBox } from '@/types/database.types';
import type { HandicapSource, Hole } from '@/types/database';
import type { NineType } from '@/types/database/enums';
import type { PlayingPartner } from '../../types';

interface HandicapSourceSectionProps {
  handicapSource: HandicapSource;
  onHandicapSourceChange: (source: HandicapSource) => void;
  /** Selected tee for daily handicap calculation */
  selectedTee?: TeeBox | null;
  /** Course holes for par calculation (passed directly to avoid async fetch) */
  holes?: Hole[] | null;
  /** Which holes are being played — drives 9-hole daily handicap calculation */
  nineType?: NineType;
  /** Playing partners selected for the round */
  selectedPartners?: PlayingPartner[];
  /** Callback to refresh course/tee data when slope/CR is missing */
  onRefreshCourseData?: () => void;
  /** Whether course data is currently refreshing */
  isRefreshing?: boolean;
}

interface PlayerHandicapInfo {
  id: string;
  name: string;
  handicap: number | null;
  socialIndex: number | null;
  dailyHandicap: number | null;
  teeName: string | null;
}

export const HandicapSourceSection = memo(function HandicapSourceSection({
  handicapSource,
  onHandicapSourceChange,
  selectedTee,
  holes,
  nineType = 'full',
  selectedPartners = [],
  onRefreshCourseData,
  isRefreshing = false,
}: HandicapSourceSectionProps) {
  const colors = useThemeColors();
  const isPremium = useIsPremium();
  const { player } = useAuth();

  // Calculate handicap values for the current user (used in segmented button labels)
  const handicapInfo = useMemo(() => {
    if (!player) return null;
    return {
      gaHandicap: player.handicap ?? null,
      socialIndex: player.handicap_index ?? null,
    };
  }, [player]);

  // Build player list with handicap info (current user + partners)
  const allPlayers = useMemo((): PlayerHandicapInfo[] => {
    // Sum par over only the holes being played so a 9-hole round pairs a
    // 9-hole par with a matching (9-hole or halved) course rating.
    const coursePar = Array.isArray(holes) && holes.length > 0
      ? filterHolesByNineType(holes, nineType).reduce((sum, h) => sum + h.par, 0)
      : 0;

    const calcDaily = (
      baseHC: number | null,
      tee: TeeBox | null | undefined,
      gender?: 'male' | 'female' | null
    ): number | null => {
      if (baseHC == null || !tee?.slopeRating || !tee?.courseRating || coursePar <= 0) return null;
      return calculateNineAwareDailyHandicap({
        gaHandicap: baseHC,
        nineType,
        par: coursePar,
        slopeRating: tee.slopeRating,
        courseRating: tee.courseRating,
        slopeRatingFront9: tee.slopeRatingFront9,
        courseRatingFront9: tee.courseRatingFront9,
        slopeRatingBack9: tee.slopeRatingBack9,
        courseRatingBack9: tee.courseRatingBack9,
        gender: gender ?? undefined,
      }).dailyHandicap;
    };

    const getBase = (
      handicap: number | null | undefined,
      socialIdx: number | null | undefined
    ): number | null => {
      if (handicapSource === 'calculated') return socialIdx ?? handicap ?? null;
      return handicap ?? null;
    };

    const players: PlayerHandicapInfo[] = [];

    // Current user first (uses the default selected tee)
    if (player) {
      const hc = player.handicap ?? null;
      const si = player.handicap_index ?? null;
      players.push({
        id: player.id,
        name: player.name ?? 'You',
        handicap: hc,
        socialIndex: si,
        dailyHandicap: calcDaily(getBase(hc, si), selectedTee, player.gender),
        teeName: selectedTee?.name ?? null,
      });
    }

    // Playing partners (use per-player tee override, fallback to default)
    for (const p of selectedPartners) {
      const hc = p.handicap ?? null;
      const si = p.handicapIndex ?? null;
      const partnerTee = p.selectedTee ?? selectedTee;
      players.push({
        id: p.id,
        name: p.name,
        handicap: hc,
        socialIndex: si,
        dailyHandicap: calcDaily(getBase(hc, si), partnerTee, p.gender),
        teeName: partnerTee?.name ?? null,
      });
    }

    return players;
  }, [player, selectedPartners, handicapSource, selectedTee, holes, nineType]);

  const hintText = handicapSource === 'calculated'
    ? 'Uses Social Handicap Index from your app rounds (profile handicap fallback)'
    : 'Uses your handicap as entered in your profile';

  // Whether tee data is missing for daily handicap calculation
  const missingTeeData = selectedTee != null && (!selectedTee.slopeRating || !selectedTee.courseRating);

  // Format handicap display value
  const formatHandicap = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';
    return value >= 0 ? value.toFixed(1) : `+${Math.abs(value).toFixed(1)}`;
  };

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
          <Icon source="golf-tee" size={18} color={colors.primary} />
        </View>
        <Text style={[styles.label, { color: colors.textPrimary }]}>Handicap Mode</Text>
      </View>

      {/* Handicap source toggle — Premium only */}
      {isPremium ? (
        <>
          <SegmentedButton
            value={handicapSource}
            onValueChange={(value) => onHandicapSourceChange(value as HandicapSource)}
            buttons={[
              {
                value: 'profile',
                label: `Handicap${handicapInfo?.gaHandicap != null ? ` (${formatHandicap(handicapInfo.gaHandicap)})` : ''}`,
                icon: 'card-account-details',
              },
              {
                value: 'calculated',
                label: `Social Index${handicapInfo?.socialIndex != null ? ` (${formatHandicap(handicapInfo.socialIndex)})` : ''}`,
                icon: 'calculator',
              },
            ]}
            size="medium"
          />
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {hintText}
          </Text>
        </>
      ) : (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Using your profile handicap for daily handicap calculations
        </Text>
      )}

      {/* Player handicap list */}
      {allPlayers.length > 0 && (
        <View style={[styles.playerList, { backgroundColor: colors.surfaceVariant }]}>
          {/* Tee info header — only when all players on same tee */}
          {(() => {
            const teeNames = new Set(allPlayers.map((p) => p.teeName).filter(Boolean));
            if (teeNames.size === 1 && selectedTee?.slopeRating && selectedTee?.courseRating) {
              return (
                <Text style={[styles.teeInfoText, { color: colors.textSecondary }]}>
                  {selectedTee.name} tees · Slope {selectedTee.slopeRating} · CR {selectedTee.courseRating}
                </Text>
              );
            }
            return null;
          })()}

          {/* Missing tee data notice */}
          {missingTeeData && (
            <View style={[styles.missingDataNotice, { backgroundColor: colors.warningLight }]}>
              <Icon source="information-outline" size={16} color={colors.warning} />
              <View style={styles.missingDataContent}>
                <Text style={[styles.missingDataText, { color: colors.textPrimary }]}>
                  Daily handicap unavailable — the selected tee is missing slope or course rating data.
                </Text>
                {onRefreshCourseData && (
                  <TouchableOpacity
                    style={[styles.refreshButton, { backgroundColor: colors.surface }]}
                    onPress={onRefreshCourseData}
                    disabled={isRefreshing}
                    activeOpacity={0.7}
                  >
                    {isRefreshing ? (
                      <ActivityIndicator size={14} color={colors.primary} />
                    ) : (
                      <Icon source="refresh" size={14} color={colors.primary} />
                    )}
                    <Text style={[styles.refreshButtonText, { color: colors.primary }]}>
                      {isRefreshing ? 'Refreshing...' : 'Refresh Course Data'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Column headers */}
          <View style={styles.playerHeaderRow}>
            <Text style={[styles.playerHeaderName, { color: colors.textSecondary }]}>Player</Text>
            <Text style={[styles.playerHeaderStat, { color: colors.textSecondary }]}>HC</Text>
            <Text style={[styles.playerHeaderStat, { color: colors.textSecondary }]}>Daily</Text>
            <Text style={[styles.playerHeaderStat, { color: colors.textSecondary }]}>Social</Text>
          </View>

          {/* Player rows */}
          {(() => {
            const teeNames = new Set(allPlayers.map((p) => p.teeName).filter(Boolean));
            const hasMultipleTees = teeNames.size > 1;

            return allPlayers.map((p, idx) => (
              <View
                key={p.id}
                style={[
                  styles.playerRow,
                  idx < allPlayers.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.playerNameColumn}>
                  <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {hasMultipleTees && p.teeName && (
                    <Text style={[styles.playerTeeLabel, { color: colors.textSecondary }]}>
                      {p.teeName}
                    </Text>
                  )}
                </View>
                <Text style={[styles.playerStat, { color: colors.textPrimary }]}>
                  {formatHandicap(p.handicap)}
                </Text>
                <Text style={[styles.playerStat, { color: colors.primary, ...typography.smallBold }]}>
                  {p.dailyHandicap != null ? p.dailyHandicap : '-'}
                </Text>
                <Text style={[styles.playerStat, { color: colors.textSecondary }]}>
                  {formatHandicap(p.socialIndex)}
                </Text>
              </View>
            ));
          })()}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...typography.bodyBold,
  },
  hint: {
    ...typography.small,
    lineHeight: 18,
  },
  playerList: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  teeInfoText: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  playerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  playerHeaderName: {
    ...typography.caption,
    flex: 1,
  },
  playerHeaderStat: {
    ...typography.caption,
    width: 50,
    textAlign: 'right',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  playerNameColumn: {
    flex: 1,
  },
  playerName: {
    ...typography.smallBold,
  },
  playerTeeLabel: {
    ...typography.caption,
    fontSize: 10,
  },
  playerStat: {
    ...typography.small,
    width: 50,
    textAlign: 'right',
  },
  missingDataNotice: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  missingDataContent: {
    flex: 1,
    gap: spacing.sm,
  },
  missingDataText: {
    ...typography.caption,
    lineHeight: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  refreshButtonText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
