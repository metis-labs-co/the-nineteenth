/**
 * SettingsSection - Competition settings display and inline edit
 *
 * Each line item on this card is tappable for organisers, opening a focused
 * bottom sheet for that field. Structural fields (Type, Format, Team Size)
 * are locked once any round has started scoring because changing them mid-
 * competition would require complex data migration.
 *
 * Status stays read-only — it's system-managed by scoring progress.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { Pill } from '@/components/common/Pill';
import { SectionHeader } from '@/components/common';
import { formatDateAustralian } from '@/utils/formatting';
import {
  competitionTypeLabels,
  handicapSystemLabels,
  teamModeLabels,
  type SettingsSectionProps,
} from './types';
import {
  EditCompetitionTypeSheet,
  EditHandicapSystemSheet,
  EditTeamModeSheet,
  EditTeamSizeSheet,
  EditDatesSheet,
} from './sheets';

type OpenSheet =
  | 'type'
  | 'handicap'
  | 'team-mode'
  | 'team-size'
  | 'dates'
  | null;

// =====================================================
// SETTING ROW
// =====================================================

interface SettingRowProps {
  icon: string;
  label: string;
  onPress?: () => void;
  locked?: boolean;
  children: React.ReactNode;
}

function SettingRow({ icon, label, onPress, locked = false, children }: SettingRowProps) {
  const colors = useThemeColors();
  const isInteractive = !!onPress;

  const content = (
    <>
      <View style={styles.iconContainer}>
        <Icon source={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
          {locked && (
            <Icon source="lock-outline" size={14} color={colors.textSecondary} />
          )}
        </View>
        <View style={styles.valueContainer}>
          {children}
          {isInteractive && (
            <Icon source="chevron-right" size={20} color={colors.gray400} />
          )}
        </View>
      </View>
    </>
  );

  if (isInteractive) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.row}
        accessibilityLabel={`Edit ${label}`}
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

// =====================================================
// SETTINGS SECTION
// =====================================================

export function SettingsSection({
  competition,
  isOrganizer,
  hasStartedRound,
}: SettingsSectionProps) {
  const colors = useThemeColors();
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);

  const handleClose = useCallback(() => setOpenSheet(null), []);

  const canEdit = isOrganizer;
  const structureLocked = hasStartedRound;
  const canEditStructure = canEdit && !structureLocked;

  const hasTeams = competition.team_mode !== 'none';
  const showEndDate = competition.competition_type === 'event' || !!competition.end_date;

  return (
    <View style={styles.section}>
      <SectionHeader title="Settings" icon="cog-outline" primaryIcon={false} />

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Type */}
        <SettingRow
          icon="tag-outline"
          label="Type"
          onPress={canEditStructure ? () => setOpenSheet('type') : undefined}
          locked={canEdit && structureLocked}
        >
          <Pill
            label={competitionTypeLabels[competition.competition_type] || 'Event'}
            variant="primary"
            size="md"
          />
        </SettingRow>

        {/* Handicap System */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="golf"
          label="Handicap"
          onPress={canEdit ? () => setOpenSheet('handicap') : undefined}
        >
          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {handicapSystemLabels[competition.handicap_system]}
          </Text>
        </SettingRow>

        {/* Format (team mode) */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="account-group-outline"
          label="Format"
          onPress={canEditStructure ? () => setOpenSheet('team-mode') : undefined}
          locked={canEdit && structureLocked}
        >
          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {teamModeLabels[competition.team_mode]}
          </Text>
        </SettingRow>

        {/* Team Size (only if teams enabled) */}
        {hasTeams && competition.team_size != null && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow
              icon="account-multiple-outline"
              label="Team Size"
              onPress={canEditStructure ? () => setOpenSheet('team-size') : undefined}
              locked={canEdit && structureLocked}
            >
              <Text style={[styles.value, { color: colors.textPrimary }]}>
                {`${competition.team_size} players`}
              </Text>
            </SettingRow>
          </>
        )}

        {/* Start Date */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="calendar-start"
          label="Start Date"
          onPress={canEdit ? () => setOpenSheet('dates') : undefined}
        >
          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {formatDateAustralian(competition.start_date)}
          </Text>
        </SettingRow>

        {/* End Date (shown for event type or when set) */}
        {showEndDate && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow
              icon="calendar-end"
              label="End Date"
              onPress={canEdit ? () => setOpenSheet('dates') : undefined}
            >
              <Text style={[styles.value, { color: colors.textPrimary }]}>
                {competition.end_date
                  ? formatDateAustralian(competition.end_date)
                  : 'Not set'}
              </Text>
            </SettingRow>
          </>
        )}

      </View>

      {canEdit && structureLocked && (
        <Text style={[styles.lockedFootnote, { color: colors.textSecondary }]}>
          Type, Format and Team Size are locked once scoring has started.
        </Text>
      )}

      {/* Edit sheets — rendered only when open so their internal hooks
          (useMutation) don't mount for the common read-only case. */}
      {openSheet === 'type' && (
        <EditCompetitionTypeSheet
          visible
          onDismiss={handleClose}
          competitionId={competition.id}
          currentType={competition.competition_type}
        />
      )}
      {openSheet === 'handicap' && (
        <EditHandicapSystemSheet
          visible
          onDismiss={handleClose}
          competitionId={competition.id}
          currentSystem={competition.handicap_system}
        />
      )}
      {openSheet === 'team-mode' && (
        <EditTeamModeSheet
          visible
          onDismiss={handleClose}
          competitionId={competition.id}
          currentMode={competition.team_mode}
          currentTeamSize={competition.team_size ?? null}
        />
      )}
      {openSheet === 'team-size' && (
        <EditTeamSizeSheet
          visible
          onDismiss={handleClose}
          competitionId={competition.id}
          currentSize={competition.team_size ?? null}
        />
      )}
      {openSheet === 'dates' && (
        <EditDatesSheet
          visible
          onDismiss={handleClose}
          competitionId={competition.id}
          initialStartDate={competition.start_date}
          initialEndDate={competition.end_date ?? null}
          competitionType={competition.competition_type}
        />
      )}
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
    marginLeft: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    ...typography.body,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    ...typography.bodyBold,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.md,
  },
  lockedFootnote: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});

export default SettingsSection;
