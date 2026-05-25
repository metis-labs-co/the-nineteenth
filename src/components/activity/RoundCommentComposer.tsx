/**
 * RoundCommentComposer - the comment input + send button.
 *
 * Designed to be pinned as a sticky footer (sibling of the scroll view inside
 * a KeyboardAvoidingView) so the Send button always sits just above the
 * keyboard and stays tappable while typing.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Keyboard, Platform } from 'react-native';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useAddComment } from '@/hooks/activity';

const MAX_COMMENT_LENGTH = 2000;

export interface RoundCommentComposerProps {
  roundId: string;
}

export function RoundCommentComposer({ roundId }: RoundCommentComposerProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const addComment = useAddComment();
  const [text, setText] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Sit just above the keyboard when open; lift off the home indicator when closed.
  const bottomPadding = keyboardVisible ? spacing.sm : insets.bottom + spacing.sm;

  const canSend = text.trim().length > 0 && !addComment.isPending;

  const submit = useCallback(() => {
    const body = text.trim();
    if (!body) return;
    addComment.mutate({ roundId, body }, { onSuccess: () => setText('') });
  }, [text, addComment, roundId]);

  return (
    <View
      style={[
        styles.composer,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          paddingBottom: bottomPadding,
        },
      ]}
    >
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Add a comment…"
        placeholderTextColor={colors.textTertiary}
        maxLength={MAX_COMMENT_LENGTH}
        multiline
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceVariant,
            borderColor: colors.border,
            color: colors.textPrimary,
          },
        ]}
        accessibilityLabel="Comment text"
      />
      <TouchableOpacity
        onPress={submit}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Post comment"
        style={[
          styles.sendButton,
          { backgroundColor: colors.primary },
          !canSend && styles.sendButtonDisabled,
        ]}
      >
        <Icon source="send" size={20} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    // paddingBottom is applied dynamically (keyboard-aware) at runtime.
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    ...typography.small,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
