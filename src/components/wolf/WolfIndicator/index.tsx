/**
 * WolfIndicator - Small indicator for scorecard header showing Wolf game is active
 *
 * Displays a dog icon with current Wolf information when Wolf game is active.
 * On press, shows a popover with Wolf game summary including standings.
 *
 * @example
 * ```tsx
 * // In scorecard header
 * <View style={styles.headerRight}>
 *   <SkinsIndicator roundId={roundId} />
 *   <WolfIndicator roundId={roundId} onPress={handleWolfPress} />
 *   <SyncIndicator />
 * </View>
 *
 * // Basic usage - just indicator with popover
 * <WolfIndicator roundId={roundId} />
 * ```
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWolfGameByRound, useWolfStandings, useWolfHoleDecisions } from '@/hooks/wolf';
import { determineWolfForHole } from '@/utils/wolf';
import { WolfIndicatorBadge } from './WolfIndicatorBadge';
import { WolfSummaryModal } from './WolfSummaryModal';
import {
  getDecisionDescription,
  getPartnerName,
  getResultDescription,
} from './wolfIndicatorUtils';

// ============================================================================
// TYPES
// ============================================================================

export interface WolfIndicatorProps {
  /** Round UUID to check for active Wolf game */
  roundId: string;
  /** Current hole number (1-18) */
  currentHole?: number;
  /** Optional callback when indicator is pressed (overrides default popover) */
  onPress?: () => void;
  /** Size of the icon */
  size?: 'sm' | 'md';
  /** Variant - 'default' has background, 'minimal' has no background (for header use) */
  variant?: 'default' | 'minimal';
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const WolfIndicator = React.memo(function WolfIndicator({
  roundId,
  currentHole,
  onPress,
  size = 'md',
  variant = 'default',
  testID,
}: WolfIndicatorProps) {
  const [showPopover, setShowPopover] = useState(false);

  // Check if Wolf game is active for this round
  const {
    data: wolfGame,
    isLoading: isGameLoading,
  } = useWolfGameByRound(roundId);

  // Get all hole decisions for summary
  const {
    data: decisions,
    isLoading: isDecisionsLoading,
    refetch: refetchDecisions,
  } = useWolfHoleDecisions(wolfGame?.id);

  // Get standings for the popover
  const {
    data: standings,
    isLoading: isStandingsLoading,
    refetch: refetchStandings,
  } = useWolfStandings(wolfGame?.id);

  // Determine current Wolf for this hole
  const currentWolf = useMemo(() => {
    if (!wolfGame?.wolf_order || !currentHole) return null;
    const wolfId = determineWolfForHole(wolfGame.wolf_order, currentHole);
    const wolfPlayer = wolfGame.participants.find((p) => p.id === wolfId);
    return wolfPlayer ?? null;
  }, [wolfGame, currentHole]);

  // Get current hole's decision
  const currentDecision = useMemo(() => {
    if (!decisions || !currentHole) return null;
    return decisions.find((d) => d.hole_number === currentHole) ?? null;
  }, [decisions, currentHole]);

  // Count holes completed (with results calculated)
  const holesCompleted = useMemo(() => {
    if (!decisions) return 0;
    return decisions.filter((d) => d.calculated_at !== null).length;
  }, [decisions]);

  // Handle press
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      setShowPopover(true);
    }
  }, [onPress]);

  // Close popover
  const handleClosePopover = useCallback(() => {
    setShowPopover(false);
  }, []);

  // Refetch data when popover opens
  useEffect(() => {
    if (!showPopover || !wolfGame?.id) return;

    // Refetch immediately when popover opens
    refetchDecisions();
    refetchStandings();

    // Poll every 3 seconds while popover is open
    const intervalId = setInterval(() => {
      refetchDecisions();
      refetchStandings();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [showPopover, wolfGame?.id, refetchDecisions, refetchStandings]);

  // Decision/result info
  const decisionDescription = getDecisionDescription(currentDecision);
  const partnerName = getPartnerName(currentDecision, wolfGame?.participants ?? []);
  const resultDescription = getResultDescription(currentDecision);
  const hasDecision = !!currentDecision?.decided_at;
  const isLoneOrBlind = !!currentDecision?.is_blind_wolf || !currentDecision?.partner_id;

  return (
    <>
      <WolfIndicatorBadge
        isLoading={isGameLoading}
        hasWolfGame={!!wolfGame}
        currentWolfName={currentWolf?.name}
        hasDecision={hasDecision}
        isLoneOrBlind={isLoneOrBlind}
        isBlindWolf={!!currentDecision?.is_blind_wolf}
        size={size}
        variant={variant}
        onPress={handlePress}
        testID={testID}
      />

      <WolfSummaryModal
        visible={showPopover}
        onClose={handleClosePopover}
        wolfGame={wolfGame ?? null}
        isLoading={isDecisionsLoading || isStandingsLoading}
        holesCompleted={holesCompleted}
        currentHole={currentHole}
        currentWolf={currentWolf}
        hasDecision={hasDecision}
        decisionDescription={decisionDescription}
        partnerName={partnerName}
        currentDecision={currentDecision}
        resultDescription={resultDescription}
        standings={standings ?? null}
      />
    </>
  );
});

export default WolfIndicator;
