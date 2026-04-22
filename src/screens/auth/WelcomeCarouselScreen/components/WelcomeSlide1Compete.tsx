import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius } from '@/constants/theme';
import { WelcomeSlide } from './WelcomeSlide';

export function WelcomeSlide1Compete() {
  const colors = useThemeColors();

  return (
    <WelcomeSlide
      illustration={
        <View
          style={[
            styles.iconBubble,
            { backgroundColor: colors.primaryLighter ?? colors.surfaceVariant },
          ]}
        >
          <Icon source="trophy-outline" size={120} color={colors.primary} />
        </View>
      }
      headline="Set up a competition in minutes"
      body="A 4-step wizard handles rounds, auto-pairings and handicap scoring — you just invite your mates."
    />
  );
}

const styles = StyleSheet.create({
  iconBubble: {
    width: 220,
    height: 220,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default WelcomeSlide1Compete;
