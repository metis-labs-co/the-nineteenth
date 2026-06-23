/**
 * ForceUpdateModal — root-mounted overlay driven by useVersionGate().
 *
 *  - status 'hard': full-screen, non-dismissable. No close, no backdrop
 *    dismiss, Android hardware back swallowed. Single "Update Now" button.
 *  - status 'soft': dismissable card with "Update" + "Later". "Later" stores
 *    the latest version so the prompt stays quiet until a newer one ships.
 *  - status 'ok': renders nothing.
 *
 * Rendered as a plain absolutely-positioned overlay inside the RN tree (not a
 * system <Modal>), so the app's backdrop stays visible. The card content is
 * wrapped in <SystemModalTheme> for a solid, legible surface regardless of the
 * user's surface/backdrop settings (outer wrapper holds no theme reads).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SystemModalTheme } from './SystemModalTheme';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { useVersionGate } from '@/hooks/queries/useVersionGate';
import { compareVersions } from '@/utils/compareVersions';
import type { AppVersionConfig } from '@/types';

const DISMISSED_KEY = '@nineteenth/version_gate_dismissed';

const HARD_TITLE = 'Update Required';
const HARD_BODY =
  'This version of The Nineteenth is no longer supported. Please update to keep playing.';
const SOFT_TITLE = 'Update Available';
const SOFT_BODY = 'A new version of The Nineteenth is available.';

/** Pure: should the soft prompt show given the last-dismissed version? */
export function shouldShowSoft(
  latestVersion: string,
  dismissedVersion: string | null
): boolean {
  if (!dismissedVersion) return true;
  return compareVersions(latestVersion, dismissedVersion) > 0;
}

export default function ForceUpdateModal() {
  const { status, config } = useVersionGate();
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [loadedDismissed, setLoadedDismissed] = useState(false);

  // Load the last-dismissed soft version once.
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((v) => {
        if (active) {
          setDismissedVersion(v);
          setLoadedDismissed(true);
        }
      })
      .catch(() => {
        if (active) setLoadedDismissed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const isHard = status === 'hard';

  // Swallow Android hardware back while the hard gate is up.
  useEffect(() => {
    if (!isHard) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [isHard]);

  const openStore = useCallback(() => {
    if (config?.storeUrl) Linking.openURL(config.storeUrl).catch(() => {});
  }, [config]);

  const dismissSoft = useCallback(() => {
    if (config?.latestVersion) {
      AsyncStorage.setItem(DISMISSED_KEY, config.latestVersion).catch(() => {});
      setDismissedVersion(config.latestVersion);
    }
  }, [config]);

  if (status === 'ok' || !config) return null;
  if (status === 'soft') {
    if (!loadedDismissed) return null; // avoid a flash before we know
    if (!shouldShowSoft(config.latestVersion, dismissedVersion)) return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <SystemModalTheme>
        <ForceUpdateCard
          isHard={isHard}
          config={config}
          onUpdate={openStore}
          onLater={dismissSoft}
        />
      </SystemModalTheme>
    </View>
  );
}

interface CardProps {
  isHard: boolean;
  config: AppVersionConfig;
  onUpdate: () => void;
  onLater: () => void;
}

function ForceUpdateCard({ isHard, config, onUpdate, onLater }: CardProps) {
  const colors = useThemeColors();
  const title = isHard ? HARD_TITLE : SOFT_TITLE;
  const body = config.message ?? (isHard ? HARD_BODY : SOFT_BODY);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        onPress={onUpdate}
        accessibilityRole="button"
        accessibilityLabel="Update now"
      >
        <Text style={{ ...typography.bodyBold, color: colors.white }}>
          Update Now
        </Text>
      </TouchableOpacity>

      {!isHard && (
        <TouchableOpacity
          style={styles.laterButton}
          onPress={onLater}
          accessibilityRole="button"
          accessibilityLabel="Remind me later"
        >
          <Text style={{ ...typography.body, color: colors.textSecondary }}>
            Later
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.lg,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    height: 48,
    ...shadows.sm,
  },
  laterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginTop: spacing.sm,
  },
});
