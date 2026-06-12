import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconArrowLeft, IconX } from '@tabler/icons-react-native';
import { spacing, shadows, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ScaledText } from './ScaledText';

/**
 * PageHeader - Consistent header component for all screens
 *
 * @description
 * Provides a standardized header across all app screens following Material Design 3 principles.
 * Handles platform-specific styling (iOS shadow vs Android elevation) and safe area insets.
 *
 * Supports two layout variants:
 * - **default**: Title left-aligned (with optional back button inline)
 * - **centered**: Title centered with back button on left (ideal for detail/modal screens)
 *
 * @example Default variant (title left-aligned)
 * ```tsx
 * <PageHeader
 *   title="Competitions"
 *   rightActions={[{ icon: 'plus', onPress: handleAdd, accessibilityLabel: 'Add' }]}
 * />
 * ```
 *
 * @example Centered variant (title centered, back button left)
 * ```tsx
 * <PageHeader
 *   variant="centered"
 *   title="Competition Details"
 *   showBack
 *   onBack={() => navigation.goBack()}
 * />
 * ```
 */

interface InfoAction {
  /** Callback when the info icon is pressed */
  onPress: () => void;
  /** Accessibility label for the info icon */
  accessibilityLabel?: string;
}

interface RightAction {
  /** Icon name from your icon library (e.g., MaterialIcons) */
  icon: string;
  /** Callback when action is pressed */
  onPress: () => void;
  /** Accessibility label for the action */
  accessibilityLabel: string;
  /** Optional: Show badge dot indicator */
  showBadge?: boolean;
  /** Optional: Custom icon color (defaults to primary) */
  color?: string;
}

/** Layout variant for the header */
export type PageHeaderVariant = 'default' | 'centered';

export interface PageHeaderProps {
  /** Page title (required) */
  title: string | React.ReactNode;
  /** Optional subtitle displayed below the title (can be string or custom React node) */
  subtitle?: string | React.ReactNode;
  /**
   * Layout variant:
   * - 'default': Title left-aligned (with back button inline if shown)
   * - 'centered': Title centered, back button on left (ideal for detail screens)
   * @default 'default'
   */
  variant?: PageHeaderVariant;
  /** Show back button on left side */
  showBack?: boolean;
  /** Callback when back button is pressed */
  onBack?: () => void;
  /**
   * Icon to use for back button:
   * - 'arrow': Arrow left icon (default)
   * - 'close': Close/X icon (for modals and dismissible screens)
   * @default 'arrow'
   */
  backIcon?: 'arrow' | 'close';
  /**
   * Small helper-style info icon rendered inline to the right of the title.
   * Use for screen-level "what is this?" actions instead of a full-size
   * right action button.
   */
  infoAction?: InfoAction;
  /** Array of action buttons displayed on right (max 2 recommended) */
  rightActions?: RightAction[];
  /** Custom content for right section (takes precedence over rightActions) */
  rightContent?: React.ReactNode;
  /** Custom background color (defaults to surface color) */
  backgroundColor?: string;
  /** Optional: Custom title color */
  titleColor?: string;
  /** Skip top safe area inset (useful for modal screens) */
  skipTopInset?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  variant = 'default',
  showBack = false,
  onBack,
  backIcon = 'arrow',
  infoAction,
  rightActions = [],
  rightContent,
  backgroundColor,
  titleColor,
  skipTopInset = false,
}: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  // Use theme colors as defaults
  const bgColor = backgroundColor ?? colors.surface;
  const txtColor = titleColor ?? colors.textPrimary;

  // Platform-specific header height (taller when subtitle is present)
  const BASE_HEADER_HEIGHT = Platform.select({
    ios: 52,
    android: 56,
    default: 56,
  });

  const HEADER_HEIGHT = subtitle ? BASE_HEADER_HEIGHT + 18 : BASE_HEADER_HEIGHT;

  // Total height including safe area
  const topInset = skipTopInset ? 0 : insets.top;
  const totalHeight = HEADER_HEIGHT + topInset;

  const isCentered = variant === 'centered';

  // Back button component (reused in both variants)
  const BackIconComponent = backIcon === 'close' ? IconX : IconArrowLeft;
  const backLabel = backIcon === 'close' ? 'Close' : 'Go back';
  const backHint = backIcon === 'close' ? 'Closes this screen' : 'Navigates to the previous screen';

  const BackButton = showBack ? (
    <TouchableOpacity
      onPress={onBack}
      style={styles.backButton}
      accessibilityRole="button"
      accessibilityLabel={backLabel}
      accessibilityHint={backHint}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <BackIconComponent size={24} color={colors.textPrimary} />
    </TouchableOpacity>
  ) : null;

  // Small helper-style info icon rendered inline after the title
  const InfoIcon = infoAction ? (
    <TouchableOpacity
      onPress={infoAction.onPress}
      accessibilityRole="button"
      accessibilityLabel={infoAction.accessibilityLabel ?? 'More info'}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
    >
      <Icon source="information-outline" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  ) : null;

  // Right actions component (reused in both variants)
  const RightActions = (
    <View style={[styles.rightSection, rightContent ? styles.rightSectionFlexible : undefined]}>
      {rightContent ? (
        rightContent
      ) : (
        rightActions.slice(0, 2).map((action, index) => (
          <TouchableOpacity
            key={index}
            onPress={action.onPress}
            style={[styles.actionButton, { backgroundColor: colors.surfaceVariant }]}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View>
              <Icon source={action.icon} size={22} color={action.color ?? colors.primary} />
              {action.showBadge && (
                <View style={[styles.badge, { backgroundColor: colors.error, borderColor: colors.surface }]} />
              )}
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          minHeight: totalHeight,
          paddingTop: topInset,
          backgroundColor: bgColor,
          borderBottomColor: colors.border,
        },
        Platform.OS === 'ios' ? styles.shadowIOS : styles.elevationAndroid,
      ]}
      accessibilityRole="header"
    >
      <View style={styles.content}>
        {isCentered ? (
          /* Centered Variant: [Back] [---Title---] [Actions] */
          <>
            {/* Left section - fixed width for balance */}
            <View style={styles.centeredLeftSection}>
              {BackButton}
            </View>

            {/* Center section - title and subtitle */}
            <View style={styles.centeredTitleSection}>
              <View style={styles.titleRow}>
                <ScaledText
                  category="title"
                  style={[styles.title, styles.centeredTitle, { color: txtColor }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  accessibilityRole="text"
                  accessibilityLabel={`Page title: ${title}`}
                >
                  {title}
                </ScaledText>
                {InfoIcon}
              </View>
              {subtitle && (
                typeof subtitle === 'string' ? (
                  <ScaledText
                    category="caption"
                    style={[styles.subtitle, styles.centeredTitle, { color: colors.textSecondary }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {subtitle}
                  </ScaledText>
                ) : (
                  <View style={styles.subtitleWrapper}>{subtitle}</View>
                )
              )}
            </View>

            {/* Right section - fixed width for balance */}
            <View style={styles.centeredRightSection}>
              {RightActions}
            </View>
          </>
        ) : (
          /* Default Variant: [Back + Title/Subtitle] [---spacer---] [Actions] */
          <>
            <View style={styles.leftSection}>
              {BackButton}
              <View style={styles.titleContainer}>
                <View style={styles.titleRow}>
                  <ScaledText
                    category="title"
                    style={[styles.title, { color: txtColor }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    accessibilityRole="text"
                    accessibilityLabel={`Page title: ${title}`}
                  >
                    {title}
                  </ScaledText>
                  {InfoIcon}
                </View>
                {subtitle && (
                  typeof subtitle === 'string' ? (
                    <ScaledText
                      category="caption"
                      style={[styles.subtitle, { color: colors.textSecondary }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {subtitle}
                    </ScaledText>
                  ) : (
                    <View style={styles.subtitleWrapper}>{subtitle}</View>
                  )
                )}
              </View>
            </View>
            {RightActions}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shadowIOS: {
    ...shadows.sm,
  },
  elevationAndroid: {
    elevation: 2,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  // Default variant styles
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  rightSection: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  rightSectionFlexible: {
    width: 'auto',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.h3,
    flexShrink: 1,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
    flexShrink: 1,
  },
  subtitleWrapper: {
    marginTop: 2,
    flexShrink: 1,
  },
  // Centered variant styles
  centeredLeftSection: {
    width: 60,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centeredTitleSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredTitle: {
    textAlign: 'center',
  },
  centeredRightSection: {
    width: 60,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  // Shared styles
  actionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
});

export default PageHeader;
