/**
 * TeamFormatSelector Stories
 *
 * Storybook stories for the TeamFormatSelector component.
 * Demonstrates different states, selections, and interactions.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View, StyleSheet, Text } from 'react-native';
import { TeamFormatSelector } from './TeamFormatSelector';
import type { TeamFormat } from '@/types/database.types';

// ============================================================================
// META CONFIGURATION
// ============================================================================

const meta: Meta<typeof TeamFormatSelector> = {
  title: 'Competition Wizard/TeamFormatSelector',
  component: TeamFormatSelector,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <View style={styles.container}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    value: {
      control: 'select',
      options: [null, 'best-ball', 'scramble', 'aggregate', 'match-play-team'],
      description: 'Currently selected team format',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the selector is disabled',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
  },
};

export default meta;
type Story = StoryObj<typeof TeamFormatSelector>;

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    minHeight: 500,
  },
  wrapper: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
  header: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  subheader: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  stateDisplay: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  stateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  stateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E7F5E',
    marginTop: 4,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
});

// ============================================================================
// INTERACTIVE WRAPPER
// ============================================================================

const InteractiveWrapper = ({
  initialValue = null,
  disabled = false,
  error,
}: {
  initialValue?: TeamFormat | null;
  disabled?: boolean;
  error?: string;
}) => {
  const [value, setValue] = useState<TeamFormat | null>(initialValue);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Select Team Format</Text>
      <TeamFormatSelector
        value={value}
        onChange={setValue}
        disabled={disabled}
        error={error}
      />
      <View style={styles.stateDisplay}>
        <Text style={styles.stateText}>Selected Value:</Text>
        <Text style={styles.stateValue}>{value || '(none)'}</Text>
      </View>
    </View>
  );
};

// ============================================================================
// DEFAULT STORIES
// ============================================================================

export const Default: Story = {
  args: {
    value: 'best-ball',
    onChange: () => {},
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <TeamFormatSelector {...args} />
    </View>
  ),
};

export const Interactive: Story = {
  render: () => <InteractiveWrapper />,
};

export const NoSelection: Story = {
  args: {
    value: null,
    onChange: () => {},
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>No Format Selected</Text>
      <TeamFormatSelector {...args} />
    </View>
  ),
};

// ============================================================================
// SELECTION STATES
// ============================================================================

export const BestBallSelected: Story = {
  args: {
    value: 'best-ball',
    onChange: () => {},
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Best Ball Selected</Text>
      <Text style={styles.subheader}>Best individual score from each team counts</Text>
      <TeamFormatSelector {...args} />
    </View>
  ),
};

export const ScrambleSelected: Story = {
  args: {
    value: 'scramble',
    onChange: () => {},
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Scramble Selected</Text>
      <Text style={styles.subheader}>Team plays from best shot each time</Text>
      <TeamFormatSelector {...args} />
    </View>
  ),
};

export const AggregateSelected: Story = {
  args: {
    value: 'aggregate',
    onChange: () => {},
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Aggregate Selected</Text>
      <Text style={styles.subheader}>Combined team score counts</Text>
      <TeamFormatSelector {...args} />
    </View>
  ),
};

export const TeamMatchPlaySelected: Story = {
  args: {
    value: 'match-play-team',
    onChange: () => {},
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Team Match Play Selected</Text>
      <Text style={styles.subheader}>Teams compete hole-by-hole</Text>
      <TeamFormatSelector {...args} />
    </View>
  ),
};

// ============================================================================
// DISABLED STATES
// ============================================================================

export const Disabled: Story = {
  args: {
    value: 'best-ball',
    onChange: () => {},
    disabled: true,
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Disabled State</Text>
      <Text style={styles.subheader}>Options cannot be changed</Text>
      <TeamFormatSelector {...args} />
    </View>
  ),
};

export const DisabledWithScramble: Story = {
  args: {
    value: 'scramble',
    onChange: () => {},
    disabled: true,
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Disabled with Scramble Selected</Text>
      <TeamFormatSelector {...args} />
    </View>
  ),
};

export const DisabledNoSelection: Story = {
  args: {
    value: null,
    onChange: () => {},
    disabled: true,
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Disabled with No Selection</Text>
      <TeamFormatSelector {...args} />
    </View>
  ),
};

// ============================================================================
// ERROR STATES
// ============================================================================

export const WithError: Story = {
  args: {
    value: null,
    onChange: () => {},
    error: 'Please select a team format',
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Error State</Text>
      <TeamFormatSelector {...args} />
    </View>
  ),
};

export const ErrorWithSelection: Story = {
  args: {
    value: 'best-ball',
    onChange: () => {},
    error: 'This format is not available for this competition',
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Error with Selection</Text>
      <TeamFormatSelector {...args} />
    </View>
  ),
};

export const RequiredFieldError: Story = {
  args: {
    value: null,
    onChange: () => {},
    error: 'Team format is required',
  },
  render: (args) => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Required Field Validation</Text>
      <Text style={styles.subheader}>User tried to continue without selecting a format</Text>
      <TeamFormatSelector {...args} />
    </View>
  ),
};

// ============================================================================
// USE CASE STORIES
// ============================================================================

export const NewTeamCompetition: Story = {
  render: () => (
    <InteractiveWrapper initialValue={null} />
  ),
};

export const EditingTeamRound: Story = {
  render: () => (
    <InteractiveWrapper initialValue="scramble" />
  ),
};

export const ViewingRoundSettings: Story = {
  render: () => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Round Settings (View Mode)</Text>
      <Text style={styles.subheader}>Settings locked after round started</Text>
      <TeamFormatSelector
        value="aggregate"
        onChange={() => {}}
        disabled
      />
    </View>
  ),
};

// ============================================================================
// TEAM FORMAT EXPLANATIONS
// ============================================================================

export const BestBallExplained: Story = {
  render: () => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Best Ball Format</Text>
      <Text style={styles.subheader}>
        Each player plays their own ball. The team score is the best (lowest)
        individual score on each hole. Great for teams with varying skill levels.
      </Text>
      <TeamFormatSelector
        value="best-ball"
        onChange={() => {}}
      />
    </View>
  ),
};

export const ScrambleExplained: Story = {
  render: () => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Scramble Format</Text>
      <Text style={styles.subheader}>
        All team members hit from the same spot, choosing the best shot each time.
        Fastest team format and great for corporate events.
      </Text>
      <TeamFormatSelector
        value="scramble"
        onChange={() => {}}
      />
    </View>
  ),
};

export const AggregateExplained: Story = {
  render: () => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Aggregate Format</Text>
      <Text style={styles.subheader}>
        All individual scores are added together for the team total.
        Every shot counts - no hiding behind teammates!
      </Text>
      <TeamFormatSelector
        value="aggregate"
        onChange={() => {}}
      />
    </View>
  ),
};

export const TeamMatchPlayExplained: Story = {
  render: () => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Team Match Play Format</Text>
      <Text style={styles.subheader}>
        Teams compete hole-by-hole. The team with the better combined score
        wins the hole. Perfect for competitive head-to-head matches.
      </Text>
      <TeamFormatSelector
        value="match-play-team"
        onChange={() => {}}
      />
    </View>
  ),
};

// ============================================================================
// FORM INTEGRATION STORIES
// ============================================================================

export const InCompetitionForm: Story = {
  render: () => {
    const [value, setValue] = useState<TeamFormat | null>(null);

    return (
      <View style={{ padding: 16, backgroundColor: '#FFFFFF' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
          Create Team Competition
        </Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
          Step 3: Team Settings
        </Text>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Team Format *</Text>
          <TeamFormatSelector
            value={value}
            onChange={setValue}
          />
          <Text style={styles.formHint}>
            Select how team scores will be calculated
          </Text>
        </View>
      </View>
    );
  },
};

export const InRoundEditModal: Story = {
  render: () => (
    <View style={{ padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
        Edit Round Settings
      </Text>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Team Format</Text>
        <TeamFormatSelector
          value="scramble"
          onChange={() => {}}
        />
      </View>
    </View>
  ),
};

export const InTeamSettingsStep: Story = {
  render: () => {
    const [format, setFormat] = useState<TeamFormat | null>('best-ball');

    return (
      <View style={{ padding: 16, backgroundColor: '#FFFFFF' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
          Team Settings
        </Text>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Scoring Format</Text>
          <TeamFormatSelector
            value={format}
            onChange={setFormat}
          />
        </View>

        <View style={styles.stateDisplay}>
          <Text style={styles.stateText}>Current Selection:</Text>
          <Text style={styles.stateValue}>{format || 'None'}</Text>
        </View>
      </View>
    );
  },
};

// ============================================================================
// SELECTION HISTORY STORY
// ============================================================================

export const SelectionHistory: Story = {
  render: () => {
    const [value, setValue] = useState<TeamFormat | null>(null);
    const [history, setHistory] = useState<string[]>([]);

    const handleChange = (newValue: TeamFormat) => {
      setValue(newValue);
      setHistory((prev) => [...prev, newValue]);
    };

    return (
      <View style={styles.wrapper}>
        <Text style={styles.header}>Selection History</Text>
        <TeamFormatSelector
          value={value}
          onChange={handleChange}
        />
        <View style={styles.stateDisplay}>
          <Text style={styles.stateText}>History:</Text>
          <Text style={styles.stateValue}>
            {history.length > 0 ? history.join(' → ') : '(no selections yet)'}
          </Text>
        </View>
      </View>
    );
  },
};

// ============================================================================
// VALIDATION SCENARIOS
// ============================================================================

export const FormValidation: Story = {
  render: () => {
    const [value, setValue] = useState<TeamFormat | null>(null);
    const [error, setError] = useState<string | undefined>();
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (newValue: TeamFormat) => {
      setValue(newValue);
      setError(undefined);
    };

    const handleSubmit = () => {
      setSubmitted(true);
      if (!value) {
        setError('Please select a team format');
      } else {
        setError(undefined);
      }
    };

    return (
      <View style={styles.wrapper}>
        <Text style={styles.header}>Form with Validation</Text>
        <TeamFormatSelector
          value={value}
          onChange={handleChange}
          error={error}
        />
        <View style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
          <Text
            style={{
              padding: 12,
              backgroundColor: '#1E7F5E',
              color: '#FFFFFF',
              borderRadius: 8,
              overflow: 'hidden',
            }}
            onPress={handleSubmit}
          >
            Submit
          </Text>
        </View>
        {submitted && !error && value && (
          <View style={[styles.stateDisplay, { backgroundColor: '#D1FAE5' }]}>
            <Text style={{ color: '#065F46' }}>
              Form submitted with: {value}
            </Text>
          </View>
        )}
      </View>
    );
  },
};

// ============================================================================
// ACCESSIBILITY STORIES
// ============================================================================

export const HighContrastMode: Story = {
  render: () => (
    <View style={[styles.wrapper, { backgroundColor: '#000000' }]}>
      <Text style={[styles.header, { color: '#FFFFFF' }]}>High Contrast (Dark Background)</Text>
      <TeamFormatSelector
        value="best-ball"
        onChange={() => {}}
      />
    </View>
  ),
};

export const LargeTouchTargets: Story = {
  render: () => (
    <View style={styles.wrapper}>
      <Text style={styles.header}>Large Touch Targets for Accessibility</Text>
      <Text style={styles.subheader}>Minimum 72px height per option</Text>
      <TeamFormatSelector
        value="scramble"
        onChange={() => {}}
      />
    </View>
  ),
};

// ============================================================================
// RESPONSIVE STORIES
// ============================================================================

export const NarrowContainer: Story = {
  render: () => (
    <View style={[styles.wrapper, { maxWidth: 300 }]}>
      <Text style={styles.header}>Narrow Container</Text>
      <TeamFormatSelector
        value="best-ball"
        onChange={() => {}}
      />
    </View>
  ),
};

export const WideContainer: Story = {
  render: () => (
    <View style={[styles.wrapper, { maxWidth: 600 }]}>
      <Text style={styles.header}>Wide Container</Text>
      <TeamFormatSelector
        value="scramble"
        onChange={() => {}}
      />
    </View>
  ),
};

// ============================================================================
// COMPARISON STORIES
// ============================================================================

export const AllFormats: Story = {
  render: () => (
    <View style={{ gap: 24 }}>
      <View style={styles.wrapper}>
        <Text style={styles.header}>Best Ball</Text>
        <TeamFormatSelector value="best-ball" onChange={() => {}} />
      </View>
      <View style={styles.wrapper}>
        <Text style={styles.header}>Scramble</Text>
        <TeamFormatSelector value="scramble" onChange={() => {}} />
      </View>
      <View style={styles.wrapper}>
        <Text style={styles.header}>Aggregate</Text>
        <TeamFormatSelector value="aggregate" onChange={() => {}} />
      </View>
      <View style={styles.wrapper}>
        <Text style={styles.header}>Team Match Play</Text>
        <TeamFormatSelector value="match-play-team" onChange={() => {}} />
      </View>
    </View>
  ),
};

export const EnabledVsDisabled: Story = {
  render: () => (
    <View style={{ gap: 24 }}>
      <View style={styles.wrapper}>
        <Text style={styles.header}>Enabled</Text>
        <TeamFormatSelector value="best-ball" onChange={() => {}} />
      </View>
      <View style={styles.wrapper}>
        <Text style={styles.header}>Disabled</Text>
        <TeamFormatSelector value="best-ball" onChange={() => {}} disabled />
      </View>
    </View>
  ),
};

export const WithAndWithoutError: Story = {
  render: () => (
    <View style={{ gap: 24 }}>
      <View style={styles.wrapper}>
        <Text style={styles.header}>Without Error</Text>
        <TeamFormatSelector value={null} onChange={() => {}} />
      </View>
      <View style={styles.wrapper}>
        <Text style={styles.header}>With Error</Text>
        <TeamFormatSelector
          value={null}
          onChange={() => {}}
          error="Team format is required"
        />
      </View>
    </View>
  ),
};
