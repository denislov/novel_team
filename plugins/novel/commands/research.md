---
description: "Research a historical, professional, or setting-specific topic and save a reusable sourced report under `.novel/research/`"
argument-hint: "[topic] [--quick|--deep] [--file=name]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
  - WebSearch
  - WebFetch
---
<objective>
Run a standalone research workflow for a novel project or pre-project idea.

**Creates:**
- `.novel/research/[topic].md`

Use this command for fact checking, era reconstruction, professional knowledge lookup, and setting support that should be reusable across multiple chapters.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/research.md
@${CLAUDE_PLUGIN_ROOT}/skills/novel-writing/SKILL.md
@${CLAUDE_PLUGIN_ROOT}/templates/RESEARCH.md
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
Execute the research workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/research.md end-to-end.
Preserve all workflow gates (topic clarification, source gathering, cross-checking, report generation).
</process>
