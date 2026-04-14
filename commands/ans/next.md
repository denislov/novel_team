---
description: "Automatically detect the next logical step in the novel workflow and run it"
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---
<objective>
Detect the current root-level novel project state and automatically invoke the next logical command.

Designed for low-friction serialization workflows where remembering whether to plan, write, or review next is overhead.
</objective>

<execution_context>
@~/.claude/ai-novel-studio/commands/ans/_codex-conventions.md
@~/.claude/ai-novel-studio/workflows/next.md
</execution_context>

<process>
Execute the workflow `workflows/next.md` using the exact arguments provided.
This command is purely an entry point; DO NOT execute any logic directly.
</process>
