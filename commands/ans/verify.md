---
description: "Verify chapter consistency, timeline accuracy, and logic using the review workflow as a focused validation pass"
argument-hint: "[N|START-END] [--quick] [--deep] [--json]"
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

This is a thin alias over `/ans:review`, optimized for consistency checking after drafting or editing.

**Creates:**
- `reviews/review-[N].md`
- Batch verification summaries when reviewing a range
</objective>

<execution_context>
@~/.claude/ai-novel-studio/commands/_codex-conventions.md
@~/.claude/ai-novel-studio/workflows/verify.md
</execution_context>

<context>
**Arguments:**
- `[N]` — Verify a single chapter
- `[START-END]` — Verify a chapter range

**Flags:**
- `--quick` — Show concise verification results
- `--deep` — Include cross-chapter consistency analysis
- `--json` — Emit structured output for tooling

If no chapter is provided, the workflow defaults to the latest chapter.
</context>

<process>
Execute the verify workflow from @~/.claude/ai-novel-studio/workflows/verify.md end-to-end as a consistency-verification alias.
Interpret Claude-style workflow primitives using @~/.claude/ai-novel-studio/commands/_codex-conventions.md.
Preserve all workflow gates (project checks, verifier pass, per-chapter reporting, batch aggregation).
</process>
