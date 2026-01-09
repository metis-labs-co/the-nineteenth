---
description: Create a structured plan document by exploring the codebase and breaking down a goal into executable tasks
---

[PLAN CREATOR] Create a structured plan document for the given goal.

**Goal:** {{arg1}}
**Additional Context:** {{arg2}}

---

## Step 1: Understand the Goal

{{#if arg1}}
The user wants to plan: **{{arg1}}**
{{else}}
**No goal provided.** Use the AskUserQuestion tool to ask:
- "What would you like to plan? Please describe the feature, migration, or task you want to accomplish."
{{/if}}

---

## Step 2: Determine Scope and Target App

1. Identify which app(s) this plan affects:
   - `apps/marketing` - Marketing website
   - `apps/saunas` - Saunas e-commerce
   - `apps/apparel` - Apparel store
   - `packages/*` - Shared packages
   - Multiple apps or monorepo-wide

2. If unclear, use AskUserQuestion to ask which app(s) to target.

3. Determine the output path:
   - Single app: `apps/<app>/docs/plans/<plan-name>.md`
   - Multiple apps: `docs/plans/<plan-name>.md` (root level)
   - Generate `<plan-name>` as kebab-case from the goal

---

## Step 3: Explore the Codebase

**CRITICAL:** Before designing the plan, you MUST explore the codebase to understand:

1. **Current state** - What exists today that's relevant to this goal?
2. **Patterns** - What patterns and conventions does this codebase use?
3. **Dependencies** - What libraries, packages, or APIs are involved?
4. **Constraints** - What limitations or requirements exist?

Use the Task tool with `subagent_type: "Explore"` to investigate:
- Relevant files and directories
- Existing implementations to reference
- Related components or routes
- Configuration files

---

## Step 4: Ask Clarifying Questions

**CRITICAL:** Before finalizing the plan, use AskUserQuestion to clarify:

1. **Scope:** What's in scope vs out of scope?
2. **Priorities:** What's most important to get right?
3. **Constraints:** Any technical or business constraints?
4. **Preferences:** Any preferred approaches or patterns?
5. **Dependencies:** Any external dependencies (APIs, credentials, manual steps)?

Do NOT proceed with assumptions. Ask questions to ensure alignment.

---

## Step 5: Design the Plan Structure

Break down the goal into:

1. **Phases** - Major milestones (e.g., "Phase 1: Setup", "Phase 2: Core Features")
2. **Steps** - Individual tasks within each phase
3. **Order** - Dependencies between steps

For each step, determine:
- Can an existing command handle this? (`/component`, `/route`, `/api`, `/db`, `/docs`)
- Or does it need custom instructions?

---

## Step 6: Write the Plan Document

Create a markdown document with this structure:

```markdown
# Plan: [Goal Title]

## Overview
[Brief description of what this plan accomplishes]

## Approach
[High-level approach and key decisions]

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ... | ... | ... |

---

## Phase 1: [Phase Name]

### Step 1.1: [Task Name]
**Status:** ⏳ Pending
**Type:** [Manual | Command | Custom]
**Command:** `/component ComponentName` (or "N/A" for custom tasks)

**Prompt:**
\`\`\`
[Detailed instructions for executing this task]
[Include all context, requirements, and acceptance criteria]
[Reference specific files, patterns, and examples from the codebase]
\`\`\`

**Deliverables:**
- [ ] File or outcome 1
- [ ] File or outcome 2

**Dependencies:** None (or "Step X.Y")
**Notes:** [Any additional context]

---

### Step 1.2: [Next Task]
...

---

## Phase 2: [Next Phase]
...

---

## Critical Files

### To Modify
- `path/to/file.ts` - Description of changes

### To Create
- `path/to/new/file.ts` - Description

### To Delete (if any)
- `path/to/old/file.ts` - Reason for deletion

---

## Verification

How to verify the plan is complete:
- [ ] Verification step 1
- [ ] Verification step 2
```

---

## Step 7: Create the Document

1. Write the plan document to the determined output path
2. Ensure each step has:
   - Clear status indicator (`⏳ Pending`)
   - Command if applicable (prefer existing: `/component`, `/route`, `/api`, `/db`, `/docs`)
   - Detailed prompt with full context
   - Deliverables checklist
   - Dependencies noted

3. The plan must be compatible with `/execute-plan` command

---

## Step 8: Report to User

After creating the plan document:

1. Confirm the output path
2. Summarize the plan structure (phases, number of steps)
3. Highlight any manual steps or external dependencies
4. Ask if they want to review or modify anything before executing

**Example response:**
```
I've created your plan at `apps/apparel/docs/plans/hydrogen-migration.md`

**Summary:**
- 3 phases, 14 steps total
- 1 manual step (Shopify store setup)
- Estimated commands: 8x /component, 4x /route, 2x custom

**Next steps:**
- Review the plan document
- Complete any manual prerequisites
- Run `/execute-plan apps/apparel/docs/plans/hydrogen-migration.md` to start

Would you like me to walk through any specific phase or make changes?
```

---

## Available Commands Reference

When assigning commands to steps, prefer these existing skills:

| Command | Use For |
|---------|---------|
| `/component <Name>` | Creating React components with TypeScript and CSS Modules |
| `/route <path>` | Creating Remix routes with loaders/actions and page components |
| `/api <endpoint>` | Creating API routes for integrations and webhooks |
| `/db <description>` | Designing database schemas with tables, RLS, indexes |
| `/docs <path>` | Generating or updating documentation files |

For tasks outside these commands, use `**Type:** Custom` with detailed instructions.
