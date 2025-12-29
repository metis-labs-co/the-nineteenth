// src/components/rounds/RoundListCard/RoundCardActions.tsx

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { IconTrash } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { DELETE_BUTTON_WIDTH } from './useSwipeGesture';

interface RoundCardActionsProps {
  courseName: string;
  onDelete: () => void;
}

/**
 * RoundCardActions - Delete button for swipe actions
 */
export const RoundCardActions = React.memo(function RoundCardActions({
  courseName,
  onDelete,
}: RoundCardActionsProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.deleteButtonContainer, { backgroundColor: colors.error }]}>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={`Delete round at ${courseName}`}
      >
        <IconTrash size={24} color={colors.white} />
        <Text style={[styles.deleteButtonText, { color: colors.white }]}>
          Delete
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: spacing.xs,
  },
  deleteButtonText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
