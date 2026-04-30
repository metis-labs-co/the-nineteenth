/**
 * usePrizePoolConfig - Custom hook for prize pool configuration state management
 *
 * Extracts all business logic from PrizePoolSection:
 * - Pool enabled/disabled state
 * - Config state (funding type, amount, placements)
 * - Derived calculations (total pool, allocation validation)
 * - All handler callbacks for config changes
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  CompetitionPrizePool,
  PoolFundingType,
  PoolTargetType,
} from '@/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * A single placement split entry
 */
export interface PlacementEntry {
  position: number;
  percent: number;
}

/**
 * Prize pool configuration values used during setup
 */
export interface PrizePoolConfig {
  fundingType: PoolFundingType;
  fundingAmount: number;
  placements: PlacementEntry[];
}

/**
 * State for tracking existing prize pool in edit mode
 */
export interface PrizePoolEditState {
  /** Whether the competition has an existing prize pool */
  hasExistingPool: boolean;
  /** Whether the pool is locked (any round has started) */
  isLocked: boolean;
  /** Reason why pool can't be edited (if applicable) */
  lockedReason: string | null;
}

/**
 * Derived calculation values from the config
 */
export interface PrizePoolCalculations {
  totalPool: number;
  totalPercent: number;
  isValidAllocation: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PLACEMENTS: PlacementEntry[] = [
  { position: 1, percent: 60 },
  { position: 2, percent: 30 },
  { position: 3, percent: 10 },
];

const DEFAULT_CONFIG: PrizePoolConfig = {
  fundingType: 'per_player',
  fundingAmount: 50,
  placements: DEFAULT_PLACEMENTS,
};

// ============================================================================
// HELPERS
// ============================================================================

/** Format a number as currency string */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Ordinal suffix for position labels */
export function getOrdinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
}

// ============================================================================
// HOOK
// ============================================================================

interface UsePrizePoolConfigOptions {
  /** Existing pool data (null if none) */
  pool: CompetitionPrizePool | null;
  /** Number of players in competition */
  playerCount: number;
  /** Number of teams in competition (required when targetType='team') */
  teamCount?: number;
  /** Pool target — defaults to 'individual' */
  targetType?: PoolTargetType;
  /** Callback when pool config changes */
  onPoolChange: (config: PrizePoolConfig | null) => void;
  /** Whether the entire section is disabled */
  disabled?: boolean;
  /** Optional edit mode state */
  editState?: PrizePoolEditState;
  /** Hide the enable/disable toggle (used in wizard where user already opted in) */
  hideToggle?: boolean;
}

export function usePrizePoolConfig({
  pool,
  playerCount,
  teamCount = 0,
  targetType = 'individual',
  onPoolChange,
  disabled,
  editState,
  hideToggle,
}: UsePrizePoolConfigOptions) {
  // Determine mode and lock state
  const isEditMode = editState !== undefined;
  const isLocked = isEditMode && editState.isLocked;
  const isDisabled = disabled || isLocked;
  const hasExistingPool = isEditMode && editState.hasExistingPool;

  // Local state for pool configuration
  // When hideToggle is true, pool is always enabled (user already opted in)
  const [poolEnabled, setPoolEnabled] = useState<boolean>(hideToggle || !!pool);
  const [config, setConfig] = useState<PrizePoolConfig>(() => {
    if (pool) {
      return {
        fundingType: pool.funding_type,
        fundingAmount: pool.funding_amount,
        placements: DEFAULT_PLACEMENTS,
      };
    }
    return DEFAULT_CONFIG;
  });

  // Sync with prop changes
  useEffect(() => {
    if (pool) {
      setPoolEnabled(true);
      setConfig((prev) => ({
        fundingType: pool.funding_type,
        fundingAmount: pool.funding_amount,
        // Placements come from parent context; keep current if pool doesn't carry them
        placements: prev.placements,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  // When hideToggle is true, notify parent of initial config on mount
  useEffect(() => {
    if (hideToggle && !pool) {
      onPoolChange(config);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate derived values
  const calculations = useMemo<PrizePoolCalculations>(() => {
    const totalPool =
      config.fundingType === 'per_player'
        ? config.fundingAmount * playerCount
        : config.fundingAmount;

    const totalPercent = config.placements.reduce((sum, p) => sum + p.percent, 0);
    const isValidAllocation = Math.abs(totalPercent - 100) < 0.01;

    return {
      totalPool,
      totalPercent,
      isValidAllocation,
    };
  }, [config, playerCount]);

  // Max placements capped at participant count (minimum 1)
  const participantCount = targetType === 'team' ? teamCount : playerCount;
  const maxPlacements = Math.max(participantCount, 1);

  // Handle toggle change
  const handleToggle = useCallback(() => {
    if (isDisabled) return;

    const newEnabled = !poolEnabled;
    setPoolEnabled(newEnabled);

    if (newEnabled) {
      onPoolChange(config);
    } else {
      onPoolChange(null);
    }
  }, [poolEnabled, config, onPoolChange, isDisabled]);

  // Handle config field changes
  const updateConfig = useCallback(
    (updates: Partial<PrizePoolConfig>) => {
      const newConfig = { ...config, ...updates };
      setConfig(newConfig);
      if (poolEnabled) {
        onPoolChange(newConfig);
      }
    },
    [config, poolEnabled, onPoolChange]
  );

  // Handle funding type change
  const handleFundingTypeChange = useCallback(
    (value: PoolFundingType) => {
      updateConfig({ fundingType: value });
    },
    [updateConfig]
  );

  // Handle funding amount change
  const handleFundingAmountChange = useCallback(
    (text: string) => {
      const value = parseFloat(text) || 0;
      updateConfig({ fundingAmount: value });
    },
    [updateConfig]
  );

  // Handle placement percent change
  const handlePlacementPercentChange = useCallback(
    (index: number) => (text: string) => {
      const value = Math.min(100, Math.max(0, parseInt(text) || 0));
      const newPlacements = [...config.placements];
      newPlacements[index] = { ...newPlacements[index], percent: value };
      updateConfig({ placements: newPlacements });
    },
    [config.placements, updateConfig]
  );

  // Handle add placement
  const handleAddPlacement = useCallback(() => {
    if (config.placements.length >= maxPlacements) return;
    const nextPosition = config.placements.length + 1;
    const newPlacements = [...config.placements, { position: nextPosition, percent: 0 }];
    updateConfig({ placements: newPlacements });
  }, [config.placements, maxPlacements, updateConfig]);

  // Handle remove placement
  const handleRemovePlacement = useCallback(
    (index: number) => {
      if (config.placements.length <= 1) return;
      const newPlacements = config.placements
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, position: i + 1 }));
      updateConfig({ placements: newPlacements });
    },
    [config.placements, updateConfig]
  );

  // Labels based on target + mode
  const isTeam = targetType === 'team';
  const labelText = hasExistingPool
    ? `${isTeam ? 'Team' : 'Individual'} Prize Pool Configured`
    : `Add ${isTeam ? 'Team' : 'Individual'} Prize Pool`;
  const descriptionText =
    isLocked && editState?.lockedReason
      ? editState.lockedReason
      : isTeam
        ? 'Distribute prizes to top teams (auto-split among members)'
        : 'Distribute prizes to top finishers';

  return {
    // State
    poolEnabled,
    config,
    calculations,
    maxPlacements,
    targetType,

    // Derived mode flags
    isEditMode,
    isLocked,
    isDisabled,
    hasExistingPool,

    // Labels
    labelText,
    descriptionText,

    // Handlers
    handleToggle,
    handleFundingTypeChange,
    handleFundingAmountChange,
    handlePlacementPercentChange,
    handleAddPlacement,
    handleRemovePlacement,
  };
}
