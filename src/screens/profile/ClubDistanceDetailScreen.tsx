import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import type { RootStackParamList } from '@/navigation/types';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { usePerClubStats, type ShotWithContext } from '@/hooks/queries/usePerClubStats';
import { useSettingsStore } from '@/store/settingsStore';
import { CLUBS_BY_KEY } from '@/constants/clubs';
import { metersToYards } from '@/utils/gpsCalculations';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'ClubDistanceDetail'>;

function formatPlayedAt(iso: string | null): string {
  if (!iso) return 'Unknown date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ClubDistanceDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { clubKey } = route.params;
  const colors = useThemeColors();
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);

  const { player } = useAuth();
  const { data: stats, isLoading } = usePerClubStats(player?.id);
  const club = CLUBS_BY_KEY[clubKey];
  const entry = stats?.[clubKey];

  const formatDistance = useCallback(
    (meters: number | null) => {
      if (meters == null) return '—';
      if (distanceUnit === 'yards') {
        return `${Math.round(metersToYards(meters))} yds`;
      }
      return `${Math.round(meters)} m`;
    },
    [distanceUnit]
  );

  const headerSubtitle = useMemo(() => {
    if (!entry) return 'No shots logged yet';
    const avg = entry.averageMeters != null ? formatDistance(entry.averageMeters) : null;
    const parts: string[] = [];
    if (avg) parts.push(`${avg} avg`);
    parts.push(`${entry.totalShots} shot${entry.totalShots === 1 ? '' : 's'}`);
    return parts.join(' · ');
  }, [entry, formatDistance]);

  const renderItem = useCallback(
    ({ item }: { item: ShotWithContext }) => (
      <View style={[styles.row, { backgroundColor: colors.surface }]}>
        <View style={styles.rowLeft}>
          <Text style={[typography.body, { color: colors.textPrimary }]}>
            {item.courseName ?? 'Unknown course'}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Hole {item.hole_number} · {formatPlayedAt(item.roundPlayedAt)}
          </Text>
        </View>
        <Text
          style={[
            typography.body,
            { color: colors.textPrimary, fontWeight: '600' },
          ]}
        >
          {formatDistance(item.distanceMeters)}
        </Text>
      </View>
    ),
    [colors, formatDistance]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={club?.label ?? 'Club'}
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={[styles.summary, { borderBottomColor: colors.border }]}>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>
          {club?.label ?? clubKey}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {headerSubtitle}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={entry?.shots ?? []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + spacing.xxxl },
          ]}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: colors.border,
              }}
            />
          )}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text
                style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}
              >
                No shots logged with this club yet.
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  listContent: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  empty: {
    padding: spacing.xl,
  },
});
