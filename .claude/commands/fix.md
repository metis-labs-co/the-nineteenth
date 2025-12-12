---
description: Fix a bug or issue with detailed diagnosis and solution
---

Fix the following issue: {{arg1}}

## Debugging Process

### 1. Understand the Problem
- What is the expected behavior?
- What is the actual behavior?
- What are the error messages (if any)?
- When does it occur?

### 2. Locate the Issue
- Which file(s) are involved?
- Is it client-side or server-side?
- Is it a route, component, or database issue?

### 3. Common Issue Patterns

#### Route Issues
- Split files instead of single-file pattern?
- Missing `requireAuth` check?
- Loader/action type errors?
- FormData not parsed correctly?

#### Database Issues
- RLS blocking the query?
- Missing indexes causing slow queries?
- Foreign key constraints failing?
- Types out of sync with schema?

#### Component Issues
- Props not typed correctly?
- CSS Modules not imported?
- Event handlers not bound?
- State updates causing re-renders?

#### Authentication Issues
- Session not being passed correctly?
- Cookies not set properly?
- RLS policies too restrictive?

### 4. Implement Fix
- Make minimal changes to fix the issue
- Ensure fix doesn't break other functionality
- Add error handling to prevent recurrence

### 5. Test the Fix
- Verify the original issue is resolved
- Test edge cases
- Ensure no regressions

## Additional Context
{{arg2}}

Show the diagnosis, the fix, and verification steps.
