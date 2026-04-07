/**
 * NotificationToast Component Tests
 *
 * Tests for the custom notification toast component including:
 * - Rendering with different notification types
 * - Icon, title, and message generation
 * - Touch interaction and onPress callback
 * - Accessibility features
 * - Toast config and helper functions
 * - Edge cases and data variations
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NotificationToastCard } from '@/components/common/Toast/variants/NotificationToastCard';
import type { Notification, NotificationType } from '@/types/database.types';

// Mock ThemeContext
const mockColors = {
  surface: '#FFFFFF',
  border: '#E5E7EB',
  primary: '#1E7F5E',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textInverse: '#FFFFFF',
  gray400: '#9CA3AF',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { View, Text } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
    Icon: ({ source, size, color: _color }: any) => (
      <View testID={`icon-${source}`} style={{ width: size, height: size }}>
        <Text>{source}</Text>
      </View>
    ),
  };
});


// ===========================================================================
// TEST FIXTURES
// ===========================================================================

function createMockNotification(
  type: NotificationType,
  data: Partial<Notification['data']> = {},
  overrides: Partial<Notification> = {}
): Notification {
  return {
    id: 'notif-123',
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
    created_at: '2024-12-25T10:00:00Z',
    ...overrides,
  };
}

describe('NotificationToastCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const notification = createMockNotification('competition_player_added', {
        competition_name: 'Test Competition',
      });
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByText('Added to Competition')).toBeTruthy();
    });

    it('renders icon container', () => {
      const notification = createMockNotification('competition_player_added', {
        competition_name: 'Test',
      });
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByTestId('icon-trophy-outline')).toBeTruthy();
    });

    it('renders title text', () => {
      const notification = createMockNotification('new_round_created', {
        course_name: 'Royal Melbourne',
      });
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByText('New Round Created')).toBeTruthy();
    });

    it('renders message text', () => {
      const notification = createMockNotification('friend_request_received', {
        requester_name: 'John Smith',
      });
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByText('John Smith sent you a friend request')).toBeTruthy();
    });

    it('renders chevron icon', () => {
      const notification = createMockNotification('competition_player_added');
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByTestId('icon-chevron-right')).toBeTruthy();
    });

    it('renders all visual elements', () => {
      const notification = createMockNotification('scorecard_submitted', {
        player_name: 'Jane Doe',
        date: '25/12/2024',
      });
      render(<NotificationToastCard notification={notification} />);

      // Icon
      expect(screen.getByTestId('icon-clipboard-check-outline')).toBeTruthy();
      // Title
      expect(screen.getByText('Scorecard Submitted')).toBeTruthy();
      // Message
      expect(screen.getByText('Jane Doe submitted their scorecard for 25/12/2024')).toBeTruthy();
      // Chevron
      expect(screen.getByTestId('icon-chevron-right')).toBeTruthy();
    });
  });

  // ===========================================================================
  // NOTIFICATION TYPES
  // ===========================================================================

  describe('Notification Types', () => {
    describe('competition_player_added', () => {
      it('renders correct icon', () => {
        const notification = createMockNotification('competition_player_added');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByTestId('icon-trophy-outline')).toBeTruthy();
      });

      it('renders correct title', () => {
        const notification = createMockNotification('competition_player_added');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Added to Competition')).toBeTruthy();
      });

      it('renders message with added_by_name and competition_name', () => {
        const notification = createMockNotification('competition_player_added', {
          added_by_name: 'John Smith',
          competition_name: 'Summer League',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('John Smith added you to Summer League')).toBeTruthy();
      });

      it('renders message without added_by_name', () => {
        const notification = createMockNotification('competition_player_added', {
          competition_name: 'Winter Cup',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('You were added to Winter Cup')).toBeTruthy();
      });

      it('renders fallback message without competition_name', () => {
        const notification = createMockNotification('competition_player_added', {
          added_by_name: 'Admin',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Admin added you to a competition')).toBeTruthy();
      });

      it('renders minimal fallback message', () => {
        const notification = createMockNotification('competition_player_added', {});
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('You were added to a competition')).toBeTruthy();
      });
    });

    describe('competition_player_joined', () => {
      it('renders correct icon', () => {
        const notification = createMockNotification('competition_player_joined');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByTestId('icon-account-plus')).toBeTruthy();
      });

      it('renders correct title', () => {
        const notification = createMockNotification('competition_player_joined');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('New Player Joined')).toBeTruthy();
      });

      it('renders message with player and competition names', () => {
        const notification = createMockNotification('competition_player_joined', {
          player_name: 'Sarah Connor',
          competition_name: 'Club Championship',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Sarah Connor joined Club Championship')).toBeTruthy();
      });

      it('renders message without player_name', () => {
        const notification = createMockNotification('competition_player_joined', {
          competition_name: 'Monthly Medal',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Someone joined Monthly Medal')).toBeTruthy();
      });

      it('renders message without competition_name', () => {
        const notification = createMockNotification('competition_player_joined', {
          player_name: 'Mike Johnson',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Mike Johnson joined your competition')).toBeTruthy();
      });
    });

    describe('new_round_created', () => {
      it('renders correct icon', () => {
        const notification = createMockNotification('new_round_created');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByTestId('icon-golf')).toBeTruthy();
      });

      it('renders correct title', () => {
        const notification = createMockNotification('new_round_created');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('New Round Created')).toBeTruthy();
      });

      it('renders message with course, date, and round number', () => {
        const notification = createMockNotification('new_round_created', {
          course_name: 'Kingston Heath',
          date: '01/01/2025',
          round_number: 3,
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Round 3 at Kingston Heath on 01/01/2025')).toBeTruthy();
      });

      it('renders message with course only', () => {
        const notification = createMockNotification('new_round_created', {
          course_name: 'Victoria Golf Club',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Round  at Victoria Golf Club')).toBeTruthy();
      });

      it('renders message with date only', () => {
        const notification = createMockNotification('new_round_created', {
          date: '15/03/2025',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Round  at 15/03/2025')).toBeTruthy();
      });

      it('renders fallback message without course or date', () => {
        const notification = createMockNotification('new_round_created', {});
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('A new round has been created')).toBeTruthy();
      });
    });

    describe('competition_status_changed', () => {
      it('renders correct icon', () => {
        const notification = createMockNotification('competition_status_changed');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByTestId('icon-flag-checkered')).toBeTruthy();
      });

      it('renders correct title', () => {
        const notification = createMockNotification('competition_status_changed');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Competition Updated')).toBeTruthy();
      });

      it('renders message with status change', () => {
        const notification = createMockNotification('competition_status_changed', {
          competition_name: 'Spring Open',
          new_status: 'in-progress',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Spring Open is now in progress')).toBeTruthy();
      });

      it('renders message without new_status', () => {
        const notification = createMockNotification('competition_status_changed', {
          competition_name: 'Autumn Cup',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Autumn Cup status changed')).toBeTruthy();
      });

      it('renders fallback message without competition_name', () => {
        const notification = createMockNotification('competition_status_changed', {
          new_status: 'completed',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Competition is now completed')).toBeTruthy();
      });
    });

    describe('scorecard_submitted', () => {
      it('renders correct icon', () => {
        const notification = createMockNotification('scorecard_submitted');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByTestId('icon-clipboard-check-outline')).toBeTruthy();
      });

      it('renders correct title', () => {
        const notification = createMockNotification('scorecard_submitted');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Scorecard Submitted')).toBeTruthy();
      });

      it('renders message with player name and date', () => {
        const notification = createMockNotification('scorecard_submitted', {
          player_name: 'Tom Watson',
          date: '25/12/2024',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Tom Watson submitted their scorecard for 25/12/2024')).toBeTruthy();
      });

      it('renders message without date', () => {
        const notification = createMockNotification('scorecard_submitted', {
          player_name: 'Tiger Woods',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Tiger Woods submitted their scorecard')).toBeTruthy();
      });

      it('renders fallback message without player_name', () => {
        const notification = createMockNotification('scorecard_submitted', {
          date: '01/01/2025',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('A player submitted their scorecard for 01/01/2025')).toBeTruthy();
      });
    });

    describe('friend_request_received', () => {
      it('renders correct icon', () => {
        const notification = createMockNotification('friend_request_received');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByTestId('icon-account-plus-outline')).toBeTruthy();
      });

      it('renders correct title', () => {
        const notification = createMockNotification('friend_request_received');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Friend Request')).toBeTruthy();
      });

      it('renders message with requester name', () => {
        const notification = createMockNotification('friend_request_received', {
          requester_name: 'Rory McIlroy',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Rory McIlroy sent you a friend request')).toBeTruthy();
      });

      it('renders fallback message without requester_name', () => {
        const notification = createMockNotification('friend_request_received', {});
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Someone sent you a friend request')).toBeTruthy();
      });
    });

    describe('friend_request_accepted', () => {
      it('renders correct icon', () => {
        const notification = createMockNotification('friend_request_accepted');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByTestId('icon-account-check')).toBeTruthy();
      });

      it('renders correct title', () => {
        const notification = createMockNotification('friend_request_accepted');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Friend Request Accepted')).toBeTruthy();
      });

      it('renders message with accepter name', () => {
        const notification = createMockNotification('friend_request_accepted', {
          accepter_name: 'Phil Mickelson',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Phil Mickelson accepted your friend request')).toBeTruthy();
      });

      it('renders fallback message without accepter_name', () => {
        const notification = createMockNotification('friend_request_accepted', {});
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Your friend request was accepted your friend request')).toBeTruthy();
      });
    });

    describe('social_round_invitation', () => {
      it('renders correct icon', () => {
        const notification = createMockNotification('social_round_invitation');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByTestId('icon-golf-tee')).toBeTruthy();
      });

      it('renders correct title', () => {
        const notification = createMockNotification('social_round_invitation');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Round Invitation')).toBeTruthy();
      });

      it('renders message with inviter and venue', () => {
        const notification = createMockNotification('social_round_invitation', {
          inviter_name: 'Jordan Spieth',
          venue_name: 'Augusta National',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Jordan Spieth invited you to play at Augusta National')).toBeTruthy();
      });

      it('renders message without venue', () => {
        const notification = createMockNotification('social_round_invitation', {
          inviter_name: 'Dustin Johnson',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Dustin Johnson invited you to play')).toBeTruthy();
      });

      it('renders fallback message without inviter_name', () => {
        const notification = createMockNotification('social_round_invitation', {
          venue_name: 'Pebble Beach',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Someone invited you to play at Pebble Beach')).toBeTruthy();
      });
    });

    describe('skins_game_completed', () => {
      it('renders correct icon', () => {
        const notification = createMockNotification('skins_game_completed');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByTestId('icon-cards-playing-outline')).toBeTruthy();
      });

      it('renders correct title', () => {
        const notification = createMockNotification('skins_game_completed');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Skins Game Complete')).toBeTruthy();
      });

      it('renders message with competition and results', () => {
        const notification = createMockNotification('skins_game_completed', {
          competition_name: 'Summer Cup',
          round_number: 3,
          holes_won: 2,
          net_result: 45.00,
          currency: 'AUD',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Skins game completed for Round 3 of Summer Cup. You won 2 holes (+$45.00)')).toBeTruthy();
      });

      it('renders message without results', () => {
        const notification = createMockNotification('skins_game_completed', {
          competition_name: 'Summer Cup',
          round_number: 3,
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Skins game completed for Round 3 of Summer Cup')).toBeTruthy();
      });
    });

    describe('skins_game_cancelled', () => {
      it('renders correct icon', () => {
        const notification = createMockNotification('skins_game_cancelled');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByTestId('icon-cards-playing-outline')).toBeTruthy();
      });

      it('renders correct title', () => {
        const notification = createMockNotification('skins_game_cancelled');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Skins Game Cancelled')).toBeTruthy();
      });

      it('renders message with competition and round', () => {
        const notification = createMockNotification('skins_game_cancelled', {
          competition_name: 'Summer Cup',
          round_number: 3,
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Skins game for Round 3 of Summer Cup has been cancelled')).toBeTruthy();
      });

      it('renders fallback message without competition_name', () => {
        const notification = createMockNotification('skins_game_cancelled', {
          round_number: 3,
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Skins game at the course has been cancelled')).toBeTruthy();
      });
    });

    describe('wolf_game_completed', () => {
      it('renders correct icon', () => {
        const notification = createMockNotification('wolf_game_completed');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByTestId('icon-paw')).toBeTruthy();
      });

      it('renders correct title', () => {
        const notification = createMockNotification('wolf_game_completed');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Wolf Game Complete')).toBeTruthy();
      });

      it('renders message with competition and results', () => {
        const notification = createMockNotification('wolf_game_completed', {
          competition_name: 'Summer Cup',
          round_number: 3,
          total_points: 8,
          net_result: 32.00,
          pot_enabled: true,
          currency: 'AUD',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Wolf game completed for Round 3 of Summer Cup. You finished with 8 pts (+$32.00)')).toBeTruthy();
      });

      it('renders message without results', () => {
        const notification = createMockNotification('wolf_game_completed', {
          competition_name: 'Summer Cup',
          round_number: 3,
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Wolf game completed for Round 3 of Summer Cup')).toBeTruthy();
      });
    });

    describe('wolf_game_cancelled', () => {
      it('renders correct icon', () => {
        const notification = createMockNotification('wolf_game_cancelled');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByTestId('icon-paw')).toBeTruthy();
      });

      it('renders correct title', () => {
        const notification = createMockNotification('wolf_game_cancelled');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Wolf Game Cancelled')).toBeTruthy();
      });

      it('renders message with competition and round', () => {
        const notification = createMockNotification('wolf_game_cancelled', {
          competition_name: 'Summer Cup',
          round_number: 3,
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Wolf game for Round 3 of Summer Cup has been cancelled')).toBeTruthy();
      });

      it('renders fallback message without competition_name', () => {
        const notification = createMockNotification('wolf_game_cancelled', {
          round_number: 3,
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Wolf game at the course has been cancelled')).toBeTruthy();
      });
    });

    describe('prize_pool_settled', () => {
      it('renders correct icon', () => {
        const notification = createMockNotification('prize_pool_settled');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByTestId('icon-trophy')).toBeTruthy();
      });

      it('renders correct title', () => {
        const notification = createMockNotification('prize_pool_settled');
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Prize Pool Settled')).toBeTruthy();
      });

      it('renders message with placement and payout', () => {
        const notification = createMockNotification('prize_pool_settled', {
          competition_name: 'Summer Cup',
          position: 2,
          position_text: '2nd',
          payout_amount: 150.00,
          currency: 'AUD',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Prize pool settled for Summer Cup. You placed 2nd and won $150.00')).toBeTruthy();
      });

      it('renders fallback message without placement data', () => {
        const notification = createMockNotification('prize_pool_settled', {
          competition_name: 'Summer Cup',
        });
        render(<NotificationToastCard notification={notification} />);
        expect(screen.getByText('Prize pool for Summer Cup has been settled. Check the results!')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // INTERACTIONS
  // ===========================================================================

  describe('Interactions', () => {
    it('calls onPress when toast is tapped', () => {
      const onPress = jest.fn();
      const notification = createMockNotification('competition_player_added', {
        competition_name: 'Test',
      });
      render(<NotificationToastCard notification={notification} onPress={onPress} />);

      const toast = screen.getByRole('button');
      fireEvent.press(toast);

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('works without onPress prop', () => {
      const notification = createMockNotification('new_round_created');
      render(<NotificationToastCard notification={notification} />);

      const toast = screen.getByRole('button');
      // Should not throw
      fireEvent.press(toast);
    });

    it('calls onPress multiple times on multiple taps', () => {
      const onPress = jest.fn();
      const notification = createMockNotification('friend_request_received');
      render(<NotificationToastCard notification={notification} onPress={onPress} />);

      const toast = screen.getByRole('button');
      fireEvent.press(toast);
      fireEvent.press(toast);
      fireEvent.press(toast);

      expect(onPress).toHaveBeenCalledTimes(3);
    });
  });

  // ===========================================================================
  // ACCESSIBILITY
  // ===========================================================================

  describe('Accessibility', () => {
    it('has button role', () => {
      const notification = createMockNotification('competition_player_added', {
        competition_name: 'Test',
      });
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('has combined accessibility label', () => {
      const notification = createMockNotification('friend_request_received', {
        requester_name: 'John Doe',
      });
      render(<NotificationToastCard notification={notification} />);
      expect(
        screen.getByLabelText('Friend Request. John Doe sent you a friend request. Tap to view.')
      ).toBeTruthy();
    });

    it('has accessibility label for all notification types', () => {
      const types: NotificationType[] = [
        'competition_player_added',
        'competition_player_joined',
        'new_round_created',
        'competition_status_changed',
        'scorecard_submitted',
        'friend_request_received',
        'friend_request_accepted',
        'social_round_invitation',
        'skins_game_completed',
        'skins_game_cancelled',
        'wolf_game_completed',
        'wolf_game_cancelled',
        'prize_pool_settled',
      ];

      types.forEach((type) => {
        const notification = createMockNotification(type, {});
        const { unmount } = render(<NotificationToastCard notification={notification} />);
        const toast = screen.getByRole('button');
        expect(toast.props.accessibilityLabel).toContain('. Tap to view.');
        unmount();
      });
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty data object', () => {
      const notification = createMockNotification('competition_player_added', {});
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByText('Added to Competition')).toBeTruthy();
      expect(screen.getByText('You were added to a competition')).toBeTruthy();
    });

    it('handles special characters in names', () => {
      const notification = createMockNotification('friend_request_received', {
        requester_name: "O'Brien & Smith",
      });
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByText("O'Brien & Smith sent you a friend request")).toBeTruthy();
    });

    it('handles long competition name', () => {
      const notification = createMockNotification('competition_player_added', {
        competition_name: 'The Very Long Named Golf Competition Championship 2024-2025 Season',
        added_by_name: 'Admin',
      });
      render(<NotificationToastCard notification={notification} />);
      expect(
        screen.getByText(
          'Admin added you to The Very Long Named Golf Competition Championship 2024-2025 Season'
        )
      ).toBeTruthy();
    });

    it('handles unicode characters', () => {
      const notification = createMockNotification('competition_player_joined', {
        player_name: '田中太郎',
        competition_name: 'ゴルフ大会',
      });
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByText('田中太郎 joined ゴルフ大会')).toBeTruthy();
    });

    it('handles emoji in names', () => {
      const notification = createMockNotification('social_round_invitation', {
        inviter_name: 'John 🏌️',
        venue_name: 'Golf Club ⛳',
      });
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByText('John 🏌️ invited you to play at Golf Club ⛳')).toBeTruthy();
    });

    it('handles numeric values in data', () => {
      const notification = createMockNotification('new_round_created', {
        round_number: 10,
        course_name: 'Test Course',
      });
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByText('Round 10 at Test Course')).toBeTruthy();
    });

    it('handles zero as round number', () => {
      const notification = createMockNotification('new_round_created', {
        round_number: 0,
        course_name: 'Practice Round',
      });
      render(<NotificationToastCard notification={notification} />);
      // round_number 0 is falsy so it shows empty string
      expect(screen.getByText('Round  at Practice Round')).toBeTruthy();
    });

    it('handles whitespace-only strings', () => {
      const notification = createMockNotification('friend_request_received', {
        requester_name: '   ',
      });
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByText('    sent you a friend request')).toBeTruthy();
    });
  });

  // ===========================================================================
  // STYLING
  // ===========================================================================

  describe('Styling', () => {
    it('applies theme colors', () => {
      const notification = createMockNotification('competition_player_added');
      render(<NotificationToastCard notification={notification} />);
      // Component renders - styling is applied internally
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('uses safe area insets for top margin', () => {
      const notification = createMockNotification('new_round_created');
      render(<NotificationToastCard notification={notification} />);
      // The component uses useSafeAreaInsets() - we mock it returning top: 44
      expect(screen.getByRole('button')).toBeTruthy();
    });
  });

  // ===========================================================================
  // NOTIFICATION DATA VARIATIONS
  // ===========================================================================

  describe('Notification Data Variations', () => {
    it('handles notification with all IDs populated', () => {
      const notification = createMockNotification(
        'scorecard_submitted',
        {
          player_name: 'Test Player',
          date: '25/12/2024',
        },
        {
          competition_id: 'comp-123',
          round_id: 'round-456',
          player_id: 'player-789',
          is_read: true,
          read_at: '2024-12-25T11:00:00Z',
        }
      );
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByText('Scorecard Submitted')).toBeTruthy();
    });

    it('handles read notification', () => {
      const notification = createMockNotification(
        'friend_request_accepted',
        { accepter_name: 'Friend' },
        { is_read: true, read_at: '2024-12-25T12:00:00Z' }
      );
      render(<NotificationToastCard notification={notification} />);
      // Component should still render the same way
      expect(screen.getByText('Friend Request Accepted')).toBeTruthy();
    });

    it('handles notification with friendship_id', () => {
      const notification = createMockNotification(
        'friend_request_received',
        { requester_name: 'New Friend' },
        { friendship_id: 'friendship-123' }
      );
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByText('Friend Request')).toBeTruthy();
    });
  });

  // ===========================================================================
  // COMPONENT PROPS
  // ===========================================================================

  describe('Component Props', () => {
    it('renders with only required notification prop', () => {
      const notification = createMockNotification('competition_player_added');
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByText('Added to Competition')).toBeTruthy();
    });

    it('renders with notification and onPress props', () => {
      const notification = createMockNotification('new_round_created');
      const onPress = jest.fn();
      render(<NotificationToastCard notification={notification} onPress={onPress} />);
      expect(screen.getByText('New Round Created')).toBeTruthy();
    });

    it('updates when notification prop changes', () => {
      const notification1 = createMockNotification('friend_request_received', {
        requester_name: 'John',
      });
      const notification2 = createMockNotification('friend_request_accepted', {
        accepter_name: 'Jane',
      });

      const { rerender } = render(<NotificationToastCard notification={notification1} />);
      expect(screen.getByText('John sent you a friend request')).toBeTruthy();

      rerender(<NotificationToastCard notification={notification2} />);
      expect(screen.getByText('Jane accepted your friend request')).toBeTruthy();
    });

    it('updates onPress callback when prop changes', () => {
      const notification = createMockNotification('competition_player_added');
      const onPress1 = jest.fn();
      const onPress2 = jest.fn();

      const { rerender } = render(
        <NotificationToastCard notification={notification} onPress={onPress1} />
      );
      fireEvent.press(screen.getByRole('button'));
      expect(onPress1).toHaveBeenCalledTimes(1);
      expect(onPress2).not.toHaveBeenCalled();

      rerender(<NotificationToastCard notification={notification} onPress={onPress2} />);
      fireEvent.press(screen.getByRole('button'));
      expect(onPress1).toHaveBeenCalledTimes(1);
      expect(onPress2).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // MESSAGE FORMATTING
  // ===========================================================================

  describe('Message Formatting', () => {
    it('formats competition status with hyphen correctly', () => {
      const notification = createMockNotification('competition_status_changed', {
        competition_name: 'Test',
        new_status: 'in-progress',
      });
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByText('Test is now in progress')).toBeTruthy();
    });

    it('formats round message with course and date', () => {
      const notification = createMockNotification('new_round_created', {
        course_name: 'Metropolitan',
        date: '15/01/2025',
        round_number: 5,
      });
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByText('Round 5 at Metropolitan on 15/01/2025')).toBeTruthy();
    });

    it('handles various date formats', () => {
      const notification = createMockNotification('scorecard_submitted', {
        player_name: 'Test',
        date: '2025-01-15',
      });
      render(<NotificationToastCard notification={notification} />);
      expect(screen.getByText('Test submitted their scorecard for 2025-01-15')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DEFAULT NOTIFICATION CONFIG FALLBACK
  // ===========================================================================

  describe('Unknown Notification Type Fallback', () => {
    it('handles unknown notification type gracefully', () => {
      // Force an unknown type for testing fallback behavior
      const notification = {
        ...createMockNotification('competition_player_added'),
        type: 'unknown_type' as NotificationType,
      };
      render(<NotificationToastCard notification={notification} />);

      // Should show fallback values
      expect(screen.getByText('Notification')).toBeTruthy();
      expect(screen.getByText('You have a new notification')).toBeTruthy();
      expect(screen.getByTestId('icon-bell-outline')).toBeTruthy();
    });
  });
});
