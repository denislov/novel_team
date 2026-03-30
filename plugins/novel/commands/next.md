---
description: "Automatically detect the next logical step in the novel workflow and run it"
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - SlashCommand
---
<objective>
Detect the current `.novel/` project state and automatically invoke the next logical command.

Designed for low-friction serialization workflows where remembering whether to plan, write, or review next is overhead.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/next.md
</execution_context>

<process>
Execute the next workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/next.md end-to-end.
</process>
