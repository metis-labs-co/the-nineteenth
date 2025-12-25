/**
 * FilterPill Storybook Stories
 *
 * Stories for the pill-shaped toggle button used for filtering content.
 * Demonstrates different states, interactions, and use cases.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { Meta, StoryObj } from '@storybook/react';
import { FilterPill, FilterPillProps } from './FilterPill';

const meta: Meta<typeof FilterPill> = {
  title: 'Common/FilterPill',
  component: FilterPill,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <View style={styles.container}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    label: {
      control: 'text',
      description: 'The text label displayed inside the pill',
    },
    selected: {
      control: 'boolean',
      description: 'Whether the pill is currently selected/active',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the pill is disabled',
    },
    accessibilityLabel: {
      control: 'text',
      description: 'Custom accessibility label',
    },
    onPress: {
      action: 'pressed',
      description: 'Callback when the pill is pressed',
    },
  },
};

export default meta;
type Story = StoryObj<typeof FilterPill>;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    minWidth: 300,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#374151',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  scrollableFilterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  spacer: {
    height: 16,
  },
});

// =========================================================================
// BASIC STORIES
// =========================================================================

export const Default: Story = {
  args: {
    label: 'Active',
    selected: false,
    disabled: false,
  },
};

export const Selected: Story = {
  args: {
    label: 'Active',
    selected: true,
    disabled: false,
  },
};

export const Unselected: Story = {
  args: {
    label: 'Completed',
    selected: false,
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Locked',
    selected: false,
    disabled: true,
  },
};

export const SelectedAndDisabled: Story = {
  args: {
    label: 'Selected Disabled',
    selected: true,
    disabled: true,
  },
};

// =========================================================================
// LABEL VARIATIONS
// =========================================================================

export const ShortLabel: Story = {
  args: {
    label: 'All',
    selected: true,
  },
};

export const LongLabel: Story = {
  args: {
    label: 'All Competitions',
    selected: false,
  },
};

export const VeryLongLabel: Story = {
  args: {
    label: 'Upcoming This Weekend',
    selected: true,
  },
};

export const NumericLabel: Story = {
  args: {
    label: '8+ Players',
    selected: false,
  },
};

export const WithEmoji: Story = {
  args: {
    label: 'Golf Events',
    selected: true,
  },
};

// =========================================================================
// ACCESSIBILITY STORIES
// =========================================================================

export const WithCustomAccessibilityLabel: Story = {
  args: {
    label: 'Active',
    selected: true,
    accessibilityLabel: 'Show only active competitions',
  },
};

export const AccessibilityUnselected: Story = {
  args: {
    label: 'Past',
    selected: false,
    accessibilityLabel: 'Show past competitions',
  },
};

// =========================================================================
// INTERACTIVE STORIES
// =========================================================================

/**
 * Interactive toggle demonstration
 */
export const InteractiveToggle: Story = {
  render: function ToggleStory() {
    const [selected, setSelected] = useState(false);
    return (
      <View>
        <FilterPill
          label={selected ? 'Selected' : 'Not Selected'}
          selected={selected}
          onPress={() => setSelected(!selected)}
        />
        <View style={styles.spacer} />
        <Text style={{ fontSize: 12, color: '#6B7280' }}>
          Tap to toggle state
        </Text>
      </View>
    );
  },
};

/**
 * Exclusive selection filter bar (like radio buttons)
 */
export const ExclusiveFilterBar: Story = {
  render: function FilterBarStory() {
    const [activeFilter, setActiveFilter] = useState('all');
    const filters = ['All', 'Active', 'Completed', 'Upcoming'];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Competition Status</Text>
        <View style={styles.filterBar}>
          {filters.map((filter) => (
            <FilterPill
              key={filter}
              label={filter}
              selected={activeFilter === filter.toLowerCase()}
              onPress={() => setActiveFilter(filter.toLowerCase())}
            />
          ))}
        </View>
      </View>
    );
  },
};

/**
 * Multi-select filter bar (like checkboxes)
 */
export const MultiSelectFilterBar: Story = {
  render: function MultiSelectStory() {
    const [selectedFilters, setSelectedFilters] = useState<string[]>(['stableford']);
    const filters = ['Stableford', 'Stroke Play', 'Match Play', 'Best Ball'];

    const toggleFilter = (filter: string) => {
      const key = filter.toLowerCase().replace(' ', '-');
      if (selectedFilters.includes(key)) {
        setSelectedFilters(selectedFilters.filter((f) => f !== key));
      } else {
        setSelectedFilters([...selectedFilters, key]);
      }
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Game Types</Text>
        <View style={styles.filterBar}>
          {filters.map((filter) => (
            <FilterPill
              key={filter}
              label={filter}
              selected={selectedFilters.includes(filter.toLowerCase().replace(' ', '-'))}
              onPress={() => toggleFilter(filter)}
            />
          ))}
        </View>
        <View style={styles.spacer} />
        <Text style={{ fontSize: 12, color: '#6B7280' }}>
          Selected: {selectedFilters.length > 0 ? selectedFilters.join(', ') : 'None'}
        </Text>
      </View>
    );
  },
};

/**
 * Scrollable filter bar for many options
 */
export const ScrollableFilterBar: Story = {
  render: function ScrollableStory() {
    const [activeFilter, setActiveFilter] = useState('vic');
    const filters = ['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Filter by State</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollableFilterBar}
        >
          <View style={styles.filterBar}>
            {filters.map((filter) => (
              <FilterPill
                key={filter}
                label={filter}
                selected={activeFilter === filter.toLowerCase()}
                onPress={() => setActiveFilter(filter.toLowerCase())}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  },
};

// =========================================================================
// STATE COMBINATIONS
// =========================================================================

export const AllStates: Story = {
  render: () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>All States</Text>
      <View style={styles.row}>
        <FilterPill label="Default" selected={false} onPress={() => {}} />
        <FilterPill label="Selected" selected onPress={() => {}} />
        <FilterPill label="Disabled" selected={false} disabled onPress={() => {}} />
        <FilterPill
          label="Selected + Disabled"
          selected
          disabled
          onPress={() => {}}
        />
      </View>
    </View>
  ),
};

// =========================================================================
// USE CASE STORIES
// =========================================================================

export const CompetitionStatusFilter: Story = {
  render: function CompetitionStatusStory() {
    const [status, setStatus] = useState('all');

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Competition Status</Text>
        <View style={styles.filterBar}>
          <FilterPill
            label="All"
            selected={status === 'all'}
            onPress={() => setStatus('all')}
            accessibilityLabel="Show all competitions"
          />
          <FilterPill
            label="Active"
            selected={status === 'active'}
            onPress={() => setStatus('active')}
            accessibilityLabel="Show active competitions"
          />
          <FilterPill
            label="Completed"
            selected={status === 'completed'}
            onPress={() => setStatus('completed')}
            accessibilityLabel="Show completed competitions"
          />
          <FilterPill
            label="Draft"
            selected={status === 'draft'}
            onPress={() => setStatus('draft')}
            accessibilityLabel="Show draft competitions"
          />
        </View>
      </View>
    );
  },
};

export const RoundStatusFilter: Story = {
  render: function RoundStatusStory() {
    const [status, setStatus] = useState('upcoming');

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Round Status</Text>
        <View style={styles.filterBar}>
          <FilterPill
            label="Upcoming"
            selected={status === 'upcoming'}
            onPress={() => setStatus('upcoming')}
          />
          <FilterPill
            label="In Progress"
            selected={status === 'inprogress'}
            onPress={() => setStatus('inprogress')}
          />
          <FilterPill
            label="Completed"
            selected={status === 'completed'}
            onPress={() => setStatus('completed')}
          />
        </View>
      </View>
    );
  },
};

export const GameTypeFilter: Story = {
  render: function GameTypeStory() {
    const [selected, setSelected] = useState<string[]>([]);

    const toggleType = (type: string) => {
      if (selected.includes(type)) {
        setSelected(selected.filter((t) => t !== type));
      } else {
        setSelected([...selected, type]);
      }
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Game Type (Multi-Select)</Text>
        <View style={styles.filterBar}>
          <FilterPill
            label="Stableford"
            selected={selected.includes('stableford')}
            onPress={() => toggleType('stableford')}
          />
          <FilterPill
            label="Stroke Play"
            selected={selected.includes('strokeplay')}
            onPress={() => toggleType('strokeplay')}
          />
          <FilterPill
            label="Match Play"
            selected={selected.includes('matchplay')}
            onPress={() => toggleType('matchplay')}
          />
        </View>
      </View>
    );
  },
};

export const DateRangeFilter: Story = {
  render: function DateRangeStory() {
    const [range, setRange] = useState('thisweek');

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date Range</Text>
        <View style={styles.filterBar}>
          <FilterPill
            label="Today"
            selected={range === 'today'}
            onPress={() => setRange('today')}
          />
          <FilterPill
            label="This Week"
            selected={range === 'thisweek'}
            onPress={() => setRange('thisweek')}
          />
          <FilterPill
            label="This Month"
            selected={range === 'thismonth'}
            onPress={() => setRange('thismonth')}
          />
          <FilterPill
            label="All Time"
            selected={range === 'alltime'}
            onPress={() => setRange('alltime')}
          />
        </View>
      </View>
    );
  },
};

export const PlayerCountFilter: Story = {
  render: function PlayerCountStory() {
    const [count, setCount] = useState('any');

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Player Count</Text>
        <View style={styles.filterBar}>
          <FilterPill
            label="Any"
            selected={count === 'any'}
            onPress={() => setCount('any')}
          />
          <FilterPill
            label="4-8"
            selected={count === 'small'}
            onPress={() => setCount('small')}
          />
          <FilterPill
            label="8-16"
            selected={count === 'medium'}
            onPress={() => setCount('medium')}
          />
          <FilterPill
            label="16+"
            selected={count === 'large'}
            onPress={() => setCount('large')}
          />
        </View>
      </View>
    );
  },
};

export const WithLockedFilters: Story = {
  render: function LockedFiltersStory() {
    const [filter, setFilter] = useState('free');

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features (Some Locked)</Text>
        <View style={styles.filterBar}>
          <FilterPill
            label="Free"
            selected={filter === 'free'}
            onPress={() => setFilter('free')}
          />
          <FilterPill
            label="Social"
            selected={filter === 'social'}
            onPress={() => setFilter('social')}
          />
          <FilterPill
            label="Premium"
            selected={false}
            disabled
            onPress={() => {}}
            accessibilityLabel="Premium features - upgrade required"
          />
        </View>
        <View style={styles.spacer} />
        <Text style={{ fontSize: 12, color: '#6B7280' }}>
          Premium filter requires subscription upgrade
        </Text>
      </View>
    );
  },
};

// =========================================================================
// CUSTOM STYLING STORIES
// =========================================================================

export const WithCustomMargin: Story = {
  args: {
    label: 'Custom Margin',
    selected: true,
    style: { marginHorizontal: 16 },
  },
};

export const WithCustomPadding: Story = {
  args: {
    label: 'Custom Padding',
    selected: false,
    style: { paddingHorizontal: 24, paddingVertical: 12 },
  },
};

// =========================================================================
// EDGE CASES
// =========================================================================

export const EmptyLabel: Story = {
  args: {
    label: '',
    selected: false,
  },
};

export const VeryLongSingleWord: Story = {
  args: {
    label: 'Supercalifragilisticexpialidocious',
    selected: false,
  },
};

export const SpecialCharacters: Story = {
  args: {
    label: '#1 @Best!',
    selected: true,
  },
};

export const UnicodeCharacters: Story = {
  args: {
    label: 'Cafe Aussie',
    selected: false,
  },
};
