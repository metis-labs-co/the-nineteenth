/**
 * MapInstructionsSheet - Bottom sheet explaining how to use the hole map
 *
 * Surfaced from the info icon in the MapHeader. Walks the player through
 * the tap interactions, marker types, and on-map controls.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { BottomSheet } from '@/components/common';

export interface MapInstructionsSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface InteractionRowProps {
  icon: string;
  title: string;
  description: string;
}

function InteractionRow({ icon, title, description }: InteractionRowProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceVariant }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
        <Icon source={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

export function MapInstructionsSheet({
  visible,
  onClose,
}: MapInstructionsSheetProps) {
  const colors = useThemeColors();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={0.85}
      title="How to Use the Map"
      showCloseButton
      useModal
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          The hole map shows your position, the green and any shots you&apos;ve
          logged. Use it to plan layups, check distances and review your round.
        </Text>

        <Text style={[styles.sectionLabel, { color: colors.textTertiary ?? colors.textSecondary }]}>
          Map gestures
        </Text>

        <InteractionRow
          icon="gesture-tap"
          title="Tap anywhere on the map"
          description="Drops a marker at that spot. The map then shows distance from your position to the marker, and from the marker to the green."
        />

        <InteractionRow
          icon="flag-variant"
          title="Tap a green marker"
          description="Switch your target between the front, centre or back of the green. All distances update to the new target."
        />

        <InteractionRow
          icon="golf-tee"
          title="Tap a shot marker"
          description="Opens options for that logged shot — change the club, move it on the map, or delete it."
        />

        <InteractionRow
          icon="gesture-tap-hold"
          title="Tap and hold a shot marker"
          description="Jumps straight into move mode. Tap a new spot to place the ghost pin, then confirm to update the shot's position."
        />

        <Text style={[styles.sectionLabel, { color: colors.textTertiary ?? colors.textSecondary }]}>
          Header controls
        </Text>

        <InteractionRow
          icon="crosshairs-gps"
          title="GPS button"
          description="Toggles the live GPS subscription. Tap once to pause battery use; tap again to resume tracking your position."
        />

        <InteractionRow
          icon="restart"
          title="Reset button"
          description="Clears your tap marker and resets the green target to the default. Use this if you want to start a fresh measurement."
        />

        <Text style={[styles.sectionLabel, { color: colors.textTertiary ?? colors.textSecondary }]}>
          On-map controls
        </Text>

        <InteractionRow
          icon="crosshairs"
          title="Recenter button"
          description="Bottom-right of the map. Snaps the camera back to your current position when you've panned away."
        />

        <View style={[styles.tipsContainer, { backgroundColor: colors.infoLight }]}>
          <View style={styles.tipsHeader}>
            <Icon source="lightbulb-outline" size={20} color={colors.infoDark} />
            <Text style={[styles.tipsTitle, { color: colors.infoDark }]}>
              Good to know
            </Text>
          </View>
          <View style={styles.tipsBody}>
            <View style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: colors.infoDark }]} />
              <Text style={[styles.bulletText, { color: colors.infoDark }]}>
                Distances update in real time as you move around the hole.
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: colors.infoDark }]} />
              <Text style={[styles.bulletText, { color: colors.infoDark }]}>
                Logged shots only appear if you have shot tracking enabled.
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: colors.infoDark }]} />
              <Text style={[styles.bulletText, { color: colors.infoDark }]}>
                Hazard overlays and green POIs are a Premium feature.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  intro: {
    ...typography.body,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    ...typography.captionBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowBody: {
    flex: 1,
    gap: spacing.xs,
  },
  rowTitle: {
    ...typography.bodyBold,
  },
  rowDescription: {
    ...typography.small,
    lineHeight: 20,
  },
  tipsContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tipsTitle: {
    ...typography.bodyBold,
  },
  tipsBody: {
    gap: spacing.xs,
    paddingLeft: spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    ...typography.small,
    flex: 1,
    lineHeight: 20,
  },
});
