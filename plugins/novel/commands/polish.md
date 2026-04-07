---
description: "Polish one or more completed chapters to reduce AI flavor and improve immersion, rhythm, and prose quality"
argument-hint: "[N|START-END] [--quick] [--deep] [--compare] [--in-place]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---
<objective>
Run the chapter polish workflow on one chapter or a chapter range.

**Creates/Updates:**
- `reviews/review-[N].md` or compatible edit report artifacts
- Edited chapter files, either as side-by-side outputs or in place depending on mode

Default target: the latest completed chapter if no explicit chapter argument is provided.
</objective>

<execution_context>
@commands/_codex-conventions.md
@workflows/polish.md
@scripts/novel_state.cjs
@scripts/chapter_ops.cjs
@skills/novel-command-center/SKILL.md
@skills/novel-writing/SKILL.md
@skills/novel-writing/references/immersion-techniques.md
@templates/REVIEW.md
@templates/CHAPTER.md
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
Execute the polish workflow from @workflows/polish.md end-to-end.
Interpret Claude-style workflow primitives using @commands/_codex-conventions.md.
Use @scripts/novel_state.cjs to select the default latest formal chapter and refresh state if accepted edits replace the source chapter.
Use @scripts/chapter_ops.cjs to apply polished drafts onto the formal chapter file with backup handling.
Preserve all workflow gates (chapter selection, mode handling, editor pass, report generation, result acceptance).
</process>
