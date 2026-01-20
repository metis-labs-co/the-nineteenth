/**
 * FriendSelector Types
 *
 * Type definitions for the unified FriendSelector component used across
 * round creation (PartnersStep) and competition creation (AddPlayersStep).
 */

import type { Friend, PlaceholderPlayerWithStats } from '@/types/database.types';

/**
 * Unified type for selected players (works with both Friend and Player types)
 */
export interface SelectedPlayer {
  id: string;
  name: string;
  email?: string | null;
  handicap?: number | null;
  photo_url?: string | null;
  /** True if this player is a placeholder/guest without an app account */
  is_placeholder?: boolean;
}

/**
 * Configuration for selection limits
 */
export interface SelectionLimits {
  /** Maximum number of players that can be selected (undefined = no limit) */
  max?: number;
  /** Minimum number of players required (default: 0) */
  min?: number;
  /** Whether the current user is auto-included and cannot be removed */
  includeCurrentUser?: boolean;
}

/**
 * Configuration for the limit indicator display
 */
export interface LimitIndicatorConfig {
  /** Whether to show the limit indicator */
  show: boolean;
  /** Label for the limit indicator (e.g., "Players", "Partners") */
  label?: string;
  /** Whether to show the progress bar */
  showBar?: boolean;
  /** Threshold percentage to show approaching limit warning (0-1, default: 0.8) */
  warningThreshold?: number;
}

/**
 * Main FriendSelector component props
 */
export interface FriendSelectorProps {
  /** Currently selected players */
  selectedPlayers: SelectedPlayer[];
  /** Callback when selection changes */
  onSelectionChange: (players: SelectedPlayer[]) => void;

  /** Friends list to display (typically from useFriends hook) */
  friends: Friend[];
  /** Whether friends are loading */
  friendsLoading?: boolean;

  /** Search query state */
  searchQuery: string;
  /** Callback when search query changes */
  onSearchQueryChange: (query: string) => void;

  /** Selection limits configuration */
  limits?: SelectionLimits;

  /** Limit indicator configuration */
  limitIndicator?: LimitIndicatorConfig;

  /** Current user info (for includeCurrentUser feature) */
  currentUser?: {
    id: string;
    name: string;
    photo_url?: string | null;
  };

  /** Empty state message when no friends */
  emptyMessage?: string;
  /** Empty state message when search has no results */
  emptySearchMessage?: string;

  /** Title shown above friends list (e.g., "Select up to 3 friends") */
  listTitle?: string;

  /** Title shown above selected players */
  selectedTitle?: string;

  /** Whether to show the "Ready" badge when minimum is met */
  showReadyBadge?: boolean;

  /** Whether to show "Pending" badge for pending friendships */
  showPendingBadge?: boolean;

  /** Callback when "Add Friend" button is pressed */
  onAddFriendPress?: () => void;

  /** Label for add friend button (default: "Add Friend") */
  addFriendLabel?: string;

  /** Test ID prefix for testing */
  testID?: string;

  // --- Placeholder player props ---

  /** List of user's placeholder (guest) players */
  placeholderPlayers?: PlaceholderPlayerWithStats[];

  /** Callback when "Add Guest" button is pressed */
  onAddPlaceholderPress?: () => void;

  /** Label for add placeholder button (default: "Add Guest") */
  addPlaceholderLabel?: string;

  /** When true, disables internal ScrollView - use when parent handles scrolling */
  disableInternalScroll?: boolean;
}

/**
 * Props for the SelectedPlayerChip subcomponent
 */
export interface SelectedPlayerChipProps {
  player: SelectedPlayer;
  onRemove?: () => void;
  /** Whether this chip represents the current user (styled differently, no remove) */
  isCurrentUser?: boolean;
}

/**
 * Props for the FriendListItem subcomponent
 */
export interface FriendListItemProps {
  friend: Friend;
  isSelected: boolean;
  isDisabled?: boolean;
  onToggle: () => void;
  showDivider?: boolean;
  /** Whether to show "Pending" badge for pending friendships */
  showPendingBadge?: boolean;
}
