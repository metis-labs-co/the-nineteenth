import React, { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { BottomSheet } from '@/components/common/BottomSheet';
import { spacing } from '@/constants/theme';
import type { HandicapSystem } from '@/types/database.types';

import { handicapSystemLabels } from '../types';
import { OptionRow } from './OptionRow';
import { useUpdateCompetitionField } from './useUpdateCompetitionField';

export interface EditHandicapSystemSheetProps {
  visible: boolean;
  onDismiss: () => void;
  competitionId: string;
  currentSystem: HandicapSystem;
}

const HANDICAP_DESCRIPTIONS: Record<HandicapSystem, string> = {
  honor: 'Players enter their own handicap — trust-based',
  whs: 'Official World Handicap System index',
  'gross-only': 'No handicap adjustment — raw scores only',
};

const OPTIONS: { id: HandicapSystem; icon: string }[] = [
  { id: 'honor', icon: 'hand-heart-outline' },
  { id: 'whs', icon: 'earth' },
  { id: 'gross-only', icon: 'counter' },
];

export function EditHandicapSystemSheet({
  visible,
  onDismiss,
  competitionId,
  currentSystem,
}: EditHandicapSystemSheetProps) {
  const { mutate, isPending } = useUpdateCompetitionField({
    competitionId,
    onSuccess: onDismiss,
  });

  const handleSelect = useCallback(
    (id: HandicapSystem) => {
      if (id === currentSystem) {
        onDismiss();
        return;
      }
      mutate({ handicap_system: id });
    },
    [currentSystem, mutate, onDismiss]
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Handicap System"
      height={0.55}
      useModal
      testID="edit-handicap-system-sheet"
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        {OPTIONS.map((opt) => (
          <OptionRow
            key={opt.id}
            icon={opt.icon}
            label={handicapSystemLabels[opt.id]}
            description={HANDICAP_DESCRIPTIONS[opt.id]}
            selected={currentSystem === opt.id}
            disabled={isPending}
            onPress={() => handleSelect(opt.id)}
          />
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  body: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
});

export default EditHandicapSystemSheet;
