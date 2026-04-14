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
@~/.claude/ai-novel-studio/commands/ans/_codex-conventions.md
@~/.claude/ai-novel-studio/workflows/quick-polish.md
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
Execute the quick-polish workflow from @workflows/quick-polish.md end-to-end with quick mode as the default behavior.
Interpret Claude-style workflow primitives using the conventions file already loaded in `execution_context`.
Preserve all workflow gates (chapter selection, editor pass, report generation, result acceptance).
</process>
