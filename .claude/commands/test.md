---
description: Write comprehensive tests for components, routes, or features
---

[TEST] Write tests for the following:

**Target:** {{arg1}}

## Requirements
1. **Specify platform**: mobile or web testing
2. Use appropriate testing approach based on target type and platform

## Testing Strategy by Type

### For Web Components (Remix)
- Use React Testing Library
- Test user interactions (clicks, typing, etc.)
- Test accessibility (ARIA, keyboard navigation)
- Test different prop combinations
- Test error states

### For Mobile Components (React Native)
- Use React Native Testing Library
- Test user interactions (press, text input)
- Test accessibility (accessibilityLabel, role)
- Test platform-specific behaviors
- Mock NativeBase components if needed

### For Web Routes (Remix)
- Test loader function with mock data
- Test action function with FormData
- Test error handling (404, 500, validation errors)
- Test authentication requirements
- Mock API client

### For Mobile Screens (React Native)
- Test data fetching with TanStack Query
- Test loading/error states
- Test user interactions
- Mock React Navigation
- Mock API client

### For E2E Flows
- **Web**: Use Playwright
- **Mobile**: Use Maestro or Detox
- Test critical user journeys
- Test across different states
- Test error scenarios

## Test Structure
```typescript
describe('{{arg1}}', () => {
  // Setup
  beforeEach(() => {
    // Reset mocks, setup test data
  });

  it('renders correctly', () => {
    // Render and assert
  });

  it('handles user interaction', async () => {
    // User event and assert
  });

  it('handles errors gracefully', () => {
    // Error case and assert
  });
});
```

## Additional Context
{{arg2}}

## Verification

After writing tests:
1. Run tests to confirm they pass: `pnpm test`
2. Run type check: `pnpm typecheck`
3. Run lint check: `pnpm lint`
4. Fix any errors or warnings that were introduced
5. Show coverage results
