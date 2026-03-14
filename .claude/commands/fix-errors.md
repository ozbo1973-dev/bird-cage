---
title: fix-errors
description: Command to fix a current issue and verify root cause and make sure it gets corrected.
---

Run the /feature-dev plug in to fix an error using the instructions and error message from jira issue $1. Make sure to not skip any steps in the feature-dev process.

<instructions>
-Implement Jira issue $1.
-Create a new branch before implementation.
-Update the Jira issue $1 status to IN PROGRESS.
-Identify the root cause of the error.
-Fix the error
-Test and verify tests pass and raise a PR when completed.
-DO NOT mark jira issue as done. Human will manually verify.
</instructions>
