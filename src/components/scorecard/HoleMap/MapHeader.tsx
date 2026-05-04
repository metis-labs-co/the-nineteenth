import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

export type MapHeaderGpsPermission =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'loading';

interface MapHeaderProps {
  holeNumber: number;
  canReset: boolean;
  onClose: () => void;
  onReset: () => void;
  /**
   * When supplied, a GPS toggle/status button is rendered next to the
   * reset button. Tap behaviour is decided by the parent — the header
   * is only responsible for icon + colour + accessibility label.
   */
  gpsPermission?: MapHeaderGpsPermission;
  /** Whether the watch subscription is currently active. */
  gpsActive?: boolean;
  onGpsPress?: () => void;
}

interface GpsButtonAppearance {
  icon: string;
  tint: 'active' | 'muted' | 'error';
  label: string;
}

function gpsButtonAppearance(
  permission: MapHeaderGpsPermission,
  active: boolean
): GpsButtonAppearance {
  if (permission === 'granted') {
    return active
      ? { icon: 'crosshairs-gps', tint: 'active', label: 'GPS on (tap to pause)' }
      : { icon: 'crosshairs-gps', tint: 'muted', label: 'GPS paused (tap to resume)' };
  }
  if (permission === 'denied') {
    return {
      icon: 'crosshairs-off',
      tint: 'error',
      label: 'Location off — tap to open Settings',
    };
  }
  // undetermined or loading
  return { icon: 'crosshairs', tint: 'muted', label: 'Enable GPS' };
}

export function MapHeader({
  holeNumber,
  canReset,
  onClose,
  onReset,
  gpsPermission,
  gpsActive = false,
  onGpsPress,
}: MapHeaderProps) {
  const colors = useThemeColors();

  const gpsAppearance = gpsPermission
    ? gpsButtonAppearance(gpsPermission, gpsActive)
    : null;

  const gpsTintColor = (() => {
    if (!gpsAppearance) return undefined;
    switch (gpsAppearance.tint) {
      case 'active':
        return colors.info ?? colors.primary;
      case 'error':
        return colors.error;
      case 'muted':
      default:
        return colors.textSecondary;
    }
  })();

  return (
    <View
      style={[
        styles.container,
        // surfaceElevated (not surface) so the header is always opaque —
        // `colors.surface` becomes translucent when the user has the
        // "translucent surfaces" setting on, which over a modal presents
        // as washed-out white because the underlying modal backdrop shows
        // through. The map header should always be a solid card.
        { backgroundColor: colors.surfaceElevated, borderBottomColor: colors.border },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close map"
        onPress={onClose}
        style={styles.iconButton}
      >
        <Icon source="close" size={24} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.center}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Hole {holeNumber}
        </Text>
      </View>

      {gpsAppearance && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={gpsAppearance.label}
          onPress={onGpsPress}
          style={styles.iconButton}
          testID={`gps-button-${gpsPermission}${gpsActive ? '-active' : ''}`}
        >
          <Icon source={gpsAppearance.icon} size={24} color={gpsTintColor} />
        </Pressable>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reset marker"
        accessibilityState={{ disabled: !canReset }}
        onPress={canReset ? onReset : undefined}
        style={[styles.iconButton, !canReset && styles.iconButtonDisabled]}
      >
        <Icon source="restart" size={24} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    ...typography.h4,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
});
