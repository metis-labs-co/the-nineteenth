/**
 * AICompetitionScreen - AI-powered competition creation
 *
 * Allows users to describe a competition in natural language
 * and have it automatically generated using Claude AI.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { GeneratedPreview } from '@/components/ai';
import { ConfirmationDialog, SystemModalTheme } from '@/components/common';
import { FeatureLock } from '@/components/subscription';

// Local components and hooks
import {
  AICompetitionHeader,
  AILoadingState,
  AIErrorState,
  AIInputState,
} from './components';
import { useAICompetitionFlow, useAILoadingAnimation } from './hooks';

export default function AICompetitionScreen() {
  // NOTE: no useThemeColors()/theme reads here — they must be called inside
  // SystemModalTheme so surfaces resolve against the forced solid provider.
  // See SystemModalTheme's "CRITICAL" doc comment.
  return (
    <SystemModalTheme>
      <AICompetitionScreenContent />
    </SystemModalTheme>
  );
}

function AICompetitionScreenContent() {
  const colors = useThemeColors();
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
    dialogConfig,
    handleSuggestionSelect,
    handleGenerate,
    handleCreateCompetition,
    handleEditManually,
    handleBack,
    handleRetry,
  } = useAICompetitionFlow();

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
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <AICompetitionHeader screenState={screenState} onBack={handleBack} />
      <FeatureLock feature="ai_competition">
        <View style={styles.content}>{renderContent()}</View>
      </FeatureLock>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        confirmLabel={dialogConfig.confirmLabel}
        cancelLabel={dialogConfig.cancelLabel}
        confirmVariant={dialogConfig.confirmVariant}
        onConfirm={dialogConfig.onConfirm}
        onCancel={dialogConfig.onCancel}
        showSecondaryAction={dialogConfig.showSecondaryAction}
        secondaryActionLabel={dialogConfig.secondaryActionLabel}
        onSecondaryAction={dialogConfig.onSecondaryAction}
      />
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
