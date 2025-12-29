/**
 * TeamSettingsStep Stories
 *
 * Storybook stories for the team settings step in competition creation.
 * Shows various configurations for team modes, sizes, and point systems.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, StyleSheet } from 'react-native';
// Note: action helper replaced with console.log for Storybook 9 compatibility
const action = (name: string) => (...args: unknown[]) => console.log(name, ...args);
import TeamSettingsStep from './TeamSettingsStep';
import { DEFAULT_POINT_SYSTEM, type TeamSettingsFormData } from '@/schemas/competition';

// ============================================================================
// META CONFIGURATION
// ============================================================================

const meta: Meta<typeof TeamSettingsStep> = {
  title: 'CompetitionWizard/Create/TeamSettingsStep',
  component: TeamSettingsStep,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Step 2 of competition creation wizard. Allows users to configure team format, team size, and the point system for the competition.',
      },
    },
  },
  decorators: [
    (Story) => (
      <View style={styles.container}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    onComplete: { action: 'onComplete' },
    onBack: { action: 'onBack' },
  },
};

export default meta;
type Story = StoryObj<typeof TeamSettingsStep>;

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
});

// ============================================================================
// FIXTURES
// ============================================================================

const defaultCallbacks = {
  onComplete: action('onComplete'),
  onBack: action('onBack'),
};

const fixedTeamsData: TeamSettingsFormData = {
  teamMode: 'fixed',
  teamSize: 2,
  pointSystem: DEFAULT_POINT_SYSTEM,
};

const perRoundTeamsData: TeamSettingsFormData = {
  teamMode: 'per-round',
  teamSize: 4,
  pointSystem: DEFAULT_POINT_SYSTEM,
};

const customPointSystem: TeamSettingsFormData = {
  teamMode: 'none',
  teamSize: 2,
  pointSystem: [
    { position: 1, points: 25 },
    { position: 2, points: 20 },
    { position: 3, points: 15 },
    { position: 4, points: 10 },
    { position: 5, points: 8 },
    { position: 6, points: 6 },
    { position: 7, points: 4 },
    { position: 8, points: 2 },
  ],
};

const leaguePointSystem: TeamSettingsFormData = {
  teamMode: 'fixed',
  teamSize: 2,
  pointSystem: [
    { position: 1, points: 25 },
    { position: 2, points: 20 },
    { position: 3, points: 18 },
    { position: 4, points: 16 },
    { position: 5, points: 14 },
    { position: 6, points: 12 },
    { position: 7, points: 10 },
    { position: 8, points: 9 },
    { position: 9, points: 8 },
    { position: 10, points: 7 },
    { position: 11, points: 6 },
    { position: 12, points: 5 },
    { position: 13, points: 4 },
    { position: 14, points: 3 },
    { position: 15, points: 2 },
    { position: 16, points: 1 },
  ],
};

const minimalPointSystem: TeamSettingsFormData = {
  teamMode: 'none',
  teamSize: 2,
  pointSystem: [
    { position: 1, points: 5 },
    { position: 2, points: 3 },
    { position: 3, points: 1 },
  ],
};

// ============================================================================
// STORIES - DEFAULT STATES
// ============================================================================

/**
 * Default state with no initial data.
 * Shows the component in its initial state with "No Teams" selected.
 */
export const Default: Story = {
  args: {
    ...defaultCallbacks,
  },
};

/**
 * Individual competition mode (No Teams).
 * Players compete individually without team assignments.
 */
export const NoTeamsMode: Story = {
  args: {
    ...defaultCallbacks,
    initialData: {
      teamMode: 'none',
      teamSize: 2,
      pointSystem: DEFAULT_POINT_SYSTEM,
    },
  },
};

// ============================================================================
// STORIES - TEAM MODES
// ============================================================================

/**
 * Fixed Teams mode selected.
 * Teams stay the same throughout all rounds.
 * Shows the team size selector with 2 players per team.
 */
export const FixedTeamsMode: Story = {
  args: {
    ...defaultCallbacks,
    initialData: fixedTeamsData,
  },
};

/**
 * Per-Round Teams mode selected.
 * Teams rotate each round (rotating partners).
 * Shows team size of 4 players per team.
 */
export const PerRoundTeamsMode: Story = {
  args: {
    ...defaultCallbacks,
    initialData: perRoundTeamsData,
  },
};

// ============================================================================
// STORIES - TEAM SIZES
// ============================================================================

/**
 * Teams of 2 (Pairs).
 * Two players per team - common for best ball and four-ball formats.
 */
export const TeamSizeTwo: Story = {
  args: {
    ...defaultCallbacks,
    initialData: {
      teamMode: 'fixed',
      teamSize: 2,
      pointSystem: DEFAULT_POINT_SYSTEM,
    },
  },
};

/**
 * Teams of 3 (Triples).
 * Three players per team - common for scramble events.
 */
export const TeamSizeThree: Story = {
  args: {
    ...defaultCallbacks,
    initialData: {
      teamMode: 'fixed',
      teamSize: 3,
      pointSystem: DEFAULT_POINT_SYSTEM,
    },
  },
};

/**
 * Teams of 4 (Foursomes).
 * Four players per team - common for Ambrose and corporate events.
 */
export const TeamSizeFour: Story = {
  args: {
    ...defaultCallbacks,
    initialData: {
      teamMode: 'fixed',
      teamSize: 4,
      pointSystem: DEFAULT_POINT_SYSTEM,
    },
  },
};

// ============================================================================
// STORIES - POINT SYSTEMS
// ============================================================================

/**
 * Default point system (10-8-6-5-4-3-2-1).
 * Standard 8-position point system for small competitions.
 */
export const DefaultPointSystem: Story = {
  args: {
    ...defaultCallbacks,
    initialData: {
      teamMode: 'none',
      teamSize: 2,
      pointSystem: DEFAULT_POINT_SYSTEM,
    },
  },
};

/**
 * Custom point system with higher values.
 * Shows a modified point system (25-20-15-10-8-6-4-2).
 */
export const CustomPointSystem: Story = {
  args: {
    ...defaultCallbacks,
    initialData: customPointSystem,
  },
};

/**
 * League-style point system (16 positions).
 * Extended point system for larger competitions.
 * Shows "+11 more positions..." indicator.
 */
export const LeaguePointSystem: Story = {
  args: {
    ...defaultCallbacks,
    initialData: leaguePointSystem,
  },
};

/**
 * Minimal point system (3 positions only).
 * Simple system for small events - no "more positions" text shown.
 */
export const MinimalPointSystem: Story = {
  args: {
    ...defaultCallbacks,
    initialData: minimalPointSystem,
  },
};

// ============================================================================
// STORIES - INTERACTIVE STATES
// ============================================================================

/**
 * Fixed teams with team size 4 and league points.
 * Shows a fully configured competition ready for review.
 */
export const FullyConfigured: Story = {
  args: {
    ...defaultCallbacks,
    initialData: {
      teamMode: 'fixed',
      teamSize: 4,
      pointSystem: leaguePointSystem.pointSystem,
    },
  },
};

/**
 * Per-round teams with custom points.
 * Shows rotating teams with modified point values.
 */
export const PerRoundWithCustomPoints: Story = {
  args: {
    ...defaultCallbacks,
    initialData: {
      teamMode: 'per-round',
      teamSize: 2,
      pointSystem: customPointSystem.pointSystem,
    },
  },
};

// ============================================================================
// STORIES - EDGE CASES
// ============================================================================

/**
 * Empty point system (edge case).
 * Shows behavior when point system array is empty.
 */
export const EmptyPointSystem: Story = {
  args: {
    ...defaultCallbacks,
    initialData: {
      teamMode: 'none',
      teamSize: 2,
      pointSystem: [],
    },
  },
};

/**
 * Single position point system (edge case).
 * Only 1st place gets points.
 */
export const SinglePositionPoints: Story = {
  args: {
    ...defaultCallbacks,
    initialData: {
      teamMode: 'none',
      teamSize: 2,
      pointSystem: [{ position: 1, points: 10 }],
    },
  },
};

/**
 * Exactly 5 positions (boundary case).
 * Shows exactly 5 positions without "more positions" indicator.
 */
export const ExactlyFivePositions: Story = {
  args: {
    ...defaultCallbacks,
    initialData: {
      teamMode: 'none',
      teamSize: 2,
      pointSystem: [
        { position: 1, points: 10 },
        { position: 2, points: 8 },
        { position: 3, points: 6 },
        { position: 4, points: 4 },
        { position: 5, points: 2 },
      ],
    },
  },
};

/**
 * Six positions (shows +1 more).
 * Just over the preview limit to show "more positions" text.
 */
export const SixPositions: Story = {
  args: {
    ...defaultCallbacks,
    initialData: {
      teamMode: 'none',
      teamSize: 2,
      pointSystem: [
        { position: 1, points: 10 },
        { position: 2, points: 8 },
        { position: 3, points: 6 },
        { position: 4, points: 4 },
        { position: 5, points: 2 },
        { position: 6, points: 1 },
      ],
    },
  },
};
