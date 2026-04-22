import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppIcon, LogoHorizontal } from '@/components/common';
import { useIsDark } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { WelcomeSlide } from './WelcomeSlide';

export function WelcomeSlide0Intro() {
  const isDark = useIsDark();

  return (
    <WelcomeSlide
      illustration={
        <View style={styles.logoStack}>
          <AppIcon size={180} />
          <View style={styles.wordmark}>
            <LogoHorizontal width={220} variant={isDark ? 'light' : 'dark'} />
          </View>
        </View>
      }
      headline="Welcome to The Nineteenth"
      body="Social golf competitions, made simple."
    />
  );
}

const styles = StyleSheet.create({
  logoStack: {
    alignItems: 'center',
  },
  wordmark: {
    marginTop: spacing.lg,
  },
});

export default WelcomeSlide0Intro;
