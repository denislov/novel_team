---
description: "Draft a chapter quickly without the full outline, polish, and review pipeline"
argument-hint: "N [--words=3000] [--context=\"...\"]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---
<objective>
Produce a fast draft for a chapter with minimal setup.

**Flow:** minimal project load -> quick writer pass -> draft output

**Creates:**
- `chapters/draft/chapter-[N]-quick.md`

Use this mode for experimentation, idea capture, and high-speed drafting rather than publication-ready output.
</objective>

<execution_context>
@commands/_codex-conventions.md
@workflows/quick-draft.md
@skills/novel-command-center/SKILL.md
@skills/novel-writing/SKILL.md
@templates/CHAPTER.md
</execution_context>

<context>
**Arguments:**
- `N` — Required chapter number
- `--words=N` — Target word count, default `3000`
- `--context="..."` — Extra idea prompt, beat, or scene guidance
</context>

<process>
Execute the quick-draft workflow from @workflows/quick-draft.md end-to-end.
Interpret Claude-style workflow primitives using @commands/_codex-conventions.md.
Preserve the lightweight mode guarantees (minimal context, no required outline, no polish/review stages).
</process>
