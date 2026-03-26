/**
 * NotificationItem Storybook Stories
 *
 * Stories demonstrating the various configurations of the NotificationItem component.
 * Shows different notification types, read/unread states, message variations, and edge cases.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { NotificationItem } from './NotificationItem';
import { spacing } from '@/constants/theme';
import type { Notification, NotificationType } from '@/types/database.types';

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

function createMockNotification(
  type: NotificationType,
  data: Partial<Notification['data']> = {},
  overrides: Partial<Notification> = {}
): Notification {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    user_id: 'user-456',
    type,
    data: data as Notification['data'],
    competition_id: null,
    round_id: null,
    player_id: null,
    friendship_id: null,
    league_id: null,
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ===========================================================================
// META
// ===========================================================================

const meta: Meta<typeof NotificationItem> = {
  title: 'Notifications/NotificationItem',
  component: NotificationItem,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    onPress: { action: 'pressed' },
  },
};

export default meta;
type Story = StoryObj<typeof NotificationItem>;

// ===========================================================================
// WRAPPER COMPONENTS
// ===========================================================================

function StoryWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={wrapperStyles.container}>
      <View style={wrapperStyles.content}>{children}</View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={wrapperStyles.section}>
      <Text style={wrapperStyles.sectionTitle}>{title}</Text>
      <View style={wrapperStyles.sectionContent}>{children}</View>
    </View>
  );
}

function ItemPreview({ children }: { children: React.ReactNode }) {
  return <View style={wrapperStyles.itemPreview}>{children}</View>;
}

const wrapperStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.sm,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  itemPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
});

// ===========================================================================
// BASIC STORIES
// ===========================================================================

export const Default: Story = {
  args: {
    notification: createMockNotification('competition_player_added', {
      competition_name: 'Summer Championship',
      added_by_name: 'John Smith',
    }),
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Default Notification">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const UnreadNotification: Story = {
  args: {
    notification: createMockNotification(
      'competition_player_added',
      {
        competition_name: 'Masters League',
        added_by_name: 'Jane Doe',
      },
      { is_read: false }
    ),
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Unread Notification (highlighted background)">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const ReadNotification: Story = {
  args: {
    notification: createMockNotification(
      'competition_player_added',
      {
        competition_name: 'Winter Cup',
        added_by_name: 'Mike Wilson',
      },
      { is_read: true, read_at: new Date().toISOString() }
    ),
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Read Notification (standard background)">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};

// ===========================================================================
// ALL NOTIFICATION TYPES
// ===========================================================================

export const AllNotificationTypes: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Competition Player Added">
        <NotificationItem
          notification={createMockNotification('competition_player_added', {
            competition_name: 'Summer Championship',
            added_by_name: 'John Smith',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Competition Player Joined">
        <NotificationItem
          notification={createMockNotification('competition_player_joined', {
            competition_name: 'Masters League',
            player_name: 'Sarah Connor',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="New Round Created">
        <NotificationItem
          notification={createMockNotification('new_round_created', {
            course_name: 'Royal Melbourne',
            date: '15 Jan 2025',
            round_number: 3,
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Competition Status Changed">
        <NotificationItem
          notification={createMockNotification('competition_status_changed', {
            competition_name: 'Spring Open',
            new_status: 'in-progress',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Scorecard Submitted">
        <NotificationItem
          notification={createMockNotification('scorecard_submitted', {
            player_name: 'Tom Brady',
            date: '20 Dec 2024',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Friend Request Received">
        <NotificationItem
          notification={createMockNotification('friend_request_received', {
            requester_name: 'Golf Buddy',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Friend Request Accepted">
        <NotificationItem
          notification={createMockNotification('friend_request_accepted', {
            accepter_name: 'Best Friend',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Social Round Invitation">
        <NotificationItem
          notification={createMockNotification('social_round_invitation', {
            inviter_name: 'Golf Group',
            venue_name: 'Kingston Heath',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Skins Game Completed">
        <NotificationItem
          notification={createMockNotification('skins_game_completed', {
            competition_name: 'Summer Cup',
            round_number: 3,
            holes_won: 2,
            net_result: 45.00,
            currency: 'AUD',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Skins Game Cancelled">
        <NotificationItem
          notification={createMockNotification('skins_game_cancelled', {
            competition_name: 'Summer Cup',
            round_number: 3,
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Wolf Game Completed">
        <NotificationItem
          notification={createMockNotification('wolf_game_completed', {
            competition_name: 'Summer Cup',
            round_number: 3,
            total_points: 8,
            net_result: 32.00,
            pot_enabled: true,
            currency: 'AUD',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Wolf Game Cancelled">
        <NotificationItem
          notification={createMockNotification('wolf_game_cancelled', {
            competition_name: 'Summer Cup',
            round_number: 3,
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Prize Pool Settled">
        <NotificationItem
          notification={createMockNotification('prize_pool_settled', {
            competition_name: 'Summer Cup',
            position: 2,
            position_text: '2nd',
            payout_amount: 150.00,
            currency: 'AUD',
          })}
          onPress={() => {}}
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// READ VS UNREAD COMPARISON
// ===========================================================================

export const ReadUnreadComparison: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Unread Notifications">
        <NotificationItem
          notification={createMockNotification(
            'friend_request_received',
            { requester_name: 'Alice Johnson' },
            { is_read: false }
          )}
          onPress={() => {}}
        />
        <Divider />
        <NotificationItem
          notification={createMockNotification(
            'competition_player_added',
            { competition_name: 'Weekend League', added_by_name: 'Bob Smith' },
            { is_read: false }
          )}
          onPress={() => {}}
        />
      </Section>

      <Section title="Read Notifications">
        <NotificationItem
          notification={createMockNotification(
            'friend_request_received',
            { requester_name: 'Charlie Brown' },
            { is_read: true }
          )}
          onPress={() => {}}
        />
        <Divider />
        <NotificationItem
          notification={createMockNotification(
            'competition_player_added',
            { competition_name: 'Old Tournament', added_by_name: 'Dan White' },
            { is_read: true }
          )}
          onPress={() => {}}
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// COMPETITION NOTIFICATIONS
// ===========================================================================

export const CompetitionNotifications: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Added to Competition (with name)">
        <NotificationItem
          notification={createMockNotification('competition_player_added', {
            competition_name: 'Summer Championship 2024',
            added_by_name: 'Tournament Admin',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Added to Competition (anonymous)">
        <NotificationItem
          notification={createMockNotification('competition_player_added', {
            competition_name: 'Winter League',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Player Joined">
        <NotificationItem
          notification={createMockNotification('competition_player_joined', {
            competition_name: 'Corporate Golf Day',
            player_name: 'New Member',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Status Changed - In Progress">
        <NotificationItem
          notification={createMockNotification('competition_status_changed', {
            competition_name: 'Spring Open',
            new_status: 'in-progress',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Status Changed - Completed">
        <NotificationItem
          notification={createMockNotification('competition_status_changed', {
            competition_name: 'Autumn Classic',
            new_status: 'completed',
          })}
          onPress={() => {}}
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ROUND NOTIFICATIONS
// ===========================================================================

export const RoundNotifications: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="New Round - Full Details">
        <NotificationItem
          notification={createMockNotification('new_round_created', {
            course_name: 'Royal Melbourne Golf Club',
            date: '25 January 2025',
            round_number: 1,
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="New Round - Course Only">
        <NotificationItem
          notification={createMockNotification('new_round_created', {
            course_name: 'Kingston Heath',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="New Round - Minimal Data">
        <NotificationItem
          notification={createMockNotification('new_round_created', {})}
          onPress={() => {}}
        />
      </Section>

      <Section title="Scorecard Submitted - Full">
        <NotificationItem
          notification={createMockNotification('scorecard_submitted', {
            player_name: 'John Smith',
            date: '20 December 2024',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Scorecard Submitted - Player Only">
        <NotificationItem
          notification={createMockNotification('scorecard_submitted', {
            player_name: 'Jane Doe',
          })}
          onPress={() => {}}
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// SOCIAL NOTIFICATIONS
// ===========================================================================

export const SocialNotifications: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Friend Request Received">
        <NotificationItem
          notification={createMockNotification('friend_request_received', {
            requester_name: 'Golf Enthusiast',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Friend Request Accepted">
        <NotificationItem
          notification={createMockNotification('friend_request_accepted', {
            accepter_name: 'Your Golf Buddy',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Round Invitation - Full">
        <NotificationItem
          notification={createMockNotification('social_round_invitation', {
            inviter_name: 'Saturday Group',
            venue_name: 'Sandringham Golf Links',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Round Invitation - No Venue">
        <NotificationItem
          notification={createMockNotification('social_round_invitation', {
            inviter_name: 'Weekend Warriors',
          })}
          onPress={() => {}}
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const EdgeCases: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Very Long Names">
        <NotificationItem
          notification={createMockNotification('competition_player_added', {
            competition_name:
              'The Australian Open Championship Series 2025 - Melbourne Regional Qualifiers',
            added_by_name: 'Tournament Registration Administrator',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Special Characters">
        <NotificationItem
          notification={createMockNotification('competition_player_added', {
            competition_name: "O'Reilly's Golf & Country Club Tournament",
            added_by_name: 'José García-Martínez',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Emoji Support">
        <NotificationItem
          notification={createMockNotification('competition_player_added', {
            competition_name: '🏌️ Summer Golf 2024 ⛳',
            added_by_name: 'John 👋',
          })}
          onPress={() => {}}
        />
      </Section>

      <Section title="Empty Data - Competition Added">
        <NotificationItem
          notification={createMockNotification('competition_player_added', {})}
          onPress={() => {}}
        />
      </Section>

      <Section title="Empty Data - Player Joined">
        <NotificationItem
          notification={createMockNotification('competition_player_joined', {})}
          onPress={() => {}}
        />
      </Section>

      <Section title="Empty Data - Friend Request">
        <NotificationItem
          notification={createMockNotification('friend_request_received', {})}
          onPress={() => {}}
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// NOTIFICATION LIST SIMULATION
// ===========================================================================

export const NotificationListSimulation: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Mixed Notification List (typical inbox)">
        <NotificationItem
          notification={createMockNotification(
            'friend_request_received',
            { requester_name: 'New Golfer' },
            { is_read: false, created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() }
          )}
          onPress={() => {}}
        />
        <Divider />
        <NotificationItem
          notification={createMockNotification(
            'competition_player_added',
            { competition_name: 'Weekend Championship', added_by_name: 'Admin' },
            { is_read: false, created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() }
          )}
          onPress={() => {}}
        />
        <Divider />
        <NotificationItem
          notification={createMockNotification(
            'new_round_created',
            { course_name: 'Royal Melbourne', date: 'Tomorrow', round_number: 1 },
            { is_read: true, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() }
          )}
          onPress={() => {}}
        />
        <Divider />
        <NotificationItem
          notification={createMockNotification(
            'scorecard_submitted',
            { player_name: 'Playing Partner', date: 'Yesterday' },
            { is_read: true, created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }
          )}
          onPress={() => {}}
        />
        <Divider />
        <NotificationItem
          notification={createMockNotification(
            'competition_status_changed',
            { competition_name: 'Monthly Medal', new_status: 'completed' },
            { is_read: true, created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() }
          )}
          onPress={() => {}}
        />
        <Divider />
        <NotificationItem
          notification={createMockNotification(
            'friend_request_accepted',
            { accepter_name: 'Golf Buddy' },
            { is_read: true, created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString() }
          )}
          onPress={() => {}}
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// SINGLE TYPE FOCUS
// ===========================================================================

export const CompetitionPlayerAdded: Story = {
  args: {
    notification: createMockNotification('competition_player_added', {
      competition_name: 'Summer Championship',
      added_by_name: 'Tournament Admin',
    }),
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Competition Player Added">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const CompetitionPlayerJoined: Story = {
  args: {
    notification: createMockNotification('competition_player_joined', {
      competition_name: 'Masters League',
      player_name: 'New Member',
    }),
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Competition Player Joined">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const NewRoundCreated: Story = {
  args: {
    notification: createMockNotification('new_round_created', {
      course_name: 'Royal Melbourne',
      date: '15 Jan 2025',
      round_number: 3,
    }),
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="New Round Created">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const CompetitionStatusChanged: Story = {
  args: {
    notification: createMockNotification('competition_status_changed', {
      competition_name: 'Spring Open',
      new_status: 'in-progress',
    }),
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Competition Status Changed">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const ScorecardSubmitted: Story = {
  args: {
    notification: createMockNotification('scorecard_submitted', {
      player_name: 'Playing Partner',
      date: '20 Dec 2024',
    }),
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Scorecard Submitted">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const FriendRequestReceived: Story = {
  args: {
    notification: createMockNotification('friend_request_received', {
      requester_name: 'Golf Enthusiast',
    }),
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Friend Request Received">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const FriendRequestAccepted: Story = {
  args: {
    notification: createMockNotification('friend_request_accepted', {
      accepter_name: 'Your New Friend',
    }),
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Friend Request Accepted">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const SocialRoundInvitation: Story = {
  args: {
    notification: createMockNotification('social_round_invitation', {
      inviter_name: 'Weekend Group',
      venue_name: 'Kingston Heath',
    }),
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Social Round Invitation">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const SkinsGameCompleted: Story = {
  args: {
    notification: createMockNotification('skins_game_completed', {
      competition_name: 'Summer Cup',
      round_number: 3,
      holes_won: 2,
      net_result: 45.00,
      currency: 'AUD',
    }),
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Skins Game Completed">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const SkinsGameCancelled: Story = {
  args: {
    notification: createMockNotification('skins_game_cancelled', {
      competition_name: 'Summer Cup',
      round_number: 3,
    }),
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Skins Game Cancelled">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const WolfGameCompleted: Story = {
  args: {
    notification: createMockNotification('wolf_game_completed', {
      competition_name: 'Summer Cup',
      round_number: 3,
      total_points: 8,
      net_result: 32.00,
      pot_enabled: true,
      currency: 'AUD',
    }),
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Wolf Game Completed">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const WolfGameCancelled: Story = {
  args: {
    notification: createMockNotification('wolf_game_cancelled', {
      competition_name: 'Summer Cup',
      round_number: 3,
    }),
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Wolf Game Cancelled">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};

export const PrizePoolSettled: Story = {
  args: {
    notification: createMockNotification('prize_pool_settled', {
      competition_name: 'Summer Cup',
      position: 2,
      position_text: '2nd',
      payout_amount: 150.00,
      currency: 'AUD',
    }),
    onPress: () => {},
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Prize Pool Settled">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};

// ===========================================================================
// ACCESSIBILITY STORIES
// ===========================================================================

export const AccessibilityExamples: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Screen Reader - Unread Notification">
        <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
          Label: "Added to Competition. John Smith added you to Summer Championship. 5 minutes ago"
          {'\n'}Hint: "Unread notification. Tap to view"
        </Text>
        <NotificationItem
          notification={createMockNotification(
            'competition_player_added',
            { competition_name: 'Summer Championship', added_by_name: 'John Smith' },
            { is_read: false }
          )}
          onPress={() => {}}
        />
      </Section>

      <Section title="Screen Reader - Read Notification">
        <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
          Label: "Friend Request Accepted. Jane Doe accepted your friend request. 2 hours ago"
          {'\n'}Hint: "Tap to view"
        </Text>
        <NotificationItem
          notification={createMockNotification(
            'friend_request_accepted',
            { accepter_name: 'Jane Doe' },
            { is_read: true }
          )}
          onPress={() => {}}
        />
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE STORY
// ===========================================================================

export const Interactive: Story = {
  args: {
    notification: createMockNotification('competition_player_added', {
      competition_name: 'Summer Championship',
      added_by_name: 'Tournament Admin',
    }),
  },
  argTypes: {
    notification: {
      control: 'object',
      description: 'The notification object to display',
    },
  },
  decorators: [
    (Story) => (
      <StoryWrapper>
        <Section title="Interactive - Try modifying props in Controls panel">
          <ItemPreview>
            <Story />
          </ItemPreview>
        </Section>
      </StoryWrapper>
    ),
  ],
};
