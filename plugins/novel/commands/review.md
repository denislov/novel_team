---
description: "Review one or more chapters for consistency, timeline accuracy, logic gaps, and common web-novel pitfalls"
argument-hint: "[N|START-END] [--quick] [--full] [--json]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
---
<objective>
Run the chapter review workflow on one chapter or a range of chapters.

**Creates:**
- `.novel/reviews/review-[N].md`
- Batch summary output when reviewing a range

Default target: the latest chapter if no explicit chapter argument is provided.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/review.md
@${CLAUDE_PLUGIN_ROOT}/skills/novel-writing/SKILL.md
@${CLAUDE_PLUGIN_ROOT}/skills/novel-writing/references/common-pitfalls.md
@${CLAUDE_PLUGIN_ROOT}/templates/REVIEW.md
@${CLAUDE_PLUGIN_ROOT}/templates/STATE.md
@${CLAUDE_PLUGIN_ROOT}/templates/TIMELINE.md
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
Execute the review workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/review.md end-to-end.
Preserve all workflow gates (project checks, verifier pass, per-chapter reporting, batch aggregation).
</process>
