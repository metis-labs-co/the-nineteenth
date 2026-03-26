/**
 * NotificationToast Storybook Stories
 *
 * Stories demonstrating the various configurations of the NotificationToast component.
 * Shows different notification types, message variations, and interactive states.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import NotificationToastComponent from './NotificationToast';
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
    id: `notif-${Date.now()}`,
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

const meta: Meta<typeof NotificationToastComponent> = {
  title: 'Notifications/NotificationToast',
  component: NotificationToastComponent,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    onPress: { action: 'pressed' },
  },
};

export default meta;
type Story = StoryObj<typeof NotificationToastComponent>;

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

function ToastPreview({ children }: { children: React.ReactNode }) {
  return <View style={wrapperStyles.toastPreview}>{children}</View>;
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
    gap: spacing.lg,
  },
  toastPreview: {
    backgroundColor: '#1a1a1a',
    padding: spacing.lg,
    borderRadius: 12,
    minHeight: 120,
  },
});

// ===========================================================================
// BASIC STORIES - NOTIFICATION TYPES
// ===========================================================================

export const CompetitionPlayerAdded: Story = {
  args: {
    notification: createMockNotification('competition_player_added', {
      competition_name: 'Summer League 2025',
      added_by_name: 'John Smith',
    }),
    onPress: () => console.log('Navigate to competition'),
  },
};

export const CompetitionPlayerJoined: Story = {
  args: {
    notification: createMockNotification('competition_player_joined', {
      player_name: 'Sarah Connor',
      competition_name: 'Club Championship',
    }),
    onPress: () => console.log('Navigate to competition'),
  },
};

export const NewRoundCreated: Story = {
  args: {
    notification: createMockNotification('new_round_created', {
      course_name: 'Royal Melbourne',
      date: '15/01/2025',
      round_number: 3,
    }),
    onPress: () => console.log('Navigate to round'),
  },
};

export const CompetitionStatusChanged: Story = {
  args: {
    notification: createMockNotification('competition_status_changed', {
      competition_name: 'Spring Open',
      new_status: 'in-progress',
    }),
    onPress: () => console.log('Navigate to competition'),
  },
};

export const ScorecardSubmitted: Story = {
  args: {
    notification: createMockNotification('scorecard_submitted', {
      player_name: 'Tom Watson',
      date: '25/12/2024',
    }),
    onPress: () => console.log('Navigate to scorecard'),
  },
};

export const FriendRequestReceived: Story = {
  args: {
    notification: createMockNotification('friend_request_received', {
      requester_name: 'Rory McIlroy',
    }),
    onPress: () => console.log('Navigate to friend requests'),
  },
};

export const FriendRequestAccepted: Story = {
  args: {
    notification: createMockNotification('friend_request_accepted', {
      accepter_name: 'Phil Mickelson',
    }),
    onPress: () => console.log('Navigate to friends'),
  },
};

export const SocialRoundInvitation: Story = {
  args: {
    notification: createMockNotification('social_round_invitation', {
      inviter_name: 'Jordan Spieth',
      venue_name: 'Augusta National',
    }),
    onPress: () => console.log('Navigate to invitation'),
  },
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
    onPress: () => console.log('Navigate to skins results'),
  },
};

export const SkinsGameCancelled: Story = {
  args: {
    notification: createMockNotification('skins_game_cancelled', {
      competition_name: 'Summer Cup',
      round_number: 3,
    }),
    onPress: () => console.log('Navigate to competition'),
  },
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
    onPress: () => console.log('Navigate to wolf results'),
  },
};

export const WolfGameCancelled: Story = {
  args: {
    notification: createMockNotification('wolf_game_cancelled', {
      competition_name: 'Summer Cup',
      round_number: 3,
    }),
    onPress: () => console.log('Navigate to competition'),
  },
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
    onPress: () => console.log('Navigate to prize pool results'),
  },
};

// ===========================================================================
// ALL NOTIFICATION TYPES GALLERY
// ===========================================================================

export const AllNotificationTypes: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Competition Notifications">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('competition_player_added', {
              competition_name: 'Summer League',
              added_by_name: 'Admin User',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('competition_player_joined', {
              player_name: 'New Player',
              competition_name: 'Monthly Medal',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('competition_status_changed', {
              competition_name: 'Winter Cup',
              new_status: 'completed',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Round Notifications">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('new_round_created', {
              course_name: 'Kingston Heath',
              date: '01/02/2025',
              round_number: 2,
            })}
            onPress={() => {}}
          />
        </ToastPreview>
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('scorecard_submitted', {
              player_name: 'Tiger Woods',
              date: '15/01/2025',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Friend Notifications">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('friend_request_received', {
              requester_name: 'John Smith',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('friend_request_accepted', {
              accepter_name: 'Jane Doe',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Social Notifications">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('social_round_invitation', {
              inviter_name: 'Mike Johnson',
              venue_name: 'Victoria Golf Club',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Side Game Notifications">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('skins_game_completed', {
              competition_name: 'Summer Cup',
              round_number: 3,
              holes_won: 2,
              net_result: 45.00,
              currency: 'AUD',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('skins_game_cancelled', {
              competition_name: 'Summer Cup',
              round_number: 3,
            })}
            onPress={() => {}}
          />
        </ToastPreview>
        <ToastPreview>
          <NotificationToastComponent
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
        </ToastPreview>
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('wolf_game_cancelled', {
              competition_name: 'Summer Cup',
              round_number: 3,
            })}
            onPress={() => {}}
          />
        </ToastPreview>
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('prize_pool_settled', {
              competition_name: 'Summer Cup',
              position: 2,
              position_text: '2nd',
              payout_amount: 150.00,
              currency: 'AUD',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// MESSAGE VARIATIONS
// ===========================================================================

export const WithAllData: Story = {
  args: {
    notification: createMockNotification('competition_player_added', {
      competition_name: 'Premium Golf Championship',
      added_by_name: 'Tournament Director',
    }),
  },
};

export const WithMinimalData: Story = {
  args: {
    notification: createMockNotification('competition_player_added', {}),
  },
};

export const MessageVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Competition Added - With All Data">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('competition_player_added', {
              competition_name: 'Summer League',
              added_by_name: 'John Admin',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Competition Added - Without Admin Name">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('competition_player_added', {
              competition_name: 'Winter Cup',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Competition Added - Without Competition Name">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('competition_player_added', {
              added_by_name: 'Admin',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Competition Added - Minimal">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('competition_player_added', {})}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Round Created - Full Data">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('new_round_created', {
              course_name: 'Metropolitan Golf Club',
              date: '20/02/2025',
              round_number: 4,
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Round Created - Course Only">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('new_round_created', {
              course_name: 'Huntingdale',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Round Created - Fallback">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('new_round_created', {})}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// STATUS CHANGE VARIATIONS
// ===========================================================================

export const StatusChangeVariations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Status: In Progress">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('competition_status_changed', {
              competition_name: 'Club Championship',
              new_status: 'in-progress',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Status: Completed">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('competition_status_changed', {
              competition_name: 'Monthly Medal',
              new_status: 'completed',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Status: Cancelled">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('competition_status_changed', {
              competition_name: 'Autumn Open',
              new_status: 'cancelled',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Status: Unknown">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('competition_status_changed', {
              competition_name: 'Test Event',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// FRIEND NOTIFICATIONS
// ===========================================================================

export const FriendNotifications: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Friend Request Received">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('friend_request_received', {
              requester_name: 'Pro Golfer',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Friend Request Received - No Name">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('friend_request_received', {})}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Friend Request Accepted">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('friend_request_accepted', {
              accepter_name: 'New Friend',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Friend Request Accepted - No Name">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('friend_request_accepted', {})}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// SOCIAL ROUND INVITATION VARIATIONS
// ===========================================================================

export const RoundInvitations: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="With Venue">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('social_round_invitation', {
              inviter_name: 'Golf Buddy',
              venue_name: 'Pebble Beach',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Without Venue">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('social_round_invitation', {
              inviter_name: 'John Smith',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Without Inviter">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('social_round_invitation', {
              venue_name: 'Local Course',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Minimal">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('social_round_invitation', {})}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// EDGE CASES
// ===========================================================================

export const LongNames: Story = {
  args: {
    notification: createMockNotification('competition_player_added', {
      competition_name:
        'The Very Long Named Annual Golf Championship Tournament Series 2024-2025',
      added_by_name: 'Christopher Alexander Johnson-Williams III',
    }),
  },
};

export const SpecialCharacters: Story = {
  args: {
    notification: createMockNotification('friend_request_received', {
      requester_name: "O'Brien & O'Malley",
    }),
  },
};

export const UnicodeCharacters: Story = {
  args: {
    notification: createMockNotification('competition_player_joined', {
      player_name: '田中太郎',
      competition_name: 'ゴルフ大会',
    }),
  },
};

export const WithEmoji: Story = {
  args: {
    notification: createMockNotification('social_round_invitation', {
      inviter_name: 'Golf Pro 🏌️',
      venue_name: 'Paradise Golf Club ⛳',
    }),
  },
};

export const EdgeCases: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Very Long Names">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('competition_player_added', {
              competition_name:
                'The Annual Golf Championship Tournament Series 2024-2025 Season',
              added_by_name: 'Tournament Director Smith',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Special Characters">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('friend_request_received', {
              requester_name: "O'Brien & Sons <Golf>",
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Unicode/International">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('competition_player_joined', {
              player_name: 'Müller',
              competition_name: 'Österreich Open',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="Emoji Content">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('new_round_created', {
              course_name: 'Paradise Golf ⛳',
              date: '01/01/2025',
              round_number: 1,
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTION STATES
// ===========================================================================

export const WithOnPress: Story = {
  args: {
    notification: createMockNotification('competition_player_added', {
      competition_name: 'Interactive Toast',
      added_by_name: 'Admin',
    }),
    onPress: () => console.log('Toast pressed - navigating...'),
  },
};

export const WithoutOnPress: Story = {
  args: {
    notification: createMockNotification('scorecard_submitted', {
      player_name: 'Player',
      date: '25/12/2024',
    }),
  },
};

// ===========================================================================
// READ STATE
// ===========================================================================

export const UnreadNotification: Story = {
  args: {
    notification: createMockNotification(
      'friend_request_received',
      { requester_name: 'New Friend' },
      { is_read: false, read_at: null }
    ),
  },
};

export const ReadNotification: Story = {
  args: {
    notification: createMockNotification(
      'friend_request_accepted',
      { accepter_name: 'Existing Friend' },
      { is_read: true, read_at: '2024-12-25T10:00:00Z' }
    ),
  },
};

// ===========================================================================
// DARK BACKGROUND PREVIEW
// ===========================================================================

export const OnDarkBackground: Story = {
  render: () => (
    <View style={{ flex: 1, backgroundColor: '#1a1a1a', padding: spacing.xl, paddingTop: 60 }}>
      <NotificationToastComponent
        notification={createMockNotification('competition_player_added', {
          competition_name: 'Night Tournament',
          added_by_name: 'Admin',
        })}
        onPress={() => console.log('Pressed')}
      />
    </View>
  ),
};

// ===========================================================================
// STACKED NOTIFICATIONS PREVIEW
// ===========================================================================

export const StackedToasts: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="Multiple Notifications">
        <View style={{ gap: spacing.sm }}>
          <NotificationToastComponent
            notification={createMockNotification('friend_request_received', {
              requester_name: 'John Doe',
            })}
            onPress={() => {}}
          />
          <NotificationToastComponent
            notification={createMockNotification('competition_player_added', {
              competition_name: 'Weekend Cup',
              added_by_name: 'Admin',
            })}
            onPress={() => {}}
          />
          <NotificationToastComponent
            notification={createMockNotification('scorecard_submitted', {
              player_name: 'Jane Smith',
              date: '25/12/2024',
            })}
            onPress={() => {}}
          />
        </View>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// ICON GALLERY
// ===========================================================================

export const AllIcons: Story = {
  render: () => (
    <StoryWrapper>
      <Section title="trophy-outline (Competition Added)">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('competition_player_added', {
              competition_name: 'Test',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="account-plus (Player Joined)">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('competition_player_joined', {
              player_name: 'Test',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="golf (New Round)">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('new_round_created', {
              course_name: 'Test Course',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="flag-checkered (Status Changed)">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('competition_status_changed', {
              competition_name: 'Test',
              new_status: 'completed',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="clipboard-check-outline (Scorecard Submitted)">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('scorecard_submitted', {
              player_name: 'Test Player',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="account-plus-outline (Friend Request Received)">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('friend_request_received', {
              requester_name: 'Test',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="account-check (Friend Request Accepted)">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('friend_request_accepted', {
              accepter_name: 'Test',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="golf-tee (Round Invitation)">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('social_round_invitation', {
              inviter_name: 'Test',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="cards-playing-outline (Skins Game)">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('skins_game_completed', {
              competition_name: 'Test',
              round_number: 1,
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="paw (Wolf Game)">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('wolf_game_completed', {
              competition_name: 'Test',
              round_number: 1,
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>

      <Section title="trophy (Prize Pool Settled)">
        <ToastPreview>
          <NotificationToastComponent
            notification={createMockNotification('prize_pool_settled', {
              competition_name: 'Test',
            })}
            onPress={() => {}}
          />
        </ToastPreview>
      </Section>
    </StoryWrapper>
  ),
};

// ===========================================================================
// INTERACTIVE PLAYGROUND
// ===========================================================================

export const Playground: Story = {
  args: {
    notification: createMockNotification('competition_player_added', {
      competition_name: 'Customize This Competition',
      added_by_name: 'Your Name',
    }),
    onPress: () => console.log('Toast pressed!'),
  },
};
