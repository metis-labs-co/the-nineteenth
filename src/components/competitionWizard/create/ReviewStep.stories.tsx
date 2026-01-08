/**
 * ReviewStep Stories
 *
 * Storybook stories for the review step in competition creation.
 * Shows the final review before competition creation with various configurations.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, StyleSheet } from 'react-native';
import ReviewStep from './ReviewStep';
import {
  DEFAULT_POINT_SYSTEM,
  type CompetitionDetailsFormData,
  type TeamSettingsFormData,
  type RoundDetailsFormData,
  type PlayerFormData,
} from '@/schemas/competition';
// Note: action helper replaced with console.log for Storybook 9 compatibility
const action = (name: string) => (...args: unknown[]) => console.log(name, ...args);

// ============================================================================
// META CONFIGURATION
// ============================================================================

const meta: Meta<typeof ReviewStep> = {
  title: 'CompetitionWizard/Create/ReviewStep',
  component: ReviewStep,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Final step of competition creation wizard. Displays a comprehensive review of all competition details including competition info, team settings, rounds, and players before submission.',
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
    onSubmit: { action: 'onSubmit' },
    onBack: { action: 'onBack' },
    isSubmitting: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof ReviewStep>;

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
// FIXTURES - Competition Details
// ============================================================================

const defaultCompetitionData: CompetitionDetailsFormData = {
  name: 'Summer Championship 2025',
  description: 'Annual summer golf championship for club members',
  competitionType: 'event',
  startDate: '15/01/2025',
  endDate: '16/01/2025',
  handicapSystem: 'honor',
  inviteCode: 'SUMMER-2025',
  enableTeams: false,
};

const leagueCompetitionData: CompetitionDetailsFormData = {
  name: 'Weekly Golf League',
  description: 'Season-long weekly competition',
  competitionType: 'league',
  startDate: '01/02/2025',
  handicapSystem: 'golf-australia',
  inviteCode: 'LEAGUE-25',
  enableTeams: false,
};

const grossOnlyCompetitionData: CompetitionDetailsFormData = {
  name: 'Scratch Tournament',
  description: 'For scratch players only - no handicaps',
  competitionType: 'event',
  startDate: '20/03/2025',
  endDate: '21/03/2025',
  handicapSystem: 'gross-only',
  enableTeams: false,
};

const minimalCompetitionData: CompetitionDetailsFormData = {
  name: 'Quick Event',
  competitionType: 'event',
  startDate: '10/04/2025',
  endDate: '10/04/2025',
  handicapSystem: 'honor',
  enableTeams: false,
};

const longNameCompetitionData: CompetitionDetailsFormData = {
  name: 'The Annual Corporate Golf Championship Tournament Melbourne 2025',
  description: 'A prestigious corporate golf event bringing together the best players from across the region for an unforgettable weekend of competitive golf.',
  competitionType: 'event',
  startDate: '15/06/2025',
  endDate: '17/06/2025',
  handicapSystem: 'golf-australia',
  inviteCode: 'CORP-GOLF-2025',
  enableTeams: false,
};

// ============================================================================
// FIXTURES - Team Settings
// ============================================================================

const noTeamsData: TeamSettingsFormData = {
  teamMode: 'none',
  teamSize: 2,
  pointSystem: DEFAULT_POINT_SYSTEM,
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

const customPointsData: TeamSettingsFormData = {
  teamMode: 'none',
  teamSize: 2,
  pointSystem: [
    { position: 1, points: 25 },
    { position: 2, points: 20 },
    { position: 3, points: 15 },
    { position: 4, points: 10 },
    { position: 5, points: 5 },
  ],
};

const leaguePointsData: TeamSettingsFormData = {
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
  ],
};

// ============================================================================
// FIXTURES - Rounds
// ============================================================================

const singleRoundStableford: RoundDetailsFormData[] = [
  {
    courseId: 'course-1',
    courseName: 'Royal Melbourne Golf Club',
    date: '15/01/2025',
    teeTime: '08:00',
    matchType: 'stableford',
    scoringPairsRequired: false,
  },
];

const singleRoundStroke: RoundDetailsFormData[] = [
  {
    courseId: 'course-1',
    courseName: 'Kingston Heath Golf Club',
    date: '15/01/2025',
    teeTime: '07:30',
    matchType: 'stroke',
    scoringPairsRequired: false,
  },
];

const singleRoundMatchPlay: RoundDetailsFormData[] = [
  {
    courseId: 'course-1',
    courseName: 'Yarra Yarra Golf Club',
    date: '15/01/2025',
    matchType: 'match-play',
    scoringPairsRequired: false,
  },
];

const multipleRoundsMixed: RoundDetailsFormData[] = [
  {
    courseId: 'course-1',
    courseName: 'Royal Melbourne Golf Club',
    date: '15/01/2025',
    teeTime: '08:00',
    matchType: 'stableford',
    scoringPairsRequired: false,
  },
  {
    courseId: 'course-2',
    courseName: 'Kingston Heath Golf Club',
    date: '16/01/2025',
    teeTime: '07:30',
    matchType: 'stroke',
    scoringPairsRequired: false,
  },
];

const threeRounds: RoundDetailsFormData[] = [
  {
    courseId: 'course-1',
    courseName: 'Royal Melbourne Golf Club',
    date: '15/01/2025',
    teeTime: '08:00',
    matchType: 'stableford',
    scoringPairsRequired: false,
  },
  {
    courseId: 'course-2',
    courseName: 'Kingston Heath Golf Club',
    date: '16/01/2025',
    teeTime: '07:30',
    matchType: 'stroke',
    scoringPairsRequired: false,
  },
  {
    courseId: 'course-3',
    courseName: 'Yarra Yarra Golf Club',
    date: '17/01/2025',
    teeTime: '09:00',
    matchType: 'match-play',
    scoringPairsRequired: false,
  },
];

const fiveRounds: RoundDetailsFormData[] = [
  { courseId: '1', courseName: 'Royal Melbourne', date: '15/01/2025', teeTime: '08:00', matchType: 'stableford', scoringPairsRequired: false },
  { courseId: '2', courseName: 'Kingston Heath', date: '22/01/2025', teeTime: '08:00', matchType: 'stroke', scoringPairsRequired: false },
  { courseId: '3', courseName: 'Metropolitan', date: '29/01/2025', teeTime: '08:00', matchType: 'stableford', scoringPairsRequired: false },
  { courseId: '4', courseName: 'Victoria Golf Club', date: '05/02/2025', teeTime: '08:00', matchType: 'best-ball', scoringPairsRequired: false },
  { courseId: '5', courseName: 'Commonwealth', date: '12/02/2025', teeTime: '08:00', matchType: 'ambrose', scoringPairsRequired: false },
];

const teamFormatRounds: RoundDetailsFormData[] = [
  {
    courseId: 'course-1',
    courseName: 'Sandringham Golf Club',
    date: '15/01/2025',
    teeTime: '08:00',
    matchType: 'best-ball',
    scoringPairsRequired: false,
  },
  {
    courseId: 'course-2',
    courseName: 'Woodlands Golf Club',
    date: '16/01/2025',
    teeTime: '08:00',
    matchType: 'scramble',
    scoringPairsRequired: false,
  },
  {
    courseId: 'course-3',
    courseName: 'Long Island Golf Club',
    date: '17/01/2025',
    teeTime: '08:00',
    matchType: 'ambrose',
    scoringPairsRequired: false,
  },
];

// ============================================================================
// FIXTURES - Players
// ============================================================================

const fourPlayers: PlayerFormData[] = [
  { name: 'John Smith', email: 'john@example.com', handicap: '12' },
  { name: 'Jane Doe', email: 'jane@example.com', handicap: '18' },
  { name: 'Bob Wilson', email: 'bob@example.com', handicap: '8' },
  { name: 'Alice Brown', email: 'alice@example.com', handicap: '24' },
];

const eightPlayers: PlayerFormData[] = [
  { name: 'John Smith', email: 'john@example.com', handicap: '12' },
  { name: 'Jane Doe', email: 'jane@example.com', handicap: '18' },
  { name: 'Bob Wilson', email: 'bob@example.com', handicap: '8' },
  { name: 'Alice Brown', email: 'alice@example.com', handicap: '24' },
  { name: 'Charlie Davis', email: 'charlie@example.com', handicap: '15' },
  { name: 'Diana Evans', email: 'diana@example.com', handicap: '20' },
  { name: 'Edward Foster', email: 'edward@example.com', handicap: '6' },
  { name: 'Fiona Green', email: 'fiona@example.com', handicap: '22' },
];

const sixteenPlayers: PlayerFormData[] = Array.from({ length: 16 }, (_, i) => ({
  name: `Player ${i + 1}`,
  email: `player${i + 1}@example.com`,
  handicap: `${8 + i}`,
}));

const playersWithMissingDetails: PlayerFormData[] = [
  { name: 'Complete Player', email: 'complete@example.com', handicap: '12' },
  { name: 'No Email Player', email: '', handicap: '15' },
  { name: 'No Handicap Player', email: 'nohc@example.com', handicap: '' },
  { name: 'Minimal Player', email: '', handicap: '' },
];

const scratchPlayers: PlayerFormData[] = [
  { name: 'Pro Player 1', email: 'pro1@example.com', handicap: '0' },
  { name: 'Pro Player 2', email: 'pro2@example.com', handicap: '+2' },
  { name: 'Pro Player 3', email: 'pro3@example.com', handicap: '-1' },
  { name: 'Pro Player 4', email: 'pro4@example.com', handicap: '1' },
];

// ============================================================================
// DEFAULT CALLBACKS
// ============================================================================

const defaultCallbacks = {
  onSubmit: action('onSubmit'),
  onBack: action('onBack'),
};

// ============================================================================
// STORIES - DEFAULT STATES
// ============================================================================

/**
 * Default state with a typical competition setup.
 * Shows an event-type competition with Stableford scoring.
 */
export const Default: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: singleRoundStableford,
    playersData: fourPlayers,
    isSubmitting: false,
  },
};

/**
 * Competition ready for submission.
 * All details filled in with 8 players.
 */
export const ReadyToSubmit: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: multipleRoundsMixed,
    playersData: eightPlayers,
    isSubmitting: false,
  },
};

// ============================================================================
// STORIES - COMPETITION TYPES
// ============================================================================

/**
 * Event competition type.
 * Shows start and end dates.
 */
export const EventCompetition: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: singleRoundStableford,
    playersData: fourPlayers,
    isSubmitting: false,
  },
};

/**
 * League competition type.
 * Shows only start date (no end date).
 */
export const LeagueCompetition: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: leagueCompetitionData,
    teamSettingsData: leaguePointsData,
    roundsData: fiveRounds,
    playersData: sixteenPlayers,
    isSubmitting: false,
  },
};

/**
 * Gross scores only competition.
 * No handicap adjustments.
 */
export const GrossScoresOnly: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: grossOnlyCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: singleRoundStroke,
    playersData: scratchPlayers,
    isSubmitting: false,
  },
};

// ============================================================================
// STORIES - TEAM CONFIGURATIONS
// ============================================================================

/**
 * Individual competition (no teams).
 * Players compete on their own.
 */
export const NoTeams: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: singleRoundStableford,
    playersData: fourPlayers,
    isSubmitting: false,
  },
};

/**
 * Fixed teams competition.
 * Teams of 2 that stay together for all rounds.
 */
export const FixedTeams: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: fixedTeamsData,
    roundsData: multipleRoundsMixed,
    playersData: eightPlayers,
    isSubmitting: false,
  },
};

/**
 * Per-round teams competition.
 * Teams of 4 that rotate each round.
 */
export const PerRoundTeams: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: perRoundTeamsData,
    roundsData: threeRounds,
    playersData: eightPlayers,
    isSubmitting: false,
  },
};

// ============================================================================
// STORIES - GAME TYPES
// ============================================================================

/**
 * Stableford scoring competition.
 */
export const StablefordScoring: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: singleRoundStableford,
    playersData: fourPlayers,
    isSubmitting: false,
  },
};

/**
 * Stroke play competition.
 */
export const StrokePlay: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: singleRoundStroke,
    playersData: fourPlayers,
    isSubmitting: false,
  },
};

/**
 * Match play competition.
 */
export const MatchPlay: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: singleRoundMatchPlay,
    playersData: fourPlayers,
    isSubmitting: false,
  },
};

/**
 * Team formats (Best Ball, Scramble, Ambrose).
 */
export const TeamFormats: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: fixedTeamsData,
    roundsData: teamFormatRounds,
    playersData: eightPlayers,
    isSubmitting: false,
  },
};

// ============================================================================
// STORIES - ROUND CONFIGURATIONS
// ============================================================================

/**
 * Single round competition.
 */
export const SingleRound: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: singleRoundStableford,
    playersData: fourPlayers,
    isSubmitting: false,
  },
};

/**
 * Two round competition.
 */
export const TwoRounds: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: multipleRoundsMixed,
    playersData: fourPlayers,
    isSubmitting: false,
  },
};

/**
 * Three round competition.
 */
export const ThreeRounds: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: threeRounds,
    playersData: fourPlayers,
    isSubmitting: false,
  },
};

/**
 * Five round league competition.
 */
export const FiveRounds: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: leagueCompetitionData,
    teamSettingsData: leaguePointsData,
    roundsData: fiveRounds,
    playersData: eightPlayers,
    isSubmitting: false,
  },
};

// ============================================================================
// STORIES - POINT SYSTEMS
// ============================================================================

/**
 * Default point system (10-8-6-5-4-3-2-1).
 */
export const DefaultPointSystem: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: singleRoundStableford,
    playersData: fourPlayers,
    isSubmitting: false,
  },
};

/**
 * Custom point system (25-20-15-10-5).
 */
export const CustomPointSystem: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: customPointsData,
    roundsData: singleRoundStableford,
    playersData: fourPlayers,
    isSubmitting: false,
  },
};

/**
 * League point system (12 positions).
 * Shows +8 more positions indicator.
 */
export const LeaguePointSystem: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: leagueCompetitionData,
    teamSettingsData: leaguePointsData,
    roundsData: fiveRounds,
    playersData: sixteenPlayers,
    isSubmitting: false,
  },
};

// ============================================================================
// STORIES - PLAYER VARIATIONS
// ============================================================================

/**
 * Four players.
 */
export const FourPlayers: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: singleRoundStableford,
    playersData: fourPlayers,
    isSubmitting: false,
  },
};

/**
 * Eight players.
 */
export const EightPlayers: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: singleRoundStableford,
    playersData: eightPlayers,
    isSubmitting: false,
  },
};

/**
 * Sixteen players (large competition).
 */
export const SixteenPlayers: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: leagueCompetitionData,
    teamSettingsData: leaguePointsData,
    roundsData: fiveRounds,
    playersData: sixteenPlayers,
    isSubmitting: false,
  },
};

/**
 * Players with missing details.
 * Shows how missing emails and handicaps are displayed.
 */
export const PlayersWithMissingDetails: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: singleRoundStableford,
    playersData: playersWithMissingDetails,
    isSubmitting: false,
  },
};

/**
 * Scratch players (low/plus handicaps).
 */
export const ScratchPlayers: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: grossOnlyCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: singleRoundStroke,
    playersData: scratchPlayers,
    isSubmitting: false,
  },
};

// ============================================================================
// STORIES - SUBMISSION STATES
// ============================================================================

/**
 * Default state (not submitting).
 * Shows "Create Competition" button.
 */
export const NotSubmitting: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: singleRoundStableford,
    playersData: fourPlayers,
    isSubmitting: false,
  },
};

/**
 * Submitting state.
 * Shows "Creating..." with loading indicator.
 */
export const Submitting: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: singleRoundStableford,
    playersData: fourPlayers,
    isSubmitting: true,
  },
};

// ============================================================================
// STORIES - EDGE CASES
// ============================================================================

/**
 * Minimal competition (no description, no invite code).
 */
export const MinimalCompetition: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: minimalCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: singleRoundStableford,
    playersData: [
      { name: 'Player 1', email: '', handicap: '' },
      { name: 'Player 2', email: '', handicap: '' },
    ],
    isSubmitting: false,
  },
};

/**
 * Long competition name and description.
 * Tests text wrapping.
 */
export const LongTextContent: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: longNameCompetitionData,
    teamSettingsData: leaguePointsData,
    roundsData: threeRounds,
    playersData: eightPlayers,
    isSubmitting: false,
  },
};

/**
 * Full configuration - everything filled in.
 * Large league competition with teams.
 */
export const FullConfiguration: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: leagueCompetitionData,
    teamSettingsData: perRoundTeamsData,
    roundsData: fiveRounds,
    playersData: sixteenPlayers,
    isSubmitting: false,
  },
};

/**
 * Round without tee time.
 * Shows that tee time is optional.
 */
export const RoundWithoutTeeTime: Story = {
  args: {
    ...defaultCallbacks,
    competitionData: defaultCompetitionData,
    teamSettingsData: noTeamsData,
    roundsData: [
      {
        courseId: 'course-1',
        courseName: 'Royal Melbourne Golf Club',
        date: '15/01/2025',
        matchType: 'stableford',
        scoringPairsRequired: false,
      },
    ],
    playersData: fourPlayers,
    isSubmitting: false,
  },
};
