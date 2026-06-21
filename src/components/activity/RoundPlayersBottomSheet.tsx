/**
 * RoundPlayersBottomSheet - lists everyone who played in a round.
 *
 * Opened from a round card's footer avatar stack. Each row shows the
 * player's avatar, name, and that round's score (formatted exactly like the
 * card via participantScoreLabel). Tapping a row closes the sheet and asks
 * the parent to open that player's profile. Non-friend gating is handled by
 * the profile screen, so rows are uniform for friends and non-friends.
 *
 * Built as a raw <Modal> + <SystemModalTheme> (not the shared BottomSheet)
 * so it escapes the round card's `overflow: hidden` and keeps solid
 * surfaces inside iOS's separate modal window. useThemeColors() is called
 * INSIDE the SystemModalTheme wrap (in the content component) per the
 * solid-surface rule.
 */

import React from 'react';
import { Modal, View, ScrollView, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PlayerAvatar, SystemModalTheme } from '@/components/common';
import type { FeedParticipant } from '@/hooks/activity';
import { participantScoreLabel } from './participantScore';

export interface RoundPlayersBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  participants: FeedParticipant[];
  gameType: string;
  onSelectPlayer: (playerId: string) => void;
}

export function RoundPlayersBottomSheet({
  visible,
  onClose,
  participants,
  gameType,
  onSelectPlayer,
}: RoundPlayersBottomSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SystemModalTheme>
        <RoundPlayersSheetContent
          onClose={onClose}
          participants={participants}
          gameType={gameType}
          onSelectPlayer={onSelectPlayer}
        />
      </SystemModalTheme>
    </Modal>
  );
}

interface RoundPlayersSheetContentProps {
  onClose: () => void;
  participants: FeedParticipant[];
  gameType: string;
  onSelectPlayer: (playerId: string) => void;
}

function RoundPlayersSheetContent({
  onClose,
  participants,
  gameType,
  onSelectPlayer,
}: RoundPlayersSheetContentProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const handleSelect = (playerId: string) => {
    onClose();
    onSelectPlayer(playerId);
  };

  return (
    <View style={styles.root}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.overlay || 'rgba(0,0,0,0.5)' }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close players list"
      />
      <View
        style={[
          styles.sheet,
          shadows.lg,
          { backgroundColor: colors.surfaceElevated, paddingBottom: insets.bottom + spacing.md },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Players</Text>
        <ScrollView style={styles.list} bounces={false}>
          {participants.map((p) => {
            const score = participantScoreLabel(p, gameType);
            return (
              <TouchableOpacity
                key={p.player_id}
                style={styles.row}
                onPress={() => handleSelect(p.player_id)}
                accessibilityRole="button"
                accessibilityLabel={`View ${p.name}'s profile`}
              >
                <PlayerAvatar photoUrl={p.photo_url} name={p.name} size={40} />
                <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[styles.score, { color: colors.textSecondary }]}>
                  {score ?? '–'}
                </Text>
                <Icon source="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingVertical: spacing.xs,
  },
  name: {
    ...typography.bodyBold,
    flex: 1,
  },
  score: {
    ...typography.small,
    fontWeight: '600',
  },
});
