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
@commands/_codex-conventions.md
@workflows/next.md
@scripts/novel_state.py
@skills/novel-command-center/SKILL.md
</execution_context>

<process>
Execute the next workflow from @workflows/next.md end-to-end.
Interpret Claude-style workflow primitives using @commands/_codex-conventions.md.
Use @scripts/novel_state.py as the source of truth for route selection.
</process>
