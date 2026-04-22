import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius } from '@/constants/theme';
import { WelcomeSlide } from './WelcomeSlide';

export function WelcomeSlide2Leagues() {
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
          <Icon source="earth" size={120} color={colors.primary} />
        </View>
      }
      headline="Play leagues, anywhere"
      body="Join international leagues at any course. Fair, cross-course leaderboards powered by WHS handicap differentials."
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

export default WelcomeSlide2Leagues;
