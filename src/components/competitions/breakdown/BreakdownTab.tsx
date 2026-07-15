import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@/constants/theme';
import { SegmentedButton } from '@/components/common/SegmentedButton';
import { RingerBoard } from '@/components/competitions/ringer';
import { ContributionsBoard } from '@/components/competitions/contributions';

interface BreakdownTabProps {
  competitionId: string;
  showRinger: boolean;
  showContributions: boolean;
}

type Segment = 'ringer' | 'contributions';

export function BreakdownTab({ competitionId, showRinger, showContributions }: BreakdownTabProps) {
  const segments = useMemo<{ value: Segment; label: string }[]>(() => {
    const s: { value: Segment; label: string }[] = [];
    if (showRinger) s.push({ value: 'ringer', label: 'Ringer' });
    if (showContributions) s.push({ value: 'contributions', label: 'Contributions' });
    return s;
  }, [showRinger, showContributions]);

  const [segment, setSegment] = useState<Segment>(segments[0]?.value ?? 'ringer');
  const active = segments.some((s) => s.value === segment) ? segment : (segments[0]?.value ?? 'ringer');

  return (
    <View>
      {segments.length > 1 && (
        <SegmentedButton<Segment>
          value={active}
          onValueChange={setSegment}
          buttons={segments}
          size="small"
          style={styles.toggle}
        />
      )}

      {active === 'ringer' && <RingerBoard competitionId={competitionId} />}
      {active === 'contributions' && <ContributionsBoard competitionId={competitionId} />}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    marginBottom: spacing.lg,
  },
});
