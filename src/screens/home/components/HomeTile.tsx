import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

export interface HomeTileProps {
  testID?: string;
  icon: string;
  title: string;
  headline: string | null;
  subtext: string;
  onPress: () => void;
}

export const HomeTile = React.memo(function HomeTile({
  testID,
  icon,
  title,
  headline,
  subtext,
  onPress,
}: HomeTileProps) {
  const colors = useThemeColors();
  const headlineLabel = headline ?? '—';

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${headlineLabel}, ${subtext}`}
      style={[
        styles.tile,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <View style={styles.titleRow}>
        <Icon source={icon} size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textSecondary }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Text style={[styles.headline, { color: colors.textPrimary }]} numberOfLines={1}>
        {headlineLabel}
      </Text>
      <Text style={[styles.subtext, { color: colors.textSecondary }]} numberOfLines={2}>
        {subtext}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 96,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headline: {
    ...typography.h3,
    fontWeight: '700',
  },
  subtext: {
    ...typography.caption,
  },
});
