/**
 * SettingsSection - Competition details display and inline edit
 *
 * Each line item on this card is tappable for organisers, opening a focused
 * bottom sheet for that field. Structural fields (Type, Format) are locked
 * once any round has started scoring because changing them mid-competition
 * would require complex data migration. Team Size is always read-only — it's
 * fixed at competition setup.
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
  EditDatesSheet,
  EditCompetitionRulesSheet,
  EditScoringRulesModeSheet,
  detectActivePreset,
} from './sheets';

type OpenSheet =
  | 'type'
  | 'handicap'
  | 'team-mode'
  | 'dates'
  | 'rules-mode'
  | 'general-rules'
  | null;

// =====================================================
// SETTING ROW
// =====================================================

interface SettingRowProps {
  icon: string;
  label: string;
  onPress?: () => void;
  locked?: boolean;
  /** Overrides the default "Edit {label}" accessibility label when this row is a nav target. */
  accessibilityLabel?: string;
  children: React.ReactNode;
}

function SettingRow({ icon, label, onPress, locked = false, accessibilityLabel, children }: SettingRowProps) {
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
        accessibilityLabel={accessibilityLabel ?? `Edit ${label}`}
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
  onViewTeams,
}: SettingsSectionProps) {
  const colors = useThemeColors();
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);

  const handleClose = useCallback(() => setOpenSheet(null), []);

  const canEdit = isOrganizer;
  // Every competition setting is locked once any round has started or
  // completed. Changing core fields (type, format, handicap system) mid-
  // event would require data migration; changing scoring fields (dates,
  // rules mode, general rules) would invalidate already-finalized results.
  // Easier to lock everything uniformly and re-enable by resetting rounds.
  const structureLocked = hasStartedRound;
  const canEditStructure = canEdit && !structureLocked;

  const hasTeams = competition.team_mode !== 'none';
  const showEndDate = competition.competition_type === 'event' || !!competition.end_date;

  // Scoring rules section (Phase 6).
  const perRoundEnabled = competition.per_round_rules_enabled ?? false;
  const modeLabel = perRoundEnabled ? 'Per-round rules' : 'General rules';
  const rulesLabel =
    detectActivePreset(competition.point_system ?? null) === 'standard'
      ? 'Standard'
      : 'Custom';

  return (
    <View style={styles.section}>
      <SectionHeader title="Competition Details" icon="cog-outline" primaryIcon={false} />

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
          onPress={canEditStructure ? () => setOpenSheet('handicap') : undefined}
          locked={canEdit && structureLocked}
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

        {/* Team Size (only if teams enabled). Read-only value; tapping opens Teams tab. */}
        {hasTeams && competition.team_size != null && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow
              icon="account-multiple-outline"
              label="Team Size"
              onPress={onViewTeams}
              accessibilityLabel="View teams"
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
          onPress={canEditStructure ? () => setOpenSheet('dates') : undefined}
          locked={canEdit && structureLocked}
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
              onPress={canEditStructure ? () => setOpenSheet('dates') : undefined}
              locked={canEdit && structureLocked}
            >
              <Text style={[styles.value, { color: colors.textPrimary }]}>
                {competition.end_date
                  ? formatDateAustralian(competition.end_date)
                  : 'Not set'}
              </Text>
            </SettingRow>
          </>
        )}

        {/* Scoring Rules Mode (Phase 6). Always visible to organisers so
            the choice is explicit up-front. Per-round option is tier-gated
            inside the sheet itself. */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="scale-balance"
          label="Rules Mode"
          onPress={canEditStructure ? () => setOpenSheet('rules-mode') : undefined}
          locked={canEdit && structureLocked}
        >
          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {modeLabel}
          </Text>
        </SettingRow>

        {/* General Rules — tap to open the point-system editor. Hidden when
            the competition is in per-round mode (each round's override
            supersedes this). */}
        {!perRoundEnabled && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingRow
              icon="medal-outline"
              label="General Rules"
              onPress={canEditStructure ? () => setOpenSheet('general-rules') : undefined}
              locked={canEdit && structureLocked}
            >
              <Text style={[styles.value, { color: colors.textPrimary }]}>
                {rulesLabel}
              </Text>
            </SettingRow>
          </>
        )}

      </View>

      {canEdit && structureLocked && (
        <Text style={[styles.lockedFootnote, { color: colors.textSecondary }]}>
          Competition settings are locked once scoring has started.
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
      {openSheet === 'rules-mode' && (
        <EditScoringRulesModeSheet
          visible
          onDismiss={handleClose}
          competitionId={competition.id}
          currentPerRoundEnabled={perRoundEnabled}
        />
      )}
      {openSheet === 'general-rules' && (
        <EditCompetitionRulesSheet
          visible
          onDismiss={handleClose}
          competitionId={competition.id}
          currentPointSystem={competition.point_system ?? null}
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
