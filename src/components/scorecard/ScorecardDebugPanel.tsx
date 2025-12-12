/**
 * ScorecardDebugPanel
 *
 * Comprehensive debugging panel for score entry screens.
 * Shows all relevant state for diagnosing scoring issues across game types:
 * - Individual (Stableford, Stroke Play)
 * - Team formats (Scramble, Best Ball)
 * - Match Play (individual and team)
 *
 * Toggle via settings or long-press on header
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Clipboard,
  Platform,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useScorecardStore } from '@/store/scorecardStore';
import type { Player, Hole, HoleScore, GameType } from '@/types';
import type { TeamFormat, TeamWithMembers } from '@/types/database.types';

interface DebugData {
  // Round info
  roundId: string | null;
  competitionId?: string;
  gameType: GameType;
  courseName?: string | null;

  // Hole info
  currentHole: number;
  totalHoles: number;
  holeData?: Hole;

  // Players
  players: Player[];
  playersToScore?: Player[];
  scoringPairsEnabled?: boolean;

  // Team info
  isTeamRound?: boolean;
  teamFormat?: TeamFormat | null;
  teams?: TeamWithMembers[];

  // Match play specific
  matchPlayData?: {
    player1?: { id: string; name: string; handicap: number };
    player2?: { id: string; name: string; handicap: number };
    holeResults?: Record<number, { player1Score: number | null; player2Score: number | null; winner: string | null }>;
    matchStatus?: string;
  };

  // Sync state
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  syncError: string | null;

  // Store state
  isInitialized: boolean;
  isLoading: boolean;
  allowedPlayerIds: string[];
}

interface ScorecardDebugPanelProps {
  visible: boolean;
  onClose: () => void;
  // Additional context from the screen
  roundId?: string;
  competitionId?: string;
  courseName?: string | null;
  isTeamRound?: boolean;
  teamFormat?: TeamFormat | null;
  teams?: TeamWithMembers[];
  scoringPairsEnabled?: boolean;
  playersToScore?: Player[];
  // Match play specific
  matchPlayData?: DebugData['matchPlayData'];
}

export function ScorecardDebugPanel({
  visible,
  onClose,
  roundId,
  competitionId,
  courseName,
  isTeamRound,
  teamFormat,
  teams,
  scoringPairsEnabled,
  playersToScore,
  matchPlayData,
}: ScorecardDebugPanelProps) {
  const colors = useThemeColors();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['round', 'hole', 'players', 'scores'])
  );

  // Get store state
  const {
    currentRoundId,
    currentPlayers,
    currentHole,
    holes,
    gameType,
    groupScorecards,
    isOnline,
    isSyncing,
    pendingSyncCount,
    syncError,
    isInitialized,
    isLoading,
    allowedPlayerIds,
    getHoleInfo,
    getPlayerScore,
    getPlayerTotals,
    isHoleComplete,
    getCompletedHolesCount,
  } = useScorecardStore();

  const currentHoleData = getHoleInfo(currentHole);
  const completedHolesCount = getCompletedHolesCount();

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  // Compile all debug data
  const debugData = useMemo((): DebugData => ({
    roundId: roundId || currentRoundId,
    competitionId,
    gameType,
    courseName,
    currentHole,
    totalHoles: holes.length || 18,
    holeData: currentHoleData,
    players: currentPlayers,
    playersToScore,
    scoringPairsEnabled,
    isTeamRound,
    teamFormat,
    teams,
    matchPlayData,
    isOnline,
    isSyncing,
    pendingSyncCount,
    syncError,
    isInitialized,
    isLoading,
    allowedPlayerIds,
  }), [
    roundId, currentRoundId, competitionId, gameType, courseName, currentHole,
    holes.length, currentHoleData, currentPlayers, playersToScore, scoringPairsEnabled,
    isTeamRound, teamFormat, teams, matchPlayData, isOnline, isSyncing,
    pendingSyncCount, syncError, isInitialized, isLoading, allowedPlayerIds,
  ]);

  // Copy all debug data to clipboard
  const handleCopyAll = useCallback(async () => {
    const allScores: Record<string, Record<number, HoleScore | undefined>> = {};
    currentPlayers.forEach((player) => {
      allScores[player.name] = {};
      for (let h = 1; h <= 18; h++) {
        const score = getPlayerScore(player.id, h);
        if (score) {
          allScores[player.name][h] = score;
        }
      }
    });

    const playerTotals = currentPlayers.map((player) => ({
      name: player.name,
      handicap: player.handicap,
      ...getPlayerTotals(player.id),
    }));

    const fullDebug = {
      timestamp: new Date().toISOString(),
      ...debugData,
      scores: allScores,
      playerTotals,
      scorecardCount: groupScorecards.size,
      completedHoles: completedHolesCount,
    };

    const jsonString = JSON.stringify(fullDebug, null, 2);

    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(jsonString);
      } else {
        Clipboard.setString(jsonString);
      }
      console.log('[ScorecardDebugPanel] Debug data copied to clipboard');
    } catch (error) {
      console.error('[ScorecardDebugPanel] Failed to copy:', error);
    }
  }, [debugData, currentPlayers, getPlayerScore, getPlayerTotals, groupScorecards.size, completedHolesCount]);

  // Log current state to console
  const handleLogToConsole = useCallback(() => {
    console.group('[ScorecardDebugPanel] Current State');

    console.group('Round Info');
    console.log('Round ID:', debugData.roundId);
    console.log('Competition ID:', debugData.competitionId);
    console.log('Game Type:', debugData.gameType);
    console.log('Course:', debugData.courseName);
    console.log('Is Team Round:', debugData.isTeamRound);
    console.log('Team Format:', debugData.teamFormat);
    console.groupEnd();

    console.group('Hole Info');
    console.log('Current Hole:', debugData.currentHole);
    console.log('Hole Data:', debugData.holeData);
    console.log('Completed Holes:', completedHolesCount);
    console.log('Hole Complete:', isHoleComplete(debugData.currentHole));
    console.groupEnd();

    console.group('Players');
    console.log('Total Players:', debugData.players.length);
    console.log('Players:', debugData.players.map((p) => ({ id: p.id.substring(0, 8), name: p.name, hc: p.handicap })));
    console.log('Scoring Pairs Enabled:', debugData.scoringPairsEnabled);
    console.log('Players to Score:', debugData.playersToScore?.map((p) => p.name));
    console.log('Allowed Player IDs:', debugData.allowedPlayerIds.length > 0 ? debugData.allowedPlayerIds : 'all');
    console.groupEnd();

    if (debugData.isTeamRound && debugData.teams) {
      console.group('Teams');
      debugData.teams.forEach((team, idx) => {
        console.log(`Team ${idx + 1} (${team.name}):`, team.members?.map((m) => m.player?.name || m.player_id.substring(0, 8)));
      });
      console.groupEnd();
    }

    console.group('Scores');
    debugData.players.forEach((player) => {
      const score = getPlayerScore(player.id, debugData.currentHole);
      const totals = getPlayerTotals(player.id);
      console.log(`${player.name}: Hole ${debugData.currentHole} = ${score?.strokes ?? '-'} | Total: gross=${totals.gross}, net=${totals.net}, pts=${totals.points}`);
    });
    console.groupEnd();

    console.group('Sync State');
    console.log('Online:', debugData.isOnline);
    console.log('Syncing:', debugData.isSyncing);
    console.log('Pending Sync:', debugData.pendingSyncCount);
    console.log('Sync Error:', debugData.syncError);
    console.groupEnd();

    console.group('Store State');
    console.log('Initialized:', debugData.isInitialized);
    console.log('Loading:', debugData.isLoading);
    console.log('Scorecard Count:', groupScorecards.size);
    console.groupEnd();

    if (debugData.matchPlayData) {
      console.group('Match Play');
      console.log('Player 1:', debugData.matchPlayData.player1);
      console.log('Player 2:', debugData.matchPlayData.player2);
      console.log('Match Status:', debugData.matchPlayData.matchStatus);
      console.log('Hole Results:', debugData.matchPlayData.holeResults);
      console.groupEnd();
    }

    console.groupEnd();
  }, [debugData, completedHolesCount, isHoleComplete, getPlayerScore, getPlayerTotals, groupScorecards.size]);

  if (!visible) return null;

  const renderSection = (
    title: string,
    sectionKey: string,
    content: React.ReactNode
  ) => {
    const isExpanded = expandedSections.has(sectionKey);
    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: colors.gray200 }]}
          activeOpacity={0.7}
          onPress={() => toggleSection(sectionKey)}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Icon
            source={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
        {isExpanded && (
          <View style={[styles.sectionContent, { backgroundColor: colors.surface }]}>
            {content}
          </View>
        )}
      </View>
    );
  };

  const renderRow = (label: string, value: React.ReactNode, highlight?: boolean) => (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text
        style={[
          styles.value,
          { color: colors.textPrimary },
          highlight && { color: colors.primary, fontWeight: '600' },
        ]}
        numberOfLines={2}
      >
        {typeof value === 'string' || typeof value === 'number' ? value : JSON.stringify(value)}
      </Text>
    </View>
  );

  const renderStatusBadge = (status: boolean, trueLabel: string, falseLabel: string) => (
    <View
      style={[
        styles.badge,
        { backgroundColor: status ? colors.success : colors.error },
      ]}
    >
      <Text style={[styles.badgeText, { color: colors.white }]}>
        {status ? trueLabel : falseLabel}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={[styles.headerTitle, { color: colors.white }]}>
          Debug Panel
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.7}
            onPress={handleLogToConsole}
            accessibilityLabel="Log to console"
          >
            <Icon source="console" size={20} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.7}
            onPress={handleCopyAll}
            accessibilityLabel="Copy debug data"
          >
            <Icon source="content-copy" size={20} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.7}
            onPress={onClose}
            accessibilityLabel="Close debug panel"
          >
            <Icon source="close" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Round Info */}
        {renderSection('Round Info', 'round', (
          <>
            {renderRow('Round ID', debugData.roundId?.substring(0, 8) + '...' || 'N/A')}
            {renderRow('Competition ID', debugData.competitionId?.substring(0, 8) + '...' || 'N/A')}
            {renderRow('Game Type', debugData.gameType, true)}
            {renderRow('Course', debugData.courseName || 'Unknown')}
            {renderRow('Is Team Round', debugData.isTeamRound ? 'Yes' : 'No')}
            {debugData.isTeamRound && renderRow('Team Format', debugData.teamFormat || 'N/A', true)}
          </>
        ))}

        {/* Hole Info */}
        {renderSection('Hole Info', 'hole', (
          <>
            {renderRow('Current Hole', `${debugData.currentHole} / ${debugData.totalHoles}`, true)}
            {debugData.holeData && (
              <>
                {renderRow('Par', debugData.holeData.par)}
                {renderRow('Stroke Index', debugData.holeData.strokeIndex)}
                {debugData.holeData.yardages && renderRow('Yardage (White)', debugData.holeData.yardages.white || 'N/A')}
              </>
            )}
            {renderRow('Completed Holes', completedHolesCount)}
            {renderRow('Current Hole Complete', isHoleComplete(debugData.currentHole) ? 'Yes' : 'No')}
          </>
        ))}

        {/* Players */}
        {renderSection('Players', 'players', (
          <>
            {renderRow('Total Players', debugData.players.length)}
            {renderRow('Scoring Pairs', debugData.scoringPairsEnabled ? 'Enabled' : 'Disabled')}
            {debugData.scoringPairsEnabled && renderRow(
              'Players to Score',
              debugData.playersToScore?.map((p) => p.name).join(', ') || 'None'
            )}
            {renderRow('Allowed IDs', debugData.allowedPlayerIds.length > 0 ? debugData.allowedPlayerIds.length.toString() : 'All')}
            <View style={styles.playerList}>
              {debugData.players.map((player, idx) => (
                <View key={player.id} style={[styles.playerRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.playerIndex, { color: colors.textSecondary }]}>{idx + 1}.</Text>
                  <View style={styles.playerInfo}>
                    <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {player.name}
                    </Text>
                    <Text style={[styles.playerMeta, { color: colors.textSecondary }]}>
                      HC: {player.handicap ?? 0} | ID: {player.id.substring(0, 8)}...
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ))}

        {/* Teams (if team round) */}
        {debugData.isTeamRound && debugData.teams && debugData.teams.length > 0 && renderSection('Teams', 'teams', (
          <>
            {renderRow('Team Count', debugData.teams.length)}
            {debugData.teams.map((team, idx) => (
              <View key={team.id} style={[styles.teamCard, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.teamName, { color: colors.textPrimary }]}>
                  Team {idx + 1}: {team.name}
                </Text>
                <Text style={[styles.teamMembers, { color: colors.textSecondary }]}>
                  Members: {team.members?.map((m) => m.player?.name || m.player_id.substring(0, 8)).join(', ') || 'None'}
                </Text>
                <Text style={[styles.teamId, { color: colors.textTertiary }]}>
                  ID: {team.id.substring(0, 8)}...
                </Text>
              </View>
            ))}
          </>
        ))}

        {/* Current Hole Scores */}
        {renderSection('Current Hole Scores', 'scores', (
          <>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Hole {debugData.currentHole} Scores
            </Text>
            {debugData.players.map((player) => {
              const score = getPlayerScore(player.id, debugData.currentHole);
              const totals = getPlayerTotals(player.id);
              return (
                <View
                  key={player.id}
                  style={[styles.scoreRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.scorePlayerName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {player.name}
                  </Text>
                  <View style={styles.scoreValues}>
                    <View style={styles.scoreItem}>
                      <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Strokes</Text>
                      <Text style={[styles.scoreValue, { color: colors.textPrimary }]}>
                        {score?.strokes ?? '-'}
                      </Text>
                    </View>
                    <View style={styles.scoreItem}>
                      <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Putts</Text>
                      <Text style={[styles.scoreValue, { color: colors.textPrimary }]}>
                        {score?.putts ?? '-'}
                      </Text>
                    </View>
                    <View style={styles.scoreItem}>
                      <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>FIR</Text>
                      <Text style={[styles.scoreValue, { color: score?.fairwayHit ? colors.success : colors.textSecondary }]}>
                        {score?.fairwayHit === true ? 'Y' : score?.fairwayHit === false ? 'N' : '-'}
                      </Text>
                    </View>
                    <View style={styles.scoreItem}>
                      <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>GIR</Text>
                      <Text style={[styles.scoreValue, { color: score?.greenInRegulation ? colors.success : colors.textSecondary }]}>
                        {score?.greenInRegulation === true ? 'Y' : score?.greenInRegulation === false ? 'N' : '-'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.totalsRow}>
                    <Text style={[styles.totalsText, { color: colors.textSecondary }]}>
                      Total: Gross {totals.gross} | Net {totals.net} | Pts {totals.points}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        ))}

        {/* Match Play Data (if applicable) */}
        {debugData.matchPlayData && renderSection('Match Play', 'matchplay', (
          <>
            {debugData.matchPlayData.player1 && renderRow('Player 1', `${debugData.matchPlayData.player1.name} (HC: ${debugData.matchPlayData.player1.handicap})`)}
            {debugData.matchPlayData.player2 && renderRow('Player 2', `${debugData.matchPlayData.player2.name} (HC: ${debugData.matchPlayData.player2.handicap})`)}
            {renderRow('Match Status', debugData.matchPlayData.matchStatus || 'In Progress', true)}
            {debugData.matchPlayData.holeResults && (
              <View style={styles.holeResultsGrid}>
                <Text style={[styles.gridHeader, { color: colors.textSecondary }]}>Hole Results:</Text>
                {Object.entries(debugData.matchPlayData.holeResults).map(([hole, result]) => (
                  <View key={hole} style={[styles.holeResultRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.holeResultHole, { color: colors.textPrimary }]}>H{hole}</Text>
                    <Text style={[styles.holeResultScores, { color: colors.textSecondary }]}>
                      {result.player1Score ?? '-'} vs {result.player2Score ?? '-'}
                    </Text>
                    <Text
                      style={[
                        styles.holeResultWinner,
                        {
                          color: result.winner === 'player1' ? colors.success :
                            result.winner === 'player2' ? colors.error :
                              result.winner === 'halved' ? colors.warning : colors.textSecondary,
                        },
                      ]}
                    >
                      {result.winner === 'player1' ? 'P1' :
                        result.winner === 'player2' ? 'P2' :
                          result.winner === 'halved' ? '=' : '-'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ))}

        {/* Sync Status */}
        {renderSection('Sync Status', 'sync', (
          <>
            <View style={styles.statusRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Connection</Text>
              {renderStatusBadge(debugData.isOnline, 'Online', 'Offline')}
            </View>
            <View style={styles.statusRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Syncing</Text>
              {renderStatusBadge(debugData.isSyncing, 'Yes', 'No')}
            </View>
            {renderRow('Pending Sync', debugData.pendingSyncCount)}
            {debugData.syncError && renderRow('Sync Error', debugData.syncError)}
          </>
        ))}

        {/* Store Status */}
        {renderSection('Store Status', 'store', (
          <>
            <View style={styles.statusRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Initialized</Text>
              {renderStatusBadge(debugData.isInitialized, 'Yes', 'No')}
            </View>
            <View style={styles.statusRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Loading</Text>
              {renderStatusBadge(!debugData.isLoading, 'No', 'Yes')}
            </View>
            {renderRow('Scorecard Count', groupScorecards.size)}
          </>
        ))}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Debug panel - tap headers to expand/collapse
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.md,
  },
  headerTitle: {
    ...typography.h4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerButton: {
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyBold,
  },
  sectionContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sectionSubtitle: {
    ...typography.small,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.small,
    flex: 1,
  },
  value: {
    ...typography.small,
    flex: 2,
    textAlign: 'right',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    ...typography.captionBold,
  },
  playerList: {
    marginTop: spacing.sm,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  playerIndex: {
    ...typography.small,
    width: 24,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    ...typography.bodyBold,
  },
  playerMeta: {
    ...typography.caption,
  },
  teamCard: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginVertical: spacing.xs,
  },
  teamName: {
    ...typography.bodyBold,
  },
  teamMembers: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  teamId: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  scoreRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  scorePlayerName: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  scoreValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  scoreItem: {
    alignItems: 'center',
    flex: 1,
  },
  scoreLabel: {
    ...typography.caption,
  },
  scoreValue: {
    ...typography.bodyBold,
  },
  totalsRow: {
    marginTop: spacing.xs,
  },
  totalsText: {
    ...typography.caption,
  },
  holeResultsGrid: {
    marginTop: spacing.sm,
  },
  gridHeader: {
    ...typography.small,
    marginBottom: spacing.xs,
  },
  holeResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
  },
  holeResultHole: {
    ...typography.small,
    width: 32,
  },
  holeResultScores: {
    ...typography.small,
    flex: 1,
    textAlign: 'center',
  },
  holeResultWinner: {
    ...typography.smallBold,
    width: 32,
    textAlign: 'right',
  },
  footer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
  },
});

export default ScorecardDebugPanel;
