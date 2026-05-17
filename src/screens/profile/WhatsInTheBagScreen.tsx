import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, ActivityIndicator, Pressable } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography, shadows } from '@/constants/theme';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionHeader } from '@/components/common';
import { MenuItemRow } from '@/screens/profile/components/MenuItemRow';

import { useAuth } from '@/hooks/useAuth';
import { useBag, useBagDetails, useUpdateBag, type BagEntry } from '@/hooks/queries/useBag';
import { usePerClubStats } from '@/hooks/queries/usePerClubStats';
import { useSettingsStore } from '@/store/settingsStore';

import { BagPickerSheet } from '@/components/features/bag/BagPickerSheet';
import { ClubFittingSheet } from '@/components/features/bag/ClubFittingSheet';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CLUBS_BY_KEY,
  PUTTER_KEY,
  type ClubKey,
} from '@/constants/clubs';
import { EMPTY_FITTING, fittingSummary, type ClubFitting } from '@/utils/clubFitting';
import { metersToYards } from '@/utils/gpsCalculations';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function WhatsInTheBagScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const colors = useThemeColors();
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);

  const { player } = useAuth();
  const { data: bag = [], isLoading: bagLoading } = useBag(player?.id);
  const { data: bagDetails = [] } = useBagDetails(player?.id);
  const { data: stats, isLoading: statsLoading } = usePerClubStats(player?.id);
  const updateBag = useUpdateBag();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [fittingClubKey, setFittingClubKey] = useState<ClubKey | null>(null);

  const detailsByKey = useMemo(() => {
    const map = new Map<ClubKey, BagEntry>();
    for (const entry of bagDetails) map.set(entry.clubKey, entry);
    return map;
  }, [bagDetails]);

  const fittingInitial = useMemo<ClubFitting>(() => {
    if (!fittingClubKey) return { ...EMPTY_FITTING };
    const entry = detailsByKey.get(fittingClubKey);
    if (!entry) return { ...EMPTY_FITTING };
    const { clubKey: _ck, addedAt: _a, updatedAt: _u, ...fitting } = entry;
    return fitting;
  }, [fittingClubKey, detailsByKey]);

  const groupedBag = useMemo(() => {
    const byCategory = new Map<(typeof CATEGORY_ORDER)[number], ClubKey[]>();
    for (const key of bag) {
      const club = CLUBS_BY_KEY[key];
      if (!club) continue;
      const list = byCategory.get(club.category) ?? [];
      list.push(key);
      byCategory.set(club.category, list);
    }
    return CATEGORY_ORDER
      .map((cat) => ({ category: cat, keys: byCategory.get(cat) ?? [] }))
      .filter((g) => g.keys.length > 0);
  }, [bag]);

  const handleSave = useCallback(
    (next: ClubKey[]) => {
      if (!player) return;
      updateBag.mutate(
        { playerId: player.id, next },
        { onSuccess: () => setPickerVisible(false) }
      );
    },
    [player, updateBag]
  );

  const formatDistance = useCallback(
    (meters: number) => {
      if (distanceUnit === 'yards') {
        return `${Math.round(metersToYards(meters))} yds`;
      }
      return `${Math.round(meters)} m`;
    },
    [distanceUnit]
  );

  const isLoading = bagLoading || statsLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="What's in the Bag"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
      >
        <View style={styles.section}>
          <SectionHeader
            title="Your Bag"
            description="Up to 14 clubs. Putter is always in your bag. Picked clubs appear when logging shots."
          />

          {isLoading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <>
              {groupedBag.map((group) => (
                <View key={group.category} style={styles.bagGroup}>
                  <Text
                    style={[
                      typography.caption,
                      styles.bagGroupHeader,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {CATEGORY_LABELS[group.category].toUpperCase()}
                  </Text>
                  <View style={styles.chipRow}>
                    {group.keys.map((key) => {
                      const entry = detailsByKey.get(key);
                      const summary = entry ? fittingSummary(entry) : null;
                      return (
                        <Pressable
                          key={key}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${CLUBS_BY_KEY[key].label} fitting details`}
                          onPress={() => setFittingClubKey(key)}
                          style={({ pressed }) => [
                            styles.chip,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[typography.caption, { color: colors.textPrimary }]}
                          >
                            {CLUBS_BY_KEY[key].label}
                            {key === PUTTER_KEY && ' (locked)'}
                          </Text>
                          {summary && (
                            <Text
                              style={[
                                typography.caption,
                                styles.chipSubtitle,
                                { color: colors.textSecondary },
                              ]}
                              numberOfLines={1}
                            >
                              {summary}
                            </Text>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              <View style={styles.editRow}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {bag.length} / 14 clubs
                </Text>
                <View style={{ flex: 1 }} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit bag"
                  onPress={() => setPickerVisible(true)}
                  style={[
                    styles.editButton,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Icon source="pencil" size={16} color={colors.white} />
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.white, fontWeight: '700' },
                    ]}
                  >
                    Edit Bag
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Distance by Club"
            description="Average distance and shot count across every round you've logged."
          />
          <View
            style={[
              styles.statsGroup,
              { backgroundColor: colors.surface },
              shadows.sm,
            ]}
          >
            {bag.length === 0 ? (
              <Text
                style={[
                  typography.body,
                  styles.emptyStats,
                  { color: colors.textSecondary },
                ]}
              >
                Add clubs to your bag to see distances.
              </Text>
            ) : (
              bag.map((key, idx) => {
                const entry = stats?.[key];
                const subtitle =
                  entry && entry.averageMeters != null
                    ? `${formatDistance(entry.averageMeters)} avg · ${entry.shotsWithDistance} shot${entry.shotsWithDistance === 1 ? '' : 's'}`
                    : entry && entry.totalShots > 0
                    ? `${entry.totalShots} shot${entry.totalShots === 1 ? '' : 's'} · no distance yet`
                    : 'No shots logged yet';
                return (
                  <View
                    key={key}
                    style={[
                      idx > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: colors.border,
                      },
                    ]}
                  >
                    <MenuItemRow
                      title={CLUBS_BY_KEY[key].label}
                      subtitle={subtitle}
                      icon="golf"
                      onPress={() =>
                        navigation.navigate('ClubDistanceDetail', { clubKey: key })
                      }
                      showChevron={!!entry && entry.totalShots > 0}
                      disabled={!entry || entry.totalShots === 0}
                    />
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <BagPickerSheet
        visible={pickerVisible}
        current={bag}
        onCancel={() => setPickerVisible(false)}
        onSave={handleSave}
        saving={updateBag.isPending}
      />

      {player && (
        <ClubFittingSheet
          visible={fittingClubKey !== null}
          clubKey={fittingClubKey}
          initial={fittingInitial}
          playerId={player.id}
          bag={bag}
          bagDetails={bagDetails}
          onClose={() => setFittingClubKey(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  contentContainer: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  loadingBlock: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  bagGroup: {
    marginBottom: spacing.md,
  },
  bagGroupHeader: {
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  chipSubtitle: {
    marginTop: 2,
    maxWidth: 180,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    minHeight: 36,
  },
  statsGroup: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  emptyStats: {
    padding: spacing.lg,
    textAlign: 'center',
  },
});
