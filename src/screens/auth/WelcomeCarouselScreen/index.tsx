import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ViewToken,
} from 'react-native';
import { Text } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingDots } from '@/screens/onboarding/components/OnboardingDots';
import { ThemeProvider, useThemeColors } from '@/context/ThemeContext';
import { useHasSeenWelcome } from '@/hooks/useHasSeenWelcome';
import { spacing, typography } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import { WelcomeSlide0Intro } from './components/WelcomeSlide0Intro';
import { WelcomeSlide1Compete } from './components/WelcomeSlide1Compete';
import { WelcomeSlide2Leagues } from './components/WelcomeSlide2Leagues';
import { WelcomeSlide3Skins } from './components/WelcomeSlide3Skins';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'WelcomeCarousel'>;

interface SlideItem {
  key: string;
  render: (props: {
    onGetStarted: () => void;
    onLogIn: () => void;
  }) => React.ReactNode;
}

const SLIDES: SlideItem[] = [
  { key: 'intro', render: () => <WelcomeSlide0Intro /> },
  { key: 'compete', render: () => <WelcomeSlide1Compete /> },
  { key: 'leagues', render: () => <WelcomeSlide2Leagues /> },
  {
    key: 'skins',
    render: ({ onGetStarted, onLogIn }) => (
      <WelcomeSlide3Skins onGetStarted={onGetStarted} onLogIn={onLogIn} />
    ),
  },
];

const LAST_INDEX = SLIDES.length - 1;

function WelcomeCarouselContent({ navigation }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { markSeen } = useHasSeenWelcome();

  const flatListRef = useRef<FlatList<SlideItem>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToAuth = useCallback(
    (target: 'Login' | 'Signup') => {
      navigation.replace(target);
      void markSeen();
    },
    [markSeen, navigation]
  );

  const handleSkip = useCallback(() => {
    goToAuth('Login');
  }, [goToAuth]);

  const handleGetStarted = useCallback(() => {
    goToAuth('Signup');
  }, [goToAuth]);

  const handleLogIn = useCallback(() => {
    goToAuth('Login');
  }, [goToAuth]);

  const handleDotPress = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderItem = useCallback(
    ({ item }: { item: SlideItem }) => (
      <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
        {item.render({
          onGetStarted: handleGetStarted,
          onLogIn: handleLogIn,
        })}
      </View>
    ),
    [handleGetStarted, handleLogIn]
  );

  const getItemLayout = useMemo(
    () => (_: ArrayLike<SlideItem> | null | undefined, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    []
  );

  const isLastSlide = currentIndex === LAST_INDEX;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!isLastSlide && (
        <TouchableOpacity
          style={[styles.skipButton, { top: insets.top + spacing.md }]}
          onPress={handleSkip}
          accessibilityLabel="Skip welcome tour"
          accessibilityRole="button"
        >
          <Text style={[styles.skipLabel, { color: colors.textSecondary }]}>
            Skip
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
      />

      <View
        style={[styles.dotsContainer, { bottom: insets.bottom + spacing.lg }]}
      >
        <OnboardingDots
          totalSteps={SLIDES.length}
          currentStep={currentIndex}
          onDotPress={handleDotPress}
        />
      </View>
    </View>
  );
}

export default function WelcomeCarouselScreen(props: Props) {
  return (
    <ThemeProvider forceMode="dark">
      <StatusBar style="light" />
      <WelcomeCarouselContent {...props} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 10,
    padding: spacing.sm,
  },
  skipLabel: {
    ...typography.bodyBold,
  },
  slide: {
    flex: 1,
  },
  dotsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
