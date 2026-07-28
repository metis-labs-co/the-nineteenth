import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { BottomSheet, SegmentedButton } from '@/components/common';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import type { CompetitionVisibility } from '@/types/database.types';

import { useUpdateCompetitionField } from './useUpdateCompetitionField';

const OPTIONS = [
  { value: 'private', label: 'Private' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'public', label: 'Public' },
] satisfies { value: CompetitionVisibility; label: string }[];

export function EditVisibilitySheet({
  visible,
  onDismiss,
  competitionId,
  currentVisibility,
}: {
  visible: boolean;
  onDismiss: () => void;
  competitionId: string;
  currentVisibility: CompetitionVisibility;
}) {
  const colors = useThemeColors();
  const { showErrorToast } = useToast();
  const [selectedVisibility, setSelectedVisibility] = useState(currentVisibility);
  const { mutate, isPending } = useUpdateCompetitionField({
    competitionId,
    onSuccess: onDismiss,
  });

  useEffect(() => {
    setSelectedVisibility(currentVisibility);
  }, [currentVisibility]);

  const handleChange = useCallback(
    (visibility: CompetitionVisibility) => {
      if (visibility === selectedVisibility) return;
      const previous = selectedVisibility;
      setSelectedVisibility(visibility);
      mutate(
        { visibility },
        {
          onError: () => {
            setSelectedVisibility(previous);
            showErrorToast(
              'Visibility not saved',
              'Could not update competition visibility. Please try again.'
            );
          },
        }
      );
    },
    [mutate, selectedVisibility, showErrorToast]
  );

  return (
    <BottomSheet visible={visible} onClose={onDismiss} title="Visibility" height={0.42} useModal>
      <View style={styles.body}>
        <SegmentedButton
          value={selectedVisibility}
          onValueChange={handleChange}
          buttons={OPTIONS}
          disabled={isPending}
          size="small"
        />
        <Text style={[styles.help, { color: colors.textSecondary }]}>
          Private competitions require an invite code. Unlisted and Public are saved now;
          discoverable browsing and public leaderboards are coming later.
        </Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  help: {
    ...typography.small,
    lineHeight: 20,
  },
});
