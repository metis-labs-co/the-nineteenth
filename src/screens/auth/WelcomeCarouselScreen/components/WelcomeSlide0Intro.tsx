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
          <View>
            <LogoHorizontal width={220} variant={isDark ? 'light' : 'dark'} />
          </View>
        </View>
      }
      body="The home of social golf. Social competitions & leagues, your club and stat history, all in one place. You'll never need a socrecard again."
    />
  );
}

const styles = StyleSheet.create({
  logoStack: {
    alignItems: 'center',
  },
});

export default WelcomeSlide0Intro;
