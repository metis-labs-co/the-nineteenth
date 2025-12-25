/**
 * PromptInput Storybook Stories
 *
 * Visual testing for the AI competition prompt input including:
 * - Default empty state
 * - With text content
 * - Character count variations
 * - Submit button states (enabled/disabled/loading)
 * - Custom placeholder and minimum length
 * - Edge cases
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { PromptInput } from './PromptInput';

// ============================================================================
// META CONFIGURATION
// ============================================================================

const meta: Meta<typeof PromptInput> = {
  title: 'AI/PromptInput',
  component: PromptInput,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'The current text value of the input',
    },
    onChangeText: { action: 'onChangeText' },
    onSubmit: { action: 'onSubmit' },
    isLoading: {
      control: 'boolean',
      description: 'Shows loading state on submit button',
    },
    placeholder: {
      control: 'text',
      description: 'Custom placeholder text',
    },
    minLength: {
      control: 'number',
      description: 'Minimum character length required to enable submit',
    },
  },
  decorators: [
    (Story) => (
      <View style={{ padding: 16, minHeight: 400 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PromptInput>;

// ============================================================================
// BASIC STORIES
// ============================================================================

export const Default: Story = {
  args: {
    value: '',
    isLoading: false,
  },
};

export const WithText: Story = {
  args: {
    value: 'Create a 4-round golf competition with Stableford scoring for 8 players.',
    isLoading: false,
  },
};

export const WithDetailedPrompt: Story = {
  args: {
    value: `Create a 4-round competition with the following:
- 2 teams of 4 players each
- Mix of Stableford and Best Ball formats
- Start date: January 15, 2025
- Courses: Melbourne Golf Club and Royal Melbourne`,
    isLoading: false,
  },
};

// ============================================================================
// SUBMIT BUTTON STATE STORIES
// ============================================================================

export const SubmitEnabled: Story = {
  args: {
    value: 'This is a valid prompt that meets the minimum length requirement',
    isLoading: false,
  },
};

export const SubmitDisabledTooShort: Story = {
  args: {
    value: 'Short',
    isLoading: false,
  },
};

export const SubmitDisabledEmpty: Story = {
  args: {
    value: '',
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    value: 'Create a 4-round golf competition with Stableford scoring for 8 players.',
    isLoading: true,
  },
};

// ============================================================================
// CHARACTER COUNT STORIES
// ============================================================================

export const ZeroCharacters: Story = {
  args: {
    value: '',
    isLoading: false,
  },
};

export const NearMinLength: Story = {
  args: {
    value: 'Nearly 10',
    isLoading: false,
  },
};

export const ExactlyMinLength: Story = {
  args: {
    value: '1234567890',
    isLoading: false,
  },
};

export const ShortText: Story = {
  args: {
    value: 'Short text here',
    isLoading: false,
  },
};

export const MediumText: Story = {
  args: {
    value: 'This is a medium-length prompt describing a golf competition with multiple rounds and players participating.',
    isLoading: false,
  },
};

export const LongText: Story = {
  args: {
    value: `This is a very long and detailed prompt for creating a golf competition.

I want to create a summer golf championship with the following details:

Teams:
- Team Alpha: John, Jane, Bob, Alice
- Team Beta: Mike, Sarah, Tom, Emma

Rounds:
1. Round 1 - Stableford at Melbourne Golf Club
2. Round 2 - Stroke Play at Royal Melbourne
3. Round 3 - Best Ball at Kingston Heath
4. Round 4 - Match Play at Metropolitan

Each round should be spaced one week apart starting from January 15, 2025. Players should have handicaps ranging from 5 to 25. The competition should use the honor handicap system.

Additional notes:
- Include prizes for both teams and individuals
- Track statistics for fairways hit and greens in regulation
- Allow for substitutes if needed`,
    isLoading: false,
  },
};

export const NearMaxLength: Story = {
  args: {
    value: 'A'.repeat(1950),
    isLoading: false,
  },
};

export const AtMaxLength: Story = {
  args: {
    value: 'A'.repeat(2000),
    isLoading: false,
  },
};

// ============================================================================
// CUSTOM CONFIGURATION STORIES
// ============================================================================

export const CustomPlaceholder: Story = {
  args: {
    value: '',
    placeholder: 'Enter your competition details here...',
    isLoading: false,
  },
};

export const CustomMinLength5: Story = {
  args: {
    value: 'Four',
    minLength: 5,
    isLoading: false,
  },
};

export const CustomMinLength5Met: Story = {
  args: {
    value: 'Fiver',
    minLength: 5,
    isLoading: false,
  },
};

export const CustomMinLength20: Story = {
  args: {
    value: 'This is 19 chars.',
    minLength: 20,
    isLoading: false,
  },
};

export const CustomMinLength20Met: Story = {
  args: {
    value: 'This text meets the minimum of twenty characters.',
    minLength: 20,
    isLoading: false,
  },
};

// ============================================================================
// EDGE CASES
// ============================================================================

export const WhitespaceOnly: Story = {
  args: {
    value: '          ',
    isLoading: false,
  },
};

export const LeadingTrailingWhitespace: Story = {
  args: {
    value: '   Valid prompt with spaces   ',
    isLoading: false,
  },
};

export const SpecialCharacters: Story = {
  args: {
    value: 'Create comp with @#$%^&*() symbols and émojis 🏌️⛳',
    isLoading: false,
  },
};

export const UnicodeCharacters: Story = {
  args: {
    value: 'Create a competition for 高尔夫球 (golf) with 参加者 (participants)',
    isLoading: false,
  },
};

export const MultilineText: Story = {
  args: {
    value: `Line 1: Competition name
Line 2: Number of rounds
Line 3: Game types
Line 4: Player details`,
    isLoading: false,
  },
};

export const WithNewlines: Story = {
  args: {
    value: 'First paragraph about the competition.\n\nSecond paragraph with more details.\n\nThird paragraph wrapping up.',
    isLoading: false,
  },
};

// ============================================================================
// INTERACTIVE STORIES
// ============================================================================

export const InteractiveTyping: Story = {
  render: () => {
    const [value, setValue] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSubmit = () => {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setValue('');
      }, 2000);
    };

    return (
      <PromptInput
        value={value}
        onChangeText={setValue}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    );
  },
};

export const InteractiveWithMinLength: Story = {
  render: () => {
    const [value, setValue] = React.useState('');

    return (
      <PromptInput
        value={value}
        onChangeText={setValue}
        onSubmit={() => console.log('Submitted:', value)}
        minLength={25}
        placeholder="Enter at least 25 characters..."
      />
    );
  },
};

export const InteractiveLoadingToggle: Story = {
  render: () => {
    const [value, setValue] = React.useState('This is a valid prompt for testing');
    const [isLoading, setIsLoading] = React.useState(false);

    const handleSubmit = () => {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 3000);
    };

    return (
      <PromptInput
        value={value}
        onChangeText={setValue}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    );
  },
};

// ============================================================================
// COMBINATION STORIES
// ============================================================================

export const LoadingWithLongText: Story = {
  args: {
    value: `This is a comprehensive competition request with all the details needed:

Teams: 4 teams of 4 players
Rounds: 6 rounds over 3 weekends
Formats: Mix of Stableford, Stroke, and Best Ball
Venues: Various Melbourne courses
Handicaps: Mixed skill levels from 5 to 30

Please create this competition with automatic pairing and scoring.`,
    isLoading: true,
  },
};

export const CustomConfigLoading: Story = {
  args: {
    value: 'Creating your custom competition...',
    placeholder: 'Describe what you want...',
    minLength: 15,
    isLoading: true,
  },
};

export const ReadyToSubmit: Story = {
  args: {
    value: 'Create a summer championship with 4 rounds, 12 players, and Stableford scoring at Melbourne Golf Club.',
    isLoading: false,
    minLength: 10,
  },
};

// ============================================================================
// ACCESSIBILITY STORIES
// ============================================================================

export const WithScreenReader: Story = {
  args: {
    value: 'This prompt is for accessibility testing',
    isLoading: false,
  },
  parameters: {
    a11y: { disable: false },
  },
};

export const LoadingWithScreenReader: Story = {
  args: {
    value: 'Processing your request...',
    isLoading: true,
  },
  parameters: {
    a11y: { disable: false },
  },
};
