---
title: implement-jira-issue
description: command used to instruct Claude Code to run the /feature-dev command using the given insructions to implement the Jira issue. The user will input the Jira issue  id and extra instructions are optional
---

run the /feature-dev plugin with the below instructions. Make sure to not skip any steps in the feature-dev process.

<instructions>
-Implement Jira issue $1.  Use all the subtask work items as an implementation guide.
-Create a new branch before implementation.
-Update the Jira issue $1 status to IN PROGRESS.
-Update each subtask to Done when the task has been finished.
-Test and verify tests pass and raise a PR when completed.
-<optional_human-input> $2 </optional_human-input>
-DO NOT mark jira issue as done until you are told specifically. Human will manually verify.
</instructions>
