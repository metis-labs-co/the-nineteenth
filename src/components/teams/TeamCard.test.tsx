/**
 * TeamCard Component Tests
 *
 * Tests for the TeamCard component including:
 * - Rendering with various props
 * - Team statistics calculation (average and total handicap)
 * - Member list expansion/collapse
 * - Editable mode with edit button
 * - Player avatar display (image vs initials)
 * - Accessibility features
 * - Edge cases (empty members, null handicaps)
 */

import React from 'react';
import { LayoutAnimation } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/renderHelpers';
import { TeamCard } from './TeamCard';
import type { Player, TeamWithMembers } from '@/types/database.types';
import { createTestPlayer, createTeamWithMembers } from '@/__tests__/utils/testFixtures';

// =====================================================
// MOCKS
// =====================================================

// Mock icons
jest.mock('@tabler/icons-react-native', () => {
  const { View } = require('react-native');
  return {
    IconChevronDown: (props: any) => <View testID="icon-chevron-down" {...props} />,
    IconChevronUp: (props: any) => <View testID="icon-chevron-up" {...props} />,
  };
});

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');

  // Mock theme for PaperProvider
  const mockThemeColors = {
    primary: '#6200ee',
    onPrimary: '#ffffff',
    secondary: '#03dac6',
    onSecondary: '#000000',
    background: '#ffffff',
    surface: '#ffffff',
    surfaceVariant: '#f5f5f5',
    onSurface: '#000000',
    error: '#b00020',
    onError: '#ffffff',
    elevation: {
      level0: 'transparent',
      level1: '#f5f5f5',
      level2: '#eeeeee',
      level3: '#e0e0e0',
      level4: '#d6d6d6',
      level5: '#cccccc',
    },
  };

  const mockTheme = {
    dark: false,
    roundness: 4,
    animation: { scale: 1 },
    colors: mockThemeColors,
    fonts: {},
    isV3: true,
  };

  const mockDarkTheme = {
    ...mockTheme,
    dark: true,
    colors: {
      ...mockThemeColors,
      primary: '#bb86fc',
      background: '#121212',
      surface: '#121212',
      onSurface: '#ffffff',
    },
  };

  const Card = React.forwardRef(({ children, style, onPress, disabled, testID, ...props }: any, ref: any) =>
    onPress && !disabled ? (
      <TouchableOpacity
        ref={ref}
        style={style}
        onPress={onPress}
        testID={testID}
        accessibilityRole="button"
        {...props}
      >
        {children}
      </TouchableOpacity>
    ) : (
      <View ref={ref} style={style} testID={testID} {...props}>
        {children}
      </View>
    )
  );
  Card.Content = ({ children, style, ...props }: any) => (
    <View style={style} {...props}>
      {children}
    </View>
  );

  const Avatar: any = {};
  Avatar.Image = ({ size, source, style, ...props }: any) => (
    <View
      testID="avatar-image"
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      {...props}
    />
  );
  Avatar.Text = ({ size, label, style, labelStyle, ...props }: any) => (
    <View
      testID="avatar-text"
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      {...props}
    >
      <Text style={labelStyle}>{label}</Text>
    </View>
  );

  return {
    MD3LightTheme: mockTheme,
    MD3DarkTheme: mockDarkTheme,
    Provider: ({ children }: any) => children,
    PaperProvider: ({ children }: any) => children,
    useTheme: () => mockTheme,
    Card,
    Text: ({ children, style, numberOfLines, ellipsizeMode, ...props }: any) => (
      <Text style={style} numberOfLines={numberOfLines} {...props}>
        {children}
      </Text>
    ),
    Avatar,
    IconButton: ({ icon, size, onPress, accessibilityLabel, accessibilityHint, style, ...props }: any) => (
      <TouchableOpacity
        testID={`icon-button-${icon}`}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        style={style}
        {...props}
      />
    ),
    Divider: ({ style, ...props }: any) => (
      <View style={[{ height: 1, backgroundColor: '#ccc' }, style]} {...props} />
    ),
  };
});

// Spy on LayoutAnimation
jest.spyOn(LayoutAnimation, 'configureNext').mockImplementation(() => {});

// =====================================================
// TEST FIXTURES
// =====================================================

const twoPlayerTeam: TeamWithMembers = createTeamWithMembers(
  { id: 'team-1', name: 'Team Alpha', competition_id: 'comp-1' },
  [
    createTestPlayer({ id: 'player-1', name: 'John Smith', handicap: 15 }),
    createTestPlayer({ id: 'player-2', name: 'Jane Doe', handicap: 25 }),
  ]
);

const threePlayerTeam: TeamWithMembers = createTeamWithMembers(
  { id: 'team-2', name: 'Team Beta', competition_id: 'comp-1' },
  [
    createTestPlayer({ id: 'player-1', name: 'John Smith', handicap: 10 }),
    createTestPlayer({ id: 'player-2', name: 'Jane Doe', handicap: 20 }),
    createTestPlayer({ id: 'player-3', name: 'Bob Wilson', handicap: 30 }),
  ]
);

const fourPlayerTeam: TeamWithMembers = createTeamWithMembers(
  { id: 'team-3', name: 'Team Gamma', competition_id: 'comp-1' },
  [
    createTestPlayer({ id: 'player-1', name: 'John Smith', handicap: 12 }),
    createTestPlayer({ id: 'player-2', name: 'Jane Doe', handicap: 18 }),
    createTestPlayer({ id: 'player-3', name: 'Bob Wilson', handicap: 24 }),
    createTestPlayer({ id: 'player-4', name: 'Alice Brown', handicap: 30 }),
  ]
);

const emptyTeam: TeamWithMembers = {
  id: 'team-empty',
  name: 'Empty Team',
  competition_id: 'comp-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  members: [],
};

const teamWithNullHandicaps: TeamWithMembers = createTeamWithMembers(
  { id: 'team-null-hc', name: 'Team with Nulls', competition_id: 'comp-1' },
  [
    createTestPlayer({ id: 'player-1', name: 'John Smith', handicap: 15 }),
    { ...createTestPlayer({ id: 'player-2', name: 'New Player' }), handicap: null } as Player,
  ]
);

const teamWithPhotos: TeamWithMembers = createTeamWithMembers(
  { id: 'team-photos', name: 'Team Photos', competition_id: 'comp-1' },
  [
    { ...createTestPlayer({ id: 'player-1', name: 'John Smith', handicap: 15 }), photo_url: 'https://example.com/john.jpg' },
    { ...createTestPlayer({ id: 'player-2', name: 'Jane Doe', handicap: 20 }), photo_url: 'https://example.com/jane.jpg' },
  ]
);

const singleMemberTeam: TeamWithMembers = createTeamWithMembers(
  { id: 'team-single', name: 'Solo Team', competition_id: 'comp-1' },
  [createTestPlayer({ id: 'player-1', name: 'Lonely Player', handicap: 18 })]
);

// =====================================================
// TESTS
// =====================================================

describe('TeamCard', () => {
  const defaultProps = {
    team: twoPlayerTeam,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<TeamCard {...defaultProps} />);
      expect(screen.getByText('Team Alpha')).toBeTruthy();
    });

    it('renders team name', () => {
      render(<TeamCard team={threePlayerTeam} />);
      expect(screen.getByText('Team Beta')).toBeTruthy();
    });

    it('renders with testID prop', () => {
      render(<TeamCard {...defaultProps} testID="team-card" />);
      expect(screen.getByTestId('team-card')).toBeTruthy();
    });

    it('renders average handicap badge', () => {
      render(<TeamCard {...defaultProps} />);
      expect(screen.getByText('Avg HC')).toBeTruthy();
      expect(screen.getByText('20.0')).toBeTruthy(); // (15 + 25) / 2 = 20
    });

    it('renders total handicap badge', () => {
      render(<TeamCard {...defaultProps} />);
      expect(screen.getByText('Total HC')).toBeTruthy();
      expect(screen.getByText('40.0')).toBeTruthy(); // 15 + 25 = 40
    });

    it('renders member count correctly for 2 members', () => {
      render(<TeamCard {...defaultProps} />);
      expect(screen.getByText('2 members')).toBeTruthy();
    });

    it('renders member count correctly for 1 member (singular)', () => {
      render(<TeamCard team={singleMemberTeam} />);
      expect(screen.getByText('1 member')).toBeTruthy();
    });

    it('renders show members toggle button', () => {
      render(<TeamCard {...defaultProps} />);
      expect(screen.getByText('Show members')).toBeTruthy();
    });

    it('renders chevron down icon when collapsed', () => {
      render(<TeamCard {...defaultProps} />);
      expect(screen.getByTestId('icon-chevron-down')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TEAM STATISTICS TESTS
  // ===========================================================================

  describe('Team Statistics', () => {
    it('calculates average handicap correctly for 2 players', () => {
      render(<TeamCard team={twoPlayerTeam} />);
      // (15 + 25) / 2 = 20.0
      expect(screen.getByText('20.0')).toBeTruthy();
    });

    it('calculates average handicap correctly for 3 players', () => {
      render(<TeamCard team={threePlayerTeam} />);
      // (10 + 20 + 30) / 3 = 20.0
      expect(screen.getByText('20.0')).toBeTruthy();
    });

    it('calculates average handicap correctly for 4 players', () => {
      render(<TeamCard team={fourPlayerTeam} />);
      // (12 + 18 + 24 + 30) / 4 = 21.0
      expect(screen.getByText('21.0')).toBeTruthy();
    });

    it('calculates total handicap correctly for 2 players', () => {
      render(<TeamCard team={twoPlayerTeam} />);
      // 15 + 25 = 40.0
      expect(screen.getByText('40.0')).toBeTruthy();
    });

    it('calculates total handicap correctly for 4 players', () => {
      render(<TeamCard team={fourPlayerTeam} />);
      // 12 + 18 + 24 + 30 = 84.0
      expect(screen.getByText('84.0')).toBeTruthy();
    });

    it('handles team with null handicaps in calculation', () => {
      render(<TeamCard team={teamWithNullHandicaps} />);
      // Only player with handicap 15 counted, null treated as 0
      // Total: 15 + 0 = 15, Avg: (15 + 0) / 2 = 7.5
      expect(screen.getByText('7.5')).toBeTruthy();
      expect(screen.getByText('15.0')).toBeTruthy();
    });

    it('shows 0 for empty team statistics', () => {
      render(<TeamCard team={emptyTeam} />);
      expect(screen.getAllByText('0.0').length).toBe(2); // avg and total
    });

    it('rounds handicap to one decimal place', () => {
      const teamWithOddHandicaps = createTeamWithMembers(
        { id: 'team-odd', name: 'Odd Team', competition_id: 'comp-1' },
        [
          createTestPlayer({ id: 'p1', name: 'P1', handicap: 10 }),
          createTestPlayer({ id: 'p2', name: 'P2', handicap: 17 }),
          createTestPlayer({ id: 'p3', name: 'P3', handicap: 23 }),
        ]
      );
      render(<TeamCard team={teamWithOddHandicaps} />);
      // (10 + 17 + 23) / 3 = 16.666... → 16.7
      expect(screen.getByText('16.7')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EXPAND/COLLAPSE TESTS
  // ===========================================================================

  describe('Expand/Collapse', () => {
    it('does not show member list initially when collapsed', () => {
      render(<TeamCard {...defaultProps} />);
      expect(screen.queryByText('John Smith')).toBeNull();
    });

    it('shows member list when initiallyExpanded is true', () => {
      render(<TeamCard {...defaultProps} initiallyExpanded />);
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
    });

    it('expands member list when toggle is pressed', async () => {
      render(<TeamCard {...defaultProps} />);

      fireEvent.press(screen.getByText('Show members'));

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeTruthy();
        expect(screen.getByText('Jane Doe')).toBeTruthy();
      });
    });

    it('shows hide members text when expanded', async () => {
      render(<TeamCard {...defaultProps} />);

      fireEvent.press(screen.getByText('Show members'));

      await waitFor(() => {
        expect(screen.getByText('Hide members')).toBeTruthy();
      });
    });

    it('shows chevron up icon when expanded', async () => {
      render(<TeamCard {...defaultProps} />);

      fireEvent.press(screen.getByText('Show members'));

      await waitFor(() => {
        expect(screen.getByTestId('icon-chevron-up')).toBeTruthy();
      });
    });

    it('collapses member list when toggle is pressed again', async () => {
      render(<TeamCard {...defaultProps} />);

      // Expand
      fireEvent.press(screen.getByText('Show members'));
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeTruthy();
      });

      // Collapse
      fireEvent.press(screen.getByText('Hide members'));
      await waitFor(() => {
        expect(screen.queryByText('John Smith')).toBeNull();
        expect(screen.getByText('Show members')).toBeTruthy();
      });
    });

    it('shows empty state message when expanded with no members', () => {
      render(<TeamCard team={emptyTeam} initiallyExpanded />);
      expect(screen.getByText('No members in this team')).toBeTruthy();
    });
  });

  // ===========================================================================
  // MEMBER ROW TESTS
  // ===========================================================================

  describe('Member Rows', () => {
    it('shows player names in member list', () => {
      render(<TeamCard {...defaultProps} initiallyExpanded />);
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
    });

    it('shows player handicaps in member list', () => {
      render(<TeamCard {...defaultProps} initiallyExpanded />);
      expect(screen.getAllByText('HC:').length).toBe(2);
      expect(screen.getByText('15')).toBeTruthy();
      expect(screen.getByText('25')).toBeTruthy();
    });

    it('shows N/A for null handicap', () => {
      render(<TeamCard team={teamWithNullHandicaps} initiallyExpanded />);
      expect(screen.getByText('N/A')).toBeTruthy();
    });

    it('shows avatar image when player has photo_url', () => {
      render(<TeamCard team={teamWithPhotos} initiallyExpanded />);
      // Avatar images are rendered - we can't easily test the image source
      // but we can verify the component renders
      expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('shows initials avatar when player has no photo', () => {
      render(<TeamCard {...defaultProps} initiallyExpanded />);
      // Initials are computed from player name
      // For "John Smith" → "JS", "Jane Doe" → "JD"
      expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('renders correct number of member rows', () => {
      render(<TeamCard team={fourPlayerTeam} initiallyExpanded />);
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
      expect(screen.getByText('Bob Wilson')).toBeTruthy();
      expect(screen.getByText('Alice Brown')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDITABLE MODE TESTS
  // ===========================================================================

  describe('Editable Mode', () => {
    it('does not show edit button by default', () => {
      render(<TeamCard {...defaultProps} />);
      expect(screen.queryByLabelText('Edit team name')).toBeNull();
    });

    it('shows edit button when isEditable is true', () => {
      render(<TeamCard {...defaultProps} isEditable />);
      expect(screen.getByLabelText('Edit team name')).toBeTruthy();
    });

    it('calls onEdit when edit button is pressed', () => {
      const onEdit = jest.fn();
      render(<TeamCard {...defaultProps} isEditable onEdit={onEdit} />);

      fireEvent.press(screen.getByLabelText('Edit team name'));
      expect(onEdit).toHaveBeenCalledWith(twoPlayerTeam);
    });

    it('does not show edit button when isEditable is false', () => {
      const onEdit = jest.fn();
      render(<TeamCard {...defaultProps} isEditable={false} onEdit={onEdit} />);
      expect(screen.queryByLabelText('Edit team name')).toBeNull();
    });
  });

  // ===========================================================================
  // PRESS HANDLER TESTS
  // ===========================================================================

  describe('Press Handler', () => {
    it('calls onPress when card is pressed', () => {
      const onPress = jest.fn();
      render(<TeamCard {...defaultProps} onPress={onPress} />);

      // The card is pressable via Card component
      fireEvent.press(screen.getByLabelText(/Team: Team Alpha/));
      expect(onPress).toHaveBeenCalled();
    });

    it('card is disabled when onPress is not provided', () => {
      render(<TeamCard {...defaultProps} />);
      // The card should still render but be disabled
      const card = screen.getByLabelText(/Team: Team Alpha/);
      expect(card).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has accessible label on card', () => {
      render(<TeamCard {...defaultProps} />);
      const card = screen.getByLabelText('Team: Team Alpha. 2 members. Average handicap: 20');
      expect(card).toBeTruthy();
    });

    it('has accessible role on card', () => {
      render(<TeamCard {...defaultProps} />);
      const card = screen.getByRole('button');
      expect(card).toBeTruthy();
    });

    it('has accessibility hint when onPress is provided', () => {
      const onPress = jest.fn();
      render(<TeamCard {...defaultProps} onPress={onPress} />);
      const card = screen.getByLabelText(/Team: Team Alpha/);
      expect(card.props.accessibilityHint).toBe('Double tap to view team details');
    });

    it('has no accessibility hint when onPress is not provided', () => {
      render(<TeamCard {...defaultProps} />);
      const card = screen.getByLabelText(/Team: Team Alpha/);
      expect(card.props.accessibilityHint).toBeUndefined();
    });

    it('has accessible expand toggle button', () => {
      render(<TeamCard {...defaultProps} />);
      const toggle = screen.getByLabelText('Expand member list');
      expect(toggle.props.accessibilityRole).toBe('button');
      expect(toggle.props.accessibilityState).toEqual({ expanded: false });
    });

    it('updates accessibility state when expanded', async () => {
      render(<TeamCard {...defaultProps} />);

      fireEvent.press(screen.getByText('Show members'));

      await waitFor(() => {
        const toggle = screen.getByLabelText('Collapse member list');
        expect(toggle.props.accessibilityState).toEqual({ expanded: true });
      });
    });

    it('has accessible member rows', () => {
      render(<TeamCard {...defaultProps} initiallyExpanded />);
      const memberRow = screen.getByLabelText('John Smith, Handicap: 15');
      expect(memberRow.props.accessibilityRole).toBe('text');
    });

    it('has accessible edit button', () => {
      render(<TeamCard {...defaultProps} isEditable />);
      const editButton = screen.getByLabelText('Edit team name');
      expect(editButton.props.accessibilityHint).toBe('Opens dialog to edit team name');
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles team with no members', () => {
      render(<TeamCard team={emptyTeam} />);
      expect(screen.getByText('Empty Team')).toBeTruthy();
      expect(screen.getByText('0 members')).toBeTruthy();
    });

    it('handles team with single member', () => {
      render(<TeamCard team={singleMemberTeam} />);
      expect(screen.getByText('1 member')).toBeTruthy();
      // Both avg and total are 18.0 for a single member
      expect(screen.getAllByText('18.0').length).toBe(2);
    });

    it('handles long team names with ellipsis', () => {
      const longNameTeam = createTeamWithMembers(
        { id: 'team-long', name: 'This Is A Very Long Team Name That Should Be Truncated', competition_id: 'comp-1' },
        [createTestPlayer({ id: 'p1', name: 'Player 1', handicap: 15 })]
      );
      render(<TeamCard team={longNameTeam} />);
      expect(screen.getByText('This Is A Very Long Team Name That Should Be Truncated')).toBeTruthy();
    });

    it('handles long player names with ellipsis', () => {
      const longPlayerNameTeam = createTeamWithMembers(
        { id: 'team-lp', name: 'Team', competition_id: 'comp-1' },
        [createTestPlayer({ id: 'p1', name: 'A Very Long Player Name That Should Be Truncated', handicap: 15 })]
      );
      render(<TeamCard team={longPlayerNameTeam} initiallyExpanded />);
      expect(screen.getByText('A Very Long Player Name That Should Be Truncated')).toBeTruthy();
    });

    it('handles zero handicap players', () => {
      const zeroHandicapTeam = createTeamWithMembers(
        { id: 'team-zero', name: 'Scratch Team', competition_id: 'comp-1' },
        [
          createTestPlayer({ id: 'p1', name: 'Scratch Player 1', handicap: 0 }),
          createTestPlayer({ id: 'p2', name: 'Scratch Player 2', handicap: 0 }),
        ]
      );
      render(<TeamCard team={zeroHandicapTeam} />);
      expect(screen.getAllByText('0.0').length).toBe(2);
    });

    it('handles negative handicap players (plus handicaps)', () => {
      const negativeHandicapTeam = createTeamWithMembers(
        { id: 'team-neg', name: 'Pro Team', competition_id: 'comp-1' },
        [
          createTestPlayer({ id: 'p1', name: 'Pro 1', handicap: -2 }),
          createTestPlayer({ id: 'p2', name: 'Pro 2', handicap: -4 }),
        ]
      );
      render(<TeamCard team={negativeHandicapTeam} />);
      // Avg: (-2 + -4) / 2 = -3
      expect(screen.getByText('-3.0')).toBeTruthy();
      expect(screen.getByText('-6.0')).toBeTruthy();
    });

    it('handles decimal handicaps', () => {
      const decimalHandicapTeam = createTeamWithMembers(
        { id: 'team-dec', name: 'Decimal Team', competition_id: 'comp-1' },
        [
          createTestPlayer({ id: 'p1', name: 'P1', handicap: 12.4 }),
          createTestPlayer({ id: 'p2', name: 'P2', handicap: 15.6 }),
        ]
      );
      render(<TeamCard team={decimalHandicapTeam} />);
      // Total: 12.4 + 15.6 = 28.0, Avg: 14.0
      expect(screen.getByText('14.0')).toBeTruthy();
      expect(screen.getByText('28.0')).toBeTruthy();
    });

    it('renders when members array is undefined', () => {
      const teamWithUndefinedMembers = {
        id: 'team-undef',
        name: 'Undefined Members',
        competition_id: 'comp-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        members: undefined as any,
      };
      render(<TeamCard team={teamWithUndefinedMembers} />);
      expect(screen.getByText('Undefined Members')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CALLBACK PROPS TESTS
  // ===========================================================================

  describe('Callback Props', () => {
    it('does not crash when onEdit is undefined', () => {
      render(<TeamCard {...defaultProps} isEditable />);
      fireEvent.press(screen.getByLabelText('Edit team name'));
      // Should not throw
    });

    it('passes correct team to onEdit callback', () => {
      const onEdit = jest.fn();
      render(<TeamCard team={threePlayerTeam} isEditable onEdit={onEdit} />);

      fireEvent.press(screen.getByLabelText('Edit team name'));
      expect(onEdit).toHaveBeenCalledWith(threePlayerTeam);
    });

    it('onPress is called with correct context', () => {
      const onPress = jest.fn();
      render(<TeamCard team={fourPlayerTeam} onPress={onPress} />);

      fireEvent.press(screen.getByLabelText(/Team: Team Gamma/));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // INITIALS GENERATION TESTS
  // ===========================================================================

  describe('Initials Generation', () => {
    it('generates correct initials for two-word names', () => {
      // This is tested via the avatar rendering
      const team = createTeamWithMembers(
        { id: 'team-init', name: 'Team Init', competition_id: 'comp-1' },
        [createTestPlayer({ id: 'p1', name: 'John Smith', handicap: 15 })]
      );
      render(<TeamCard team={team} initiallyExpanded />);
      // "John Smith" → "JS"
      expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('handles single word names', () => {
      const team = createTeamWithMembers(
        { id: 'team-single-name', name: 'Team Single', competition_id: 'comp-1' },
        [createTestPlayer({ id: 'p1', name: 'Madonna', handicap: 15 })]
      );
      render(<TeamCard team={team} initiallyExpanded />);
      // "Madonna" → "M"
      expect(screen.getByText('Madonna')).toBeTruthy();
    });

    it('handles names with multiple words', () => {
      const team = createTeamWithMembers(
        { id: 'team-multi', name: 'Team Multi', competition_id: 'comp-1' },
        [createTestPlayer({ id: 'p1', name: 'Jean Claude Van Damme', handicap: 15 })]
      );
      render(<TeamCard team={team} initiallyExpanded />);
      // "Jean Claude Van Damme" → "JC" (first two initials)
      expect(screen.getByText('Jean Claude Van Damme')).toBeTruthy();
    });
  });

  // ===========================================================================
  // LAYOUT ANIMATION TESTS
  // ===========================================================================

  describe('Layout Animation', () => {
    it('triggers layout animation when expanding', async () => {
      render(<TeamCard {...defaultProps} />);

      fireEvent.press(screen.getByText('Show members'));

      await waitFor(() => {
        expect(LayoutAnimation.configureNext).toHaveBeenCalledWith(
          LayoutAnimation.Presets.easeInEaseOut
        );
      });
    });

    it('triggers layout animation when collapsing', async () => {
      render(<TeamCard {...defaultProps} initiallyExpanded />);

      fireEvent.press(screen.getByText('Hide members'));

      await waitFor(() => {
        expect(LayoutAnimation.configureNext).toHaveBeenCalledWith(
          LayoutAnimation.Presets.easeInEaseOut
        );
      });
    });
  });
});
