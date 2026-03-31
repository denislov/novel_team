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
@commands/_codex-conventions.md
@workflows/write-chapter.md
@scripts/novel_state.py
@scripts/chapter_ops.py
@skills/novel-command-center/SKILL.md
@skills/novel-writing/SKILL.md
@templates/CHAPTER-OUTLINE.md
@templates/CHAPTER.md
@templates/REVIEW.md
@templates/STATE.md
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
Execute the write-chapter workflow from @workflows/write-chapter.md end-to-end.
Interpret Claude-style workflow primitives using @commands/_codex-conventions.md.
Use @scripts/novel_state.py to resolve `--next` and refresh `STATE.md` after chapter completion.
Use @scripts/chapter_ops.py to promote draft or polished chapter artifacts into the formal chapter file safely.
Preserve all workflow gates (project checks, chapter continuity checks, outline confirmation, write, polish, review, state updates).
</process>
