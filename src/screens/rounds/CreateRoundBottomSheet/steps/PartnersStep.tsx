/**
 * PartnersStep - Fourth step in the create round wizard
 *
 * Features:
 * - Display selected course/tee/match type info
 * - Search and select playing partners from friends
 * - Display selected partners as chips
 * - Inline tee selection for current user and each partner
 */

import React, { memo, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { IconGolf } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { FriendSelector, type SelectedPlayer } from '@/components/common/FriendSelector';
import { AddPlaceholderModal } from '@/components/common/AddPlaceholderModal';
import { usePlaceholderPlayers } from '@/hooks/usePlaceholderPlayers';
import { useAuth } from '@/hooks/useAuth';
import type { Friend, TeeBox, GameType, Player } from '@/types/database.types';
import type { SelectedCourse, PlayingPartner } from '../types';
import { MAX_PARTNERS, MATCH_TYPES, getTeeColor } from '../types';

interface PartnersStepProps {
  selectedCourse: SelectedCourse | null;
  selectedTee: TeeBox | null;
  selectedMatchType: GameType;
  selectedPartners: PlayingPartner[];
  friendSearchQuery: string;
  onFriendSearchQueryChange: (query: string) => void;
  friends?: Friend[];
  friendsLoading: boolean;
  onTogglePartner: (friend: Friend) => void;
  onRemovePartner: (partnerId: string) => void;
  isPartnerSelected: (friendId: string) => boolean;
  onContinue: () => void;
  availableTees: TeeBox[];
  currentUserTee: TeeBox | null;
  onCurrentUserTeeChange: (tee: TeeBox) => void;
  onPartnerTeeChange: (partnerId: string, tee: TeeBox) => void;
}

export const PartnersStep = memo(function PartnersStep({
  selectedCourse,
  selectedTee,
  selectedMatchType,
  selectedPartners,
  friendSearchQuery,
  onFriendSearchQueryChange,
  friends,
  friendsLoading,
  onTogglePartner,
  onContinue,
  availableTees,
  currentUserTee,
  onCurrentUserTeeChange,
  onPartnerTeeChange,
}: PartnersStepProps) {
  const colors = useThemeColors();
  const { player } = useAuth();

  // State for Add Guest modal
  const [showAddPlaceholderModal, setShowAddPlaceholderModal] = useState(false);

  // Ref to track pending placeholder that needs to be auto-added
  // This solves timing issues with React Query cache invalidation
  const pendingPlaceholderRef = useRef<{ id: string; name: string; handicap: number | null } | null>(null);

  // Fetch placeholder players
  const { data: placeholderPlayers } = usePlaceholderPlayers();

  // Auto-add pending placeholder when it appears in the list
  // This handles the timing issue where cache invalidation triggers a refetch
  // before the onSuccess callback completes
  useEffect(() => {
    if (pendingPlaceholderRef.current && placeholderPlayers) {
      const pending = pendingPlaceholderRef.current;
      const placeholder = placeholderPlayers.find((p) => p.id === pending.id);

      // Check if the placeholder is in the list and not already selected
      if (placeholder && !selectedPartners.some((p) => p.id === pending.id)) {
        // Clear the pending ref first to prevent re-triggering
        pendingPlaceholderRef.current = null;

        // Add the placeholder to selected partners
        onTogglePartner({
          id: placeholder.id,
          name: placeholder.name,
          handicap: placeholder.handicap,
        } as Friend);
      }
    }
  }, [placeholderPlayers, selectedPartners, onTogglePartner]);

  // Convert PlayingPartner[] to SelectedPlayer[] for FriendSelector
  const selectedPlayers: SelectedPlayer[] = useMemo(
    () =>
      selectedPartners.map((partner) => ({
        id: partner.id,
        name: partner.name,
        handicap: partner.handicap,
      })),
    [selectedPartners]
  );

  // Handle selection changes from FriendSelector
  const handleSelectionChange = useCallback(
    (players: SelectedPlayer[]) => {
      // Find which player was added or removed
      const currentIds = new Set(selectedPartners.map((p) => p.id));
      const newIds = new Set(players.map((p) => p.id));

      // Find added player
      for (const player of players) {
        if (!currentIds.has(player.id)) {
          // Check if it's a friend
          const friend = friends?.find((f) => f.id === player.id);
          if (friend) {
            onTogglePartner(friend);
            return;
          }

          // Check if it's a placeholder player
          const placeholder = placeholderPlayers?.find((p) => p.id === player.id);
          if (placeholder) {
            // Cast to Friend - wizard only uses id, name, handicap
            onTogglePartner({
              id: placeholder.id,
              name: placeholder.name,
              handicap: placeholder.handicap,
            } as Friend);
            return;
          }
        }
      }

      // Find removed player
      for (const partner of selectedPartners) {
        if (!newIds.has(partner.id)) {
          // Check if it's a friend
          const friend = friends?.find((f) => f.id === partner.id);
          if (friend) {
            onTogglePartner(friend);
            return;
          }

          // Check if it's a placeholder player
          const placeholder = placeholderPlayers?.find((p) => p.id === partner.id);
          if (placeholder) {
            // Cast to Friend - wizard only uses id, name, handicap
            onTogglePartner({
              id: placeholder.id,
              name: placeholder.name,
              handicap: placeholder.handicap,
            } as Friend);
            return;
          }
        }
      }
    },
    [selectedPartners, friends, placeholderPlayers, onTogglePartner]
  );

  // Handle placeholder player creation - store in ref for auto-add
  // The useEffect above will detect when the placeholder appears in the list
  // and add it to selected partners, solving timing issues with React Query
  const handlePlaceholderCreated = useCallback(
    (createdPlayer: Player) => {
      // Store the pending placeholder info
      pendingPlaceholderRef.current = {
        id: createdPlayer.id,
        name: createdPlayer.name,
        handicap: createdPlayer.handicap,
      };
      setShowAddPlaceholderModal(false);
    },
    []
  );

  // Filter to accepted friends only
  const acceptedFriends = useMemo(
    () => (friends || []).filter((f) => f.friendship_status === 'accepted'),
    [friends]
  );

  // Course par for daily handicap calculation
  // TeeBox doesn't carry hole data, so default to standard 72
  const coursePar = 72;

  // Current user display name
  const currentUserName = player?.name || 'You';

  const hasTees = availableTees.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selected Course & Match Type Banner */}
        <View style={[styles.selectedBanner, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
          <IconGolf size={20} color={colors.primary} />
          <View style={styles.selectedBannerText}>
            <Text style={[styles.selectedBannerName, { color: colors.textPrimary }]}>
              {selectedCourse?.courseName}
              {selectedTee && (
                <Text style={{ color: colors.primary }}> · {selectedTee.name}</Text>
              )}
            </Text>
            <Text style={[styles.selectedBannerLocation, { color: colors.textSecondary }]}>
              {selectedCourse?.venue && (
                <>
                  {selectedCourse.venue.name}
                  {(selectedCourse.venue.city || selectedCourse.venue.state) &&
                    ` · ${[selectedCourse.venue.city, selectedCourse.venue.state]
                      .filter(Boolean)
                      .join(', ')}`}
                  {' · '}
                </>
              )}
              {MATCH_TYPES.find((m) => m.value === selectedMatchType)?.label}
            </Text>
          </View>
        </View>

        {/* Inline Tee Selection for Current User & Partners */}
        {hasTees && selectedPartners.length > 0 && (
          <View style={styles.teeSection}>
            <Text style={[styles.teeSectionTitle, { color: colors.textPrimary }]}>
              Tee Selection
            </Text>

            {/* Current user tee */}
            <View style={[styles.playerTeeRow, { borderColor: colors.border }]}>
              <Text style={[styles.playerTeeName, { color: colors.textPrimary }]} numberOfLines={1}>
                {currentUserName} (you)
              </Text>
              <View style={styles.teePills}>
                {availableTees.map((tee) => {
                  const isSelected = currentUserTee?.name === tee.name;
                  const dotColor = getTeeColor(tee.color, colors.textSecondary);
                  return (
                    <TouchableOpacity
                      key={tee.name}
                      style={[
                        styles.teePill,
                        {
                          backgroundColor: isSelected ? colors.primary + '15' : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => onCurrentUserTeeChange(tee)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.teeDot, { backgroundColor: dotColor, borderColor: colors.border }]} />
                      <Text
                        style={[
                          styles.teePillText,
                          { color: isSelected ? colors.primary : colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {tee.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Partner tees */}
            {selectedPartners.map((partner) => (
              <View key={partner.id} style={[styles.playerTeeRow, { borderColor: colors.border }]}>
                <Text style={[styles.playerTeeName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {partner.name}
                </Text>
                <View style={styles.teePills}>
                  {availableTees.map((tee) => {
                    const isSelected = partner.selectedTee?.name === tee.name;
                    const dotColor = getTeeColor(tee.color, colors.textSecondary);
                    return (
                      <TouchableOpacity
                        key={tee.name}
                        style={[
                          styles.teePill,
                          {
                            backgroundColor: isSelected ? colors.primary + '15' : colors.surface,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => onPartnerTeeChange(partner.id, tee)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.teeDot, { backgroundColor: dotColor, borderColor: colors.border }]} />
                        <Text
                          style={[
                            styles.teePillText,
                            { color: isSelected ? colors.primary : colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {tee.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Friend Selector */}
        <FriendSelector
          selectedPlayers={selectedPlayers}
          onSelectionChange={handleSelectionChange}
          friends={acceptedFriends}
          friendsLoading={friendsLoading}
          searchQuery={friendSearchQuery}
          onSearchQueryChange={onFriendSearchQueryChange}
          limits={{ max: MAX_PARTNERS, min: 0 }}
          limitIndicator={{ show: false }}
          selectedTitle={`Playing with (${selectedPartners.length}/${MAX_PARTNERS})`}
          listTitle={`Select up to ${MAX_PARTNERS} players (optional)`}
          emptyMessage="Add friends from the Friends tab to play together"
          testID="partners-step"
          placeholderPlayers={placeholderPlayers || []}
          onAddPlaceholderPress={() => setShowAddPlaceholderModal(true)}
          addPlaceholderLabel="Add Guest"
          disableInternalScroll={true}
          selectedTee={selectedTee}
          coursePar={coursePar}
        />
      </ScrollView>

      {/* Continue Button */}
      <View
        style={[styles.buttonContainer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}
      >
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.primary }]}
          onPress={onContinue}
          activeOpacity={0.8}
        >
          <Text style={[styles.continueButtonText, { color: colors.white }]}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Guest Modal */}
      <AddPlaceholderModal
        visible={showAddPlaceholderModal}
        onClose={() => setShowAddPlaceholderModal(false)}
        onPlayerCreated={handlePlaceholderCreated}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.md,
  },
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  selectedBannerText: {
    flex: 1,
  },
  selectedBannerName: {
    ...typography.bodyBold,
  },
  selectedBannerLocation: {
    ...typography.caption,
  },
  teeSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  teeSectionTitle: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  playerTeeRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playerTeeName: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  teePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  teePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  teeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  teePillText: {
    ...typography.caption,
  },
  buttonContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  continueButtonText: {
    ...typography.bodyBold,
  },
});
