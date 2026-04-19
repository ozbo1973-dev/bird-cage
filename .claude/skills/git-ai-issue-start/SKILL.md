---
name: git-ai-issue-start
description: Sets up the correct git branch context before implementing a GitHub issue, when the work belongs on a feature branch rather than main. Use this skill whenever the user says something like "start issue XYZ on feature branch", "implement issue off of feature/my-branch", "work on issue X using feature/my-branch as base", or gives a feature branch alongside a GitHub issue to implement. Also triggers when assigned to a GitHub issue via a comment prompt that specifies a feature branch. Always invoke this skill before writing any code when a feature branch is mentioned — don't skip it just because the user also mentioned implementation details.
---

## Purpose

This skill is designed to work in two contexts:
- **GitHub issue comment** — the user assigns you to a GitHub issue with a prompt like `@claude implement this on feature/my-branch`
- **Local conversation** — the user tells you the issue number and feature branch in chat

In both cases the goal is the same: create a short-lived `ai/issue-<number>` branch off the specified feature branch, implement the issue there using TDD, and open the PR back into the feature branch — never into `main`.

## Inputs — collect before proceeding

You need:
- **Feature branch** — e.g., `feature/my-new-feature` (from the issue comment or the user's message)
- **GitHub issue number** — e.g., `42` (from the issue URL, comment context, or user message)
- **Repo slug** — `owner/repo` (available from GitHub context or `gh repo view`)

If any are missing, ask before proceeding.

## Steps

### 1. Read the GitHub issue

Fetch the full issue so you understand what needs to be built:

```bash
gh issue view <number> --repo <owner/repo>
```

Summarize the requirements and confirm your understanding before writing any code.

### 2. Verify the feature branch exists on origin

```bash
gh api repos/<owner/repo>/branches/<feature-branch>
```

If the branch does not exist on origin, stop and tell the user — do not substitute another branch.

### 3. Create the work branch off the feature branch and publish it

```bash
git fetch origin
git checkout -b ai/issue-<number> origin/<feature-branch>
git push -u origin ai/issue-<number>
```

Branch name must follow the pattern `ai/issue-<number>` exactly (e.g., `ai/issue-42`). Publishing to origin immediately makes the branch visible on GitHub before any commits land.

### 4. Confirm setup

Report the active branch and its base so the user can verify context is correct before implementation starts.

### 5. Implement using TDD

Invoke the `/tdd` skill to drive the implementation on `ai/issue-<number>`. Push commits as you go.

### 6. Open the PR targeting the feature branch

```bash
gh pr create \
  --repo <owner/repo> \
  --base <feature-branch> \
  --head ai/issue-<number> \
  --title "<concise title>" \
  --body "$(cat <<'EOF'
## Summary
<what was built and why>

Closes #<number>

## Test plan
<checklist of what was tested>
EOF
)"
```

`--base` must always be the feature branch — never `main` or `master`.

## Key constraints

- Never branch off `main` when a feature branch is given.
- Never open the PR against `main` when a feature branch is given.
- Always verify the feature branch exists on origin before proceeding.
- Always read the full GitHub issue before writing any code.
- Always use `/tdd` for implementation.
