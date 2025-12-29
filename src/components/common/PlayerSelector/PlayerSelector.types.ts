/**
 * PlayerSelector Types
 *
 * Type definitions for the unified PlayerSelector component that allows
 * selecting from any array of Player-like objects with support for
 * multi-select, search, handicap display, and selection limits.
 */

/**
 * Minimal player interface that PlayerSelector can work with.
 * Any object with these fields can be used as a player source.
 */
export interface SelectablePlayer {
  id: string;
  name: string;
  email?: string | null;
  handicap?: number | null;
  photo_url?: string | null;
}

/**
 * Configuration for selection limits
 */
export interface PlayerSelectionLimits {
  /** Maximum number of players that can be selected (undefined = no limit) */
  max?: number;
  /** Minimum number of players required (default: 0) */
  min?: number;
}

/**
 * Main PlayerSelector component props
 */
export interface PlayerSelectorProps<T extends SelectablePlayer = SelectablePlayer> {
  /**
   * Array of players to display and select from.
   * Must have at minimum: id, name. Other fields optional.
   */
  players: T[];

  /** Array of selected player IDs */
  selectedIds: string[];

  /**
   * Callback when selection changes.
   * For multiSelect=false, array will have 0 or 1 item.
   * For multiSelect=true, array can have multiple items.
   */
  onSelect: (ids: string[]) => void;

  /**
   * Allow multiple selections (default: false).
   * When false, selecting a new player replaces the current selection.
   */
  multiSelect?: boolean;

  /**
   * Maximum number of selections allowed (only applies when multiSelect=true).
   * When reached, additional selections are disabled.
   */
  maxSelections?: number;

  /**
   * Enable search/filter functionality (default: true).
   * When enabled, shows a search bar that filters players by name/email.
   */
  searchable?: boolean;

  /**
   * Show handicap for each player (default: true).
   */
  showHandicap?: boolean;

  /** Whether players data is loading */
  loading?: boolean;

  /** Title shown above the player list */
  listTitle?: string;

  /** Title shown above selected players section */
  selectedTitle?: string;

  /** Message shown when no players available */
  emptyMessage?: string;

  /** Message shown when search returns no results */
  emptySearchMessage?: string;

  /** Placeholder text for search input */
  searchPlaceholder?: string;

  /**
   * IDs of players that should be shown but cannot be deselected.
   * Useful for showing current user who must always be included.
   */
  lockedPlayerIds?: string[];

  /**
   * Show a "Ready" badge when minimum selections met.
   * Only applies when used with limits.min.
   */
  showReadyBadge?: boolean;

  /**
   * Selection limits configuration
   */
  limits?: PlayerSelectionLimits;

  /**
   * Show a limit indicator with progress bar.
   * Requires limits.max to be set.
   */
  showLimitIndicator?: boolean;

  /** Label for the limit indicator (e.g., "Players selected") */
  limitIndicatorLabel?: string;

  /** Test ID prefix for testing */
  testID?: string;
}

/**
 * Props for the PlayerListItem subcomponent
 */
export interface PlayerListItemProps {
  player: SelectablePlayer;
  isSelected: boolean;
  isDisabled?: boolean;
  isLocked?: boolean;
  showHandicap?: boolean;
  onToggle: () => void;
  showDivider?: boolean;
}

/**
 * Props for the SelectedPlayerPill subcomponent
 */
export interface SelectedPlayerPillProps {
  player: SelectablePlayer;
  isLocked?: boolean;
  onRemove?: () => void;
}
