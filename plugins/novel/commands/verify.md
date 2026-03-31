---
description: "Verify chapter consistency, timeline accuracy, and logic using the review workflow as a focused validation pass"
argument-hint: "[N|START-END] [--quick] [--json]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---
<objective>
Run the review workflow as a verification-focused pass.

This is a thin alias over `/novel:review`, optimized for consistency checking after drafting or editing.

**Creates:**
- `reviews/review-[N].md`
- Batch verification summaries when reviewing a range
</objective>

<execution_context>
@commands/_codex-conventions.md
@workflows/review.md
@skills/novel-command-center/SKILL.md
@skills/novel-writing/SKILL.md
@skills/novel-writing/references/common-pitfalls.md
@templates/REVIEW.md
@templates/STATE.md
@templates/TIMELINE.md
</execution_context>

<context>
**Arguments:**
- `[N]` — Verify a single chapter
- `[START-END]` — Verify a chapter range

**Flags:**
- `--quick` — Show concise verification results
- `--json` — Emit structured output for tooling

If no chapter is provided, the workflow defaults to the latest chapter.
</context>

<process>
Execute the review workflow from @workflows/review.md end-to-end as a consistency-verification alias.
Interpret Claude-style workflow primitives using @commands/_codex-conventions.md.
Preserve all workflow gates (project checks, verifier pass, per-chapter reporting, batch aggregation).
</process>
