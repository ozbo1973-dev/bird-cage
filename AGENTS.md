# Bird Cage

## Overview

This is an application used by serious birding enthusiasts to track the birds they encounter at each outing. The user can enter a description of the bird into an AI chat to determine the type and species of the bird. In a future update the user will be able to add photo of the bird and the AI will determine the type and species.

## Development process

When instructed to build a feature:

1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your ai-chat skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
This is a full stack application built in Next.js 16.
The database should use SQLLite with Drizzle ORM and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
The authentication currently has a mock auth system but will use Better Auth in future.

## Color Scheme

- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation Status
