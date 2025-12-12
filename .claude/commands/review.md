---
description: Review code for best practices, patterns, and potential issues
---

Review the following code: {{arg1}}

## Review Checklist

**IMPORTANT**: Specify if reviewing mobile or web code for platform-specific checks.

### Mobile Screens (React Native)
- [ ] React Navigation pattern with proper type safety
- [ ] TanStack Query for data fetching
- [ ] Loading/error/empty states with theme colors
- [ ] Uses `useThemeColors()` hook for all colors
- [ ] Colors applied inline (not in StyleSheet.create)
- [ ] Static tokens from @/constants/theme.ts (spacing, typography, etc.)
- [ ] Accessibility (accessibilityLabel, accessibilityRole)
- [ ] Keyboard handling (KeyboardAvoidingView)
- [ ] Safe area handling (useSafeAreaInsets)

### Mobile Components (React Native)
- [ ] TypeScript interface for props
- [ ] Uses `useThemeColors()` hook for colors
- [ ] Colors applied inline (not in StyleSheet.create)
- [ ] Static tokens from @/constants/theme.ts (spacing, typography, etc.)
- [ ] Accessibility (accessibilityLabel, accessibilityRole)
- [ ] Platform-specific code handled
- [ ] Proper touch feedback (Pressable with visual feedback)
- [ ] Dark mode supported via theme hook

### Database
- [ ] RLS policies enabled
- [ ] Proper indexes
- [ ] Multi-tenant isolation
- [ ] Updated_at triggers
- [ ] Audit logging (if needed)

### Security
- [ ] Authentication checks
- [ ] Authorization (user can access this data?)
- [ ] Input sanitization
- [ ] SQL injection prevention (using parameterized queries)
- [ ] XSS prevention

### Performance
- [ ] Proper indexes on queries
- [ ] Parallel data fetching where possible
- [ ] Pagination for large datasets
- [ ] Caching headers where appropriate

## Additional Focus
{{arg2}}

Provide specific, actionable feedback with code examples.
