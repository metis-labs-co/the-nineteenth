/**
 * SimplifiedReviewStep - Simplified review step for new 3-4 step wizard
 *
 * Changes from original ReviewStep:
 * - Removed playersData prop (players added after creation)
 * - Removed teamSettingsData prop (shows simple enableTeams toggle)
 * - Accepts SimplifiedRoundFormData which allows blank rounds
 * - Shows "Not configured" for rounds without course
 * - Added optional prizePoolData prop for prize pool summary display
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type {
  CompetitionDetailsFormData,
  SimplifiedRoundFormData,
  PrizePoolConfigFormData,
} from '@/schemas/competition';
import type { WizardPlayerData } from '@/store/competitionWizardStore';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { CompetitionDetailsSection } from './CompetitionDetailsSection';
import { RoundsSection } from './RoundsSection';
import { ReviewPlayersSection } from './ReviewPlayersSection';
import { PrizePoolSection } from './PrizePoolSection';
import { ReviewInfoBox } from './ReviewInfoBox';
import { ReviewFooter } from './ReviewFooter';

export interface SimplifiedReviewStepProps {
  competitionData: CompetitionDetailsFormData;
  roundsData: SimplifiedRoundFormData[];
  playersData?: WizardPlayerData[];
  prizePoolData?: PrizePoolConfigFormData;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function SimplifiedReviewStep({
  competitionData,
  roundsData,
  playersData,
  prizePoolData,
  onSubmit,
  onBack,
  isSubmitting,
}: SimplifiedReviewStepProps) {
  const colors = useThemeColors();

  const hasPlayers = playersData && playersData.length > 0;
  const hasPrizePool = !!prizePoolData;

  // Format date for display (DD/MM/YYYY - Australian)
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    // Handle both DD/MM/YYYY format and ISO format
    if (dateString.includes('/')) {
      return dateString;
    }
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format handicap system for display
  const formatHandicapSystem = (system: string) => {
    const mapping: Record<string, string> = {
      honor: 'Honour System',
      whs: 'WHS Verified',
      'gross-only': 'Gross Scores Only',
    };
    return mapping[system] || system;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Step Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Review all details before creating your competition.
          {hasPlayers
            ? ' You can add more players and configure rounds after creation.'
            : ' You can add players and configure rounds after creation.'}
        </Text>

        <CompetitionDetailsSection
          competitionData={competitionData}
          formatDate={formatDate}
          formatHandicapSystem={formatHandicapSystem}
        />

        <RoundsSection roundsData={roundsData} formatDate={formatDate} />

        <ReviewPlayersSection playersData={playersData} />

        {hasPrizePool && prizePoolData && (
          <PrizePoolSection prizePoolData={prizePoolData} />
        )}

        <ReviewInfoBox
          hasPlayers={!!hasPlayers}
          enableTeams={competitionData.enableTeams}
          hasPrizePool={hasPrizePool}
        />
      </ScrollView>

      <ReviewFooter
        onSubmit={onSubmit}
        onBack={onBack}
        isSubmitting={isSubmitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl + 80,
  },
  description: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
});

export { SimplifiedReviewStep };
