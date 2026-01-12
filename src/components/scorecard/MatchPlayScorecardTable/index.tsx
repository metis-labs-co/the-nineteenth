/**
 * MatchPlayScorecardTable
 *
 * A specialized scorecard table for match play rounds that displays:
 * - Hole-by-hole scores for both players
 * - Running match status per hole (e.g., "Sam 1 UP", "ALL SQUARE")
 * - Front 9 (OUT) and Back 9 (IN) subtotals
 * - Final match result
 *
 * Table format:
 * | Hole | Par | Player1 | Player2 | Status      |
 * |------|-----|---------|---------|-------------|
 * | 1    | 4   | 4       | 5       | Sam 1 UP    |
 * | 2    | 3   | 3       | 3       | Sam 1 UP    |
 * | OUT  | 36  | 38      | 37      | -           |
 * | ...  |     |         |         |             |
 * | TOT  | 72  | 77      | 75      | Joe 2 UP    |
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PICKUP_SCORE } from '@/constants/scoring';
import { getFirstName, getInitials } from '@/utils/displayHelpers';
import {
  determineHoleWinner,
  calculateMatchStatus,
  getPlayerMatchStatus,
} from '@/screens/scoring/MatchPlayScoringScreen/utils/matchPlayCalculations';
import type { HoleResult, MatchStatus } from '@/screens/scoring/MatchPlayScoringScreen/types';
import type { Hole } from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

export interface MatchPlayScorecardTableProps {
  /** Course holes data */
  holes: Hole[];
  /** Player 1 info */
  player1: { id: string; name: string };
  /** Player 2 info */
  player2: { id: string; name: string };
  /** Function to get a player's score for a specific hole */
  getPlayerScore: (playerId: string, holeNumber: number) => number | undefined;
  /** Optional callback when a hole row is pressed */
  onHolePress?: (holeNumber: number) => void;
}

interface CalculatedData {
  /** Hole results for all holes */
  holeResults: Record<number, HoleResult>;
  /** Running match status after each hole */
  runningStatus: Record<number, MatchStatus>;
  /** Front 9 totals */
  front9: {
    par: number;
    player1: number;
    player2: number;
    holesPlayed: number;
  };
  /** Back 9 totals */
  back9: {
    par: number;
    player1: number;
    player2: number;
    holesPlayed: number;
  };
  /** Overall totals */
  total: {
    par: number;
    player1: number;
    player2: number;
    holesPlayed: number;
  };
  /** Final match status */
  finalStatus: MatchStatus;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function calculateAllData(
  holes: Hole[],
  player1Id: string,
  player2Id: string,
  getPlayerScore: (playerId: string, holeNumber: number) => number | undefined
): CalculatedData {
  const holeResults: Record<number, HoleResult> = {};
  const runningStatus: Record<number, MatchStatus> = {};

  let front9Par = 0;
  let front9P1 = 0;
  let front9P2 = 0;
  let front9Played = 0;

  let back9Par = 0;
  let back9P1 = 0;
  let back9P2 = 0;
  let back9Played = 0;

  // Calculate results for each hole
  for (let holeNum = 1; holeNum <= 18; holeNum++) {
    const hole = holes.find((h) => h.number === holeNum);
    if (!hole) continue;

    const p1Score = getPlayerScore(player1Id, holeNum) ?? null;
    const p2Score = getPlayerScore(player2Id, holeNum) ?? null;

    const p1PickedUp = p1Score !== null && p1Score >= PICKUP_SCORE;
    const p2PickedUp = p2Score !== null && p2Score >= PICKUP_SCORE;

    const winner = determineHoleWinner(
      p1PickedUp ? null : p1Score,
      p2PickedUp ? null : p2Score
    );

    holeResults[holeNum] = {
      player1Score: p1Score,
      player2Score: p2Score,
      player1PickedUp: p1PickedUp,
      player2PickedUp: p2PickedUp,
      winner: p1PickedUp && !p2PickedUp ? 'player2' : p2PickedUp && !p1PickedUp ? 'player1' : winner,
    };

    // Calculate running status up to this hole
    runningStatus[holeNum] = calculateMatchStatus(holeResults);

    // Accumulate totals
    const isFront9 = holeNum <= 9;
    if (isFront9) {
      front9Par += hole.par;
      if (p1Score !== null && !p1PickedUp) {
        front9P1 += p1Score;
        front9Played++;
      }
      if (p2Score !== null && !p2PickedUp) {
        front9P2 += p2Score;
      }
    } else {
      back9Par += hole.par;
      if (p1Score !== null && !p1PickedUp) {
        back9P1 += p1Score;
        back9Played++;
      }
      if (p2Score !== null && !p2PickedUp) {
        back9P2 += p2Score;
      }
    }
  }

  return {
    holeResults,
    runningStatus,
    front9: {
      par: front9Par,
      player1: front9P1,
      player2: front9P2,
      holesPlayed: front9Played,
    },
    back9: {
      par: back9Par,
      player1: back9P1,
      player2: back9P2,
      holesPlayed: back9Played,
    },
    total: {
      par: front9Par + back9Par,
      player1: front9P1 + back9P1,
      player2: front9P2 + back9P2,
      holesPlayed: front9Played + back9Played,
    },
    finalStatus: calculateMatchStatus(holeResults),
  };
}

function getRunningStatusText(
  status: MatchStatus | undefined,
  player1Name: string,
  player2Name: string
): string {
  if (!status) return '-';

  if (status.status === 'complete') {
    if (status.winner === 'halved') {
      return 'HALVED';
    }
    const winnerInitials = getInitials(status.winner === 'player1' ? player1Name : player2Name);
    return `${winnerInitials} ${status.margin}`;
  }

  if (status.leader === null) {
    return 'AS';
  }

  const leaderInitials = getInitials(status.leader === 'player1' ? player1Name : player2Name);
  return `${leaderInitials} ${status.holesUp} UP`;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface HeaderRowProps {
  player1Name: string;
  player2Name: string;
}

const HeaderRow = React.memo(function HeaderRow({ player1Name, player2Name }: HeaderRowProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.row, styles.headerRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
      <View style={[styles.cell, styles.holeCell]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>Hole</Text>
      </View>
      <View style={[styles.cell, styles.parCell]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>Par</Text>
      </View>
      <View style={[styles.cell, styles.playerCell]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]} numberOfLines={1}>
          {getFirstName(player1Name)}
        </Text>
      </View>
      <View style={[styles.cell, styles.playerCell]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]} numberOfLines={1}>
          {getFirstName(player2Name)}
        </Text>
      </View>
      <View style={[styles.cell, styles.statusCell]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>Status</Text>
      </View>
    </View>
  );
});

interface HoleRowProps {
  hole: Hole;
  result: HoleResult | undefined;
  runningStatus: MatchStatus | undefined;
  player1Name: string;
  player2Name: string;
  onPress?: () => void;
}

const HoleRow = React.memo(function HoleRow({
  hole,
  result,
  runningStatus,
  player1Name,
  player2Name,
  onPress,
}: HoleRowProps) {
  const colors = useThemeColors();

  const p1Score = result?.player1Score;
  const p2Score = result?.player2Score;
  const p1PickedUp = result?.player1PickedUp ?? false;
  const p2PickedUp = result?.player2PickedUp ?? false;
  const winner = result?.winner;

  // Determine if each player won this hole (for highlighting)
  const p1WonHole = winner === 'player1';
  const p2WonHole = winner === 'player2';

  const statusText = getRunningStatusText(runningStatus, player1Name, player2Name);

  const rowContent = (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.cell, styles.holeCell, { backgroundColor: colors.surface }]}>
        <Text style={[styles.holeCellText, { color: colors.textPrimary }]}>{hole.number}</Text>
      </View>
      <View style={[styles.cell, styles.parCell, { backgroundColor: colors.surface }]}>
        <Text style={[styles.parCellText, { color: colors.textSecondary }]}>{hole.par}</Text>
      </View>
      <View style={[styles.cell, styles.playerCell, { backgroundColor: colors.surface }]}>
        <Text
          style={[
            styles.scoreText,
            { color: p1WonHole ? colors.success : colors.textPrimary },
            p1WonHole && styles.winnerText,
          ]}
        >
          {p1PickedUp ? 'X' : p1Score ?? '-'}
        </Text>
      </View>
      <View style={[styles.cell, styles.playerCell, { backgroundColor: colors.surface }]}>
        <Text
          style={[
            styles.scoreText,
            { color: p2WonHole ? colors.success : colors.textPrimary },
            p2WonHole && styles.winnerText,
          ]}
        >
          {p2PickedUp ? 'X' : p2Score ?? '-'}
        </Text>
      </View>
      <View style={[styles.cell, styles.statusCell, { backgroundColor: colors.surface }]}>
        <Text style={[styles.statusText, { color: colors.textSecondary }]} numberOfLines={1}>
          {statusText}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {rowContent}
      </TouchableOpacity>
    );
  }

  return rowContent;
});

interface SubtotalRowProps {
  label: string;
  par: number;
  player1Total: number;
  player2Total: number;
  holesPlayed: number;
}

const SubtotalRow = React.memo(function SubtotalRow({
  label,
  par,
  player1Total,
  player2Total,
  holesPlayed,
}: SubtotalRowProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.row, styles.subtotalRow, { backgroundColor: colors.surfaceVariant, borderBottomColor: colors.border }]}>
      <View style={[styles.cell, styles.holeCell]}>
        <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{label}</Text>
      </View>
      <View style={[styles.cell, styles.parCell]}>
        <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>{par}</Text>
      </View>
      <View style={[styles.cell, styles.playerCell]}>
        <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>
          {holesPlayed > 0 ? player1Total : '-'}
        </Text>
      </View>
      <View style={[styles.cell, styles.playerCell]}>
        <Text style={[styles.subtotalText, { color: colors.textPrimary }]}>
          {holesPlayed > 0 ? player2Total : '-'}
        </Text>
      </View>
      <View style={[styles.cell, styles.statusCell]}>
        <Text style={[styles.subtotalText, { color: colors.textSecondary }]}>-</Text>
      </View>
    </View>
  );
});

interface TotalRowProps {
  par: number;
  player1Total: number;
  player2Total: number;
  holesPlayed: number;
  finalStatus: MatchStatus;
  player1Name: string;
  player2Name: string;
}

const TotalRow = React.memo(function TotalRow({
  par,
  player1Total,
  player2Total,
  holesPlayed,
  finalStatus,
  player1Name,
  player2Name,
}: TotalRowProps) {
  const colors = useThemeColors();

  const statusText = getRunningStatusText(finalStatus, player1Name, player2Name);
  const isComplete = finalStatus.status === 'complete';

  return (
    <View style={[styles.row, styles.totalRow, { backgroundColor: colors.primary, borderBottomColor: colors.primary }]}>
      <View style={[styles.cell, styles.holeCell]}>
        <Text style={[styles.totalLabelText, { color: colors.textInverse }]}>TOT</Text>
      </View>
      <View style={[styles.cell, styles.parCell]}>
        <Text style={[styles.totalText, { color: colors.textInverse }]}>{par}</Text>
      </View>
      <View style={[styles.cell, styles.playerCell]}>
        <Text style={[styles.totalText, { color: colors.textInverse }]}>
          {holesPlayed > 0 ? player1Total : '-'}
        </Text>
      </View>
      <View style={[styles.cell, styles.playerCell]}>
        <Text style={[styles.totalText, { color: colors.textInverse }]}>
          {holesPlayed > 0 ? player2Total : '-'}
        </Text>
      </View>
      <View style={[styles.cell, styles.statusCell]}>
        <Text
          style={[
            styles.totalStatusText,
            { color: colors.textInverse },
            isComplete && styles.finalResultText,
          ]}
          numberOfLines={1}
        >
          {statusText}
        </Text>
      </View>
    </View>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export const MatchPlayScorecardTable = React.memo(function MatchPlayScorecardTable({
  holes,
  player1,
  player2,
  getPlayerScore,
  onHolePress,
}: MatchPlayScorecardTableProps) {
  const colors = useThemeColors();

  // Split holes into front 9 and back 9
  const front9Holes = useMemo(
    () => holes.filter((h) => h.number <= 9).sort((a, b) => a.number - b.number),
    [holes]
  );
  const back9Holes = useMemo(
    () => holes.filter((h) => h.number > 9).sort((a, b) => a.number - b.number),
    [holes]
  );

  // Calculate all match data
  const data = useMemo(
    () => calculateAllData(holes, player1.id, player2.id, getPlayerScore),
    [holes, player1.id, player2.id, getPlayerScore]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <HeaderRow player1Name={player1.name} player2Name={player2.name} />

      {/* Front 9 */}
      {front9Holes.map((hole) => (
        <HoleRow
          key={hole.number}
          hole={hole}
          result={data.holeResults[hole.number]}
          runningStatus={data.runningStatus[hole.number]}
          player1Name={player1.name}
          player2Name={player2.name}
          onPress={onHolePress ? () => onHolePress(hole.number) : undefined}
        />
      ))}

      {/* OUT subtotal */}
      <SubtotalRow
        label="OUT"
        par={data.front9.par}
        player1Total={data.front9.player1}
        player2Total={data.front9.player2}
        holesPlayed={data.front9.holesPlayed}
      />

      {/* Back 9 */}
      {back9Holes.map((hole) => (
        <HoleRow
          key={hole.number}
          hole={hole}
          result={data.holeResults[hole.number]}
          runningStatus={data.runningStatus[hole.number]}
          player1Name={player1.name}
          player2Name={player2.name}
          onPress={onHolePress ? () => onHolePress(hole.number) : undefined}
        />
      ))}

      {/* IN subtotal */}
      <SubtotalRow
        label="IN"
        par={data.back9.par}
        player1Total={data.back9.player1}
        player2Total={data.back9.player2}
        holesPlayed={data.back9.holesPlayed}
      />

      {/* Total */}
      <TotalRow
        par={data.total.par}
        player1Total={data.total.player1}
        player2Total={data.total.player2}
        holesPlayed={data.total.holesPlayed}
        finalStatus={data.finalStatus}
        player1Name={player1.name}
        player2Name={player2.name}
      />
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const CELL_HEIGHT = 44;
const HEADER_HEIGHT = 52;

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  headerRow: {
    height: HEADER_HEIGHT,
  },
  subtotalRow: {},
  totalRow: {
    borderBottomWidth: 0,
  },
  cell: {
    height: CELL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  holeCell: {
    width: 48,
  },
  parCell: {
    width: 40,
  },
  playerCell: {
    flex: 1,
    minWidth: 56,
  },
  statusCell: {
    width: 90,
    paddingHorizontal: spacing.sm,
  },
  // Text styles
  headerText: {
    ...typography.smallBold,
    textAlign: 'center',
  },
  holeCellText: {
    ...typography.bodyBold,
  },
  parCellText: {
    ...typography.body,
  },
  scoreText: {
    ...typography.body,
    textAlign: 'center',
  },
  winnerText: {
    fontWeight: '700',
  },
  statusText: {
    ...typography.caption,
    textAlign: 'center',
  },
  subtotalText: {
    ...typography.smallBold,
  },
  totalLabelText: {
    ...typography.smallBold,
  },
  totalText: {
    ...typography.bodyBold,
  },
  totalStatusText: {
    ...typography.smallBold,
    textAlign: 'center',
  },
  finalResultText: {
    fontWeight: '700',
  },
});

export default MatchPlayScorecardTable;
