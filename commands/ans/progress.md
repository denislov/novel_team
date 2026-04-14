---
description: "Show novel project progress, recent artifacts, coverage, and the recommended next action"
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---
<objective>
Check novel project progress, summarize the current writing position, and recommend the next command without auto-running it.

Use this when you need situational awareness before continuing work.
</objective>

<execution_context>
@~/.claude/ai-novel-studio/commands/ans/_codex-conventions.md
@~/.claude/ai-novel-studio/workflows/progress.md
</execution_context>

<process>
Execute the workflow `workflows/progress.md` using the exact arguments provided.
This command is purely an entry point; DO NOT execute any logic directly. All state updates and logic MUST be handled by the logic inside the workflow file.
</process>
