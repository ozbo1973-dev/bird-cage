---
title: implement-jira-issue
description: command used to instruct Claude Code to run the /feature-dev command using the given insructions to implement the Jira issue. The user will input the Jira issue  id and extra instructions are optional
---

run the /feature-dev plugin with the following instructions:

<instructions>
-Implement Jira issue $1.
-Create a new branch before implementation.
-Update the Jira issue $1 status to IN PROGRESS.
-Test and verify tests pass and raise a PR when completed.
-<optional_human-input> $2 </optional_human-input>
-DO NOT mark jira issue as done. Human will manually verify.
</instructions>
