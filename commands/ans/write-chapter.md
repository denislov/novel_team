---
description: "Create a chapter through the full flow: outline, draft, polish, and review"
argument-hint: "[N|--next] [--skip-plan] [--skip-polish] [--skip-verify] [--draft]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---
<objective>
Run the standard chapter production pipeline for a novel project.

**Flow:** plan -> write -> polish -> review -> state update

**Creates/Updates:**
- `chapters/outlines/outline-[N].md`
- `chapters/chapter-[N].md`
- `reviews/review-[N].md` or compatible review artifacts
- `STATE.md`
- `TIMELINE.md` and `CHARACTERS.md` when the workflow determines updates are needed
</objective>

<execution_context>
@~/.claude/ai-novel-studio/commands/_codex-conventions.md
@~/.claude/ai-novel-studio/workflows/write-chapter.md
</execution_context>

<context>
Chapter number is taken from `$ARGUMENTS`.

**Flags:**
- `[N]` — Write a specific chapter number
- `--next` — Infer the next chapter from `STATE.md`
- `--skip-plan` — Skip outline generation
- `--skip-polish` — Skip editing/polish pass
- `--skip-verify` — Skip review/consistency check
- `--draft` — Draft-only mode; implies `--skip-polish --skip-verify`
</context>

<process>
Execute the workflow `workflows/write-chapter.md` using the exact arguments provided in `<context>`.
This command is purely an entry point; DO NOT execute any creative cognitive tasks (like drafting, outlining, editing). All orchestration, state updates, validation, and subagent invocation MUST strictly be handled by the logic inside the workflow file.
</process>
