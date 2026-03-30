---
description: "Draft a chapter quickly without the full outline, polish, and review pipeline"
argument-hint: "N [--words=3000] [--context=\"...\"]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
---
<objective>
Produce a fast draft for a chapter with minimal setup.

**Flow:** minimal project load -> quick writer pass -> draft output

**Creates:**
- `.novel/chapters/draft/chapter-[N]-quick.md`

Use this mode for experimentation, idea capture, and high-speed drafting rather than publication-ready output.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/quick-draft.md
@${CLAUDE_PLUGIN_ROOT}/skills/novel-writing/SKILL.md
@${CLAUDE_PLUGIN_ROOT}/templates/CHAPTER.md
</execution_context>

<context>
**Arguments:**
- `N` — Required chapter number
- `--words=N` — Target word count, default `3000`
- `--context="..."` — Extra idea prompt, beat, or scene guidance
</context>

<process>
Execute the quick-draft workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/quick-draft.md end-to-end.
Preserve the lightweight mode guarantees (minimal context, no required outline, no polish/review stages).
</process>
