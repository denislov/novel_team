---
description: "Generate a continuous batch of chapter outlines for a target chapter range"
argument-hint: "START-END [--goal=\"...\"] [--force]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---
<objective>
Plan multiple upcoming chapters in one pass so chapter goals, pacing, and hooks stay coherent across a range.

**Creates:**
- `.novel/chapters/outlines/outline-[N].md` for each chapter in range
- `.novel/chapters/outlines/batch-[START]-[END].md`

This is the batch-outline companion to `/novel:write-chapter`.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/plan-batch.md
@${CLAUDE_PLUGIN_ROOT}/skills/novel-writing/SKILL.md
@${CLAUDE_PLUGIN_ROOT}/templates/CHAPTER-OUTLINE.md
@${CLAUDE_PLUGIN_ROOT}/templates/STATE.md
@${CLAUDE_PLUGIN_ROOT}/templates/TIMELINE.md
</execution_context>

<context>
**Arguments:**
- `START-END` — Chapter range to plan, such as `11-20`

**Flags:**
- `--goal="..."` — Override or clarify the batch objective
- `--force` — Overwrite existing outline files in range
</context>

<process>
Execute the plan-batch workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/plan-batch.md end-to-end.
Preserve all workflow gates (range validation, context loading, per-chapter planner passes, batch summary generation).
</process>
