---
description: "Plan a new story arc or volume and update roadmap, timeline, and cast implications for future chapters"
argument-hint: "[arc name] [--chapters=N] [--goal=\"...\"] [--research=\"...\"]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - WebSearch
  - WebFetch
---
<objective>
Plan a new story arc, volume, or major stage for an existing root-level novel project.

**Creates/Updates:**
- `ROADMAP.md`
- `TIMELINE.md`
- `CHARACTERS.md`
- `PROJECT.md` when the new arc expands the setting
- `research/arc-*.md` when research is requested

Use this command after one arc is stable and you need the next major stage designed before drafting chapters.
</objective>

<execution_context>
@~/.claude/ai-novel-studio/commands/ans/_codex-conventions.md
@~/.claude/ai-novel-studio/workflows/plan-arc.md
@~/.claude/ai-novel-studio/references/command-center.md
@~/.claude/ai-novel-studio/references/writing-guide.md
@~/.claude/ai-novel-studio/templates/PROJECT.md
@~/.claude/ai-novel-studio/templates/ROADMAP.md
@~/.claude/ai-novel-studio/templates/CHARACTERS.md
@~/.claude/ai-novel-studio/templates/TIMELINE.md
@~/.claude/ai-novel-studio/templates/STATE.md
@~/.claude/ai-novel-studio/templates/RESEARCH.md
</execution_context>

<context>
**Arguments:**
- `[arc name]` — Name or label for the new arc

**Flags:**
- `--chapters=N` — Expected chapter count for the arc
- `--goal="..."` — Core conflict or phase objective
- `--research="..."` — Run supporting research before planning the arc
</context>

<process>
Execute the plan-arc workflow from @workflows/plan-arc.md end-to-end.
Interpret Claude-style workflow primitives using the conventions file already loaded in `execution_context`.
Preserve all workflow gates (project load, optional research, architect pass, roadmap/timeline/cast updates).
</process>
