---
description: "Quickly polish one or more chapters with a fast pass over obvious AI-flavor and prose issues"
argument-hint: "[N|START-END] [--compare] [--in-place]"
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
Run the polish workflow in quick mode by default.

This is a thin alias over `/novel:polish --quick` for cases where you want speed over depth.

**Creates/Updates:**
- `.novel/reviews/review-[N].md` or compatible edit report artifacts
- Edited chapter files, depending on mode and acceptance
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/polish.md
@${CLAUDE_PLUGIN_ROOT}/skills/novel-writing/SKILL.md
@${CLAUDE_PLUGIN_ROOT}/templates/REVIEW.md
@${CLAUDE_PLUGIN_ROOT}/templates/CHAPTER.md
</execution_context>

<context>
**Arguments:**
- `[N]` — Polish a single chapter
- `[START-END]` — Polish a chapter range

**Behavior:**
- Default mode is `--quick`

**Optional flags:**
- `--compare` — Show before/after comparison
- `--in-place` — Replace the original file directly
</context>

<process>
Execute the polish workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/polish.md end-to-end with quick mode as the default behavior.
Preserve all workflow gates (chapter selection, editor pass, report generation, result acceptance).
</process>
