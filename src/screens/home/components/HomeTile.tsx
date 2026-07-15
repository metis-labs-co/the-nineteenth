import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius } from '@/constants/theme';

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
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.titleRow}>
        <Icon source={icon} size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textTertiary }]} numberOfLines={1}>
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
    padding: spacing.md + 2,
    borderRadius: borderRadius.xl + 2,
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  headline: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 12,
    marginTop: 2,
  },
});
