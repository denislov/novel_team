---
description: "Review one or more chapters for consistency, timeline accuracy, logic gaps, and common web-novel pitfalls"
argument-hint: "[N|START-END] [--quick] [--full] [--json]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---
<objective>
Run the chapter review workflow on one chapter or a range of chapters.

**Creates:**
- `reviews/review-[N].md`
- Batch summary output when reviewing a range

Default target: the latest chapter if no explicit chapter argument is provided.
</objective>

<execution_context>
@~/.claude/ai-novel-studio/commands/_codex-conventions.md
@~/.claude/ai-novel-studio/workflows/review.md
</execution_context>

<context>
**Arguments:**
- `[N]` — Review a single chapter
- `[START-END]` — Review a chapter range

**Flags:**
- `--quick` — Show concise results only
- `--full` — Show the full report detail
- `--json` — Output structured JSON-style results for scripting
</context>

<process>
Execute the workflow `workflows/review.md` using the exact arguments provided in `<context>`.
This command is purely an entry point; DO NOT execute any creative cognitive tasks or logic directly. All orchestration and subagent invocation MUST be handled by the logic inside the workflow file.
</process>
