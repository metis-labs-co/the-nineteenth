/**
 * ManageGrid - organiser quick-action grid on the Details tab
 * (Competition Details redesign).
 *
 * 3-column grid of bordered surface tiles, each with a tinted icon square
 * and a small bold label. Every tile is wired to EXISTING behaviour:
 * - Add round        → onAddRound (screen's handleAddRound)
 * - Formats & points → PointsConfigSheet (per-round rules mode only)
 * - Manage teams     → onViewTeams (team competitions only)
 * - Settings         → onOpenSettings (CompetitionSettings screen)
 * - Share invite     → copies competition.invite_code (same behaviour as
 *                      the invite-code card in CompetitionInfoSection)
 *
 * There is no competition-level pairings destination (pairings are managed
 * per round), so the design's "Pairings" tile is deliberately omitted.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows } from '@/constants/theme';
import { useToast } from '@/context/ToastContext';
import { SectionLabel } from '@/components/common';
import type { Competition, Round, TeamWithMembers } from '@/types/database.types';
import { PointsConfigSheet } from './sections/sheets';

export interface ManageGridProps {
  competition: Competition;
  /** All rounds — passed through to the points-config sheet. */
  rounds: Round[];
  teams?: TeamWithMembers[];
  isOrganizer: boolean;
  /** Opens the add-round flow (screen's existing handleAddRound). */
  onAddRound?: () => void;
  /** Switches to the Teams tab (team competitions only). */
  onViewTeams?: () => void;
  /** Navigates to the Competition Settings screen. */
  onOpenSettings?: () => void;
}

interface ManageAction {
  key: string;
  icon: string;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}

const COLUMNS = 3;

export function ManageGrid({
  competition,
  rounds,
  teams,
  isOrganizer,
  onAddRound,
  onViewTeams,
  onOpenSettings,
}: ManageGridProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const { showSuccessToast } = useToast();
  const [showPointsConfig, setShowPointsConfig] = useState(false);

  const onGreen = isDark ? colors.primaryLight : colors.primaryDark;

  const handleShareInvite = useCallback(async () => {
    await Clipboard.setStringAsync(competition.invite_code);
    showSuccessToast('Copied!', 'Invite code copied to clipboard');
  }, [competition.invite_code, showSuccessToast]);

  const actions = useMemo<ManageAction[]>(() => {
    const list: ManageAction[] = [];
    if (onAddRound) {
      list.push({
        key: 'add-round',
        icon: 'plus',
        label: 'Add round',
        accessibilityLabel: 'Add round',
        onPress: onAddRound,
      });
    }
    // Only meaningful in per-round rules mode — mirrors where the Points
    // Config sheet is reachable from the Scoring & Format card today.
    if (competition.per_round_rules_enabled) {
      list.push({
        key: 'formats-points',
        icon: 'medal-outline',
        label: 'Formats & points',
        accessibilityLabel: 'View or edit formats and points',
        onPress: () => setShowPointsConfig(true),
      });
    }
    if (onViewTeams && competition.team_mode !== 'none') {
      list.push({
        key: 'manage-teams',
        icon: 'account-group-outline',
        label: 'Manage teams',
        accessibilityLabel: 'Manage teams',
        onPress: onViewTeams,
      });
    }
    if (onOpenSettings) {
      list.push({
        key: 'settings',
        icon: 'cog-outline',
        label: 'Settings',
        accessibilityLabel: 'Competition settings',
        onPress: onOpenSettings,
      });
    }
    list.push({
      key: 'share-invite',
      icon: 'share-variant-outline',
      label: 'Share invite',
      accessibilityLabel: 'Share invite code',
      onPress: () => void handleShareInvite(),
    });
    return list;
  }, [
    onAddRound,
    onViewTeams,
    onOpenSettings,
    competition.per_round_rules_enabled,
    competition.team_mode,
    handleShareInvite,
  ]);

  // Chunk into rows of 3 and pad with spacers so every tile keeps an equal
  // 1/3 width regardless of how many actions the last row holds.
  const gridRows = useMemo(() => {
    const result: (ManageAction | null)[][] = [];
    for (let i = 0; i < actions.length; i += COLUMNS) {
      const row: (ManageAction | null)[] = actions.slice(i, i + COLUMNS);
      while (row.length < COLUMNS) row.push(null);
      result.push(row);
    }
    return result;
  }, [actions]);

  if (!isOrganizer || actions.length === 0) return null;

  return (
    <View style={styles.section} testID="manage-grid">
      <SectionLabel>Manage</SectionLabel>
      {gridRows.map((row, rowIndex) => (
        <View key={`manage-row-${rowIndex}`} style={styles.gridRow}>
          {row.map((action, cellIndex) =>
            action ? (
              <TouchableOpacity
                key={action.key}
                testID={`manage-grid-${action.key}`}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.accessibilityLabel}
                activeOpacity={0.7}
                style={[
                  styles.tile,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View
                  style={[styles.iconSquare, { backgroundColor: colors.primaryBackground }]}
                >
                  <Icon source={action.icon} size={20} color={onGreen} />
                </View>
                <Text
                  style={[styles.tileLabel, { color: colors.textPrimary }]}
                  numberOfLines={2}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ) : (
              <View key={`spacer-${rowIndex}-${cellIndex}`} style={styles.spacer} />
            )
          )}
        </View>
      ))}

      {showPointsConfig && (
        <PointsConfigSheet
          visible
          onDismiss={() => setShowPointsConfig(false)}
          competition={competition}
          rounds={rounds}
          teams={teams}
          isOrganizer={isOrganizer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginBottom: spacing.sm + 2,
  },
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.xl - 1,
    paddingVertical: spacing.md + 1,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 7,
    ...shadows.sm,
  },
  spacer: {
    flex: 1,
  },
  iconSquare: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default ManageGrid;
