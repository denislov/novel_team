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
@commands/_codex-conventions.md
@workflows/review.md
@scripts/novel_state.cjs
@skills/novel-command-center/SKILL.md
@skills/novel-writing/SKILL.md
@skills/novel-writing/references/common-pitfalls.md
@templates/REVIEW.md
@templates/STATE.md
@templates/TIMELINE.md
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
Execute the review workflow from @workflows/review.md end-to-end.
Interpret Claude-style workflow primitives using @commands/_codex-conventions.md.
Use @scripts/novel_state.cjs to select the default latest chapter and refresh state snapshots after review output.
Preserve all workflow gates (project checks, verifier pass, per-chapter reporting, batch aggregation).
</process>
