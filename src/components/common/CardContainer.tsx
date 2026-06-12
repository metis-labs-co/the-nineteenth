// src/components/common/CardContainer.tsx
import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows } from '@/constants/theme';
import { SwipeableRow, SwipeableRowRef, SwipeSecondaryAction } from './SwipeableRow';

/**
 * Padding size variants for the card container
 */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/**
 * Props for the CardContainer component
 */
export interface CardContainerProps {
  /**
   * Card content
   */
  children: React.ReactNode;
  /**
   * Callback when the card is pressed (optional - card won't be pressable if not provided)
   */
  onPress?: () => void;
  /**
   * Callback when the card is long pressed
   */
  onLongPress?: () => void;
  /**
   * Whether the card is disabled
   */
  disabled?: boolean;
  /**
   * Custom container style
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Whether swipe-to-delete gesture is enabled (requires onDelete)
   */
  swipeable?: boolean;
  /**
   * Callback when delete is pressed (only called if swipeable is true)
   */
  onDelete?: () => void;
  /**
   * Optional extra swipe action revealed to the left of Delete
   */
  swipeSecondaryAction?: SwipeSecondaryAction;
  /**
   * Test ID for testing
   */
  testID?: string;
  /**
   * Padding size variant (default: 'lg')
   */
  padding?: CardPadding;
  /**
   * Whether to hide the border (default: false)
   */
  noBorder?: boolean;
  /**
   * Whether to apply elevation/shadow (default: true)
   */
  elevated?: boolean;
  /**
   * Accessibility label for the card
   */
  accessibilityLabel?: string;
  /**
   * Accessibility hint for the card
   */
  accessibilityHint?: string;
  /**
   * Active opacity when pressed (default: 0.7)
   */
  activeOpacity?: number;
  /**
   * Name for delete accessibility (used in "Delete {deleteAccessibilityName}")
   */
  deleteAccessibilityName?: string;
}

/**
 * Padding values for each size variant
 */
const PADDING_VALUES: Record<CardPadding, number> = {
  none: 0,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
};

/**
 * CardContainer - Shared container component for card-based UI elements
 *
 * Provides consistent styling, accessibility, and optional swipe-to-delete
 * functionality for card components throughout the app.
 *
 * @description
 * Extracts common card container patterns used by CompetitionListCard,
 * RoundListCard, PlayerCard, etc. Includes:
 * - Consistent border radius, shadows, and padding
 * - Theme-aware colors (surface background, border)
 * - Optional swipe-to-delete gesture with animated delete button
 * - Proper accessibility labels and roles
 *
 * @example Basic card
 * ```tsx
 * <CardContainer onPress={() => console.log('pressed')}>
 *   <Text>Card content</Text>
 * </CardContainer>
 * ```
 *
 * @example Card with swipe-to-delete
 * ```tsx
 * <CardContainer
 *   onPress={() => console.log('pressed')}
 *   swipeable
 *   onDelete={() => handleDelete()}
 *   deleteAccessibilityName="competition"
 * >
 *   <Text>Swipeable card content</Text>
 * </CardContainer>
 * ```
 *
 * @example Card with custom padding and no border
 * ```tsx
 * <CardContainer
 *   padding="md"
 *   noBorder
 *   elevated={false}
 * >
 *   <Text>Minimal card</Text>
 * </CardContainer>
 * ```
 */
export const CardContainer = React.memo(function CardContainer({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  swipeable = false,
  onDelete,
  swipeSecondaryAction,
  testID,
  padding = 'lg',
  noBorder = false,
  elevated = true,
  accessibilityLabel,
  accessibilityHint,
  activeOpacity = 0.7,
  deleteAccessibilityName,
}: CardContainerProps) {
  const colors = useThemeColors();
  const swipeableRef = useRef<SwipeableRowRef>(null);

  const handlePress = useCallback(() => {
    // If swipe is open, close it instead of triggering onPress
    if (swipeableRef.current?.isOpen()) {
      swipeableRef.current.close();
      return;
    }
    onPress?.();
  }, [onPress]);

  const handleDelete = useCallback(() => {
    onDelete?.();
  }, [onDelete]);

  // Build container style array
  const containerStyle = [
    styles.container,
    {
      backgroundColor: colors.surface,
      borderColor: noBorder ? 'transparent' : colors.border,
      borderWidth: noBorder ? 0 : 1,
      padding: PADDING_VALUES[padding],
    },
    elevated && shadows.sm,
    style,
  ];

  // Determine if card is pressable
  const isPressable = !!onPress || !!onLongPress;

  // Build the card content (pressable or static)
  const cardContent = isPressable ? (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      onLongPress={onLongPress}
      disabled={disabled || !onPress}
      activeOpacity={activeOpacity}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityActions={
        swipeable && onDelete
          ? [
              { name: 'delete', label: 'Delete' },
              ...(swipeSecondaryAction
                ? [{ name: 'secondary', label: swipeSecondaryAction.label }]
                : []),
            ]
          : undefined
      }
      onAccessibilityAction={
        swipeable && onDelete
          ? (event) => {
              if (event.nativeEvent.actionName === 'delete') {
                handleDelete();
              } else if (event.nativeEvent.actionName === 'secondary') {
                swipeSecondaryAction?.onPress();
              }
            }
          : undefined
      }
      testID={testID}
    >
      {children}
    </TouchableOpacity>
  ) : (
    <View style={containerStyle} testID={testID} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );

  // If not swipeable or no onDelete, render simple card
  if (!swipeable || !onDelete) {
    return cardContent;
  }

  // Swipe-enabled card using SwipeableRow
  return (
    <SwipeableRow
      ref={swipeableRef}
      onDelete={handleDelete}
      secondaryAction={swipeSecondaryAction}
      deleteLabel="Delete"
      deleteAccessibilityLabel={
        deleteAccessibilityName ? `Delete ${deleteAccessibilityName}` : 'Delete'
      }
      enabled={swipeable}
      testID={testID ? `${testID}-swipeable` : undefined}
    >
      {cardContent}
    </SwipeableRow>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
  },
});

export default CardContainer;
