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
@~/.claude/ai-novel-studio/commands/ans/_codex-conventions.md
@~/.claude/ai-novel-studio/workflows/research.md
@~/.claude/ai-novel-studio/references/command-center.md
@~/.claude/ai-novel-studio/references/writing-guide.md
@~/.claude/ai-novel-studio/templates/RESEARCH.md
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
Execute the research workflow from @~/.claude/ai-novel-studio/workflows/research.md end-to-end.
Interpret Claude-style workflow primitives using @~/.claude/ai-novel-studio/commands/ans/_codex-conventions.md.
Preserve all workflow gates (topic clarification, source gathering, cross-checking, report generation).
</process>
