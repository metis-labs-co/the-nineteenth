/**
 * CompetitionSettings - Competition type, team mode, and date fields
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Controller } from 'react-hook-form';
import { DatePicker, SegmentedButton } from '@/components/common';
import type { SegmentOption } from '@/components/common';
import type { Control, FieldErrors } from 'react-hook-form';
import type { CompetitionType, TeamMode } from '@/types/database.types';
import type { EditCompetitionFormData } from '../hooks/useCompetitionValidation';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

// ============================================================================
// Constants
// ============================================================================

const COMPETITION_TYPE_DESCRIPTIONS: Record<CompetitionType, string> = {
  league: 'Ongoing competition with no fixed end date',
  event: 'Fixed-term competition with an end date',
};

const TEAM_MODE_DESCRIPTIONS: Record<TeamMode, string> = {
  none: 'Players compete individually',
  fixed: 'Same teams throughout the competition',
  'per-round': 'Teams change each round',
};

const COMPETITION_TYPE_BUTTONS: SegmentOption<CompetitionType>[] = [
  { value: 'event', label: 'Event', icon: 'calendar-star' },
  { value: 'league', label: 'League', icon: 'trophy-outline' },
];

const TEAM_MODE_BUTTONS: SegmentOption<TeamMode>[] = [
  { value: 'none', label: 'Individual', icon: 'account' },
  { value: 'fixed', label: 'Teams', icon: 'account-group' },
];

// ============================================================================
// Types
// ============================================================================

interface CompetitionSettingsProps {
  control: Control<EditCompetitionFormData>;
  errors: FieldErrors<EditCompetitionFormData>;
  competitionType: CompetitionType;
  teamMode: TeamMode;
  startDateParsed: Date | null;
  onCompetitionTypeChange: (value: CompetitionType) => void;
  onTeamModeChange: (value: TeamMode) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function CompetitionSettings({
  control,
  errors,
  competitionType,
  teamMode,
  startDateParsed,
  onCompetitionTypeChange,
  onTeamModeChange,
  onStartDateChange,
  onEndDateChange,
}: CompetitionSettingsProps) {
  const colors = useThemeColors();

  return (
    <>
      {/* Competition Type */}
      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Competition Type *</Text>
        <Controller
          control={control}
          name="competitionType"
          render={({ field: { value } }) => (
            <SegmentedButton<CompetitionType>
              value={value}
              onValueChange={onCompetitionTypeChange}
              buttons={COMPETITION_TYPE_BUTTONS}
            />
          )}
        />
        <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
          {COMPETITION_TYPE_DESCRIPTIONS[competitionType]}
        </Text>
      </View>

      {/* Format (Team Mode) */}
      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Format *</Text>
        <Controller
          control={control}
          name="teamMode"
          render={({ field: { value } }) => (
            <SegmentedButton<TeamMode>
              value={value}
              onValueChange={onTeamModeChange}
              buttons={TEAM_MODE_BUTTONS}
            />
          )}
        />
        <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
          {TEAM_MODE_DESCRIPTIONS[teamMode]}
        </Text>
      </View>

      {/* Start Date */}
      <Controller
        control={control}
        name="startDate"
        render={({ field: { value } }) => (
          <DatePicker
            value={value}
            onChange={onStartDateChange}
            label="Start Date *"
            hint="Tap to change the start date"
            error={errors.startDate?.message}
          />
        )}
      />

      {/* End Date - Required for Event, hidden for League */}
      {competitionType === 'event' && (
        <Controller
          control={control}
          name="endDate"
          render={({ field: { value } }) => (
            <DatePicker
              value={value || ''}
              onChange={onEndDateChange}
              label="End Date *"
              placeholder="Set end date"
              hint="Competition will auto-complete after this date"
              error={errors.endDate?.message}
              minimumDate={startDateParsed || undefined}
              showClear={!!value}
            />
          )}
        />
      )}
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  fieldHint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
