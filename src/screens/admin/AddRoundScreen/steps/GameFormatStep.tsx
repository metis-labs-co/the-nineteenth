/**
 * GameFormatStep - Step 2: Game Type, Team Round, Team Format
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { RoundGameTypeSelector } from '@/components/competitionWizard/create';
import { TeamRoundSection } from '../components';
import type { GameType, TeamFormat, TeamWithMembers } from '@/types/database.types';
import type { FormErrors } from '../types';

interface GameFormatStepProps {
  gameType: GameType;
  isTeamRound: boolean;
  teamFormat: TeamFormat | null;
  teams: TeamWithMembers[];
  supportsTeams: boolean;
  teamFormatError?: string;
  disabled: boolean;
  allowedGameTypes?: GameType[];
  onGameTypeChange: (gameType: GameType) => void;
  onTeamRoundToggle: (value: boolean) => void;
  onTeamFormatChange: (format: TeamFormat) => void;
  onUpgradePress: () => void;
}

export function GameFormatStep({
  gameType,
  isTeamRound,
  teamFormat,
  teams,
  supportsTeams,
  teamFormatError,
  disabled,
  allowedGameTypes,
  onGameTypeChange,
  onTeamRoundToggle,
  onTeamFormatChange,
  onUpgradePress,
}: GameFormatStepProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {/* Game Type Selection */}
      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Game Type *</Text>
        <RoundGameTypeSelector
          value={gameType}
          onChange={onGameTypeChange}
          disabled={disabled}
          allowedGameTypes={allowedGameTypes}
          onUpgradePress={onUpgradePress}
          showTeamFormats={supportsTeams}
        />
      </View>

      {/* Team Round Section - Only shown if competition supports teams */}
      {supportsTeams && (
        <TeamRoundSection
          isTeamRound={isTeamRound}
          teamFormat={teamFormat}
          teams={teams}
          teamFormatError={teamFormatError}
          onTeamRoundToggle={onTeamRoundToggle}
          onTeamFormatChange={onTeamFormatChange}
          disabled={disabled}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  fieldContainer: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.smallBold,
  },
});
