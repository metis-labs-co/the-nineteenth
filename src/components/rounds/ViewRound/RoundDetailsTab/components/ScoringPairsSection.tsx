/**
 * ScoringPairsSection - Displays scoring pairs for premium feature
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { GolfBallLoader, Pill, PlayerAvatar } from '@/components/common';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { useIsPremium } from '@/context/SubscriptionContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useScoringPairs } from '@/hooks/useScoringPairs';
import type { RootStackParamList } from '@/navigation/types';
import type { ScoringPairWithPlayers } from '@/types/database.types';
import type { ScoringPairsSectionProps } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function ScoringPairsSection({
  roundId,
  scoringPairsRequired,
  cardBackground,
  roundStatus,
  onEditPress,
  onToggleEnabled,
  hideTitle = false,
  teamNameByPlayer,
}: ScoringPairsSectionProps) {
  const colors = useThemeColors();
  const isPremium = useIsPremium();
  const navigation = useNavigation<NavigationProp>();

  // Card is editable when round is upcoming AND a handler is wired up.
  // Callers that want a read-only rendering (e.g. the Groups tab) just
  // leave `onEditPress` and `onToggleEnabled` unset — the section
  // degrades to a status pill + pair list.
  const isEditable = roundStatus === 'upcoming' && !!onEditPress;
  const canToggle = roundStatus === 'upcoming' && !!onToggleEnabled;

  // Fetch scoring pairs for this round
  const { data: scoringPairs, isLoading } = useScoringPairs(roundId);

  // Group pairs to show reciprocal pairs once (A<->B instead of A->B and B->A)
  const displayPairs = useMemo((): { pairs: ScoringPairWithPlayers[]; type: 'reciprocal' | 'circular' } => {
    if (!scoringPairs || scoringPairs.length === 0) {
      return { pairs: [], type: 'circular' };
    }

    // Check if pairs are reciprocal (every A->B has a B->A)
    const pairMap = new Map<string, ScoringPairWithPlayers>();
    for (const pair of scoringPairs) {
      pairMap.set(`${pair.scorer_id}-${pair.player_id}`, pair);
    }

    const isReciprocal = scoringPairs.every((pair) =>
      pairMap.has(`${pair.player_id}-${pair.scorer_id}`)
    );

    if (isReciprocal) {
      // Show each pair only once
      const seen = new Set<string>();
      const grouped: ScoringPairWithPlayers[] = [];

      for (const pair of scoringPairs) {
        const key = [pair.scorer_id, pair.player_id].sort().join('-');
        if (!seen.has(key)) {
          seen.add(key);
          grouped.push(pair);
        }
      }
      return { pairs: grouped, type: 'reciprocal' };
    }

    return { pairs: scoringPairs, type: 'circular' };
  }, [scoringPairs]);

  const handleUpgradePress = () => {
    navigation.navigate('Subscription');
  };

  // Not premium - show locked state
  if (!isPremium) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Scoring Pairs
        </Text>
        <TouchableOpacity
          style={[styles.lockedCard, { backgroundColor: cardBackground, borderColor: colors.border }]}
          onPress={handleUpgradePress}
          activeOpacity={0.7}
        >
          <View style={styles.lockedContent}>
            <View style={[styles.lockedIconContainer, { backgroundColor: colors.gray200 }]}>
              <Icon source="lock" size={24} color={colors.gray500} />
            </View>
            <View style={styles.lockedTextContainer}>
              <View style={styles.lockedLabelRow}>
                <Text style={[styles.lockedLabel, { color: colors.textSecondary }]}>
                  Scoring Pairs
                </Text>
                <Pill label="Premium" variant="warning" filled size="sm" />
              </View>
              <Text style={[styles.lockedDescription, { color: colors.textTertiary }]}>
                Upgrade to designate who scores each player
              </Text>
            </View>
          </View>
          <Icon source="chevron-right" size={24} color={colors.gray400} />
        </TouchableOpacity>
      </View>
    );
  }

  // Premium user - show scoring pairs section
  // Wrap in TouchableOpacity if editable
  const CardWrapper = isEditable ? TouchableOpacity : View;
  const cardWrapperProps = isEditable
    ? {
        onPress: onEditPress,
        activeOpacity: 0.7,
        accessibilityLabel: 'Edit scoring pairs',
        accessibilityRole: 'button' as const,
      }
    : {};

  return (
    <View style={styles.section}>
      {!hideTitle && (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Scoring Pairs
          </Text>
          {isEditable && (
            <Icon source="pencil" size={18} color={colors.textSecondary} />
          )}
        </View>
      )}

      <CardWrapper
        style={[styles.scoringPairsCard, { backgroundColor: cardBackground, borderColor: colors.border }]}
        {...cardWrapperProps}
      >
        {/* Status Row */}
        <View style={styles.scoringPairsStatusRow}>
          <View style={styles.scoringPairsStatusLeft}>
            <View style={[
              styles.scoringPairsIconContainer,
              { backgroundColor: scoringPairsRequired ? colors.primaryLighter : colors.gray200 }
            ]}>
              <Icon
                source="account-switch"
                size={20}
                color={scoringPairsRequired ? colors.primary : colors.gray500}
              />
            </View>
            <View style={styles.scoringPairsStatusText}>
              <Text style={[styles.scoringPairsLabel, { color: colors.textPrimary }]}>
                {scoringPairsRequired ? 'Enabled' : 'Disabled'}
              </Text>
              <Text style={[styles.scoringPairsDescription, { color: colors.textSecondary }]}>
                {scoringPairsRequired
                  ? 'Designated markers score each player'
                  : 'Players can score themselves'}
              </Text>
            </View>
          </View>
          {canToggle ? (
            <Switch
              value={scoringPairsRequired}
              onValueChange={(v) => onToggleEnabled?.(v)}
              accessibilityLabel={
                scoringPairsRequired
                  ? 'Disable scoring pairs'
                  : 'Enable scoring pairs'
              }
              testID="scoring-pairs-toggle"
            />
          ) : (
            <Pill
              label={scoringPairsRequired ? 'Required' : 'Optional'}
              variant={scoringPairsRequired ? 'primary' : 'default'}
              size="sm"
            />
          )}
        </View>

        {/* Pairs list — always shown when scoring pairs are enabled. */}
        {scoringPairsRequired && (
          <>
            <View style={[styles.scoringPairsDivider, { backgroundColor: colors.border }]} />

            {isLoading ? (
              <View style={styles.scoringPairsLoading}>
                <GolfBallLoader size="sm" />
                <Text style={[styles.scoringPairsLoadingText, { color: colors.textSecondary }]}>
                  Loading pairs...
                </Text>
              </View>
            ) : displayPairs.pairs.length > 0 ? (
              <View style={styles.scoringPairsList}>
                <View style={styles.scoringPairsListHeader}>
                  <Text style={[styles.scoringPairsListTitle, { color: colors.textSecondary }]}>
                    {displayPairs.type === 'reciprocal' ? 'Reciprocal Pairs' : 'Circular Chain'}
                  </Text>
                  <Text style={[styles.scoringPairsCount, { color: colors.textTertiary }]}>
                    {displayPairs.pairs.length} {displayPairs.pairs.length === 1 ? 'pair' : 'pairs'}
                  </Text>
                </View>
                {displayPairs.pairs.map((pair, index) => {
                  const scorerTeam = pair.scorer?.id
                    ? teamNameByPlayer?.get(pair.scorer.id)
                    : undefined;
                  const playerTeam = pair.player?.id
                    ? teamNameByPlayer?.get(pair.player.id)
                    : undefined;
                  return (
                    <View
                      key={pair.id}
                      style={[
                        styles.scoringPairRow,
                        { backgroundColor: colors.gray50 },
                        index === displayPairs.pairs.length - 1 && styles.scoringPairRowLast,
                      ]}
                    >
                      {/* Scorer */}
                      <View style={styles.scoringPairPlayer}>
                        <PlayerAvatar
                          photoUrl={pair.scorer?.photo_url}
                          name={pair.scorer?.name}
                          size={32}
                        />
                        <View style={styles.scoringPairNameColumn}>
                          <Text
                            style={[styles.scoringPairName, { color: colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {pair.scorer?.name || 'Unknown'}
                          </Text>
                          {scorerTeam && (
                            <Text
                              style={[styles.scoringPairTeam, { color: colors.textSecondary }]}
                              numberOfLines={1}
                            >
                              {scorerTeam}
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Arrow */}
                      <View style={styles.scoringPairArrow}>
                        <Icon
                          source={displayPairs.type === 'reciprocal' ? 'swap-horizontal' : 'arrow-right'}
                          size={18}
                          color={colors.textTertiary}
                        />
                      </View>

                      {/* Player being scored */}
                      <View style={styles.scoringPairPlayer}>
                        <PlayerAvatar
                          photoUrl={pair.player?.photo_url}
                          name={pair.player?.name}
                          size={32}
                        />
                        <View style={styles.scoringPairNameColumn}>
                          <Text
                            style={[styles.scoringPairName, { color: colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {pair.player?.name || 'Unknown'}
                          </Text>
                          {playerTeam && (
                            <Text
                              style={[styles.scoringPairTeam, { color: colors.textSecondary }]}
                              numberOfLines={1}
                            >
                              {playerTeam}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.scoringPairsEmpty}>
                <Icon source="account-question" size={24} color={colors.gray400} />
                <Text style={[styles.scoringPairsEmptyText, { color: colors.textSecondary }]}>
                  No scoring pairs assigned yet
                </Text>
              </View>
            )}
          </>
        )}
      </CardWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  // Section
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
  },

  // Locked State
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  lockedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  lockedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedTextContainer: {
    flex: 1,
  },
  lockedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lockedLabel: {
    ...typography.bodyBold,
  },
  lockedDescription: {
    ...typography.small,
    marginTop: 2,
  },
  // Premium State
  scoringPairsCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  scoringPairsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  scoringPairsStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  scoringPairsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoringPairsStatusText: {
    flex: 1,
  },
  scoringPairsLabel: {
    ...typography.bodyBold,
  },
  scoringPairsDescription: {
    ...typography.small,
    marginTop: 2,
  },
  scoringPairsDivider: {
    height: 1,
    marginHorizontal: spacing.md,
  },
  scoringPairsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  scoringPairsLoadingText: {
    ...typography.small,
  },
  scoringPairsList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  scoringPairsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  scoringPairsListTitle: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  scoringPairsCount: {
    ...typography.caption,
  },
  scoringPairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  scoringPairRowLast: {
    marginBottom: 0,
  },
  scoringPairPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  scoringPairNameColumn: {
    flex: 1,
  },
  scoringPairName: {
    ...typography.small,
    fontWeight: '500',
  },
  scoringPairTeam: {
    ...typography.caption,
    fontStyle: 'italic',
    opacity: 0.7,
    marginTop: 1,
  },
  scoringPairArrow: {
    paddingHorizontal: spacing.sm,
  },
  scoringPairsEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  scoringPairsEmptyText: {
    ...typography.small,
  },
});

export default ScoringPairsSection;
