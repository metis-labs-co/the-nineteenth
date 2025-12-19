/**
 * AddPlayersStep Storybook Stories
 *
 * Stories demonstrating the various configurations and states of the
 * AddPlayersStep component used in competition creation wizard.
 */

import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import AddPlayersStep from './AddPlayersStep';
import { spacing, borderRadius, typography } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof AddPlayersStep> = {
  title: 'CompetitionWizard/Create/AddPlayersStep',
  component: AddPlayersStep,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    maxPlayersPerCompetition: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof AddPlayersStep>;

// ===========================================================================
// WRAPPER FOR STORIES
// ===========================================================================

interface WrapperProps {
  maxPlayersPerCompetition?: number;
  title?: string;
  description?: string;
}

function StepWrapper({
  maxPlayersPerCompetition,
  title = 'Add Players Step',
  description = 'Select friends to add to the competition',
}: WrapperProps) {
  const handleComplete = (players: any[]) => {
    console.log('onComplete called with:', players);
    alert(`Selected ${players.length} players:\n${players.map((p) => p.name).join('\n')}`);
  };

  const handleBack = () => {
    console.log('onBack called');
    alert('Back button pressed');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <RNText style={styles.headerTitle}>{title}</RNText>
        <RNText style={styles.headerDescription}>{description}</RNText>
        {maxPlayersPerCompetition !== undefined && maxPlayersPerCompetition > 0 && (
          <RNText style={styles.headerLimit}>
            Player Limit: {maxPlayersPerCompetition}
          </RNText>
        )}
      </View>
      <View style={styles.stepContainer}>
        <AddPlayersStep
          onComplete={handleComplete}
          onBack={handleBack}
          maxPlayersPerCompetition={maxPlayersPerCompetition}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#2E7D32',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerTitle: {
    ...typography.h3,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  headerDescription: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerLimit: {
    ...typography.small,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: spacing.sm,
  },
  stepContainer: {
    flex: 1,
  },
});

// ===========================================================================
// STORIES
// ===========================================================================

/**
 * Default state with generous player limit
 */
export const Default: Story = {
  render: () => (
    <StepWrapper
      maxPlayersPerCompetition={20}
      title="Add Players"
      description="Select friends to compete with"
    />
  ),
};

/**
 * Free tier - small player limit (10 players)
 */
export const FreeTierLimit: Story = {
  render: () => (
    <StepWrapper
      maxPlayersPerCompetition={10}
      title="Add Players (Free Tier)"
      description="Limited to 10 players on Free tier"
    />
  ),
};

/**
 * Social tier - medium player limit (16 players)
 */
export const SocialTierLimit: Story = {
  render: () => (
    <StepWrapper
      maxPlayersPerCompetition={16}
      title="Add Players (Social Tier)"
      description="Limited to 16 players on Social tier"
    />
  ),
};

/**
 * Premium tier - generous player limit (40 players)
 */
export const PremiumTierLimit: Story = {
  render: () => (
    <StepWrapper
      maxPlayersPerCompetition={40}
      title="Add Players (Premium Tier)"
      description="Up to 40 players on Premium tier"
    />
  ),
};

/**
 * Very small limit - easy to hit warning/limit states
 */
export const SmallLimit: Story = {
  render: () => (
    <StepWrapper
      maxPlayersPerCompetition={3}
      title="Add Players (Small Limit)"
      description="Only 3 players allowed - hit limit quickly"
    />
  ),
};

/**
 * Unlimited players (no limit specified)
 */
export const UnlimitedPlayers: Story = {
  render: () => (
    <StepWrapper
      maxPlayersPerCompetition={undefined}
      title="Add Players (Unlimited)"
      description="No player limit - defaults to 40 cap"
    />
  ),
};

/**
 * Super admin - unlimited (negative value)
 */
export const SuperAdminUnlimited: Story = {
  render: () => (
    <StepWrapper
      maxPlayersPerCompetition={-1}
      title="Add Players (Super Admin)"
      description="Unlimited players for admin users"
    />
  ),
};

/**
 * Medium tournament size
 */
export const MediumTournament: Story = {
  render: () => (
    <StepWrapper
      maxPlayersPerCompetition={24}
      title="Add Players"
      description="Medium-sized tournament (24 players)"
    />
  ),
};

/**
 * Large corporate event
 */
export const LargeCorporateEvent: Story = {
  render: () => (
    <StepWrapper
      maxPlayersPerCompetition={100}
      title="Add Players"
      description="Large corporate golf day (100 players)"
    />
  ),
};

/**
 * Minimum viable - 4 player limit
 */
export const MinimumViable: Story = {
  render: () => (
    <StepWrapper
      maxPlayersPerCompetition={4}
      title="Small Group Game"
      description="Just 4 players - perfect for a foursome"
    />
  ),
};
