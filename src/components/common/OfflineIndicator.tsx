// src/components/common/OfflineIndicator.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { GolfBallLoader } from './GolfBallLoader';
import { spacing, typography, borderRadius, zIndex } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

type OfflineStatus = 'online' | 'offline' | 'syncing' | 'error';

interface OfflineIndicatorProps {
  /**
   * Current connection status
   */
  status: OfflineStatus;
  /**
   * Number of pending syncs waiting to be uploaded
   */
  pendingSyncs?: number;
  /**
   * Error message to display (only shown when status is 'error')
   */
  errorMessage?: string;
  /**
   * Callback when sync button is pressed
   */
  onSyncPress?: () => void;
  /**
   * Whether sync is currently in progress
   */
  isSyncing?: boolean;
}

/**
 * OfflineIndicator - Persistent banner showing offline status and sync state
 *
 * Displays different colors and messages based on connection status:
 * - Offline (yellow): Shows pending syncs count
 * - Syncing (blue): Shows sync in progress with loading indicator
 * - Error (red): Shows error message with retry button
 * - Online: Component is hidden
 *
 * @example
 * ```tsx
 * <OfflineIndicator
 *   status="offline"
 *   pendingSyncs={3}
 *   onSyncPress={handleManualSync}
 * />
 * ```
 */
export const OfflineIndicator = React.memo(function OfflineIndicator({
  status,
  pendingSyncs = 0,
  errorMessage,
  onSyncPress,
  isSyncing = false,
}: OfflineIndicatorProps) {
  const colors = useThemeColors();

  // Hide when online and not syncing
  if (status === 'online' && !isSyncing) {
    return null;
  }

  const getBackgroundColor = () => {
    switch (status) {
      case 'offline':
        return colors.warningLight; // Yellow
      case 'syncing':
        return colors.infoLight; // Blue
      case 'error':
        return colors.errorLight; // Red
      default:
        return colors.surfaceVariant;
    }
  };

  const getTextColor = () => {
    switch (status) {
      case 'offline':
        return colors.warningDark;
      case 'syncing':
        return colors.infoDark;
      case 'error':
        return colors.errorDark;
      default:
        return colors.textSecondary;
    }
  };

  const getMessage = () => {
    switch (status) {
      case 'offline':
        return pendingSyncs > 0
          ? `Offline • ${pendingSyncs} change${pendingSyncs !== 1 ? 's' : ''} pending`
          : 'Offline';
      case 'syncing':
        return 'Syncing changes...';
      case 'error':
        return errorMessage || 'Sync failed';
      default:
        return '';
    }
  };

  const showSyncButton = status === 'offline' && pendingSyncs > 0 && !isSyncing;
  const showRetryButton = status === 'error' && !isSyncing;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor(), borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.content}>
        {/* Message */}
        <View style={styles.messageContainer}>
          {status === 'syncing' && (
            <GolfBallLoader size="sm" />
          )}
          <Text
            variant="bodySmall"
            style={[styles.message, { color: getTextColor() }]}
            numberOfLines={2}
          >
            {getMessage()}
          </Text>
        </View>

        {/* Sync Button */}
        {showSyncButton && onSyncPress && (
          <TouchableOpacity
            onPress={onSyncPress}
            style={[styles.actionButton, { backgroundColor: colors.warning }]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Sync pending changes"
          >
            <Text style={[styles.actionButtonText, { color: colors.white }]}>
              Sync
            </Text>
          </TouchableOpacity>
        )}

        {/* Retry Button */}
        {showRetryButton && onSyncPress && (
          <TouchableOpacity
            onPress={onSyncPress}
            style={[styles.actionButton, { backgroundColor: colors.error }]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Retry sync"
          >
            <Text style={[styles.actionButtonText, { color: colors.white }]}>
              Retry
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    zIndex: zIndex.sticky,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  message: {
    ...typography.smallBold,
    flex: 1,
  },
  actionButton: {
    minHeight: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.md,
  },
  actionButtonText: {
    ...typography.captionBold,
  },
});
