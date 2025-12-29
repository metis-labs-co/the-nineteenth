/**
 * AICompetitionScreen - AI-powered competition creation
 *
 * Allows users to describe a competition in natural language
 * and have it automatically generated using Claude AI.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { useFriends } from '@/hooks/useFriends';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { GeneratedPreview } from '@/components/ai';

// Local components and hooks
import {
  AICompetitionHeader,
  AILoadingState,
  AIErrorState,
  AIInputState,
} from './components';
import { useAICompetitionFlow, useAILoadingAnimation } from './hooks';

export default function AICompetitionScreen() {
  const colors = useThemeColors();
  const { data: friends = [] } = useFriends();
  const { tier } = useSubscriptionContext();

  // AI competition flow
  const {
    screenState,
    prompt,
    setPrompt,
    generatedCompetition,
    errorMessage,
    isGenerating,
    isCreating,
    handleSuggestionSelect,
    handleGenerate,
    handleCreateCompetition,
    handleEditManually,
    handleBack,
    handleRetry,
  } = useAICompetitionFlow({ friendsCount: friends.length });

  // Loading animations
  const { spin, dotOpacity1, dotOpacity2, dotOpacity3, loadingStep } =
    useAILoadingAnimation(screenState === 'loading');

  // Render content based on state
  const renderContent = () => {
    switch (screenState) {
      case 'loading':
        return (
          <AILoadingState
            spin={spin}
            dotOpacity1={dotOpacity1}
            dotOpacity2={dotOpacity2}
            dotOpacity3={dotOpacity3}
            loadingStep={loadingStep}
          />
        );

      case 'preview':
        if (!generatedCompetition) return null;
        return (
          <GeneratedPreview
            competition={generatedCompetition}
            onCreateCompetition={handleCreateCompetition}
            onEditManually={handleEditManually}
            isCreating={isCreating}
          />
        );

      case 'error':
        return <AIErrorState errorMessage={errorMessage} onRetry={handleRetry} />;

      case 'input':
      default:
        return (
          <AIInputState
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={handleGenerate}
            onSuggestionSelect={handleSuggestionSelect}
            isLoading={isGenerating}
            tier={tier}
          />
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AICompetitionHeader screenState={screenState} onBack={handleBack} />
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
