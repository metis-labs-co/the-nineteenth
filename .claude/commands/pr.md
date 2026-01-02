# Create Pull Request

Create a pull request for the current branch and push to remote.

## Instructions

1. First, check the current git status and branch:
   - Run `git status` to see uncommitted changes
   - Run `git branch --show-current` to get current branch name
   - Run `git log main..HEAD --oneline` to see commits on this branch

2. If there are uncommitted changes, ask the user if they want to commit them first.

3. Check if the branch has been pushed to remote:
   - Run `git status -sb` to check tracking status
   - If not pushed, push with `git push -u origin <branch-name>`

4. Analyze all commits on this branch (since diverging from main):
   - Run `git diff main...HEAD` to see all changes
   - Summarize the purpose and scope of changes

5. Before creating the PR, run verification checks:
   - Run `pnpm typecheck` to ensure no type errors
   - Run `pnpm lint` to ensure no lint errors
   - Fix any issues before proceeding

6. Create the PR using GitHub CLI:
   ```bash
   gh pr create --title "<concise title>" --body "$(cat <<'EOF'
   ## Summary
   <bullet points describing what this PR does>

   ## Changes
   <list of key changes made>

   ## Test Plan
   - [ ] <testing checklist items>

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```

7. Return the PR URL to the user.

## Notes
- Use the main branch as the base branch
- Keep the title concise but descriptive
- Include relevant context in the summary
- Add appropriate test plan items based on the changes
