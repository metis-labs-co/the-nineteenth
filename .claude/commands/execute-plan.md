---
description: Review a plan document, identify the next task, execute it, and update progress
---

[PLAN EXECUTOR] Execute the next task from a plan document.

**Plan Document:** {{arg1}}

## Step 1: Read and Analyze the Plan Document

1. Read the plan document at the specified path
2. Identify the structure of the plan (phases, steps, tasks)
3. Look for status indicators:
   - `✅` or `Complete` = completed tasks
   - `🔄` or `In Progress` = in-progress tasks
   - `⏳` or `Pending` = pending tasks
   - No status indicator = pending task
   - `**Status:** ✅ Complete` pattern
   - `- [x]` = completed checkbox
   - `- [ ]` = incomplete checkbox

## Step 2: Identify the Next Task

1. Find the **first incomplete task** in sequential order
2. A task is incomplete if it does NOT have:
   - ✅ status
   - `Complete` status
   - `[x]` checkbox
3. If the task is marked "Manual" or "External", inform the user and ask for confirmation before proceeding
4. Extract from the task:
   - Task name/title
   - Command to run (if specified, e.g., `/component`, `/route`, `/api`)
   - Detailed prompt/instructions
   - Files to create or modify
   - Requirements and acceptance criteria

## Step 3: Validate Before Execution

**CRITICAL: Before executing, you MUST ask the user for input if:**

1. **Confusion about the task:**
   - The task instructions are ambiguous or unclear
   - Multiple interpretations are possible
   - You're unsure which approach to take

2. **Gap identified:**
   - Missing information needed to complete the task
   - Dependencies that should have been completed first
   - Required environment variables, credentials, or configurations not documented
   - Files referenced that don't exist

3. **External dependency:**
   - Task requires manual steps (e.g., "Create Shopify dev store")
   - Task requires external API keys or access tokens
   - Task requires user action outside the codebase

4. **Significant changes:**
   - Task involves deleting files or major refactoring
   - Task might break existing functionality
   - Task requires architectural decisions not specified

**Use AskUserQuestion tool to clarify before proceeding.**

## Step 4: Execute the Task

1. If the task specifies a command (e.g., `/route products._index`):
   - Use the Skill tool to invoke that command with the appropriate arguments
   - Include any additional context from the task prompt

2. If the task is a custom implementation:
   - Follow the detailed instructions in the plan
   - Create/modify files as specified
   - Use existing components and patterns from the codebase

3. Track your work:
   - Use TodoWrite to track subtasks
   - Mark subtasks complete as you finish them

## Step 5: Update the Plan Document

After completing the task, update the plan document:

1. **Update the task status:**
   - Change status to `✅ Complete` or add `✅` marker
   - Or change `- [ ]` to `- [x]`

2. **Add completion notes (optional):**
   - Files created or modified
   - Any deviations from the original plan
   - Issues encountered and how they were resolved

3. **Update any related checklists:**
   - If the task has sub-items, mark those complete too

**Example status update:**
```markdown
### Step 2: Update package.json
**Status:** ✅ Complete (2025-01-09)

**Completed:**
- Updated dependencies to Hydrogen stack
- Added new dev scripts
- Removed react-router-dom

---
```

## Step 6: Report to User

Provide a summary including:

1. **Task completed:** What was the task?
2. **Actions taken:** What did you do?
3. **Files changed:** List of files created/modified/deleted
4. **Next task preview:** What's the next incomplete task?
5. **Any issues:** Problems encountered or decisions made

Then **ASK the user:**
- "Would you like me to proceed with the next task, or do you have any questions about what was completed?"

## Error Handling

If the task fails or cannot be completed:

1. Do NOT mark it as complete
2. Document what went wrong in the plan
3. Ask the user how to proceed:
   - Retry with different approach?
   - Skip this task?
   - Need more information?

## Additional Context
{{arg2}}
