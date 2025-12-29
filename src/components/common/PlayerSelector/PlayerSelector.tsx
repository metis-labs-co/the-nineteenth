/**
 * PlayerSelector - Unified player selection component
 *
 * A flexible component for selecting players from any array of player-like objects.
 * Supports single/multi-select, search/filter, handicap display, and selection limits.
 *
 * Key differences from FriendSelector:
 * - Works with any SelectablePlayer[] (not just Friend[])
 * - Supports single-select mode
 * - No add friend button (pure selection, not creation)
 * - Simplified props interface
 *
 * @example
 * // Single select
 * <PlayerSelector
 *   players={roundPlayers}
 *   selectedIds={[selectedPlayerId]}
 *   onSelect={(ids) => setSelectedPlayerId(ids[0] || null)}
 * />
 *
 * @example
 * // Multi-select with limit
 * <PlayerSelector
 *   players={competitionPlayers}
 *   selectedIds={selectedPlayerIds}
 *   onSelect={setSelectedPlayerIds}
 *   multiSelect
 *   maxSelections={4}
 *   showLimitIndicator
 * />
 */

import React, { memo, useMemo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Icon } from 'react-native-paper';
import { IconUsers } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { SearchBar } from '@/components/common/SearchBar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { LimitIndicator } from '@/components/subscription/LimitIndicator';
import { SelectedPlayerPill } from './SelectedPlayerPill';
import { PlayerListItem } from './PlayerListItem';
import type { PlayerSelectorProps, SelectablePlayer } from './PlayerSelector.types';

export const PlayerSelector = memo(function PlayerSelector<T extends SelectablePlayer>({
  players,
  selectedIds,
  onSelect,
  multiSelect = false,
  maxSelections,
  searchable = true,
  showHandicap = true,
  loading = false,
  listTitle,
  selectedTitle = 'SELECTED',
  emptyMessage = 'No players available',
  emptySearchMessage = 'No players found',
  searchPlaceholder = 'Search players...',
  lockedPlayerIds = [],
  showReadyBadge = false,
  limits,
  showLimitIndicator = false,
  limitIndicatorLabel = 'Selected',
  testID,
}: PlayerSelectorProps<T>) {
  const colors = useThemeColors();
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate effective limits
  const effectiveMax = maxSelections ?? limits?.max ?? Infinity;
  const effectiveMin = limits?.min ?? 0;

  // Filter players by search query
  const filteredPlayers = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return players;
    const query = searchQuery.toLowerCase();
    return players.filter(
      (player) =>
        player.name.toLowerCase().includes(query) ||
        player.email?.toLowerCase().includes(query)
    );
  }, [players, searchQuery, searchable]);

  // Get selected players objects
  const selectedPlayers = useMemo(() => {
    return players.filter((p) => selectedIds.includes(p.id));
  }, [players, selectedIds]);

  // Check selection state
  const isSelected = useCallback(
    (playerId: string) => selectedIds.includes(playerId),
    [selectedIds]
  );

  const isLocked = useCallback(
    (playerId: string) => lockedPlayerIds.includes(playerId),
    [lockedPlayerIds]
  );

  // Check if selection is at limit
  const isAtLimit = selectedIds.length >= effectiveMax;
  const isApproachingLimit =
    effectiveMax !== Infinity &&
    selectedIds.length >= effectiveMax * 0.8 &&
    selectedIds.length < effectiveMax;

  // Check if minimum requirement is met
  const meetsMinimum = selectedIds.length >= effectiveMin;

  // Handle player toggle
  const handleToggle = useCallback(
    (playerId: string) => {
      const alreadySelected = selectedIds.includes(playerId);

      if (alreadySelected) {
        // Don't allow removing locked players
        if (lockedPlayerIds.includes(playerId)) {
          return;
        }
        onSelect(selectedIds.filter((id) => id !== playerId));
      } else {
        if (multiSelect) {
          // Multi-select: add to selection if not at limit
          if (isAtLimit) return;
          onSelect([...selectedIds, playerId]);
        } else {
          // Single-select: replace current selection
          onSelect([playerId]);
        }
      }
    },
    [selectedIds, onSelect, lockedPlayerIds, multiSelect, isAtLimit]
  );

  // Handle pill removal
  const handleRemove = useCallback(
    (playerId: string) => {
      // Don't allow removing locked players
      if (lockedPlayerIds.includes(playerId)) {
        return;
      }
      onSelect(selectedIds.filter((id) => id !== playerId));
    },
    [selectedIds, onSelect, lockedPlayerIds]
  );

  return (
    <View style={styles.container} testID={testID}>
      {/* Selected Players Section */}
      {(multiSelect || selectedIds.length > 0) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {selectedTitle}
            </Text>
            {showReadyBadge && meetsMinimum && !isAtLimit && effectiveMin > 0 && (
              <View style={[styles.readyBadge, { backgroundColor: colors.successLight }]}>
                <Icon source="check-circle" size={16} color={colors.success} />
                <Text style={[styles.readyText, { color: colors.success }]}>Ready</Text>
              </View>
            )}
          </View>

          {/* Limit Indicator */}
          {showLimitIndicator && effectiveMax !== Infinity && (
            <View style={styles.limitIndicatorContainer}>
              <LimitIndicator
                current={selectedIds.length}
                max={effectiveMax}
                label={limitIndicatorLabel}
                showBar
              />
            </View>
          )}

          {/* Warning when approaching limit */}
          {isApproachingLimit && (
            <View style={[styles.warningBox, { backgroundColor: colors.warningLight }]}>
              <Icon source="alert-circle-outline" size={18} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Approaching limit ({selectedIds.length}/{effectiveMax})
              </Text>
            </View>
          )}

          {/* Warning at limit */}
          {isAtLimit && effectiveMax !== Infinity && (
            <View style={[styles.warningBox, { backgroundColor: colors.errorLight }]}>
              <Icon source="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.warningText, { color: colors.error }]}>
                Maximum selection reached ({effectiveMax})
              </Text>
            </View>
          )}

          {/* Selected Players Pills */}
          <View style={[styles.selectedContainer, { backgroundColor: colors.surface }]}>
            {selectedPlayers.length === 0 ? (
              <Text style={[styles.emptySelection, { color: colors.textSecondary }]}>
                No players selected yet
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectedScroll}
              >
                {selectedPlayers.map((player) => (
                  <SelectedPlayerPill
                    key={player.id}
                    player={player}
                    isLocked={isLocked(player.id)}
                    onRemove={() => handleRemove(player.id)}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* Search Bar */}
      {searchable && (
        <View style={styles.searchBarWrapper}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={searchPlaceholder}
            accessibilityLabel="Search players"
            hideBorder
            containerStyle={styles.searchBar}
          />
        </View>
      )}

      {/* Players List */}
      <View style={styles.section}>
        {listTitle && (
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {listTitle}
          </Text>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner size="lg" />
          </View>
        ) : filteredPlayers.length > 0 ? (
          <View style={[styles.playersContainer, { backgroundColor: colors.surface }]}>
            {filteredPlayers.map((player, index) => {
              const playerSelected = isSelected(player.id);
              const playerLocked = isLocked(player.id);
              const disabled = !playerSelected && !playerLocked && isAtLimit;

              return (
                <PlayerListItem
                  key={player.id}
                  player={player}
                  isSelected={playerSelected}
                  isDisabled={disabled}
                  isLocked={playerLocked}
                  showHandicap={showHandicap}
                  onToggle={() => handleToggle(player.id)}
                  showDivider={index < filteredPlayers.length - 1}
                />
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <IconUsers size={48} color={colors.gray300} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {searchQuery ? emptySearchMessage : emptyMessage}
            </Text>
            {searchQuery && (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No players match "{searchQuery}"
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}) as <T extends SelectablePlayer>(props: PlayerSelectorProps<T>) => React.ReactElement;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.lg,
  },
  readyText: {
    ...typography.captionBold,
  },
  limitIndicatorContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  warningText: {
    ...typography.small,
    flex: 1,
  },
  selectedContainer: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    minHeight: 56,
    justifyContent: 'center',
  },
  emptySelection: {
    ...typography.body,
    textAlign: 'center',
  },
  selectedScroll: {
    gap: spacing.sm,
  },
  searchBarWrapper: {
    marginTop: spacing.md,
  },
  searchBar: {
    paddingVertical: spacing.sm,
  },
  playersContainer: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.bodyBold,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
