/**
 * HomeSkeleton - loading placeholder for HomeScreen v2 layout.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius } from '@/constants/theme';

export const HomeSkeleton = React.memo(function HomeSkeleton() {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {/* Hero CTA */}
      <Block height={64} colors={colors} />

      {/* In-progress carousel */}
      <Block height={120} colors={colors} marginTop={spacing.lg} />

      {/* Round today */}
      <Block height={112} colors={colors} marginTop={spacing.lg} />

      {/* Bag row */}
      <Block height={64} colors={colors} marginTop={spacing.lg} />

      {/* Upcoming row */}
      <Block height={96} colors={colors} marginTop={spacing.lg} />

      {/* Tile grid — 2×2 */}
      <View style={[styles.tileRow, { marginTop: spacing.lg }]}>
        <Block height={96} flex colors={colors} />
        <Block height={96} flex colors={colors} marginLeft={spacing.sm} />
      </View>
      <View style={[styles.tileRow, { marginTop: spacing.sm }]}>
        <Block height={96} flex colors={colors} />
        <Block height={96} flex colors={colors} marginLeft={spacing.sm} />
      </View>
    </View>
  );
});

interface BlockProps {
  height: number;
  flex?: boolean;
  marginTop?: number;
  marginLeft?: number;
  colors: ReturnType<typeof useThemeColors>;
}

function Block({ height, flex = false, marginTop = 0, marginLeft = 0, colors }: BlockProps) {
  return (
    <View
      style={{
        height,
        flex: flex ? 1 : undefined,
        marginTop,
        marginLeft,
        backgroundColor: colors.surfaceVariant,
        borderRadius: borderRadius.lg,
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  tileRow: {
    flexDirection: 'row',
  },
});
