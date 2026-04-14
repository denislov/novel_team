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
@~/.claude/ai-novel-studio/commands/ans/_codex-conventions.md
@~/.claude/ai-novel-studio/workflows/polish.md
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
Execute the workflow `workflows/polish.md` using the exact arguments provided in `<context>`.
This command is purely an entry point; DO NOT execute any creative cognitive tasks or logic directly. All orchestration and subagent invocation MUST be handled by the logic inside the workflow file.
</process>
