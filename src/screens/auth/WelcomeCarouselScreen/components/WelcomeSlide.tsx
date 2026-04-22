import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

interface WelcomeSlideProps {
  /** Rendered above the headline — icon, illustration, logo, etc. */
  illustration: React.ReactNode;
  /** Short slide title. */
  headline: string;
  /** Supporting copy below the headline. */
  body: string;
  /** Optional CTA/footer area rendered above the dots on the final slide. */
  footer?: React.ReactNode;
}

export function WelcomeSlide({
  illustration,
  headline,
  body,
  footer,
}: WelcomeSlideProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.huge,
          paddingBottom: insets.bottom + spacing.massive,
        },
      ]}
    >
      <View style={styles.illustrationContainer}>{illustration}</View>

      <View style={styles.textContainer}>
        <Text style={[styles.headline, { color: colors.textPrimary }]}>
          {headline}
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {body}
        </Text>
      </View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  illustrationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headline: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    textAlign: 'center',
    maxWidth: 340,
  },
  footer: {
    width: '100%',
    alignItems: 'stretch',
  },
});

export default WelcomeSlide;
