---
description: "Quickly polish one or more chapters with a fast pass over obvious AI-flavor and prose issues"
argument-hint: "[N|START-END] [--compare] [--in-place]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---
<objective>
Run the polish workflow in quick mode by default.

This is a thin alias over `/ans:polish --quick` for cases where you want speed over depth.

**Creates/Updates:**
- `reviews/review-[N].md` or compatible edit report artifacts
- Edited chapter files, depending on mode and acceptance
</objective>

<execution_context>
@~/.claude/ai-novel-studio/commands/_codex-conventions.md
@~/.claude/ai-novel-studio/workflows/polish.md
@~/.claude/ai-novel-studio/references/command-center.md
@~/.claude/ai-novel-studio/references/writing-guide.md
@~/.claude/ai-novel-studio/templates/REVIEW.md
@~/.claude/ai-novel-studio/templates/CHAPTER.md
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
Execute the polish workflow from @workflows/polish.md end-to-end with quick mode as the default behavior.
Interpret Claude-style workflow primitives using @commands/_codex-conventions.md.
Preserve all workflow gates (chapter selection, editor pass, report generation, result acceptance).
</process>
