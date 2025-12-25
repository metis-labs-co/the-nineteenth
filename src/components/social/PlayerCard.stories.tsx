/**
 * PlayerCard Storybook Stories
 *
 * Stories demonstrating the various configurations of the PlayerCard component.
 * Shows variants, avatar types, badges, right actions, and use cases.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { PlayerCard, PlayerCardProps, PlayerCardData, BadgeConfig } from './PlayerCard';
import { spacing, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

// ============================================================================
// META
// ============================================================================

const meta: Meta<typeof PlayerCard> = {
  title: 'Social/PlayerCard',
  component: PlayerCard,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['card', 'list-item'],
    },
    showEmail: { control: 'boolean' },
    showHandicap: { control: 'boolean' },
    navigateToProfile: { control: 'boolean' },
    handicapColor: { control: 'color' },
  },
};

export default meta;
type Story = StoryObj<typeof PlayerCard>;

// ============================================================================
// WRAPPER COMPONENTS
// ============================================================================

function StoryWrapper({ children }: { children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <ScrollView style={[wrapperStyles.container, { backgroundColor: colors.background }]}>
      <View style={wrapperStyles.content}>{children}</View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={wrapperStyles.section}>
      <Text style={[wrapperStyles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      <View style={wrapperStyles.sectionContent}>{children}</View>
    </View>
  );
}

function CardWrapper({ children }: { children: React.ReactNode }) {
  return <View style={wrapperStyles.cardWrapper}>{children}</View>;
}

function ListWrapper({ children }: { children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={[wrapperStyles.listWrapper, { backgroundColor: colors.surface }]}>
      {children}
    </View>
  );
}

const wrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  sectionContent: {
    gap: spacing.md,
  },
  cardWrapper: {
    gap: spacing.md,
  },
  listWrapper: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
});

// ============================================================================
// FIXTURES
// ============================================================================

const createPlayer = (overrides: Partial<PlayerCardData> = {}): PlayerCardData => ({
  id: 'player-1',
  name: 'John Smith',
  email: 'john.smith@example.com',
  handicap: 12,
  photo_url: null,
  ...overrides,
});

const createBadge = (overrides: Partial<BadgeConfig> = {}): BadgeConfig => ({
  label: 'You',
  backgroundColor: '#DCFCE7',
  textColor: '#166534',
  ...overrides,
});

// Sample players
const samplePlayers: PlayerCardData[] = [
  createPlayer({ id: '1', name: 'John Smith', handicap: 12 }),
  createPlayer({ id: '2', name: 'Sarah Johnson', email: 'sarah@email.com', handicap: 18 }),
  createPlayer({
    id: '3',
    name: 'Mike Wilson',
    handicap: 5,
    photo_url: 'https://randomuser.me/api/portraits/men/32.jpg',
  }),
  createPlayer({ id: '4', name: 'Emma Davis', handicap: 22, email: 'emma@golf.com' }),
  createPlayer({
    id: '5',
    name: 'Tom Brown',
    handicap: 8,
    photo_url: 'https://randomuser.me/api/portraits/men/45.jpg',
  }),
];

// ============================================================================
// BASIC STORIES
// ============================================================================

export const Default: Story = {
  args: {
    player: createPlayer(),
  },
  render: (args) => (
    <StoryWrapper>
      <Section title="Default PlayerCard">
        <CardWrapper>
          <PlayerCard {...args} />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const MinimalProps: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Minimal Props (Name Only)">
        <CardWrapper>
          <PlayerCard player={{ id: '1', name: 'Player Name' }} />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const WithPhoto: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="With Profile Photo">
        <CardWrapper>
          <PlayerCard
            player={createPlayer({
              photo_url: 'https://randomuser.me/api/portraits/men/32.jpg',
            })}
          />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const WithoutEmail: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Without Email">
        <CardWrapper>
          <PlayerCard player={createPlayer()} showEmail={false} />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const WithoutHandicap: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Without Handicap">
        <CardWrapper>
          <PlayerCard player={createPlayer()} showHandicap={false} />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const NameOnly: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Name Only Display">
        <CardWrapper>
          <PlayerCard player={createPlayer()} showEmail={false} showHandicap={false} />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

// ============================================================================
// VARIANT STORIES
// ============================================================================

export const CardVariant: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Card Variant (Default)">
        <CardWrapper>
          <PlayerCard player={samplePlayers[0]} variant="card" />
          <PlayerCard player={samplePlayers[1]} variant="card" />
          <PlayerCard player={samplePlayers[2]} variant="card" />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const ListItemVariant: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="List Item Variant">
        <ListWrapper>
          <PlayerCard player={samplePlayers[0]} variant="list-item" />
          <PlayerCard player={samplePlayers[1]} variant="list-item" />
          <PlayerCard player={samplePlayers[2]} variant="list-item" />
        </ListWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const MixedVariants: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Card vs List Item Comparison">
        <View style={{ gap: spacing.xl }}>
          <View>
            <Text style={{ marginBottom: spacing.sm, fontWeight: '600' }}>Card Variant:</Text>
            <PlayerCard player={createPlayer()} variant="card" />
          </View>
          <View>
            <Text style={{ marginBottom: spacing.sm, fontWeight: '600' }}>List Item Variant:</Text>
            <ListWrapper>
              <PlayerCard player={createPlayer()} variant="list-item" />
            </ListWrapper>
          </View>
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ============================================================================
// BADGE STORIES
// ============================================================================

export const WithYouBadge: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="With 'You' Badge">
        <CardWrapper>
          <PlayerCard player={createPlayer()} badge={createBadge({ label: 'You' })} />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const WithOrganiserBadge: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="With 'Organiser' Badge">
        <CardWrapper>
          <PlayerCard
            player={createPlayer()}
            badge={createBadge({
              label: 'Organiser',
              backgroundColor: '#DBEAFE',
              textColor: '#1E40AF',
            })}
          />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const WithLeaderBadge: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="With 'Leader' Badge">
        <CardWrapper>
          <PlayerCard
            player={createPlayer()}
            badge={createBadge({
              label: 'Leader',
              backgroundColor: '#FEF3C7',
              textColor: '#D97706',
            })}
          />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const MultipleBadgeStyles: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Different Badge Styles">
        <CardWrapper>
          <PlayerCard
            player={createPlayer({ name: 'You (Current User)' })}
            badge={createBadge({ label: 'You' })}
          />
          <PlayerCard
            player={createPlayer({ name: 'Competition Organiser' })}
            badge={createBadge({
              label: 'Organiser',
              backgroundColor: '#DBEAFE',
              textColor: '#1E40AF',
            })}
          />
          <PlayerCard
            player={createPlayer({ name: 'Tournament Leader' })}
            badge={createBadge({
              label: 'Leader',
              backgroundColor: '#FEF3C7',
              textColor: '#D97706',
            })}
          />
          <PlayerCard
            player={createPlayer({ name: 'Team Captain' })}
            badge={createBadge({
              label: 'Captain',
              backgroundColor: '#E0E7FF',
              textColor: '#4338CA',
            })}
          />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

// ============================================================================
// RIGHT ACTION STORIES
// ============================================================================

function ChevronAction() {
  const colors = useThemeColors();
  return <Icon source="chevron-right" size={24} color={colors.gray400} />;
}

function RemoveButton({ onPress }: { onPress?: () => void }) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity onPress={onPress}>
      <Icon source="close-circle" size={24} color={colors.error} />
    </TouchableOpacity>
  );
}

function AddButton({ onPress }: { onPress?: () => void }) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity onPress={onPress}>
      <Icon source="plus-circle" size={24} color={colors.primary} />
    </TouchableOpacity>
  );
}

export const WithChevronAction: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="With Chevron (Navigate) Action">
        <CardWrapper>
          <PlayerCard player={createPlayer()} rightAction={<ChevronAction />} />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const WithRemoveAction: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="With Remove Action">
        <CardWrapper>
          <PlayerCard
            player={createPlayer()}
            rightAction={<RemoveButton />}
            navigateToProfile={false}
          />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const WithAddAction: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="With Add Action">
        <CardWrapper>
          <PlayerCard
            player={createPlayer()}
            rightAction={<AddButton />}
            navigateToProfile={false}
          />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const ListWithActions: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="List Items with Various Actions">
        <ListWrapper>
          <PlayerCard
            player={samplePlayers[0]}
            variant="list-item"
            rightAction={<ChevronAction />}
          />
          <PlayerCard
            player={samplePlayers[1]}
            variant="list-item"
            rightAction={<RemoveButton />}
            navigateToProfile={false}
          />
          <PlayerCard
            player={samplePlayers[2]}
            variant="list-item"
            rightAction={<AddButton />}
            navigateToProfile={false}
          />
        </ListWrapper>
      </Section>
    </StoryWrapper>
  ),
};

// ============================================================================
// HANDICAP VARIATIONS
// ============================================================================

export const HandicapVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Handicap Variations">
        <CardWrapper>
          <PlayerCard player={createPlayer({ name: 'Plus Handicap', handicap: -2 })} />
          <PlayerCard player={createPlayer({ name: 'Scratch Golfer', handicap: 0 })} />
          <PlayerCard player={createPlayer({ name: 'Low Handicap', handicap: 5 })} />
          <PlayerCard player={createPlayer({ name: 'Mid Handicap', handicap: 15 })} />
          <PlayerCard player={createPlayer({ name: 'High Handicap', handicap: 28 })} />
          <PlayerCard player={createPlayer({ name: 'Max Handicap', handicap: 54 })} />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const CustomHandicapColor: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Custom Handicap Colors">
        <CardWrapper>
          <PlayerCard
            player={createPlayer({ name: 'Leader', handicap: 3 })}
            handicapColor="#22C55E"
          />
          <PlayerCard
            player={createPlayer({ name: 'Second Place', handicap: 5 })}
            handicapColor="#3B82F6"
          />
          <PlayerCard
            player={createPlayer({ name: 'Third Place', handicap: 8 })}
            handicapColor="#F59E0B"
          />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const NoHandicap: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Players Without Handicap">
        <CardWrapper>
          <PlayerCard player={createPlayer({ name: 'Null Handicap', handicap: null })} />
          <PlayerCard player={createPlayer({ name: 'Undefined Handicap', handicap: undefined })} />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

// ============================================================================
// AVATAR STORIES
// ============================================================================

export const AvatarVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Avatar Variations">
        <CardWrapper>
          <PlayerCard
            player={createPlayer({ name: 'No Photo (Default Icon)', photo_url: null })}
          />
          <PlayerCard
            player={createPlayer({
              name: 'With Profile Photo',
              photo_url: 'https://randomuser.me/api/portraits/men/32.jpg',
            })}
          />
          <PlayerCard
            player={createPlayer({
              name: 'Female Profile',
              photo_url: 'https://randomuser.me/api/portraits/women/44.jpg',
            })}
          />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

// ============================================================================
// USE CASE STORIES
// ============================================================================

export const CompetitionPlayerList: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Competition Player List">
        <ListWrapper>
          <PlayerCard
            player={samplePlayers[0]}
            variant="list-item"
            badge={createBadge({ label: 'You' })}
            showEmail={false}
          />
          <PlayerCard
            player={samplePlayers[1]}
            variant="list-item"
            badge={createBadge({
              label: 'Organiser',
              backgroundColor: '#DBEAFE',
              textColor: '#1E40AF',
            })}
            showEmail={false}
          />
          <PlayerCard
            player={samplePlayers[2]}
            variant="list-item"
            showEmail={false}
          />
          <PlayerCard
            player={samplePlayers[3]}
            variant="list-item"
            showEmail={false}
          />
          <PlayerCard
            player={samplePlayers[4]}
            variant="list-item"
            showEmail={false}
          />
        </ListWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const FriendsList: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Friends List">
        <CardWrapper>
          {samplePlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              variant="card"
              rightAction={<ChevronAction />}
            />
          ))}
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const SearchResults: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Search Results (Add Friends)">
        <ListWrapper>
          <PlayerCard
            player={createPlayer({ name: 'John Smith', email: 'john@email.com' })}
            variant="list-item"
            rightAction={<AddButton />}
            navigateToProfile={false}
            showHandicap={false}
          />
          <PlayerCard
            player={createPlayer({ name: 'Johnny Appleseed', email: 'johnny@email.com' })}
            variant="list-item"
            rightAction={<AddButton />}
            navigateToProfile={false}
            showHandicap={false}
          />
          <PlayerCard
            player={createPlayer({ name: 'John Doe', email: 'jdoe@email.com' })}
            variant="list-item"
            rightAction={<AddButton />}
            navigateToProfile={false}
            showHandicap={false}
          />
        </ListWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const RemovePlayersFromCompetition: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Remove Players (Edit Mode)">
        <CardWrapper>
          {samplePlayers.slice(0, 4).map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              variant="card"
              rightAction={<RemoveButton />}
              navigateToProfile={false}
            />
          ))}
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const LeaderboardPlayers: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Leaderboard Players">
        <ListWrapper>
          <PlayerCard
            player={createPlayer({ name: 'Mike Wilson', handicap: 5 })}
            variant="list-item"
            badge={createBadge({
              label: '1st',
              backgroundColor: '#FEF3C7',
              textColor: '#D97706',
            })}
            handicapColor="#22C55E"
            showEmail={false}
          />
          <PlayerCard
            player={createPlayer({ name: 'Sarah Johnson', handicap: 18 })}
            variant="list-item"
            badge={createBadge({
              label: '2nd',
              backgroundColor: '#E5E7EB',
              textColor: '#4B5563',
            })}
            showEmail={false}
          />
          <PlayerCard
            player={createPlayer({ name: 'John Smith', handicap: 12 })}
            variant="list-item"
            badge={createBadge({
              label: '3rd',
              backgroundColor: '#FED7AA',
              textColor: '#C2410C',
            })}
            showEmail={false}
          />
          <PlayerCard
            player={createPlayer({ name: 'Emma Davis', handicap: 22 })}
            variant="list-item"
            showEmail={false}
          />
        </ListWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const PairingGroup: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Pairing Group (Round)">
        <ListWrapper>
          <PlayerCard
            player={createPlayer({ name: 'John Smith (You)', handicap: 12 })}
            variant="list-item"
            badge={createBadge({ label: 'You' })}
            showEmail={false}
          />
          <PlayerCard
            player={createPlayer({ name: 'Mike Wilson', handicap: 5 })}
            variant="list-item"
            showEmail={false}
          />
          <PlayerCard
            player={createPlayer({ name: 'Sarah Johnson', handicap: 18 })}
            variant="list-item"
            showEmail={false}
          />
          <PlayerCard
            player={createPlayer({ name: 'Tom Brown', handicap: 8 })}
            variant="list-item"
            showEmail={false}
          />
        </ListWrapper>
      </Section>
    </StoryWrapper>
  ),
};

// ============================================================================
// EDGE CASE STORIES
// ============================================================================

export const LongName: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Long Name">
        <CardWrapper>
          <PlayerCard
            player={createPlayer({
              name: 'Alexander Benjamin Christopher Davidson Emmanuel Franklin',
            })}
          />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const LongEmail: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Long Email">
        <CardWrapper>
          <PlayerCard
            player={createPlayer({
              email: 'very.long.email.address.that.goes.on.forever@example.com',
            })}
          />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const SpecialCharacters: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Special Characters in Name">
        <CardWrapper>
          <PlayerCard player={createPlayer({ name: "O'Brien-Smith" })} />
          <PlayerCard player={createPlayer({ name: 'José García' })} />
          <PlayerCard player={createPlayer({ name: 'Müller, Hans' })} />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const NonPressable: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Non-Pressable Card (Display Only)">
        <CardWrapper>
          <PlayerCard
            player={createPlayer()}
            navigateToProfile={false}
          />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

// ============================================================================
// COMBINATION STORIES
// ============================================================================

export const FullFeatured: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Full Featured Card">
        <CardWrapper>
          <PlayerCard
            player={createPlayer({
              photo_url: 'https://randomuser.me/api/portraits/men/32.jpg',
            })}
            badge={createBadge({ label: 'You' })}
            rightAction={<ChevronAction />}
            variant="card"
            showEmail={true}
            showHandicap={true}
            handicapColor="#22C55E"
          />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const MinimalDisplay: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Minimal Display (Name Only)">
        <CardWrapper>
          <PlayerCard
            player={createPlayer()}
            showEmail={false}
            showHandicap={false}
            navigateToProfile={false}
          />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};

export const CompleteShowcase: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Card Variants">
        <CardWrapper>
          <PlayerCard player={samplePlayers[0]} />
          <PlayerCard player={samplePlayers[2]} badge={createBadge({ label: 'You' })} />
        </CardWrapper>
      </Section>

      <Section title="List Variants">
        <ListWrapper>
          <PlayerCard player={samplePlayers[0]} variant="list-item" />
          <PlayerCard
            player={samplePlayers[1]}
            variant="list-item"
            rightAction={<ChevronAction />}
          />
          <PlayerCard player={samplePlayers[2]} variant="list-item" showEmail={false} />
        </ListWrapper>
      </Section>

      <Section title="With Actions">
        <CardWrapper>
          <PlayerCard player={samplePlayers[0]} rightAction={<RemoveButton />} />
          <PlayerCard player={samplePlayers[1]} rightAction={<AddButton />} />
        </CardWrapper>
      </Section>
    </StoryWrapper>
  ),
};
