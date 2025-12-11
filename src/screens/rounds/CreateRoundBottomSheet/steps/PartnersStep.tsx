/**
 * PartnersStep - Fourth step in the create round wizard
 *
 * Features:
 * - Display selected course/tee/match type info
 * - Search and select playing partners from friends
 * - Display selected partners as chips
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  Pressable,
} from 'react-native';
import { IconGolf, IconSearch, IconX, IconUsers, IconCheck, IconPlus } from '@tabler/icons-react-native';
import { Avatar, Divider } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
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
  onRemovePartner,
  isPartnerSelected,
  onContinue,
}: PartnersStepProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  // Filter friends based on search
  const filteredFriends = friends?.filter((friend) => {
    if (!friendSearchQuery.trim()) return true;
    return friend.name.toLowerCase().includes(friendSearchQuery.toLowerCase());
  }) || [];

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

      {/* Selected Partners */}
      {selectedPartners.length > 0 && (
        <View style={styles.selectedPartnersContainer}>
          <Text style={[styles.selectedPartnersTitle, { color: colors.textSecondary }]}>
            Playing with ({selectedPartners.length}/{MAX_PARTNERS})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedPartnersScroll}
          >
            {selectedPartners.map((partner) => (
              <View
                key={partner.id}
                style={[
                  styles.selectedPartnerChip,
                  { backgroundColor: colors.primaryLighter, borderColor: colors.primary },
                ]}
              >
                <Text style={[styles.selectedPartnerName, { color: colors.primaryDark }]}>
                  {partner.name}
                </Text>
                <TouchableOpacity
                  onPress={() => onRemovePartner(partner.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconX size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Friend Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.gray100 }]}>
        <IconSearch size={20} color={colors.gray400} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search friends..."
          placeholderTextColor={colors.gray400}
          value={friendSearchQuery}
          onChangeText={onFriendSearchQueryChange}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {friendSearchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onFriendSearchQueryChange('')}>
            <IconX size={18} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Friends List */}
      <View style={styles.listContainer}>
        <Text style={[styles.listTitle, { color: colors.textSecondary }]}>
          Select up to {MAX_PARTNERS} friends (optional)
        </Text>
        {friendsLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading friends...
            </Text>
          </View>
        ) : filteredFriends.length > 0 ? (
          <View style={[styles.friendsContainer, { backgroundColor: isDark ? colors.gray100 : colors.white }]}>
            <FlatList
              data={filteredFriends}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => {
                const selected = isPartnerSelected(item.id);
                const disabled = !selected && selectedPartners.length >= MAX_PARTNERS;
                const isLast = index === filteredFriends.length - 1;

                return (
                  <>
                    <Pressable
                      style={({ pressed }) => [
                        styles.friendCard,
                        pressed && { backgroundColor: colors.gray50 },
                        disabled && styles.friendCardDisabled,
                      ]}
                      onPress={() => onTogglePartner(item)}
                      disabled={disabled}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${item.name}`}
                    >
                      <View style={styles.friendCardContent}>
                        {/* Avatar */}
                        {item.photo_url ? (
                          <Avatar.Image
                            size={56}
                            source={{ uri: item.photo_url }}
                            style={[styles.friendAvatar, { backgroundColor: colors.primary }]}
                          />
                        ) : (
                          <Avatar.Icon
                            size={56}
                            icon="account"
                            style={[styles.friendAvatar, { backgroundColor: colors.primary }]}
                          />
                        )}

                        {/* Friend Info */}
                        <View style={styles.friendInfo}>
                          <Text
                            style={[
                              styles.friendName,
                              { color: colors.textPrimary },
                              disabled && { color: colors.textDisabled },
                            ]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          {item.email && (
                            <Text
                              style={[
                                styles.friendEmail,
                                { color: colors.textSecondary },
                                disabled && { color: colors.textDisabled },
                              ]}
                              numberOfLines={1}
                            >
                              {item.email}
                            </Text>
                          )}
                          {item.handicap !== null && item.handicap !== undefined && (
                            <Text
                              style={[
                                styles.friendHandicap,
                                { color: colors.primary },
                                disabled && { color: colors.textDisabled },
                              ]}
                            >
                              HC: {item.handicap}
                            </Text>
                          )}
                        </View>

                        {/* Selection Button */}
                        <View
                          style={[
                            styles.selectionButton,
                            { backgroundColor: selected ? colors.primary : colors.gray100 },
                          ]}
                        >
                          {selected ? (
                            <IconCheck size={20} color={colors.white} />
                          ) : (
                            <IconPlus size={20} color={colors.gray400} />
                          )}
                        </View>
                      </View>
                    </Pressable>
                    {!isLast && (
                      <Divider style={[styles.friendDivider, { backgroundColor: colors.gray100 }]} />
                    )}
                  </>
                );
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.friendsListContent}
            />
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <IconUsers size={48} color={colors.gray300} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {friendSearchQuery ? 'No friends found' : 'No friends yet'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {friendSearchQuery
                ? 'Try a different search'
                : 'Add friends from the Friends tab to play together'}
            </Text>
          </View>
        )}
      </View>

      {/* Continue Button */}
      <View style={[styles.buttonContainer, { borderTopColor: colors.border, backgroundColor: colors.white }]}>
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
  selectedPartnersContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  selectedPartnersTitle: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  selectedPartnersScroll: {
    gap: spacing.sm,
  },
  selectedPartnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  selectedPartnerName: {
    ...typography.small,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: 0,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  listTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  friendsContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  friendsListContent: {
    paddingBottom: spacing.sm,
  },
  friendCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  friendCardDisabled: {
    opacity: 0.5,
  },
  friendCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatar: {},
  friendInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  friendName: {
    ...typography.bodyBold,
  },
  friendEmail: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  friendHandicap: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  selectionButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendDivider: {
    marginHorizontal: spacing.lg,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
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
