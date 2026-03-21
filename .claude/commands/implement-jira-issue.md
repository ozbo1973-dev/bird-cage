---
title: implement-jira-issue
description: command used to instruct Claude Code to retrieve the indicated task  run the /feature-dev command using the given insructions to implement the plan located in the /docs/plan/jira directory. The plan   id and extra instructions are optional
argument-hint: "<issue-id> [extra instructions]"
---

# Implement Jira Issue

Arguments: $ARGUMENTS

Extract the issue ID from the arguments (e.g. `BRD-23`). Any remaining text after the issue ID is extra instructions.

## Step 1: Read the implementation plan

Read the plan file at `/docs/plan/jira/<issue-id>.md` (e.g. `/docs/plan/jira/BRD-23.md`).

- Do NOT use Jira tools. All required information is in the plan file.
- If the file does not exist, stop and tell the user.

## Step 2: Run feature-dev

Run the `/feature-dev` command using the contents of the plan file as the feature description. Pass any extra instructions from the arguments along as additional context.

Follow every phase of the feature-dev process without skipping any steps:

1. Discovery — confirm understanding of what needs to be built from the plan file
2. Codebase Exploration — explore relevant existing code
3. Clarifying Questions — ask the user before designing (skip only if the plan fully specifies everything)
4. Architecture Design — propose approaches and get user approval
5. Implementation — implement after explicit user approval
6. Quality Review — run code-reviewer agents and present findings
7. Summary — summarize what was built

## Step 3: After implementation

- Create a new git branch before starting implementation
- Ensure all tests pass
- Raise a PR when complete
