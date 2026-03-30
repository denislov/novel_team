---
description: "Interactive command center for managing a novel project from one terminal"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - SlashCommand
---
<objective>
Single-terminal command center for a `.novel/` project.

Shows the current project snapshot, identifies planning/writing/review gaps, recommends the next step, and dispatches to existing `/novel:*` commands.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/manager.md
</execution_context>

<context>
No arguments required. Requires an active `.novel/` project in the current directory.
</context>

<process>
Execute the manager workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/manager.md end-to-end.
Maintain the dashboard loop until the user exits.
</process>
