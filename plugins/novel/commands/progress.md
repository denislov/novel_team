---
description: "Show novel project progress, recent artifacts, coverage, and the recommended next action"
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---
<objective>
Check novel project progress, summarize the current writing position, and recommend the next command without auto-running it.

Use this when you need situational awareness before continuing work.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/progress.md
</execution_context>

<process>
Execute the progress workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/progress.md end-to-end.
Preserve all reporting logic and next-step recommendation logic.
</process>
