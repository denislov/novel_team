---
description: "Polish one or more completed chapters to reduce AI flavor and improve immersion, rhythm, and prose quality"
argument-hint: "[N|START-END] [--quick] [--deep] [--compare] [--in-place]"
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
Run the chapter polish workflow on one chapter or a chapter range.

**Creates/Updates:**
- `.novel/reviews/review-[N].md` or compatible edit report artifacts
- Edited chapter files, either as side-by-side outputs or in place depending on mode

Default target: the latest completed chapter if no explicit chapter argument is provided.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/polish.md
@${CLAUDE_PLUGIN_ROOT}/skills/novel-writing/SKILL.md
@${CLAUDE_PLUGIN_ROOT}/skills/novel-writing/references/immersion-techniques.md
@${CLAUDE_PLUGIN_ROOT}/templates/REVIEW.md
@${CLAUDE_PLUGIN_ROOT}/templates/CHAPTER.md
</execution_context>

<context>
**Arguments:**
- `[N]` — Polish a single chapter
- `[START-END]` — Polish a chapter range

**Flags:**
- `--quick` — Fix obvious issues only
- `--deep` — Run a deeper optimization pass
- `--compare` — Show before/after comparison
- `--in-place` — Replace the original file directly
</context>

<process>
Execute the polish workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/polish.md end-to-end.
Preserve all workflow gates (chapter selection, mode handling, editor pass, report generation, result acceptance).
</process>
