---
description: "Generate a continuous batch of chapter outlines for a target chapter range"
argument-hint: "START-END [--goal=\"...\"] [--force]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---
<objective>
Plan multiple upcoming chapters in one pass so chapter goals, pacing, and hooks stay coherent across a range.

**Creates:**
- `chapters/outlines/outline-[N].md` for each chapter in range
- `chapters/outlines/batch-[START]-[END].md`

This is the batch-outline companion to `/novel:write-chapter`.
</objective>

<execution_context>
@commands/_codex-conventions.md
@workflows/plan-batch.md
@scripts/novel_state.py
@skills/novel-command-center/SKILL.md
@skills/novel-writing/SKILL.md
@templates/CHAPTER-OUTLINE.md
@templates/STATE.md
@templates/TIMELINE.md
</execution_context>

<context>
**Arguments:**
- `START-END` — Chapter range to plan, such as `11-20`

**Flags:**
- `--goal="..."` — Override or clarify the batch objective
- `--force` — Overwrite existing outline files in range
</context>

<process>
Execute the plan-batch workflow from @workflows/plan-batch.md end-to-end.
Interpret Claude-style workflow primitives using @commands/_codex-conventions.md.
Use @scripts/novel_state.py to refresh queue and next-target data after batch planning.
Preserve all workflow gates (range validation, context loading, per-chapter planner passes, batch summary generation).
</process>
