// src/components/competitions/ringer/RingerBoard.tsx
import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { ErrorState } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useRingerBoard } from '@/hooks/competitions/useRingerBoard';
import type { RingerEntry } from '@/utils/ringer';
import { RingerScorecard } from './RingerScorecard';

interface RingerBoardProps {
  competitionId: string;
}

type RingerView = 'individuals' | 'teams';

function firstName(name: string): string {
  return name.split(' ')[0] ?? name;
}

export function RingerBoard({ competitionId }: RingerBoardProps) {
  const colors = useThemeColors();
  const { board, isLoading, error, refetch } = useRingerBoard(competitionId);
  const [view, setView] = useState<RingerView>('individuals');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const shortNameById = useMemo(() => {
    const map = new Map<string, string>();
    board?.individuals.forEach((e) => map.set(e.participantId, firstName(e.participantName)));
    return map;
  }, [board]);

  const shortNameFor = (playerId: string | null) =>
    playerId ? (shortNameById.get(playerId) ?? '—') : '—';

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

  const hasRounds = (board?.includedRoundLabels.length ?? 0) > 0;

  return (
    <View>
      <View style={[styles.toggle, { backgroundColor: colors.surfaceVariant }]}>
        {(['individuals', 'teams'] as RingerView[]).map((v) => {
          const active = view === v;
          return (
            <TouchableOpacity
              key={v}
              style={[
                styles.toggleBtn,
                active && { backgroundColor: colors.surface },
                active && shadows.sm,
              ]}
              onPress={() => {
                setView(v);
                setExpandedId(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={v === 'individuals' ? 'Individual ringer' : 'Team ringer'}
            >
              <Text
                style={[
                  typography.small,
                  {
                    color: active ? colors.textPrimary : colors.textSecondary,
                    fontWeight: active ? '600' : '400',
                  },
                ]}
              >
                {v === 'individuals' ? 'Individual' : 'Teams'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {hasRounds && (
        <Text style={[typography.caption, styles.caption, { color: colors.textSecondary }]}>
          Best score on each hole across {board?.includedRoundLabels.join(', ')}
        </Text>
      )}

      {entries.length === 0 ? (
        <Text style={[typography.body, styles.empty, { color: colors.textSecondary }]}>
          No scores yet. The ringer board fills in as rounds are played.
        </Text>
      ) : (
        entries.map((entry) => {
          const expanded = expandedId === entry.participantId;
          return (
            <View
              key={entry.participantId}
              style={[styles.card, shadows.sm, { backgroundColor: colors.surface }]}
            >
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpandedId(expanded ? null : entry.participantId)}
                accessibilityRole="button"
                accessibilityLabel={`${entry.participantName}, ${entry.total} points, position ${entry.position}`}
                accessibilityState={{ expanded }}
              >
                <Text style={[styles.position, typography.body, { color: colors.textSecondary }]}>
                  {entry.tied ? `T${entry.position}` : entry.position}
                </Text>
                <Text
                  style={[typography.body, styles.name, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {entry.participantName}
                </Text>
                <Text style={[typography.h4, { color: colors.primary }]}>{entry.total}</Text>
                <Icon
                  source={expanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              {expanded && <RingerScorecard entry={entry} shortNameFor={shortNameFor} />}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: spacing.xxl, alignItems: 'center' },
  toggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.full,
    padding: spacing.xs,
    marginBottom: spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    minHeight: 44,
    justifyContent: 'center',
  },
  caption: { marginBottom: spacing.md },
  empty: { textAlign: 'center', paddingVertical: spacing.xl },
  card: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 44,
  },
  position: { width: 32 },
  name: { flex: 1 },
});

export default RingerBoard;
