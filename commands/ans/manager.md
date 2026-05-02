---
description: "Interactive command center for managing a novel project from one terminal"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---
<objective>
Single-terminal command center for a root-level novel project.

Shows the current project snapshot, identifies planning/writing/review gaps, recommends the next step, and dispatches to existing `/ans:*` commands.
</objective>

<execution_context>
@~/.claude/ai-novel-studio/workflows/manager.md
</execution_context>

<context>
ARGUMENTS: $ARGUMENTS

No arguments required. Requires an active root-level novel project in the current directory.
</context>

<process>
Execute the manager workflow from @~/.claude/ai-novel-studio/workflows/manager.md end-to-end.
Maintain the dashboard loop until the user exits.
</process>
