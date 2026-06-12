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
import { IconGolf, IconUserPlus, IconUserQuestion, IconX } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { type SelectedPlayer } from '@/components/common/FriendSelector';
import { AddPlaceholderModal } from '@/components/common/AddPlaceholderModal';
import { HandicapEditSheet } from '@/components/rounds';
import { usePlaceholderPlayers } from '@/hooks/usePlaceholderPlayers';
import { useAuth } from '@/hooks/useAuth';
import type { Friend, TeeBox, GameType, Player } from '@/types/database.types';
import type { RoundPresetId } from '@/constants/roundPresets';
import { checkPresetPlayerCount } from '@/utils/presetPlayers';
import type { SelectedCourse, PlayingPartner } from '../types';
import { MAX_PARTNERS, MATCH_TYPES, getTeeColor } from '../types';
import { FriendSelectorBottomSheet } from './FriendSelectorBottomSheet';

/** Identity + effective handicap of the row currently being edited. */
interface HandicapEditTarget {
  id: string; // 'current-user' sentinel or a partner id
  name: string;
  value: number | null | undefined;
}

interface PartnersStepProps {
  selectedCourse: SelectedCourse | null;
  selectedTee: TeeBox | null;
  selectedMatchType: GameType;
  selectedPartners: PlayingPartner[];
  selectedPresetId: RoundPresetId | null;
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
  /**
   * Handicap edit wiring. Null override means "use the current user's profile
   * handicap". Partner edits are held in the partner's `handicap` field on
   * `selectedPartners` and only persisted when the round is started.
   */
  currentUserHandicapOverride: number | null;
  onCurrentUserHandicapChange: (value: number) => void;
  onPartnerHandicapChange: (partnerId: string, value: number) => void;
}

export const PartnersStep = memo(function PartnersStep({
  selectedCourse,
  selectedTee,
  selectedMatchType,
  selectedPartners,
  selectedPresetId,
  friendSearchQuery,
  onFriendSearchQueryChange,
  friends,
  friendsLoading,
  onTogglePartner,
  onRemovePartner,
  onContinue,
  availableTees,
  currentUserTee,
  onCurrentUserTeeChange,
  onPartnerTeeChange,
  currentUserHandicapOverride,
  onCurrentUserHandicapChange,
  onPartnerHandicapChange,
}: PartnersStepProps) {
  const colors = useThemeColors();
  const { player } = useAuth();

  // State for Add Guest modal and friends bottom sheet
  const [showAddPlaceholderModal, setShowAddPlaceholderModal] = useState(false);
  const [showFriendsSheet, setShowFriendsSheet] = useState(false);

  // Which row is currently being edited in the HandicapEditSheet (null = closed)
  const [handicapEditTarget, setHandicapEditTarget] = useState<HandicapEditTarget | null>(null);

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
          onRemovePartner(partner.id);
          return;
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

  // Set of placeholder IDs owned by the current user. Every entry in
  // `usePlaceholderPlayers()` is already scoped to created_by = user.id, so we
  // can use membership in this set to gate the handicap edit affordance.
  const ownedPlaceholderIds = useMemo(
    () => new Set((placeholderPlayers ?? []).map((p) => p.id)),
    [placeholderPlayers]
  );

  // Effective handicap the current user will play this round with.
  const currentUserEffectiveHandicap =
    currentUserHandicapOverride ?? player?.handicap ?? null;
  const currentUserHandicapEdited = currentUserHandicapOverride != null;

  // Format handicap for display ('—' when unset). Plus handicaps (negative
  // values) render with a leading '+' per golf convention.
  const formatHandicap = useCallback(
    (value: number | null | undefined): string => {
      if (value == null || Number.isNaN(value)) return '—';
      if (value < 0) return `+${Math.abs(value).toFixed(1)}`;
      return value.toFixed(1);
    },
    []
  );

  // Handle Save from the HandicapEditSheet
  const handleHandicapSheetSave = useCallback(
    (value: number) => {
      if (!handicapEditTarget) return;
      if (handicapEditTarget.id === 'current-user') {
        onCurrentUserHandicapChange(value);
      } else {
        onPartnerHandicapChange(handicapEditTarget.id, value);
      }
    },
    [handicapEditTarget, onCurrentUserHandicapChange, onPartnerHandicapChange]
  );

  // Course par for daily handicap calculation
  // TeeBox doesn't carry hole data, so default to standard 72
  const coursePar = 72;

  // Current user display name
  const currentUserName = player?.name || 'You';

  const hasTees = availableTees.length > 0;

  const playerCountCheck = useMemo(
    () =>
      selectedPresetId
        ? checkPresetPlayerCount(selectedPresetId, selectedPartners.length)
        : null,
    [selectedPresetId, selectedPartners.length]
  );
  const canContinue = playerCountCheck?.ok ?? true;

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

        {/* Action Buttons: Create Guest + Add Friend */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => setShowAddPlaceholderModal(true)}
            activeOpacity={0.7}
          >
            <IconUserQuestion size={20} color={colors.textSecondary} />
            <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>Create Guest</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
            onPress={() => setShowFriendsSheet(true)}
            activeOpacity={0.7}
          >
            <IconUserPlus size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Add Friend</Text>
          </TouchableOpacity>
        </View>

        {/* Inline Tee Selection for Current User & Partners */}
        {hasTees && selectedPartners.length > 0 && (
          <View style={styles.teeSection}>
            <Text style={[styles.teeSectionTitle, { color: colors.textPrimary }]}>
              Tee Selection
            </Text>

            {/* Current user tee + handicap */}
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
                {/* Current user HC pill — always editable */}
                <TouchableOpacity
                  style={[
                    styles.teePill,
                    {
                      backgroundColor: currentUserHandicapEdited
                        ? colors.primary + '15'
                        : colors.surface,
                      borderColor: currentUserHandicapEdited ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() =>
                    setHandicapEditTarget({
                      id: 'current-user',
                      name: currentUserName,
                      value: currentUserEffectiveHandicap,
                    })
                  }
                  activeOpacity={0.7}
                  accessibilityLabel={`Edit your handicap, currently ${formatHandicap(currentUserEffectiveHandicap)}`}
                  accessibilityRole="button"
                >
                  {currentUserHandicapEdited && (
                    <View style={[styles.editedDot, { backgroundColor: colors.primary }]} />
                  )}
                  <Text
                    style={[
                      styles.teePillText,
                      {
                        color: currentUserHandicapEdited ? colors.primary : colors.textSecondary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    HC: {formatHandicap(currentUserEffectiveHandicap)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Partner tees + handicaps */}
            {selectedPartners.map((partner) => {
              const isOwnedPlaceholder = ownedPlaceholderIds.has(partner.id);
              // Compare against the live placeholder profile value (if owned)
              // so the "edited" indicator tracks divergence from source of truth.
              const placeholderProfileHandicap =
                placeholderPlayers?.find((p) => p.id === partner.id)?.handicap ?? null;
              const partnerHandicapEdited =
                isOwnedPlaceholder &&
                partner.handicap != null &&
                partner.handicap !== placeholderProfileHandicap;

              return (
                <View key={partner.id} style={[styles.playerTeeRow, { borderColor: colors.border }]}>
                  <View style={styles.playerTeeNameRow}>
                    <Text style={[styles.playerTeeName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {partner.name}
                    </Text>
                    <TouchableOpacity
                      style={[styles.removeButton, { backgroundColor: colors.gray200 }]}
                      onPress={() => onRemovePartner(partner.id)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Remove ${partner.name}`}
                    >
                      <IconX size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
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
                    {/* Partner HC pill — editable only for owned placeholders */}
                    <TouchableOpacity
                      style={[
                        styles.teePill,
                        {
                          backgroundColor: partnerHandicapEdited
                            ? colors.primary + '15'
                            : colors.surface,
                          borderColor: partnerHandicapEdited ? colors.primary : colors.border,
                          opacity: isOwnedPlaceholder ? 1 : 0.6,
                        },
                      ]}
                      onPress={
                        isOwnedPlaceholder
                          ? () =>
                              setHandicapEditTarget({
                                id: partner.id,
                                name: partner.name,
                                value: partner.handicap ?? null,
                              })
                          : undefined
                      }
                      disabled={!isOwnedPlaceholder}
                      activeOpacity={isOwnedPlaceholder ? 0.7 : 1}
                      accessibilityLabel={
                        isOwnedPlaceholder
                          ? `Edit ${partner.name}'s handicap, currently ${formatHandicap(partner.handicap)}`
                          : `${partner.name}'s handicap: ${formatHandicap(partner.handicap)} (not editable)`
                      }
                      accessibilityRole={isOwnedPlaceholder ? 'button' : 'text'}
                    >
                      {partnerHandicapEdited && (
                        <View style={[styles.editedDot, { backgroundColor: colors.primary }]} />
                      )}
                      <Text
                        style={[
                          styles.teePillText,
                          {
                            color: partnerHandicapEdited ? colors.primary : colors.textSecondary,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        HC: {formatHandicap(partner.handicap)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>

      {/* Continue Button */}
      <View
        style={[styles.buttonContainer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}
      >
        {playerCountCheck && !playerCountCheck.ok && (
          <Text style={[styles.playerCountHint, { color: colors.warning }]}>
            {playerCountCheck.message}
          </Text>
        )}
        <TouchableOpacity
          style={[
            styles.continueButton,
            { backgroundColor: canContinue ? colors.primary : colors.gray400 },
          ]}
          onPress={canContinue ? onContinue : undefined}
          activeOpacity={canContinue ? 0.8 : 1}
          disabled={!canContinue}
          accessibilityState={{ disabled: !canContinue }}
        >
          <Text style={[styles.continueButtonText, { color: colors.white }]}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>

      {/* Friends Bottom Sheet */}
      <FriendSelectorBottomSheet
        visible={showFriendsSheet}
        onClose={() => setShowFriendsSheet(false)}
        selectedPlayers={selectedPlayers}
        onSelectionChange={handleSelectionChange}
        friends={acceptedFriends}
        friendsLoading={friendsLoading}
        searchQuery={friendSearchQuery}
        onSearchQueryChange={onFriendSearchQueryChange}
        maxPartners={MAX_PARTNERS}
        placeholderPlayers={placeholderPlayers || []}
        onAddPlaceholderPress={() => {
          setShowFriendsSheet(false);
          setTimeout(() => setShowAddPlaceholderModal(true), 300);
        }}
        selectedTee={selectedTee}
        coursePar={coursePar}
      />

      {/* Add Guest Modal */}
      <AddPlaceholderModal
        visible={showAddPlaceholderModal}
        onClose={() => setShowAddPlaceholderModal(false)}
        onPlayerCreated={handlePlaceholderCreated}
      />

      {/* Handicap Edit Sheet */}
      <HandicapEditSheet
        visible={handicapEditTarget !== null}
        playerName={handicapEditTarget?.name ?? ''}
        initialHandicap={handicapEditTarget?.value}
        onSave={handleHandicapSheetSave}
        onClose={() => setHandicapEditTarget(null)}
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
  playerTeeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  playerTeeName: {
    ...typography.bodyBold,
    flex: 1,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  editedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  teePillText: {
    ...typography.caption,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  actionButtonText: {
    ...typography.bodyBold,
  },
  playerCountHint: {
    ...typography.small,
    textAlign: 'center',
    marginBottom: spacing.sm,
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
