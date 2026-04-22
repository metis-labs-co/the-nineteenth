import React, { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { BottomSheet } from '@/components/common/BottomSheet';
import { spacing } from '@/constants/theme';
import type { CompetitionType } from '@/types/database.types';

import {
  competitionTypeDescriptions,
  competitionTypeLabels,
} from '../types';
import { OptionRow } from './OptionRow';
import { useUpdateCompetitionField } from './useUpdateCompetitionField';

export interface EditCompetitionTypeSheetProps {
  visible: boolean;
  onDismiss: () => void;
  competitionId: string;
  currentType: CompetitionType;
}

const OPTIONS: { id: CompetitionType; icon: string }[] = [
  { id: 'event', icon: 'calendar-range' },
  { id: 'knockout', icon: 'tournament' },
];

export function EditCompetitionTypeSheet({
  visible,
  onDismiss,
  competitionId,
  currentType,
}: EditCompetitionTypeSheetProps) {
  const { mutate, isPending } = useUpdateCompetitionField({
    competitionId,
    onSuccess: onDismiss,
  });

  const handleSelect = useCallback(
    (id: CompetitionType) => {
      if (id === currentType) {
        onDismiss();
        return;
      }
      mutate({ competition_type: id });
    },
    [currentType, mutate, onDismiss]
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Competition Type"
      height={0.5}
      useModal
      testID="edit-competition-type-sheet"
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        {OPTIONS.map((opt) => (
          <OptionRow
            key={opt.id}
            icon={opt.icon}
            label={competitionTypeLabels[opt.id]}
            description={competitionTypeDescriptions[opt.id]}
            selected={currentType === opt.id}
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

export default EditCompetitionTypeSheet;
