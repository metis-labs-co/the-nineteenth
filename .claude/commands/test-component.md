# Component Test Implementation

Implement tests and Storybook stories for the next untested component from the Component Testing Plan.

## Instructions

1. **Read the plan** at `docs/progress/COMPONENT_TESTING_PLAN.md` to find the next component to test (prioritize by tier - Tier 1 first, then Tier 2, etc.)

2. **Read the component** to understand:
   - Props and their types
   - Internal state and hooks used
   - Child components that need mocking
   - User interactions (buttons, inputs, gestures)
   - Edge cases (empty data, loading, errors)

3. **Read existing test examples** for patterns:
   - `src/components/common/BottomSheet/BottomSheet.test.tsx`
   - `src/components/scorecard/ScorecardTable/ScorecardTable.test.tsx`
   - `src/components/leaderboard/RoundLeaderboard.test.tsx`
   - `src/components/scoring/ScoringPairFormationUI/ScoringPairFormationUI.test.tsx`

4. **Create the test file** (`ComponentName.test.tsx`) in the same directory as the component with:
   - Proper mocks for icons (use `require` inside factory functions)
   - Proper mocks for hooks and child components
   - Tests for: rendering, props, interactions, state changes, edge cases
   - Use `renderHelpers.tsx` and `testFixtures.ts` where applicable

5. **Create the stories file** (`ComponentName.stories.tsx`) in the same directory with:
   - Meta configuration with proper title path
   - Stories showing different prop combinations
   - Stories for edge cases (empty, loading, error states)

6. **Run the tests** to verify they pass:
   ```bash
   pnpm test -- --testPathPattern="ComponentName" --watch=false
   ```

7. **Update the plan document** (`docs/progress/COMPONENT_TESTING_PLAN.md`):
   - Move the component from "Needing Tests" to "WITH Tests" table
   - Update the count statistics
   - Mark the current tier's status if all components in it are done

8. **Report results** to user:
   - Component name and location
   - Number of tests written
   - Number of stories created
   - Test pass/fail status
   - Any issues encountered

## Mocking Patterns

### Icons (Tabler)
```typescript
jest.mock('@tabler/icons-react-native', () => {
  const { View } = require('react-native');
  return {
    IconGolf: (props: any) => <View testID="icon-golf" {...props} />,
    IconUsers: (props: any) => <View testID="icon-users" {...props} />,
  };
});
```

### Child Components
```typescript
jest.mock('@/components/common/LoadingSpinner', () => {
  const { View, Text } = require('react-native');
  return {
    LoadingSpinner: () => <View testID="loading-spinner"><Text>Loading...</Text></View>,
  };
});
```

### Hooks
```typescript
jest.mock('@/hooks/useSomeHook', () => ({
  useSomeHook: jest.fn(() => ({
    data: mockData,
    isLoading: false,
    error: null,
  })),
}));
```

### Navigation
```typescript
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));
```

## Test Structure Template

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ComponentName } from './ComponentName';

// Mocks here...

describe('ComponentName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {});
    it('renders with required props', () => {});
  });

  describe('Props', () => {
    it('handles prop X correctly', () => {});
  });

  describe('Interactions', () => {
    it('calls onPress when button tapped', () => {});
  });

  describe('Edge Cases', () => {
    it('handles empty data', () => {});
    it('handles null values', () => {});
  });
});
```

## Stories Structure Template

```typescript
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta: Meta<typeof ComponentName> = {
  title: 'Category/ComponentName',
  component: ComponentName,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ComponentName>;

export const Default: Story = {
  args: { /* default props */ },
};

export const WithCustomProps: Story = {
  args: { /* custom props */ },
};

export const EmptyState: Story = {
  args: { /* empty data */ },
};
```
