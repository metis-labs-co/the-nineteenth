/**
 * PointsConfigSheet
 *
 * Bottom sheet home for the per-round points config. Renders PointsConfigSection
 * (variant="plain") so the per-round list + organiser edit flow live behind the
 * Settings "Points Config" row instead of a standalone Details-tab card. Editing
 * is organiser-only (gated inside PointsConfigSection); players see a read-only list.
 */
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { BottomSheet } from '@/components/common/BottomSheet';
import { spacing } from '@/constants/theme';
import type { Competition, Round, TeamWithMembers } from '@/types/database.types';
import { PointsConfigSection } from '../PointsConfigSection';

export interface PointsConfigSheetProps {
  visible: boolean;
  onDismiss: () => void;
  competition: Competition;
  rounds: Round[];
  teams?: TeamWithMembers[];
  isOrganizer: boolean;
}

export function PointsConfigSheet({
  visible,
  onDismiss,
  competition,
  rounds,
  teams,
  isOrganizer,
}: PointsConfigSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onDismiss} title="Points & Rules" height={0.7} useModal>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <PointsConfigSection
          variant="plain"
          competition={competition}
          rounds={rounds}
          teams={teams}
          isOrganizer={isOrganizer}
        />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
});
