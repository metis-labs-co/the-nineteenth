/**
 * AddPlayersBottomSheet Storybook Stories
 *
 * Stories demonstrating the various configurations and states of the
 * AddPlayersBottomSheet component used for adding players to competitions.
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import AddPlayersBottomSheet from './AddPlayersBottomSheet';
import { spacing, borderRadius, typography } from '@/constants/theme';

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof AddPlayersBottomSheet> = {
  title: 'CompetitionWizard/AddPlayersBottomSheet',
  component: AddPlayersBottomSheet,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    visible: { control: 'boolean' },
    maxPlayers: { control: 'number' },
    currentPlayerCount: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof AddPlayersBottomSheet>;

// ===========================================================================
// WRAPPER COMPONENT FOR INTERACTIVE STORIES
// ===========================================================================

interface WrapperProps {
  maxPlayers?: number;
  currentPlayerCount?: number;
  existingPlayerIds?: string[];
  buttonText?: string;
}

function AddPlayersWrapper({
  maxPlayers,
  currentPlayerCount = 0,
  existingPlayerIds = [],
  buttonText = 'Add Players to Competition',
}: WrapperProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={wrapperStyles.container}>
      <View style={wrapperStyles.infoBox}>
        <RNText style={wrapperStyles.infoTitle}>Competition Details</RNText>
        <RNText style={wrapperStyles.infoText}>
          Current Players: {currentPlayerCount}
        </RNText>
        {maxPlayers !== undefined && (
          <RNText style={wrapperStyles.infoText}>
            Max Players: {maxPlayers}
          </RNText>
        )}
        <RNText style={wrapperStyles.infoText}>
          Existing Player IDs: {existingPlayerIds.length}
        </RNText>
      </View>

      <TouchableOpacity
        style={wrapperStyles.button}
        onPress={() => setVisible(true)}
      >
        <RNText style={wrapperStyles.buttonText}>{buttonText}</RNText>
      </TouchableOpacity>

      <AddPlayersBottomSheet
        visible={visible}
        onClose={() => setVisible(false)}
        competitionId="story-competition-123"
        existingPlayerIds={existingPlayerIds}
        maxPlayers={maxPlayers}
        currentPlayerCount={currentPlayerCount}
      />
    </View>
  );
}

const wrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: '#F5F5F5',
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    width: '100%',
    maxWidth: 320,
  },
  infoTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
    color: '#1A1A1A',
  },
  infoText: {
    ...typography.body,
    color: '#666666',
    marginBottom: spacing.xs,
  },
  button: {
    backgroundColor: '#2E7D32',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    color: '#FFFFFF',
    ...typography.bodyBold,
  },
});

// ===========================================================================
// STORIES
// ===========================================================================

/**
 * Default state with no player limit (unlimited)
 */
export const Default: Story = {
  render: () => <AddPlayersWrapper />,
};

/**
 * With player limit - shows limit indicator
 */
export const WithPlayerLimit: Story = {
  render: () => (
    <AddPlayersWrapper
      maxPlayers={16}
      currentPlayerCount={8}
      buttonText="Add Players (8/16)"
    />
  ),
};

/**
 * Near player limit - warning state
 */
export const NearLimit: Story = {
  render: () => (
    <AddPlayersWrapper
      maxPlayers={10}
      currentPlayerCount={9}
      buttonText="Add Players (Near Limit)"
    />
  ),
};

/**
 * At player limit - selections disabled
 */
export const AtLimit: Story = {
  render: () => (
    <AddPlayersWrapper
      maxPlayers={8}
      currentPlayerCount={8}
      buttonText="Add Players (At Limit)"
    />
  ),
};

/**
 * With some players already in competition
 */
export const WithExistingPlayers: Story = {
  render: () => (
    <AddPlayersWrapper
      maxPlayers={20}
      currentPlayerCount={5}
      existingPlayerIds={['player-1', 'player-2', 'player-3']}
      buttonText="Add More Players"
    />
  ),
};

/**
 * Free tier limit (small)
 */
export const FreeTierLimit: Story = {
  render: () => (
    <AddPlayersWrapper
      maxPlayers={10}
      currentPlayerCount={3}
      buttonText="Add Players (Free Tier)"
    />
  ),
};

/**
 * Social tier limit (medium)
 */
export const SocialTierLimit: Story = {
  render: () => (
    <AddPlayersWrapper
      maxPlayers={16}
      currentPlayerCount={10}
      buttonText="Add Players (Social Tier)"
    />
  ),
};

/**
 * Premium tier (generous limit)
 */
export const PremiumTierLimit: Story = {
  render: () => (
    <AddPlayersWrapper
      maxPlayers={40}
      currentPlayerCount={15}
      buttonText="Add Players (Premium Tier)"
    />
  ),
};

/**
 * Empty competition (no existing players)
 */
export const EmptyCompetition: Story = {
  render: () => (
    <AddPlayersWrapper
      maxPlayers={20}
      currentPlayerCount={0}
      buttonText="Add First Players"
    />
  ),
};

/**
 * Unlimited players (no limit indicator)
 */
export const UnlimitedPlayers: Story = {
  render: () => (
    <AddPlayersWrapper
      maxPlayers={undefined}
      currentPlayerCount={25}
      buttonText="Add Players (Unlimited)"
    />
  ),
};
