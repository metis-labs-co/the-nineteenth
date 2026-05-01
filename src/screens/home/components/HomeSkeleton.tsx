/**
 * HomeSkeleton - loading placeholder for HomeScreen.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius } from '@/constants/theme';

export const HomeSkeleton = React.memo(function HomeSkeleton() {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Block height={28} width="60%" colors={colors} />
      <Block height={32} width="40%" colors={colors} marginTop={spacing.sm} />
      <Block height={56} width="100%" colors={colors} marginTop={spacing.lg} />
      <Block height={120} width="100%" colors={colors} marginTop={spacing.lg} />
      <Block height={120} width="100%" colors={colors} marginTop={spacing.md} />
    </View>
  );
});

interface BlockProps {
  height: number;
  width: number | `${number}%`;
  marginTop?: number;
  colors: ReturnType<typeof useThemeColors>;
}

function Block({ height, width, marginTop = 0, colors }: BlockProps) {
  return (
    <View
      style={{
        height,
        width: width as number,
        marginTop,
        backgroundColor: colors.surfaceVariant,
        borderRadius: borderRadius.md,
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
});
