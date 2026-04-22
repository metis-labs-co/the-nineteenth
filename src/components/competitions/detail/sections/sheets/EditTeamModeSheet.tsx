import React, { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { BottomSheet } from '@/components/common/BottomSheet';
import { spacing } from '@/constants/theme';
import type { TeamMode } from '@/types/database.types';

import { teamModeLabels } from '../types';
import { OptionRow } from './OptionRow';
import { useUpdateCompetitionField } from './useUpdateCompetitionField';

export interface EditTeamModeSheetProps {
  visible: boolean;
  onDismiss: () => void;
  competitionId: string;
  currentMode: TeamMode;
  currentTeamSize: number | null;
}

const TEAM_MODE_DESCRIPTIONS: Record<TeamMode, string> = {
  none: 'Every player competes individually',
  fixed: 'Same teams across every round',
  'per-round': 'Teams rotate each round',
};

const OPTIONS: { id: TeamMode; icon: string }[] = [
  { id: 'none', icon: 'account' },
  { id: 'fixed', icon: 'account-group' },
  { id: 'per-round', icon: 'account-switch-outline' },
];

const DEFAULT_TEAM_SIZE = 2;

export function EditTeamModeSheet({
  visible,
  onDismiss,
  competitionId,
  currentMode,
  currentTeamSize,
}: EditTeamModeSheetProps) {
  const { mutate, isPending } = useUpdateCompetitionField({
    competitionId,
    onSuccess: onDismiss,
  });

  const handleSelect = useCallback(
    (id: TeamMode) => {
      if (id === currentMode) {
        onDismiss();
        return;
      }
      if (id === 'none') {
        mutate({ team_mode: 'none', team_size: null });
        return;
      }
      // Switching into a team mode: keep existing size if set, otherwise
      // default to the minimum (2) so the Team Size row renders on return.
      mutate({
        team_mode: id,
        team_size: currentTeamSize ?? DEFAULT_TEAM_SIZE,
      });
    },
    [currentMode, currentTeamSize, mutate, onDismiss]
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onDismiss}
      title="Format"
      height={0.55}
      useModal
      testID="edit-team-mode-sheet"
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        {OPTIONS.map((opt) => (
          <OptionRow
            key={opt.id}
            icon={opt.icon}
            label={teamModeLabels[opt.id]}
            description={TEAM_MODE_DESCRIPTIONS[opt.id]}
            selected={currentMode === opt.id}
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

export default EditTeamModeSheet;
