/**
 * BagSummarySection — home-screen card surfacing the user's bag at a glance.
 *
 * Mirrors the LastRoundSection card pattern. Tap navigates to the
 * What's-in-the-Bag screen. Subtitle shifts based on state:
 *   - empty bag (just the implicit putter) → "Set up your clubs"
 *   - configured but no shots tracked yet → "N / 14 clubs · No shots yet"
 *   - configured with shots → "N clubs · {longestClub} {distance} avg"
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import { useBag } from '@/hooks/queries/useBag';
import { usePerClubStats } from '@/hooks/queries/usePerClubStats';
import { useSettingsStore } from '@/store/settingsStore';
import { CLUBS_BY_KEY, MAX_BAG_SIZE, PUTTER_KEY, type ClubKey } from '@/constants/clubs';
import { metersToYards } from '@/utils/gpsCalculations';
import { SectionHeader } from './SectionHeader';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const BagSummarySection = React.memo(function BagSummarySection() {
  const colors = useThemeColors();
  const navigation = useNavigation<Nav>();
  const { player } = useAuth();
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);

  const { data: bag = [] } = useBag(player?.id);
  const { data: stats } = usePerClubStats(player?.id);

  // The bag query always surfaces the putter (UI invariant) — count clubs
  // beyond just the putter to detect the "not set up yet" state.
  const userPickedClubs = useMemo(
    () => bag.filter((k) => k !== PUTTER_KEY),
    [bag]
  );
  const isEmpty = userPickedClubs.length === 0;

  // Find the club with the longest average distance — flagship stat.
  const longest = useMemo(() => {
    if (!stats) return null;
    let best: { key: ClubKey; meters: number } | null = null;
    for (const [keyStr, entry] of Object.entries(stats)) {
      const key = keyStr as ClubKey;
      if (!entry?.averageMeters) continue;
      if (!best || entry.averageMeters > best.meters) {
        best = { key, meters: entry.averageMeters };
      }
    }
    return best;
  }, [stats]);

  const formatDistance = (meters: number) => {
    if (distanceUnit === 'yards') {
      return `${Math.round(metersToYards(meters))} yds`;
    }
    return `${Math.round(meters)} m`;
  };

  const subtitle = (() => {
    if (isEmpty) return 'Set up your clubs';
    const clubLine = `${bag.length} / ${MAX_BAG_SIZE} clubs`;
    if (longest) {
      return `${clubLine} · ${CLUBS_BY_KEY[longest.key].label} ${formatDistance(longest.meters)} avg`;
    }
    return `${clubLine} · No shots tracked yet`;
  })();

  return (
    <View style={styles.container}>
      <SectionHeader title="What's in the Bag" />
      <TouchableOpacity
        onPress={() => navigation.navigate('WhatsInTheBag')}
        accessibilityRole="button"
        accessibilityLabel="Open What's in the Bag"
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        <Icon source="golf" size={24} color={colors.primary} />
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {isEmpty ? 'Pick your clubs' : 'Your bag'}
          </Text>
          <Text style={[styles.subLabel, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Icon source="chevron-right" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  text: {
    flex: 1,
  },
  title: {
    ...typography.body,
    fontWeight: '700',
  },
  subLabel: {
    ...typography.caption,
    marginTop: 2,
  },
});
