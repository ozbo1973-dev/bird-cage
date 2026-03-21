---
name: create-jira-tickets
description: Reads /docs/PRD.md, breaks it into a sequenced implementation plan of parent tasks with subtasks, creates Jira issues for each parent with its subtasks, then generates /docs/PROGRESS.md with a section header per parent Jira issue.
---

Follow these steps in order. Do not skip any step. Ask user questions throughout the process when needed.

## Step 1 — Read the PRD

Read `/docs/PRD.md` in full. Understand the full scope of the product before planning.

## Step 2 — Build the implementation plan

Analyse the PRD and decompose it into parent tasks. Each parent task should represent a meaningful, independently shippable slice of work (e.g. "Auth", "Data model", "API layer", "UI — dashboard"). This step should be ran in plan mode.

For each parent task, write 2–6 subtasks that break the work into concrete, clearly described implementation steps.

Then sequence the parent tasks in dependency order — foundational work (DB schema, auth) before features that depend on it.

Organize tasks into frontend and backend tasks. This will allow separation of development. The backend tasks should come before frontend tasks.

Produce a numbered plan in this shape before touching Jira:

```
1. <Parent task title>
   1a. <Subtask>
   1b. <Subtask>
   ...
2. <Parent task title>
   ...
```

Present the plan to the user and wait for confirmation before continuing to Step 3.

## Step 3 — Create Jira issues

Use your Atlassian tools to create one Jira issue per parent task. For each:

- Use the project key for this repository (look it up from existing issues if unsure).
- Write a concise one-paragraph description that clearly states the goal and scope.
- Create each subtask as a Jira subtask under its parent issue with its own concise description.
- Note the issue ID returned (e.g. BRD-55) — you will need it in Step 4.
- Use the jira-plan-writer agent to create the plan file for this jira issue.
- Create a git hub issue. The issue title should be similar to the parent task and indicate the jira issue ID. The description in the issue should indicate if it is a frontend or backend task(depending on the category given in step 2) and then add the following: "run the implement-jira-issue command for <<current Jira ID>> Note: DO NOT run the command this will be done in a later process.

Create issues in the sequenced order from Step 2.

## Step 4 — Create /docs/PROGRESS.md

Create the file `/docs/PROGRESS.md` with:

- A top-level heading: `# Implementation Status`
- One `##` section per parent Jira issue created, titled with only the issue ID (e.g. `## BRD-55`).
- Nothing else — no descriptions, no subtask lists, no status labels.

Example structure:

```markdown
# Implementation Status

## BRD-55

## BRD-56

## BRD-57
```
