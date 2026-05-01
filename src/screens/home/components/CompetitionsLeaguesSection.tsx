/**
 * CompetitionsLeaguesSection - horizontal scroll of active comps + leagues.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { Competition } from '@/types';
import type { League } from '@/types/database/league.types';
import { SectionHeader } from './SectionHeader';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface CompetitionsLeaguesSectionProps {
  competitions: Competition[];
  leagues: League[];
}

type CardItem =
  | { kind: 'competition'; id: string; name: string; status: string }
  | { kind: 'league'; id: string; name: string; status: string };

export const CompetitionsLeaguesSection = React.memo(
  function CompetitionsLeaguesSection({
    competitions,
    leagues,
  }: CompetitionsLeaguesSectionProps) {
    const colors = useThemeColors();
    const navigation = useNavigation<Nav>();

    const items: CardItem[] = [
      ...competitions.map<CardItem>((c) => ({
        kind: 'competition',
        id: c.id,
        name: c.name,
        status: c.status,
      })),
      ...leagues.map<CardItem>((l) => ({
        kind: 'league',
        id: l.id,
        name: l.name,
        status: l.status,
      })),
    ];

    if (items.length === 0) return null;

    const handlePress = (item: CardItem) => {
      if (item.kind === 'competition') {
        navigation.navigate('CompetitionDetail', { id: item.id });
      } else {
        navigation.navigate('LeagueDetail', { id: item.id });
      }
    };

    return (
      <View style={styles.container}>
        <SectionHeader title="Your competitions & leagues" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {items.map((item) => (
            <TouchableOpacity
              key={`${item.kind}-${item.id}`}
              onPress={() => handlePress(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.kind === 'competition' ? 'Competition' : 'League'}: ${item.name}`}
              style={[
                styles.card,
                shadows.sm,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      item.kind === 'competition'
                        ? colors.primaryLighter
                        : colors.infoLight ?? colors.primaryLighter,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        item.kind === 'competition'
                          ? colors.primaryDark
                          : colors.infoDark ?? colors.primaryDark,
                    },
                  ]}
                >
                  {item.kind === 'competition' ? 'Comp' : 'League'}
                </Text>
              </View>
              <Text
                style={[styles.name, { color: colors.textPrimary }]}
                numberOfLines={2}
              >
                {item.name}
              </Text>
              <Text
                style={[styles.status, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {formatStatus(item.status)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }
);

function formatStatus(s: string): string {
  switch (s) {
    case 'in-progress':
      return 'In progress';
    case 'upcoming':
      return 'Upcoming';
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    default:
      return s;
  }
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  card: {
    width: 200,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  name: {
    ...typography.body,
    fontWeight: '700',
    minHeight: 44,
  },
  status: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
