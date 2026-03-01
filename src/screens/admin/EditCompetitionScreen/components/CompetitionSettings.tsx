/**
 * CompetitionSettings - Competition type, team mode, and date fields
 */

import React from 'react';
import { Controller } from 'react-hook-form';
import { DatePicker, FormSection, SegmentedButton } from '@/components/common';
import type { SegmentOption } from '@/components/common';
import type { Control, FieldErrors } from 'react-hook-form';
import type { CompetitionType, TeamMode } from '@/types/database.types';
import type { EditCompetitionFormData } from '../hooks/useCompetitionValidation';

// ============================================================================
// Constants
// ============================================================================

const COMPETITION_TYPE_DESCRIPTIONS: Record<CompetitionType, string> = {
  knockout: 'A bracket-style elimination competition',
  event: 'Fixed-term competition with an end date',
};

const TEAM_MODE_DESCRIPTIONS: Record<TeamMode, string> = {
  none: 'Players compete individually',
  fixed: 'Same teams throughout the competition',
  'per-round': 'Teams change each round',
};

const COMPETITION_TYPE_BUTTONS: SegmentOption<CompetitionType>[] = [
  { value: 'event', label: 'Event', icon: 'calendar-star' },
  { value: 'knockout', label: 'Knockout', icon: 'sword-cross' },
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
  return (
    <>
      {/* Competition Type */}
      <FormSection noCard title="Competition Type *" description={COMPETITION_TYPE_DESCRIPTIONS[competitionType]}>
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
      </FormSection>

      {/* Format (Team Mode) */}
      <FormSection noCard title="Format *" description={TEAM_MODE_DESCRIPTIONS[teamMode]}>
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
      </FormSection>

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

