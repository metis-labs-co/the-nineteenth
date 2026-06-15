import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { RingerBoard } from '@/components/competitions/ringer';
import { ContributionsBoard } from '@/components/competitions/contributions';

interface BreakdownTabProps {
  competitionId: string;
  showRinger: boolean;
  showContributions: boolean;
}

type Segment = 'ringer' | 'contributions';

export function BreakdownTab({ competitionId, showRinger, showContributions }: BreakdownTabProps) {
  const colors = useThemeColors();
  const segments = useMemo<{ key: Segment; label: string }[]>(() => {
    const s: { key: Segment; label: string }[] = [];
    if (showRinger) s.push({ key: 'ringer', label: 'Ringer' });
    if (showContributions) s.push({ key: 'contributions', label: 'Contributions' });
    return s;
  }, [showRinger, showContributions]);

  const [segment, setSegment] = useState<Segment>(segments[0]?.key ?? 'ringer');
  const active = segments.some((s) => s.key === segment) ? segment : segments[0]?.key;

  return (
    <View>
      {segments.length > 1 && (
        <View style={[styles.toggle, { backgroundColor: colors.surfaceVariant }]}>
          {segments.map((s) => {
            const isActive = active === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.toggleBtn, isActive && { backgroundColor: colors.surface }, isActive && shadows.sm]}
                onPress={() => setSegment(s.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    typography.small,
                    { color: isActive ? colors.textPrimary : colors.textSecondary, fontWeight: isActive ? '600' : '400' },
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {active === 'ringer' && <RingerBoard competitionId={competitionId} />}
      {active === 'contributions' && <ContributionsBoard competitionId={competitionId} />}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', borderRadius: borderRadius.lg, padding: 4, marginBottom: spacing.md },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.md },
});
