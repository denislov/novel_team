---
description: "Generate multiple chapters autonomously in batches, pausing only at batch boundaries or serious issues"
argument-hint: "[--from=N] [--to=N|--chapters=N] [--batch=N] [--no-pause] [--skip-verify]"
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
Run the autonomous serialization workflow for a structured `.novel/` project.

**Flow:** repeated plan -> write -> optional review -> state update across a chapter range

**Creates/Updates:**
- `.novel/chapters/outlines/outline-[N].md`
- `.novel/chapters/chapter-[N].md`
- `.novel/reviews/review-[N].md` when review is enabled
- `.novel/STATE.md`

Designed for batch creation with controlled pause points rather than single-chapter manual flow.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/autonomous.md
@${CLAUDE_PLUGIN_ROOT}/skills/novel-writing/SKILL.md
@${CLAUDE_PLUGIN_ROOT}/templates/ROADMAP.md
@${CLAUDE_PLUGIN_ROOT}/templates/STATE.md
@${CLAUDE_PLUGIN_ROOT}/templates/CHAPTER-OUTLINE.md
@${CLAUDE_PLUGIN_ROOT}/templates/CHAPTER.md
@${CLAUDE_PLUGIN_ROOT}/templates/REVIEW.md
</execution_context>

<context>
**Flags:**
- `--from=N` — Starting chapter, default is the next chapter from `.novel/STATE.md`
- `--to=N` — Explicit ending chapter
- `--chapters=N` — Number of chapters to produce
- `--batch=N` — Pause every `N` chapters, default `3`
- `--no-pause` — Continue through issues without pausing for decisions
- `--skip-verify` — Skip review for faster generation
</context>

<process>
Execute the autonomous workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/autonomous.md end-to-end.
Preserve all workflow gates (range inference, batching, planner/writer/verifier orchestration, pause logic, state updates).
</process>
