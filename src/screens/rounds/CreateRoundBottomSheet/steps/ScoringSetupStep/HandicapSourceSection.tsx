/**
 * HandicapSourceSection - Handicap mode selector for round creation
 *
 * Allows Premium users to choose between profile Handicap and Social Handicap Index
 * for daily handicap calculations. Locked for Free tier users.
 *
 * When tee and course data is provided, also displays:
 * - The selected handicap value (profile or Social Index)
 * - The calculated Daily Handicap based on the selected course/tee
 */

import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsPremium } from '@/context/SubscriptionContext';
import { SegmentedButton, Pill } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { calculateGADailyHandicap } from '@/utils/dailyHandicap';
import type { TeeBox } from '@/types/database.types';
import type { HandicapSource, Hole } from '@/types/database';
import type { PlayingPartner } from '../../types';

interface HandicapSourceSectionProps {
  handicapSource: HandicapSource;
  onHandicapSourceChange: (source: HandicapSource) => void;
  /** Selected tee for daily handicap calculation */
  selectedTee?: TeeBox | null;
  /** Course holes for par calculation (passed directly to avoid async fetch) */
  holes?: Hole[] | null;
  /** Playing partners selected for the round */
  selectedPartners?: PlayingPartner[];
}

interface PlayerHandicapInfo {
  id: string;
  name: string;
  handicap: number | null;
  socialIndex: number | null;
  dailyHandicap: number | null;
}

export const HandicapSourceSection = memo(function HandicapSourceSection({
  handicapSource,
  onHandicapSourceChange,
  selectedTee,
  holes,
  selectedPartners = [],
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
    const canCalcDaily =
      selectedTee?.slopeRating && selectedTee?.courseRating && holes?.length;
    const coursePar = canCalcDaily
      ? holes!.reduce((sum, h) => sum + h.par, 0)
      : 0;

    const calcDaily = (
      baseHC: number | null,
      gender?: 'male' | 'female' | null
    ): number | null => {
      if (baseHC == null || !canCalcDaily || coursePar <= 0) return null;
      return calculateGADailyHandicap({
        gaHandicap: baseHC,
        slopeRating: selectedTee!.slopeRating!,
        courseRating: selectedTee!.courseRating!,
        par: coursePar,
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

    // Current user first
    if (player) {
      const hc = player.handicap ?? null;
      const si = player.handicap_index ?? null;
      players.push({
        id: player.id,
        name: player.name ?? 'You',
        handicap: hc,
        socialIndex: si,
        dailyHandicap: calcDaily(getBase(hc, si), player.gender),
      });
    }

    // Playing partners
    for (const p of selectedPartners) {
      const hc = p.handicap ?? null;
      const si = p.handicapIndex ?? null;
      players.push({
        id: p.id,
        name: p.name,
        handicap: hc,
        socialIndex: si,
        dailyHandicap: calcDaily(getBase(hc, si), p.gender),
      });
    }

    return players;
  }, [player, selectedPartners, handicapSource, selectedTee, holes]);

  const hintText = handicapSource === 'calculated'
    ? 'Uses Social Handicap Index from your app rounds (profile handicap fallback)'
    : 'Uses your handicap as entered in your profile';

  // Format handicap display value
  const formatHandicap = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';
    return value >= 0 ? value.toFixed(1) : `+${Math.abs(value).toFixed(1)}`;
  };

  if (!isPremium) {
    return (
      <View style={[styles.container, styles.lockedContainer, { backgroundColor: colors.gray100, borderColor: colors.gray200 }]}>
        <View style={styles.headerRow}>
          <View style={[styles.iconContainer, { backgroundColor: colors.gray200 }]}>
            <Icon source="golf-tee" size={18} color={colors.gray500} />
          </View>
          <View style={styles.labelContainer}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.gray500 }]}>Handicap Mode</Text>
              <Pill label="Premium" variant="warning" size="sm" />
            </View>
            <Text style={[styles.hint, { color: colors.gray400 }]}>
              Upgrade to choose between your handicap and Social Index
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
          <Icon source="golf-tee" size={18} color={colors.primary} />
        </View>
        <Text style={[styles.label, { color: colors.textPrimary }]}>Handicap Mode</Text>
      </View>

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

      {/* Player handicap list */}
      {allPlayers.length > 0 && (
        <View style={[styles.playerList, { backgroundColor: colors.surfaceVariant }]}>
          {/* Tee info header */}
          {selectedTee?.slopeRating && selectedTee?.courseRating && (
            <Text style={[styles.teeInfoText, { color: colors.textSecondary }]}>
              {selectedTee.name} tees · Slope {selectedTee.slopeRating} · CR {selectedTee.courseRating}
            </Text>
          )}

          {/* Column headers */}
          <View style={styles.playerHeaderRow}>
            <Text style={[styles.playerHeaderName, { color: colors.textSecondary }]}>Player</Text>
            <Text style={[styles.playerHeaderStat, { color: colors.textSecondary }]}>HC</Text>
            <Text style={[styles.playerHeaderStat, { color: colors.textSecondary }]}>Daily</Text>
            <Text style={[styles.playerHeaderStat, { color: colors.textSecondary }]}>Social</Text>
          </View>

          {/* Player rows */}
          {allPlayers.map((p, idx) => (
            <View
              key={p.id}
              style={[
                styles.playerRow,
                idx < allPlayers.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
                {p.name}
              </Text>
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
          ))}
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
  lockedContainer: {
    opacity: 0.8,
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
  labelContainer: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  playerName: {
    ...typography.smallBold,
    flex: 1,
  },
  playerStat: {
    ...typography.small,
    width: 50,
    textAlign: 'right',
  },
});
