/**
 * SettingsSection - Competition settings display
 *
 * Displays:
 * - Competition type (league/event)
 * - Handicap system
 * - Team mode/format
 * - Team size (if teams enabled)
 * - Competition status
 * - Edit button (organizers only)
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon, Chip } from 'react-native-paper';
import { IconSettings } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { Pill } from '@/components/common/Pill';
import { StatusBadge, type StatusVariant } from '@/components/common/StatusBadge';
import {
  competitionTypeLabels,
  handicapSystemLabels,
  teamModeLabels,
  type SettingsSectionProps,
  type EditableDetailRowProps,
} from './types';

// =====================================================
// EDITABLE DETAIL ROW COMPONENT
// =====================================================

function EditableDetailRow({
  label,
  value,
  isEditable,
  onPress,
  icon,
  chip = false,
  chipColor,
}: EditableDetailRowProps) {
  const colors = useThemeColors();

  const content = (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelContainer}>
        {icon && <Icon source={icon} size={18} color={colors.textSecondary} />}
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <View style={styles.detailValueContainer}>
        {chip ? (
          <Chip
            mode="flat"
            style={[styles.detailChip, { backgroundColor: chipColor || colors.primaryLighter }]}
            textStyle={[styles.detailChipText, { color: chipColor ? colors.white : colors.primaryDark }]}
          >
            {value}
          </Chip>
        ) : (
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{value}</Text>
        )}
        {isEditable && (
          <Icon source="chevron-right" size={20} color={colors.textSecondary} />
        )}
      </View>
    </View>
  );

  if (isEditable && onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.detailRowPressable}
        accessibilityLabel={`Edit ${label}`}
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.detailRowPressable}>{content}</View>;
}

// =====================================================
// SETTINGS SECTION COMPONENT
// =====================================================

export function SettingsSection({
  competition,
  isOrganizer,
  onEdit,
}: SettingsSectionProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <IconSettings size={20} color={colors.textPrimary} />
          <Text style={[styles.sectionTitle, styles.noMargin, { color: colors.textPrimary }]}>Settings</Text>
        </View>
        {isOrganizer && (
          <TouchableOpacity
            style={[styles.sectionEditButton, { backgroundColor: colors.gray100 }]}
            onPress={onEdit}
            accessibilityLabel="Edit settings"
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <Icon source="pencil" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
        {/* Competition Type */}
        <View style={styles.detailRowPressable}>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <Icon source="tag-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Type</Text>
            </View>
            <View style={styles.detailValueContainer}>
              <Pill
                label={competitionTypeLabels[competition.competition_type] || 'Event'}
                variant="primary"
                size="md"
              />
            </View>
          </View>
        </View>

        {/* Handicap System */}
        <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
        <EditableDetailRow
          label="Handicap System"
          value={handicapSystemLabels[competition.handicap_system]}
          isEditable={false}
          icon="golf"
        />

        {/* Team Mode */}
        <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
        <EditableDetailRow
          label="Format"
          value={teamModeLabels[competition.team_mode]}
          isEditable={false}
          icon="account-group-outline"
        />

        {/* Team Size (only if teams enabled) */}
        {competition.team_mode !== 'none' && competition.team_size && (
          <>
            <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
            <EditableDetailRow
              label="Team Size"
              value={`${competition.team_size} players`}
              isEditable={false}
              icon="account-multiple-outline"
            />
          </>
        )}

        {/* Status */}
        <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
        <View style={styles.detailRowPressable}>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <Icon source="information-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
            </View>
            <View style={styles.detailValueContainer}>
              <StatusBadge status={competition.status as StatusVariant} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  // Section
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  noMargin: {
    marginBottom: 0,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionEditButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Settings Card
  settingsCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },

  // Detail Row
  detailRowPressable: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  detailLabel: {
    ...typography.body,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailValue: {
    ...typography.body,
    textAlign: 'right',
  },
  detailChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  detailChipText: {
    ...typography.small,
  },
  detailDivider: {
    height: 1,
    marginHorizontal: spacing.lg,
  },
});

export default SettingsSection;
