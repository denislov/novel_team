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

Shows the current project snapshot, identifies planning/writing/review gaps, recommends the next step, and dispatches to existing `/novel:*` commands.
</objective>

<execution_context>
@commands/_codex-conventions.md
@workflows/manager.md
@skills/novel-command-center/SKILL.md
</execution_context>

<context>
No arguments required. Requires an active root-level novel project in the current directory.
</context>

<process>
Execute the manager workflow from @workflows/manager.md end-to-end.
Interpret Claude-style workflow primitives using @commands/_codex-conventions.md.
Maintain the dashboard loop until the user exits.
</process>
