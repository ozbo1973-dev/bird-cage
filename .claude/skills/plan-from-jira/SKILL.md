---
name: plan-from-jira
description: Takes a single Jira issue ID, reads the issue, uses the jira-plan-writer agent to create a local plan file in /docs/plan/jira/, then creates a matching GitHub issue. Use this skill whenever the user wants to plan a Jira issue, create a plan file from a Jira ticket, or generate a GitHub issue from a Jira story. Trigger even if the user says things like "plan out BRD-XX", "create a plan for this ticket", or "set up a GitHub issue from Jira".
---

Follow these steps in order. Do not skip any step.

## Step 1 — Read the Jira issue

Use your Atlassian tools to fetch the Jira issue by ID (e.g. `BRD-55`).

Read the full issue: title, description, subtasks, acceptance criteria, and any linked issues.

## Step 2 — Create the plan file

Use the `jira-plan-writer` agent to generate a plan file for this issue. This step should be ran in plan mode. Ask user questions when needed.

The plan file must be saved to `/docs/plan/jira/<ISSUE-ID>.md` (e.g. `/docs/plan/jira/BRD-55.md`).

The plan file should include:

- The Jira issue title and ID
- A clear summary of what needs to be implemented
- A sequenced list of implementation steps derived from the issue description and subtasks
- Any relevant technical notes or constraints from the issue

## Step 3 — Create the GitHub issue

Create a GitHub issue using your GitHub tools.

- **Title**: `[<ISSUE-ID>] <Jira issue title>` (e.g. `[BRD-55] Add user profile page`)
- **Description**: Use the same content as the plan file created in Step 2. At the bottom, add:

  ```
  To implement: run the implement-jira-issue command for <ISSUE-ID>
  Note: DO NOT run the command — this will be done in a later process.
  ```

Do not create any Jira tickets or read any PRD file — this skill operates on a single existing Jira issue only.
