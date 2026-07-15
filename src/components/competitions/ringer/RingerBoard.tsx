// src/components/competitions/ringer/RingerBoard.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { ErrorState, SegmentedButton } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, shadows } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useRingerBoard } from '@/hooks/competitions/useRingerBoard';
import { getTeamColorHex } from '@/utils/teamColor';
import type { RingerEntry } from '@/utils/ringer';
import { RingerScorecard } from './RingerScorecard';
import { RingerTeamCard } from './RingerTeamCard';

interface RingerBoardProps {
  competitionId: string;
}

type RingerView = 'individuals' | 'teams';

function firstName(name: string): string {
  return name.split(' ')[0] ?? name;
}

export function RingerBoard({ competitionId }: RingerBoardProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { board, isLoading, error, refetch } = useRingerBoard(competitionId);
  const [view, setView] = useState<RingerView>('individuals');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const shortNameById = useMemo(() => {
    const map = new Map<string, string>();
    board?.individuals.forEach((e) => map.set(e.participantId, firstName(e.participantName)));
    return map;
  }, [board]);

  const shortNameFor = useCallback(
    (playerId: string | null) =>
      playerId ? (shortNameById.get(playerId) ?? '—') : '—',
    [shortNameById]
  );

  const handleViewChange = useCallback((v: RingerView) => {
    setView(v);
    setExpandedId(null);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <ErrorState
        error={error instanceof Error ? error : new Error('An error occurred')}
        title="Unable to load ringer board"
        onRetry={refetch}
      />
    );
  }

  const entries: RingerEntry[] =
    view === 'individuals' ? (board?.individuals ?? []) : (board?.teams ?? []);

  const roundCount = board?.includedRoundLabels.length ?? 0;
  const hasRounds = roundCount > 0;

  return (
    <View>
      <SegmentedButton<RingerView>
        value={view}
        onValueChange={handleViewChange}
        buttons={[
          { value: 'individuals', label: 'Individual' },
          { value: 'teams', label: 'Teams' },
        ]}
        size="small"
        style={styles.toggle}
      />

      {hasRounds && (
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Best score on every hole, taken across all counting rounds.
        </Text>
      )}

      {entries.length === 0 ? (
        <Text style={[typography.body, styles.empty, { color: colors.textSecondary }]}>
          No scores yet. The ringer board fills in as rounds are played.
        </Text>
      ) : (
        <>
          <View
            style={[
              styles.table,
              shadows.sm,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.headerRow,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderBottomColor: colors.borderLight,
                },
              ]}
            >
              <Text style={[styles.headerCell, styles.colPos, { color: colors.textTertiary }]}>
                #
              </Text>
              <Text style={[styles.headerCell, styles.colName, { color: colors.textTertiary }]}>
                PLAYER
              </Text>
              <Text style={[styles.headerCell, styles.colPts, { color: colors.textTertiary }]}>
                PTS
              </Text>
              <View style={styles.colChevron} />
            </View>

            {entries.map((entry, index) => {
              const expanded = expandedId === entry.participantId;
              const isYou = view === 'individuals' && entry.participantId === user?.id;
              const teamDot = entry.isTeam
                ? getTeamColorHex(entry.color, index, colors)
                : null;
              const isLast = index === entries.length - 1;

              return (
                <View key={entry.participantId}>
                  <TouchableOpacity
                    style={[
                      styles.row,
                      !isLast && { borderBottomColor: colors.borderLight, borderBottomWidth: 1 },
                      isYou && { backgroundColor: colors.primaryBackground },
                    ]}
                    onPress={() => setExpandedId(expanded ? null : entry.participantId)}
                    accessibilityRole="button"
                    accessibilityLabel={`${entry.participantName}, ${entry.total} points, position ${entry.position}`}
                    accessibilityState={{ expanded }}
                  >
                    <Text style={[styles.pos, styles.colPos, { color: colors.textTertiary }]}>
                      {entry.tied ? `T${entry.position}` : entry.position}
                    </Text>
                    {teamDot && <View style={[styles.dot, { backgroundColor: teamDot }]} />}
                    <View style={styles.nameCell}>
                      <Text
                        style={[
                          styles.name,
                          { color: colors.textPrimary, fontWeight: isYou ? '700' : '600' },
                        ]}
                        numberOfLines={1}
                      >
                        {entry.participantName}
                      </Text>
                      {isYou && (
                        <View style={[styles.youPill, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.youPillText, { color: colors.white }]}>YOU</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.pts, styles.colPts, { color: colors.primaryDark }]}>
                      {entry.total}
                    </Text>
                    <View style={styles.colChevron}>
                      <Icon
                        source={expanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textTertiary}
                      />
                    </View>
                  </TouchableOpacity>

                  {expanded && (
                    <View
                      style={[
                        styles.expandedPanel,
                        !isLast && { borderBottomColor: colors.borderLight, borderBottomWidth: 1 },
                      ]}
                    >
                      {view === 'teams' ? (
                        <RingerTeamCard entry={entry} shortNameFor={shortNameFor} />
                      ) : (
                        <RingerScorecard entry={entry} shortNameFor={shortNameFor} />
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {hasRounds && (
            <Text style={[styles.footer, { color: colors.textTertiary }]}>
              Across {roundCount} counting {roundCount === 1 ? 'round' : 'rounds'}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: spacing.xxl, alignItems: 'center' },
  toggle: {
    marginBottom: spacing.md,
  },
  intro: {
    fontSize: 12.5,
    marginHorizontal: 2,
    marginBottom: spacing.md,
  },
  empty: { textAlign: 'center', paddingVertical: spacing.xl },
  table: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  headerCell: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  colPos: { width: 30 },
  colName: { flex: 1 },
  colPts: { width: 48, textAlign: 'right' },
  colChevron: { width: 26, alignItems: 'flex-end' },
  pos: {
    fontSize: 13,
    fontWeight: '800',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 9,
  },
  nameCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    flexShrink: 1,
  },
  youPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  youPillText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  pts: {
    fontSize: 15,
    fontWeight: '800',
  },
  expandedPanel: {
    paddingHorizontal: 14,
    paddingBottom: spacing.sm,
  },
  footer: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
