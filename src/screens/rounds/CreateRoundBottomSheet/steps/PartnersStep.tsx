/**
 * PartnersStep - Fourth step in the create round wizard
 *
 * Features:
 * - Display selected course/tee/match type info
 * - Search and select playing partners from friends
 * - Display selected partners as chips
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconGolf } from '@tabler/icons-react-native';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { FriendSelector, type SelectedPlayer } from '@/components/common/FriendSelector';
import type { Friend, TeeBox, GameType } from '@/types/database.types';
import type { SelectedCourse, PlayingPartner } from '../types';
import { MAX_PARTNERS, MATCH_TYPES } from '../types';

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
}: PartnersStepProps) {
  const colors = useThemeColors();

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
          const friend = friends?.find((f) => f.id === player.id);
          if (friend) {
            onTogglePartner(friend);
          }
          return;
        }
      }

      // Find removed player
      for (const partner of selectedPartners) {
        if (!newIds.has(partner.id)) {
          const friend = friends?.find((f) => f.id === partner.id);
          if (friend) {
            onTogglePartner(friend);
          }
          return;
        }
      }
    },
    [selectedPartners, friends, onTogglePartner]
  );

  // Filter to accepted friends only
  const acceptedFriends = useMemo(
    () => (friends || []).filter((f) => f.friendship_status === 'accepted'),
    [friends]
  );

  return (
    <>
      {/* Selected Course & Match Type Banner */}
      <View style={[styles.selectedBanner, { backgroundColor: colors.primaryLighter }]}>
        <IconGolf size={20} color={colors.primary} />
        <View style={styles.selectedBannerText}>
          <Text style={[styles.selectedBannerName, { color: colors.primaryDark }]}>
            {selectedCourse?.courseName}
            {selectedTee && (
              <Text style={{ color: colors.primary }}> · {selectedTee.name}</Text>
            )}
          </Text>
          <Text style={[styles.selectedBannerLocation, { color: colors.primary }]}>
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
        listTitle={`Select up to ${MAX_PARTNERS} friends (optional)`}
        emptyMessage="Add friends from the Friends tab to play together"
        testID="partners-step"
      />

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
            {selectedPartners.length === 0 ? 'Start Solo Round' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
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
