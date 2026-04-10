---
description: "Research a historical, professional, or setting-specific topic and save a reusable sourced report under `research/`"
argument-hint: "[topic] [--quick|--deep] [--file=name]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - WebSearch
  - WebFetch
---
<objective>
Run a standalone research workflow for a novel project or pre-project idea.

**Creates:**
- `research/[topic].md`

Use this command for fact checking, era reconstruction, professional knowledge lookup, and setting support that should be reusable across multiple chapters.
</objective>

<execution_context>
@commands/_codex-conventions.md
@workflows/research.md
@references/command-center.md
@references/writing-guide.md
@templates/RESEARCH.md
</execution_context>

<context>
**Arguments:**
- `[topic]` — Research topic or question

**Flags:**
- `--quick` — Fast validation for a narrow question
- `--deep` — Broader, deeper background research
- `--file=name` — Override output filename
</context>

<process>
Execute the research workflow from @workflows/research.md end-to-end.
Interpret Claude-style workflow primitives using @commands/_codex-conventions.md.
Preserve all workflow gates (topic clarification, source gathering, cross-checking, report generation).
</process>
