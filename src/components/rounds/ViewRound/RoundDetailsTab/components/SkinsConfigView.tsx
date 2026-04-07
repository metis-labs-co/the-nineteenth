/**
 * SkinsConfigView - Displays skins game configuration for scheduled/in-progress rounds
 *
 * Shows:
 * - Status header with participant count
 * - Config details (pot type/value, scoring type, total pot)
 * - Participant chips list
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, skinsColor } from '@/constants/theme';
import { Pill } from '@/components/common/Pill';
import { formatCurrency } from '@/utils/skins';
import type { SkinsGameWithParticipants } from '@/types/database/skins.types';
import type { RoundStatus } from '@/types/database/enums';

export interface SkinsConfigViewProps {
  skinsGame: SkinsGameWithParticipants;
  roundStatus: RoundStatus;
  potTypeLabel: string;
  scoringTypeLabel: string;
  totalPot: number;
}

export function SkinsConfigView({
  skinsGame,
  roundStatus,
  potTypeLabel,
  scoringTypeLabel,
  totalPot,
}: SkinsConfigViewProps) {
  const colors = useThemeColors();

  return (
    <>
      {/* Status and config header */}
      <View style={styles.configRow}>
        <View style={styles.configLeft}>
          <View style={[styles.skinsIcon, { backgroundColor: `${skinsColor}20` }]}>
            <Icon source="dice-multiple" size={20} color={skinsColor} />
          </View>
          <View style={styles.configInfo}>
            <Text style={[styles.configTitle, { color: colors.textPrimary }]}>
              Skins Enabled
            </Text>
            <Text style={[styles.configSubtitle, { color: colors.textSecondary }]}>
              {skinsGame.participants.length || 0} players competing
            </Text>
          </View>
        </View>
        <Pill
          label={roundStatus === 'in-progress' ? 'In Progress' : 'Scheduled'}
          variant={roundStatus === 'in-progress' ? 'success' : 'primary'}
          size="sm"
        />
      </View>

      {/* Config Details */}
      <View style={[styles.configDivider, { backgroundColor: colors.border }]} />

      <View style={styles.configDetails}>
        {/* Per Hole Value */}
        <View style={styles.configItem}>
          <View style={[styles.configItemIcon, { backgroundColor: colors.gray100 }]}>
            <Icon source="currency-usd" size={18} color={colors.primary} />
          </View>
          <View style={styles.configItemText}>
            <Text style={[styles.configItemLabel, { color: colors.textSecondary }]}>
              {potTypeLabel}
            </Text>
            <Text style={[styles.configItemValue, { color: colors.textPrimary }]}>
              {formatCurrency(skinsGame.pot_value || 0)}
            </Text>
          </View>
        </View>

        {/* Scoring Type */}
        <View style={styles.configItem}>
          <View style={[styles.configItemIcon, { backgroundColor: colors.gray100 }]}>
            <Icon source="golf" size={18} color={colors.primary} />
          </View>
          <View style={styles.configItemText}>
            <Text style={[styles.configItemLabel, { color: colors.textSecondary }]}>
              Scoring
            </Text>
            <Text style={[styles.configItemValue, { color: colors.textPrimary }]}>
              {scoringTypeLabel}
            </Text>
          </View>
        </View>

        {/* Total Pot */}
        <View style={styles.configItem}>
          <View style={[styles.configItemIcon, { backgroundColor: `${skinsColor}15` }]}>
            <Icon source="sigma" size={18} color={skinsColor} />
          </View>
          <View style={styles.configItemText}>
            <Text style={[styles.configItemLabel, { color: colors.textSecondary }]}>
              Total Pot
            </Text>
            <Text style={[styles.configItemValue, { color: skinsColor }]}>
              {formatCurrency(totalPot)}
            </Text>
          </View>
        </View>
      </View>

      {/* Participants */}
      {skinsGame.participants && skinsGame.participants.length > 0 && (
        <>
          <View style={[styles.configDivider, { backgroundColor: colors.border }]} />
          <View style={styles.participantsSection}>
            <Text style={[styles.participantsTitle, { color: colors.textSecondary }]}>
              PARTICIPANTS
            </Text>
            <View style={styles.participantsList}>
              {skinsGame.participants.map((participant) => (
                <View
                  key={participant.id}
                  style={[
                    styles.participantChip,
                    { backgroundColor: colors.gray100 },
                  ]}
                >
                  <Text style={[styles.participantName, { color: colors.textPrimary }]}>
                    {participant.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  configLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  skinsIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  configInfo: {
    flex: 1,
  },
  configTitle: {
    ...typography.bodyBold,
  },
  configSubtitle: {
    ...typography.small,
    marginTop: 2,
  },
  configDivider: {
    height: 1,
    marginHorizontal: spacing.md,
  },
  configDetails: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  configItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  configItemIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  configItemText: {
    flex: 1,
  },
  configItemLabel: {
    ...typography.caption,
  },
  configItemValue: {
    ...typography.smallBold,
    marginTop: 1,
  },
  participantsSection: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  participantsTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  participantChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  participantName: {
    ...typography.small,
  },
});
