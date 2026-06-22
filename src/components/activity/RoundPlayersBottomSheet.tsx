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
 *
 * Animation is driven internally (Modal animationType="none") so the
 * backdrop fades in place while only the sheet slides up. The native
 * "slide" animation would translate the whole modal — backdrop included —
 * making the dim sweep up the screen instead of fading. The outer wrapper
 * keeps the Modal mounted through the exit animation via `rendered`.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { PlayerAvatar, SystemModalTheme } from '@/components/common';
import { SCREEN_HEIGHT, DEFAULT_ANIMATION_CONFIG } from '@/components/common/BottomSheet/constants';
import type { FeedParticipant } from '@/hooks/activity';
import { participantScoreLabel } from './participantScore';

export interface RoundPlayersBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  participants: FeedParticipant[];
  gameType: string;
  /** Open a player's profile (tapping the avatar + name). */
  onSelectPlayer: (playerId: string) => void;
  /** Open a player's scorecard for this round (tapping the score). */
  onSelectScorecard: (playerId: string) => void;
}

export function RoundPlayersBottomSheet({
  visible,
  onClose,
  participants,
  gameType,
  onSelectPlayer,
  onSelectScorecard,
}: RoundPlayersBottomSheetProps) {
  // Keep the Modal mounted while the sheet animates out, then drop it.
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) setRendered(true);
  }, [visible]);

  if (!rendered) return null;

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SystemModalTheme>
        <RoundPlayersSheetContent
          visible={visible}
          onClose={onClose}
          onClosed={() => setRendered(false)}
          participants={participants}
          gameType={gameType}
          onSelectPlayer={onSelectPlayer}
          onSelectScorecard={onSelectScorecard}
        />
      </SystemModalTheme>
    </Modal>
  );
}

interface RoundPlayersSheetContentProps {
  visible: boolean;
  onClose: () => void;
  onClosed: () => void;
  participants: FeedParticipant[];
  gameType: string;
  onSelectPlayer: (playerId: string) => void;
  onSelectScorecard: (playerId: string) => void;
}

function RoundPlayersSheetContent({
  visible,
  onClose,
  onClosed,
  participants,
  gameType,
  onSelectPlayer,
  onSelectScorecard,
}: RoundPlayersSheetContentProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  // Sheet slides via translateY; backdrop fades via opacity. Start off-screen.
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: DEFAULT_ANIMATION_CONFIG.damping,
          stiffness: DEFAULT_ANIMATION_CONFIG.stiffness,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: DEFAULT_ANIMATION_CONFIG.backdropOpenDuration,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: SCREEN_HEIGHT,
          useNativeDriver: true,
          damping: DEFAULT_ANIMATION_CONFIG.damping,
          stiffness: DEFAULT_ANIMATION_CONFIG.stiffness,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: DEFAULT_ANIMATION_CONFIG.backdropCloseDuration,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onClosed();
      });
    }
  }, [visible, translateY, backdropOpacity, onClosed]);

  const handleSelectProfile = (playerId: string) => {
    onClose();
    onSelectPlayer(playerId);
  };

  const handleSelectScorecard = (playerId: string) => {
    onClose();
    onSelectScorecard(playerId);
  };

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.overlay || 'rgba(0,0,0,0.5)' },
          ]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close players list"
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          shadows.lg,
          {
            backgroundColor: colors.surfaceElevated,
            paddingBottom: insets.bottom + spacing.md,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Players</Text>
        <ScrollView style={styles.list} bounces={false}>
          {participants.map((p) => {
            const score = participantScoreLabel(p, gameType);
            return (
              <View key={p.player_id} style={styles.row}>
                <TouchableOpacity
                  style={styles.playerArea}
                  onPress={() => handleSelectProfile(p.player_id)}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${p.name}'s profile`}
                >
                  <PlayerAvatar photoUrl={p.photo_url} name={p.name} size={40} />
                  <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.scoreArea}
                  onPress={() => handleSelectScorecard(p.player_id)}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${p.name}'s scorecard`}
                >
                  <Text style={[styles.score, { color: colors.textSecondary }]}>
                    {score ?? '–'}
                  </Text>
                  <Icon source="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>
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
    minHeight: 56,
  },
  playerArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingVertical: spacing.xs,
  },
  scoreArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 56,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
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
