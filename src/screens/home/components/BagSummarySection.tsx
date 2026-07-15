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
import {
  CLUBS,
  CLUBS_BY_KEY,
  MAX_BAG_SIZE,
  PUTTER_KEY,
  type ClubKey,
} from '@/constants/clubs';
import { metersToYards } from '@/utils/gpsCalculations';
import { Pill } from '@/components/common/Pill';
import { SectionHeader } from './SectionHeader';

// Short labels for the mini-pill row. The full club labels (e.g. "Pitching
// Wedge", "48° Wedge") are too long to fit 14 pills on one card.
const CLUB_SHORT_LABELS: Readonly<Record<ClubKey, string>> = {
  driver: 'DR',
  'mini-driver': 'MD',
  '3-wood': '3W',
  '4-wood': '4W',
  '5-wood': '5W',
  '7-wood': '7W',
  '2-hybrid': '2H',
  '3-hybrid': '3H',
  '4-hybrid': '4H',
  '5-hybrid': '5H',
  '1-iron': '1I',
  '2-iron': '2I',
  '3-iron': '3I',
  '4-iron': '4I',
  '5-iron': '5I',
  '6-iron': '6I',
  '7-iron': '7I',
  '8-iron': '8I',
  '9-iron': '9I',
  'pitching-wedge': 'PW',
  'gap-wedge': 'GW',
  'sand-wedge': 'SW',
  'lob-wedge': 'LW',
  'wedge-48': '48°',
  'wedge-50': '50°',
  'wedge-52': '52°',
  'wedge-54': '54°',
  'wedge-56': '56°',
  'wedge-58': '58°',
  'wedge-60': '60°',
  putter: 'PT',
};

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

  // Conventional bag display order — driver → woods → hybrids → irons →
  // wedges → putter. Sort by position in the master CLUBS list so the order
  // is deterministic and matches the picker / WhatsInTheBag screen.
  const sortedBag = useMemo(() => {
    const orderIndex = new Map(CLUBS.map((c, i) => [c.key, i]));
    return [...bag].sort(
      (a, b) => (orderIndex.get(a) ?? 99) - (orderIndex.get(b) ?? 99)
    );
  }, [bag]);

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
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.row}>
          <View
            style={[styles.iconSquare, { backgroundColor: colors.primaryBackground }]}
          >
            <Icon source="golf" size={22} color={colors.primary} />
          </View>
          <View style={styles.text}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {isEmpty ? 'Pick your clubs' : 'Your bag'}
            </Text>
            <Text style={[styles.subLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          <Icon source="chevron-right" size={20} color={colors.textSecondary} />
        </View>
        {!isEmpty && (
          <View style={styles.pillRow}>
            {sortedBag.map((key) => (
              <Pill
                key={key}
                label={CLUB_SHORT_LABELS[key] ?? key}
                size="sm"
                accessibilityLabel={CLUBS_BY_KEY[key]?.label ?? key}
              />
            ))}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconSquare: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
