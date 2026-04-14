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

This is the batch-outline companion to `/ans:write-chapter`.
</objective>

<execution_context>
@~/.claude/ai-novel-studio/commands/ans/_codex-conventions.md
@~/.claude/ai-novel-studio/workflows/plan-batch.md
</execution_context>

<context>
**Arguments:**
- `START-END` — Chapter range to plan, such as `11-20`

**Flags:**
- `--goal="..."` — Override or clarify the batch objective
- `--force` — Overwrite existing outline files in range
</context>

<process>
Execute the workflow `workflows/plan-batch.md` using the exact arguments provided in `<context>`.
This command is purely an entry point; DO NOT execute any creative cognitive tasks (like drafting or outlining), and DO NOT invoke bash scripts directly from this prompt. All orchestration, state updates, validation, and subagent invocation MUST strictly be handled by the logic inside the workflow file.
</process>
