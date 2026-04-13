---
description: "Generate multiple chapters autonomously in batches, pausing only at batch boundaries or serious issues"
argument-hint: "[--from=N] [--to=N|--chapters=N] [--batch=N] [--no-pause] [--skip-verify]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---
<objective>
Run the autonomous serialization workflow for a structured root-level novel project.

**Flow:** repeated plan -> write -> optional review -> state update across a chapter range

**Creates/Updates:**
- `chapters/outlines/outline-[N].md`
- `chapters/chapter-[N].md`
- `reviews/review-[N].md` when review is enabled
- `STATE.md`

Designed for batch creation with controlled pause points rather than single-chapter manual flow.
</objective>

<execution_context>
@~/.claude/ai-novel-studio/commands/ans/_codex-conventions.md
@~/.claude/ai-novel-studio/workflows/autonomous.md
@~/.claude/ai-novel-studio/references/command-center.md
@~/.claude/ai-novel-studio/references/writing-guide.md
@~/.claude/ai-novel-studio/templates/ROADMAP.md
@~/.claude/ai-novel-studio/templates/STATE.md
@~/.claude/ai-novel-studio/templates/CHAPTER-OUTLINE.md
@~/.claude/ai-novel-studio/templates/CHAPTER.md
@~/.claude/ai-novel-studio/templates/REVIEW.md
</execution_context>

<context>
**Flags:**
- `--from=N` — Starting chapter, default is the next chapter from `STATE.md`
- `--to=N` — Explicit ending chapter
- `--chapters=N` — Number of chapters to produce
- `--batch=N` — Pause every `N` chapters, default `3`
- `--no-pause` — Continue through issues without pausing for decisions
- `--skip-verify` — Skip review for faster generation
</context>

<process>
Execute the autonomous workflow from @workflows/autonomous.md end-to-end.
Interpret Claude-style workflow primitives using @commands/_codex-conventions.md.
Preserve all workflow gates (range inference, batching, planner/writer/verifier orchestration, pause logic, state updates).
</process>
