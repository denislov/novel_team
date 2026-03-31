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
@commands/_codex-conventions.md
@workflows/progress.md
@scripts/novel_state.py
@skills/novel-command-center/SKILL.md
</execution_context>

<process>
Execute the progress workflow from @workflows/progress.md end-to-end.
Interpret Claude-style workflow primitives using @commands/_codex-conventions.md.
Use @scripts/novel_state.py as the source of truth for stats and next-step recommendation.
Preserve all reporting logic and next-step recommendation logic.
</process>
