---
description: "Create a chapter through the full flow: outline, draft, polish, and review"
argument-hint: "[N|--next] [--skip-plan] [--skip-polish] [--skip-verify] [--draft]"
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
Run the standard chapter production pipeline for a novel project.

**Flow:** plan -> write -> polish -> review -> state update

**Creates/Updates:**
- `.novel/chapters/outlines/outline-[N].md`
- `.novel/chapters/chapter-[N].md`
- `.novel/reviews/review-[N].md` or compatible review artifacts
- `.novel/STATE.md`
- `.novel/TIMELINE.md` and `.novel/CHARACTERS.md` when the workflow determines updates are needed
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/write-chapter.md
@${CLAUDE_PLUGIN_ROOT}/skills/novel-writing/SKILL.md
@${CLAUDE_PLUGIN_ROOT}/templates/CHAPTER-OUTLINE.md
@${CLAUDE_PLUGIN_ROOT}/templates/CHAPTER.md
@${CLAUDE_PLUGIN_ROOT}/templates/REVIEW.md
@${CLAUDE_PLUGIN_ROOT}/templates/STATE.md
</execution_context>

<context>
Chapter number is taken from `$ARGUMENTS`.

**Flags:**
- `[N]` — Write a specific chapter number
- `--next` — Infer the next chapter from `.novel/STATE.md`
- `--skip-plan` — Skip outline generation
- `--skip-polish` — Skip editing/polish pass
- `--skip-verify` — Skip review/consistency check
- `--draft` — Draft-only mode; implies `--skip-polish --skip-verify`
</context>

<process>
Execute the write-chapter workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/write-chapter.md end-to-end.
Preserve all workflow gates (project checks, chapter continuity checks, outline confirmation, write, polish, review, state updates).
</process>
