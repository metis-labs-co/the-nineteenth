/**
 * EditCompetitionContent - Main form content
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { Control, FieldErrors } from 'react-hook-form';
import type { CompetitionType, TeamMode } from '@/types/database.types';
import type { EditCompetitionFormData } from '../hooks/useCompetitionValidation';
import { CompetitionBasicInfo } from './CompetitionBasicInfo';
import { CompetitionSettings } from './CompetitionSettings';
import { InviteCodeSection } from './InviteCodeSection';

interface EditCompetitionContentProps {
  control: Control<EditCompetitionFormData>;
  errors: FieldErrors<EditCompetitionFormData>;
  competitionType: CompetitionType;
  teamMode: TeamMode;
  startDateParsed: Date | null;
  inviteCode: string;
  onCompetitionTypeChange: (value: CompetitionType) => void;
  onTeamModeChange: (value: TeamMode) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

export function EditCompetitionContent({
  control,
  errors,
  competitionType,
  teamMode,
  startDateParsed,
  inviteCode,
  onCompetitionTypeChange,
  onTeamModeChange,
  onStartDateChange,
  onEndDateChange,
}: EditCompetitionContentProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Description */}
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Update your competition details below.
      </Text>

      {/* Form Section */}
      <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
        <CompetitionBasicInfo control={control} errors={errors} />
        <CompetitionSettings
          control={control}
          errors={errors}
          competitionType={competitionType}
          teamMode={teamMode}
          startDateParsed={startDateParsed}
          onCompetitionTypeChange={onCompetitionTypeChange}
          onTeamModeChange={onTeamModeChange}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
        />
      </View>

      {/* Invite Code Section */}
      <InviteCodeSection inviteCode={inviteCode} />

      {/* Info Box */}
      <View style={[styles.infoBox, { backgroundColor: colors.surfaceVariant }]}>
        <Icon source="information-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Handicap system cannot be changed after creation.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  formSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },
});
