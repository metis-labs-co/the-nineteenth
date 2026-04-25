import React from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react';
import { MiniLeaderboardSection } from './MiniLeaderboardSection';
import type { MiniLeaderboardData } from '@/utils/miniLeaderboard';

const individual: MiniLeaderboardData = {
  above: { id: 'p2', position: 2, name: 'Jess Patel', points: 38, isCurrent: false },
  you: { id: 'p3', position: 3, name: 'You', points: 32, isCurrent: true },
  below: { id: 'p4', position: 4, name: "Mike O'Brien", points: 28, isCurrent: false },
};

const team: MiniLeaderboardData = {
  above: { id: 't1', position: 1, name: 'Eagles', points: 88, isCurrent: false },
  you: { id: 't2', position: 2, name: 'Hawks', points: 82, isCurrent: true },
  below: { id: 't3', position: 3, name: 'Falcons', points: 79, isCurrent: false },
};

const leader: MiniLeaderboardData = {
  above: null,
  you: { id: 'p1', position: 1, name: 'You', points: 50, isCurrent: true },
  below: { id: 'p2', position: 2, name: 'Jess', points: 40, isCurrent: false },
};

const last: MiniLeaderboardData = {
  above: { id: 'p4', position: 4, name: 'Mike', points: 22, isCurrent: false },
  you: { id: 'p5', position: 5, name: 'You', points: 18, isCurrent: true },
  below: null,
};

const single: MiniLeaderboardData = {
  above: null,
  you: { id: 'p1', position: 1, name: 'You', points: 10, isCurrent: true },
  below: null,
};

const meta: Meta<typeof MiniLeaderboardSection> = {
  title: 'Competitions/Detail/MiniLeaderboardSection',
  component: MiniLeaderboardSection,
  decorators: [
    (Story) => (
      <View style={{ padding: 16, backgroundColor: '#f4f5f7', minHeight: '100%' }}>
        <Story />
      </View>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof MiniLeaderboardSection>;

export const PlayerOnly: Story = {
  args: { individual, team: null, onOpenLeaderboard: () => {} },
};

export const PlayerAndTeam: Story = {
  args: { individual, team, teamName: 'Hawks', onOpenLeaderboard: () => {} },
};

export const UserIsLeader: Story = {
  args: { individual: leader, team: null, onOpenLeaderboard: () => {} },
};

export const UserIsLast: Story = {
  args: { individual: last, team: null, onOpenLeaderboard: () => {} },
};

export const SinglePlayer: Story = {
  args: { individual: single, team: null, onOpenLeaderboard: () => {} },
};
