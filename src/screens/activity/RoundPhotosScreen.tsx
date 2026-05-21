/**
 * RoundPhotosScreen - a single round's shared photo album.
 *
 * Hosts the RoundPhotoAlbum (grid + multi-select add + delete-own). Reached
 * from the score-entry footer so players can add photos mid-round. Reusable
 * from other round surfaces (e.g. ViewRound) later.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, layout } from '@/constants/theme';
import { PageHeader } from '@/components/common';
import { RoundPhotoAlbum } from '@/components/activity';
import type { RootStackScreenProps } from '@/navigation/types';

type Props = RootStackScreenProps<'RoundPhotos'>;

export default function RoundPhotosScreen({ navigation, route }: Props) {
  const { roundId } = route.params;
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        variant="centered"
        title="Round Photos"
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <RoundPhotoAlbum roundId={roundId} canAdd />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl,
  },
});
